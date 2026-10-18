const path = require('path');
const { Complaint } = require('../models/Complaint');
const RuleSettings = require('../models/RuleSettings');
const { SensitiveZone } = require('../models/SensitiveZone');
const { classifyComplaint } = require('./classifier');
const { analyzeComplaintWithGemini } = require('./geminiService');
const { generateEmbedding, calculateTextSimilarity, calculateCosineSimilarity } = require('./similarity');
const { calculatePriority } = require('./priority');
const { calculateDistanceMeters } = require('../utils/geo');

/**
 * End-to-end complaint triage processing pipeline
 * Enforces rule: "New complaints always go through services/pipeline.js -> processComplaint()"
 */
const processComplaint = async (inputData) => {
  const {
    customId = null,
    title,
    description,
    photoUrl = null,
    lat,
    lng,
    address = 'Location specified on map',
    category: userCategory = null,
    resident = null,
    residentContact = {},
  } = inputData;

  // 1. Fetch active rules and sensitive zones
  let rules = await RuleSettings.findOne({ isDefault: true }).catch(() => null);
  if (!rules) {
    rules = new RuleSettings();
  }

  const sensitiveZones = await SensitiveZone.find({ active: true }).catch(() => []);

  // 2. Multimodal AI Inspection (Gemini LLM with deterministic local fallback)
  let localPhotoPath = null;
  if (photoUrl && photoUrl.startsWith('/uploads/')) {
    const filename = photoUrl.replace('/uploads/', '');
    const standardPath = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads', filename);
    const tmpPath = path.join(require('os').tmpdir(), 'uploads', filename);
    const fs = require('fs');

    if (fs.existsSync(standardPath)) {
      localPhotoPath = standardPath;
    } else if (fs.existsSync(tmpPath)) {
      localPhotoPath = tmpPath;
    } else {
      localPhotoPath = standardPath;
    }
  }

  let aiResult = await analyzeComplaintWithGemini({
    title,
    description,
    photoPath: localPhotoPath,
  });

  if (!aiResult) {
    // Deterministic keyword classifier fallback
    aiResult = await classifyComplaint(description, photoUrl);
  }

  const aiCategory = aiResult.category;
  const aiConfidence = aiResult.confidence;
  const aiReason = aiResult.reason;
  const recommendedDepartment = aiResult.recommendedDepartment || null;
  const recommendedAction = aiResult.recommendedAction || null;

  // If resident manually selected category, keep their choice; otherwise use AI suggestion
  const finalCategory = userCategory || aiCategory;

  // 3. Generate text embedding
  const embedding = generateEmbedding(description);

  // 4. Duplicate Check
  const radiusMeters =
    parseInt(process.env.DUP_RADIUS_METERS, 10) ||
    (rules.thresholds && rules.thresholds.duplicateRadiusMeters) ||
    150;
  const simThreshold =
    parseFloat(process.env.DUP_SIM_THRESHOLD) ||
    (rules.thresholds && rules.thresholds.duplicateSimilarityThreshold) ||
    0.50;

  let duplicateOf = null;
  let duplicateCandidate = null;
  let highestSimilarity = 0;

  // Find candidate open complaints in the same category
  const openStatuses = ['new', 'under_review', 'assigned', 'in_progress', 'New', 'Under review', 'Assigned', 'In progress'];

  const candidateComplaints = await Complaint.find({
    category: finalCategory,
    status: { $in: openStatuses },
    duplicateOf: null, // Only link to primary originals
  }).select('+embedding');

  for (const candidate of candidateComplaints) {
    if (!candidate.location || candidate.location.lat == null) continue;

    const dist = calculateDistanceMeters(lat, lng, candidate.location.lat, candidate.location.lng);
    if (dist <= radiusMeters) {
      let sim = 0;
      if (candidate.embedding && candidate.embedding.length) {
        sim = calculateCosineSimilarity(embedding, candidate.embedding);
      } else {
        sim = calculateTextSimilarity(description, candidate.description);
      }

      if (sim >= simThreshold && sim > highestSimilarity) {
        highestSimilarity = sim;
        duplicateCandidate = candidate;
      }
    }
  }

  if (duplicateCandidate) {
    duplicateOf = duplicateCandidate._id;
  }

  // 5. Initial Priority calculation
  const priorityCalculation = calculatePriority(
    {
      category: finalCategory,
      duplicateCount: 0,
      photoUrl,
      location: { lat, lng },
      createdAt: new Date(),
    },
    rules,
    sensitiveZones
  );

  return {
    processedFields: {
      customId,
      title: title || description.slice(0, 45) + (description.length > 45 ? '...' : ''),
      description,
      category: finalCategory,
      aiCategory,
      aiConfidence,
      photoUrl,
      location: {
        lat: Number(lat),
        lng: Number(lng),
        address,
        geo: {
          type: 'Point',
          coordinates: [Number(lng), Number(lat)],
        },
      },
      embedding,
      status: duplicateOf ? 'duplicate' : 'new',
      priorityScore: priorityCalculation.priorityScore,
      priorityBand: priorityCalculation.priorityBand,
      priorityReasons: priorityCalculation.priorityReasons,
      duplicateOf,
      duplicateCount: 0,
      department: recommendedDepartment || 'General',
      aiReason: aiReason || '',
      recommendedAction: recommendedAction || '',
      resident,
      residentContact,
    },
    duplicateMatch: duplicateCandidate
      ? {
          originalId: duplicateCandidate._id,
          similarity: Number(highestSimilarity.toFixed(2)),
          distanceMeters: calculateDistanceMeters(lat, lng, duplicateCandidate.location.lat, duplicateCandidate.location.lng),
        }
      : null,
    rules,
    sensitiveZones,
    aiReason,
  };
};

module.exports = {
  processComplaint,
};

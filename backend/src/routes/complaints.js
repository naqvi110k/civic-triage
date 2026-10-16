const express = require('express');
const mongoose = require('mongoose');
const { Complaint } = require('../models/Complaint');
const StatusHistory = require('../models/StatusHistory');
const { uploadPhoto, getFileUrl } = require('../middleware/upload');
const { auth } = require('../middleware/auth');
const { processComplaint } = require('../services/pipeline');
const { calculatePriority } = require('../services/priority');
const { isValidCoordinate } = require('../utils/geo');
const { analyzeImageWithGemini } = require('../services/geminiService');
const { classifyComplaint } = require('../services/classifier');

const router = express.Router();

/**
 * @route   POST /api/complaints/analyze
 * @desc    Analyze uploaded photo with Gemini AI vision to auto-fill form (category, title, description)
 * @access  Public
 */
router.post('/analyze', uploadPhoto, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required for AI visual analysis.' });
    }

    const photoUrl = getFileUrl(req.file);
    const photoPath = req.file.path;

    // Run multimodal Gemini vision
    let analysis = await analyzeImageWithGemini({ photoPath });

    if (!analysis) {
      // Graceful fallback to keyword classifier if Gemini is unavailable
      const fallback = await classifyComplaint(req.file.originalname.replace(/[-_.]/g, ' '));
      analysis = {
        category: fallback.category || 'other',
        title: 'Municipal Civic Incident',
        description: `Visual evidence submitted for ${fallback.category || 'civic'} triage.`,
        confidence: fallback.confidence || 0.75,
        visualHazardSummary: fallback.reason || 'Classified by civic heuristics',
        recommendedDepartment: 'Dept of Public Works & Roads',
        isLLM: false,
      };
    }

    res.status(200).json({
      success: true,
      photoUrl,
      ...analysis,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /api/complaints
 * @desc    Submit new complaint with photo and location
 * @access  Public / Optional Resident Auth
 */
router.post('/', auth(false), uploadPhoto, async (req, res, next) => {
  try {
    const {
      title,
      description,
      lat,
      lng,
      address,
      category,
      contactName,
      contactPhone,
      contactEmail,
    } = req.body;

    // Validate required fields
    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'Complaint description is required.' });
    }

    if (lat == null || lng == null || !isValidCoordinate(lat, lng)) {
      return res.status(400).json({ error: 'Valid latitude (-90 to 90) and longitude (-180 to 180) are required.' });
    }

    const photoUrl = req.file ? getFileUrl(req.file) : (req.body.photoUrl || null);
    const resident = req.user ? req.user._id : null;
    const residentContact = {
      name: contactName || (req.user ? req.user.name : 'Anonymous Resident'),
      phone: contactPhone || '',
      email: contactEmail || (req.user ? req.user.email : ''),
    };

    // Execute triage pipeline
    const { processedFields, duplicateMatch, rules, sensitiveZones } = await processComplaint({
      title,
      description: description.trim(),
      photoUrl,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      address: address || 'Location specified on map',
      category: category || null,
      resident,
      residentContact,
    });

    const complaint = await Complaint.create(processedFields);

    // If duplicate linked, increment original duplicate count and refresh original priority
    if (duplicateMatch && duplicateMatch.originalId) {
      const original = await Complaint.findById(duplicateMatch.originalId);
      if (original) {
        original.duplicateCount = (original.duplicateCount || 0) + 1;
        const updatedPriority = calculatePriority(original, rules, sensitiveZones);
        original.priorityScore = updatedPriority.priorityScore;
        original.priorityBand = updatedPriority.priorityBand;
        original.priorityReasons = updatedPriority.priorityReasons;
        await original.save();
      }
    }

    // Record initial status history
    await StatusHistory.create({
      complaintId: complaint._id,
      status: complaint.status,
      note: duplicateMatch
        ? `Marked as potential duplicate of report #${duplicateMatch.originalId} (${duplicateMatch.distanceMeters}m away, ${Math.round(duplicateMatch.similarity * 100)}% similarity)`
        : 'Complaint submitted by resident',
      changedBy: {
        userId: resident,
        name: residentContact.name,
        role: req.user ? req.user.role : 'resident',
      },
    });

    res.status(201).json({
      success: true,
      complaint,
      suggestedCategory: complaint.aiCategory,
      confidence: complaint.aiConfidence,
      priorityBand: complaint.priorityBand,
      priorityReasons: complaint.priorityReasons,
      isDuplicate: Boolean(duplicateMatch),
      duplicateDetails: duplicateMatch || null,
      trackingUrl: `/track/${complaint._id}`,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /api/complaints/mine
 * @desc    Fetch complaints submitted by the authenticated resident
 * @access  Private (Resident)
 */
router.get('/mine', auth(true), async (req, res, next) => {
  try {
    const complaints = await Complaint.find({ resident: req.user._id })
      .sort({ createdAt: -1 })
      .select('-embedding');

    res.status(200).json({ complaints });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /api/complaints
 * @desc    Get public list of active complaints for map exploration
 * @access  Public
 */
router.get('/', async (req, res, next) => {
  try {
    const { category, status, limit = 50 } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (status) filter.status = status;

    const complaints = await Complaint.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(100, parseInt(limit, 10)))
      .select('-embedding');

    res.status(200).json({ complaints });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /api/complaints/nearby
 * @desc    Find complaints within radius of coordinates using 2dsphere index
 * @access  Public
 */
router.get('/nearby', async (req, res, next) => {
  try {
    const { lat, lng, radius = 5000, category, status } = req.query;

    if (lat == null || lng == null || !isValidCoordinate(lat, lng)) {
      return res.status(400).json({ error: 'Valid lat (-90 to 90) and lng (-180 to 180) are required.' });
    }

    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;

    const complaints = await Complaint.findNearby(lat, lng, parseInt(radius, 10), filter)
      .sort({ priorityScore: -1 })
      .select('-embedding')
      .limit(100);

    res.status(200).json({
      count: complaints.length,
      radiusMeters: parseInt(radius, 10),
      center: { lat: parseFloat(lat), lng: parseFloat(lng) },
      complaints,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /api/complaints/bounds
 * @desc    Find complaints within map viewport bounding box using 2dsphere index
 * @access  Public
 */
router.get('/bounds', async (req, res, next) => {
  try {
    const { minLat, minLng, maxLat, maxLng, category, status } = req.query;

    if (minLat == null || minLng == null || maxLat == null || maxLng == null) {
      return res.status(400).json({ error: 'minLat, minLng, maxLat, and maxLng parameters are required.' });
    }

    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;

    const complaints = await Complaint.findByBounds(minLat, minLng, maxLat, maxLng, filter)
      .sort({ priorityScore: -1 })
      .select('-embedding')
      .limit(200);

    res.status(200).json({
      count: complaints.length,
      complaints,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /api/complaints/transparency
 * @desc    Public municipal transparency KPI dashboard metrics
 * @access  Public
 */
router.get('/transparency', async (req, res, next) => {
  try {
    const resolvedStatuses = ['resolved', 'closed', 'Resolved', 'Closed'];
    const [total, resolved, categoryAgg, resolvedComplaints] = await Promise.all([
      Complaint.countDocuments(),
      Complaint.countDocuments({ status: { $in: resolvedStatuses } }),
      Complaint.aggregate([
        {
          $group: {
            _id: '$category',
            total: { $sum: 1 },
            resolved: {
              $sum: {
                $cond: [{ $in: ['$status', resolvedStatuses] }, 1, 0],
              },
            },
          },
        },
      ]),
      Complaint.find({ status: { $in: resolvedStatuses } }).select('createdAt updatedAt'),
    ]);

    let avgResolutionHours = 24.0;
    if (resolvedComplaints.length > 0) {
      const totalDurationMs = resolvedComplaints.reduce((acc, c) => {
        const duration = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
        return acc + Math.max(0, duration);
      }, 0);
      avgResolutionHours = Number((totalDurationMs / (resolvedComplaints.length * 3600000)).toFixed(1));
    }

    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 100;

    res.status(200).json({
      totalComplaints: total,
      totalResolved: resolved,
      resolutionRate,
      avgResolutionHours,
      categories: categoryAgg.map((cat) => ({
        category: cat._id,
        total: cat.total,
        resolved: cat.resolved,
        rate: cat.total > 0 ? Math.round((cat.resolved / cat.total) * 100) : 0,
      })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /api/complaints/:id
 * @desc    Fetch single complaint details, duplicate info, and full timeline history
 * @access  Public
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    const complaint = await Complaint.findById(id)
      .populate('duplicateOf', 'title category status priorityScore photoUrl')
      .select('-embedding');

    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    const timeline = await StatusHistory.find({ complaintId: complaint._id }).sort({ changedAt: 1 });

    res.status(200).json({
      complaint,
      timeline,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const { Complaint } = require('../models/Complaint');
const StatusHistory = require('../models/StatusHistory');
const RuleSettings = require('../models/RuleSettings');
const { SensitiveZone } = require('../models/SensitiveZone');
const { processComplaint } = require('../services/pipeline');

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/civic_complaints_db';
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 20000 });
    console.log('[Seed] Connected to MongoDB database successfully.');

    // 1. Wipe all previous ledger data
    await User.deleteMany({});
    await Complaint.deleteMany({});
    await StatusHistory.deleteMany({});
    await RuleSettings.deleteMany({});
    await SensitiveZone.deleteMany({});
    console.log('[Seed] Cleared previous all ledger entries: complaints, status histories, rules, sensitive zones, and users.');

    // 2. Create Default Users (Demo admin and resident)
    const adminPasswordHash = await User.hashPassword('admin123');
    const residentPasswordHash = await User.hashPassword('resident123');

    const admin = await User.create({
      name: 'Municipal Admin',
      email: 'admin@demo.com',
      passwordHash: adminPasswordHash,
      role: 'admin',
    });

    const resident = await User.create({
      name: 'Demo Resident',
      email: 'resident@demo.com',
      passwordHash: residentPasswordHash,
      role: 'resident',
    });
    console.log('[Seed] Created default users: admin@demo.com, resident@demo.com');

    // 3. Create Default Rules
    await RuleSettings.create({
      isDefault: true,
      categoryWeights: {
        road_damage: 30,
        water_leakage: 30,
        blocked_drain: 25,
        garbage: 20,
        streetlight: 15,
        other: 10,
      },
      maxCategoryWeight: 35,
      duplicateWeight: 25,
      sensitiveZoneWeight: 20,
      ageWeight: 15,
      photoEvidenceWeight: 5,
      pointsPerDuplicate: 5,
      pointsPerDayAge: 2,
      thresholds: {
        highPriority: 70,
        mediumPriority: 40,
        duplicateSimilarityThreshold: 0.50,
        duplicateRadiusMeters: 150,
      },
    });
    console.log('[Seed] Created default RuleSettings.');

    // 4. Create Sensitive Zones
    await SensitiveZone.create([
      {
        name: 'City General Hospital (Central Emergency)',
        type: 'hospital',
        lat: 25.4020,
        lng: 68.3620,
        radius: 200,
        active: true,
      },
      {
        name: 'Model Public High School & Cadet Academy',
        type: 'school',
        lat: 25.3960,
        lng: 68.3578,
        radius: 150,
        active: true,
      },
      {
        name: 'Indus Highway & MUET Transit Corridor',
        type: 'main road',
        lat: 25.4072,
        lng: 68.2558,
        radius: 180,
        active: true,
      },
      {
        name: 'Municipal Water Filtration & Pumping Station',
        type: 'other',
        lat: 25.3880,
        lng: 68.3610,
        radius: 180,
        active: true,
      },
    ]);
    console.log('[Seed] Created 4 municipal sensitive zones.');

    // 5. Seed New Complaint Ledger with rich mock data matching frontend
    const newMockLedger = [
      {
        customId: 'CP-2026-891',
        title: 'Dangerous Deep Crater Pothole on Autobahn Road',
        description: 'Deep 14-inch asphalt crater causing tire blowouts near pedestrian crossing and school bus drop-off zone. Exposed gravel and broken asphalt spreading across active transit lane.',
        category: 'road_damage',
        status: 'in_progress',
        priorityScore: 88,
        priorityBand: 'High',
        priorityReasons: [
          'Proximity to designated school safety corridor (+25)',
          'Multiple tire blowout reports in 12 hours (+30)',
          'High vehicle throughput arterial corridor (+33)',
        ],
        lat: 25.3960,
        lng: 68.3578,
        address: 'Autobahn Road, Hyderabad, Sindh',
        ward: 'Ward 1 - Municipal Core',
        department: 'Dept of Public Works & Roads',
        duplicateCount: 6,
        photoUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
        resident: resident._id,
        createdAt: new Date('2026-10-13T13:45:00.000Z'),
        historyNotes: [
          { status: 'new', note: 'Citizen mobile report submitted via GPS coordinates. AI vision detected 14" pavement crater.', by: 'Automated AI Intake Engine', role: 'resident', at: '2026-10-13T13:45:00.000Z' },
          { status: 'under_review', note: 'High-traffic arterial tag applied (+33). Merged 6 duplicate citizen alerts in 120m radius.', by: 'AI Triage Scoring Daemon', role: 'admin', at: '2026-10-13T13:52:00.000Z' },
          { status: 'assigned', note: 'High priority ticket (Score 88) routed to Rapid Asphalt Response Team 4.', by: 'Central Municipal Dispatcher', role: 'admin', at: '2026-10-13T14:10:00.000Z' },
          { status: 'in_progress', note: 'Work Crew Truck arrived on scene at Autobahn Rd. Deploying safety cones and thermal patcher.', by: 'Supervisor D. Jenkins (Field Operations)', role: 'admin', at: '2026-10-13T14:35:00.000Z' },
        ],
      },
      {
        customId: 'CP-2026-892',
        title: 'High-Pressure Main Water Pipeline Rupture',
        description: 'High-pressure clean water geyser bursting through asphalt seam outside hospital perimeter. Flooding road and undermining roadbed.',
        category: 'water_leakage',
        status: 'assigned',
        priorityScore: 94,
        priorityBand: 'High',
        priorityReasons: [
          'Critical hospital access zone proximity (+40)',
          'Imminent structural roadbed undermining risk (+35)',
          'High flow rate discharge (>200 gal/min) (+19)',
        ],
        lat: 25.4020,
        lng: 68.3620,
        address: 'Near Civil Hospital, Saddar, Hyderabad',
        ward: 'Ward 2 - Saddar Medical Corridor',
        department: 'Water & Utilities Board',
        duplicateCount: 9,
        photoUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
        resident: resident._id,
        createdAt: new Date('2026-10-13T11:50:00.000Z'),
        historyNotes: [
          { status: 'new', note: 'Emergency citizen report filed. Automated intake classified as pressurized pipeline breach.', by: 'Automated AI Intake Engine', role: 'resident', at: '2026-10-13T11:50:00.000Z' },
          { status: 'under_review', note: 'Priority elevated to 94 due to hospital ambulance corridor and 9 merged duplicate alerts.', by: 'AI Triage Scoring Daemon', role: 'admin', at: '2026-10-13T11:55:00.000Z' },
          { status: 'assigned', note: 'Emergency Valve Isolation Unit 12 dispatched. Crew ETA 15 minutes.', by: 'Water Emergency Control Center', role: 'admin', at: '2026-10-13T12:05:00.000Z' },
        ],
      },
      {
        customId: 'CP-2026-893',
        title: 'Massive Waste Overflow Blocking Main Bazaar Entrance',
        description: 'Commercial waste and decomposed organic trash piled 5 feet high blocking commercial entrance. Strong stench and pest hazard.',
        category: 'garbage',
        status: 'under_review',
        priorityScore: 68,
        priorityBand: 'Medium',
        priorityReasons: [
          'Commercial market entrance obstruction (+25)',
          'Public health biohazard tag applied (+24)',
          'Reported by 4 local shopkeeper associations (+19)',
        ],
        lat: 25.3910,
        lng: 68.3710,
        address: 'Resham Gali Market Bazaar, Hyderabad',
        ward: 'Ward 4 - Commercial Market',
        department: 'Sanitation & Solid Waste Management',
        duplicateCount: 4,
        photoUrl: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=800&q=80',
        resident: resident._id,
        createdAt: new Date('2026-10-13T09:30:00.000Z'),
        historyNotes: [
          { status: 'new', note: 'Market association filed collective complaint with attached ground photos.', by: 'Citizen Web Portal', role: 'resident', at: '2026-10-13T09:30:00.000Z' },
          { status: 'under_review', note: 'Assigned Priority 68. Compactor Truck Route scheduled for night shift sweep.', by: 'Sanitation Bureau Auditor', role: 'admin', at: '2026-10-13T10:15:00.000Z' },
        ],
      },
      {
        customId: 'CP-2026-894',
        title: 'Fallen High-Mast Streetlight on Indus Highway Corridor',
        description: 'Structural lighting pole damaged by severe winds, leaning over roadway. Exposed electrical wires posing electrocution hazard.',
        category: 'streetlight',
        status: 'in_progress',
        priorityScore: 76,
        priorityBand: 'High',
        priorityReasons: [
          'High-speed university highway access corridor (+32)',
          'Exposed live high-voltage cabling (+28)',
          'Darkened transit zone at night (+16)',
        ],
        lat: 25.4072,
        lng: 68.2558,
        address: 'Indus Highway near MUET Gate, Jamshoro',
        ward: 'Ward 4 North - Jamshoro Campus Sector',
        department: 'Municipal Electrical Grid',
        duplicateCount: 3,
        photoUrl: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=80',
        resident: resident._id,
        createdAt: new Date('2026-10-13T05:50:00.000Z'),
        historyNotes: [
          { status: 'new', note: 'Student commuter reported leaning pole via mobile GPS pin.', by: 'Citizen Mobile App', role: 'resident', at: '2026-10-13T05:50:00.000Z' },
          { status: 'in_progress', note: 'Electrical crew on scene disconnecting circuit breaker and securing steel mast.', by: 'Lead Lineman Tariq (Power Grid)', role: 'admin', at: '2026-10-13T07:20:00.000Z' },
        ],
      },
      {
        customId: 'CP-2026-895',
        title: 'Severe Gutter Sewage Overflow Flooding Pedestrian Crosswalk',
        description: 'Clogged subterranean stormwater drain backed up with black sewage water flooding across intersection.',
        category: 'blocked_drain',
        status: 'resolved',
        priorityScore: 35,
        priorityBand: 'Low',
        priorityReasons: [
          'Subterranean drain clearance completed (-30)',
          'Pedestrian walkway fully restored (+20)',
        ],
        lat: 25.3880,
        lng: 68.3540,
        address: 'Latifabad Unit 7 Main Chowk, Hyderabad',
        ward: 'Ward 3 - Latifabad South',
        department: 'Stormwater & Drainage Division',
        duplicateCount: 1,
        photoUrl: 'https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?auto=format&fit=crop&w=800&q=80',
        resolvedEvidencePhotoUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb186f5f8?auto=format&fit=crop&w=800&q=80',
        resident: resident._id,
        createdAt: new Date('2026-10-12T14:50:00.000Z'),
        historyNotes: [
          { status: 'new', note: 'Crosswalk flooding logged by neighborhood resident.', by: 'Citizen Intake Form', role: 'resident', at: '2026-10-12T14:50:00.000Z' },
          { status: 'in_progress', note: 'Sewer vacuum truck SV-14 deployed on Latifabad Unit 7.', by: 'Drainage Operations Team', role: 'admin', at: '2026-10-13T09:00:00.000Z' },
          { status: 'resolved', note: 'Dislodged blockage using high-pressure jetting. Water drained completely and crosswalk disinfected.', by: 'Supervisor Aslam Khan', role: 'admin', at: '2026-10-13T11:40:00.000Z', evidencePhotoUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb186f5f8?auto=format&fit=crop&w=800&q=80' },
        ],
      },
      {
        customId: 'CP-2026-896',
        title: 'Collapsing Road Trench After Storm Drain Excavation',
        description: 'Uncovered trench cut across University Road collapsed during traffic, creating sudden 2-foot drop across both vehicular lanes.',
        category: 'road_damage',
        status: 'new',
        priorityScore: 82,
        priorityBand: 'High',
        priorityReasons: [
          'Immediate rollover hazard for high-speed traffic (+35)',
          'Primary route connecting university faculties (+25)',
          '5 citizen emergency reports within 30 minutes (+22)',
        ],
        lat: 25.4150,
        lng: 68.2610,
        address: 'University Road, Jamshoro Education Zone',
        ward: 'Ward 5 - University District',
        department: 'Dept of Public Works & Roads',
        duplicateCount: 5,
        photoUrl: 'https://images.unsplash.com/photo-1584463699047-73d72a74c2be?auto=format&fit=crop&w=800&q=80',
        resident: resident._id,
        createdAt: new Date('2026-10-13T15:20:00.000Z'),
        historyNotes: [
          { status: 'new', note: 'Incoming urgent alert logged. Automated priority boosted to 82.', by: 'AI Triage Engine', role: 'resident', at: '2026-10-13T15:20:00.000Z' },
        ],
      },
      {
        customId: 'CP-2026-897',
        title: 'Uncollected Medical Waste Dumped Behind Clinic',
        description: 'Discarded clinical packaging, biological waste bags, and syringes dumped outside designated municipal dumpster enclosure.',
        category: 'garbage',
        status: 'assigned',
        priorityScore: 91,
        priorityBand: 'High',
        priorityReasons: [
          'Hazardous biological materials detected (+40)',
          'Immediate contamination risk to residential neighborhood (+31)',
          '7 neighborhood complaints verified (+20)',
        ],
        lat: 25.4010,
        lng: 68.3590,
        address: 'Doctor Lane, Cantonment Area, Hyderabad',
        ward: 'Ward 2 - Cantonment Zone',
        department: 'Sanitation & Solid Waste Management',
        duplicateCount: 7,
        photoUrl: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80',
        resident: resident._id,
        createdAt: new Date('2026-10-13T08:15:00.000Z'),
        historyNotes: [
          { status: 'new', note: 'Urgent citizen health alert logged.', by: 'Citizen Mobile App', role: 'resident', at: '2026-10-13T08:15:00.000Z' },
          { status: 'assigned', note: 'Hazardous Waste Special Unit dispatched with protective containment bins.', by: 'Environmental Health Officer', role: 'admin', at: '2026-10-13T09:00:00.000Z' },
        ],
      },
      {
        customId: 'CP-2026-898',
        title: 'Clean Water Supply Leak Inundating Residential Street',
        description: 'Broken joint on municipal water pipe flooding street entrance. Clean water flowing into gutters for over 18 hours.',
        category: 'water_leakage',
        status: 'new',
        priorityScore: 58,
        priorityBand: 'Medium',
        priorityReasons: [
          'Severe potable water resource wastage (+25)',
          'Localized pavement erosion risk (+20)',
          '2 resident reports filed (+13)',
        ],
        lat: 25.3780,
        lng: 68.3650,
        address: 'Latifabad Unit 11, Hyderabad',
        ward: 'Ward 3 - Latifabad South',
        department: 'Water & Utilities Board',
        duplicateCount: 2,
        photoUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
        resident: resident._id,
        createdAt: new Date('2026-10-13T10:00:00.000Z'),
        historyNotes: [
          { status: 'new', note: 'Resident complaint filed with video clip.', by: 'Citizen Web Portal', role: 'resident', at: '2026-10-13T10:00:00.000Z' },
        ],
      },
      {
        customId: 'CP-2026-899',
        title: 'Series of 6 Dead Streetlights Creating Night Crime Hazard',
        description: 'Six consecutive streetlight fixtures out along pedestrian walkway, leaving over 400 meters of public road in total darkness.',
        category: 'streetlight',
        status: 'under_review',
        priorityScore: 62,
        priorityBand: 'Medium',
        priorityReasons: [
          'Nighttime pedestrian security corridor (+28)',
          'Extended blackout zone (>400m continuous) (+20)',
          'Multiple morning runner reports (+14)',
        ],
        lat: 25.4120,
        lng: 68.3490,
        address: 'Thandi Sarak Green Belt Corridor, Hyderabad',
        ward: 'Ward 1 - Municipal Core',
        department: 'Municipal Electrical Grid',
        duplicateCount: 2,
        photoUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
        resident: resident._id,
        createdAt: new Date('2026-10-13T06:15:00.000Z'),
        historyNotes: [
          { status: 'new', note: 'Reported by local citizens association.', by: 'Citizen Mobile App', role: 'resident', at: '2026-10-13T06:15:00.000Z' },
          { status: 'under_review', note: 'Scheduled for transformer capacitor verification on morning maintenance shift.', by: 'Power Grid Dispatcher', role: 'admin', at: '2026-10-13T07:30:00.000Z' },
        ],
      },
      {
        customId: 'CP-2026-900',
        title: 'Clogged Monsoon Drain Canal Filled with Plastic Silt',
        description: 'Critical municipal drainage canal blocked with plastic debris and mud silt. Water level rising dangerously near residential homes.',
        category: 'blocked_drain',
        status: 'in_progress',
        priorityScore: 78,
        priorityBand: 'High',
        priorityReasons: [
          'High urban flooding risk to adjacent residential sectors (+35)',
          'Substantial silt depth restricting culvert discharge capacity (+25)',
          '4 neighborhood alerts logged (+18)',
        ],
        lat: 25.3940,
        lng: 68.3420,
        address: 'Qasimabad Phase 1 Canal Road, Hyderabad',
        ward: 'Ward 6 - Qasimabad West',
        department: 'Stormwater & Drainage Division',
        duplicateCount: 4,
        photoUrl: 'https://images.unsplash.com/photo-1595278069441-2cf29f8005a4?auto=format&fit=crop&w=800&q=80',
        resident: resident._id,
        createdAt: new Date('2026-10-13T12:00:00.000Z'),
        historyNotes: [
          { status: 'new', note: 'Canal choking reported ahead of seasonal rains.', by: 'Citizen Mobile App', role: 'resident', at: '2026-10-13T12:00:00.000Z' },
          { status: 'in_progress', note: 'Excavator and dumper truck on site dredging silt and plastic debris.', by: 'Drainage Field Lead', role: 'admin', at: '2026-10-13T14:10:00.000Z' },
        ],
      },
      {
        customId: 'CP-2026-901',
        title: 'Pavement Subsurface Collapse at School Bus Dropoff',
        description: 'Asphalt crumbling and hollow ground beneath road surface right at school entrance. Heavy vehicles at risk of breakthrough.',
        category: 'road_damage',
        status: 'assigned',
        priorityScore: 85,
        priorityBand: 'High',
        priorityReasons: [
          'Proximity to educational institution student dropoff (+35)',
          'Hollow subgrade cave-in risk for school buses (+32)',
          '5 verified parent and teacher submissions (+18)',
        ],
        lat: 25.4210,
        lng: 68.2720,
        address: 'Cadet College Access Road, Jamshoro',
        ward: 'Ward 5 - University District',
        department: 'Dept of Public Works & Roads',
        duplicateCount: 5,
        photoUrl: 'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=800&q=80',
        resident: resident._id,
        createdAt: new Date('2026-10-13T14:00:00.000Z'),
        historyNotes: [
          { status: 'new', note: 'School principal reported hollow ground outside main bus gate.', by: 'Citizen Web Portal', role: 'resident', at: '2026-10-13T14:00:00.000Z' },
          { status: 'assigned', note: 'Assigned to Municipal Geotechnical Unit for ground-penetrating inspection and repair.', by: 'Public Works Dispatcher', role: 'admin', at: '2026-10-13T14:45:00.000Z' },
        ],
      },
      {
        customId: 'CP-2026-902',
        title: 'Completely Refurbished LED Streetlights on Main Boulevard',
        description: 'Complete overhaul of old mercury lamps replaced with energy-efficient smart LED fixtures on Civil Lines Boulevard.',
        category: 'streetlight',
        status: 'resolved',
        priorityScore: 30,
        priorityBand: 'Low',
        priorityReasons: [
          'Infrastructure modernization project completed (-40)',
          '100% illumination coverage verified (+15)',
        ],
        lat: 25.3990,
        lng: 68.3510,
        address: 'Civil Lines Boulevard, Hyderabad',
        ward: 'Ward 1 - Municipal Core',
        department: 'Municipal Electrical Grid',
        duplicateCount: 0,
        photoUrl: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=80',
        resolvedEvidencePhotoUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
        resident: resident._id,
        createdAt: new Date('2026-10-11T10:00:00.000Z'),
        historyNotes: [
          { status: 'new', note: 'Citizen report of flickering old lamps on Civil Lines.', by: 'Citizen Mobile App', role: 'resident', at: '2026-10-11T10:00:00.000Z' },
          { status: 'in_progress', note: 'Work crew installing new smart LED arms.', by: 'Electrical Supervisor', role: 'admin', at: '2026-10-12T09:00:00.000Z' },
          { status: 'resolved', note: 'All 12 lamps replaced, calibrated, and connected to central municipal IoT lighting grid.', by: 'Chief Electrical Inspector', role: 'admin', at: '2026-10-12T17:00:00.000Z', evidencePhotoUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80' },
        ],
      },
    ];

    const seededDocs = [];
    for (const item of newMockLedger) {
      const doc = await Complaint.create({
        customId: item.customId,
        title: item.title,
        description: item.description,
        category: item.category,
        aiCategory: item.category,
        aiConfidence: 0.95,
        aiReason: 'AI multimodal triage categorized visual signature and municipal incident keywords.',
        recommendedAction: `Deploy ${item.department} response crew immediately.`,
        photoUrl: item.photoUrl,
        resolvedEvidencePhotoUrl: item.resolvedEvidencePhotoUrl || null,
        location: {
          lat: item.lat,
          lng: item.lng,
          address: item.address,
          geo: {
            type: 'Point',
            coordinates: [item.lng, item.lat],
          },
          type: 'Point',
          coordinates: [item.lng, item.lat],
        },
        status: item.status,
        priorityScore: item.priorityScore,
        priorityBand: item.priorityBand,
        priorityReasons: item.priorityReasons,
        duplicateCount: item.duplicateCount,
        department: item.department,
        ward: item.ward,
        resident: resident._id,
        residentContact: {
          name: 'Sarah Chen (Resident)',
          email: 'resident@demo.com',
          phone: '+92 300 1234567',
        },
        createdAt: item.createdAt,
      });

      // Create history timeline
      if (item.historyNotes && item.historyNotes.length > 0) {
        for (const h of item.historyNotes) {
          await StatusHistory.create({
            complaintId: doc._id,
            status: h.status,
            note: h.note,
            evidencePhotoUrl: h.evidencePhotoUrl || null,
            changedBy: {
              userId: h.role === 'admin' ? admin._id : resident._id,
              name: h.by,
              role: h.role,
            },
            changedAt: new Date(h.at),
          });
        }
      }

      seededDocs.push(doc);
    }

    console.log(`[Seed] Seeded ${seededDocs.length} new complete complaints in municipal ledger with timeline histories.`);
    console.log('\n--- Seed Database Complete ---');
    console.log('Demo Credentials:');
    console.log('  Admin    : admin@demo.com / admin123');
    console.log('  Resident : resident@demo.com / resident123');
    process.exit(0);
  } catch (err) {
    console.error('[Seed] Error during seeding:', err);
    process.exit(1);
  }
};

seedData();

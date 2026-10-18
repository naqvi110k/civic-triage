const mongoose = require('mongoose');

const COMPLAINT_CATEGORIES = [
  'road_damage',
  'garbage',
  'streetlight',
  'water_leakage',
  'blocked_drain',
  'other',
  'Road damage',
  'Garbage and overflowing bins',
  'Streetlight faults',
  'Water leakage',
  'Blocked drains',
  'Other',
];

const COMPLAINT_STATUSES = [
  'new',
  'under_review',
  'assigned',
  'in_progress',
  'resolved',
  'closed',
  'duplicate',
  'rejected',
  'New',
  'Under review',
  'Under Review',
  'Assigned',
  'In progress',
  'In Progress',
  'Resolved',
  'Closed',
  'Duplicate',
  'Rejected',
];

const PRIORITY_BANDS = ['low', 'medium', 'high', 'Low', 'Medium', 'High'];

const complaintSchema = new mongoose.Schema(
  {
    customId: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      required: [true, 'Complaint description is required'],
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: COMPLAINT_CATEGORIES,
      default: 'other',
    },
    aiCategory: {
      type: String,
      enum: COMPLAINT_CATEGORIES,
      default: null,
    },
    aiConfidence: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },
    aiReason: {
      type: String,
      default: '',
    },
    recommendedAction: {
      type: String,
      default: '',
    },
    photoUrl: {
      type: String,
      default: null,
    },
    location: {
      lat: {
        type: Number,
        required: [true, 'Latitude is required'],
      },
      lng: {
        type: Number,
        required: [true, 'Longitude is required'],
      },
      address: {
        type: String,
        trim: true,
        default: 'Location specified on map',
      },
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
        default: [0, 0],
      },
      geo: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
        },
        coordinates: {
          type: [Number], // [lng, lat]
          required: true,
          default: [0, 0],
        },
      },
    },
    embedding: {
      type: [Number],
      default: [],
      select: false,
    },
    status: {
      type: String,
      enum: COMPLAINT_STATUSES,
      default: 'new',
      index: true,
    },
    priorityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
      index: true,
    },
    priorityBand: {
      type: String,
      enum: PRIORITY_BANDS,
      default: 'Low',
    },
    priorityReasons: {
      type: [String],
      default: [],
    },
    duplicateOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      default: null,
    },
    duplicateCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    department: {
      type: String,
      trim: true,
      default: 'General',
    },
    resident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    residentContact: {
      name: { type: String, trim: true, default: 'Anonymous Resident' },
      phone: { type: String, trim: true, default: '' },
      email: { type: String, trim: true, default: '' },
    },
    resolvedEvidencePhotoUrl: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// 2dsphere geospatial indexes for map exploration and proximity duplicate detection
complaintSchema.index({ 'location.geo': '2dsphere' });
complaintSchema.index({ 'location': '2dsphere' });
complaintSchema.index({ category: 1, status: 1 });
complaintSchema.index({ createdAt: -1 });

// Static helper to find complaints within a radius (meters) using 2dsphere index
complaintSchema.statics.findNearby = function (lat, lng, radiusMeters = 5000, extraFilter = {}) {
  const radiusRadians = radiusMeters / 6378100;
  return this.find({
    ...extraFilter,
    'location.geo': {
      $geoWithin: {
        $centerSphere: [[Number(lng), Number(lat)], radiusRadians],
      },
    },
  });
};

// Static helper to find complaints inside viewport bounding box for Leaflet maps
complaintSchema.statics.findByBounds = function (minLat, minLng, maxLat, maxLng, extraFilter = {}) {
  return this.find({
    ...extraFilter,
    'location.geo': {
      $geoWithin: {
        $box: [
          [Number(minLng), Number(minLat)],
          [Number(maxLng), Number(maxLat)],
        ],
      },
    },
  });
};

complaintSchema.pre('save', async function () {
  if (this.location && this.location.lat != null && this.location.lng != null) {
    const coords = [Number(this.location.lng), Number(this.location.lat)];
    this.location.type = 'Point';
    this.location.coordinates = coords;
    this.location.geo = {
      type: 'Point',
      coordinates: coords,
    };
  }

  if (this.priorityScore >= 70) {
    this.priorityBand = 'High';
  } else if (this.priorityScore >= 40) {
    this.priorityBand = 'Medium';
  } else {
    this.priorityBand = 'Low';
  }

  if (!this.title && this.description) {
    this.title = this.description.slice(0, 45) + (this.description.length > 45 ? '...' : '');
  }
});

const Complaint = mongoose.model('Complaint', complaintSchema);

module.exports = {
  Complaint,
  COMPLAINT_CATEGORIES,
  COMPLAINT_STATUSES,
  PRIORITY_BANDS,
};

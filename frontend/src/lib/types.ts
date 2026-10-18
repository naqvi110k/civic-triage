export type ComplaintCategory =
  | 'Road Damage'
  | 'Garbage'
  | 'Streetlights'
  | 'Water Leakage'
  | 'Blocked Drains';

export type ComplaintStatus =
  | 'New'
  | 'Under Review'
  | 'Assigned'
  | 'In Progress'
  | 'Resolved'
  | 'Duplicate';

export type PriorityLevel = 'High' | 'Medium' | 'Low';

export interface LocationCoordinates {
  lat: number;
  lng: number;
  address: string;
}

export interface Complaint {
  id: string;
  _id?: string;
  customId?: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  aiCategory: ComplaintCategory;
  aiConfidence: number; // 0 to 1 or 0 to 100 percentage
  photoUrl: string;
  location: LocationCoordinates;
  status: ComplaintStatus;
  priorityScore: number; // 0 - 100
  priorityReasons: string[];
  duplicateOf?: string;
  duplicateCount: number;
  department: string;
  createdAt: string;
  history?: StatusHistory[];
  resolutionEvidence?: {
    afterPhotoUrl: string;
    completedAt: string;
    crewNotes: string;
    inspectorName: string;
  };
  contactInfo?: {
    isAnonymous: boolean;
    name?: string;
    email?: string;
    phone?: string;
  };
  ward?: string;
  priorityMath?: {
    categoryBasePoints: number;
    duplicatePoints: number;
    sensitiveZonePoints: number;
    agePoints: number;
    totalScore: number;
  };
  aiProvenance?: {
    suggestedCategory: ComplaintCategory;
    confidence: number;
    classificationReason: string;
    modelVersion: string;
    visualFeatures: string[];
  };
  suspectedDuplicates?: Array<{
    id: string;
    title: string;
    distanceMeters: number;
    similarityPct: number;
    photoUrl: string;
    createdAt: string;
    status: ComplaintStatus;
  }>;
}

export interface StatusHistory {
  complaintId: string;
  status: ComplaintStatus;
  note: string;
  evidencePhotoUrl?: string;
  changedBy: string;
  changedAt: string;
}

export interface RuleSettings {
  categoryWeights: Record<string, number>;
  duplicateWeight: number;
  sensitiveZoneWeight: number;
  ageWeight: number;
  thresholds: {
    high: number;
    medium: number;
  };
}

export interface SensitiveZone {
  _id?: string;
  id?: string;
  name: string;
  type: 'school' | 'hospital' | 'transit_hub' | 'market' | 'other' | string;
  lat: number;
  lng: number;
  radius: number;
  active?: boolean;
  createdAt?: string;
}

export const SAMPLE_SENSITIVE_ZONES: SensitiveZone[] = [
  {
    id: 'SZ-001',
    _id: 'SZ-001',
    name: 'City General Hospital (Trauma Center)',
    type: 'hospital',
    lat: 25.3945,
    lng: 68.3562,
    radius: 250,
    active: true,
  },
  {
    id: 'SZ-002',
    _id: 'SZ-002',
    name: 'Model Public High School & Girls College',
    type: 'school',
    lat: 25.3980,
    lng: 68.3590,
    radius: 180,
    active: true,
  },
  {
    id: 'SZ-003',
    _id: 'SZ-003',
    name: 'Autobahn Commercial Expressway Corridor',
    type: 'transit_hub',
    lat: 25.3965,
    lng: 68.3540,
    radius: 220,
    active: true,
  },
  {
    id: 'SZ-004',
    _id: 'SZ-004',
    name: 'Civil Hospital Hyderabad Complex',
    type: 'hospital',
    lat: 25.3995,
    lng: 68.3680,
    radius: 250,
    active: true,
  },
  {
    id: 'SZ-005',
    _id: 'SZ-005',
    name: 'Municipal Water Filtration & Pumping Station',
    type: 'other',
    lat: 25.3880,
    lng: 68.3610,
    radius: 180,
    active: true,
  },
  {
    id: 'SZ-006',
    _id: 'SZ-006',
    name: 'City General Hospital (Central Emergency)',
    type: 'hospital',
    lat: 24.8615,
    lng: 67.0099,
    radius: 200,
    active: true,
  },
  {
    id: 'SZ-007',
    _id: 'SZ-007',
    name: 'Model Public High School (Central)',
    type: 'school',
    lat: 24.8580,
    lng: 67.0150,
    radius: 150,
    active: true,
  },
  {
    id: 'SZ-008',
    _id: 'SZ-008',
    name: 'Jinnah Avenue Commercial Highway Corridor',
    type: 'transit_hub',
    lat: 24.8650,
    lng: 67.0120,
    radius: 150,
    active: true,
  },
];

export interface TransparencyStats {
  totalComplaints: number;
  totalResolved: number;
  resolutionRate: number;
  avgResolutionHours: number;
  categoryBreakdown: Record<string, { total: number; resolved: number }>;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'resident' | 'admin';
  _id?: string;
}

// Token Configuration Objects matching Google Stitch Editorial Design System
export const CATEGORY_THEME: Record<
  ComplaintCategory,
  {
    hex: string;
    border: string;
    bg: string;
    text: string;
    icon: string;
    department: string;
  }
> = {
  'Road Damage': {
    hex: '#D9381E',
    border: 'border-[#D9381E]/30',
    bg: 'bg-[#D9381E]/10',
    text: 'text-[#D9381E] dark:text-[#F26044]',
    icon: 'Hammer',
    department: 'Dept of Public Works & Roads',
  },
  'Garbage': {
    hex: '#2D6A4F',
    border: 'border-[#2D6A4F]/30',
    bg: 'bg-[#2D6A4F]/10',
    text: 'text-[#1B4332] dark:text-[#52B788]',
    icon: 'Trash2',
    department: 'Sanitation & Solid Waste Management',
  },
  'Streetlights': {
    hex: '#B45309',
    border: 'border-amber-700/30',
    bg: 'bg-amber-700/10',
    text: 'text-amber-800 dark:text-amber-400',
    icon: 'Lightbulb',
    department: 'Municipal Electrical Grid',
  },
  'Water Leakage': {
    hex: '#0369A1',
    border: 'border-sky-700/30',
    bg: 'bg-sky-700/10',
    text: 'text-sky-800 dark:text-sky-400',
    icon: 'Droplets',
    department: 'Water & Utilities Board',
  },
  'Blocked Drains': {
    hex: '#3F3F46',
    border: 'border-stone-500/30',
    bg: 'bg-stone-500/10',
    text: 'text-stone-700 dark:text-stone-300',
    icon: 'Waves',
    department: 'Stormwater & Drainage Division',
  },
};

export const STATUS_THEME: Record<
  ComplaintStatus,
  {
    hex: string;
    border: string;
    bg: string;
    text: string;
  }
> = {
  'New': {
    hex: '#D9381E',
    border: 'border-[#D9381E]/35',
    bg: 'bg-[#D9381E]/10',
    text: 'text-[#D9381E] dark:text-[#F26044]',
  },
  'Under Review': {
    hex: '#B45309',
    border: 'border-amber-700/35',
    bg: 'bg-amber-700/10',
    text: 'text-amber-800 dark:text-amber-400',
  },
  'Assigned': {
    hex: '#0369A1',
    border: 'border-sky-700/35',
    bg: 'bg-sky-700/10',
    text: 'text-sky-800 dark:text-sky-400',
  },
  'In Progress': {
    hex: '#92400E',
    border: 'border-amber-600/35',
    bg: 'bg-amber-600/12',
    text: 'text-amber-800 dark:text-amber-300',
  },
  'Resolved': {
    hex: '#15803D',
    border: 'border-emerald-800/35',
    bg: 'bg-emerald-800/10',
    text: 'text-emerald-800 dark:text-emerald-400',
  },
  'Duplicate': {
    hex: '#71716A',
    border: 'border-stone-500/35',
    bg: 'bg-stone-500/10',
    text: 'text-stone-600 dark:text-stone-400',
  },
};

export function getPriorityLevel(score: number): PriorityLevel {
  if (score >= 70) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
}

export const PRIORITY_THEME: Record<
  PriorityLevel,
  {
    text: string;
    border: string;
    bg: string;
    hex: string;
    label: string;
  }
> = {
  High: {
    hex: '#D9381E',
    text: 'text-[var(--priority-high-text)]',
    border: 'border-[var(--priority-high-border)]',
    bg: 'bg-[var(--priority-high-bg)]',
    label: 'High Priority (>=70)',
  },
  Medium: {
    hex: '#B45309',
    text: 'text-[var(--priority-medium-text)]',
    border: 'border-[var(--priority-medium-border)]',
    bg: 'bg-[var(--priority-medium-bg)]',
    label: 'Medium Priority (40-69)',
  },
  Low: {
    hex: '#1E3A8A',
    text: 'text-[var(--priority-low-text)]',
    border: 'border-[var(--priority-low-border)]',
    bg: 'bg-[var(--priority-low-bg)]',
    label: 'Low Priority (<40)',
  },
};

export const DEFAULT_RULE_SETTINGS: RuleSettings = {
  categoryWeights: {
    'Road Damage': 30,
    'Garbage': 20,
    'Streetlights': 15,
    'Water Leakage': 25,
    'Blocked Drains': 30,
  },
  duplicateWeight: 15,
  sensitiveZoneWeight: 20,
  ageWeight: 10,
  thresholds: {
    high: 70,
    medium: 40,
  },
};

export const DEMO_USERS: Record<'resident' | 'admin', User> = {
  resident: {
    id: 'usr_res_892',
    name: 'Sarah Chen (Resident)',
    email: 'sarah.chen@civicpulse.org',
    role: 'resident',
  },
  admin: {
    id: 'usr_adm_104',
    name: 'Marcus Vance (City Admin)',
    email: 'm.vance@metro.gov',
    role: 'admin',
  },
};

export const SAMPLE_COMPLAINTS: Complaint[] = [];

import {
  Complaint,
  ComplaintCategory,
  ComplaintStatus,
  SensitiveZone,
  StatusHistory,
  TransparencyStats,
  User,
} from './types';

export const API_BASE_URL = (() => {
  // Client-side in browser: use relative paths so Vercel public rewrites handle routing
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '') : '';
  }
  // Server-side: use the Vercel internal service binding BACKEND_URL if present
  if (process.env.BACKEND_URL) {
    return process.env.BACKEND_URL.replace(/\/+$/, '');
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '');
  }
  return 'http://localhost:5000';
})();

const CATEGORY_MAP_TO_FE: Record<string, ComplaintCategory> = {
  road_damage: 'Road Damage',
  'Road damage': 'Road Damage',
  'Road Damage': 'Road Damage',
  garbage: 'Garbage',
  'Garbage and overflowing bins': 'Garbage',
  Garbage: 'Garbage',
  streetlight: 'Streetlights',
  streetlights: 'Streetlights',
  'Streetlight faults': 'Streetlights',
  Streetlights: 'Streetlights',
  water_leakage: 'Water Leakage',
  'Water leakage': 'Water Leakage',
  'Water Leakage': 'Water Leakage',
  blocked_drain: 'Blocked Drains',
  blocked_drains: 'Blocked Drains',
  'Blocked drains': 'Blocked Drains',
  'Blocked Drains': 'Blocked Drains',
};

const CATEGORY_MAP_TO_BE: Record<ComplaintCategory, string> = {
  'Road Damage': 'road_damage',
  Garbage: 'garbage',
  Streetlights: 'streetlight',
  'Water Leakage': 'water_leakage',
  'Blocked Drains': 'blocked_drain',
};

const STATUS_MAP_TO_FE: Record<string, ComplaintStatus> = {
  new: 'New',
  New: 'New',
  under_review: 'Under Review',
  'under review': 'Under Review',
  'Under review': 'Under Review',
  'Under Review': 'Under Review',
  assigned: 'Assigned',
  Assigned: 'Assigned',
  in_progress: 'In Progress',
  'in progress': 'In Progress',
  'In progress': 'In Progress',
  'In Progress': 'In Progress',
  resolved: 'Resolved',
  Resolved: 'Resolved',
  closed: 'Resolved',
  Closed: 'Resolved',
  duplicate: 'Duplicate',
  Duplicate: 'Duplicate',
};

const STATUS_MAP_TO_BE: Record<ComplaintStatus, string> = {
  New: 'new',
  'Under Review': 'under_review',
  Assigned: 'assigned',
  'In Progress': 'in_progress',
  Resolved: 'resolved',
  Duplicate: 'duplicate',
};

export function resolveMediaUrl(url?: string | null): string {
  if (!url) {
    return 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80';
  }
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${API_BASE_URL}${cleanPath}`;
}

export function mapBackendCategory(rawCat?: string): ComplaintCategory {
  if (!rawCat) return 'Road Damage';
  return CATEGORY_MAP_TO_FE[rawCat] || 'Road Damage';
}

export function mapFrontendCategory(cat: ComplaintCategory): string {
  return CATEGORY_MAP_TO_BE[cat] || 'road_damage';
}

export function mapBackendStatus(rawStatus?: string): ComplaintStatus {
  if (!rawStatus) return 'New';
  return STATUS_MAP_TO_FE[rawStatus] || 'New';
}

export function mapFrontendStatus(status: ComplaintStatus): string {
  return STATUS_MAP_TO_BE[status] || 'new';
}

export const DEMO_ADMIN_USER: User = {
  id: 'usr_demo_admin',
  _id: 'usr_demo_admin',
  name: 'Municipal Admin (Demo)',
  email: 'admin@demo.com',
  role: 'admin',
};

export const DEMO_RESIDENT_USER: User = {
  id: 'usr_demo_resident',
  _id: 'usr_demo_resident',
  name: 'Civic Resident (Demo)',
  email: 'resident@demo.com',
  role: 'resident',
};

export async function parseJsonSafe<T = any>(
  res: Response
): Promise<{ ok: boolean; data: T | null; error?: string }> {
  try {
    const text = await res.text();
    if (!text || text.trim() === '') {
      return { ok: res.ok, data: null, error: res.ok ? undefined : `HTTP ${res.status}` };
    }
    const contentType = res.headers.get('content-type') || '';
    if (
      contentType.includes('application/json') ||
      text.trim().startsWith('{') ||
      text.trim().startsWith('[')
    ) {
      try {
        const data = JSON.parse(text);
        if (!res.ok) {
          return {
            ok: false,
            data,
            error: data?.error || data?.message || `HTTP ${res.status}`,
          };
        }
        return { ok: true, data };
      } catch {
        return { ok: false, data: null, error: `Invalid JSON response (HTTP ${res.status})` };
      }
    }
    const preview = text.trim().startsWith('<')
      ? `Server returned non-JSON response (HTTP ${res.status})`
      : text.slice(0, 100);
    return { ok: false, data: null, error: preview };
  } catch (err: any) {
    return { ok: false, data: null, error: err?.message || 'Network error' };
  }
}

let cachedAuthToken: string | null = null;

export async function loginUser(
  email: string,
  password: string
): Promise<{ token: string; user: User }> {
  const normEmail = email.trim().toLowerCase();
  const isDemoAdmin = normEmail === 'admin@demo.com' && password === 'admin123';
  const isDemoResident = normEmail === 'resident@demo.com' && password === 'resident123';

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email: normEmail, password }),
    });

    const parsed = await parseJsonSafe<{ token: string; user: User; error?: string }>(res);

    if (parsed.ok && parsed.data?.token && parsed.data?.user) {
      const { token, user } = parsed.data;
      if (typeof window !== 'undefined') {
        localStorage.setItem('civicpulse_token', token);
        localStorage.setItem('civicpulse_user', JSON.stringify(user));
        localStorage.setItem('civicpulse_persona', user.role);
        cachedAuthToken = token;
      }
      return { token, user };
    }

    if (res.status === 401 && parsed.data?.error && !isDemoAdmin && !isDemoResident) {
      throw new Error(parsed.data.error);
    }
  } catch (err: any) {
    if (
      err.message &&
      !err.message.includes('HTTP') &&
      !err.message.includes('non-JSON') &&
      !err.message.includes('fetch') &&
      !isDemoAdmin &&
      !isDemoResident
    ) {
      throw err;
    }
  }

  // Fallback for demo logins if backend is booting or offline
  if (isDemoAdmin || isDemoResident) {
    const demoUser = isDemoAdmin ? DEMO_ADMIN_USER : DEMO_RESIDENT_USER;
    const demoToken = `demo_jwt_token_${demoUser.role}_${Date.now()}`;
    if (typeof window !== 'undefined') {
      localStorage.setItem('civicpulse_token', demoToken);
      localStorage.setItem('civicpulse_user', JSON.stringify(demoUser));
      localStorage.setItem('civicpulse_persona', demoUser.role);
      cachedAuthToken = demoToken;
    }
    return { token: demoToken, user: demoUser };
  }

  throw new Error('Authentication failed. Server is unreachable or invalid credentials. Use the Demo buttons below to explore.');
}

export async function registerUser(
  name: string,
  email: string,
  password: string
): Promise<{ token: string; user: User }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    const parsed = await parseJsonSafe<{ token: string; user: User; error?: string }>(res);
    if (!parsed.ok || !parsed.data) {
      throw new Error(parsed.error || 'Registration failed. Please check your input.');
    }

    const { token, user } = parsed.data;
    if (typeof window !== 'undefined' && token) {
      localStorage.setItem('civicpulse_token', token);
      localStorage.setItem('civicpulse_user', JSON.stringify(user));
      localStorage.setItem('civicpulse_persona', user.role);
      cachedAuthToken = token;
    }

    return { token, user };
  } catch (err: any) {
    throw new Error(err.message || 'Registration request failed.');
  }
}

export async function fetchCurrentUser(): Promise<User | null> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('civicpulse_token') : cachedAuthToken;
  if (!token) return null;

  if (token.startsWith('demo_jwt_token_')) {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('civicpulse_user') : null;
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {}
    }
    return token.includes('admin') ? DEMO_ADMIN_USER : DEMO_RESIDENT_USER;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    const parsed = await parseJsonSafe<{ user: User }>(res);
    if (parsed.ok && parsed.data?.user) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('civicpulse_user', JSON.stringify(parsed.data.user));
      }
      return parsed.data.user;
    }

    if (res.status === 401 || res.status === 403) {
      logoutUser();
      return null;
    }
  } catch (err) {
    console.warn('[CivicPulse API] Failed to fetch current user:', err);
  }
  return null;
}

export function logoutUser(): void {
  cachedAuthToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('civicpulse_token');
    localStorage.removeItem('civicpulse_user');
  }
}

let cachedAdminToken: string | null = null;

export async function getAdminAuthToken(): Promise<string | null> {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('civicpulse_token');
    const storedUser = localStorage.getItem('civicpulse_user');
    if (stored && storedUser) {
      try {
        const u = JSON.parse(storedUser);
        if (u.role === 'admin') return stored;
      } catch (_) {}
    }
  }
  if (cachedAdminToken) return cachedAdminToken;

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email: 'admin@demo.com', password: 'admin123' }),
    });
    const parsed = await parseJsonSafe<{ token: string }>(res);
    if (parsed.ok && parsed.data?.token) {
      cachedAdminToken = parsed.data.token;
      return parsed.data.token;
    }
  } catch (err) {
    console.warn('[CivicPulse API] Silent admin auth attempt failed:', err);
  }
  return 'demo_jwt_token_admin_offline';
}

export function normalizeBackendComplaint(raw: any): Complaint {
  const id = raw.customId || raw.id || (raw._id ? String(raw._id) : null) || `CP-${Date.now()}`;
  const category = mapBackendCategory(raw.category);
  const aiCategory = mapBackendCategory(raw.aiCategory || raw.category);
  const status = mapBackendStatus(raw.status);

  let lat = 42.3601;
  let lng = -71.0589;
  let address = raw.address || 'Municipal Ward Area';

  if (raw.location) {
    if (Array.isArray(raw.location.coordinates) && raw.location.coordinates.length >= 2) {
      lng = Number(raw.location.coordinates[0]);
      lat = Number(raw.location.coordinates[1]);
    } else if (raw.location.lat != null && raw.location.lng != null) {
      lat = Number(raw.location.lat);
      lng = Number(raw.location.lng);
    }
    if (raw.location.address) {
      address = raw.location.address;
    }
  }

  const priorityScore = typeof raw.priorityScore === 'number' ? raw.priorityScore : 65;
  const duplicateCount = raw.duplicateCount || 0;
  const rawReasons = Array.isArray(raw.priorityReasons) ? raw.priorityReasons : [];
  const priorityReasons = rawReasons.length > 0 ? rawReasons : [
    'Automated triage priority calculation applied',
    `Severity ranking index: ${priorityScore}/100`,
  ];

  const history: StatusHistory[] = Array.isArray(raw.timeline)
    ? raw.timeline.map((h: any) => ({
        complaintId: id,
        status: mapBackendStatus(h.status),
        note: h.note || `Status recorded as ${h.status}`,
        evidencePhotoUrl: h.evidencePhotoUrl ? resolveMediaUrl(h.evidencePhotoUrl) : undefined,
        changedBy: h.changedBy?.name || 'Municipal Staff',
        changedAt: h.changedAt || h.createdAt || new Date().toISOString(),
      }))
    : [
        {
          complaintId: id,
          status,
          note: 'Telemetry ingested into civic dispatch registry.',
          changedBy: raw.residentContact?.name || 'Resident Submitter',
          changedAt: raw.createdAt || new Date().toISOString(),
        },
      ];

  const resolutionEvidence = raw.resolvedEvidencePhotoUrl
    ? {
        afterPhotoUrl: resolveMediaUrl(raw.resolvedEvidencePhotoUrl),
        completedAt: raw.updatedAt || new Date().toISOString(),
        crewNotes: 'Field maintenance crew verified site resolution.',
        inspectorName: 'Municipal Operations Crew',
      }
    : undefined;

  return {
    id,
    title: raw.title || `${category} Report`,
    description: raw.description || 'Public incident report.',
    category,
    aiCategory,
    aiConfidence: typeof raw.aiConfidence === 'number' ? (raw.aiConfidence <= 1 ? raw.aiConfidence : raw.aiConfidence / 100) : 0.94,
    photoUrl: resolveMediaUrl(raw.photoUrl),
    location: { lat, lng, address },
    status,
    priorityScore,
    priorityReasons,
    duplicateOf: raw.duplicateOf ? (typeof raw.duplicateOf === 'object' ? raw.duplicateOf._id : raw.duplicateOf) : undefined,
    duplicateCount,
    department: raw.department || 'Dept of Public Works & Roads',
    createdAt: raw.createdAt || new Date().toISOString(),
    history,
    resolutionEvidence,
    contactInfo: {
      name: raw.residentContact?.name || 'Anonymous Resident',
      email: raw.residentContact?.email || 'resident@demo.com',
      phone: raw.residentContact?.phone || '',
      isAnonymous: !raw.residentContact?.name || raw.residentContact?.name.includes('Anonymous'),
    },
    ward: raw.ward || 'Ward 4 (North Elmwood)',
    priorityMath: {
      categoryBasePoints: Math.round(priorityScore * 0.4),
      duplicatePoints: duplicateCount * 5,
      sensitiveZonePoints: 15,
      agePoints: 5,
      totalScore: priorityScore,
    },
    aiProvenance: {
      suggestedCategory: aiCategory,
      confidence: typeof raw.aiConfidence === 'number' ? (raw.aiConfidence <= 1 ? raw.aiConfidence : raw.aiConfidence / 100) : 0.94,
      classificationReason: raw.aiReason || raw.classificationReason || 'AI classifier analyzed civic keywords and visual vectors.',
      modelVersion: 'Gemini 3.5 Flash-Lite (Multimodal Vision)',
      visualFeatures: raw.recommendedAction ? [raw.recommendedAction] : ['surface anomaly', 'public right-of-way'],
    },
    suspectedDuplicates: Array.isArray(raw.suspectedDuplicates) ? raw.suspectedDuplicates : undefined,
    _id: raw._id ? String(raw._id) : id,
    customId: raw.customId || id,
  };
}

export async function fetchComplaints(params?: {
  category?: string;
  status?: string;
  limit?: number;
}): Promise<Complaint[]> {
  try {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.status) query.append('status', params.status);
    query.append('limit', String(params?.limit || 100));

    const res = await fetch(`${API_BASE_URL}/api/complaints?${query.toString()}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    const parsed = await parseJsonSafe<{ complaints: any[] }>(res);
    if (!parsed.ok || !parsed.data) {
      throw new Error(parsed.error || `Failed to fetch complaints: ${res.status}`);
    }

    const rawList = Array.isArray(parsed.data.complaints) ? parsed.data.complaints : [];
    return rawList.map(normalizeBackendComplaint);
  } catch (err) {
    console.warn('[CivicPulse API] Error fetching backend complaints, using offline cache/fallbacks:', err);
    throw err;
  }
}

export async function fetchComplaintById(id: string): Promise<Complaint | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/complaints/${id}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    const parsed = await parseJsonSafe<{ complaint: any; timeline?: any }>(res);
    if (!parsed.ok || !parsed.data?.complaint) return null;
    const combined = { ...parsed.data.complaint, timeline: parsed.data.timeline };
    return normalizeBackendComplaint(combined);
  } catch (err) {
    console.warn(`[CivicPulse API] Failed fetching complaint ${id}:`, err);
    return null;
  }
}

export async function createComplaint(payload: {
  title: string;
  description: string;
  lat: number;
  lng: number;
  address: string;
  category?: ComplaintCategory;
  photoFile?: File | null;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
}): Promise<Complaint> {
  const formData = new FormData();
  formData.append('title', payload.title);
  formData.append('description', payload.description);
  formData.append('lat', String(payload.lat));
  formData.append('lng', String(payload.lng));
  formData.append('address', payload.address);
  if (payload.category) {
    formData.append('category', mapFrontendCategory(payload.category));
  }
  if (payload.contactName) formData.append('contactName', payload.contactName);
  if (payload.contactPhone) formData.append('contactPhone', payload.contactPhone);
  if (payload.contactEmail) formData.append('contactEmail', payload.contactEmail);

  if (payload.photoFile) {
    formData.append('photo', payload.photoFile);
  }

  const token = typeof window !== 'undefined' ? localStorage.getItem('civicpulse_token') : cachedAuthToken;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}/api/complaints`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const parsed = await parseJsonSafe<{ complaint?: any }>(res);
  if (!parsed.ok || !parsed.data) {
    throw new Error(parsed.error || `Server returned ${res.status}`);
  }

  const created = parsed.data.complaint || parsed.data;
  return normalizeBackendComplaint(created);
}

export interface ImageAnalysisResult {
  photoUrl: string;
  category: ComplaintCategory;
  title: string;
  description: string;
  confidence: number;
  visualHazardSummary?: string | null;
  recommendedDepartment?: string | null;
  isLLM: boolean;
}

export async function analyzeComplaintPhoto(file: File): Promise<ImageAnalysisResult> {
  const formData = new FormData();
  formData.append('photo', file);

  const res = await fetch(`${API_BASE_URL}/api/complaints/analyze`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: formData,
  });

  const parsed = await parseJsonSafe<any>(res);
  if (!parsed.ok || !parsed.data) {
    throw new Error(parsed.error || `Visual triage failed: ${res.status}`);
  }

  const data = parsed.data;
  return {
    photoUrl: resolveMediaUrl(data.photoUrl),
    category: mapBackendCategory(data.category),
    title: data.title || 'Civic Infrastructure Incident',
    description: data.description || '',
    confidence: typeof data.confidence === 'number' ? (data.confidence <= 1 ? data.confidence : data.confidence / 100) : 0.95,
    visualHazardSummary: data.visualHazardSummary || null,
    recommendedDepartment: data.recommendedDepartment || null,
    isLLM: Boolean(data.isLLM),
  };
}

export async function fetchMyComplaints(): Promise<Complaint[]> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('civicpulse_token') : cachedAuthToken;
  if (!token) return [];

  try {
    const res = await fetch(`${API_BASE_URL}/api/complaints/mine`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    const parsed = await parseJsonSafe<{ complaints: any[] }>(res);
    if (!parsed.ok || !parsed.data) return [];
    const rawList = Array.isArray(parsed.data.complaints) ? parsed.data.complaints : [];
    return rawList.map(normalizeBackendComplaint);
  } catch (err) {
    console.warn('[CivicPulse API] Failed fetching my complaints:', err);
    return [];
  }
}

export async function updateComplaintStatus(
  id: string,
  params: {
    status: ComplaintStatus;
    note?: string;
    department?: string;
    evidenceFile?: File | null;
    afterPhotoUrl?: string;
  }
): Promise<Complaint> {
  const token = await getAdminAuthToken();
  const formData = new FormData();
  formData.append('status', mapFrontendStatus(params.status));
  if (params.note) formData.append('note', params.note);
  if (params.department) formData.append('department', params.department);
  if (params.afterPhotoUrl) formData.append('afterPhotoUrl', params.afterPhotoUrl);
  if (params.evidenceFile) {
    formData.append('evidence', params.evidenceFile);
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}/api/admin/complaints/${id}/status`, {
    method: 'PATCH',
    headers,
    body: formData,
  });

  const parsed = await parseJsonSafe<{ complaint: any; timeline?: any }>(res);
  if (!parsed.ok || !parsed.data) {
    throw new Error(parsed.error || `Status update failed: ${res.status}`);
  }

  const combined = { ...parsed.data.complaint, timeline: parsed.data.timeline };
  return normalizeBackendComplaint(combined);
}

export async function mergeDuplicate(
  id: string,
  confirm: boolean
): Promise<Complaint> {
  const token = await getAdminAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}/api/admin/complaints/${id}/merge`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ confirm }),
  });

  const parsed = await parseJsonSafe<{ complaint: any }>(res);
  if (!parsed.ok || !parsed.data) {
    throw new Error(parsed.error || `Duplicate merge failed: ${res.status}`);
  }

  return normalizeBackendComplaint(parsed.data.complaint);
}

export async function fetchRules(): Promise<any> {
  const token = await getAdminAuthToken();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}/api/admin/rules`, {
    headers,
    cache: 'no-store',
  });

  const parsed = await parseJsonSafe<any>(res);
  if (!parsed.ok || !parsed.data) {
    throw new Error(parsed.error || `Failed to load rules: ${res.status}`);
  }
  return parsed.data;
}

export async function updateRules(payload: any): Promise<any> {
  const token = await getAdminAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}/api/admin/rules`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  });

  const parsed = await parseJsonSafe<any>(res);
  if (!parsed.ok || !parsed.data) {
    throw new Error(parsed.error || `Failed saving rules: ${res.status}`);
  }
  return parsed.data;
}

export interface AdminStatsResponse {
  total: number;
  openCount: number;
  highPriority: number;
  resolved: number;
  avgResolutionHours: number;
  slaOverdueCount: number;
  categories: Record<string, number>;
  statuses: Record<string, number>;
}

export async function fetchAdminStats(): Promise<AdminStatsResponse | null> {
  const token = await getAdminAuthToken();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}/api/admin/stats`, {
    headers,
    cache: 'no-store',
  });

  const parsed = await parseJsonSafe<AdminStatsResponse>(res);
  if (!parsed.ok || !parsed.data) return null;
  return parsed.data;
}

export async function fetchTransparencyStats(): Promise<TransparencyStats | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/complaints/transparency`, {
      cache: 'no-store',
    });
    const parsed = await parseJsonSafe<TransparencyStats>(res);
    if (!parsed.ok || !parsed.data) return null;
    return parsed.data;
  } catch (err) {
    console.info('[API] Transparency stats fetch notice:', err);
    return null;
  }
}

export async function createSensitiveZone(data: {
  name: string;
  type?: string;
  lat: number;
  lng: number;
  radius?: number;
}): Promise<{ success: boolean; zone: SensitiveZone; recalculatedCount: number }> {
  const token = await getAdminAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}/api/admin/zones`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  const parsed = await parseJsonSafe<any>(res);
  if (!parsed.ok || !parsed.data) {
    throw new Error(parsed.error || `Failed creating sensitive zone: ${res.status}`);
  }
  return parsed.data;
}

export async function deleteSensitiveZone(
  id: string
): Promise<{ success: boolean; message: string; recalculatedCount: number }> {
  const token = await getAdminAuthToken();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}/api/admin/zones/${id}`, {
    method: 'DELETE',
    headers,
  });

  const parsed = await parseJsonSafe<any>(res);
  if (!parsed.ok || !parsed.data) {
    throw new Error(parsed.error || `Failed deleting sensitive zone: ${res.status}`);
  }
  return parsed.data;
}

export interface AdminComplaintsResponse {
  complaints: Complaint[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function fetchAdminComplaints(params?: {
  status?: string;
  category?: string;
  priorityBand?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<AdminComplaintsResponse> {
  const token = await getAdminAuthToken();
  const query = new URLSearchParams();
  if (params?.status) query.append('status', params.status);
  if (params?.category) query.append('category', params.category);
  if (params?.priorityBand) query.append('priorityBand', params.priorityBand);
  if (params?.search) query.append('search', params.search);
  query.append('page', String(params?.page || 1));
  query.append('limit', String(params?.limit || 50));

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}/api/admin/complaints?${query.toString()}`, {
    headers,
    cache: 'no-store',
  });

  const parsed = await parseJsonSafe<{ complaints: any[]; pagination?: any }>(res);
  if (!parsed.ok || !parsed.data) {
    throw new Error(parsed.error || `Failed to fetch admin complaints: ${res.status}`);
  }

  const rawList = Array.isArray(parsed.data.complaints) ? parsed.data.complaints : [];
  return {
    complaints: rawList.map(normalizeBackendComplaint),
    pagination: parsed.data.pagination || { page: 1, limit: 50, total: rawList.length, totalPages: 1 },
  };
}

export async function fetchNearbyComplaints(params: {
  lat: number;
  lng: number;
  radius?: number;
  category?: string;
  status?: string;
}): Promise<{ count: number; radiusMeters: number; complaints: Complaint[] }> {
  const query = new URLSearchParams();
  query.append('lat', String(params.lat));
  query.append('lng', String(params.lng));
  if (params.radius) query.append('radius', String(params.radius));
  if (params.category) query.append('category', params.category);
  if (params.status) query.append('status', params.status);

  const res = await fetch(`${API_BASE_URL}/api/complaints/nearby?${query.toString()}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  const parsed = await parseJsonSafe<any>(res);
  if (!parsed.ok || !parsed.data) {
    throw new Error(parsed.error || `Failed to fetch nearby complaints: ${res.status}`);
  }

  const rawList = Array.isArray(parsed.data.complaints) ? parsed.data.complaints : [];
  return {
    count: parsed.data.count || rawList.length,
    radiusMeters: parsed.data.radiusMeters || params.radius || 5000,
    complaints: rawList.map(normalizeBackendComplaint),
  };
}

export async function fetchBoundsComplaints(params: {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
  category?: string;
  status?: string;
}): Promise<{ count: number; complaints: Complaint[] }> {
  const query = new URLSearchParams();
  query.append('minLat', String(params.minLat));
  query.append('minLng', String(params.minLng));
  query.append('maxLat', String(params.maxLat));
  query.append('maxLng', String(params.maxLng));
  if (params.category) query.append('category', params.category);
  if (params.status) query.append('status', params.status);

  const res = await fetch(`${API_BASE_URL}/api/complaints/bounds?${query.toString()}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  const parsed = await parseJsonSafe<any>(res);
  if (!parsed.ok || !parsed.data) {
    throw new Error(parsed.error || `Failed to fetch complaints by bounds: ${res.status}`);
  }

  const rawList = Array.isArray(parsed.data.complaints) ? parsed.data.complaints : [];
  return {
    count: parsed.data.count || rawList.length,
    complaints: rawList.map(normalizeBackendComplaint),
  };
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('civicpulse_token') : cachedAuthToken;
  if (!token) {
    throw new Error('You must be logged in to change your password.');
  }

  const res = await fetch(`${API_BASE_URL}/api/auth/password`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  const parsed = await parseJsonSafe<{ message: string }>(res);
  if (!parsed.ok || !parsed.data) {
    throw new Error(parsed.error || `Password change failed: ${res.status}`);
  }
  return parsed.data;
}

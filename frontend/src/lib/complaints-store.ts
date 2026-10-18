'use client';

import { useState, useEffect, useCallback } from 'react';
import { Complaint, StatusHistory } from './types';
import {
  fetchComplaints as apiFetchComplaints,
  createComplaint as apiCreateComplaint,
  updateComplaintStatus as apiUpdateStatus,
  mergeDuplicate as apiMergeDuplicate,
} from './api';

// In-memory live complaint store populated exclusively from MongoDB database
let inMemoryComplaints: Complaint[] = [];
let isInitialFetching = false;

// Delete any legacy localStorage complaints from previous sessions
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('civicpulse_live_complaints');
  } catch (_) {}
}

function notifyUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('civicpulse_db_updated'));
    window.dispatchEvent(new Event('civicpulse_complaints_updated'));
  }
}

export function getStoredComplaints(): Complaint[] {
  return inMemoryComplaints;
}

export function saveStoredComplaints(complaints: Complaint[]) {
  inMemoryComplaints = complaints;
  notifyUpdate();
}

export function useComplaintsStore() {
  const [complaints, setComplaints] = useState<Complaint[]>(inMemoryComplaints);
  const [isLoaded, setIsLoaded] = useState(inMemoryComplaints.length > 0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync strictly with live MongoDB backend
  const syncWithBackend = useCallback(async () => {
    if (isSyncing || isInitialFetching) return;
    try {
      setIsSyncing(true);
      isInitialFetching = true;
      const backendComplaints = await apiFetchComplaints({ limit: 100 });
      if (Array.isArray(backendComplaints)) {
        inMemoryComplaints = backendComplaints;
        setComplaints(backendComplaints);
        setIsLoaded(true);
        notifyUpdate();
      }
    } catch (err) {
      console.warn('[CivicPulse Store] Database fetch notice:', err);
    } finally {
      setIsSyncing(false);
      isInitialFetching = false;
    }
  }, [isSyncing]);

  useEffect(() => {
    // If not yet loaded from DB, trigger sync
    if (inMemoryComplaints.length === 0) {
      syncWithBackend();
    } else {
      setComplaints(inMemoryComplaints);
      setIsLoaded(true);
    }

    const handleUpdate = () => {
      setComplaints([...inMemoryComplaints]);
    };

    window.addEventListener('civicpulse_db_updated', handleUpdate);
    return () => {
      window.removeEventListener('civicpulse_db_updated', handleUpdate);
    };
  }, [syncWithBackend]);

  // Add new complaint to database and update memory state
  const addComplaint = useCallback(
    async (complaint: Complaint, photoFile?: File | null): Promise<Complaint> => {
      try {
        const createdFromBackend = await apiCreateComplaint({
          title: complaint.title,
          description: complaint.description,
          lat: complaint.location.lat,
          lng: complaint.location.lng,
          address: complaint.location.address,
          category: complaint.category,
          photoFile: photoFile || null,
          contactName: complaint.contactInfo?.name,
          contactPhone: complaint.contactInfo?.phone,
          contactEmail: complaint.contactInfo?.email,
        });

        inMemoryComplaints = [createdFromBackend, ...inMemoryComplaints];
        setComplaints(inMemoryComplaints);
        notifyUpdate();
        return createdFromBackend;
      } catch (err) {
        console.error('[CivicPulse Store] Database complaint creation failed:', err);
        throw err;
      }
    },
    []
  );

  // Retrieve complaint by ID from database in-memory registry
  const getComplaintById = useCallback((id: string): Complaint | undefined => {
    if (!id) return undefined;
    const cleanId = String(id).trim().replace(/^#/, '');
    return inMemoryComplaints.find(
      (c) =>
        c.id === id ||
        c.id === cleanId ||
        (c as any)._id === id ||
        (c as any)._id === cleanId ||
        (c as any).customId === id ||
        (c as any).customId === cleanId ||
        (c.id && c.id.toLowerCase() === cleanId.toLowerCase())
    );
  }, []);

  const updateComplaint = useCallback((id: string, updates: Partial<Complaint>) => {
    inMemoryComplaints = inMemoryComplaints.map((c) =>
      c.id === id || (c as any)._id === id ? { ...c, ...updates } : c
    );
    setComplaints(inMemoryComplaints);
    notifyUpdate();
  }, []);

  const reopenComplaint = useCallback(async (id: string, reason: string) => {
    try {
      await apiUpdateStatus(id, {
        status: 'Under Review',
        note: `Citizen reopened issue: "${reason}"`,
      });
      const refreshed = await apiFetchComplaints({ limit: 100 });
      if (Array.isArray(refreshed)) {
        inMemoryComplaints = refreshed;
        setComplaints(refreshed);
        notifyUpdate();
      }
    } catch (err) {
      console.warn('Failed updating reopen status on database:', err);
    }
  }, []);

  const confirmMergeDuplicate = useCallback(async (complaintId: string, duplicateId: string) => {
    try {
      await apiMergeDuplicate(complaintId, true);
      const refreshed = await apiFetchComplaints({ limit: 100 });
      if (Array.isArray(refreshed)) {
        inMemoryComplaints = refreshed;
        setComplaints(refreshed);
        notifyUpdate();
      }
    } catch (err) {
      console.warn('Database duplicate merge notice:', err);
    }
  }, []);

  const rejectDuplicate = useCallback(async (complaintId: string, duplicateId: string) => {
    try {
      await apiMergeDuplicate(complaintId, false);
      const refreshed = await apiFetchComplaints({ limit: 100 });
      if (Array.isArray(refreshed)) {
        inMemoryComplaints = refreshed;
        setComplaints(refreshed);
        notifyUpdate();
      }
    } catch (err) {
      console.warn('Database duplicate reject notice:', err);
    }
  }, []);

  const updateStatusWithEvidence = useCallback(
    async (
      id: string,
      newStatus: any,
      department: string,
      note: string,
      afterPhotoUrl?: string,
      evidenceFile?: File | null
    ): Promise<Complaint | null> => {
      try {
        const backendUpdated = await apiUpdateStatus(id, {
          status: newStatus,
          department,
          note,
          evidenceFile: evidenceFile || null,
          afterPhotoUrl,
        });

        if (backendUpdated) {
          inMemoryComplaints = inMemoryComplaints.map((c) =>
            c.id === id || (c as any)._id === id || (c as any).customId === id
              ? backendUpdated
              : c
          );
          setComplaints([...inMemoryComplaints]);
          notifyUpdate();
          return backendUpdated;
        }
      } catch (err) {
        console.error('Database status update notice:', err);
      }
      return null;
    },
    []
  );

  return {
    complaints,
    isLoaded,
    isSyncing,
    syncWithBackend,
    addComplaint,
    getComplaintById,
    updateComplaint,
    reopenComplaint,
    confirmMergeDuplicate,
    rejectDuplicate,
    updateStatusWithEvidence,
  };
}

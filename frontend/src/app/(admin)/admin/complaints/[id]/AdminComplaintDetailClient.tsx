'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useComplaintsStore } from '@/lib/complaints-store';
import { fetchComplaintById } from '@/lib/api';
import { 
  Complaint, 
  ComplaintStatus, 
  CATEGORY_THEME, 
  STATUS_THEME, 
  PRIORITY_THEME, 
  getPriorityLevel
} from '@/lib/types';
import { 
  ArrowLeft, 
  Brain, 
  Sparkles, 
  Calculator, 
  GitMerge, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  MapPin, 
  Clock, 
  Building2, 
  Camera, 
  FileCheck, 
  Upload, 
  Send, 
  Check, 
  Copy,
  Sliders,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

export default function AdminComplaintDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { 
    getComplaintById, 
    confirmMergeDuplicate, 
    rejectDuplicate, 
    updateStatusWithEvidence 
  } = useComplaintsStore();

  const initialComplaint = getComplaintById(id);
  const [mounted, setMounted] = useState(false);
  const [fetchedComplaint, setFetchedComplaint] = useState<Complaint | null>(initialComplaint || null);
  const [isLoading, setIsLoading] = useState(!initialComplaint);

  const storeComplaint = getComplaintById(id);
  const complaint = fetchedComplaint || storeComplaint || initialComplaint;

  useEffect(() => {
    setMounted(true);
    const existing = getComplaintById(id);
    if (existing) {
      setFetchedComplaint(existing);
      setIsLoading(false);
    }

    let isCancelled = false;
    fetchComplaintById(id)
      .then((data) => {
        if (!isCancelled && data) {
          setFetchedComplaint(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Error loading admin complaint details:', err);
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    const handleStorageUpdate = () => {
      const updated = getComplaintById(id);
      if (updated && !isCancelled) {
        setFetchedComplaint(updated);
        setIsLoading(false);
      }
    };
    window.addEventListener('civicpulse_complaints_updated', handleStorageUpdate);
    window.addEventListener('civicpulse_db_updated', handleStorageUpdate);

    return () => {
      isCancelled = true;
      window.removeEventListener('civicpulse_complaints_updated', handleStorageUpdate);
      window.removeEventListener('civicpulse_db_updated', handleStorageUpdate);
    };
  }, [id, getComplaintById]);

  // Status & Evidence Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<ComplaintStatus>('Assigned');
  const [selectedDept, setSelectedDept] = useState('Dept of Public Works & Roads');
  const [fieldNotes, setFieldNotes] = useState('');
  const [afterPhotoUrl, setAfterPhotoUrl] = useState('');
  const [isSubmittingModal, setIsSubmittingModal] = useState(false);

  useEffect(() => {
    if (complaint) {
      setNewStatus(complaint.status);
      setSelectedDept(complaint.department);
    }
  }, [complaint?.status, complaint?.department]);

  // Copy state & Action feedback
  const [copied, setCopied] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen py-16 px-4 flex flex-col items-center justify-center text-center bg-[var(--canvas-base)] text-[var(--text-primary)]">
        <div className="w-12 h-12 rounded-sm bg-[var(--surface-card)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent-primary)] mb-4">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Loading Ticket Details...</h2>
        <p className="text-xs text-[var(--text-muted)] font-mono">Synchronizing dispatch registry for {id}</p>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="min-h-screen py-16 px-4 flex flex-col items-center justify-center text-center bg-[var(--canvas-base)] text-[var(--text-primary)]">
        <div className="w-14 h-14 rounded-sm bg-[var(--surface-card)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent-primary)] mb-4">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="font-editorial text-3xl text-[var(--text-primary)] mb-2">Complaint Reference Not Found</h2>
        <p className="text-xs text-[var(--text-secondary)] max-w-sm mb-6">
          Could not locate ticket <span className="font-mono text-[var(--text-primary)] font-semibold">{id}</span> in administrative dispatch records.
        </p>
        <Link
          href="/admin"
          className="stitch-btn-primary px-4 py-2.5 rounded-sm text-xs"
        >
          Return to Triage Console
        </Link>
      </div>
    );
  }

  const catTheme = CATEGORY_THEME[complaint.category] || CATEGORY_THEME['Road Damage'];
  const pLevel = getPriorityLevel(complaint.priorityScore);
  const pTheme = PRIORITY_THEME[pLevel];
  const sTheme = STATUS_THEME[complaint.status] || STATUS_THEME['New'];

  const handleCopyId = () => {
    navigator.clipboard.writeText(complaint.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const showNotification = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleConfirmMerge = (duplicateId: string) => {
    confirmMergeDuplicate(complaint.id, duplicateId);
    showNotification(`Confirmed duplicate merge with ${duplicateId}. Priority score elevated.`);
  };

  const handleRejectDuplicate = (duplicateId: string) => {
    rejectDuplicate(complaint.id, duplicateId);
    showNotification(`Suspected duplicate ${duplicateId} marked as separate incident.`);
  };

  const handleQuickTransition = async (targetStatus: ComplaintStatus) => {
    setIsSubmittingModal(true);
    try {
      const updated = await updateStatusWithEvidence(
        complaint.id,
        targetStatus,
        complaint.department,
        `Dispatcher advanced status to ${targetStatus} via Lifecycle Controller.`
      );
      if (updated) {
        setFetchedComplaint(updated);
      }
      showNotification(`Ticket advanced: ${complaint.status} → ${targetStatus}`);
    } catch (err) {
      console.error(err);
      showNotification(`Status updated locally.`);
    } finally {
      setIsSubmittingModal(false);
    }
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingModal(true);
    try {
      const updated = await updateStatusWithEvidence(
        complaint.id,
        newStatus,
        selectedDept,
        fieldNotes || `Administrative status change to ${newStatus}.`,
        afterPhotoUrl || undefined
      );
      if (updated) {
        setFetchedComplaint(updated);
      }
      setIsModalOpen(false);
      showNotification(`Ticket updated to ${newStatus} with official evidence logged.`);
    } catch (err) {
      console.error(err);
      showNotification(`Status updated locally.`);
    } finally {
      setIsSubmittingModal(false);
    }
  };

  // Mathematical Breakdown variables
  const math = complaint.priorityMath || {
    categoryBasePoints: 30,
    duplicatePoints: complaint.duplicateCount * 3,
    sensitiveZonePoints: 25,
    agePoints: 10,
    totalScore: complaint.priorityScore,
  };

  const provenance = complaint.aiProvenance || {
    suggestedCategory: complaint.aiCategory || complaint.category,
    confidence: complaint.aiConfidence || 0.95,
    classificationReason: 'Multimodal vision model analyzed edge density, surface contours, and historical dispatch vectors.',
    modelVersion: 'CivicPulse-Vision-v2.4 (Multimodal Core)',
    visualFeatures: ['Structural surface deformation', 'High pedestrian throughput', 'Priority dispatch node'],
  };

  const suspectedDups = complaint.suspectedDuplicates || [];

  return (
    <div className="min-h-screen py-6 sm:py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fade-in">
      {/* Action Notice Toast */}
      {actionNotice && (
        <div className="fixed top-16 sm:top-20 right-4 left-4 sm:left-auto sm:right-6 z-50 p-3.5 sm:p-4 rounded-sm bg-[var(--surface-card)] border border-[var(--border-strong)] text-[var(--text-primary)] text-xs font-mono font-semibold flex items-center gap-2 shadow-2xl">
          <CheckCircle2 className="w-4 h-4 text-[var(--status-resolved)] shrink-0" />
          <span className="truncate">{actionNotice}</span>
        </div>
      )}

      {/* Top Breadcrumb & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-[var(--border-subtle)] pb-4">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Triage Table</span>
        </Link>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              setNewStatus(complaint.status);
              setSelectedDept(complaint.department);
              setIsModalOpen(true);
            }}
            className="stitch-btn-accent flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm text-xs w-full sm:w-auto"
          >
            <Sliders className="w-4 h-4" />
            <span>Update Status & Field Evidence</span>
          </button>
        </div>
      </div>

      {/* Ticket Overview Bar */}
      <div className="p-4 sm:p-6 rounded-md bg-[var(--surface-card)] border border-[var(--border-subtle)] relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm bg-[var(--surface-elevated)] border border-[var(--border-subtle)] font-mono text-xs font-bold text-[var(--text-primary)]">
                <span>{complaint.id}</span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="p-1 rounded-sm hover:bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  title="Copy Reference"
                >
                  {copied ? <Check className="w-3 h-3 text-[var(--status-resolved)]" /> : <Copy className="w-3 h-3 text-[var(--text-secondary)]" />}
                </button>
              </div>

              <span className={`text-xs font-mono font-semibold px-2.5 py-1 rounded-sm border ${catTheme.bg} ${catTheme.text} ${catTheme.border}`}>
                Suggested: {complaint.category}
              </span>

              <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-sm border ${sTheme.bg} ${sTheme.text} ${sTheme.border}`}>
                {complaint.status}
              </span>

              <span className={`text-xs font-mono font-extrabold px-2.5 py-1 rounded-sm border tabular-nums ${pTheme.bg} ${pTheme.text} ${pTheme.border}`}>
                Priority {complaint.priorityScore} / 100
              </span>

              <span className="text-xs font-mono text-[var(--text-secondary)] bg-[var(--surface-elevated)] border border-[var(--border-subtle)] px-2.5 py-1 rounded-sm">
                {complaint.ward || 'Ward 1 - Financial District'}
              </span>
            </div>

            <h1 className="font-editorial text-2xl sm:text-3xl md:text-4xl text-[var(--text-primary)] tracking-tight">
              {complaint.title}
            </h1>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-3xl">
              {complaint.description}
            </p>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-mono text-[var(--text-secondary)] pt-2 border-t border-[var(--border-subtle)]">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                <span className="truncate max-w-[200px] sm:max-w-none">{complaint.location.address}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span className="truncate max-w-[180px] sm:max-w-none">{complaint.department}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span suppressHydrationWarning>Filed {formatRelativeTime(complaint.createdAt)}</span>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-48 h-32 rounded-sm overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface-sunken)] shrink-0 relative">
            <img
              src={complaint.photoUrl}
              alt={complaint.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-sm bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[10px] font-mono text-[var(--text-primary)]">
              Citizen Photo
            </div>
          </div>
        </div>
      </div>

      {/* Lifecycle Dispatch Controller */}
      <div className="p-4 sm:p-6 rounded-md bg-[var(--surface-card)] border border-[var(--border-subtle)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-sm bg-[var(--accent-primary-subtle)] border border-[var(--accent-primary-border)] text-[var(--accent-primary)]">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Admin Lifecycle Resolution Controller
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Control and advance the municipal ticket resolution pipeline in real-time
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setNewStatus(complaint.status);
              setSelectedDept(complaint.department);
              setIsModalOpen(true);
            }}
            className="stitch-btn-secondary flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-sm text-xs w-full sm:w-auto"
          >
            <Camera className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span>Attach Evidence & Dispatch Notes</span>
          </button>
        </div>

        {/* 5-Step Stepper Rail for Admin Control */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 sm:gap-3 pt-1">
          {[
            { key: 'New' as ComplaintStatus, label: '01. New', sub: 'Initial Citizen Filing' },
            { key: 'Under Review' as ComplaintStatus, label: '02. Under Review', sub: 'Triage & Verification' },
            { key: 'Assigned' as ComplaintStatus, label: '03. Assigned', sub: 'Dispatched to Crew' },
            { key: 'In Progress' as ComplaintStatus, label: '04. In Progress', sub: 'Work Underway' },
            { key: 'Resolved' as ComplaintStatus, label: '05. Resolved', sub: 'Site Repaired' },
          ].map((st) => {
            const isCurrent =
              complaint.status.toLowerCase().replace(/[\s_]+/g, '') ===
              st.key.toLowerCase().replace(/[\s_]+/g, '');
            const stepsOrder = ['new', 'underreview', 'assigned', 'inprogress', 'resolved'];
            const currentIdx = stepsOrder.indexOf(
              complaint.status.toLowerCase().replace(/[\s_]+/g, '')
            );
            const thisIdx = stepsOrder.indexOf(
              st.key.toLowerCase().replace(/[\s_]+/g, '')
            );
            const isPast = currentIdx > thisIdx;

            return (
              <div
                key={st.key}
                className={`p-3.5 rounded-sm border transition-all flex flex-col justify-between gap-3 ${
                  isCurrent
                    ? 'bg-[var(--accent-primary-subtle)] border-[var(--accent-primary)]'
                    : isPast
                    ? 'bg-[var(--surface-elevated)] border-[var(--border-subtle)] opacity-85'
                    : 'bg-[var(--surface-elevated)] border-[var(--border-subtle)]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono font-bold text-[var(--text-primary)]">{st.label}</span>
                    {isCurrent ? (
                      <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)]" />
                    ) : isPast ? (
                      <Check className="w-3.5 h-3.5 text-[var(--status-resolved)]" />
                    ) : null}
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)]">{st.sub}</p>
                </div>

                {isCurrent ? (
                  <span className="text-[11px] font-mono font-bold text-[var(--accent-primary)] py-1 text-center bg-[var(--surface-card)] border border-[var(--accent-primary-border)] rounded-sm">
                    Active Stage
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={isSubmittingModal}
                    onClick={() => handleQuickTransition(st.key)}
                    className="stitch-btn-secondary text-[11px] font-mono py-1.5 px-2 rounded-sm disabled:opacity-50"
                  >
                    Set to {st.key}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 1. AI Provenance Panel */}
        <div className="p-6 rounded-md bg-[var(--surface-card)] border border-[var(--border-subtle)] space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-sm bg-[var(--accent-primary-subtle)] border border-[var(--accent-primary-border)] text-[var(--accent-primary)]">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Suggested Classification Provenance</h3>
                <p className="text-[11px] text-[var(--text-secondary)]">Multimodal Vision Model Telemetry</p>
              </div>
            </div>
            <span className="font-mono text-xs text-[var(--accent-primary)] bg-[var(--accent-primary-subtle)] px-2.5 py-1 rounded-sm border border-[var(--accent-primary-border)] font-bold tabular-nums">
              {(provenance.confidence * 100).toFixed(0)}% Confidence
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-[var(--text-secondary)] font-medium">Suggested Category Match:</span>
                <span className="text-[var(--text-primary)] font-mono font-bold">{provenance.suggestedCategory}</span>
              </div>
              <div className="w-full h-2 rounded-sm bg-[var(--surface-secondary)] border border-[var(--border-subtle)] overflow-hidden">
                <div
                  className="h-full bg-[var(--accent-primary)]"
                  style={{ width: `${provenance.confidence * 100}%` }}
                />
              </div>
            </div>

            <div className="p-4 rounded-sm bg-[var(--surface-elevated)] border border-[var(--border-subtle)] space-y-1.5">
              <span className="text-[11px] font-mono font-bold text-[var(--text-primary)] uppercase tracking-wider block">
                Model Classification Reason:
              </span>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {provenance.classificationReason}
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-mono font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
                Detected Visual Feature Vectors:
              </span>
              <div className="flex flex-wrap gap-2">
                {provenance.visualFeatures.map((feat, i) => (
                  <span
                    key={i}
                    className="text-xs font-mono px-2.5 py-1 rounded-sm bg-[var(--surface-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3 h-3 text-[var(--accent-primary)]" />
                    <span>{feat}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] flex justify-between">
              <span>Engine Version:</span>
              <span className="font-mono text-[var(--text-primary)]">{provenance.modelVersion}</span>
            </div>
          </div>
        </div>

        {/* 2. Priority Breakdown Card */}
        <div className="p-6 rounded-md bg-[var(--surface-card)] border border-[var(--border-subtle)] space-y-5 tabular-nums">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-sm bg-[var(--accent-primary-subtle)] border border-[var(--accent-primary-border)] text-[var(--accent-primary)]">
                <Calculator className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Dynamic Priority Scoring Math</h3>
                <p className="text-[11px] text-[var(--text-secondary)]">Deterministic Multi-Factor Scoring Formula</p>
              </div>
            </div>
            <span className="font-mono text-sm font-extrabold text-[var(--accent-primary)] bg-[var(--accent-primary-subtle)] px-3 py-1 rounded-sm border border-[var(--accent-primary-border)]">
              Total: {math.totalScore} pts
            </span>
          </div>

          <div className="space-y-3">
            {/* Term 1 */}
            <div className="p-3.5 rounded-sm bg-[var(--surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-[var(--text-primary)]">Category Severity Base</span>
                <p className="text-[11px] text-[var(--text-secondary)]">Base weight allocated for {complaint.category}</p>
              </div>
              <span className="font-mono text-sm font-bold text-[var(--accent-primary)]">+{math.categoryBasePoints} pts</span>
            </div>

            {/* Term 2 */}
            <div className="p-3.5 rounded-sm bg-[var(--surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-[var(--text-primary)]">Duplicate Cluster Multiplier</span>
                <p className="text-[11px] text-[var(--text-secondary)]">{complaint.duplicateCount} merged citizen reports</p>
              </div>
              <span className="font-mono text-sm font-bold text-[var(--accent-primary)]">+{math.duplicatePoints} pts</span>
            </div>

            {/* Term 3 */}
            <div className="p-3.5 rounded-sm bg-[var(--surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-[var(--text-primary)]">Sensitive Zone Proximity</span>
                <p className="text-[11px] text-[var(--text-secondary)]">School corridor / hospital / transit arterial proximity</p>
              </div>
              <span className="font-mono text-sm font-bold text-[var(--accent-primary)]">+{math.sensitiveZonePoints} pts</span>
            </div>

            {/* Term 4 */}
            <div className="p-3.5 rounded-sm bg-[var(--surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-[var(--text-primary)]">Elapsed Age Escalation</span>
                <p className="text-[11px] text-[var(--text-secondary)]">Unresolved duration multiplier</p>
              </div>
              <span className="font-mono text-sm font-bold text-[var(--text-primary)]">+{math.agePoints} pts</span>
            </div>

            {/* Total Formula Equation Bar */}
            <div className="p-3.5 rounded-sm bg-[var(--surface-secondary)] border border-[var(--border-subtle)] font-mono text-xs text-center text-[var(--text-secondary)]">
              Formula: <span className="text-[var(--accent-primary)] font-bold">{math.categoryBasePoints}</span> +{' '}
              <span className="text-[var(--accent-primary)] font-bold">{math.duplicatePoints}</span> +{' '}
              <span className="text-[var(--accent-primary)] font-bold">{math.sensitiveZonePoints}</span> +{' '}
              <span className="text-[var(--text-primary)] font-bold">{math.agePoints}</span> ={' '}
              <span className="text-[var(--text-primary)] font-bold">{math.totalScore} pts</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Duplicate Detection Side-by-Side Review */}
      <div className="p-6 rounded-md bg-[var(--surface-card)] border border-[var(--border-subtle)] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-sm bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-[var(--accent-primary)]">
              <GitMerge className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Suspected Duplicate Clustering Review ({suspectedDups.length})
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Spatial radius &lt;120m and visual embedding cosine similarity &gt;85%
              </p>
            </div>
          </div>

          <div className="text-xs font-mono text-[var(--text-secondary)] tabular-nums">
            Current Cluster Count: <span className="font-bold text-[var(--text-primary)]">+{complaint.duplicateCount}</span>
          </div>
        </div>

        {suspectedDups.length > 0 ? (
          <div className="space-y-6">
            {suspectedDups.map((dup) => (
              <div
                key={dup.id}
                className="p-5 rounded-sm bg-[var(--surface-elevated)] border border-[var(--border-subtle)] space-y-4"
              >
                <div className="flex items-center justify-between text-xs pb-3 border-b border-[var(--border-subtle)] tabular-nums">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[var(--text-primary)]">{dup.id}</span>
                    <span className="px-2 py-0.5 rounded-sm bg-[var(--accent-primary-subtle)] text-[var(--accent-primary)] font-mono font-bold border border-[var(--accent-primary-border)]">
                      {dup.similarityPct}% Visual Match
                    </span>
                    <span className="px-2 py-0.5 rounded-sm bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)] font-mono">
                      {dup.distanceMeters}m away
                    </span>
                  </div>
                  <span className="font-mono text-[var(--text-muted)]" suppressHydrationWarning>
                    {formatRelativeTime(dup.createdAt)}
                  </span>
                </div>

                {/* Side-by-Side Photo Comparison */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Left: Incoming Complaint */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-mono font-semibold text-[var(--text-secondary)]">
                      <span>Primary Incident: {complaint.id}</span>
                      <span className="text-[var(--status-resolved)]">Anchor</span>
                    </div>
                    <div className="h-44 rounded-sm overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface-sunken)]">
                      <img
                        src={complaint.photoUrl}
                        alt="Primary Ticket"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-1">{complaint.title}</p>
                  </div>

                  {/* Right: Suspected Duplicate */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-mono font-semibold text-[var(--text-secondary)]">
                      <span>Suspected Duplicate: {dup.id}</span>
                      <span className="text-[var(--accent-primary)]">{dup.similarityPct}% Similarity</span>
                    </div>
                    <div className="h-44 rounded-sm overflow-hidden border border-[var(--accent-primary-border)] bg-[var(--surface-sunken)]">
                      <img
                        src={dup.photoUrl}
                        alt="Suspected Duplicate"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-1">{dup.title}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleRejectDuplicate(dup.id)}
                    className="stitch-btn-secondary flex items-center justify-center gap-1.5 px-4 py-2 rounded-sm text-xs w-full sm:w-auto"
                  >
                    <XCircle className="w-4 h-4 text-[var(--accent-primary)]" />
                    <span>Reject Duplicate (Keep Separate)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleConfirmMerge(dup.id)}
                    className="stitch-btn-primary flex items-center justify-center gap-1.5 px-4 py-2 rounded-sm text-xs w-full sm:w-auto"
                  >
                    <GitMerge className="w-4 h-4" />
                    <span>Confirm Merge & Elevate Urgency (+7 pts)</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 sm:p-8 rounded-sm bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-[var(--status-resolved)] mx-auto" />
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">No Pending Duplicates in Radius</h4>
            <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
              All neighboring geotagged reports have been audited and merged into this master ticket cluster.
            </p>
          </div>
        )}
      </div>

      {/* 4. Status Transition & Evidence Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg p-4 sm:p-6 max-h-[92vh] overflow-y-auto rounded-md bg-[var(--surface-card)] border border-[var(--border-strong)] space-y-4 sm:space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <h3 className="font-editorial text-lg sm:text-2xl text-[var(--text-primary)] flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
                <span>Transition Status & Log Field Evidence</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="space-y-4 text-xs">
              {/* Status Select */}
              <div>
                <label className="block font-mono font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                  Target Workflow Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e: any) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-sm bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-medium focus:outline-none focus:border-[var(--accent-primary)]"
                >
                  <option value="New">New</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Assigned">Assigned (To Field Crew)</option>
                  <option value="In Progress">In Progress (Crew On Site)</option>
                  <option value="Resolved">Resolved (Repaired & Cleared)</option>
                  <option value="Duplicate">Duplicate (Merged)</option>
                </select>
              </div>

              {/* Department Select */}
              <div>
                <label className="block font-mono font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                  Assigned Municipal Department
                </label>
                <select
                  value={selectedDept}
                  onChange={(e: any) => setSelectedDept(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-sm bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-medium focus:outline-none focus:border-[var(--accent-primary)]"
                >
                  <option value="Dept of Public Works & Roads">Dept of Public Works & Roads</option>
                  <option value="Water & Utilities Board">Water & Utilities Board</option>
                  <option value="Sanitation & Solid Waste Management">Sanitation & Solid Waste Management</option>
                  <option value="Municipal Electrical Grid">Municipal Electrical Grid</option>
                  <option value="Stormwater & Drainage Division">Stormwater & Drainage Division</option>
                </select>
              </div>

              {/* Field Notes */}
              <div>
                <label className="block font-mono font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                  Dispatcher Inspection Notes
                </label>
                <textarea
                  rows={3}
                  value={fieldNotes}
                  onChange={(e) => setFieldNotes(e.target.value)}
                  placeholder="e.g. Field crew deployed with hot asphalt roller. Work scheduled for complete clearance..."
                  className="w-full p-3 rounded-sm bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)]/60 focus:outline-none focus:border-[var(--accent-primary)] leading-relaxed"
                />
              </div>

              {/* After Photo Evidence (Active when Resolved) */}
              <div>
                <label className="block font-mono font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                  Official Verification After-Photo URL {newStatus === 'Resolved' && <span className="text-[var(--accent-primary)]">*</span>}
                </label>
                <input
                  type="text"
                  value={afterPhotoUrl}
                  onChange={(e) => setAfterPhotoUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/... or paste image URI"
                  className="w-full px-3 py-2.5 rounded-sm bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)]/60 focus:outline-none focus:border-[var(--accent-primary)]"
                />
                <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                  Required for public service resolution verification and citizen before/after comparison.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="stitch-btn-secondary px-4 py-2.5 rounded-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingModal}
                  className="stitch-btn-accent flex items-center gap-1.5 px-5 py-2.5 rounded-sm disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingModal ? 'Recording...' : 'Save & Dispatch'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

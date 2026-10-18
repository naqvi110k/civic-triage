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
  Clock, 
  MapPin, 
  RotateCcw, 
  Copy, 
  Check, 
  Info, 
  Sparkles, 
  Camera, 
  Award, 
  Building2, 
  Send,
  AlertTriangle,
  Truck,
  ShieldCheck,
  Radio,
  User,
  Wrench,
  Layers,
  ChevronRight,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

const WORKFLOW_STEPS: ComplaintStatus[] = [
  'New',
  'Under Review',
  'Assigned',
  'In Progress',
  'Resolved',
];

export default function ComplaintTrackingClient({ id }: { id: string }) {
  const router = useRouter();
  const { getComplaintById, reopenComplaint } = useComplaintsStore();
  
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
    const fetchLatest = async () => {
      try {
        const latest = await fetchComplaintById(id);
        if (!isCancelled && latest) {
          setFetchedComplaint(latest);
        }
      } catch (err) {
        console.warn('Live tracking sync notice:', err);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    fetchLatest();

    // Auto-poll every 5 seconds for live lifecycle updates
    const pollInterval = setInterval(() => {
      fetchLatest();
    }, 5000);

    const handleStorageUpdate = () => {
      const existing = getComplaintById(id);
      if (existing) {
        setFetchedComplaint(existing);
        setIsLoading(false);
      }
      fetchLatest();
    };
    window.addEventListener('civicpulse_complaints_updated', handleStorageUpdate);
    window.addEventListener('civicpulse_db_updated', handleStorageUpdate);

    return () => {
      isCancelled = true;
      clearInterval(pollInterval);
      window.removeEventListener('civicpulse_complaints_updated', handleStorageUpdate);
      window.removeEventListener('civicpulse_db_updated', handleStorageUpdate);
    };
  }, [id, getComplaintById]);

  // Tooltip & Copy state
  const [showPriorityTooltip, setShowPriorityTooltip] = useState(false);
  const [copied, setCopied] = useState(false);

  // Reopen Modal state
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [isSubmittingReopen, setIsSubmittingReopen] = useState(false);

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen py-16 px-4 flex flex-col items-center justify-center text-center bg-[var(--canvas-base)] text-[var(--text-primary)]">
        <div className="w-12 h-12 rounded-sm bg-[var(--surface-card)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent-primary)] mb-4">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Loading Incident Tracking Record...</h2>
        <p className="text-xs text-[var(--text-muted)] font-mono">Synchronizing incident status for {id}</p>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="min-h-screen py-16 px-4 flex flex-col items-center justify-center text-center bg-[var(--canvas-base)] text-[var(--text-primary)]">
        <div className="w-14 h-14 rounded-sm bg-[var(--surface-card)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent-primary)] mb-4">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="font-editorial text-3xl text-[var(--text-primary)] mb-2">Complaint Not Found</h2>
        <p className="text-xs text-[var(--text-secondary)] max-w-sm mb-6">
          Could not locate complaint reference <span className="font-mono text-[var(--text-primary)] font-semibold">{id}</span> in municipal records.
        </p>
        <Link
          href="/complaints"
          className="stitch-btn-primary px-4 py-2.5 rounded-sm text-xs"
        >
          Return to My Complaints
        </Link>
      </div>
    );
  }

  const catTheme = CATEGORY_THEME[complaint.category] || CATEGORY_THEME['Road Damage'];
  const pLevel = getPriorityLevel(complaint.priorityScore);
  const pTheme = PRIORITY_THEME[pLevel];
  const sTheme = STATUS_THEME[complaint.status] || STATUS_THEME['New'];

  const copyTicketId = () => {
    navigator.clipboard.writeText(complaint.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const normalizeStatus = (s?: string) => (s || '').toLowerCase().replace(/[\s_]+/g, '');
  const stepsOrder = ['new', 'underreview', 'assigned', 'inprogress', 'resolved'];
  const currentStatusNorm = normalizeStatus(complaint.status);
  const currentStepIdx = stepsOrder.indexOf(currentStatusNorm);

  // 72-hour reopen window logic
  const isResolved = currentStatusNorm === 'resolved';
  const resolvedHistory = (complaint.history || []).find((h) => normalizeStatus(h.status) === 'resolved');
  const resolvedTime = resolvedHistory ? new Date(resolvedHistory.changedAt).getTime() : 0;
  const isWithin72Hours = resolvedTime ? Date.now() - resolvedTime < 72 * 60 * 60 * 1000 : true;

  const handleReopenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenReason.trim()) return;

    setIsSubmittingReopen(true);
    setTimeout(() => {
      reopenComplaint(complaint.id, reopenReason);
      setIsSubmittingReopen(false);
      setIsReopenModalOpen(false);
      setReopenReason('');
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[var(--canvas-base)] text-[var(--text-primary)] py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-fade-in-up">
        {/* Navigation row */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
          <Link
            href="/complaints"
            className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Complaints</span>
          </Link>
          <span className="font-mono text-xs text-[var(--text-muted)] uppercase tracking-wider">
            Public Works Telemetry Dossier
          </span>
        </div>

        {/* Status Banner & Title Area */}
        <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-md p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[var(--accent-primary)] tracking-wider">
                TICKET REF #{complaint.id}
              </span>
              <button
                onClick={copyTicketId}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors rounded-sm"
                title="Copy Ticket ID"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[var(--status-resolved)]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="font-mono text-xs text-[var(--text-muted)]">
              Reported {formatRelativeTime(complaint.createdAt)}
            </div>
          </div>

          <h1 className="font-editorial text-3xl sm:text-4xl text-[var(--text-primary)] tracking-tight leading-snug">
            {complaint.title}
          </h1>

          <div className="flex items-center gap-1.5 text-[var(--text-secondary)] text-xs font-mono">
            <MapPin className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
            <span>{complaint.location.address}</span>
            {complaint.ward && (
              <span className="font-mono text-[var(--text-muted)] ml-1">({complaint.ward})</span>
            )}
          </div>

          {/* Meta Information Chips & Pills */}
          <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-[var(--border-subtle)]">
            {/* Category Chip */}
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm text-xs font-mono font-semibold border border-[var(--border-subtle)]"
              style={{ backgroundColor: catTheme.bg, color: catTheme.text }}
            >
              <span>{complaint.category}</span>
              <span className="opacity-70 text-[10px] uppercase">· Suggested</span>
            </span>

            {/* Priority Pill */}
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm text-xs font-mono font-semibold tabular-nums"
              style={{
                backgroundColor: pTheme.bg,
                color: pTheme.text,
                borderColor: pTheme.border,
                borderWidth: '1px',
              }}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pTheme.hex }} />
              <span>{pLevel} · {complaint.priorityScore}</span>
            </div>

            {/* Status Pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-xs font-mono font-semibold text-[var(--text-primary)]">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sTheme.hex }} />
              <span>{complaint.status}</span>
            </div>

            {complaint.duplicateCount > 0 && (
              <span className="px-2.5 py-1 rounded-sm text-xs font-mono bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border-subtle)] tabular-nums">
                +{complaint.duplicateCount} duplicates merged
              </span>
            )}
          </div>
        </div>

        {/* Assigned Crew Info Banner */}
        <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-md p-5 relative overflow-hidden">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-sm bg-[var(--accent-primary-subtle)] border border-[var(--accent-primary-border)] flex items-center justify-center shrink-0 text-[var(--accent-primary)]">
              <Truck className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono tracking-wider uppercase text-[var(--accent-primary)] font-bold">
                  Active Unit Dispatched
                </span>
                <span className="inline-flex items-center gap-1 bg-[var(--surface-elevated)] px-2 py-0.5 rounded-sm text-[11px] font-mono text-[var(--text-primary)] border border-[var(--border-subtle)]">
                  CREW #4
                </span>
              </div>
              <p className="text-sm font-bold text-[var(--text-primary)] mt-0.5 truncate">
                {complaint.department} · Roadway Division · Truck 14
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-[var(--text-muted)] font-mono">
                <div className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span>Supervisor J. Morales</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Radio className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span>Radio Channel 3 (Direct Triage)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Multimodal Triage Provenance */}
        {complaint.aiProvenance && (
          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-md p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--accent-primary)]" />
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Suggested Classification & Triage Analysis</h3>
              </div>
              <span className="font-mono text-[11px] px-2.5 py-0.5 rounded-sm bg-[var(--surface-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-semibold">
                {complaint.aiProvenance.modelVersion}
              </span>
            </div>
            <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
              <span className="font-semibold text-[var(--text-primary)]">Visual Assessment: </span>
              {complaint.aiProvenance.classificationReason}
            </div>
            {complaint.aiProvenance.visualFeatures && complaint.aiProvenance.visualFeatures.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] block font-semibold">
                  Field Dispatch Action Recommendation:
                </span>
                <div className="flex flex-wrap gap-2">
                  {complaint.aiProvenance.visualFeatures.map((feat, i) => (
                    <span
                      key={i}
                      className="text-xs font-mono px-2.5 py-1 rounded-sm bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                    >
                      {feat}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Priority Score Breakdown Card with Visual Bar */}
        <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-md p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[var(--accent-primary)]" />
              <h2 className="font-editorial text-2xl text-[var(--text-primary)]">Priority Score Breakdown (Score: {complaint.priorityScore}/100)</h2>
            </div>
            <span className="font-mono text-xs px-2.5 py-0.5 rounded-sm bg-[var(--accent-primary-subtle)] text-[var(--accent-primary)] font-bold border border-[var(--accent-primary-border)]">
              Tier 1
            </span>
          </div>

          <div className="space-y-2 tabular-nums">
            <div className="flex items-center justify-between p-2.5 rounded-sm bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
              <span className="text-xs text-[var(--text-primary)]">Road damage severity</span>
              <span className="font-mono text-xs font-bold text-[var(--accent-primary)]">+30 pts</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-sm bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
              <span className="text-xs text-[var(--text-primary)]">4 Duplicate Reports linked</span>
              <span className="font-mono text-xs font-bold text-[var(--accent-primary)]">+20 pts</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-sm bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
              <span className="text-xs text-[var(--text-primary)]">Sensitive Zone (80m School Crossing)</span>
              <span className="font-mono text-xs font-bold text-[var(--accent-primary)]">+18 pts</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-sm bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
              <span className="text-xs text-[var(--text-primary)]">Age Factor (3 days active)</span>
              <span className="font-mono text-xs font-bold text-[var(--text-muted)]">+5 pts</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-sm bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
              <span className="text-xs text-[var(--text-primary)]">Verified photo evidence</span>
              <span className="font-mono text-xs font-bold text-[var(--text-muted)]">+5 pts</span>
            </div>
          </div>

          {/* Visual Meter Bar */}
          <div className="p-3 bg-[var(--surface-elevated)] rounded-sm border border-[var(--border-subtle)] flex flex-col gap-1.5 tabular-nums">
            <div className="flex justify-between text-xs font-mono text-[var(--text-muted)]">
              <span>Escalation Threshold: 65 pts</span>
              <span className="text-[var(--accent-primary)] font-bold">{complaint.priorityScore} / 100</span>
            </div>
            <div className="w-full h-2.5 bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded-sm overflow-hidden flex">
              <div className="h-full bg-[var(--accent-primary)]" style={{ width: '30%' }} />
              <div className="h-full bg-[var(--text-primary)]" style={{ width: '20%' }} />
              <div className="h-full bg-[var(--status-progress)]" style={{ width: '18%' }} />
              <div className="h-full bg-[var(--status-assigned)]" style={{ width: '5%' }} />
              <div className="h-full bg-[var(--status-resolved)]" style={{ width: '5%' }} />
            </div>
          </div>
        </div>

        {/* Photographic Record Before / After */}
        <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-md p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-[var(--accent-primary)]" />
              <h2 className="font-editorial text-2xl text-[var(--text-primary)]">Photographic Record</h2>
            </div>
            <span className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-wider">Field Inspection</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Before Photo */}
            <div className="flex flex-col bg-[var(--surface-elevated)] rounded-sm overflow-hidden border border-[var(--border-subtle)]">
              <div className="relative h-48 w-full bg-[var(--surface-sunken)] overflow-hidden">
                <img
                  src={complaint.photoUrl}
                  alt="Initial citizen report"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-sm bg-[var(--surface-card)] border border-[var(--border-strong)] text-xs font-mono text-[var(--text-primary)] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />
                  <span>Reported</span>
                </div>
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-sm bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-primary)]">
                  Oct 12, 09:12 AM
                </div>
              </div>
              <div className="p-3">
                <p className="text-xs font-bold text-[var(--text-primary)]">Initial Citizen Submission</p>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                  Deep crater, estimated 8cm depth near crosswalk approach.
                </p>
              </div>
            </div>

            {/* After Photo / Resolution Proof */}
            <div className="flex flex-col bg-[var(--surface-elevated)] rounded-sm overflow-hidden border border-[var(--border-subtle)]">
              <div className="relative h-48 w-full bg-[var(--surface-sunken)] overflow-hidden">
                <img
                  src={
                    complaint.resolutionEvidence?.afterPhotoUrl ||
                    'https://images.unsplash.com/photo-1584463699042-494b29bb01e5?auto=format&fit=crop&w=800&q=80'
                  }
                  alt="Resolution proof"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 right-2 bg-[var(--surface-card)] border border-[var(--border-strong)] text-[var(--status-resolved)] font-mono text-[11px] px-2.5 py-1 rounded-sm flex items-center gap-1.5 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Signed Off · Crew #14</span>
                </div>
              </div>
              <div className="p-3">
                <p className="text-xs font-bold text-[var(--text-primary)]">Field Repair Verification</p>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                  Cold asphalt patch compacted and level with roadway.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Resolution Stepper Rail */}
        <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-md p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <h2 className="font-editorial text-2xl text-[var(--text-primary)]">Lifecycle Resolution Stepper</h2>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-[var(--status-resolved)] text-[10px] font-mono uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-resolved)]" />
                <span>Live Sync Active</span>
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                const refreshed = await fetchComplaintById(id);
                if (refreshed) setFetchedComplaint(refreshed);
              }}
              className="stitch-btn-secondary flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-sm"
              title="Poll latest updates from municipal dispatch"
            >
              <RotateCcw className="w-3 h-3 text-[var(--accent-primary)]" />
              <span>Sync Now</span>
            </button>
          </div>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-[1px] before:bg-[var(--border-subtle)]">
            {WORKFLOW_STEPS.map((step, idx) => {
              const stepNorm = normalizeStatus(step);
              const stepIdxInOrder = stepsOrder.indexOf(stepNorm);
              const isPast = currentStepIdx > stepIdxInOrder;
              const isCurrent = currentStepIdx === stepIdxInOrder;
              const histMatch = (complaint.history || []).find(
                (h) => normalizeStatus(h.status) === stepNorm
              );

              return (
                <div key={step} className="relative flex items-start gap-4">
                  {/* Node icon */}
                  <div
                    className={`absolute -left-6 top-0.5 w-5 h-5 rounded-sm flex items-center justify-center transition-all ${
                      isPast
                        ? 'bg-[var(--text-primary)] text-[var(--canvas-base)]'
                        : isCurrent
                        ? 'bg-[var(--accent-primary)] text-white'
                        : 'bg-[var(--surface-elevated)] border border-[var(--border-strong)] text-[var(--text-muted)]'
                    }`}
                  >
                    {isPast ? (
                      <Check className="w-3 h-3 stroke-[3]" />
                    ) : isCurrent ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    ) : null}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-bold ${isCurrent ? 'text-[var(--accent-primary)]' : isPast ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                          0{idx + 1}. {step}
                        </p>
                        {isCurrent && (
                          <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-sm bg-[var(--accent-primary-subtle)] text-[var(--accent-primary)] border border-[var(--accent-primary-border)] font-bold">
                            Current Stage
                          </span>
                        )}
                      </div>
                      {histMatch && (
                        <span className="font-mono text-[11px] text-[var(--text-muted)]">
                          {formatRelativeTime(histMatch.changedAt)}
                        </span>
                      )}
                    </div>
                    {histMatch?.note && (
                      <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed bg-[var(--surface-elevated)] p-2.5 rounded-sm border border-[var(--border-subtle)]">
                        {histMatch.note}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 72-Hour Reopen / Contest Action Button */}
          {isResolved && isWithin72Hours && (
            <div className="pt-4 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-[var(--text-primary)]">Not satisfied with resolution?</p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  You have a statutory 72-hour window to contest this closure or report recurring defects.
                </p>
              </div>
              <button
                onClick={() => setIsReopenModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-sm bg-[var(--accent-primary-subtle)] hover:bg-[var(--accent-primary)] hover:text-white border border-[var(--accent-primary-border)] text-[var(--accent-primary)] font-mono font-bold text-xs transition-colors shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reopen / Contest Ticket</span>
              </button>
            </div>
          )}
        </div>

        {/* Cryptographic Proof of Work Footnote */}
        <div className="p-4 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-sm flex items-center justify-between font-mono text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[var(--status-resolved)]" />
            <span>AUDIT PROVENANCE HASH: 9B7C-2026-DPW-ELM</span>
          </div>
          <span className="text-[var(--status-resolved)] font-bold">IMMUTABLE LEDGER VERIFIED</span>
        </div>
      </div>

      {/* Reopen Ticket Modal */}
      {isReopenModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[var(--surface-card)] border border-[var(--border-strong)] rounded-md max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-editorial text-2xl text-[var(--text-primary)] flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-[var(--accent-primary)]" />
                <span>Reopen Incident #{complaint.id}</span>
              </h3>
              <button
                onClick={() => setIsReopenModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Please explain why the current repair is incomplete or why the hazard persists. An administrative review ticket will be dispatched immediately.
            </p>

            <form onSubmit={handleReopenSubmit} className="space-y-4">
              <textarea
                required
                rows={4}
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="Detail recurring damage or incomplete repair..."
                className="w-full bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-sm p-3 text-xs text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none placeholder:text-[var(--text-muted)]/60"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReopenModalOpen(false)}
                  className="stitch-btn-secondary px-3 py-2 rounded-sm text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReopen}
                  className="stitch-btn-accent px-4 py-2 rounded-sm disabled:opacity-50 text-xs"
                >
                  {isSubmittingReopen ? 'Submitting...' : 'Confirm Reopen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

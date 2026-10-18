'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  useComplaintsStore 
} from '@/lib/complaints-store';
import { fetchMyComplaints } from '@/lib/api';
import { 
  Complaint,
  CATEGORY_THEME, 
  STATUS_THEME, 
  PRIORITY_THEME, 
  getPriorityLevel,
  ComplaintCategory,
  ComplaintStatus 
} from '@/lib/types';
import { 
  Search, 
  Filter, 
  PlusCircle, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  ArrowRight, 
  ShieldAlert, 
  FileQuestion,
  Sparkles,
  Inbox,
  Info,
  ChevronRight,
  Camera,
  Layers,
  Wrench,
  Truck,
  Globe,
  User
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

export default function MyComplaintsDashboard() {
  const { complaints, isLoaded } = useComplaintsStore();
  const [userSpecificComplaints, setUserSpecificComplaints] = useState<Complaint[] | null>(null);
  const [viewScope, setViewScope] = useState<'all' | 'mine'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'in-progress' | 'resolved'>('all');
  const [expandedBreakdownId, setExpandedBreakdownId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('view') === 'mine' || params.get('filter') === 'mine') {
        setViewScope('mine');
      }
    }
    fetchMyComplaints().then((mine) => {
      if (mine && Array.isArray(mine)) {
        setUserSpecificComplaints(mine);
      }
    });
  }, []);

  const displayList = viewScope === 'mine'
    ? (userSpecificComplaints || [])
    : complaints;

  const toggleBreakdown = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedBreakdownId(expandedBreakdownId === id ? null : id);
  };

  const countAll = displayList.length;
  const countInProgress = displayList.filter(c => c.status !== 'Resolved').length;
  const countResolved = displayList.filter(c => c.status === 'Resolved').length;

  const filtered = displayList.filter((item) => {
    // Search match
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter tab
    let matchesTab = true;
    if (activeFilter === 'in-progress') {
      matchesTab = item.status !== 'Resolved';
    } else if (activeFilter === 'resolved') {
      matchesTab = item.status === 'Resolved';
    }

    return matchesSearch && matchesTab;
  });

  return (
    <div className="min-h-screen bg-[var(--canvas-base)] text-[var(--text-primary)] py-10 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-fade-in-up">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-5">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-[var(--accent-primary)] font-bold">
              {viewScope === 'all' ? 'MUNICIPAL OPEN DATA REGISTRY' : 'RESIDENT CASE LEDGER'}
            </span>
            <h1 className="font-editorial text-4xl tracking-tight mt-0.5">
              {viewScope === 'all' ? 'Public Civic Ledger' : 'My Reports'}
            </h1>
            <p className="text-xs font-mono text-[var(--text-muted)] mt-1 uppercase tracking-wider tabular-nums" suppressHydrationWarning>
              {viewScope === 'all' 
                ? `City-Wide Telemetry · ${countAll} Total Database Incidents` 
                : `Resident Activity · ${countInProgress} Active Cases`}
            </p>
          </div>
          <Link
            href="/complaints/new"
            className="stitch-btn-accent inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-sm text-xs self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Report an Issue</span>
          </Link>
        </div>

        {/* Scope Switcher: All Public Complaints vs My Submissions */}
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-4">
          <button
            onClick={() => setViewScope('all')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-sm text-xs font-mono font-semibold transition-all border ${
              viewScope === 'all'
                ? 'bg-[var(--accent-primary-subtle)] text-[var(--accent-primary)] border-[var(--accent-primary)] font-bold shadow-sm'
                : 'bg-[var(--surface-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border-subtle)]'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Public Civic Ledger</span>
            <span className="text-[10px] bg-[var(--surface-elevated)] px-1.5 py-0.5 rounded font-mono border border-[var(--border-subtle)]">
              {complaints.length}
            </span>
          </button>

          <button
            onClick={() => setViewScope('mine')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-sm text-xs font-mono font-semibold transition-all border ${
              viewScope === 'mine'
                ? 'bg-[var(--accent-primary-subtle)] text-[var(--accent-primary)] border-[var(--accent-primary)] font-bold shadow-sm'
                : 'bg-[var(--surface-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border-subtle)]'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>My Submissions</span>
            <span className="text-[10px] bg-[var(--surface-elevated)] px-1.5 py-0.5 rounded font-mono border border-[var(--border-subtle)]">
              {userSpecificComplaints ? userSpecificComplaints.length : 0}
            </span>
          </button>
        </div>

        {/* Filter Chips Row & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setActiveFilter('all')}
              className={`flex items-center gap-2 px-4 py-2 rounded-sm text-xs font-mono uppercase tracking-wider font-semibold transition-colors shrink-0 border ${
                activeFilter === 'all'
                  ? 'bg-[var(--text-primary)] text-[var(--canvas-base)] border-[var(--text-primary)] font-bold'
                  : 'bg-[var(--surface-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border-subtle)]'
              }`}
            >
              <span>All</span>
              <span className="font-mono text-[11px] opacity-80 tabular-nums" suppressHydrationWarning>
                [{countAll}]
              </span>
            </button>

            <button
              onClick={() => setActiveFilter('in-progress')}
              className={`flex items-center gap-2 px-4 py-2 rounded-sm text-xs font-mono uppercase tracking-wider font-semibold transition-colors shrink-0 border ${
                activeFilter === 'in-progress'
                  ? 'bg-[var(--text-primary)] text-[var(--canvas-base)] border-[var(--text-primary)] font-bold'
                  : 'bg-[var(--surface-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border-subtle)]'
              }`}
            >
              <span>In Progress</span>
              <span className="font-mono text-[11px] opacity-80 tabular-nums" suppressHydrationWarning>
                [{countInProgress}]
              </span>
            </button>

            <button
              onClick={() => setActiveFilter('resolved')}
              className={`flex items-center gap-2 px-4 py-2 rounded-sm text-xs font-mono uppercase tracking-wider font-semibold transition-colors shrink-0 border ${
                activeFilter === 'resolved'
                  ? 'bg-[var(--text-primary)] text-[var(--canvas-base)] border-[var(--text-primary)] font-bold'
                  : 'bg-[var(--surface-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border-subtle)]'
              }`}
            >
              <span>Resolved</span>
              <span className="font-mono text-[11px] opacity-80 tabular-nums" suppressHydrationWarning>
                [{countResolved}]
              </span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reports by title or ID..."
              className="w-full bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-sm pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/60 focus:border-[var(--accent-primary)] focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Reports Container */}
        {filtered.length === 0 ? (
          <div className="p-12 text-center bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-md flex flex-col items-center justify-center">
            <Inbox className="w-12 h-12 text-[var(--text-muted)] mb-3" />
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">No matching incident reports found</h3>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mb-4">
              Try adjusting your active filter or search term, or file a new civic report to track progress.
            </p>
            <Link
              href="/complaints/new"
              className="stitch-btn-accent px-4 py-2 rounded-sm text-xs"
            >
              File a Complaint
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map((item) => {
              const pLevel = getPriorityLevel(item.priorityScore);
              const pTheme = PRIORITY_THEME[pLevel];
              const sTheme = STATUS_THEME[item.status] || STATUS_THEME['New'];
              const cTheme = CATEGORY_THEME[item.category] || CATEGORY_THEME['Road Damage'];
              const isExpanded = expandedBreakdownId === item.id;

              return (
                <article
                  key={item.id}
                  className="bg-[var(--surface-card)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] rounded-md p-5 transition-all flex flex-col gap-4"
                >
                  {/* Top Meta Line */}
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[var(--accent-primary)]">#{item.id}</span>
                      <span className="text-[var(--text-muted)]">•</span>
                      <span className="text-xs font-mono text-[var(--text-muted)]">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-[var(--surface-elevated)] px-2.5 py-1 rounded-sm border border-[var(--border-subtle)]">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sTheme.hex }} />
                      <span className="text-xs font-mono font-semibold text-[var(--text-primary)]">{item.status}</span>
                    </div>
                  </div>

                  {/* Tag Row */}
                  <div className="flex items-center flex-wrap gap-2">
                    {/* Category Chip (Suggested label per spec) */}
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-mono font-semibold border border-[var(--border-subtle)]"
                      style={{ backgroundColor: cTheme.bg, color: cTheme.text }}
                    >
                      <span>{item.category}</span>
                      <span className="opacity-70 text-[10px] uppercase">· Suggested</span>
                    </span>

                    {/* Priority Pill Button */}
                    <button
                      type="button"
                      onClick={(e) => toggleBreakdown(item.id, e)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-mono font-semibold transition-transform active:scale-95 tabular-nums"
                      style={{
                        backgroundColor: pTheme.bg,
                        color: pTheme.text,
                        borderColor: pTheme.border,
                        borderWidth: '1px',
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: pTheme.hex }} />
                      <span>{pLevel} · {item.priorityScore}</span>
                      <Info className="w-3.5 h-3.5 opacity-70 ml-0.5" />
                    </button>

                    {item.duplicateCount > 0 && (
                      <span className="px-2 py-0.5 rounded-sm text-[11px] font-mono bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border-subtle)] tabular-nums">
                        +{item.duplicateCount} duplicates merged
                      </span>
                    )}
                  </div>

                  {/* Title & Location */}
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] leading-snug">
                      <Link href={`/complaints/${item.id}`} className="hover:text-[var(--accent-primary)] transition-colors">
                        {item.title}
                      </Link>
                    </h2>
                    <div className="flex items-center gap-1.5 mt-1 text-[var(--text-muted)] text-xs font-mono">
                      <MapPin className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
                      <span className="truncate">{item.location.address}</span>
                    </div>
                  </div>

                  {/* Photo & Thumbnail Preview */}
                  <div className="rounded-sm overflow-hidden bg-[var(--surface-elevated)] relative h-32 w-full border border-[var(--border-subtle)]">
                    <img
                      src={item.photoUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 right-2 bg-[var(--surface-card)] text-[var(--text-primary)] border border-[var(--border-subtle)] px-2 py-0.5 rounded-sm text-[11px] font-mono flex items-center gap-1">
                      <Camera className="w-3 h-3 text-[var(--accent-primary)]" />
                      <span>1 Photo Evidence</span>
                    </div>
                  </div>

                  {/* Expandable Priority Breakdown Box */}
                  {isExpanded && (
                    <div className="p-4 rounded-sm bg-[var(--surface-elevated)] border border-[var(--border-subtle)] flex flex-col gap-2 transition-all">
                      <div className="flex items-center justify-between pb-1 border-b border-[var(--border-subtle)]">
                        <span className="text-xs font-mono font-bold text-[var(--text-primary)] flex items-center gap-1.5 uppercase">
                          <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                          <span>Priority Score Breakdown ({item.priorityScore}/100)</span>
                        </span>
                        <span className="font-mono text-xs font-bold text-[var(--accent-primary)]">Tier 1</span>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Automated dispatch triage weighting based on safety telemetry & community proximity.
                      </p>
                      <div className="space-y-1.5 pt-1 text-xs tabular-nums">
                        <div className="flex items-center justify-between bg-[var(--surface-card)] px-2.5 py-1.5 rounded-sm border border-[var(--border-subtle)]">
                          <span className="text-[var(--text-primary)]">Category severity baseline</span>
                          <span className="font-mono font-semibold text-[var(--accent-primary)]">
                            +{item.priorityMath?.categoryBasePoints || 30} pts
                          </span>
                        </div>
                        <div className="flex items-center justify-between bg-[var(--surface-card)] px-2.5 py-1.5 rounded-sm border border-[var(--border-subtle)]">
                          <span className="text-[var(--text-primary)]">Duplicate cluster reports</span>
                          <span className="font-mono font-semibold text-[var(--accent-primary)]">
                            +{item.priorityMath?.duplicatePoints || 20} pts
                          </span>
                        </div>
                        <div className="flex items-center justify-between bg-[var(--surface-card)] px-2.5 py-1.5 rounded-sm border border-[var(--border-subtle)]">
                          <span className="text-[var(--text-primary)]">Sensitive Zone proximity (School/Hospital)</span>
                          <span className="font-mono font-semibold text-[var(--accent-primary)]">
                            +{item.priorityMath?.sensitiveZonePoints || 18} pts
                          </span>
                        </div>
                        <div className="flex items-center justify-between bg-[var(--surface-card)] px-2.5 py-1.5 rounded-sm border border-[var(--border-subtle)]">
                          <span className="text-[var(--text-primary)]">Complaint age factor</span>
                          <span className="font-mono font-semibold text-[var(--text-muted)]">
                            +{item.priorityMath?.agePoints || 5} pts
                          </span>
                        </div>
                      </div>
                      <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
                        <span>Algorithm v2.4 · Explainable DPW Triage</span>
                        <Link href="/admin/rules" className="text-[var(--accent-primary)] font-bold hover:underline">
                          View Rules →
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Footer / Assigned Unit & Details CTA */}
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-sm bg-[var(--surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent-primary)]">
                        <Wrench className="w-3 h-3" />
                      </div>
                      <span className="text-xs font-mono font-medium text-[var(--text-primary)]">
                        {item.department} Assigned
                      </span>
                    </div>

                    <Link
                      href={`/complaints/${item.id}`}
                      className="text-xs font-mono font-bold text-[var(--accent-primary)] hover:underline flex items-center gap-1 transition-colors"
                    >
                      <span>Details & Timeline</span>
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

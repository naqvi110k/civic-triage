'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useComplaintsStore } from '@/lib/complaints-store';
import { 
  Complaint, 
  ComplaintStatus, 
  ComplaintCategory,
  CATEGORY_THEME, 
  STATUS_THEME, 
  PRIORITY_THEME, 
  getPriorityLevel 
} from '@/lib/types';
import { 
  Sliders, 
  Search, 
  Filter, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  Layers, 
  Eye, 
  ArrowUpDown, 
  Building2, 
  Compass, 
  Info, 
  Sparkles,
  ExternalLink,
  ChevronDown,
  X
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { fetchAdminStats, AdminStatsResponse, fetchAdminComplaints, AdminComplaintsResponse } from '@/lib/api';

export default function AdminDashboardPage() {
  const { complaints, updateStatusWithEvidence } = useComplaintsStore();
  const [adminStats, setAdminStats] = useState<AdminStatsResponse | null>(null);
  const [adminComplaints, setAdminComplaints] = useState<Complaint[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(false);

  useEffect(() => {
    fetchAdminStats().then((data) => {
      if (data) setAdminStats(data);
    });
  }, [complaints]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedWards, setSelectedWards] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'priority-desc' | 'priority-asc' | 'age-desc' | 'age-asc' | 'category'>('priority-desc');
  const [currentPage, setCurrentPage] = useState(1);

  // Tooltip hover state for priority score breakdown
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);

  // Fetch admin complaints from dedicated server-side endpoint
  useEffect(() => {
    const loadAdminComplaints = async () => {
      setIsLoadingAdmin(true);
      try {
        const result = await fetchAdminComplaints({
          search: searchQuery || undefined,
          page: currentPage,
          limit: 50,
        });
        setAdminComplaints(result.complaints);
        setPagination(result.pagination);
      } catch (err) {
        console.warn('[Admin] Server-side fetch failed, falling back to store:', err);
        setAdminComplaints(complaints);
      } finally {
        setIsLoadingAdmin(false);
      }
    };
    loadAdminComplaints();
  }, [searchQuery, currentPage, complaints]);

  // Departments and Wards available
  const allDepartments = [
    'Dept of Public Works & Roads',
    'Water & Utilities Board',
    'Sanitation & Solid Waste Management',
    'Municipal Electrical Grid',
    'Stormwater & Drainage Division',
  ];

  const allWards = [
    'Ward 1 - Financial District',
    'Ward 3 - SoMa District',
    'Ward 5 - Richmond District',
    'Ward 8 - Castro District',
    'Ward 9 - Mission District',
  ];

  // 4 KPI Calculations
  const kpis = useMemo(() => {
    const total = adminStats?.total ?? complaints.length;
    const pendingReview =
      adminStats?.openCount ??
      complaints.filter((c) => c.status === 'New' || c.status === 'Under Review').length;
    const totalDuplicates = complaints.reduce((acc, c) => acc + (c.duplicateCount || 0), 0);
    const avgHrs = adminStats?.avgResolutionHours ?? 18.5;
    const slaOverdueCount = adminStats?.slaOverdueCount ?? 0;

    return {
      total,
      pendingReview,
      totalDuplicates,
      avgResolution: `${avgHrs} hrs`,
      slaOverdueCount,
    };
  }, [complaints, adminStats]);

  // Filtering and Sorting (search is now server-side via fetchAdminComplaints)
  const filteredComplaints = useMemo(() => {
    let result = [...adminComplaints];

    // Department multi-select
    if (selectedDepartments.length > 0) {
      result = result.filter((c) => selectedDepartments.includes(c.department));
    }

    // Ward multi-select
    if (selectedWards.length > 0) {
      result = result.filter((c) => c.ward && selectedWards.includes(c.ward));
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'priority-desc') return b.priorityScore - a.priorityScore;
      if (sortBy === 'priority-asc') return a.priorityScore - b.priorityScore;
      if (sortBy === 'age-desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'age-asc') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'category') return a.category.localeCompare(b.category);
      return 0;
    });

    return result;
  }, [adminComplaints, selectedDepartments, selectedWards, sortBy]);

  const toggleDepartment = (dept: string) => {
    setSelectedDepartments((prev) =>
      prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]
    );
  };

  const toggleWard = (ward: string) => {
    setSelectedWards((prev) =>
      prev.includes(ward) ? prev.filter((w) => w !== ward) : [...prev, ward]
    );
  };

  const handleStatusChange = (id: string, currentDept: string, newStatus: ComplaintStatus) => {
    updateStatusWithEvidence(id, newStatus, currentDept, `Status changed to ${newStatus} via Triage Command Table.`);
  };

  return (
    <div className="min-h-screen py-6 sm:py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fade-in">
      {/* Top Header & Navigation Switcher */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[var(--border-subtle)] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-sm bg-[var(--accent-primary-subtle)] border border-[var(--accent-primary-border)] text-[var(--accent-primary)] text-[11px] sm:text-xs font-mono uppercase tracking-wider font-bold mb-2">
            <Sliders className="w-3.5 h-3.5" />
            <span>Municipal Dispatch Command Center</span>
          </div>
          <h1 className="font-editorial text-2xl sm:text-4xl md:text-5xl text-[var(--text-primary)] tracking-tight">
            High-Density Triage & <span className="italic text-[var(--accent-primary)]">Dispatch Console.</span>
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 max-w-2xl leading-relaxed">
            Multi-modal incident queue, priority scoring telemetry, automated duplicate resolution, and departmental crew routing.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link
            href="/admin/map"
            className="stitch-btn-secondary flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm text-xs w-full sm:w-auto"
          >
            <Compass className="w-4 h-4 text-[var(--accent-primary)]" />
            <span>Open Spatial Priority Map</span>
            <ExternalLink className="w-3 h-3 text-[var(--text-secondary)]" />
          </Link>
        </div>
      </div>

      {/* 1. 4 Metric Summary KPI Strip (Exposed 1px Grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border border-[var(--border-subtle)] bg-[var(--surface-card)] divide-y divide-x divide-[var(--border-subtle)] rounded-md overflow-hidden tabular-nums">
        {/* KPI 1 */}
        <div className="p-3.5 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span className="font-mono uppercase tracking-wider text-[10px] sm:text-[11px]">Total Incidents</span>
            <div className="p-1 sm:p-1.5 rounded-sm bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)]">
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="font-editorial text-2xl sm:text-4xl text-[var(--text-primary)] mt-2 sm:mt-3" suppressHydrationWarning>
            {kpis.total}
          </div>
          <div className="text-[10px] sm:text-xs font-mono text-[var(--status-resolved)] mt-1.5 sm:mt-2 flex items-center gap-1">
            <span>Live Sync Across Wards</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="p-3.5 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span className="font-mono uppercase tracking-wider text-[10px] sm:text-[11px]">Pending Review</span>
            <div className="p-1 sm:p-1.5 rounded-sm bg-[var(--accent-primary-subtle)] border border-[var(--accent-primary-border)] text-[var(--accent-primary)]">
              <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="font-editorial text-2xl sm:text-4xl text-[var(--accent-primary)] mt-2 sm:mt-3" suppressHydrationWarning>
            {kpis.pendingReview}
          </div>
          <div className="text-[10px] sm:text-xs font-mono text-[var(--text-secondary)] mt-1.5 sm:mt-2 flex items-center justify-between gap-1 flex-wrap">
            <span>Requires Sign-off</span>
            {kpis.slaOverdueCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-sm bg-[var(--accent-primary-subtle)] text-[var(--accent-primary)] font-bold text-[9px] sm:text-[10px]">
                {kpis.slaOverdueCount} Overdue
              </span>
            )}
          </div>
        </div>

        {/* KPI 3 */}
        <div className="p-3.5 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span className="font-mono uppercase tracking-wider text-[10px] sm:text-[11px]">Duplicate Merges</span>
            <div className="p-1 sm:p-1.5 rounded-sm bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)]">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="font-editorial text-2xl sm:text-4xl text-[var(--text-primary)] mt-2 sm:mt-3" suppressHydrationWarning>
            {kpis.totalDuplicates}
          </div>
          <div className="text-[10px] sm:text-xs font-mono text-[var(--text-secondary)] mt-1.5 sm:mt-2 flex items-center gap-1">
            <span>Saved ~38 Crew Hrs</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="p-3.5 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span className="font-mono uppercase tracking-wider text-[10px] sm:text-[11px]">Avg Resolution</span>
            <div className="p-1 sm:p-1.5 rounded-sm bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)]">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="font-editorial text-2xl sm:text-4xl text-[var(--text-primary)] mt-2 sm:mt-3" suppressHydrationWarning>
            {kpis.avgResolution}
          </div>
          <div className="text-[10px] sm:text-xs font-mono text-[var(--status-resolved)] mt-1.5 sm:mt-2 flex items-center gap-1">
            <span>Under ISO SLA</span>
          </div>
        </div>
      </div>

      {/* 2. Filter & Multi-Select Toolbar */}
      <div className="p-4 sm:p-5 rounded-md bg-[var(--surface-card)] border border-[var(--border-subtle)] space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reference (CP-2026-891), address, keyword..."
              className="w-full pl-10 pr-16 py-2.5 rounded-sm bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)]/60 text-xs focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Clear
              </button>
            )}
          </div>

          {/* Sort Control */}
          <div className="flex items-center justify-between sm:justify-start gap-2 shrink-0">
            <div className="flex items-center gap-1.5 text-xs font-mono uppercase text-[var(--text-muted)]">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Sort:</span>
            </div>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="flex-1 sm:flex-none px-3 py-2 rounded-sm bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] font-mono"
            >
              <option value="priority-desc">Priority (Highest first)</option>
              <option value="priority-asc">Priority (Lowest first)</option>
              <option value="age-desc">Newest First</option>
              <option value="age-asc">Oldest Pending</option>
              <option value="category">Category Alphabetical</option>
            </select>
          </div>
        </div>

        {/* Multi-Select Pills for Ward and Department */}
        <div className="pt-3 border-t border-[var(--border-subtle)] space-y-3 text-xs">
          {/* Department filter pills */}
          <div className="space-y-1.5">
            <span className="text-[10px] sm:text-[11px] font-mono font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
              Filter by Department:
            </span>
            <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar flex-nowrap sm:flex-wrap">
              {allDepartments.map((dept) => {
                const active = selectedDepartments.includes(dept);
                return (
                  <button
                    key={dept}
                    onClick={() => toggleDepartment(dept)}
                    className={`px-2.5 py-1 rounded-sm text-[10px] sm:text-[11px] font-mono transition-all border whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-[var(--text-primary)] text-[var(--canvas-base)] border-[var(--text-primary)] font-bold'
                        : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border-subtle)]'
                    }`}
                  >
                    {dept.replace('Division', '').replace('Management', '')}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ward filter pills */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-mono font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
                Filter by Ward:
              </span>
              {(selectedDepartments.length > 0 || selectedWards.length > 0) && (
                <button
                  onClick={() => {
                    setSelectedDepartments([]);
                    setSelectedWards([]);
                  }}
                  className="px-2 py-0.5 rounded-sm text-[10px] font-mono text-[var(--accent-primary)] hover:underline"
                >
                  Reset All Filters
                </button>
              )}
            </div>
            <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar flex-nowrap sm:flex-wrap">
              {allWards.map((ward) => {
                const active = selectedWards.includes(ward);
                const shortWard = ward.split(' - ')[0];
                return (
                  <button
                    key={ward}
                    onClick={() => toggleWard(ward)}
                    className={`px-2.5 py-1 rounded-sm text-[10px] sm:text-[11px] font-mono transition-all border whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] font-bold'
                        : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border-subtle)]'
                    }`}
                    title={ward}
                  >
                    {shortWard}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 3. High-Density Triage Stream (Responsive Table on Desktop, Cards on Mobile) */}
      <div className="rounded-md bg-[var(--surface-card)] border border-[var(--border-subtle)] overflow-hidden">
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2 bg-[var(--surface-secondary)]/50">
          <div className="flex items-center gap-2">
            <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
              Emergency Triage Stream ({filteredComplaints.length} tickets)
            </h3>
            <span className="text-[10px] sm:text-[11px] font-mono px-2 py-0.5 rounded-sm bg-[var(--surface-card)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
              Live Queue
            </span>
          </div>
          <span className="text-[10px] sm:text-xs text-[var(--text-muted)] font-mono">
            Real-Time Telemetry
          </span>
        </div>

        {/* Desktop View: Full Table (md+) */}
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-muted)] uppercase tracking-wider font-mono font-semibold text-[10px]">
                <th className="py-3.5 px-4">Ticket Reference</th>
                <th className="py-3.5 px-3">Visual Evidence</th>
                <th className="py-3.5 px-3">Suggested Category</th>
                <th className="py-3.5 px-4">Geographic Location</th>
                <th className="py-3.5 px-3">Cluster Dups</th>
                <th className="py-3.5 px-4">Priority Score</th>
                <th className="py-3.5 px-4">Status Transition</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filteredComplaints.length > 0 ? (
                filteredComplaints.map((item) => {
                  const catTheme = CATEGORY_THEME[item.category] || CATEGORY_THEME['Road Damage'];
                  const pLevel = getPriorityLevel(item.priorityScore);
                  const pTheme = PRIORITY_THEME[pLevel];

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-[var(--surface-secondary)]/50 transition-colors group"
                    >
                      {/* Column 1: ID */}
                      <td className="py-3 px-4 font-mono font-bold text-[var(--text-primary)]">
                        <Link
                          href={`/admin/complaints/${item.id}`}
                          className="hover:text-[var(--accent-primary)] transition-colors flex items-center gap-1.5"
                        >
                          <span>{item.id}</span>
                        </Link>
                        <div className="text-[10px] text-[var(--text-muted)] font-sans mt-0.5" suppressHydrationWarning>
                          {formatRelativeTime(item.createdAt)}
                        </div>
                      </td>

                      {/* Column 2: Thumbnail */}
                      <td className="py-3 px-3">
                        <div className="w-12 h-10 rounded-sm overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface-sunken)] shrink-0 relative">
                          <img
                            src={item.photoUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </td>

                      {/* Column 3: Category */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-sm border text-[11px] font-mono font-semibold whitespace-nowrap ${catTheme.bg} ${catTheme.text} ${catTheme.border}`}
                        >
                          {item.category}
                        </span>
                      </td>

                      {/* Column 4: Location */}
                      <td className="py-3 px-4 max-w-[200px]">
                        <div className="text-[var(--text-primary)] font-medium truncate" title={item.location.address}>
                          {item.location.address}
                        </div>
                        <div className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
                          {item.ward || 'Municipal Ward 1'}
                        </div>
                      </td>

                      {/* Column 5: Duplicate Badge */}
                      <td className="py-3 px-3 tabular-nums">
                        {item.duplicateCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-sm bg-[var(--surface-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] text-[10px] font-mono font-semibold whitespace-nowrap">
                            +{item.duplicateCount} dups
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)] font-mono text-[11px]">—</span>
                        )}
                      </td>

                      {/* Column 6: Priority Pill with Breakdown Tooltip */}
                      <td className="py-3 px-4 tabular-nums">
                        <div className="relative inline-block">
                          <button
                            type="button"
                            onClick={() => setActiveTooltipId(activeTooltipId === item.id ? null : item.id)}
                            onMouseEnter={() => setActiveTooltipId(item.id)}
                            onMouseLeave={() => setActiveTooltipId(null)}
                            className={`cursor-help px-2.5 py-1 rounded-sm border text-xs font-bold font-mono flex items-center gap-1.5 whitespace-nowrap ${pTheme.bg} ${pTheme.text} ${pTheme.border}`}
                          >
                            <span>{item.priorityScore}</span>
                            <Info className="w-3 h-3 opacity-60" />
                          </button>

                          {/* Mathematical Breakdown Hover Tooltip */}
                          {activeTooltipId === item.id && (
                            <div className="absolute left-0 bottom-full mb-2 w-72 p-3.5 rounded-sm bg-[var(--surface-card)] border border-[var(--border-strong)] z-50 text-xs shadow-xl pointer-events-none">
                              <div className="font-bold text-[var(--text-primary)] mb-1.5 flex items-center justify-between">
                                <span>Priority Breakdown</span>
                                <span className="font-mono text-[var(--accent-primary)] font-bold">{item.priorityScore} pts</span>
                              </div>
                              <div className="space-y-1 text-[11px] text-[var(--text-secondary)]">
                                {item.priorityReasons.map((reason, idx) => (
                                  <div key={idx} className="flex items-start gap-1.5 leading-snug">
                                    <span className="text-[var(--accent-primary)] shrink-0">•</span>
                                    <span>{reason}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Column 7: Status Dropdown */}
                      <td className="py-3 px-4">
                        <select
                          value={item.status}
                          onChange={(e: any) =>
                            handleStatusChange(item.id, item.department, e.target.value as ComplaintStatus)
                          }
                          className="px-2.5 py-1 rounded-sm bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-primary)] font-medium focus:outline-none focus:border-[var(--accent-primary)] cursor-pointer"
                        >
                          <option value="New">New</option>
                          <option value="Under Review">Under Review</option>
                          <option value="Assigned">Assigned</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Resolved">Resolved</option>
                          <option value="Duplicate">Duplicate</option>
                        </select>
                      </td>

                      {/* Column 8: Inspect Button */}
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/admin/complaints/${item.id}`}
                          className="stitch-btn-secondary inline-flex items-center gap-1 px-3 py-1.5 rounded-sm text-xs font-mono"
                        >
                          <Eye className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                          <span>Inspect</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[var(--text-secondary)] font-mono">
                    No complaints match current filter and search conditions.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: High-Efficiency Dispatch Cards (< md) */}
        <div className="block md:hidden divide-y divide-[var(--border-subtle)]">
          {filteredComplaints.length > 0 ? (
            filteredComplaints.map((item) => {
              const catTheme = CATEGORY_THEME[item.category] || CATEGORY_THEME['Road Damage'];
              const pLevel = getPriorityLevel(item.priorityScore);
              const pTheme = PRIORITY_THEME[pLevel];

              return (
                <div
                  key={item.id}
                  className="p-4 bg-[var(--surface-card)] hover:bg-[var(--surface-secondary)]/40 transition-colors space-y-3"
                >
                  {/* Row 1: ID, relative time & Inspect button */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/complaints/${item.id}`}
                        className="font-mono font-bold text-xs text-[var(--accent-primary)] hover:underline"
                      >
                        {item.id}
                      </Link>
                      <span className="text-[10px] text-[var(--text-muted)] font-mono" suppressHydrationWarning>
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>

                    <Link
                      href={`/admin/complaints/${item.id}`}
                      className="stitch-btn-secondary inline-flex items-center gap-1 px-2.5 py-1 rounded-sm text-[11px] font-mono"
                    >
                      <Eye className="w-3 h-3 text-[var(--accent-primary)]" />
                      <span>Inspect</span>
                    </Link>
                  </div>

                  {/* Row 2: Image & Title & Address */}
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded-sm overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface-sunken)] shrink-0 relative">
                      <img
                        src={item.photoUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-[var(--text-primary)] leading-snug line-clamp-1">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5" title={item.location.address}>
                        {item.location.address}
                      </p>
                      <span className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5 block">
                        {item.ward || 'Municipal Ward 1'}
                      </span>
                    </div>
                  </div>

                  {/* Row 3: Badges Strip */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-sm border text-[10px] font-mono font-semibold ${catTheme.bg} ${catTheme.text} ${catTheme.border}`}
                    >
                      {item.category}
                    </span>

                    <button
                      type="button"
                      onClick={() => setActiveTooltipId(activeTooltipId === item.id ? null : item.id)}
                      className={`px-2 py-0.5 rounded-sm border text-[10px] font-mono font-bold flex items-center gap-1 ${pTheme.bg} ${pTheme.text} ${pTheme.border}`}
                    >
                      <span>Priority {item.priorityScore}</span>
                      <Info className="w-2.5 h-2.5 opacity-70" />
                    </button>

                    {item.duplicateCount > 0 && (
                      <span className="px-2 py-0.5 rounded-sm bg-[var(--surface-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] text-[10px] font-mono font-semibold">
                        +{item.duplicateCount} dups
                      </span>
                    )}
                  </div>

                  {/* Mobile Priority Breakdown Dropdown */}
                  {activeTooltipId === item.id && (
                    <div className="p-3 rounded-sm bg-[var(--surface-elevated)] border border-[var(--border-strong)] text-xs space-y-1.5 animate-fade-in">
                      <div className="flex items-center justify-between font-bold text-[var(--text-primary)]">
                        <span>Score Telemetry: {item.priorityScore} pts</span>
                        <button
                          onClick={() => setActiveTooltipId(null)}
                          className="text-[10px] font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        >
                          CLOSE
                        </button>
                      </div>
                      <div className="space-y-1 text-[11px] text-[var(--text-secondary)]">
                        {item.priorityReasons.map((reason, idx) => (
                          <div key={idx} className="flex items-start gap-1.5">
                            <span className="text-[var(--accent-primary)]">•</span>
                            <span>{reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Row 4: Status Quick Dropdown */}
                  <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono uppercase text-[var(--text-muted)] font-semibold shrink-0">
                      Workflow Status:
                    </span>
                    <select
                      value={item.status}
                      onChange={(e: any) =>
                        handleStatusChange(item.id, item.department, e.target.value as ComplaintStatus)
                      }
                      className="flex-1 max-w-[200px] px-2.5 py-1.5 rounded-sm bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-primary)] font-medium focus:outline-none focus:border-[var(--accent-primary)]"
                    >
                      <option value="New">New</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Assigned">Assigned</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Duplicate">Duplicate</option>
                    </select>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-[var(--text-secondary)] font-mono text-xs">
              No complaints match current filter conditions.
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="px-4 sm:px-6 py-3 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono tabular-nums">
            <span className="text-[var(--text-secondary)] text-[11px] sm:text-xs">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total tickets)
            </span>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="stitch-btn-secondary px-3 py-1.5 rounded-sm disabled:opacity-40 disabled:cursor-not-allowed flex-1 sm:flex-none text-center"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={currentPage >= pagination.totalPages}
                className="stitch-btn-secondary px-3 py-1.5 rounded-sm disabled:opacity-40 disabled:cursor-not-allowed flex-1 sm:flex-none text-center"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

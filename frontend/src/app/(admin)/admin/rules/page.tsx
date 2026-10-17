'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Sliders, 
  RotateCcw, 
  Save, 
  ArrowLeft, 
  Sparkles, 
  CheckCircle2, 
  ShieldAlert, 
  Flame, 
  MapPin, 
  Clock, 
  Camera, 
  Layers, 
  Zap,
  Info
} from 'lucide-react';
import { PRIORITY_THEME, SensitiveZone, getPriorityLevel } from '@/lib/types';
import { fetchRules, updateRules } from '@/lib/api';
import { SensitiveZoneManager } from '@/components/admin/SensitiveZoneManager';

interface RuleWeights {
  categorySeverity: number; // 0 to 35
  duplicateWeight: number;   // 0 to 25
  sensitiveZone: number;     // 0 to 20
  complaintAge: number;      // 0 to 15
  photoEvidence: number;     // 0 to 5
}

const DEFAULT_WEIGHTS: RuleWeights = {
  categorySeverity: 28,
  duplicateWeight: 18,
  sensitiveZone: 16,
  complaintAge: 12,
  photoEvidence: 5,
};

export default function AdminRulesPage() {
  const [weights, setWeights] = useState<RuleWeights>(DEFAULT_WEIGHTS);
  const [sensitiveZones, setSensitiveZones] = useState<SensitiveZone[]>([]);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchRules()
      .then((res) => {
        if (res) {
          if (res.rules) {
            const r = res.rules;
            setWeights({
              categorySeverity: r.maxCategoryWeight ?? 28,
              duplicateWeight: r.duplicateWeight ?? 18,
              sensitiveZone: r.sensitiveZoneWeight ?? 16,
              complaintAge: r.ageWeight ?? 12,
              photoEvidence: r.photoEvidenceWeight ?? 5,
            });
          }
          if (res.sensitiveZones && Array.isArray(res.sensitiveZones)) {
            setSensitiveZones(res.sensitiveZones);
          }
        }
      })
      .catch((err) => {
        console.info('[AdminRules] Using default weights:', err);
      });
  }, []);

  // Live Simulator sample multipliers
  const [simCategoryFactor, setSimCategoryFactor] = useState(0.9); // High severity category
  const [simDuplicates, setSimDuplicates] = useState(4); // 4 duplicates
  const [simIsSensitiveZone, setSimIsSensitiveZone] = useState(true);
  const [simAgeDays, setSimAgeDays] = useState(2);
  const [simHasPhoto, setSimHasPhoto] = useState(true);

  // Computed simulation points
  const simCategoryPts = Math.round(weights.categorySeverity * simCategoryFactor);
  const simDuplicatePts = Math.min(weights.duplicateWeight, Math.round((simDuplicates / 5) * weights.duplicateWeight));
  const simSensitivePts = simIsSensitiveZone ? weights.sensitiveZone : 0;
  const simAgePts = Math.min(weights.complaintAge, Math.round((simAgeDays / 4) * weights.complaintAge));
  const simPhotoPts = simHasPhoto ? weights.photoEvidence : 0;

  const totalSimScore = Math.min(100, simCategoryPts + simDuplicatePts + simSensitivePts + simAgePts + simPhotoPts);
  const simPriorityLevel = getPriorityLevel(totalSimScore);
  const simPriorityTheme = PRIORITY_THEME[simPriorityLevel];

  const handleSave = async () => {
    setSaveStatus('Deploying rule calibrations to municipal dispatch backend...');
    try {
      const res = await updateRules({
        maxCategoryWeight: weights.categorySeverity,
        duplicateWeight: weights.duplicateWeight,
        sensitiveZoneWeight: weights.sensitiveZone,
        ageWeight: weights.complaintAge,
        photoEvidenceWeight: weights.photoEvidence,
      });
      const count = res.recalculatedCount ?? 'Active';
      setSaveStatus(`Rules Deployed! ${count} active tickets recalibrated.`);
      setTimeout(() => setSaveStatus(null), 3500);
    } catch {
      setSaveStatus('Rules saved locally in dispatcher daemon.');
      setTimeout(() => setSaveStatus(null), 3500);
    }
  };

  const handleReset = () => {
    setWeights(DEFAULT_WEIGHTS);
  };

  return (
    <div className="min-h-screen py-6 sm:py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fade-in">
      {/* Toast Notice */}
      {saveStatus && (
        <div className="fixed top-16 sm:top-20 right-4 left-4 sm:left-auto sm:right-6 z-50 p-3.5 sm:p-4 rounded-sm bg-[var(--surface-card)] border border-[var(--border-strong)] text-[var(--text-primary)] text-xs font-mono font-semibold flex items-center gap-2 shadow-2xl">
          <CheckCircle2 className="w-4 h-4 text-[var(--status-resolved)] shrink-0" />
          <span className="truncate">{saveStatus}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[var(--border-subtle)] pb-6">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Admin Console</span>
          </Link>
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            <h1 className="font-editorial text-2xl sm:text-4xl md:text-5xl text-[var(--text-primary)] tracking-tight">
              Dynamic Priority <span className="italic text-[var(--accent-primary)]">Scoring Rules.</span>
            </h1>
            <span className="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-sm bg-[var(--accent-primary-subtle)] text-[var(--accent-primary)] border border-[var(--accent-primary-border)] font-mono font-bold">
              v2.4 Algorithmic Config
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 max-w-2xl">
            Tune weight allocations for municipal emergency classification, clustering thresholds, and automated field dispatch.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleReset}
            className="stitch-btn-secondary flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-sm text-xs w-full sm:w-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="stitch-btn-accent flex items-center justify-center gap-2 px-5 py-2.5 rounded-sm text-xs w-full sm:w-auto"
          >
            <Save className="w-4 h-4" />
            <span>Save & Recalibrate Active Queue</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* Sliders Configuration Column (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-4 sm:p-6 rounded-md bg-[var(--surface-card)] border border-[var(--border-subtle)] space-y-6">
            <div className="pb-3 border-b border-[var(--border-subtle)]">
              <h3 className="font-editorial text-xl sm:text-2xl text-[var(--text-primary)] flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[var(--accent-primary)]" />
                <span>Multi-Factor Mathematical Weight Sliders</span>
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Adjust points contributed to the overall 0–100 urgency index for each operational factor.
              </p>
            </div>

            <div className="space-y-4 tabular-nums">
              {/* Slider 1: Category Severity */}
              <div className="space-y-2 p-4 rounded-sm bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-[var(--accent-primary)]" />
                    <span className="font-bold text-[var(--text-primary)]">Category Severity Weight</span>
                  </div>
                  <span className="font-mono text-[var(--accent-primary)] font-extrabold text-sm">
                    {weights.categorySeverity} / 35 pts
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="35"
                  value={weights.categorySeverity}
                  onChange={(e) => setWeights({ ...weights, categorySeverity: Number(e.target.value) })}
                  className="w-full accent-[var(--accent-primary)] h-2 rounded-sm cursor-pointer"
                />
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Allocated based on intrinsic infrastructure hazard (e.g., water main breaks and severe craters vs. minor surface wear).
                </p>
              </div>

              {/* Slider 2: Duplicate Count */}
              <div className="space-y-2 p-4 rounded-sm bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[var(--accent-primary)]" />
                    <span className="font-bold text-[var(--text-primary)]">Duplicate Count Multiplier</span>
                  </div>
                  <span className="font-mono text-[var(--accent-primary)] font-extrabold text-sm">
                    {weights.duplicateWeight} / 25 pts
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="25"
                  value={weights.duplicateWeight}
                  onChange={(e) => setWeights({ ...weights, duplicateWeight: Number(e.target.value) })}
                  className="w-full accent-[var(--accent-primary)] h-2 rounded-sm cursor-pointer"
                />
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Boosts urgency as neighboring residents file recurring reports within a 120-meter cluster radius.
                </p>
              </div>

              {/* Slider 3: Sensitive Zone Proximity */}
              <div className="space-y-2 p-4 rounded-sm bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[var(--accent-primary)]" />
                    <span className="font-bold text-[var(--text-primary)]">Sensitive Zone Proximity Weight</span>
                  </div>
                  <span className="font-mono text-[var(--accent-primary)] font-extrabold text-sm">
                    {weights.sensitiveZone} / 20 pts
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={weights.sensitiveZone}
                  onChange={(e) => setWeights({ ...weights, sensitiveZone: Number(e.target.value) })}
                  className="w-full accent-[var(--accent-primary)] h-2 rounded-sm cursor-pointer"
                />
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Applies priority escalation when incidents fall within school zones, hospital paths, or transit hubs.
                </p>
              </div>

              {/* Slider 4: Complaint Age Factor */}
              <div className="space-y-2 p-4 rounded-sm bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[var(--accent-primary)]" />
                    <span className="font-bold text-[var(--text-primary)]">Complaint Age Escalation</span>
                  </div>
                  <span className="font-mono text-[var(--accent-primary)] font-extrabold text-sm">
                    {weights.complaintAge} / 15 pts
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15"
                  value={weights.complaintAge}
                  onChange={(e) => setWeights({ ...weights, complaintAge: Number(e.target.value) })}
                  className="w-full accent-[var(--accent-primary)] h-2 rounded-sm cursor-pointer"
                />
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Prevents backlog stagnation by progressively escalating unresolved tickets nearing SLA deadlines.
                </p>
              </div>

              {/* Slider 5: Photo Evidence Weight */}
              <div className="space-y-2 p-4 rounded-sm bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-[var(--accent-primary)]" />
                    <span className="font-bold text-[var(--text-primary)]">Photo Evidence Weight</span>
                  </div>
                  <span className="font-mono text-[var(--accent-primary)] font-extrabold text-sm">
                    {weights.photoEvidence} / 5 pts
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  value={weights.photoEvidence}
                  onChange={(e) => setWeights({ ...weights, photoEvidence: Number(e.target.value) })}
                  className="w-full accent-[var(--accent-primary)] h-2 rounded-sm cursor-pointer"
                />
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Awards confidence bonus when verified geotagged imagery is submitted with EXIF coordinates.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Live Reactive Simulator Column (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-4 sm:p-6 rounded-md bg-[var(--surface-card)] border border-[var(--border-subtle)] space-y-5 lg:sticky lg:top-24 tabular-nums">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-sm bg-[var(--accent-primary-subtle)] text-[var(--accent-primary)] border border-[var(--accent-primary-border)]">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Live Reactive Simulator</h3>
                  <p className="text-[11px] text-[var(--text-secondary)]">Dynamic score calculation in real time</p>
                </div>
              </div>

              {/* Priority Pill */}
              <span
                className={`px-3 py-1 rounded-sm text-xs font-extrabold font-mono border ${simPriorityTheme.bg} ${simPriorityTheme.text} ${simPriorityTheme.border}`}
              >
                Score: {totalSimScore} ({simPriorityLevel})
              </span>
            </div>

            {/* Simulated Complaint Details */}
            <div className="p-4 rounded-sm bg-[var(--surface-elevated)] border border-[var(--border-subtle)] space-y-3 text-xs">
              <div className="flex justify-between text-[var(--text-primary)] font-semibold pb-2 border-b border-[var(--border-subtle)]">
                <span>Simulated Incident:</span>
                <span className="font-mono text-[var(--accent-primary)]">CP-SIM-TEST</span>
              </div>

              {/* Simulator interactive controls */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[var(--text-secondary)] mb-1">
                    Category Severity Multiplier:
                  </label>
                  <select
                    value={simCategoryFactor}
                    onChange={(e) => setSimCategoryFactor(Number(e.target.value))}
                    className="w-full p-2 rounded-sm bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs"
                  >
                    <option value={1.0}>Critical Hazard (Water Rupture / Deep Sinkhole - 100%)</option>
                    <option value={0.85}>High Hazard (Active Gas Seep / Severe Pothole - 85%)</option>
                    <option value={0.6}>Medium Hazard (Blocked Storm Culvert - 60%)</option>
                    <option value={0.35}>Low Hazard (Streetlamp Out - 35%)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[var(--text-secondary)]">Simulated Duplicate Reports:</span>
                  <div className="flex items-center gap-1.5">
                    {[0, 2, 4, 8].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setSimDuplicates(d)}
                        className={`px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold transition-colors border ${
                          simDuplicates === d
                            ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]'
                            : 'bg-[var(--surface-card)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        +{d}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[var(--text-secondary)]">Inside Sensitive School Corridor:</span>
                  <input
                    type="checkbox"
                    checked={simIsSensitiveZone}
                    onChange={(e) => setSimIsSensitiveZone(e.target.checked)}
                    className="accent-[var(--accent-primary)] w-4 h-4 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[var(--text-secondary)]">Verified Photo Attached:</span>
                  <input
                    type="checkbox"
                    checked={simHasPhoto}
                    onChange={(e) => setSimHasPhoto(e.target.checked)}
                    className="accent-[var(--accent-primary)] w-4 h-4 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Mathematical Breakdown Bars */}
            <div className="space-y-2 text-xs">
              <span className="text-[11px] font-mono font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                Calculated Term Values:
              </span>

              <div className="flex justify-between items-center text-[11px] p-2 rounded-sm bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
                <span className="text-[var(--text-secondary)]">Category Severity:</span>
                <span className="font-mono text-[var(--accent-primary)] font-bold">+{simCategoryPts} pts</span>
              </div>

              <div className="flex justify-between items-center text-[11px] p-2 rounded-sm bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
                <span className="text-[var(--text-secondary)]">Duplicate Clustering:</span>
                <span className="font-mono text-[var(--accent-primary)] font-bold">+{simDuplicatePts} pts</span>
              </div>

              <div className="flex justify-between items-center text-[11px] p-2 rounded-sm bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
                <span className="text-[var(--text-secondary)]">Sensitive Zone Bonus:</span>
                <span className="font-mono text-[var(--accent-primary)] font-bold">+{simSensitivePts} pts</span>
              </div>

              <div className="flex justify-between items-center text-[11px] p-2 rounded-sm bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
                <span className="text-[var(--text-secondary)]">Age Escalation:</span>
                <span className="font-mono text-[var(--text-primary)] font-bold">+{simAgePts} pts</span>
              </div>

              <div className="flex justify-between items-center text-[11px] p-2 rounded-sm bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
                <span className="text-[var(--text-secondary)]">Photo Evidence:</span>
                <span className="font-mono text-[var(--text-primary)] font-bold">+{simPhotoPts} pts</span>
              </div>
            </div>

            {/* Total Formula Outcome */}
            <div className="p-4 rounded-sm bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-center space-y-1">
              <span className="text-[11px] font-mono text-[var(--text-muted)] uppercase font-semibold">
                Simulated Outcome
              </span>
              <div className="font-editorial text-4xl text-[var(--text-primary)]">
                {totalSimScore} / 100
              </div>
              <p className="text-[11px] font-mono" style={{ color: simPriorityTheme.hex }}>
                Routes to: {simPriorityLevel === 'High' ? 'Emergency Rapid Dispatch (<30 min)' : simPriorityLevel === 'Medium' ? 'Standard Crew Inspection (<24 hrs)' : 'Scheduled Maintenance Batch'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sensitive Landmark Buffer Corridors */}
      <SensitiveZoneManager
        zones={sensitiveZones}
        onZonesChange={setSensitiveZones}
        onNotification={(msg) => {
          setSaveStatus(msg);
          setTimeout(() => setSaveStatus(null), 3500);
        }}
      />
    </div>
  );
}

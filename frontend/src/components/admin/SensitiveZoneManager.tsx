'use client';

import React, { useState } from 'react';
import { SensitiveZone } from '@/lib/types';
import { createSensitiveZone, deleteSensitiveZone } from '@/lib/api';
import {
  MapPin,
  Plus,
  Trash2,
  GraduationCap,
  Building,
  Bus,
  ShoppingBag,
  ShieldAlert,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface SensitiveZoneManagerProps {
  zones: SensitiveZone[];
  onZonesChange: (updatedZones: SensitiveZone[]) => void;
  onNotification: (msg: string) => void;
}

const ZONE_ICONS: Record<string, React.ElementType> = {
  school: GraduationCap,
  hospital: Building,
  transit_hub: Bus,
  market: ShoppingBag,
  other: MapPin,
};

const DEFAULT_PRESETS = [
  { name: 'Lincoln High School', type: 'school', lat: 37.7749, lng: -122.4194, radius: 150 },
  { name: 'Memorial General Hospital', type: 'hospital', lat: 37.7601, lng: -122.4278, radius: 200 },
  { name: 'Metro Transit Hub', type: 'transit_hub', lat: 37.7891, lng: -122.4014, radius: 150 },
];

export function SensitiveZoneManager({
  zones,
  onZonesChange,
  onNotification,
}: SensitiveZoneManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('school');
  const [lat, setLat] = useState('37.7749');
  const [lng, setLng] = useState('-122.4194');
  const [radius, setRadius] = useState('150');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleApplyPreset = (preset: typeof DEFAULT_PRESETS[0]) => {
    setName(preset.name);
    setType(preset.type);
    setLat(String(preset.lat));
    setLng(String(preset.lng));
    setRadius(String(preset.radius));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a landmark name.');
      return;
    }
    const numLat = parseFloat(lat);
    const numLng = parseFloat(lng);
    const numRadius = parseInt(radius, 10) || 150;

    if (isNaN(numLat) || isNaN(numLng)) {
      setError('Latitude and longitude must be valid numbers.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const res = await createSensitiveZone({
        name: name.trim(),
        type,
        lat: numLat,
        lng: numLng,
        radius: numRadius,
      });

      const updated = [...zones, res.zone];
      onZonesChange(updated);
      onNotification(
        `Added zone "${res.zone.name}". Recalibrated ${res.recalculatedCount} open complaints.`
      );
      setName('');
      setIsAdding(false);
    } catch (err: any) {
      setError(err?.message || 'Failed creating sensitive zone.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (zone: SensitiveZone) => {
    const id = zone._id || zone.id;
    if (!id) return;
    try {
      setDeletingId(id);
      setError(null);
      const res = await deleteSensitiveZone(id);
      const updated = zones.filter((z) => (z._id || z.id) !== id);
      onZonesChange(updated);
      onNotification(
        `Removed "${zone.name}". Recalibrated ${res.recalculatedCount} open complaints.`
      );
    } catch (err: any) {
      setError(err?.message || 'Failed deleting sensitive zone.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 rounded-2xl glass-panel border border-[var(--border-subtle)] space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
            <span>Sensitive Landmark Corridors</span>
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Complaints within buffer zones of schools, hospitals, and transit hubs receive automatic priority escalations (+16 pts).
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsAdding(!isAdding);
            setError(null);
          }}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-semibold transition-all w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{isAdding ? 'Cancel' : 'Add Sensitive Landmark'}</span>
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Add Zone Inline Form */}
      {isAdding && (
        <form
          onSubmit={handleCreate}
          className="p-4 rounded-xl bg-[var(--surface-elevated)] border border-amber-500/30 space-y-4 animate-in fade-in"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              New Sensitive Zone Calibration
            </span>
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[11px] text-[var(--text-secondary)] mr-1">Presets:</span>
              {DEFAULT_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="px-2 py-0.5 rounded text-[10px] bg-black/5 dark:bg-white/5 hover:bg-amber-500/10 text-[var(--text-secondary)] hover:text-amber-500 transition-colors"
                >
                  {p.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="lg:col-span-2">
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                Landmark Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Washington Elementary School"
                required
                className="w-full px-3 py-2 rounded-lg bg-[var(--surface-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                Zone Category
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--surface-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500"
              >
                <option value="school">School / Campus</option>
                <option value="hospital">Hospital / Clinic</option>
                <option value="transit_hub">Transit Hub / Rail</option>
                <option value="market">Market / Public Plaza</option>
                <option value="other">Civic Landmark / Other</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                Coordinates (Lat, Lng)
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="text"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="37.7749"
                  className="w-full px-2 py-2 rounded-lg bg-[var(--surface-card)] border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-primary)]"
                />
                <input
                  type="text"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="-122.4194"
                  className="w-full px-2 py-2 rounded-lg bg-[var(--surface-card)] border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-primary)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                Buffer Radius (meters)
              </label>
              <input
                type="number"
                min="50"
                max="1000"
                step="10"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--surface-card)] border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-primary)]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs shadow-md transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Calibrating...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Save & Recalculate</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Zone Cards Grid */}
      {zones.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-[var(--border-subtle)] rounded-xl text-xs text-[var(--text-secondary)]">
          No sensitive zones registered. Add schools, hospitals, or transit corridors to trigger automated spatial priority adjustments.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {zones.map((zone) => {
            const Icon = ZONE_ICONS[zone.type] || MapPin;
            const id = zone._id || zone.id || zone.name;
            const isDeleting = deletingId === id;

            return (
              <div
                key={id}
                className="p-4 rounded-xl bg-[var(--surface-card)] border border-[var(--border-subtle)] hover:border-amber-500/40 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[var(--text-primary)] leading-tight">
                          {zone.name}
                        </h4>
                        <span className="text-[10px] uppercase font-mono tracking-wider text-amber-600 dark:text-amber-400">
                          {zone.type.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => handleDelete(zone)}
                      title="Delete landmark zone"
                      className="text-[var(--text-secondary)] hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors opacity-70 group-hover:opacity-100"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-secondary)] font-mono">
                    <span>
                      {zone.lat.toFixed(4)}, {zone.lng.toFixed(4)}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      ±{zone.radius}m buffer
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

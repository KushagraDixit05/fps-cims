"use client";
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, TrendingUp, Users, Leaf, BarChart2, MapPin, Calendar, User, Package,
  Wheat, Phone, Copy, Check, ChevronRight, Camera, Image as ImageIcon,
  ChevronLeft, AlertCircle, Clock, Tag, Beaker, Mail, IdCard, Briefcase,
  Hash, Wifi, WifiOff, FileText,
} from 'lucide-react';
import { PieChart, Pie, Cell, AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { useMapStore } from '@/store/mapStore';
import type { SelectedRecord } from '@/store/mapStore';
import { useGeoRegionSummary, useGeoRecord } from '@/hooks/useGeoData';
import { SPRING } from '@/lib/mapMotion';
import type { RegionSummary } from '@/types/geo';

// ─── Color constants ──────────────────────────────────────────────────────────
const PIE_COLORS = ['#34E08A', '#F5C542', '#22D3EE', '#FB6A6A', '#A78BFA', '#F97316', '#10B981', '#6366F1'];
const CONDITION_HEX: Record<string, string> = { good: '#34E08A', average: '#F5C542', poor: '#FB6A6A' };
const RESULT_HEX: Record<string, string> = { excellent: '#34E08A', good: '#22D3EE', average: '#F5C542', poor: '#FB6A6A', no_effect: '#94A3B8' };
const MODULE_HEX: Record<string, string> = { visit: '#34E08A', mandi: '#FBbf24', demo: '#22D3EE' };
const MODULE_LABEL: Record<string, string> = { visit: 'Crop Intelligence Module', demo: 'Product Performance Module', mandi: 'Market Intelligence Module' };

// ─── Small atoms ─────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color?: string }) {
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-stroke)' }}>
      <div className="p-1.5 rounded-lg shrink-0" style={{ background: `${color ?? '#34E08A'}18` }}>
        <Icon className="h-3.5 w-3.5" style={{ color: color ?? 'var(--accent)' }} strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-widest leading-none mb-0.5" style={{ color: 'var(--text-lo)' }}>{label}</p>
        <p className="text-sm font-bold truncate" style={{ color: 'var(--text-hi)' }}>{value}</p>
      </div>
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize"
      style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
      {label}
    </span>
  );
}

function SectionHeading({ label }: { label: string }) {
  return (
    <p className="text-[10px] uppercase tracking-widest font-semibold mt-4 mb-2 first:mt-0"
      style={{ color: 'var(--text-lo)' }}>
      {label}
    </p>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Field({ icon: Icon, label, value, mono }: { icon: React.ElementType; label: string; value: any; mono?: boolean }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex items-start gap-2.5 py-1">
      <div className="mt-0.5 p-1 rounded-md shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <Icon className="h-3 w-3" style={{ color: 'var(--text-lo)' }} strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-lo)' }}>{label}</p>
        <p className={`text-xs break-words ${mono ? 'font-mono' : ''}`} style={{ color: 'var(--text-hi)' }}>{value}</p>
      </div>
    </div>
  );
}

// ─── Copy-to-clipboard helper ────────────────────────────────────────────────
function CopyableGPS({ lat, lng }: { lat: number; lng: number }) {
  const [copied, setCopied] = useState(false);
  const text = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <div className="flex items-start gap-2.5 py-1">
      <div className="mt-0.5 p-1 rounded-md shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <MapPin className="h-3 w-3" style={{ color: 'var(--text-lo)' }} strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-lo)' }}>GPS Coordinates</p>
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-mono" style={{ color: 'var(--text-hi)' }}>{text}</p>
          <button onClick={copy} className="p-0.5 rounded transition-opacity" style={{ color: 'var(--text-lo)', opacity: copied ? 1 : 0.5 }}>
            {copied ? <Check className="h-2.5 w-2.5" style={{ color: '#34E08A' }} /> : <Copy className="h-2.5 w-2.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Copyable text field ─────────────────────────────────────────────────────
function CopyableField({ icon: Icon, label, value, mono }: { icon: React.ElementType; label: string; value?: string | null; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  if (value === null || value === undefined || value === '') return null;
  function copy() {
    navigator.clipboard.writeText(String(value)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <div className="flex items-start gap-2.5 py-1">
      <div className="mt-0.5 p-1 rounded-md shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <Icon className="h-3 w-3" style={{ color: 'var(--text-lo)' }} strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-lo)' }}>{label}</p>
        <div className="flex items-center gap-1.5">
          <p className={`text-xs break-all ${mono ? 'font-mono' : ''}`} style={{ color: 'var(--text-hi)' }}>{value}</p>
          <button onClick={copy} className="p-0.5 rounded transition-opacity shrink-0" style={{ color: 'var(--text-lo)', opacity: copied ? 1 : 0.5 }}>
            {copied ? <Check className="h-2.5 w-2.5" style={{ color: '#34E08A' }} /> : <Copy className="h-2.5 w-2.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Person block (executive / submitter) ────────────────────────────────────
interface PersonBrief {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  employee_id?: string | null;
  role?: string | null;
  region?: string | null;
  state?: string | null;
}
const ROLE_LABEL: Record<string, string> = {
  field_executive: 'Field Executive',
  admin: 'Admin',
  viewer: 'Viewer',
};
function PersonBlock({ person, title, fallbackName }: { person?: PersonBrief | null; title: string; fallbackName?: string | null }) {
  if (!person && !fallbackName) return null;
  const p = person ?? {};
  const name   = p.name ?? fallbackName;
  const region = [p.region, p.state].filter(Boolean).join(', ');
  return (
    <>
      <SectionHeading label={title} />
      <Field icon={User} label="Name" value={name} />
      <CopyableField icon={Phone} label="Phone" value={p.phone} />
      <CopyableField icon={Mail}  label="Email" value={p.email} />
      <Field icon={IdCard}    label="Employee ID" value={p.employee_id} mono />
      <Field icon={Briefcase} label="Role"        value={p.role ? (ROLE_LABEL[p.role] ?? p.role) : null} />
      <Field icon={MapPin}    label="Territory"   value={region || null} />
    </>
  );
}

// ─── Location breadcrumb ──────────────────────────────────────────────────────
function LocationBreadcrumb({ village, block, district, state }: { village?: string; block?: string; district?: string; state?: string }) {
  const parts = [village, block, district, state].filter(Boolean);
  if (!parts.length) return null;
  return (
    <div className="flex items-start gap-2.5 py-1">
      <div className="mt-0.5 p-1 rounded-md shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <MapPin className="h-3 w-3" style={{ color: 'var(--text-lo)' }} strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-lo)' }}>Location</p>
        <div className="flex flex-wrap items-center gap-1 mt-0.5">
          {parts.map((p, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="text-xs" style={{ color: 'var(--text-hi)' }}>{p}</span>
              {i < parts.length - 1 && <ChevronRight className="h-2.5 w-2.5 shrink-0" style={{ color: 'var(--text-lo)' }} />}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Problem chips ────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ProblemChips({ problems }: { problems: any }) {
  if (!problems) return null;
  const list: string[] = Array.isArray(problems) ? problems : (typeof problems === 'string' ? problems.split(',').map((s: string) => s.trim()) : []);
  if (!list.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {list.map((p) => (
        <span key={p} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px]"
          style={{ background: 'rgba(251,106,106,0.12)', color: '#FB6A6A', border: '1px solid rgba(251,106,106,0.2)' }}>
          <AlertCircle className="h-2 w-2" />
          {p}
        </span>
      ))}
    </div>
  );
}

// ─── Variety chips ────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function VarietyChips({ varieties }: { varieties: any }) {
  if (!varieties) return null;
  const list: string[] = Array.isArray(varieties) ? varieties : [];
  if (!list.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {list.map((v) => (
        <span key={v} className="inline-flex px-2 py-0.5 rounded-full text-[10px]"
          style={{ background: 'rgba(34,211,238,0.12)', color: '#22D3EE', border: '1px solid rgba(34,211,238,0.2)' }}>
          {v}
        </span>
      ))}
    </div>
  );
}

// ─── Photo gallery ────────────────────────────────────────────────────────────
interface PhotoItem { id: string; url: string; photo_type?: string; uploaded_at?: string }

function PhotoGallery({ photos, tabs }: { photos: PhotoItem[]; tabs?: boolean }) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'before' | 'after'>('before');

  const displayed = tabs
    ? photos.filter((p) => p.photo_type === activeTab)
    : photos;

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (lightboxIdx === null) return;
    if (e.key === 'Escape') setLightboxIdx(null);
    if (e.key === 'ArrowRight') setLightboxIdx((i) => (i !== null ? Math.min(i + 1, displayed.length - 1) : null));
    if (e.key === 'ArrowLeft')  setLightboxIdx((i) => (i !== null ? Math.max(i - 1, 0) : null));
  }, [lightboxIdx, displayed.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  if (!photos.length) {
    return (
      <div className="flex flex-col items-center justify-center py-4 gap-1.5 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed var(--glass-stroke)' }}>
        <ImageIcon className="h-5 w-5" style={{ color: 'var(--text-lo)' }} />
        <p className="text-[10px]" style={{ color: 'var(--text-lo)' }}>No photos</p>
      </div>
    );
  }

  return (
    <>
      {tabs && (
        <div className="flex gap-1 mb-2">
          {(['before', 'after'] as const).map((tab) => {
            const count = photos.filter((p) => p.photo_type === tab).length;
            return (
              <button key={tab} onClick={() => { setActiveTab(tab); setLightboxIdx(null); }}
                className="flex-1 py-1 rounded-lg text-[10px] font-semibold capitalize transition-all"
                style={{
                  background: activeTab === tab ? 'rgba(34,211,238,0.15)' : 'rgba(255,255,255,0.04)',
                  color: activeTab === tab ? '#22D3EE' : 'var(--text-lo)',
                  border: `1px solid ${activeTab === tab ? 'rgba(34,211,238,0.3)' : 'var(--glass-stroke)'}`,
                }}>
                {tab} ({count})
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-3 gap-1.5">
        {displayed.map((photo, i) => (
          <button key={photo.id} onClick={() => setLightboxIdx(i)}
            className="relative aspect-square rounded-xl overflow-hidden group"
            style={{ border: '1px solid var(--glass-stroke)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'rgba(0,0,0,0.4)' }}>
              <Camera className="h-4 w-4 text-white" />
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIdx !== null && (
          <motion.div
            key="lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[200] flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.92)' }}
            onClick={() => setLightboxIdx(null)}
          >
            <button onClick={(e) => { e.stopPropagation(); setLightboxIdx(null); }}
              className="absolute top-4 right-4 p-2 rounded-full"
              style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>
              <X className="h-5 w-5" />
            </button>
            {lightboxIdx > 0 && (
              <button onClick={(e) => { e.stopPropagation(); setLightboxIdx((i) => i! - 1); }}
                className="absolute left-4 p-2 rounded-full"
                style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            {lightboxIdx < displayed.length - 1 && (
              <button onClick={(e) => { e.stopPropagation(); setLightboxIdx((i) => i! + 1); }}
                className="absolute right-4 p-2 rounded-full"
                style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
            <motion.div
              key={lightboxIdx}
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="max-w-[90vw] max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={displayed[lightboxIdx].url} alt="" className="max-w-full max-h-[85vh] rounded-xl object-contain" />
              <p className="text-center text-xs mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {lightboxIdx + 1} / {displayed.length}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Record metadata / audit footer ──────────────────────────────────────────
function MetadataSection({
  id, approvalStatus, localId, isSynced, created, updated,
}: {
  id?: string | null;
  approvalStatus?: string | null;
  localId?: string | null;
  isSynced?: boolean;
  created?: string | null;
  updated?: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const fmt = (s: string) => new Date(s).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  function copyId() {
    if (!id) return;
    navigator.clipboard.writeText(id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <div className="pt-3 mt-4" style={{ borderTop: '1px solid var(--glass-stroke)' }}>
      <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-lo)' }}>Record Metadata</p>

      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        {approvalStatus && (
          <Badge label={approvalStatus} color={approvalStatus === 'approved' ? '#34E08A' : approvalStatus === 'rejected' ? '#FB6A6A' : '#F5C542'} />
        )}
        {isSynced !== undefined && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{
              background: isSynced ? 'rgba(52,224,138,0.14)' : 'rgba(245,197,66,0.14)',
              color: isSynced ? '#34E08A' : '#F5C542',
              border: `1px solid ${isSynced ? 'rgba(52,224,138,0.3)' : 'rgba(245,197,66,0.3)'}`,
            }}>
            {isSynced ? <Wifi className="h-2.5 w-2.5" /> : <WifiOff className="h-2.5 w-2.5" />}
            {isSynced ? 'Synced' : 'Pending sync'}
          </span>
        )}
      </div>

      {id && (
        <div className="flex items-center gap-1.5 mb-1">
          <Hash className="h-3 w-3 shrink-0" style={{ color: 'var(--text-lo)' }} />
          <p className="text-[10px] font-mono break-all" style={{ color: 'var(--text-lo)' }}>{id}</p>
          <button onClick={copyId} className="p-0.5 rounded transition-opacity shrink-0" style={{ color: 'var(--text-lo)', opacity: copied ? 1 : 0.5 }}>
            {copied ? <Check className="h-2.5 w-2.5" style={{ color: '#34E08A' }} /> : <Copy className="h-2.5 w-2.5" />}
          </button>
        </div>
      )}
      {localId && (
        <p className="text-[10px] flex gap-1.5 mb-1" style={{ color: 'var(--text-lo)' }}>
          <FileText className="h-3 w-3 shrink-0 mt-px" />Local ID: <span className="font-mono break-all">{localId}</span>
        </p>
      )}
      {created && <p className="text-[10px] flex gap-1.5" style={{ color: 'var(--text-lo)' }}><Clock className="h-3 w-3 shrink-0 mt-px" />Created: {fmt(created)}</p>}
      {updated && <p className="text-[10px] flex gap-1.5" style={{ color: 'var(--text-lo)' }}><Clock className="h-3 w-3 shrink-0 mt-px" />Updated: {fmt(updated)}</p>}
    </div>
  );
}

// ─── Rate range bar ───────────────────────────────────────────────────────────
function RateRangeBar({ min, avg, max }: { min?: number; avg?: number; max?: number }) {
  if (!min || !max) return null;
  const range = max - min;
  const avgPct = avg && range > 0 ? ((avg - min) / range) * 100 : 50;
  return (
    <div className="mt-2 space-y-1">
      <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
        <div className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(90deg,#FB6A6A,#F5C542,#34E08A)' }} />
        {avg && (
          <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white border-2 border-gray-800"
            style={{ left: `${avgPct}%`, transform: 'translateX(-50%) translateY(-50%)' }} />
        )}
      </div>
      <div className="flex justify-between text-[10px]" style={{ color: 'var(--text-lo)' }}>
        <span>₹{min}</span>
        {avg && <span className="font-semibold" style={{ color: 'var(--text-mid)' }}>avg ₹{avg}</span>}
        <span>₹{max}</span>
      </div>
    </div>
  );
}

// ─── Visit detail ─────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function VisitDetail({ d }: { d: any }) {
  return (
    <div className="space-y-0">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-1.5 mb-4">
        <KpiCard label="Land (ac)" value={d.total_land_acre ?? '—'} icon={Wheat} />
        <KpiCard label="Photos"    value={d.photo_count ?? 0}       icon={Camera} />
        <KpiCard label="Crops"     value={d.crops?.length ?? 0}     icon={Leaf} />
      </div>

      {/* Farmer & Contact */}
      <SectionHeading label="Farmer & Contact" />
      <Field icon={User}        label="Name"   value={d.farmer_name} />
      <CopyableField icon={Phone} label="Mobile" value={d.mobile_number} mono />
      <Field icon={Wheat}       label="Total Land" value={d.total_land_acre ? `${d.total_land_acre} acre` : null} />
      {(d.latitude && d.longitude) && <CopyableGPS lat={d.latitude} lng={d.longitude} />}

      {/* Location */}
      <SectionHeading label="Location" />
      <LocationBreadcrumb village={d.village_name} block={d.block_name} district={d.district_name} />

      {/* Visit Info */}
      <SectionHeading label="Visit Info" />
      <Field icon={Calendar} label="Visit Date" value={d.submitted_at ? new Date(d.submitted_at).toLocaleDateString() : null} />

      {/* Executive */}
      <PersonBlock person={d.executive} fallbackName={d.executive_name} title="Field Executive" />

      {/* Crops */}
      {d.crops?.length > 0 && (
        <>
          <SectionHeading label={`Crops (${d.crops.length})`} />
          <div className="space-y-2">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {d.crops.map((c: any) => (
              <div key={c.id} className="p-3 rounded-xl space-y-2"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-stroke)' }}>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold flex-1" style={{ color: 'var(--text-hi)' }}>
                    {c.crop_name}
                    {c.variety && <span className="ml-1 font-normal" style={{ color: 'var(--text-lo)' }}>({c.variety})</span>}
                  </span>
                  {c.crop_condition && <Badge label={c.crop_condition} color={CONDITION_HEX[c.crop_condition] ?? '#94A3B8'} />}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {c.crop_stage && <Badge label={c.crop_stage.replace('_', ' ')} color="#A78BFA" />}
                  {c.date_of_sowing && (
                    <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--text-lo)' }}>
                      <Calendar className="h-2.5 w-2.5" />
                      Sown {new Date(c.date_of_sowing).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {(c.current_area_acre || c.last_year_area_acre || c.this_year_area_acre) && (
                  <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                    {c.current_area_acre != null && (
                      <div className="p-1.5 rounded-lg text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <p style={{ color: 'var(--text-lo)' }}>Current</p>
                        <p className="font-semibold" style={{ color: 'var(--text-hi)' }}>{c.current_area_acre} ac</p>
                      </div>
                    )}
                    {c.this_year_area_acre != null && (
                      <div className="p-1.5 rounded-lg text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <p style={{ color: 'var(--text-lo)' }}>This year</p>
                        <p className="font-semibold" style={{ color: 'var(--text-hi)' }}>{c.this_year_area_acre} ac</p>
                      </div>
                    )}
                    {c.last_year_area_acre != null && (
                      <div className="p-1.5 rounded-lg text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <p style={{ color: 'var(--text-lo)' }}>Last year</p>
                        <p className="font-semibold" style={{ color: 'var(--text-hi)' }}>{c.last_year_area_acre} ac</p>
                      </div>
                    )}
                  </div>
                )}
                {c.problems && <ProblemChips problems={c.problems} />}
                {c.other_problem_detail && (
                  <p className="text-[10px] italic" style={{ color: 'var(--text-lo)' }}>{c.other_problem_detail}</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Remarks */}
      {d.remark && (
        <>
          <SectionHeading label="Remarks" />
          <p className="text-xs p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-stroke)', color: 'var(--text-mid)' }}>
            {d.remark}
          </p>
        </>
      )}

      {/* Photos */}
      <SectionHeading label={`Photos (${d.photos?.length ?? 0})`} />
      <PhotoGallery photos={d.photos ?? []} />

      <MetadataSection
        id={d.id}
        approvalStatus={d.approval_status}
        localId={d.local_id}
        isSynced={d.is_synced}
        created={d.submitted_at}
        updated={d.updated_at}
      />
    </div>
  );
}

// ─── Demo detail ──────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DemoDetail({ d }: { d: any }) {
  const resultColor = d.demo_result ? (RESULT_HEX[d.demo_result] ?? '#94A3B8') : undefined;
  return (
    <div className="space-y-0">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-1.5 mb-4">
        <KpiCard label="Crop"  value={d.crop_name ?? '—'}  icon={Leaf}     color="#34E08A" />
        <KpiCard label="Phase" value={d.demo_phase ?? '—'} icon={BarChart2} color="#22D3EE" />
        <KpiCard label="Photos" value={(d.photos?.length ?? 0)} icon={Camera} />
      </div>
      {d.demo_result && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-lo)' }}>Result</span>
          <Badge label={d.demo_result.replace('_', ' ')} color={resultColor ?? '#94A3B8'} />
        </div>
      )}

      {/* Farmer & Location */}
      <SectionHeading label="Farmer" />
      <Field icon={User}          label="Name"  value={d.farmer_name} />
      <CopyableField icon={Phone} label="Mobile" value={d.mobile_number} mono />
      <Field icon={Wheat}         label="Total Land" value={d.total_land_acre ? `${d.total_land_acre} acre` : null} />
      {(d.latitude && d.longitude) && <CopyableGPS lat={d.latitude} lng={d.longitude} />}
      <LocationBreadcrumb village={d.village_name} block={d.block_name} district={d.district_name} />

      {/* Product */}
      <SectionHeading label="Product" />
      <Field icon={Package}  label="Name"  value={d.product_name} />
      {(d.dose || d.dose_unit) && (
        <Field icon={Beaker} label="Dose" value={[d.dose, d.dose_unit].filter(Boolean).join(' ')} />
      )}

      {/* Varieties */}
      {d.varieties?.length > 0 && (
        <>
          <SectionHeading label="Varieties" />
          <VarietyChips varieties={d.varieties} />
        </>
      )}

      {/* Demo Info */}
      <SectionHeading label="Demo Info" />
      <Field icon={Calendar} label="Demo Date"    value={d.demo_date} />
      {d.crop_stage && (
        <div className="flex items-start gap-2.5 py-1">
          <div className="mt-0.5 p-1 rounded-md shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <Leaf className="h-3 w-3" style={{ color: 'var(--text-lo)' }} strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-lo)' }}>Crop Stage</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Badge label={d.crop_stage.replace('_', ' ')} color="#A78BFA" />
              {d.crop_stage_days && <span className="text-[10px]" style={{ color: 'var(--text-lo)' }}>({d.crop_stage_days} days)</span>}
            </div>
          </div>
        </div>
      )}

      {/* Executive */}
      <PersonBlock person={d.executive} fallbackName={d.executive_name} title="Field Executive" />

      {/* Observations */}
      {(d.additional_observations || d.remark) && (
        <>
          <SectionHeading label="Observations" />
          {d.additional_observations && (
            <p className="text-xs p-2.5 rounded-xl mb-2"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-stroke)', color: 'var(--text-mid)' }}>
              {d.additional_observations}
            </p>
          )}
          {d.remark && (
            <p className="text-xs p-2.5 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-stroke)', color: 'var(--text-mid)' }}>
              {d.remark}
            </p>
          )}
        </>
      )}

      {/* Photos */}
      <SectionHeading label={`Photos (${d.photos?.length ?? 0})`} />
      {(d.before_photo_count != null || d.after_photo_count != null) && (
        <div className="flex gap-2 mb-2 text-[10px]" style={{ color: 'var(--text-lo)' }}>
          <span>Before: <span className="font-semibold" style={{ color: 'var(--text-mid)' }}>{d.before_photo_count ?? 0}</span></span>
          <span>After: <span className="font-semibold" style={{ color: 'var(--text-mid)' }}>{d.after_photo_count ?? 0}</span></span>
        </div>
      )}
      <PhotoGallery photos={d.photos ?? []} tabs />

      <MetadataSection
        id={d.id}
        approvalStatus={d.approval_status}
        localId={d.local_id}
        isSynced={d.is_synced}
        created={d.submitted_at}
        updated={d.updated_at}
      />
    </div>
  );
}

// ─── Mandi detail ─────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MandiDetail({ d }: { d: any }) {
  return (
    <div className="space-y-0">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-1.5 mb-4">
        <KpiCard label="Arrival (q)"  value={d.arrival_quantity ?? '—'} icon={Package}   color="#FBbf24" />
        <KpiCard label="Avg Rate (₹)" value={d.avg_rate ?? '—'}         icon={TrendingUp} color="#34E08A" />
      </div>

      {/* Market */}
      <SectionHeading label="Market" />
      <Field icon={MapPin}   label="Mandi"    value={d.mandi_name} />
      {d.mandi_active != null && (
        <div className="pl-9 -mt-0.5 mb-1">
          <Badge label={d.mandi_active ? 'Active mandi' : 'Inactive mandi'} color={d.mandi_active ? '#34E08A' : '#94A3B8'} />
        </div>
      )}
      <LocationBreadcrumb district={d.district} state={d.state} />

      {/* Commodity & Pricing */}
      <SectionHeading label="Commodity & Pricing" />
      <Field icon={Wheat}    label="Commodity" value={d.commodity} />
      <Field icon={Calendar} label="Date"      value={d.date} />
      <RateRangeBar min={d.min_rate} avg={d.avg_rate} max={d.max_rate} />

      {/* Source */}
      <SectionHeading label="Source" />
      <Field icon={Tag} label="Source"        value={d.source} />
      <Field icon={Tag} label="Custom Source" value={d.custom_source || null} />

      {/* Submitted By */}
      <PersonBlock person={d.submitted_by} fallbackName={d.submitted_by_name} title="Submitted By" />

      {/* Remarks */}
      {d.remark && (
        <>
          <SectionHeading label="Remarks" />
          <p className="text-xs p-2.5 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-stroke)', color: 'var(--text-mid)' }}>
            {d.remark}
          </p>
        </>
      )}

      <MetadataSection
        id={d.id}
        approvalStatus={d.approval_status}
        localId={d.local_id}
        created={d.created_at}
      />
    </div>
  );
}

// ─── Preview card (instant, from local data) ─────────────────────────────────
function PreviewCard({ preview, module }: { preview: NonNullable<SelectedRecord['preview']>; module: string }) {
  const location  = [preview.village, preview.district].filter(Boolean).join(', ');
  const condColor = preview.condition ? (CONDITION_HEX[preview.condition] ?? null) : null;
  return (
    <div className="p-3 rounded-xl space-y-1.5"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-stroke)' }}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-lo)' }}>
          {MODULE_LABEL[module] ?? module}
        </p>
        {condColor && preview.condition && <Badge label={preview.condition} color={condColor} />}
      </div>
      {preview.name && <p className="text-sm font-semibold" style={{ color: 'var(--text-hi)' }}>{preview.name}</p>}
      {location     && <p className="text-xs" style={{ color: 'var(--text-lo)' }}>{location}</p>}
      {preview.date && <p className="text-xs" style={{ color: 'var(--text-lo)' }}>{preview.date}</p>}
    </div>
  );
}

// ─── Record detail wrapper ────────────────────────────────────────────────────
function RecordDetailView({ record }: { record: SelectedRecord }) {
  const { data: raw, isLoading, isError } = useGeoRecord(record.id, record.module);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
      {(isLoading || (isError && !raw)) && record.preview && (
        <PreviewCard preview={record.preview} module={record.module} />
      )}
      {isLoading && !record.preview && (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
          ))}
        </div>
      )}
      {isError && !raw && !record.preview && (
        <p className="text-xs text-center py-8" style={{ color: 'var(--text-lo)' }}>Could not load record details</p>
      )}
      {raw && record.module === 'visit' && <VisitDetail d={(raw as any).data} />}
      {raw && record.module === 'demo'  && <DemoDetail  d={(raw as any).data} />}
      {raw && record.module === 'mandi' && <MandiDetail  d={(raw as any).data} />}
    </div>
  );
}

// ─── Record list view (multi-record selector) ────────────────────────────────
const CONDITION_LABEL: Record<string, string> = { good: 'Good', average: 'Avg', poor: 'Poor' };

function RecordListView({
  group,
  onSelect,
}: {
  group: SelectedRecord[];
  onSelect: (r: SelectedRecord) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-2" style={{ borderBottom: '1px solid var(--glass-stroke)' }}>
        <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-lo)' }}>
          {group.length} record{group.length !== 1 ? 's' : ''} · select to view details
        </p>
      </div>
      <div className="divide-y" style={{ borderColor: 'var(--glass-stroke)' }}>
        {group.map((r) => {
          const color     = MODULE_HEX[r.module] ?? 'var(--accent)';
          const condColor = r.preview?.condition ? (CONDITION_HEX[r.preview.condition] ?? null) : null;
          const location  = [r.preview?.village, r.preview?.district].filter(Boolean).join(', ');
          return (
            <button
              key={r.id}
              onClick={() => onSelect(r)}
              className="w-full flex items-start gap-2.5 px-4 py-3 text-left transition-colors hover:bg-white/5"
            >
              <span className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-hi)' }}>
                    {r.preview?.name ?? (MODULE_LABEL[r.module] ?? r.module)}
                  </p>
                  {condColor && r.preview?.condition && (
                    <span className="text-[10px] font-semibold shrink-0" style={{ color: condColor }}>
                      {CONDITION_LABEL[r.preview.condition] ?? r.preview.condition}
                    </span>
                  )}
                </div>
                <p className="text-[10px] truncate" style={{ color: 'var(--text-lo)' }}>
                  {MODULE_LABEL[r.module] ?? r.module}{location ? ` · ${location}` : ''}
                </p>
                {r.preview?.date && (
                  <p className="text-[10px]" style={{ color: 'var(--text-lo)' }}>{r.preview.date}</p>
                )}
              </div>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: 'var(--text-lo)' }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────
export function InsightPanel() {
  const revealStage         = useMapStore((s) => s.revealStage);
  const selectedId          = useMapStore((s) => s.selectedFeatureId);
  const selectedLevel       = useMapStore((s) => s.selectedLevel);
  const selectedRecord      = useMapStore((s) => s.selectedRecord);
  const selectedRecordGroup = useMapStore((s) => s.selectedRecordGroup);
  const setSelectedFeature  = useMapStore((s) => s.setSelectedFeature);
  const setSelectedRecord   = useMapStore((s) => s.setSelectedRecord);
  const setSelectedRecordGroup = useMapStore((s) => s.setSelectedRecordGroup);

  // Active record within a group (may differ from selectedRecord in store when user switches)
  const [activeRecord, setActiveRecord] = useState<SelectedRecord | null>(null);

  // Sync activeRecord when store changes
  useEffect(() => {
    setActiveRecord(selectedRecord);
  }, [selectedRecord]);

  const { data: rawData, isLoading } = useGeoRegionSummary(selectedLevel, selectedId);
  const data = rawData as RegionSummary | undefined;

  const hasGroup = !!(selectedRecordGroup && selectedRecordGroup.length > 0);
  const isOpen   = !!(selectedId || selectedRecord || hasGroup);

  function handleClose() {
    setSelectedFeature(null);
    setSelectedRecord(null);
    setSelectedRecordGroup(null);
  }

  function handleBackToList() {
    setSelectedRecord(null);
    setActiveRecord(null);
  }

  function handleGroupSelect(r: SelectedRecord) {
    setActiveRecord(r);
    setSelectedRecord(r);
  }

  if (revealStage < 2) return null;

  const displayRecord  = activeRecord ?? selectedRecord;
  const showingList    = hasGroup && !displayRecord;
  const showBackButton = !!(displayRecord && selectedRecordGroup && selectedRecordGroup.length > 1);

  const headerTitle = showingList
    ? `${selectedRecordGroup!.length} Records`
    : displayRecord
      ? (MODULE_LABEL[displayRecord.module] ?? displayRecord.module)
      : selectedId ?? '';
  const headerSub   = showingList
    ? ''
    : displayRecord
      ? `ID: ${displayRecord.id.slice(0, 8)}…`
      : (selectedLevel ?? '');
  const headerColor = displayRecord ? (MODULE_HEX[displayRecord.module] ?? 'var(--accent)') : 'var(--accent)';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          key="insight"
          initial={{ x: 360, opacity: 0 }}
          animate={{ x: 0,   opacity: 1 }}
          exit={{ x: 360, opacity: 0 }}
          transition={SPRING.panel}
          className="absolute right-3 top-16 bottom-24 z-40 w-80 flex flex-col overflow-hidden rounded-2xl"
          style={{
            background:          'var(--glass-fill)',
            border:              '1px solid var(--glass-stroke)',
            backdropFilter:      'blur(20px)',
            WebkitBackdropFilter:'blur(20px)',
            boxShadow:           '0 8px 48px rgba(0,0,0,.5)',
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--glass-stroke)' }}>
            {showBackButton ? (
              <button
                onClick={handleBackToList}
                className="p-1 rounded-lg transition-colors shrink-0 hover:bg-white/10"
                style={{ color: 'var(--text-lo)' }}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
            ) : displayRecord ? (
              <span className="shrink-0 w-2 h-2 rounded-full" style={{ background: headerColor }} />
            ) : null}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate" style={{ color: 'var(--text-hi)' }}>{headerTitle}</p>
              {headerSub && <p className="text-[10px] capitalize truncate" style={{ color: 'var(--text-lo)' }}>{headerSub}</p>}
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg transition-colors shrink-0 hover:bg-white/10"
              style={{ color: 'var(--text-lo)' }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Body */}
          {displayRecord ? (
            <RecordDetailView record={displayRecord} />
          ) : showingList ? (
            <RecordListView group={selectedRecordGroup!} onSelect={handleGroupSelect} />
          ) : (
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
              {isLoading && (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
                  ))}
                </div>
              )}

              {data && (
                <>
                  {/* KPIs */}
                  <div className="grid grid-cols-2 gap-2">
                    <KpiCard label="Visits" value={data.kpis.total_visits} icon={TrendingUp} />
                    <KpiCard label="Demos"  value={data.kpis.total_demos}  icon={Leaf} />
                    <KpiCard label="Score"  value={`${Math.round(data.kpis.score * 100)}%`} icon={BarChart2} />
                    <KpiCard label="Execs"  value={data.top_execs.length}  icon={Users} />
                  </div>

                  {/* Condition breakdown */}
                  <div>
                    <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-lo)' }}>Condition</p>
                    <div className="flex gap-2 text-xs" style={{ color: 'var(--text-mid)' }}>
                      {[
                        { label: 'Good',    count: data.kpis.good,    color: '#34E08A' },
                        { label: 'Average', count: data.kpis.average, color: '#F5C542' },
                        { label: 'Poor',    count: data.kpis.poor,    color: '#FB6A6A' },
                      ].map(({ label, count, color }) => (
                        <div key={label} className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                          <span>{count} {label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Crop split donut */}
                  {data.crop_split.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-lo)' }}>Crop Split</p>
                      <div className="flex items-center gap-3">
                        <PieChart width={80} height={80}>
                          <Pie
                            data={data.crop_split}
                            dataKey="count"
                            nameKey="crop_name"
                            innerRadius={24}
                            outerRadius={36}
                            strokeWidth={0}
                          >
                            {data.crop_split.map((_item: { crop_name: string; count: number }, i: number) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                        </PieChart>
                        <div className="flex-1 space-y-0.5">
                          {data.crop_split.slice(0, 4).map((c: { crop_name: string; count: number }, i: number) => (
                            <div key={c.crop_name} className="flex items-center justify-between text-[11px]">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                                <span style={{ color: 'var(--text-mid)' }}>{c.crop_name}</span>
                              </div>
                              <span style={{ color: 'var(--text-lo)' }}>{c.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Trend sparkline */}
                  {data.trend.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-lo)' }}>30-day Trend</p>
                      <ResponsiveContainer width="100%" height={56}>
                        <AreaChart data={data.trend} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                          <defs>
                            <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor="#34E08A" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#34E08A" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Tooltip
                            contentStyle={{ background: 'var(--glass-fill)', border: '1px solid var(--glass-stroke)', borderRadius: 8, fontSize: 11 }}
                            labelStyle={{ color: 'var(--text-lo)' }}
                            itemStyle={{ color: 'var(--accent)' }}
                          />
                          <Area type="monotone" dataKey="count" stroke="#34E08A" strokeWidth={1.5} fill="url(#trendGrad)" dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Top execs */}
                  {data.top_execs.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-lo)' }}>Top Executives</p>
                      <div className="space-y-2">
                        {data.top_execs.map((exec: { id: number; name: string; count: number }, i: number) => {
                          const pct = Math.round((exec.count / data.top_execs[0].count) * 100);
                          return (
                            <div key={exec.id} className="space-y-0.5">
                              <div className="flex justify-between text-xs">
                                <span style={{ color: 'var(--text-mid)' }}>{exec.name || 'Unknown'}</span>
                                <span style={{ color: 'var(--text-lo)' }}>{exec.count}</span>
                              </div>
                              <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                <motion.div
                                  className="h-full rounded-full"
                                  style={{ background: 'var(--accent)' }}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{ ...SPRING.counter, delay: i * 0.05 }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

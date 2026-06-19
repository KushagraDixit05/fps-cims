"use client";
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, ChevronDown, X } from 'lucide-react';
import { DateRangePicker } from './DateRangePicker';
import { useMapStore } from '@/store/mapStore';
import { useFilterStore } from '@/store/filterStore';
import { useTimelineStore } from '@/store/timelineStore';
import { useGeoFacets } from '@/hooks/useGeoData';
import type { GeoFacets } from '@/types/geo';
import { SPRING } from '@/lib/mapMotion';

const CROPS = ['Chilli', 'Cotton', 'Soybean', 'Wheat', 'Rice', 'Maize', 'Onion', 'Tomato'];
const MODULES = [
  { id: 'visit', label: 'Visits' },
  { id: 'demo',  label: 'Demos'  },
  { id: 'mandi', label: 'Mandi'  },
];
const CONDITIONS = [
  { id: 'good',    label: 'Good',    color: '#34E08A' },
  { id: 'average', label: 'Average', color: '#F5C542' },
  { id: 'poor',    label: 'Poor',    color: '#FB6A6A' },
];

function ChipList({ options, selected, onToggle, empty }: { options: string[]; selected: string[]; onToggle: (v: string) => void; empty: string }) {
  if (!options.length) {
    return <p className="text-[10px] pb-2" style={{ color: 'var(--text-lo)' }}>{empty}</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5 pb-2">
      {options.map((o) => {
        const active = selected.includes(o);
        return (
          <button
            key={o}
            onClick={() => onToggle(o)}
            className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
            style={{
              background: active ? 'rgba(52,224,138,0.2)' : 'rgba(255,255,255,0.06)',
              color:      active ? 'var(--accent)' : 'var(--text-mid)',
              border:     active ? '1px solid rgba(52,224,138,0.4)' : '1px solid transparent',
            }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function SectionHead({ label, open, onToggle }: { label: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center justify-between w-full px-1 py-1.5 text-left"
    >
      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-lo)' }}>{label}</span>
      <ChevronDown
        className="h-3 w-3 transition-transform"
        style={{ color: 'var(--text-lo)', transform: open ? 'rotate(180deg)' : 'none' }}
        strokeWidth={2}
      />
    </button>
  );
}

export function FilterRail() {
  const revealStage      = useMapStore((s) => s.revealStage);
  const { crops, products, commodities, mandis, modules, condition, dateFrom, dateTo, toggleCrop, toggleProduct, toggleCommodity, toggleMandi, toggleModule, setCondition, setDateFrom, setDateTo, reset } = useFilterStore();
  const { data: facets, isLoading: facetsLoading } = useGeoFacets();
  const f = (facets ?? { products: [], commodities: [], mandis: [] }) as GeoFacets;
  const tlSetPlaying     = useTimelineStore((s) => s.setPlaying);
  const tlSetCurrentDate = useTimelineStore((s) => s.setCurrentDate);

  // Stop timeline playback whenever the user manually picks a date, so it
  // doesn't immediately overwrite the chosen value on the next RAF tick.
  function handleDateFrom(d: string | null) { tlSetPlaying(false); tlSetCurrentDate(null); setDateFrom(d); }
  function handleDateTo(d: string | null)   { tlSetPlaying(false); tlSetCurrentDate(null); setDateTo(d);   }

  const [cropOpen,      setCropOpen]      = useState(true);
  const [productOpen,   setProductOpen]   = useState(false);
  const [commodityOpen, setCommodityOpen] = useState(false);
  const [mandiOpen,     setMandiOpen]     = useState(false);
  const [advOpen,       setAdvOpen]       = useState(false);
  const [dateOpen,      setDateOpen]      = useState(false);
  const [railOpen,      setRailOpen]      = useState(true);

  const activeCount = crops.length + products.length + commodities.length + mandis.length + (condition ? 1 : 0) + (dateFrom || dateTo ? 1 : 0);

  if (revealStage < 2) return null;

  return (
    <motion.div
      initial={{ x: -320, opacity: 0 }}
      animate={{ x: 0,    opacity: 1 }}
      transition={{ ...SPRING.panel, delay: 0.1 }}
      className="absolute left-16 top-1/2 -translate-y-1/2 z-30"
      style={{ width: 264 }}
    >
      {/* Header toggle */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl mb-2 w-full"
        style={{
          background:     'var(--glass-fill)',
          border:         '1px solid var(--glass-stroke)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <button
          onClick={() => setRailOpen((o) => !o)}
          className="flex items-center gap-2 flex-1 min-w-0 text-left"
        >
          <Filter className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--accent)' }} strokeWidth={1.75} />
          <span className="text-xs font-semibold flex-1 text-left" style={{ color: 'var(--text-hi)' }}>Filters</span>
          {activeCount > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(52,224,138,.2)', color: 'var(--accent)' }}>{activeCount}</span>
          )}
          <ChevronDown
            className="h-3.5 w-3.5 transition-transform shrink-0"
            style={{ color: 'var(--text-lo)', transform: railOpen ? 'rotate(180deg)' : 'none' }}
            strokeWidth={1.75}
          />
        </button>
        {activeCount > 0 && (
          <button onClick={() => reset()} className="p-0.5 rounded shrink-0" style={{ color: 'var(--text-lo)' }}>
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {railOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={SPRING.panel}
            className="overflow-hidden"
          >
          <div
            className="rounded-xl px-3 py-3 space-y-2 overflow-y-auto"
            style={{
              maxHeight:      'calc(100vh - 8rem)',
              background:     'var(--glass-fill)',
              border:         '1px solid var(--glass-stroke)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }}
          >
            {/* Crops */}
            <SectionHead label="Crops" open={cropOpen} onToggle={() => setCropOpen((o) => !o)} />
            <AnimatePresence>
              {cropOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={SPRING.tactile}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap gap-1.5 pb-2">
                    {CROPS.map((c) => {
                      const active = crops.includes(c);
                      return (
                        <button
                          key={c}
                          onClick={() => toggleCrop(c)}
                          className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
                          style={{
                            background: active ? 'rgba(52,224,138,0.2)' : 'rgba(255,255,255,0.06)',
                            color:      active ? 'var(--accent)' : 'var(--text-mid)',
                            border:     active ? '1px solid rgba(52,224,138,0.4)' : '1px solid transparent',
                          }}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Products */}
            <SectionHead label="Products" open={productOpen} onToggle={() => setProductOpen((o) => !o)} />
            <AnimatePresence>
              {productOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={SPRING.tactile}
                  className="overflow-hidden"
                >
                  <ChipList options={f.products} selected={products} onToggle={toggleProduct} empty="No products available" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mandi Commodity */}
            <SectionHead label="Commodity" open={commodityOpen} onToggle={() => setCommodityOpen((o) => !o)} />
            <AnimatePresence>
              {commodityOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={SPRING.tactile}
                  className="overflow-hidden"
                >
                  <ChipList options={f.commodities} selected={commodities} onToggle={toggleCommodity} empty="No commodities available" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mandi */}
            <SectionHead label="Mandi" open={mandiOpen} onToggle={() => setMandiOpen((o) => !o)} />
            <AnimatePresence>
              {mandiOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={SPRING.tactile}
                  className="overflow-hidden"
                >
                  {facetsLoading
                    ? <p className="text-[10px] pb-2" style={{ color: 'var(--text-lo)' }}>Loading…</p>
                    : <ChipList options={f.mandis ?? []} selected={mandis} onToggle={toggleMandi} empty="No mandis available" />
                  }
                </motion.div>
              )}
            </AnimatePresence>

            {/* Advanced */}
            <SectionHead label="Advanced" open={advOpen} onToggle={() => setAdvOpen((o) => !o)} />
            <AnimatePresence>
              {advOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={SPRING.tactile}
                  className="overflow-hidden space-y-3 pb-2"
                >
                  {/* Modules */}
                  <div>
                    <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-lo)' }}>Module</p>
                    <div className="flex gap-1.5">
                      {MODULES.map(({ id, label }) => {
                        const active = modules.includes(id);
                        return (
                          <button
                            key={id}
                            onClick={() => toggleModule(id)}
                            className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
                            style={{
                              background: active ? 'rgba(52,224,138,0.2)' : 'rgba(255,255,255,0.06)',
                              color:      active ? 'var(--accent)' : 'var(--text-mid)',
                              border:     active ? '1px solid rgba(52,224,138,0.4)' : '1px solid transparent',
                            }}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Condition */}
                  <div>
                    <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-lo)' }}>Condition</p>
                    <div className="flex gap-1.5">
                      {CONDITIONS.map(({ id, label, color }) => {
                        const active = condition === id;
                        return (
                          <button
                            key={id}
                            onClick={() => setCondition(active ? null : id)}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
                            style={{
                              background: active ? `${color}22` : 'rgba(255,255,255,0.06)',
                              color:      active ? color : 'var(--text-mid)',
                              border:     active ? `1px solid ${color}66` : '1px solid transparent',
                            }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Date Range */}
            <SectionHead label="Date Range" open={dateOpen} onToggle={() => setDateOpen((o) => !o)} />
            <AnimatePresence>
              {dateOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={SPRING.tactile}
                  className="overflow-hidden space-y-2 pb-2"
                >
                  <DateRangePicker
                    dateFrom={dateFrom}
                    dateTo={dateTo}
                    onFrom={handleDateFrom}
                    onTo={handleDateTo}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

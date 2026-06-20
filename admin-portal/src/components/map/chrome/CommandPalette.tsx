"use client";
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, MapPin, Leaf, Sprout, Users, Navigation } from 'lucide-react';
import { useMapStore } from '@/store/mapStore';
import { useFilterStore } from '@/store/filterStore';
import { SPRING } from '@/lib/mapMotion';
import { loadDistrictIndex, searchDistricts, type DistrictEntry } from '@/lib/districtIndex';

type ItemType = 'district' | 'crop' | 'module' | 'action';

interface PaletteItem {
  id:      string;
  type:    ItemType;
  label:   string;
  sub?:    string;
}

const STATIC_ITEMS: PaletteItem[] = [
  // Modules
  { id: 'visit',   type: 'module',   label: 'Crop Intelligence',   sub: 'Module' },
  { id: 'demo',    type: 'module',   label: 'Product Performance', sub: 'Module' },
  { id: 'mandi',   type: 'module',   label: 'Market Intelligence', sub: 'Module' },
  // Crops
  { id: 'Chilli',  type: 'crop',     label: 'Chilli',             sub: 'Crop' },
  { id: 'Cotton',  type: 'crop',     label: 'Cotton',             sub: 'Crop' },
  { id: 'Soybean', type: 'crop',     label: 'Soybean',            sub: 'Crop' },
  { id: 'Wheat',   type: 'crop',     label: 'Wheat',              sub: 'Crop' },
  { id: 'Rice',    type: 'crop',     label: 'Rice',               sub: 'Crop' },
  { id: 'Maize',   type: 'crop',     label: 'Maize',              sub: 'Crop' },
  // Actions
  { id: 'reset',   type: 'action',   label: 'Reset Filters',      sub: 'Action' },
  { id: 'heat',    type: 'action',   label: 'Switch to Heat',     sub: 'Mode' },
  { id: 'cluster', type: 'action',   label: 'Switch to Cluster',  sub: 'Mode' },
  { id: 'pin',     type: 'action',   label: 'Switch to Pins',     sub: 'Mode' },
  { id: 'district',type: 'action',   label: 'Switch to District', sub: 'Mode' },
  { id: 'flow',    type: 'action',   label: 'Switch to Flow',     sub: 'Mode' },
];

const TYPE_ICON: Record<ItemType, React.ElementType> = {
  district: MapPin,
  crop:     Leaf,
  module:   Sprout,
  action:   Users,
};

export function CommandPalette() {
  const open            = useMapStore((s) => s.commandPaletteOpen);
  const close           = useMapStore((s) => s.setCommandPaletteOpen);
  const setMode         = useMapStore((s) => s.setActiveMode);
  const setFlyToTarget  = useMapStore((s) => s.setFlyToTarget);
  const setSelectedFeature = useMapStore((s) => s.setSelectedFeature);
  const { toggleCrop, toggleModule, reset } = useFilterStore();

  const [query,   setQuery]   = useState('');
  const [active,  setActive]  = useState(0);
  const [index,   setIndex]   = useState<DistrictEntry[]>([]);
  const inputRef  = useRef<HTMLInputElement>(null);

  // Pre-load district index when palette opens for the first time.
  useEffect(() => {
    if (open && index.length === 0) {
      loadDistrictIndex().then(setIndex);
    }
  }, [open, index.length]);

  useEffect(() => {
    if (open) { setQuery(''); setActive(0); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open]);

  const q = query.trim();
  const locationResults: DistrictEntry[] = q.length >= 2 ? searchDistricts(q, index) : [];

  const filteredStatic = q
    ? STATIC_ITEMS.filter(
        (it) =>
          it.label.toLowerCase().includes(q.toLowerCase()) ||
          (it.sub ?? '').toLowerCase().includes(q.toLowerCase())
      )
    : STATIC_ITEMS;

  // Flat list for keyboard navigation: locations first, then static items.
  const totalItems = locationResults.length + filteredStatic.length;

  function flyToDistrict(entry: DistrictEntry) {
    setFlyToTarget(entry.bounds);
    // Select the region and switch to district mode so the insight panel opens.
    setSelectedFeature(entry.district, entry.district === entry.state ? 'state' : 'district');
    setMode('district');
    close(false);
  }

  function executeStatic(item: PaletteItem) {
    if (item.type === 'crop')   toggleCrop(item.id);
    if (item.type === 'module') toggleModule(item.id);
    if (item.type === 'action' && item.id === 'reset') reset();
    if (item.type === 'action' && ['heat','cluster','pin','district','flow'].includes(item.id))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setMode(item.id as any);
    close(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, totalItems - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    if (e.key === 'Enter') {
      if (active < locationResults.length) {
        flyToDistrict(locationResults[active]);
      } else {
        const si = filteredStatic[active - locationResults.length];
        if (si) executeStatic(si);
      }
    }
    if (e.key === 'Escape') close(false);
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-100"
            style={{ background: 'rgba(5,8,10,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => close(false)}
          />

          {/* Palette */}
          <motion.div
            key="palette"
            initial={{ opacity: 0, scale: 0.96, y: -16 }}
            animate={{ opacity: 1, scale: 1,    y: 0    }}
            exit={{    opacity: 0, scale: 0.96, y: -16  }}
            transition={SPRING.cinema}
            className="fixed top-[20vh] left-1/2 -translate-x-1/2 z-101 w-full overflow-hidden rounded-2xl"
            style={{ maxWidth: 560, background: 'var(--map-bg-1)', border: '1px solid var(--glass-stroke)', boxShadow: '0 24px 80px rgba(0,0,0,.8)' }}
          >
            {/* Input */}
            <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--glass-stroke)' }}>
              <Search className="h-4 w-4 shrink-0" style={{ color: 'var(--text-lo)' }} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setActive(0); }}
                onKeyDown={onKeyDown}
                placeholder="Search districts, crops, actions…"
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: 'var(--text-hi)' }}
              />
              {query && (
                <button onClick={() => setQuery('')} style={{ color: 'var(--text-lo)' }}>
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <kbd className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-lo)' }}>Esc</kbd>
            </div>

            {/* Results */}
            <ul className="max-h-80 overflow-y-auto py-1">
              {totalItems === 0 && (
                <li className="px-4 py-6 text-center text-sm" style={{ color: 'var(--text-lo)' }}>No results</li>
              )}

              {/* Location results */}
              {locationResults.length > 0 && (
                <>
                  <li className="px-4 pt-2 pb-1">
                    <span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'var(--text-lo)' }}>Locations</span>
                  </li>
                  {locationResults.map((entry, i) => {
                    const isActive = i === active;
                    const isState  = entry.district === entry.state;
                    return (
                      <li key={`loc-${entry.district}-${entry.state}`}>
                        <button
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors"
                          style={{
                            background:  isActive ? 'rgba(52,224,138,0.08)' : 'transparent',
                            borderLeft:  isActive ? '2px solid var(--accent)' : '2px solid transparent',
                          }}
                          onMouseEnter={() => setActive(i)}
                          onClick={() => flyToDistrict(entry)}
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg shrink-0" style={{ background: 'rgba(52,224,138,0.10)' }}>
                            <Navigation className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} strokeWidth={1.75} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate" style={{ color: 'var(--text-hi)' }}>{entry.district}</p>
                            {!isState && (
                              <p className="text-[11px] truncate" style={{ color: 'var(--text-lo)' }}>{entry.state}</p>
                            )}
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(52,224,138,0.12)', color: 'var(--accent)' }}>
                            {isState ? 'State' : 'District'}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </>
              )}

              {/* Static items */}
              {filteredStatic.length > 0 && (
                <>
                  {locationResults.length > 0 && (
                    <li className="px-4 pt-3 pb-1">
                      <span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'var(--text-lo)' }}>Actions</span>
                    </li>
                  )}
                  {filteredStatic.map((item, i) => {
                    const globalIndex = locationResults.length + i;
                    const isActive    = globalIndex === active;
                    const Icon        = TYPE_ICON[item.type];
                    return (
                      <li key={item.id}>
                        <button
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors"
                          style={{
                            background:  isActive ? 'rgba(52,224,138,0.08)' : 'transparent',
                            borderLeft:  isActive ? '2px solid var(--accent)' : '2px solid transparent',
                          }}
                          onMouseEnter={() => setActive(globalIndex)}
                          onClick={() => executeStatic(item)}
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <Icon className="h-3.5 w-3.5" style={{ color: 'var(--text-mid)' }} strokeWidth={1.75} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate" style={{ color: 'var(--text-hi)' }}>{item.label}</p>
                          </div>
                          {item.sub && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.07)', color: 'var(--text-lo)' }}>
                              {item.sub}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </>
              )}
            </ul>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

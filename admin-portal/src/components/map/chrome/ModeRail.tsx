"use client";
import { motion } from 'framer-motion';
import { Flame, Layers, MapPin, Map, Wind } from 'lucide-react';
import { useMapStore } from '@/store/mapStore';
import { SPRING } from '@/lib/mapMotion';
import type { MapMode } from '@/types/geo';

const MODES: { id: MapMode; label: string; Icon: React.ElementType }[] = [
  { id: 'heat',     label: 'Heat',     Icon: Flame  },
  { id: 'cluster',  label: 'Cluster',  Icon: Layers },
  { id: 'pin',      label: 'Pins',     Icon: MapPin },
  { id: 'district', label: 'District', Icon: Map    },
  { id: 'flow',     label: 'Flow',     Icon: Wind   },
];

export function ModeRail() {
  const revealStage = useMapStore((s) => s.revealStage);
  const activeMode  = useMapStore((s) => s.activeMode);
  const setMode     = useMapStore((s) => s.setActiveMode);

  if (revealStage < 2) return null;

  return (
    <motion.div
      initial={{ x: -56, opacity: 0 }}
      animate={{ x: 0,   opacity: 1 }}
      transition={SPRING.panel}
      className="absolute left-3 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-1 p-1.5 rounded-2xl"
      style={{
        background:     'var(--glass-fill)',
        border:         '1px solid var(--glass-stroke)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow:      '0 4px 32px rgba(0,0,0,.4)',
      }}
    >
      {MODES.map(({ id, label, Icon }) => {
        const active = id === activeMode;
        return (
          <button
            key={id}
            onClick={() => setMode(id)}
            title={label}
            className="relative flex items-center justify-center w-10 h-10 rounded-xl transition-colors"
            style={{
              background: active ? 'rgba(52,224,138,0.15)' : 'transparent',
              color: active ? 'var(--accent)' : 'var(--text-lo)',
            }}
          >
            {active && (
              <motion.div
                layoutId="mode-active-bg"
                className="absolute inset-0 rounded-xl"
                style={{ background: 'rgba(52,224,138,0.12)' }}
                transition={SPRING.tactile}
              />
            )}
            <Icon className="h-4 w-4 relative z-10" strokeWidth={1.75} />
          </button>
        );
      })}
    </motion.div>
  );
}

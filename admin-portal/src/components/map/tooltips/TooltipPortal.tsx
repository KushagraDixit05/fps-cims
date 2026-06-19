"use client";
import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMapStore } from '@/store/mapStore';
import { SPRING } from '@/lib/mapMotion';
import { HeatTip } from './HeatTip';
import { ClusterTip } from './ClusterTip';
import { RecordTip } from './RecordTip';
import { DistrictTip } from './DistrictTip';
import { FlowTip } from './FlowTip';

const INTENT_DELAY = 120; // ms before showing tooltip (suppresses fast sweeps)

export function TooltipPortal() {
  const hoverInfo   = useMapStore((s) => s.hoverInfo);
  const [mounted, setMounted] = useState(false);
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (hoverInfo?.feature) {
      timerRef.current = setTimeout(() => setVisible(true), INTENT_DELAY);
    } else {
      setVisible(false);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [hoverInfo]);

  if (!mounted) return null;

  const root = document.getElementById('map-tooltip-root');
  if (!root) return null;

  return createPortal(
    <AnimatePresence>
      {visible && hoverInfo?.feature && (
        <motion.div
          key="tooltip"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={SPRING.tactile}
          style={{
            position: 'fixed',
            left: Math.min(hoverInfo.x + 12, window.innerWidth - 280),
            top:  Math.min(hoverInfo.y - 8,  window.innerHeight - 200),
            zIndex: 9000,
            pointerEvents: 'none',
          }}
        >
          {hoverInfo.mode === 'heat'     && <HeatTip     feature={hoverInfo.feature as never} />}
          {hoverInfo.mode === 'cluster'  && <ClusterTip  feature={hoverInfo.feature as never} />}
          {hoverInfo.mode === 'pin'      && <RecordTip   feature={hoverInfo.feature as never} />}
          {hoverInfo.mode === 'district' && <DistrictTip feature={hoverInfo.feature as never} />}
          {hoverInfo.mode === 'flow'     && <FlowTip     feature={hoverInfo.feature as never} />}
        </motion.div>
      )}
    </AnimatePresence>,
    root,
  );
}

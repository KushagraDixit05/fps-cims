"use client";
import { useEffect } from 'react';
import { useMapStore } from '@/store/mapStore';

export function useMapReveal() {
  const setRevealStage = useMapStore((s) => s.setRevealStage);

  useEffect(() => {
    // Skip animation if already shown this session
    if (sessionStorage.getItem('fps-map-revealed')) {
      setRevealStage(3);
      return;
    }
    sessionStorage.setItem('fps-map-revealed', '1');

    const prefersReduced =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setTimeout(() => setRevealStage(3), 200);
      return;
    }

    // Staggered reveal sequence:
    // Stage 1 (200ms): basemap fades up
    // Stage 2 (700ms): chrome slides in
    // Stage 3 (1200ms): live pulse starts
    const t1 = setTimeout(() => setRevealStage(1), 200);
    const t2 = setTimeout(() => setRevealStage(2), 700);
    const t3 = setTimeout(() => setRevealStage(3), 1200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

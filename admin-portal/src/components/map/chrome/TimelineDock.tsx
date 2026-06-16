"use client";
import { useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipForward } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, Tooltip } from 'recharts';
import { useMapStore } from '@/store/mapStore';
import { useTimelineStore } from '@/store/timelineStore';
import { useFilterStore } from '@/store/filterStore';
import { useGeoTimeline } from '@/hooks/useGeoData';
import { SPRING } from '@/lib/mapMotion';

export function TimelineDock() {
  const revealStage   = useMapStore((s) => s.revealStage);
  const { playing, currentDate, speed, buckets, setPlaying, setCurrentDate, setSpeed, setBuckets } = useTimelineStore();
  const setDateFrom   = useFilterStore((s) => s.setDateFrom);
  const setDateTo     = useFilterStore((s) => s.setDateTo);
  const rafRef        = useRef<number | null>(null);
  const lastTick      = useRef<number>(0);

  const { data } = useGeoTimeline('day');

  useEffect(() => {
    if (data?.buckets) setBuckets(data.buckets);
  }, [data, setBuckets]);

  const currentDateRef = useRef(currentDate);
  useEffect(() => { currentDateRef.current = currentDate; }, [currentDate]);

  // Playback loop
  useEffect(() => {
    if (!playing || !buckets.length) return;

    const tick = (timestamp: number) => {
      const elapsed = timestamp - lastTick.current;
      if (elapsed < 1000 / speed) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      lastTick.current = timestamp;

      const prev = currentDateRef.current;
      const idx  = prev ? buckets.findIndex((b) => b.date === prev) : -1;
      const next = idx < buckets.length - 1 ? buckets[idx + 1].date : buckets[0].date;
      setCurrentDate(next);
      setDateFrom(next);
      setDateTo(next);

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [playing, buckets, speed, setCurrentDate, setDateFrom, setDateTo]);

  const togglePlay = useCallback(() => {
    if (!playing && !currentDate && buckets.length) setCurrentDate(buckets[0].date);
    setPlaying(!playing);
  }, [playing, currentDate, buckets, setPlaying, setCurrentDate]);

  const cycleSpeed = useCallback(() => {
    setSpeed(speed === 1 ? 2 : speed === 2 ? 4 : 1);
  }, [speed, setSpeed]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleBarClick = useCallback((chartData: any) => {
    const date = chartData?.activePayload?.[0]?.payload?.date;
    if (date) {
      setCurrentDate(date);
      setDateFrom(date);
      setDateTo(date);
    }
  }, [setCurrentDate, setDateFrom, setDateTo]);

  if (revealStage < 2) return null;

  return (
    <motion.div
      initial={{ y: 96, opacity: 0 }}
      animate={{ y: 0,  opacity: 1 }}
      transition={{ ...SPRING.panel, delay: 0.15 }}
      className="absolute bottom-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-3 rounded-2xl"
      style={{
        background:     'var(--glass-fill)',
        border:         '1px solid var(--glass-stroke)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow:      '0 -4px 32px rgba(0,0,0,.4)',
        width:          640,
        maxWidth:       'calc(100vw - 24px)',
      }}
    >
      {/* Play/Pause */}
      <button
        onClick={togglePlay}
        className="flex items-center justify-center w-8 h-8 rounded-xl transition-colors shrink-0"
        style={{ background: 'rgba(52,224,138,.15)', color: 'var(--accent)' }}
      >
        {playing ? <Pause className="h-3.5 w-3.5" fill="currentColor" /> : <Play className="h-3.5 w-3.5" fill="currentColor" />}
      </button>

      {/* Speed */}
      <button
        onClick={cycleSpeed}
        className="text-[11px] font-bold w-7 text-center shrink-0"
        style={{ color: 'var(--text-mid)' }}
        title="Playback speed"
      >
        {speed}×
      </button>

      {/* Histogram */}
      <div className="flex-1 h-12">
        {buckets.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={buckets} margin={{ top: 0, right: 0, bottom: 0, left: 0 }} onClick={handleBarClick}>
              <Tooltip
                contentStyle={{ background: 'var(--glass-fill)', border: '1px solid var(--glass-stroke)', borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: 'var(--text-lo)' }}
                itemStyle={{ color: 'var(--accent)' }}
              />
              <Bar
                dataKey="count"
                fill="rgba(52,224,138,0.4)"
                radius={[2, 2, 0, 0]}
                // Highlight active date bar
                label={false}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="h-1 w-full rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
          </div>
        )}
      </div>

      {/* Current date */}
      <div className="text-right shrink-0" style={{ minWidth: 80 }}>
        {currentDate ? (
          <p className="text-xs font-mono" style={{ color: 'var(--text-hi)' }}>
            {new Date(currentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        ) : (
          <p className="text-[10px]" style={{ color: 'var(--text-lo)' }}>All time</p>
        )}
        {currentDate && (
          <button
            onClick={() => { setCurrentDate(null); setDateFrom(null); setDateTo(null); setPlaying(false); }}
            className="text-[10px] mt-0.5"
            style={{ color: 'var(--text-lo)' }}
          >
            Clear
          </button>
        )}
      </div>
    </motion.div>
  );
}

"use client";
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, Search, Moon, Sun, Radio } from 'lucide-react';
import Link from 'next/link';
import { useMapStore } from '@/store/mapStore';
import { SPRING } from '@/lib/mapMotion';

function LiveClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);
  return <span style={{ color: 'var(--text-mid)', fontVariantNumeric: 'tabular-nums' }} className="text-xs font-mono">{time}</span>;
}

export function MapTopBar() {
  const revealStage          = useMapStore((s) => s.revealStage);
  const setCommandPaletteOpen = useMapStore((s) => s.setCommandPaletteOpen);
  const [dark, setDark]      = useState(true);

  if (revealStage < 2) return null;

  return (
    <motion.header
      initial={{ y: -48, opacity: 0 }}
      animate={{ y: 0,   opacity: 1 }}
      transition={SPRING.panel}
      className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2 rounded-2xl"
      style={{
        background:     'var(--glass-fill)',
        border:         '1px solid var(--glass-stroke)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow:      '0 4px 32px rgba(0,0,0,.4)',
      }}
    >
      {/* Brand */}
      <Link href="/" className="flex items-center gap-1.5 mr-1">
        <Globe className="h-4 w-4" style={{ color: 'var(--accent)' }} strokeWidth={1.75} />
        <span className="text-sm font-bold" style={{ color: 'var(--text-hi)' }}>Agri Map</span>
      </Link>

      <div style={{ width: 1, height: 18, background: 'var(--glass-stroke)' }} />

      {/* Live pulse */}
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full animate-ping" style={{ background: 'var(--accent)', opacity: 0.5 }} />
          <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: 'var(--accent)' }} />
        </span>
        <span className="text-[10px] font-medium uppercase tracking-widest" style={{ color: 'var(--accent)' }}>Live</span>
      </div>

      <LiveClock />

      <div style={{ width: 1, height: 18, background: 'var(--glass-stroke)' }} />

      {/* Search trigger */}
      <button
        onClick={() => setCommandPaletteOpen(true)}
        className="flex items-center gap-2 px-3 py-1 rounded-xl text-xs transition-colors"
        style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-mid)' }}
      >
        <Search className="h-3 w-3" />
        <span>Search</span>
        <kbd className="ml-1 text-[10px] px-1 rounded" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-lo)' }}>⌘K</kbd>
      </button>

      {/* Theme toggle */}
      <button
        onClick={() => setDark((d) => !d)}
        className="p-1.5 rounded-lg transition-colors"
        style={{ color: 'var(--text-lo)' }}
        title="Toggle theme"
      >
        {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
      </button>
    </motion.header>
  );
}

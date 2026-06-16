"use client";
import { useEffect } from 'react';
import { useMapStore } from '@/store/mapStore';

export function useMapKeyboard() {
  const setCommandPaletteOpen = useMapStore((s) => s.setCommandPaletteOpen);
  const setSelectedFeature    = useMapStore((s) => s.setSelectedFeature);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // ⌘K or Ctrl+K → open command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      // Escape → close palette / deselect feature
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
        setSelectedFeature(null);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setCommandPaletteOpen, setSelectedFeature]);
}

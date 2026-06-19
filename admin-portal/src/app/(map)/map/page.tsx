"use client";

import dynamic from "next/dynamic";

const MapWorkspace = dynamic(
  () => import("@/components/map/MapWorkspace").then((m) => m.MapWorkspace),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex h-screen w-screen items-center justify-center"
        style={{ background: "var(--map-bg-0)" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="h-2 w-24 rounded-full animate-pulse"
            style={{ background: "var(--accent-dim)" }}
          />
          <p className="text-xs" style={{ color: "var(--text-lo)" }}>
            Loading map…
          </p>
        </div>
      </div>
    ),
  }
);

export default function MapPage() {
  return <MapWorkspace />;
}

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/common/PageHeader";
import { SummaryStrip } from "@/components/dashboard/SummaryStrip";
import { CropIntelligenceSection } from "@/components/dashboard/CropIntelligenceSection";
import { MarketIntelligenceSection } from "@/components/dashboard/MarketIntelligenceSection";
import { ProductPerformanceSection } from "@/components/dashboard/ProductPerformanceSection";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";

const DAY_OPTIONS = [7, 30, 90];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <p className="text-[13px] font-bold uppercase tracking-wider text-fps-muted">{children}</p>
      <div className="flex-1 h-px bg-fps-border" />
    </div>
  );
}

export default function DashboardPage() {
  const [days, setDays] = useState(30);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-7 max-w-7xl mx-auto"
    >
      <PageHeader
        title="Operations Dashboard"
        description="Agricultural Intelligence Command Center"
        actions={
          <div className="flex items-center gap-1 bg-white rounded-xl border border-fps-border p-1">
            {DAY_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                  days === d
                    ? "bg-fps-primary text-white"
                    : "text-fps-secondary hover:bg-fps-canvas"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        }
      />

      <SummaryStrip />

      <SectionLabel>Crop Intelligence</SectionLabel>
      <CropIntelligenceSection days={days} />

      <SectionLabel>Market Intelligence</SectionLabel>
      <MarketIntelligenceSection days={days} />

      <SectionLabel>Product Performance</SectionLabel>
      <ProductPerformanceSection days={days} />

      <SectionLabel>Recent Activities</SectionLabel>
      <ActivityFeed />
    </motion.div>
  );
}

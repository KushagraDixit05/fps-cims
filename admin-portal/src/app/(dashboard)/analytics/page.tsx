"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/common/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CropIntelligenceTab } from "@/components/analytics/CropIntelligenceTab";
import { MarketIntelligenceTab } from "@/components/analytics/MarketIntelligenceTab";
import { ProductPerformanceTab } from "@/components/analytics/ProductPerformanceTab";
import { ExecutivePerformanceTab } from "@/components/analytics/ExecutivePerformanceTab";
import { GeographicInsightsTab } from "@/components/analytics/GeographicInsightsTab";

const DAY_OPTIONS: { label: string; value: number }[] = [
  { label: "Today", value: 1 },
  { label: "7d", value: 7 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
];

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6 max-w-7xl mx-auto"
    >
      <PageHeader
        title="Analytics"
        description="Agricultural Intelligence — Detailed reporting and insights"
        actions={
          <div className="flex items-center gap-1 bg-white rounded-xl border border-fps-border p-1">
            {DAY_OPTIONS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setDays(value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                  days === value
                    ? "bg-fps-primary text-white"
                    : "text-fps-secondary hover:bg-fps-canvas"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        }
      />

      <Tabs defaultValue="crop">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="crop">Crop Intelligence Module</TabsTrigger>
          <TabsTrigger value="market">Market Intelligence Module</TabsTrigger>
          <TabsTrigger value="product">Product Performance Module</TabsTrigger>
          <TabsTrigger value="executive">Executive Performance</TabsTrigger>
          <TabsTrigger value="geographic">Geographic Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="crop">
          <CropIntelligenceTab days={days} />
        </TabsContent>

        <TabsContent value="market">
          <MarketIntelligenceTab days={days} />
        </TabsContent>

        <TabsContent value="product">
          <ProductPerformanceTab days={days} />
        </TabsContent>

        <TabsContent value="executive">
          <ExecutivePerformanceTab days={days} />
        </TabsContent>

        <TabsContent value="geographic">
          <GeographicInsightsTab days={days} />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

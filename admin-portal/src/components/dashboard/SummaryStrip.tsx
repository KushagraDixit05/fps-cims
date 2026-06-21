"use client";

import { useState } from "react";
import { Sprout, TrendingUp, FlaskConical, Users, UserCheck, MapPin } from "lucide-react";
import { KPICard } from "@/components/common/KPICard";
import { SkeletonCard } from "@/components/common/SkeletonTable";
import { useSummary } from "@/hooks/useAnalytics";

type Period = "today" | "week" | "month";

function growthPct(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

function trendProp(current: number, previous: number) {
  const pct = growthPct(current, previous);
  if (pct === null) return undefined;
  return { value: pct, label: "vs prev period" };
}

const PERIOD_LABELS: { key: Period; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
];

export function SummaryStrip() {
  const [period, setPeriod] = useState<Period>("week");
  const { data, isLoading } = useSummary(period);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-fps-secondary">Summary</p>
        <div className="flex items-center gap-1 bg-white rounded-xl border border-fps-border p-1">
          {PERIOD_LABELS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                period === key
                  ? "bg-fps-primary text-white"
                  : "text-fps-secondary hover:bg-fps-canvas"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading || !data ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <KPICard
            label="Crop Intelligence Module"
            value={data.current.crop_entries}
            subtext={`${data.all_time.crop_entries} all time`}
            icon={Sprout}
            iconColor="#1A4A2E"
            iconBg="#E1F2E8"
            trend={trendProp(data.current.crop_entries, data.previous.crop_entries)}
            index={0}
          />
          <KPICard
            label="Market Intelligence Module"
            value={data.current.market_entries}
            subtext={`${data.all_time.market_entries} all time`}
            icon={TrendingUp}
            iconColor="#C8900A"
            iconBg="#FEF3DA"
            trend={trendProp(data.current.market_entries, data.previous.market_entries)}
            index={1}
          />
          <KPICard
            label="Product Performance Module"
            value={data.current.product_demos}
            subtext={`${data.all_time.product_demos} all time`}
            icon={FlaskConical}
            iconColor="#185FA5"
            iconBg="#E6F1FB"
            trend={trendProp(data.current.product_demos, data.previous.product_demos)}
            index={2}
          />
          <KPICard
            label="Active Executives"
            value={data.current.active_executives}
            subtext={`${data.all_time.active_executives} ever active`}
            icon={Users}
            iconColor="#1A4A2E"
            iconBg="#E1F2E8"
            trend={trendProp(data.current.active_executives, data.previous.active_executives)}
            index={3}
          />
          <KPICard
            label="Farmers Covered"
            value={data.current.farmers_covered}
            subtext={`${data.all_time.farmers_covered} all time`}
            icon={UserCheck}
            iconColor="#0E7490"
            iconBg="#E0F2FE"
            trend={trendProp(data.current.farmers_covered, data.previous.farmers_covered)}
            index={4}
          />
          <KPICard
            label="Villages Covered"
            value={data.current.villages_covered}
            subtext={`${data.all_time.villages_covered} all time`}
            icon={MapPin}
            iconColor="#4F46E5"
            iconBg="#EEF2FF"
            trend={trendProp(data.current.villages_covered, data.previous.villages_covered)}
            index={5}
          />
        </div>
      )}
    </div>
  );
}

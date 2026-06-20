"use client";

import { MapPin, Building2, Layers } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { KPICard } from "@/components/common/KPICard";
import { useCropIntelligence } from "@/hooks/useAnalytics";

interface Props { days: number }

function Skeleton({ h = 200 }: { h?: number }) {
  return <div className="animate-pulse bg-fps-canvas rounded-xl" style={{ height: h }} />;
}

function Empty({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center text-fps-muted text-sm" style={{ height: 100 }}>
      {label}
    </div>
  );
}

export function GeographicInsightsTab({ days }: Props) {
  const { data, isLoading } = useCropIntelligence(days);

  const districts = data?.district_coverage ?? [];
  const blocks = data?.block_coverage ?? [];
  const villages = data?.village_coverage ?? [];

  return (
    <div className="space-y-5">
      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard label="Districts Active" value={isLoading ? "—" : districts.length} icon={Building2} iconColor="#4F46E5" iconBg="#EEF2FF" index={0} />
        <KPICard label="Blocks Active" value={isLoading ? "—" : blocks.length} icon={Layers} iconColor="#0E7490" iconBg="#E0F2FE" index={1} />
        <KPICard label="Villages Reached" value={isLoading ? "—" : data?.total_villages ?? 0} icon={MapPin} iconColor="#1A4A2E" iconBg="#E1F2E8" index={2} />
      </div>

      {/* District rankings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[15px]">District Coverage Rankings</CardTitle>
          <p className="text-xs text-fps-muted">Field visits by district — ranked by activity</p>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton h={200} /> : districts.length === 0 ? <Empty label="No district data" /> : (
            <div className="space-y-3">
              {districts.map((d, i) => {
                const max = districts[0]?.entries ?? 1;
                const pct = Math.round((d.entries / max) * 100);
                return (
                  <div key={d.district} className="flex items-center gap-3">
                    <span className="text-[11px] font-bold text-fps-muted w-6 shrink-0">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[13px] font-semibold text-fps-ink">{d.district}</span>
                        <span className="text-[12px] font-bold text-fps-primary">{d.entries} visits · {d.villages} villages</span>
                      </div>
                      <div className="h-2 bg-fps-canvas rounded-full">
                        <div className="h-2 rounded-full bg-fps-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Block rankings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[15px]">Block Coverage Rankings</CardTitle>
          <p className="text-xs text-fps-muted">Most active blocks ranked by visit count</p>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton h={200} /> : blocks.length === 0 ? <Empty label="No block data" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-fps-divider">
                    <th className="text-left pb-2 text-[11px] font-bold text-fps-muted uppercase tracking-wide w-8">#</th>
                    <th className="text-left pb-2 text-[11px] font-bold text-fps-muted uppercase tracking-wide">Block</th>
                    <th className="text-left pb-2 text-[11px] font-bold text-fps-muted uppercase tracking-wide">District</th>
                    <th className="text-right pb-2 text-[11px] font-bold text-fps-muted uppercase tracking-wide">Visits</th>
                    <th className="text-right pb-2 text-[11px] font-bold text-fps-muted uppercase tracking-wide">Villages</th>
                  </tr>
                </thead>
                <tbody>
                  {blocks.map((b, i) => (
                    <tr key={`${b.block}-${b.district}`} className="border-b border-fps-divider last:border-0">
                      <td className="py-2.5 text-[11px] font-bold text-fps-muted">{i + 1}</td>
                      <td className="py-2.5 text-[13px] font-semibold text-fps-ink">{b.block}</td>
                      <td className="py-2.5 text-[12px] text-fps-secondary">{b.district}</td>
                      <td className="py-2.5 text-right text-[13px] font-bold text-fps-primary">{b.entries}</td>
                      <td className="py-2.5 text-right text-[12px] text-fps-secondary">{b.villages}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Village rankings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[15px]">Village Coverage</CardTitle>
          <p className="text-xs text-fps-muted">Top 20 most visited villages</p>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton h={200} /> : villages.length === 0 ? <Empty label="No village data" /> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
              {villages.map((v, i) => (
                <div key={`${v.village}-${v.district}`} className="flex items-center justify-between rounded-lg border border-fps-border bg-fps-canvas/50 px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-bold text-fps-muted shrink-0 w-5">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-fps-ink truncate">{v.village}</p>
                      <p className="text-[10px] text-fps-muted truncate">{v.block}, {v.district}</p>
                    </div>
                  </div>
                  <span className="text-[13px] font-bold text-fps-primary shrink-0 ml-2">{v.entries}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

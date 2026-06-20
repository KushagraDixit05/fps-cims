"use client";

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useCropIntelligence } from "@/hooks/useAnalytics";

const CONDITION_COLORS = { good: "#22C55E", average: "#F59E0B", poor: "#EF4444" };
const PROBLEM_COLOR = "#1A4A2E";

interface Props { days: number }

function LoadingSkeleton({ height = 200 }: { height?: number }) {
  return <div className={`animate-pulse bg-fps-canvas rounded-xl`} style={{ height }} />;
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center text-fps-muted text-sm" style={{ height: 160 }}>
      {label}
    </div>
  );
}

export function CropIntelligenceSection({ days }: Props) {
  const { data, isLoading } = useCropIntelligence(days);

  const conditionData = data
    ? Object.entries(data.condition_distribution)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
    : [];

  const problemData = data
    ? Object.entries(data.problem_distribution)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value,
        }))
        .sort((a, b) => b.value - a.value)
    : [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Condition distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">Crop Condition Distribution</CardTitle>
            <p className="text-xs text-fps-muted">Good / Average / Poor across all monitored crops</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingSkeleton height={200} />
            ) : conditionData.length === 0 ? (
              <EmptyState label="No crop condition data" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={conditionData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {conditionData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={CONDITION_COLORS[entry.name.toLowerCase() as keyof typeof CONDITION_COLORS] ?? "#aaa"}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #E0DDD5", fontSize: "12px" }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Problem distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">Most Reported Problems</CardTitle>
            <p className="text-xs text-fps-muted">Issues flagged across crop visits</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingSkeleton height={200} />
            ) : problemData.length === 0 ? (
              <EmptyState label="No problems reported" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={problemData} layout="vertical" barSize={14} margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE6" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#8A8A7A" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#8A8A7A" }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #E0DDD5", fontSize: "12px" }} />
                  <Bar dataKey="value" fill={PROBLEM_COLOR} radius={[0, 4, 4, 0]} name="Reports" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top crops ranked list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[15px]">Top Monitored Crops</CardTitle>
          <p className="text-xs text-fps-muted">Crops by number of field visits</p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSkeleton height={120} />
          ) : !data || data.top_crops.length === 0 ? (
            <EmptyState label="No crop data" />
          ) : (
            <div className="space-y-2">
              {data.top_crops.slice(0, 10).map((item, i) => {
                const max = data.top_crops[0]?.count ?? 1;
                const pct = Math.round((item.count / max) * 100);
                return (
                  <div key={item.crop} className="flex items-center gap-3">
                    <span className="text-[11px] font-bold text-fps-muted w-5 shrink-0">{i + 1}</span>
                    <span className="text-[13px] text-fps-ink font-medium w-28 shrink-0 truncate">{item.crop}</span>
                    <div className="flex-1 bg-fps-canvas rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-fps-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[12px] font-semibold text-fps-ink w-10 text-right shrink-0">{item.count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Geography */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">District Coverage</CardTitle>
            <p className="text-xs text-fps-muted">Entries and villages per district</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingSkeleton height={160} />
            ) : !data || data.district_coverage.length === 0 ? (
              <EmptyState label="No district data" />
            ) : (
              <div className="space-y-0">
                {data.district_coverage.slice(0, 8).map((row, i) => (
                  <div key={row.district} className={`flex items-center justify-between py-2.5 ${i < data.district_coverage.length - 1 ? "border-b border-fps-divider" : ""}`}>
                    <div>
                      <p className="text-[13px] font-semibold text-fps-ink">{row.district}</p>
                      <p className="text-xs text-fps-muted">{row.villages} villages</p>
                    </div>
                    <span className="text-[13px] font-bold text-fps-primary">{row.entries} visits</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">Block Coverage</CardTitle>
            <p className="text-xs text-fps-muted">Most active blocks</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingSkeleton height={160} />
            ) : !data || data.block_coverage.length === 0 ? (
              <EmptyState label="No block data" />
            ) : (
              <div className="space-y-0">
                {data.block_coverage.slice(0, 8).map((row, i) => (
                  <div key={`${row.block}-${row.district}`} className={`flex items-center justify-between py-2.5 ${i < data.block_coverage.length - 1 ? "border-b border-fps-divider" : ""}`}>
                    <div>
                      <p className="text-[13px] font-semibold text-fps-ink">{row.block}</p>
                      <p className="text-xs text-fps-muted">{row.district} · {row.villages} villages</p>
                    </div>
                    <span className="text-[13px] font-bold text-fps-primary">{row.entries} visits</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { KPICard } from "@/components/common/KPICard";
import { useMarketIntelligence } from "@/hooks/useAnalytics";

interface Props { days: number }

const SOURCE_COLORS = ["#1A4A2E", "#C8900A", "#185FA5", "#0E7490", "#4F46E5", "#6A7A6A"];
const SOURCE_LABELS: Record<string, string> = {
  trader: "Trader", farmer: "Farmer", fps_staff: "FPS Staff",
  mandi: "Mandi", official: "Official", other: "Other",
};

function Skeleton({ h = 220 }: { h?: number }) {
  return <div className="animate-pulse bg-fps-canvas rounded-xl" style={{ height: h }} />;
}

function Empty({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center text-fps-muted text-sm" style={{ height: 120 }}>
      {label}
    </div>
  );
}

function TrendIcon({ trend }: { trend: "up" | "down" | "steady" }) {
  if (trend === "up") return <TrendingUp className="h-3.5 w-3.5 text-green-600" />;
  if (trend === "down") return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
  return <Minus className="h-3.5 w-3.5 text-fps-muted" />;
}

export function MarketIntelligenceTab({ days }: Props) {
  const { data, isLoading } = useMarketIntelligence(days);

  const sourceData = data
    ? Object.entries(data.source_distribution)
        .filter(([, v]) => v > 0)
        .map(([key, value]) => ({ name: SOURCE_LABELS[key] ?? key, value }))
    : [];

  const commodityData = data?.commodity_arrivals.map((c) => ({
    name: c.commodity,
    Quantity: c.quantity,
    Entries: c.entries,
  })) ?? [];

  const districtData = data?.district_activity.slice(0, 10).map((d) => ({
    name: d.district,
    Entries: d.entries,
  })) ?? [];

  return (
    <div className="space-y-5">
      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard label="Total Market Entries" value={isLoading ? "—" : data?.total_entries ?? 0} icon={TrendingUp} iconColor="#C8900A" iconBg="#FEF3DA" index={0} />
        <KPICard label="Commodities Tracked" value={isLoading ? "—" : data?.commodity_arrivals.length ?? 0} icon={TrendingUp} iconColor="#185FA5" iconBg="#E6F1FB" index={1} />
        <KPICard label="Mandis Active" value={isLoading ? "—" : data?.top_mandis.length ?? 0} icon={TrendingUp} iconColor="#1A4A2E" iconBg="#E1F2E8" index={2} />
      </div>

      {/* Commodity arrivals + source */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-[15px]">Commodity Arrivals</CardTitle>
            <p className="text-xs text-fps-muted">Total quantity (Quintals) by commodity</p>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton h={250} /> : commodityData.length === 0 ? <Empty label="No commodity data" /> : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={commodityData} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE6" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#8A8A7A" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#8A8A7A" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #E0DDD5", fontSize: "12px" }} />
                  <Bar dataKey="Quantity" fill="#C8900A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">Source Contribution</CardTitle>
            <p className="text-xs text-fps-muted">Who reports market data</p>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton h={250} /> : sourceData.length === 0 ? <Empty label="No source data" /> : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={sourceData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {sourceData.map((_, i) => (
                      <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #E0DDD5", fontSize: "12px" }} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trend cards */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[15px]">Market Trend Analysis</CardTitle>
          <p className="text-xs text-fps-muted">Price direction — comparing recent vs earlier in the period</p>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton h={100} /> : !data || data.commodity_trends.length === 0 ? <Empty label="No trend data" /> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {data.commodity_trends.map((t) => (
                <div key={t.commodity} className="rounded-xl border border-fps-border bg-fps-canvas/50 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendIcon trend={t.trend} />
                    <p className="text-[13px] font-semibold text-fps-ink">{t.commodity}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-[12px] font-bold ${t.trend === "up" ? "text-green-600" : t.trend === "down" ? "text-red-500" : "text-fps-muted"}`}>
                      {t.trend.toUpperCase()}
                    </p>
                    {t.current_avg_rate && (
                      <p className="text-[11px] text-fps-muted">₹{t.current_avg_rate}/Qt</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mandis + District activity */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">Top Mandis</CardTitle>
            <p className="text-xs text-fps-muted">Most active markets</p>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton h={220} /> : !data || data.top_mandis.length === 0 ? <Empty label="No mandi data" /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-fps-divider">
                      <th className="text-left pb-2 text-[11px] font-bold text-fps-muted uppercase tracking-wide">Mandi</th>
                      <th className="text-right pb-2 text-[11px] font-bold text-fps-muted uppercase tracking-wide">Entries</th>
                      <th className="text-right pb-2 text-[11px] font-bold text-fps-muted uppercase tracking-wide">Crops</th>
                      <th className="text-right pb-2 text-[11px] font-bold text-fps-muted uppercase tracking-wide">Total Qt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.top_mandis.map((m) => (
                      <tr key={m.mandi} className="border-b border-fps-divider last:border-0">
                        <td className="py-2.5">
                          <p className="text-[13px] font-semibold text-fps-ink">{m.mandi}</p>
                          <p className="text-[11px] text-fps-muted">{m.district}</p>
                        </td>
                        <td className="py-2.5 text-right text-[13px] font-bold text-amber-700">{m.entries}</td>
                        <td className="py-2.5 text-right text-[13px] text-fps-secondary">{m.commodities}</td>
                        <td className="py-2.5 text-right text-[12px] text-fps-secondary">{m.total_qty.toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">District-wise Activity</CardTitle>
            <p className="text-xs text-fps-muted">Market entries per district</p>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton h={220} /> : districtData.length === 0 ? <Empty label="No district data" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={districtData} layout="vertical" barSize={14} margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE6" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#8A8A7A" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#8A8A7A" }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #E0DDD5", fontSize: "12px" }} />
                  <Bar dataKey="Entries" fill="#C8900A" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useMarketIntelligence } from "@/hooks/useAnalytics";

const SOURCE_COLORS = ["#1A4A2E", "#C8900A", "#185FA5", "#0E7490", "#4F46E5", "#6A7A6A"];
const SOURCE_LABELS: Record<string, string> = {
  trader: "Trader", farmer: "Farmer", fps_staff: "FPS Staff",
  mandi: "Mandi", official: "Official", other: "Other",
};

interface Props { days: number }

function LoadingSkeleton({ height = 200 }: { height?: number }) {
  return <div className="animate-pulse bg-fps-canvas rounded-xl" style={{ height }} />;
}

function EmptyState({ label }: { label: string }) {
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

export function MarketIntelligenceSection({ days }: Props) {
  const { data, isLoading } = useMarketIntelligence(days);

  const sourceData = data
    ? Object.entries(data.source_distribution)
        .filter(([, v]) => v > 0)
        .map(([key, value]) => ({ name: SOURCE_LABELS[key] ?? key, value }))
    : [];

  const commodityData = data?.commodity_arrivals.slice(0, 8).map((c) => ({
    name: c.commodity,
    Quantity: c.quantity,
  })) ?? [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Source distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">Source Breakdown</CardTitle>
            <p className="text-xs text-fps-muted">Who is reporting market data</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingSkeleton height={200} />
            ) : sourceData.length === 0 ? (
              <EmptyState label="No source data" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={sourceData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
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

        {/* Commodity arrivals */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-[15px]">Commodity Arrivals</CardTitle>
            <p className="text-xs text-fps-muted">Total quantity (Quintals) by commodity</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingSkeleton height={200} />
            ) : commodityData.length === 0 ? (
              <EmptyState label="No arrival data" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={commodityData} barSize={18}>
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
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Mandi leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">Top Mandis</CardTitle>
            <p className="text-xs text-fps-muted">Most active markets by entries</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingSkeleton height={180} />
            ) : !data || data.top_mandis.length === 0 ? (
              <EmptyState label="No mandi data" />
            ) : (
              <div className="space-y-0">
                {data.top_mandis.slice(0, 7).map((m, i) => (
                  <div key={`${m.mandi}-${i}`} className={`flex items-center justify-between py-2.5 ${i < Math.min(data.top_mandis.length, 7) - 1 ? "border-b border-fps-divider" : ""}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-[11px] font-bold text-fps-muted w-5 shrink-0">{i + 1}</span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-fps-ink truncate">{m.mandi}</p>
                        <p className="text-xs text-fps-muted">{m.district} · {m.commodities} crops</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-[13px] font-bold text-amber-700">{m.entries} entries</p>
                      <p className="text-[10px] text-fps-muted">{m.total_qty.toFixed(0)} Qt</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Commodity trends */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">Market Trends</CardTitle>
            <p className="text-xs text-fps-muted">Price direction vs previous period</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingSkeleton height={180} />
            ) : !data || data.commodity_trends.length === 0 ? (
              <EmptyState label="No trend data" />
            ) : (
              <div className="space-y-0">
                {data.commodity_trends.slice(0, 7).map((t, i) => (
                  <div key={`${t.commodity}-${i}`} className={`flex items-center justify-between py-2.5 ${i < Math.min(data.commodity_trends.length, 7) - 1 ? "border-b border-fps-divider" : ""}`}>
                    <div className="flex items-center gap-2">
                      <TrendIcon trend={t.trend} />
                      <p className="text-[13px] font-semibold text-fps-ink">{t.commodity}</p>
                    </div>
                    <div className="text-right">
                      {t.current_avg_rate ? (
                        <p className="text-[13px] font-bold text-fps-ink">₹{t.current_avg_rate}/Qt</p>
                      ) : (
                        <p className="text-xs text-fps-muted">—</p>
                      )}
                      <p className={`text-[10px] font-semibold ${t.trend === "up" ? "text-green-600" : t.trend === "down" ? "text-red-500" : "text-fps-muted"}`}>
                        {t.trend.toUpperCase()}
                      </p>
                    </div>
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

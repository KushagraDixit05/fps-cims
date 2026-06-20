"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { FlaskConical, CheckCircle2, Clock, PlayCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { KPICard } from "@/components/common/KPICard";
import { useProductPerformance } from "@/hooks/useAnalytics";

interface Props { days: number }

const RESULT_COLORS: Record<string, string> = {
  excellent: "#22C55E", good: "#86EFAC", average: "#F59E0B", poor: "#EF4444", no_effect: "#6A7A6A",
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

function FunnelStep({
  icon, label, count, pct, color,
}: {
  icon: React.ReactNode; label: string; count: number; pct: number; color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="shrink-0">{icon}</div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[13px] font-semibold text-fps-ink">{label}</span>
          <span className="text-[13px] font-bold text-fps-ink">{count}</span>
        </div>
        <div className="h-2.5 bg-fps-canvas rounded-full">
          <div className={`h-2.5 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[10px] text-fps-muted mt-0.5">{pct}% of total</p>
      </div>
    </div>
  );
}

export function ProductPerformanceTab({ days }: Props) {
  const { data, isLoading } = useProductPerformance(days);

  const started = data?.funnel.started ?? 0;
  const afterPending = data?.funnel.after_pending ?? 0;
  const completed = data?.funnel.completed ?? 0;
  const pendingPct = started > 0 ? Math.round((afterPending / started) * 100) : 0;
  const completedPct = started > 0 ? Math.round((completed / started) * 100) : 0;
  const completionRate = started > 0 ? Math.round((completed / started) * 100) : 0;

  const productData = data?.product_rankings.slice(0, 10).map((p) => ({
    name: p.product.length > 18 ? p.product.slice(0, 16) + "…" : p.product,
    fullName: p.product,
    Demos: p.demos,
    Completed: p.completed,
    Rate: p.completion_rate,
  })) ?? [];

  const resultData = data
    ? Object.entries(data.result_distribution)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({ name: k.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()), value: v }))
    : [];

  const execData = data?.executive_demos.map((e) => ({
    name: e.name.split(" ")[0],
    fullName: e.name,
    Demos: e.demos,
    Completed: e.completed,
  })) ?? [];

  return (
    <div className="space-y-5">
      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <KPICard label="Total Demos" value={isLoading ? "—" : data?.total_demos ?? 0} icon={FlaskConical} iconColor="#185FA5" iconBg="#E6F1FB" index={0} />
        <KPICard label="Active (Before)" value={isLoading ? "—" : data?.active_demos ?? 0} icon={Clock} iconColor="#C8900A" iconBg="#FEF3DA" index={1} />
        <KPICard label="Completed" value={isLoading ? "—" : data?.completed_demos ?? 0} icon={CheckCircle2} iconColor="#22C55E" iconBg="#F0FDF4" index={2} />
        <KPICard label="Completion Rate" value={isLoading ? "—" : `${completionRate}%`} icon={FlaskConical} iconColor="#4F46E5" iconBg="#EEF2FF" index={3} />
      </div>

      {/* Funnel + Result distribution */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">Completion Funnel</CardTitle>
            <p className="text-xs text-fps-muted">From demo start to completion</p>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton h={220} /> : !data || data.total_demos === 0 ? <Empty label="No demo data" /> : (
              <div className="space-y-5 py-2">
                <FunnelStep icon={<PlayCircle className="h-5 w-5 text-fps-primary" />} label="Demos Started" count={started} pct={100} color="bg-fps-primary" />
                <FunnelStep icon={<Clock className="h-5 w-5 text-amber-600" />} label="After Photos Pending" count={afterPending} pct={pendingPct} color="bg-amber-400" />
                <FunnelStep icon={<CheckCircle2 className="h-5 w-5 text-green-600" />} label="Demos Completed" count={completed} pct={completedPct} color="bg-green-500" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">Result Distribution</CardTitle>
            <p className="text-xs text-fps-muted">Demo outcomes for completed demos</p>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton h={220} /> : resultData.length === 0 ? <Empty label="No result data" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={resultData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {resultData.map((entry) => (
                      <Cell key={entry.name} fill={RESULT_COLORS[entry.name.toLowerCase().replace(" ", "_")] ?? "#aaa"} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #E0DDD5", fontSize: "12px" }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Product rankings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[15px]">Product Performance Rankings</CardTitle>
          <p className="text-xs text-fps-muted">Demos and completions per product</p>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton h={220} /> : productData.length === 0 ? <Empty label="No product data" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-fps-divider">
                    <th className="text-left pb-2 text-[11px] font-bold text-fps-muted uppercase tracking-wide">Product</th>
                    <th className="text-right pb-2 text-[11px] font-bold text-fps-muted uppercase tracking-wide">Demos</th>
                    <th className="text-right pb-2 text-[11px] font-bold text-fps-muted uppercase tracking-wide">Completed</th>
                    <th className="text-right pb-2 text-[11px] font-bold text-fps-muted uppercase tracking-wide">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data!.product_rankings.map((row) => (
                    <tr key={row.product} className="border-b border-fps-divider last:border-0">
                      <td className="py-2.5 text-[13px] font-semibold text-fps-ink">{row.product}</td>
                      <td className="py-2.5 text-right text-[13px] font-bold text-fps-primary">{row.demos}</td>
                      <td className="py-2.5 text-right text-[13px] text-green-600 font-semibold">{row.completed}</td>
                      <td className="py-2.5 text-right">
                        <span className={`text-[12px] font-bold ${row.completion_rate >= 70 ? "text-green-600" : row.completion_rate >= 40 ? "text-amber-600" : "text-red-500"}`}>
                          {row.completion_rate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Crop-product combos + Executive demos */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">Crop — Product Analysis</CardTitle>
            <p className="text-xs text-fps-muted">Top product-crop combinations</p>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton h={200} /> : !data || data.crop_product_combinations.length === 0 ? <Empty label="No combo data" /> : (
              <div className="space-y-0">
                {data.crop_product_combinations.slice(0, 8).map((combo, i) => (
                  <div key={`${combo.crop}-${combo.product}`} className={`flex items-center justify-between py-2.5 ${i < Math.min(data.crop_product_combinations.length, 8) - 1 ? "border-b border-fps-divider" : ""}`}>
                    <div>
                      <p className="text-[13px] font-semibold text-fps-ink">{combo.crop}</p>
                      <p className="text-xs text-fps-muted">{combo.product}</p>
                    </div>
                    <span className="text-[13px] font-bold text-fps-primary">{combo.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">Executive-wise Demo Activity</CardTitle>
            <p className="text-xs text-fps-muted">Top 10 executives by demos</p>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton h={200} /> : execData.length === 0 ? <Empty label="No executive data" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={execData} barGap={2} barSize={10}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE6" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#8A8A7A" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#8A8A7A" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: "10px", border: "1px solid #E0DDD5", fontSize: "12px" }}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ""}
                  />
                  <Bar dataKey="Demos" fill="#185FA5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Completed" fill="#22C55E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { CheckCircle2, Clock, PlayCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useProductPerformance } from "@/hooks/useAnalytics";

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

export function ProductPerformanceSection({ days }: Props) {
  const { data, isLoading } = useProductPerformance(days);

  const productData = data?.product_rankings.slice(0, 8).map((p) => ({
    name: p.product.length > 16 ? p.product.slice(0, 14) + "…" : p.product,
    fullName: p.product,
    Demos: p.demos,
    Completed: p.completed,
  })) ?? [];

  const started = data?.funnel.started ?? 0;
  const afterPending = data?.funnel.after_pending ?? 0;
  const completed = data?.funnel.completed ?? 0;
  const pendingPct = started > 0 ? Math.round((afterPending / started) * 100) : 0;
  const completedPct = started > 0 ? Math.round((completed / started) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">Demo Completion Funnel</CardTitle>
            <p className="text-xs text-fps-muted">From initiation to completion</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingSkeleton height={200} />
            ) : !data || data.total_demos === 0 ? (
              <EmptyState label="No demo data" />
            ) : (
              <div className="space-y-3 py-2">
                <FunnelStep
                  icon={<PlayCircle className="h-4 w-4 text-fps-primary" />}
                  label="Demos Started"
                  count={started}
                  pct={100}
                  color="bg-fps-primary"
                />
                <div className="ml-5 flex items-center gap-2 text-xs text-fps-muted">
                  <div className="w-px h-4 bg-fps-border ml-1.5" />
                  <span>{afterPending} still awaiting after-update ({pendingPct}% of total)</span>
                </div>
                <FunnelStep
                  icon={<Clock className="h-4 w-4 text-amber-600" />}
                  label="After Photos Pending"
                  count={afterPending}
                  pct={pendingPct}
                  color="bg-amber-400"
                />
                <div className="ml-5 flex items-center gap-2 text-xs text-fps-muted">
                  <div className="w-px h-4 bg-fps-border ml-1.5" />
                  <span>{completed} completed ({completedPct}% completion rate)</span>
                </div>
                <FunnelStep
                  icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}
                  label="Demos Completed"
                  count={completed}
                  pct={completedPct}
                  color="bg-green-500"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">Top Products by Demos</CardTitle>
            <p className="text-xs text-fps-muted">Number of demos and completions per product</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingSkeleton height={200} />
            ) : productData.length === 0 ? (
              <EmptyState label="No product demo data" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={productData} barGap={3} barSize={10}>
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

      {/* Crop-product combos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[15px]">Crop — Product Combinations</CardTitle>
          <p className="text-xs text-fps-muted">Most common product applications by crop</p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSkeleton height={100} />
          ) : !data || data.crop_product_combinations.length === 0 ? (
            <EmptyState label="No crop-product data" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
              {data.crop_product_combinations.slice(0, 9).map((combo) => (
                <div key={`${combo.crop}-${combo.product}`} className="flex items-center justify-between rounded-lg border border-fps-border bg-fps-canvas/50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-fps-ink truncate">{combo.crop}</p>
                    <p className="text-[11px] text-fps-muted truncate">{combo.product}</p>
                  </div>
                  <span className="text-[13px] font-bold text-fps-primary shrink-0 ml-2">{combo.count}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FunnelStep({
  icon, label, count, pct, color,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  pct: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="shrink-0">{icon}</div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[13px] font-semibold text-fps-ink">{label}</span>
          <span className="text-[13px] font-bold text-fps-ink">{count}</span>
        </div>
        <div className="h-2 bg-fps-canvas rounded-full">
          <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

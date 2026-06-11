"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SkeletonCard } from "@/components/common/SkeletonTable";
import { useApprovalSLA } from "@/hooks/useAnalytics";

export function ApprovalSLAChart({ days = 30 }: { days?: number }) {
  const { data, isLoading } = useApprovalSLA(days);

  if (isLoading) return <SkeletonCard />;

  const chartData = data
    ? Object.entries(data).map(([module, m]) => ({
        module: module.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        "Avg (h)": Math.round(m.avg_hours * 10) / 10,
        "Min (h)": Math.round(m.min_hours * 10) / 10,
        "Max (h)": Math.round(m.max_hours * 10) / 10,
        Count: m.count,
      }))
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Approval SLA — Turnaround Time</CardTitle>
        <p className="text-xs text-fps-muted">Last {days} days — hours to resolution by module</p>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-56 flex items-center justify-center text-fps-muted text-sm">
            No SLA data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} barGap={2} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE6" vertical={false} />
              <XAxis
                dataKey="module"
                tick={{ fontSize: 11, fill: "#8A8A7A" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#8A8A7A" }}
                axisLine={false}
                tickLine={false}
                label={{ value: "hours", angle: -90, position: "insideLeft", fontSize: 10, fill: "#8A8A7A" }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid #E0DDD5",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  fontSize: "12px",
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }}
                iconType="circle"
                iconSize={8}
              />
              <Bar dataKey="Min (h)" fill="#E1F2E8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Avg (h)" fill="#1A4A2E" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Max (h)" fill="#D63333" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

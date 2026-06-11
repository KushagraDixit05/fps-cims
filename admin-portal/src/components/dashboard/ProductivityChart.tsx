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
import { useProductivity } from "@/hooks/useAnalytics";

export function ProductivityChart({ days = 30 }: { days?: number }) {
  const { data, isLoading } = useProductivity(days);

  if (isLoading) return <SkeletonCard />;

  const chartData =
    data?.map((d) => ({
      name: d.full_name.split(" ")[0] || d.username,
      Visits: d.farmer_visits,
      Mandi: d.mandi_arrivals,
      Demos: d.product_demos,
    })) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Field Executive Productivity</CardTitle>
        <p className="text-xs text-fps-muted">Last {days} days — visits, mandi arrivals, demos</p>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-56 flex items-center justify-center text-fps-muted text-sm">
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} barGap={2} barSize={10}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE6" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#8A8A7A" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#8A8A7A" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
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
              <Bar dataKey="Visits" fill="#1A4A2E" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Mandi" fill="#C8900A" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Demos" fill="#185FA5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

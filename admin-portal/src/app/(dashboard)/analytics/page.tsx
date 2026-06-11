"use client";

import { useState } from "react";
import { motion } from "framer-motion";
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
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SkeletonCard } from "@/components/common/SkeletonTable";
import { useProductivity, useApprovalSLA } from "@/hooks/useAnalytics";

const DAY_OPTIONS = [7, 14, 30, 60, 90];

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const { data: productivity, isLoading: loadingProd } = useProductivity(days);
  const { data: sla, isLoading: loadingSLA } = useApprovalSLA(days);

  const prodData =
    productivity?.map((d) => ({
      name: d.full_name.split(" ")[0] || d.username,
      fullName: d.full_name,
      Visits: d.farmer_visits,
      Mandi: d.mandi_arrivals,
      Demos: d.product_demos,
      Total: d.farmer_visits + d.mandi_arrivals + d.product_demos,
    })) ?? [];

  const slaData = sla
    ? Object.entries(sla).map(([module, m]) => ({
        module: module.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        "Avg (h)": Math.round(m.avg_hours * 10) / 10,
        "Min (h)": Math.round(m.min_hours * 10) / 10,
        "Max (h)": Math.round(m.max_hours * 10) / 10,
        Count: m.count,
      }))
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6 max-w-7xl mx-auto"
    >
      <PageHeader
        title="Analytics"
        description="Field operations performance and approval SLA insights"
        actions={
          <div className="flex items-center gap-1 bg-white rounded-xl border border-fps-border p-1">
            {DAY_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                  days === d
                    ? "bg-fps-primary text-white"
                    : "text-fps-secondary hover:bg-fps-canvas"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        }
      />

      {/* Productivity */}
      <Card>
        <CardHeader>
          <CardTitle>Field Executive Productivity</CardTitle>
          <p className="text-xs text-fps-muted">Farmer visits, mandi arrivals and product demos per executive over {days} days</p>
        </CardHeader>
        <CardContent>
          {loadingProd ? (
            <div className="h-72 animate-pulse bg-fps-canvas rounded-xl" />
          ) : prodData.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-fps-muted">No productivity data</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={prodData} barGap={3} barSize={12}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE6" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#8A8A7A" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#8A8A7A" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "1px solid #E0DDD5", fontSize: "12px" }}
                  formatter={(value, name, props) => [value, name]}
                  labelFormatter={(label) => {
                    const item = prodData.find((d) => d.name === label);
                    return item?.fullName ?? label;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }} iconType="circle" iconSize={8} />
                <Bar dataKey="Visits" fill="#1A4A2E" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Mandi" fill="#C8900A" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Demos" fill="#185FA5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* SLA */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Approval SLA by Module</CardTitle>
            <p className="text-xs text-fps-muted">Min / Average / Max resolution time in hours</p>
          </CardHeader>
          <CardContent>
            {loadingSLA ? (
              <div className="h-60 animate-pulse bg-fps-canvas rounded-xl" />
            ) : slaData.length === 0 ? (
              <div className="h-60 flex items-center justify-center text-fps-muted">No SLA data</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={slaData} barGap={3} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE6" vertical={false} />
                  <XAxis dataKey="module" tick={{ fontSize: 11, fill: "#8A8A7A" }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#8A8A7A" }}
                    axisLine={false}
                    tickLine={false}
                    label={{ value: "hours", angle: -90, position: "insideLeft", fontSize: 10, fill: "#8A8A7A" }}
                  />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #E0DDD5", fontSize: "12px" }} />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }} iconType="circle" iconSize={8} />
                  <Bar dataKey="Min (h)" fill="#E1F2E8" stroke="#1A8A3A" strokeWidth={1} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Avg (h)" fill="#1A4A2E" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Max (h)" fill="#D63333" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* SLA summary table */}
        <Card>
          <CardHeader>
            <CardTitle>SLA Summary</CardTitle>
            <p className="text-xs text-fps-muted">Counts and average turnaround by module</p>
          </CardHeader>
          <CardContent>
            {slaData.length === 0 ? (
              <p className="text-sm text-fps-muted py-4 text-center">No data</p>
            ) : (
              <div className="space-y-0">
                {slaData.map((row, i) => (
                  <div
                    key={row.module}
                    className={`flex items-center justify-between py-3 ${i < slaData.length - 1 ? "border-b border-fps-divider" : ""}`}
                  >
                    <div>
                      <p className="text-[13px] font-semibold text-fps-ink">{row.module}</p>
                      <p className="text-xs text-fps-muted">{row.Count} approvals</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[15px] font-bold text-fps-primary">{row["Avg (h)"]}h</p>
                      <p className="text-[10px] text-fps-muted">avg resolution</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}

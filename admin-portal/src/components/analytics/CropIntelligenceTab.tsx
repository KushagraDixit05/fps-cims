"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Sprout, Users, MapPin } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { KPICard } from "@/components/common/KPICard";
import { useCropIntelligence, useProductivity } from "@/hooks/useAnalytics";

interface Props { days: number }

const CONDITION_COLORS = { good: "#22C55E", average: "#F59E0B", poor: "#EF4444" };

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

export function CropIntelligenceTab({ days }: Props) {
  const { data, isLoading } = useCropIntelligence(days);
  const { data: productivity, isLoading: loadingProd } = useProductivity(days);

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

  const cropChartData = data?.top_crops.slice(0, 15).map((c) => ({ name: c.crop, Count: c.count })) ?? [];
  const varietyChartData = data?.top_varieties.slice(0, 10).map((v) => ({ name: v.variety, Count: v.count })) ?? [];

  const execData = productivity
    ?.slice(0, 10)
    .map((e) => ({
      name: e.full_name.split(" ")[0] || e.username,
      fullName: e.full_name,
      Visits: e.farmer_visits,
    })) ?? [];

  return (
    <div className="space-y-5">
      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard
          label="Total Entries"
          value={isLoading ? "—" : data?.total_entries ?? 0}
          icon={Sprout}
          iconColor="#1A4A2E"
          iconBg="#E1F2E8"
          index={0}
        />
        <KPICard
          label="Farmers Covered"
          value={isLoading ? "—" : data?.total_farmers ?? 0}
          icon={Users}
          iconColor="#0E7490"
          iconBg="#E0F2FE"
          index={1}
        />
        <KPICard
          label="Villages Covered"
          value={isLoading ? "—" : data?.total_villages ?? 0}
          icon={MapPin}
          iconColor="#4F46E5"
          iconBg="#EEF2FF"
          index={2}
        />
      </div>

      {/* Crop + Variety distribution */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">Crop Distribution</CardTitle>
            <p className="text-xs text-fps-muted">Top 15 crops by visit count</p>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton h={280} /> : cropChartData.length === 0 ? <Empty label="No crop data" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={cropChartData} layout="vertical" barSize={14} margin={{ left: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE6" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#8A8A7A" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#8A8A7A" }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #E0DDD5", fontSize: "12px" }} />
                  <Bar dataKey="Count" fill="#1A4A2E" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">Variety Distribution</CardTitle>
            <p className="text-xs text-fps-muted">Top 10 crop varieties</p>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton h={280} /> : varietyChartData.length === 0 ? <Empty label="No variety data" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={varietyChartData} layout="vertical" barSize={14} margin={{ left: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE6" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#8A8A7A" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#8A8A7A" }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #E0DDD5", fontSize: "12px" }} />
                  <Bar dataKey="Count" fill="#22C55E" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Condition + Problems */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">Crop Condition</CardTitle>
            <p className="text-xs text-fps-muted">Good / Average / Poor distribution</p>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton h={220} /> : conditionData.length === 0 ? <Empty label="No condition data" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={conditionData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                    {conditionData.map((entry) => (
                      <Cell key={entry.name} fill={CONDITION_COLORS[entry.name.toLowerCase() as keyof typeof CONDITION_COLORS] ?? "#aaa"} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #E0DDD5", fontSize: "12px" }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">Problem Trends</CardTitle>
            <p className="text-xs text-fps-muted">Issues reported in crop visits</p>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton h={220} /> : problemData.length === 0 ? <Empty label="No problem data" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={problemData} layout="vertical" barSize={14} margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE6" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#8A8A7A" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#8A8A7A" }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #E0DDD5", fontSize: "12px" }} />
                  <Bar dataKey="value" fill="#EF4444" radius={[0, 4, 4, 0]} name="Reports" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* District + Block breakdown */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">District Breakdown</CardTitle>
            <p className="text-xs text-fps-muted">Entries and villages per district</p>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton h={200} /> : !data || data.district_coverage.length === 0 ? <Empty label="No district data" /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-fps-divider">
                      <th className="text-left pb-2 text-[11px] font-bold text-fps-muted uppercase tracking-wide">District</th>
                      <th className="text-right pb-2 text-[11px] font-bold text-fps-muted uppercase tracking-wide">Entries</th>
                      <th className="text-right pb-2 text-[11px] font-bold text-fps-muted uppercase tracking-wide">Villages</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.district_coverage.map((row) => (
                      <tr key={row.district} className="border-b border-fps-divider last:border-0">
                        <td className="py-2.5 text-[13px] font-semibold text-fps-ink">{row.district}</td>
                        <td className="py-2.5 text-right text-[13px] font-bold text-fps-primary">{row.entries}</td>
                        <td className="py-2.5 text-right text-[13px] text-fps-secondary">{row.villages}</td>
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
            <CardTitle className="text-[15px]">Block Breakdown</CardTitle>
            <p className="text-xs text-fps-muted">Most active blocks</p>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton h={200} /> : !data || data.block_coverage.length === 0 ? <Empty label="No block data" /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-fps-divider">
                      <th className="text-left pb-2 text-[11px] font-bold text-fps-muted uppercase tracking-wide">Block</th>
                      <th className="text-left pb-2 text-[11px] font-bold text-fps-muted uppercase tracking-wide">District</th>
                      <th className="text-right pb-2 text-[11px] font-bold text-fps-muted uppercase tracking-wide">Entries</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.block_coverage.map((row) => (
                      <tr key={`${row.block}-${row.district}`} className="border-b border-fps-divider last:border-0">
                        <td className="py-2.5 text-[13px] font-semibold text-fps-ink">{row.block}</td>
                        <td className="py-2.5 text-[12px] text-fps-secondary">{row.district}</td>
                        <td className="py-2.5 text-right text-[13px] font-bold text-fps-primary">{row.entries}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Executive-wise performance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[15px]">Executive-wise Crop Visits</CardTitle>
          <p className="text-xs text-fps-muted">Top 10 executives by crop intelligence entries</p>
        </CardHeader>
        <CardContent>
          {loadingProd ? <Skeleton h={200} /> : execData.length === 0 ? <Empty label="No executive data" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={execData} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE6" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#8A8A7A" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#8A8A7A" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: "10px", border: "1px solid #E0DDD5", fontSize: "12px" }}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ""}
                />
                <Bar dataKey="Visits" fill="#1A4A2E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

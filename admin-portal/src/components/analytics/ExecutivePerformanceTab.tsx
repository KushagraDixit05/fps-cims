"use client";

import { useState } from "react";
import { Search, ArrowUpDown } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useExecutivePerformance } from "@/hooks/useAnalytics";
import { formatRelative } from "@/lib/utils";
import type { ExecutivePerformanceMetric } from "@/types/models";

interface Props { days: number }

type SortKey = keyof Pick<ExecutivePerformanceMetric, "farmer_visits" | "mandi_arrivals" | "product_demos" | "farmers_covered" | "villages_covered" | "total_activities">;

function Skeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="animate-pulse h-12 bg-fps-canvas rounded-lg" />
      ))}
    </div>
  );
}

export function ExecutivePerformanceTab({ days }: Props) {
  const { data: executives, isLoading } = useExecutivePerformance(days);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("total_activities");
  const [sortAsc, setSortAsc] = useState(false);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((p) => !p);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const filtered = (executives ?? [])
    .filter((e) => {
      const q = search.toLowerCase();
      return !q || e.full_name.toLowerCase().includes(q) || e.username.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const diff = (a[sortKey] as number) - (b[sortKey] as number);
      return sortAsc ? diff : -diff;
    });

  function SortBtn({ k, label }: { k: SortKey; label: string }) {
    return (
      <button
        onClick={() => toggleSort(k)}
        className="flex items-center gap-0.5 text-[11px] font-bold text-fps-muted uppercase tracking-wide hover:text-fps-ink transition-colors cursor-pointer"
      >
        {label}
        <ArrowUpDown className={`h-3 w-3 ${sortKey === k ? "text-fps-primary" : ""}`} />
      </button>
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-[15px]">Executive Performance</CardTitle>
              <p className="text-xs text-fps-muted">Field activity across all modules — last {days} days</p>
            </div>
            <div className="relative w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fps-muted" />
              <Input
                placeholder="Search executive…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton />
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center text-fps-muted text-sm py-10">
              {search ? "No executives match your search" : "No activity in this period"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-fps-divider">
                    <th className="text-left pb-3 text-[11px] font-bold text-fps-muted uppercase tracking-wide">Executive</th>
                    <th className="text-right pb-3"><SortBtn k="farmer_visits" label="Visits" /></th>
                    <th className="text-right pb-3"><SortBtn k="mandi_arrivals" label="Mandi" /></th>
                    <th className="text-right pb-3"><SortBtn k="product_demos" label="Demos" /></th>
                    <th className="text-right pb-3"><SortBtn k="farmers_covered" label="Farmers" /></th>
                    <th className="text-right pb-3"><SortBtn k="villages_covered" label="Villages" /></th>
                    <th className="text-right pb-3"><SortBtn k="total_activities" label="Total" /></th>
                    <th className="text-right pb-3 text-[11px] font-bold text-fps-muted uppercase tracking-wide">Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((exec, i) => (
                    <tr key={exec.user_id} className={`${i < filtered.length - 1 ? "border-b border-fps-divider" : ""}`}>
                      <td className="py-3">
                        <p className="text-[13px] font-semibold text-fps-ink">{exec.full_name}</p>
                        <p className="text-[11px] text-fps-muted">@{exec.username}</p>
                      </td>
                      <td className="py-3 text-right text-[13px] font-semibold text-fps-primary">{exec.farmer_visits}</td>
                      <td className="py-3 text-right text-[13px] font-semibold text-amber-700">{exec.mandi_arrivals}</td>
                      <td className="py-3 text-right text-[13px] font-semibold text-blue-700">{exec.product_demos}</td>
                      <td className="py-3 text-right text-[13px] text-fps-secondary">{exec.farmers_covered}</td>
                      <td className="py-3 text-right text-[13px] text-fps-secondary">{exec.villages_covered}</td>
                      <td className="py-3 text-right text-[14px] font-bold text-fps-ink">{exec.total_activities}</td>
                      <td className="py-3 text-right text-[11px] text-fps-muted">
                        {exec.last_activity ? formatRelative(exec.last_activity) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

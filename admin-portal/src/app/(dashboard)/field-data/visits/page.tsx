"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Search, ChevronDown, ChevronRight, MapPin } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { SkeletonTable } from "@/components/common/SkeletonTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useVisits,
  exportVisitsCsv,
  type VisitFilters,
  type FarmerVisitRow,
} from "@/hooks/useFieldData";

const CONDITION_VARIANT: Record<string, "good" | "warn" | "error" | "secondary"> = {
  good: "good",
  average: "warn",
  poor: "error",
};

function ConditionBadge({ condition }: { condition: string }) {
  if (!condition) return <span className="text-fps-muted text-xs">—</span>;
  return (
    <Badge variant={CONDITION_VARIANT[condition] ?? "secondary"} className="capitalize">
      {condition}
    </Badge>
  );
}

function CropsDetail({ crops }: { crops: FarmerVisitRow["crops"] }) {
  if (!crops.length) return <p className="text-fps-muted text-xs">No crop records</p>;
  return (
    <div className="divide-y divide-fps-divider rounded-xl border border-fps-border bg-white overflow-hidden">
      <div className="grid grid-cols-7 gap-2 px-4 py-2 bg-fps-canvas text-[10px] font-bold uppercase tracking-wider text-fps-muted">
        <span>Crop</span><span>Variety</span><span>Stage</span><span>Condition</span>
        <span>This Year (ac)</span><span>Last Year (ac)</span><span>Problems</span>
      </div>
      {crops.map((c, i) => (
        <div key={i} className="grid grid-cols-7 gap-2 px-4 py-2 text-xs text-fps-secondary">
          <span className="font-semibold text-fps-ink">{c.crop_name}</span>
          <span>{c.variety}</span>
          <span className="capitalize">{c.crop_stage?.replace(/_/g, " ")}</span>
          <ConditionBadge condition={c.crop_condition} />
          <span>{c.this_year_area_acre}</span>
          <span>{c.last_year_area_acre ?? "—"}</span>
          <span>{c.problems?.join(", ") || "—"}</span>
        </div>
      ))}
    </div>
  );
}

export default function FarmerVisitsPage() {
  const [filters, setFilters] = useState<VisitFilters>({ page: 1 });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useVisits(filters);
  const rows = data?.results ?? [];
  const total = data?.count ?? 0;
  const totalPages = Math.ceil(total / (filters.page_size ?? 50));

  function setFilter(patch: Partial<VisitFilters>) {
    setFilters((f) => ({ ...f, ...patch, page: 1 }));
  }

  async function handleExport() {
    setExporting(true);
    const { page: _p, page_size: _ps, ...exportFilters } = filters;
    try { await exportVisitsCsv(exportFilters); } finally { setExporting(false); }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-5 max-w-7xl mx-auto"
    >
      <PageHeader
        title="Farmer Visits"
        description={`${total.toLocaleString()} total records`}
        actions={
          <Button variant="secondary" onClick={handleExport} disabled={exporting}>
            <Download className="h-4 w-4" />
            {exporting ? "Exporting…" : "Export CSV"}
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-44">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fps-muted" />
          <Input placeholder="District…" className="pl-9"
            onChange={(e) => setFilter({ district: e.target.value || undefined })} />
        </div>
        <Input placeholder="Crop name…" className="w-36"
          onChange={(e) => setFilter({ crop: e.target.value || undefined })} />
        <Input placeholder="Executive ID…" className="w-36"
          onChange={(e) => setFilter({ executive: e.target.value || undefined })} />
        <Select onValueChange={(v) => setFilter({ condition: v === "all" ? undefined : v })}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Condition" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Conditions</SelectItem>
            <SelectItem value="good">Good</SelectItem>
            <SelectItem value="average">Average</SelectItem>
            <SelectItem value="poor">Poor</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" className="w-38"
          onChange={(e) => setFilter({ date_from: e.target.value || undefined })} />
        <Input type="date" className="w-38"
          onChange={(e) => setFilter({ date_to: e.target.value || undefined })} />
      </div>

      {isLoading ? (
        <SkeletonTable rows={8} cols={7} />
      ) : (
        <div className="rounded-xl border border-fps-border overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-fps-border bg-fps-canvas">
                  <th className="w-8 px-3 py-3" />
                  {["Date", "Executive", "Farmer", "Location", "Crops", "Condition", "Photos"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-fps-muted whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="h-32 text-center text-fps-muted text-sm">
                      No farmer visits found
                    </td>
                  </tr>
                ) : rows.map((row) => (
                  <>
                    <tr
                      key={row.id}
                      className="border-b border-fps-divider last:border-0 hover:bg-fps-canvas/70 transition-colors cursor-pointer"
                      onClick={() => setExpandedId((p) => p === row.id ? null : row.id)}
                    >
                      <td className="px-3 py-3 text-fps-muted">
                        {expandedId === row.id
                          ? <ChevronDown className="h-3.5 w-3.5" />
                          : <ChevronRight className="h-3.5 w-3.5" />}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-fps-muted whitespace-nowrap">
                        {new Date(row.submitted_at).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[13px] font-semibold text-fps-ink">{row.executive_name || "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[13px] font-semibold text-fps-ink">{row.farmer_name}</p>
                        <p className="text-[10px] text-fps-muted">{row.mobile_number}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-fps-ink">{row.village_name}</p>
                        <p className="text-[10px] text-fps-muted">{row.block_name} · {row.district_name}</p>
                        {row.latitude && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-fps-primary mt-0.5">
                            <MapPin className="h-2.5 w-2.5" />{row.latitude.toFixed(4)}, {row.longitude?.toFixed(4)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-fps-primary-light text-fps-primary text-xs font-bold">
                          {row.crop_count}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <ConditionBadge condition={row.dominant_condition} />
                      </td>
                      <td className="px-4 py-3 text-xs text-fps-muted">{row.photo_count}</td>
                    </tr>
                    {expandedId === row.id && (
                      <tr key={`${row.id}-expand`} className="bg-fps-canvas/40">
                        <td colSpan={8} className="px-6 py-4 space-y-3">
                          <CropsDetail crops={row.crops} />
                          {row.remark && (
                            <p className="text-xs text-fps-secondary"><span className="font-semibold">Remark:</span> {row.remark}</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-fps-border bg-fps-canvas text-xs text-fps-muted">
              <span>{total.toLocaleString()} records</span>
              <div className="flex gap-2">
                <button
                  disabled={(filters.page ?? 1) <= 1}
                  onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
                  className="px-3 py-1 rounded-lg border border-fps-border disabled:opacity-40 hover:bg-white transition-colors"
                >Previous</button>
                <span className="px-2 py-1">Page {filters.page ?? 1} / {totalPages}</span>
                <button
                  disabled={(filters.page ?? 1) >= totalPages}
                  onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
                  className="px-3 py-1 rounded-lg border border-fps-border disabled:opacity-40 hover:bg-white transition-colors"
                >Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

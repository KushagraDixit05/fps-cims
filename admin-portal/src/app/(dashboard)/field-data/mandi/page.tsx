"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Download, Search } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { SkeletonTable } from "@/components/common/SkeletonTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMandi, exportMandiCsv, type MandiFilters } from "@/hooks/useFieldData";

export default function MandiArrivalsPage() {
  const [filters, setFilters] = useState<MandiFilters>({ page: 1 });
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useMandi(filters);
  const rows = data?.results ?? [];
  const total = data?.count ?? 0;
  const totalPages = Math.ceil(total / (filters.page_size ?? 50));

  function setFilter(patch: Partial<MandiFilters>) {
    setFilters((f) => ({ ...f, ...patch, page: 1 }));
  }

  async function handleExport() {
    setExporting(true);
    const { page: _p, page_size: _ps, ...exportFilters } = filters;
    try { await exportMandiCsv(exportFilters); } finally { setExporting(false); }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-5 max-w-7xl mx-auto"
    >
      <PageHeader
        title="Market Intelligence"
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
        <Input placeholder="Commodity…" className="w-36"
          onChange={(e) => setFilter({ commodity: e.target.value || undefined })} />
        <Input placeholder="Executive ID…" className="w-36"
          onChange={(e) => setFilter({ executive: e.target.value || undefined })} />
        <Input type="date" className="w-38"
          onChange={(e) => setFilter({ date_from: e.target.value || undefined })} />
        <Input type="date" className="w-38"
          onChange={(e) => setFilter({ date_to: e.target.value || undefined })} />
      </div>

      {isLoading ? (
        <SkeletonTable rows={8} cols={8} />
      ) : (
        <div className="rounded-xl border border-fps-border overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-fps-border bg-fps-canvas">
                  {["Date", "Executive", "Mandi", "District / State", "Commodity", "Qty (Qt)", "Avg Rate (₹)", "Min / Max (₹)", "Source"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-fps-muted whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="h-32 text-center text-fps-muted text-sm">
                      No mandi arrivals found
                    </td>
                  </tr>
                ) : rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-fps-divider last:border-0 hover:bg-fps-canvas/70 transition-colors"
                  >
                    <td className="px-4 py-3 text-xs font-mono text-fps-muted whitespace-nowrap">
                      {new Date(row.date).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-[13px] font-semibold text-fps-ink">
                      {row.executive_name || "—"}
                    </td>
                    <td className="px-4 py-3 text-[13px] font-semibold text-fps-ink">
                      {row.mandi_name}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-fps-ink">{row.mandi_district}</p>
                      <p className="text-[10px] text-fps-muted">{row.mandi_state}</p>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-fps-ink">{row.commodity}</td>
                    <td className="px-4 py-3 text-xs font-mono text-fps-ink">
                      {Number(row.arrival_quantity).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-fps-ink">
                      {row.avg_rate ? `₹${Number(row.avg_rate).toLocaleString("en-IN")}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-fps-muted">
                      {row.min_rate ? `₹${Number(row.min_rate).toLocaleString("en-IN")}` : "—"} /&nbsp;
                      {row.max_rate ? `₹${Number(row.max_rate).toLocaleString("en-IN")}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-fps-secondary capitalize">
                        {row.source}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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

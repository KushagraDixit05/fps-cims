"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/StatusBadge";
import { SkeletonTable } from "@/components/common/SkeletonTable";
import { useApprovals } from "@/hooks/useApprovals";
import { formatRelative } from "@/lib/utils";

export function RecentApprovals() {
  const { data, isLoading } = useApprovals();

  const recent = data?.slice(0, 5) ?? [];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Recent Approvals</CardTitle>
        <Link
          href="/approvals"
          className="flex items-center gap-1 text-xs text-fps-primary font-semibold hover:underline"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <SkeletonTable rows={4} cols={4} />
        ) : recent.length === 0 ? (
          <p className="text-sm text-fps-muted text-center py-8">No pending approvals</p>
        ) : (
          <div className="space-y-0">
            {recent.map((a, i) => (
              <Link key={a.id} href={`/approvals/${a.id}`}>
                <div
                  className={`flex items-center gap-3 py-3 ${i < recent.length - 1 ? "border-b border-fps-divider" : ""} hover:bg-fps-canvas/50 rounded-xl px-2 -mx-2 transition-colors cursor-pointer`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-fps-ink truncate">
                      {(a.module ?? a.workflow_name ?? "Approval")
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                    </p>
                    <p className="text-xs text-fps-muted">
                      by {a.submitted_by_username ?? `User ${a.submitted_by}`} ·{" "}
                      {formatRelative(a.submitted_at)}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

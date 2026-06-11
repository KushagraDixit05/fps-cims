"use client";

import { Users, ClipboardCheck, BarChart3, ScrollText } from "lucide-react";
import { KPICard } from "@/components/common/KPICard";
import { SkeletonCard } from "@/components/common/SkeletonTable";
import { useUsers } from "@/hooks/useUsers";
import { useApprovals } from "@/hooks/useApprovals";

export function StatsStrip() {
  const { data: users, isLoading: loadingUsers } = useUsers();
  const { data: approvals, isLoading: loadingApprovals } = useApprovals();

  const activeUsers = users?.filter((u) => u.is_active).length ?? 0;
  const totalUsers = users?.length ?? 0;
  const pendingApprovals =
    approvals?.filter((a) =>
      ["submitted", "under_review", "resubmitted", "escalated"].includes(a.status)
    ).length ?? 0;
  const escalated = approvals?.filter((a) => a.status === "escalated").length ?? 0;

  if (loadingUsers || loadingApprovals) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        label="Total Users"
        value={totalUsers}
        subtext={`${activeUsers} active`}
        icon={Users}
        index={0}
      />
      <KPICard
        label="Pending Approvals"
        value={pendingApprovals}
        subtext={escalated > 0 ? `${escalated} escalated` : "No escalations"}
        icon={ClipboardCheck}
        iconColor="#C8900A"
        iconBg="#FEF3DA"
        index={1}
      />
      <KPICard
        label="Active Roles"
        value={6}
        subtext="RBAC role system"
        icon={BarChart3}
        iconColor="#185FA5"
        iconBg="#E6F1FB"
        index={2}
      />
      <KPICard
        label="Audit Events"
        value="—"
        subtext="Last 30 days"
        icon={ScrollText}
        iconColor="#6A7A6A"
        iconBg="#F0EDE6"
        index={3}
      />
    </div>
  );
}

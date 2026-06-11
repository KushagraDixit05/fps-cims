"use client";

import { motion } from "framer-motion";
import { PageHeader } from "@/components/common/PageHeader";
import { StatsStrip } from "@/components/dashboard/StatsStrip";
import { ProductivityChart } from "@/components/dashboard/ProductivityChart";
import { ApprovalSLAChart } from "@/components/dashboard/ApprovalSLAChart";
import { RecentApprovals } from "@/components/dashboard/RecentApprovals";

export default function DashboardPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6 max-w-7xl mx-auto"
    >
      <PageHeader
        title="Operations Dashboard"
        description="Farm Prosperity Solutions — Field Intelligence Command Center"
      />

      <StatsStrip />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ProductivityChart />
        <ApprovalSLAChart />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <RecentApprovals />

        <div className="rounded-2xl border border-fps-border bg-fps-primary/5 border-fps-primary/20 p-5 flex flex-col justify-center items-center gap-2">
          <div className="text-3xl">🌾</div>
          <p className="text-[15px] font-bold text-fps-ink">FPS Admin Portal</p>
          <p className="text-sm text-fps-secondary text-center max-w-xs">
            Full RBAC system with 6 roles, 50 permissions, approval workflows, and complete audit trail.
          </p>
          <div className="grid grid-cols-3 gap-3 mt-2 w-full">
            {[
              { label: "Roles", value: "6" },
              { label: "Permissions", value: "50" },
              { label: "Modules", value: "5" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-white border border-fps-border p-3 text-center">
                <p className="text-xl font-extrabold text-fps-primary">{s.value}</p>
                <p className="text-[10px] font-bold uppercase tracking-wide text-fps-muted">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

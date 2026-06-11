"use client";

import { use, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle, XCircle, Clock, User, MessageSquare } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useApproval, useForceApprove } from "@/hooks/useApprovals";
import { formatDateTime, formatRelative } from "@/lib/utils";
import type { ApprovalAction } from "@/types/models";

function ActionIcon({ action }: { action: string }) {
  if (action === "approved") return <CheckCircle className="h-4 w-4 text-status-good-text" />;
  if (action === "rejected") return <XCircle className="h-4 w-4 text-status-error-text" />;
  return <Clock className="h-4 w-4 text-fps-muted" />;
}

function TimelineItem({ action, isLast }: { action: ApprovalAction; isLast: boolean }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-fps-border bg-white shadow-sm">
          <ActionIcon action={action.action} />
        </div>
        {!isLast && <div className="w-px flex-1 bg-fps-divider mt-1" />}
      </div>
      <div className={`pb-4 ${isLast ? "" : ""}`}>
        <p className="text-[13px] font-semibold text-fps-ink capitalize">
          {action.action.replace(/_/g, " ")}
        </p>
        <p className="text-xs text-fps-muted">
          by @{action.actor_username ?? `User ${action.actor}`} · {formatRelative(action.created_at)}
        </p>
        {action.comment && (
          <p className="mt-1 text-sm text-fps-secondary bg-fps-canvas rounded-lg px-3 py-2 border border-fps-divider">
            {action.comment}
          </p>
        )}
      </div>
    </div>
  );
}

export default function ApprovalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: approval, isLoading } = useApproval(id);
  const forceApprove = useForceApprove();
  const [approveOpen, setApproveOpen] = useState(false);
  const [comment, setComment] = useState("");

  if (isLoading) return <div className="animate-pulse h-96 rounded-2xl bg-fps-border/40" />;
  if (!approval) return <div className="text-fps-muted">Approval not found</div>;

  const module = (approval.module ?? approval.workflow_name ?? "Approval")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-5 max-w-4xl mx-auto"
    >
      <div className="flex items-center gap-3 mb-1">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/approvals"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <span className="text-sm text-fps-muted">Approvals</span>
      </div>

      <PageHeader
        title={module}
        description={`Submitted ${formatDateTime(approval.submitted_at)}`}
        actions={
          <div className="flex items-center gap-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={approval.status}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <StatusBadge status={approval.status} />
              </motion.div>
            </AnimatePresence>
            {["submitted", "under_review", "resubmitted", "escalated"].includes(approval.status) && (
              <Button onClick={() => setApproveOpen(true)}>
                <CheckCircle className="h-4 w-4" />
                Force Approve
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Timeline */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
          <CardContent>
            {!approval.actions || approval.actions.length === 0 ? (
              <p className="text-sm text-fps-muted">No actions yet</p>
            ) : (
              <div>
                {approval.actions.map((action, i) => (
                  <TimelineItem
                    key={action.id}
                    action={action}
                    isLast={i === approval.actions!.length - 1}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Details */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader><CardTitle>Approval Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              {[
                { label: "Module", value: module },
                { label: "Status", value: <StatusBadge status={approval.status} /> },
                { label: "Submitted By", value: approval.submitted_by_username ?? `User ${approval.submitted_by}` },
                { label: "Current Approver", value: approval.current_approver_username ?? "—" },
                { label: "Submitted At", value: formatDateTime(approval.submitted_at) },
                { label: "Revisions", value: String(approval.revision_count) },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-fps-muted mb-0.5">{item.label}</p>
                  {typeof item.value === "string" ? (
                    <p className="text-sm font-medium text-fps-ink">{item.value}</p>
                  ) : (
                    item.value
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {approval.data_snapshot && Object.keys(approval.data_snapshot).length > 0 && (
            <Card>
              <CardHeader><CardTitle>Data Snapshot</CardTitle></CardHeader>
              <CardContent>
                <pre className="text-xs text-fps-secondary bg-fps-canvas rounded-xl p-4 overflow-auto max-h-64 border border-fps-divider">
                  {JSON.stringify(approval.data_snapshot, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={approveOpen} onOpenChange={(v) => !v && setApproveOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Force Approve</DialogTitle>
            <DialogDescription>Bypass the normal workflow and immediately approve this submission.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Comment</Label>
            <Textarea
              placeholder="Reason for force approval…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" onClick={() => setApproveOpen(false)}>Cancel</Button>
            <Button
              onClick={() =>
                forceApprove.mutate(
                  { id: approval.id, comment },
                  { onSuccess: () => { setApproveOpen(false); setComment(""); } }
                )
              }
              disabled={forceApprove.isPending}
            >
              Approve
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

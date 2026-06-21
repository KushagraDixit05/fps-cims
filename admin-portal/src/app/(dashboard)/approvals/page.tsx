"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MoreHorizontal, CheckCircle, UserCog, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { SkeletonTable } from "@/components/common/SkeletonTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useApprovals, useForceApprove, useReassignApproval } from "@/hooks/useApprovals";
import { useUsers } from "@/hooks/useUsers";
import { formatRelative, formatDate } from "@/lib/utils";
import type { ApprovalInstance } from "@/types/models";

export default function ApprovalsPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [forceApproveId, setForceApproveId] = useState<string | null>(null);
  const [reassignId, setReassignId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [reassignUser, setReassignUser] = useState("");

  const { data: approvals, isLoading } = useApprovals({
    status: statusFilter !== "all" ? statusFilter : undefined,
    module: moduleFilter !== "all" ? moduleFilter : undefined,
  });
  const { data: users } = useUsers();
  const forceApprove = useForceApprove();
  const reassign = useReassignApproval();

  const columns: ColumnDef<ApprovalInstance>[] = [
    {
      id: "module",
      header: "Module",
      cell: ({ row }) => {
        const a = row.original;
        return (
          <div>
            <p className="text-[13px] font-semibold text-fps-ink capitalize">
              {(a.module ?? a.workflow_name ?? "Unknown").replace(/_/g, " ")}
            </p>
            <p className="text-[10px] font-mono text-fps-muted">{a.id.slice(0, 8)}…</p>
          </div>
        );
      },
    },
    {
      id: "submitter",
      header: "Submitted By",
      cell: ({ row }) => (
        <span className="text-sm text-fps-secondary">
          {row.original.submitted_by_username ?? `User ${row.original.submitted_by}`}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => <StatusBadge status={getValue() as string} />,
    },
    {
      id: "approver",
      header: "Current Approver",
      cell: ({ row }) => (
        <span className="text-sm text-fps-secondary">
          {row.original.current_approver_username ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "submitted_at",
      header: "Submitted",
      cell: ({ getValue }) => (
        <span className="text-xs text-fps-muted">{formatRelative(getValue() as string)}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const a = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); setForceApproveId(a.id); }}
                className="text-status-good-text focus:text-status-good-text"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Force Approve
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); setReassignId(a.id); }}
              >
                <UserCog className="h-3.5 w-3.5" />
                Reassign
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-5 max-w-7xl mx-auto"
    >
      <PageHeader
        title="Approval Queue"
        description={`${approvals?.length ?? 0} approvals`}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="escalated">Escalated</SelectItem>
            <SelectItem value="resubmitted">Resubmitted</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Modules" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modules</SelectItem>
            <SelectItem value="crops">Crops</SelectItem>
            <SelectItem value="mandi">Mandi</SelectItem>
            <SelectItem value="product_demo">Product Performance Module</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <SkeletonTable rows={6} cols={6} />
      ) : (
        <DataTable
          columns={columns}
          data={approvals ?? []}
          onRowClick={(a) => router.push(`/approvals/${a.id}`)}
        />
      )}

      {/* Force approve dialog */}
      <Dialog open={!!forceApproveId} onOpenChange={(v) => !v && setForceApproveId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Force Approve</DialogTitle>
            <DialogDescription>This will immediately approve the submission, bypassing the normal workflow.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Comment (optional)</Label>
            <Textarea
              placeholder="Reason for force approval…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" onClick={() => setForceApproveId(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!forceApproveId) return;
                forceApprove.mutate(
                  { id: forceApproveId, comment },
                  { onSuccess: () => { setForceApproveId(null); setComment(""); } }
                );
              }}
              disabled={forceApprove.isPending}
            >
              Force Approve
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reassign dialog */}
      <Dialog open={!!reassignId} onOpenChange={(v) => !v && setReassignId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign Approval</DialogTitle>
            <DialogDescription>Assign this approval to a different reviewer</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>New Approver</Label>
              <Select value={reassignUser} onValueChange={setReassignUser}>
                <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                <SelectContent>
                  {users?.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.full_name ?? u.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Comment (optional)</Label>
              <Textarea
                placeholder="Reason for reassignment…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" onClick={() => setReassignId(null)}>Cancel</Button>
            <Button
              disabled={reassign.isPending || !reassignUser}
              onClick={() => {
                if (!reassignId || !reassignUser) return;
                reassign.mutate(
                  { id: reassignId, approver_id: Number(reassignUser), comment },
                  { onSuccess: () => { setReassignId(null); setComment(""); setReassignUser(""); } }
                );
              }}
            >
              Reassign
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

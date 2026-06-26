/**
 * Approvals API — checker queue and transition actions (Phase 6).
 *
 * Backed by the Phase 3 approval workflow engine:
 *   GET  /api/approvals/queue/                 → pending submissions for the caller
 *   GET  /api/approvals/history/               → completed approvals
 *   GET  /api/approvals/<id>/                  → detail + action history
 *   POST /api/approvals/<id>/start-review/     → move submitted → in_review
 *   POST /api/approvals/<id>/approve/          → mark approved
 *   POST /api/approvals/<id>/reject/           → mark rejected (comment required)
 *   POST /api/approvals/<id>/request-revision/ → send back to submitter
 *   POST /api/approvals/<id>/resubmit/         → submitter re-queues after revision
 *   POST /api/approvals/<id>/cancel/           → submitter cancels
 */

import apiClient from './client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ApprovalStatus =
  | 'submitted'
  | 'in_review'
  | 'revision_requested'
  | 'escalated'
  | 'resubmitted'
  | 'approved'
  | 'rejected';

export type ApprovalModule = 'crop_monitoring' | 'mandi' | 'product_demo';

export interface ApprovalItem {
  id: string;
  module: ApprovalModule;
  /** Human-readable description of the subject object (e.g. "Farmer visit — Raju Patil"). */
  object_repr: string;
  status: ApprovalStatus;
  submitted_by_name: string;
  submitted_at: string;       // ISO datetime
  current_approver_name?: string;
  /** Hours elapsed since submission (for SLA display). */
  sla_hours?: number;
  /** Latest revision/rejection comment. */
  last_comment?: string;
}

export interface ApprovalAction {
  id: string;
  actor_name: string;
  action: string;
  comment?: string;
  timestamp: string;
}

export interface ApprovalDetail extends ApprovalItem {
  actions: ApprovalAction[];
}

export interface PaginatedApprovals {
  count: number;
  next: string | null;
  previous: string | null;
  results: ApprovalItem[];
}

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * Pending submissions assigned to (or visible by) the authenticated checker.
 * The backend filters by region + role automatically.
 */
export const getApprovalQueue = async (): Promise<PaginatedApprovals> => {
  const { data } = await apiClient.get<PaginatedApprovals>('/approvals/queue/');
  return data;
};

/** Completed approvals (approved or rejected) for audit / history view. */
export const getApprovalHistory = async (): Promise<PaginatedApprovals> => {
  const { data } = await apiClient.get<PaginatedApprovals>('/approvals/history/');
  return data;
};

/** Full detail of a single approval instance including the action log. */
export const getApprovalDetail = async (id: string): Promise<ApprovalDetail> => {
  const { data } = await apiClient.get<ApprovalDetail>(`/approvals/${id}/`);
  return data;
};

/** Checker claims the submission (submitted → in_review). */
export const startReview = async (id: string): Promise<void> => {
  await apiClient.post(`/approvals/${id}/start-review/`);
};

/** Checker approves the submission (in_review → approved). */
export const approveSubmission = async (id: string, comment?: string): Promise<void> => {
  await apiClient.post(`/approvals/${id}/approve/`, { comment: comment ?? '' });
};

/** Checker rejects the submission (in_review → rejected). Comment is required. */
export const rejectSubmission = async (id: string, comment: string): Promise<void> => {
  await apiClient.post(`/approvals/${id}/reject/`, { comment });
};

/** Checker sends the submission back for revision. Comment explains what to fix. */
export const requestRevision = async (id: string, comment: string): Promise<void> => {
  await apiClient.post(`/approvals/${id}/request-revision/`, { comment });
};

/** Submitter re-queues after addressing revision comments. */
export const resubmitApproval = async (id: string): Promise<void> => {
  await apiClient.post(`/approvals/${id}/resubmit/`);
};

/** Submitter cancels a pending or in-review submission. */
export const cancelApproval = async (id: string): Promise<void> => {
  await apiClient.post(`/approvals/${id}/cancel/`);
};

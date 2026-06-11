import apiClient from './client';

export interface ApprovalAction {
  id: string;
  actor_username: string;
  action: string;
  comment: string;
  created_at: string;
}

export interface ApprovalInstance {
  id: string;
  workflow_name: string;
  content_type_label: string;
  object_id: string;
  submitted_by_username: string;
  submitted_at: string;
  status: string;
  revision_count: number;
  revision_note: string;
  approved_at: string | null;
  rejected_at: string | null;
  escalated_at: string | null;
  updated_at: string;
  actions: ApprovalAction[];
}

export const getApprovalQueue = (): Promise<ApprovalInstance[]> =>
  apiClient.get('/approvals/queue/').then((r) => r.data);

export const getApprovalDetail = (id: string): Promise<ApprovalInstance> =>
  apiClient.get(`/approvals/${id}/`).then((r) => r.data);

export const approveEntry = (id: string, comment = ''): Promise<ApprovalInstance> =>
  apiClient.post(`/approvals/${id}/approve/`, { comment }).then((r) => r.data);

export const rejectEntry = (id: string, comment: string): Promise<ApprovalInstance> =>
  apiClient.post(`/approvals/${id}/reject/`, { comment }).then((r) => r.data);

export const requestRevision = (id: string, comment: string): Promise<ApprovalInstance> =>
  apiClient.post(`/approvals/${id}/request-revision/`, { comment }).then((r) => r.data);

export const resubmitEntry = (id: string, comment = ''): Promise<ApprovalInstance> =>
  apiClient.post(`/approvals/${id}/resubmit/`, { comment }).then((r) => r.data);

export interface User {
  id: number;
  username: string;
  email: string | null;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  employee_id: string | null;
  role: string;
  primary_role: Role | null;
  primary_role_id: string | null;
  state: string;
  districts: string[];
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
  deactivated_at: string | null;
  deactivation_reason: string | null;
  reporting_to: number | null;
  reporting_to_name?: string;
  full_name?: string;
}

export interface Role {
  id: string;
  name: string;
  code: string;
  description: string;
  is_preset: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  permission_count?: number;
  user_count?: number;
  permissions?: Permission[];
}

export interface Permission {
  id: string;
  codename: string;
  label: string;
  module: string;
  category: string;
  description: string;
  is_active: boolean;
}

export interface UserPermission {
  id: string;
  user: number;
  user_username?: string;
  permission: string;
  permission_label?: string;
  permission_codename?: string;
  effect: "allow" | "deny";
  reason: string;
  expires_at: string | null;
  granted_by: number | null;
  created_at: string;
}

export interface ApprovalInstance {
  id: string;
  workflow: string;
  workflow_name?: string;
  module?: string;
  submitted_by: number;
  submitted_by_username?: string;
  submitted_at: string;
  status:
    | "draft"
    | "submitted"
    | "under_review"
    | "approved"
    | "rejected"
    | "revision_requested"
    | "resubmitted"
    | "escalated"
    | "cancelled";
  data_snapshot: Record<string, unknown>;
  current_approver: number | null;
  current_approver_username?: string;
  approved_at: string | null;
  approved_by: number | null;
  rejected_at: string | null;
  revision_count: number;
  escalated_at: string | null;
  updated_at: string;
  actions?: ApprovalAction[];
}

export interface ApprovalAction {
  id: string;
  actor: number;
  actor_username?: string;
  action: string;
  comment: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_username: string;
  actor_role: string;
  actor_ip: string;
  actor_device: string;
  event_type: string;
  module: string;
  action: string;
  object_repr: string;
  changes: Record<string, unknown>;
  request_id: string;
  created_at: string;
}

export interface ProductivityMetric {
  user_id: string;
  username: string;
  full_name: string;
  farmer_visits: number;
  mandi_arrivals: number;
  product_demos: number;
}

export interface ApprovalSLAMetric {
  [module: string]: {
    count: number;
    avg_hours: number;
    min_hours: number;
    max_hours: number;
  };
}

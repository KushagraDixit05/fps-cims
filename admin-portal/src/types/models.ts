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

// ── Agricultural Intelligence Analytics ──────────────────────────────────────

export interface SummaryPeriodData {
  crop_entries: number;
  market_entries: number;
  product_demos: number;
  active_executives: number;
  farmers_covered: number;
  villages_covered: number;
}

export interface SummaryResponse {
  period: "today" | "week" | "month";
  current: SummaryPeriodData;
  previous: SummaryPeriodData;
  all_time: SummaryPeriodData;
}

export interface CropIntelligenceResponse {
  total_entries: number;
  total_farmers: number;
  total_villages: number;
  top_crops: { crop: string; count: number }[];
  top_varieties: { variety: string; count: number }[];
  condition_distribution: { good: number; average: number; poor: number };
  problem_distribution: { pest: number; disease: number; weather: number; labour: number; price: number; other: number };
  district_coverage: { district: string; entries: number; villages: number }[];
  block_coverage: { block: string; district: string; entries: number; villages: number }[];
  village_coverage: { village: string; block: string; district: string; entries: number }[];
}

export interface MarketIntelligenceResponse {
  total_entries: number;
  commodity_arrivals: { commodity: string; quantity: number; entries: number }[];
  source_distribution: { trader: number; farmer: number; fps_staff: number; mandi: number; official: number; other: number };
  top_mandis: { mandi: string; district: string; entries: number; commodities: number; total_qty: number }[];
  district_activity: { district: string; entries: number }[];
  commodity_trends: { commodity: string; trend: "up" | "down" | "steady"; current_avg_rate: number | null; previous_avg_rate: number | null }[];
}

export interface ProductPerformanceResponse {
  total_demos: number;
  active_demos: number;
  completed_demos: number;
  funnel: { started: number; after_pending: number; completed: number };
  product_rankings: { product: string; demos: number; completed: number; completion_rate: number }[];
  crop_product_combinations: { crop: string; product: string; count: number }[];
  result_distribution: { excellent: number; good: number; average: number; poor: number; no_effect: number };
  executive_demos: { user_id: number; name: string; demos: number; completed: number }[];
}

export interface RecentActivity {
  id: string;
  module: "crops" | "mandi" | "product_demo";
  user: string;
  farmer: string;
  crop: string;
  location: string;
  timestamp: string;
}

export interface ExecutivePerformanceMetric {
  user_id: number;
  username: string;
  full_name: string;
  farmer_visits: number;
  mandi_arrivals: number;
  product_demos: number;
  farmers_covered: number;
  villages_covered: number;
  last_activity: string | null;
  total_activities: number;
}

// ── Region Management ─────────────────────────────────────────────────────────

export interface Region {
  id: string;
  name: string;
  code: string;
  state: string;
  district: string;
  taluka: string;
  parent: string | null;
  parent_name: string | null;
  is_active: boolean;
  created_at: string;
  user_count: number;
  children_count: number;
}

export interface RegionDetail extends Region {
  users: RegionUser[];
  children: Region[];
}

export interface RegionUser {
  user_id: number;
  username: string;
  full_name: string;
  role: string;
}

// ── Sync Monitor ──────────────────────────────────────────────────────────────

export interface DeviceSyncLog {
  id: string;
  synced_at: string;
  username: string;
  device_identifier: string;
  device_name: string;
  platform: string;
  sync_type: "pull" | "push" | "full";
  status: "success" | "partial" | "failed";
  records_pushed: number;
  records_pulled: number;
  error_detail: string | null;
  sync_batch_id: string | null;
}

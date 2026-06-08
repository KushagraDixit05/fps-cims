# Preset Roles

Six roles cover the operational reality described by the business team. All roles are extensible — admins can add custom roles or override individual permissions per user.

---

## Role Hierarchy

```
Super Admin
    └── Admin
            └── Manager
                    └── Regional Head
                                └── Checker
                                        └── Field Executive
```

The hierarchy is for UI/UX clarity only — it does NOT control data access directly. Data access is controlled by permissions and region assignments.

---

## Role 1: Field Executive (FE)

**Code:** `field_executive`  
**Description:** On-ground data collector. Uses the mobile app in the field. Often works offline.

| Module | Permissions |
|--------|-------------|
| Crop Monitoring | `can_access_crop_module`, `can_create_crop_visit`, `can_edit_own_crop_visit`, `can_submit_crop_visit`, `can_view_own_crop_entries` |
| Mandi Arrival | `can_access_mandi_module`, `can_create_mandi_arrival`, `can_edit_own_mandi_arrival`, `can_view_own_mandi_entries` |
| Product Demo | `can_access_product_demo_module`, `can_create_product_demo`, `can_edit_own_product_demo`, `can_view_own_demo_entries` |
| Analytics | `can_view_own_analytics` |
| Sync | `can_sync_data`, `can_sync_offline` |

**Cannot:** Approve entries, view other FE data, access admin, view regional analytics, export reports.

---

## Role 2: Checker

**Code:** `checker`  
**Description:** Verifies and approves data submitted by Field Executives. The "maker-checker" approver.

**Inherits all FE permissions, plus:**

| Module | Permissions |
|--------|-------------|
| Crop Monitoring | `can_edit_any_crop_visit`, `can_approve_crop_visit`, `can_reject_crop_visit`, `can_request_revision_crop`, `can_view_region_crop_entries` |
| Mandi Arrival | `can_edit_any_mandi_arrival`, `can_approve_mandi_arrival`, `can_reject_mandi_arrival`, `can_view_region_mandi_entries` |
| Product Demo | `can_edit_any_product_demo`, `can_approve_product_demo`, `can_view_region_demo_entries` |
| Analytics | `can_view_team_analytics` |

**Cannot:** Manage users, view platform-wide analytics, export reports, delete records.

---

## Role 3: Regional Head

**Code:** `regional_head`  
**Description:** Oversees a geographic region (state or group of districts). Monitors team productivity and regional data quality.

**Inherits all Checker permissions, plus:**

| Module | Permissions |
|--------|-------------|
| Analytics | `can_view_team_analytics`, `can_export_reports` |
| Crop Monitoring | `can_delete_crop_visit` (within region only) |
| All Modules | `can_view_region_*_entries` for all modules |

**Cannot:** Manage users, grant permissions, view other regions' data, view audit logs.

---

## Role 4: Manager

**Code:** `manager`  
**Description:** Manages multiple regional heads. Has analytics visibility across regions they manage.

**Inherits all Regional Head permissions, plus:**

| Module | Permissions |
|--------|-------------|
| Analytics | `can_view_all_analytics`, `can_export_reports`, `can_view_executive_productivity` |
| All Modules | `can_view_all_*_entries` for read-only cross-region view |

**Cannot:** Manage users, grant permissions, delete records globally, view audit logs.

---

## Role 5: Admin

**Code:** `admin`  
**Description:** Platform administrator. Manages users, roles, and regions. Can view audit logs and sync activity.

**Has all Manager permissions, plus:**

| Module | Permissions |
|--------|-------------|
| Admin | `can_manage_users`, `can_assign_roles`, `can_assign_permissions`, `can_manage_regions`, `can_view_all_users`, `can_reset_passwords`, `can_view_audit_logs`, `can_view_sync_logs`, `can_force_logout` |
| All Modules | Full CRUD + approve + delete |

**Cannot:** `can_export_audit_logs` (Super Admin only), configure system settings.

---

## Role 6: Super Admin

**Code:** `super_admin`  
**Description:** Root access. Reserved for the platform team. Can do everything including audit export and system configuration.

**Has all permissions without exception.**

Additional capabilities:
- `can_export_audit_logs`
- Create/edit/delete roles themselves
- Access system configuration endpoints
- View all users including other admins

**This role should be assigned to at most 2–3 people. Assignments are logged.**

---

## Permission Matrix (Summary)

| Permission | FE | Checker | Regional Head | Manager | Admin | Super Admin |
|-----------|----|---------|----|----|----|-------|
| Create own entries | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Edit own entries | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Edit any entry | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| Submit for approval | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Approve entries | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| Delete entries | — | — | Region | All | All | ✓ |
| View own data | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| View region data | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| View all data | — | — | — | ✓ | ✓ | ✓ |
| Own analytics | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Team analytics | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| All analytics | — | — | — | ✓ | ✓ | ✓ |
| Export reports | — | — | ✓ | ✓ | ✓ | ✓ |
| Manage users | — | — | — | — | ✓ | ✓ |
| Assign roles | — | — | — | — | ✓ | ✓ |
| View audit logs | — | — | — | — | ✓ | ✓ |
| Export audit logs | — | — | — | — | — | ✓ |
| Manage roles | — | — | — | — | — | ✓ |

---

## Custom Roles

Admins can create custom roles through the admin portal. These work identically to preset roles — they are rows in `accounts_role` with `is_preset = FALSE`.

**Use case examples:**
- "Data Verification Officer" — like a Checker, but only for mandi data
- "Analytics Viewer" — manager-level analytics, no data entry
- "District Coordinator" — regional head for a specific district only

Custom roles can be composed by selecting any subset of permissions from the permission catalogue via the admin portal UI.

---

## Role Transition Policies

When a user's role changes:

1. The new role's permissions are computed and written to the JWT on next token refresh
2. The Redis permission cache for that user is immediately invalidated
3. An audit log entry is created: `"role_change"` event
4. If the user had personal permission overrides inconsistent with the new role, they are NOT automatically removed — an admin must review them
5. If the old role had `can_approve_*` and the new role does not, any pending approval instances assigned to this user are reassigned to the role's default queue (unassigned state)

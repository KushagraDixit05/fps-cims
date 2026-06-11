---
name: FPS Admin Portal
description: Web-based operations command centre for Farm Prosperity Solutions. Desktop SaaS dashboard for admin and super_admin users to manage field staff, roles, permissions, approvals, analytics and audit logs. Visually matches the FPS mobile app design language — same brand colours, same badge semantics, same agricultural-intelligence aesthetic — extended into a data-dense enterprise layout.
platform: web
viewport: 1440px desktop, 1280px laptop
colors:
  primary: "#1A4A2E"
  primary-mid: "#2A6A44"
  primary-light: "#E1F2E8"
  canvas: "#F8F6F1"
  surface: "#FFFFFF"
  border: "#E0DDD5"
  divider: "#F0EDE6"
  text-primary: "#1A3A25"
  text-secondary: "#6A7A6A"
  text-muted: "#8A8A7A"
  status-good-text: "#1A8A3A"
  status-good-bg: "#E1F2E8"
  status-warn-text: "#C8900A"
  status-warn-bg: "#FEF3DA"
  status-error-text: "#D63333"
  status-error-bg: "#FCEBEB"
  status-info-text: "#185FA5"
  status-info-bg: "#E6F1FB"
typography:
  font-family: "Inter, ui-sans-serif, system-ui, sans-serif"
  display:
    fontSize: "22px"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.02em"
    color: "{colors.text-primary}"
  headline:
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.3
    color: "{colors.text-primary}"
  title:
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.4
    color: "{colors.text-primary}"
  body:
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    color: "{colors.text-primary}"
  small:
    fontSize: "12px"
    fontWeight: 400
    color: "{colors.text-secondary}"
  label:
    fontSize: "11px"
    fontWeight: 700
    letterSpacing: "0.06em"
    textTransform: "uppercase"
    color: "{colors.text-muted}"
  mono:
    fontSize: "11px"
    fontFamily: "ui-monospace, monospace"
    color: "{colors.text-muted}"
rounded:
  sm: "8px"
  md: "10px"
  lg: "12px"
  xl: "14px"
  card: "16px"
  full: "9999px"
shadows:
  card: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)"
  card-hover: "0 4px 12px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)"
  sheet: "0 20px 60px rgba(0,0,0,0.15)"
---

## App Shell

The admin panel uses a fixed two-column layout that never scrolls as a whole — only the main content area scrolls.

### Sidebar (fixed, 240px wide)

Background: `#1A4A2E` (deep forest green — identical to the FPS mobile app header).

**Logo area (top)**
- 36×36px FPS logo image in a white rounded-xl container
- "FPS Admin" in 15px bold white text beside it
- "Farm Prosperity Solutions" in 10px uppercase tracked white/50 below

**Navigation items (middle, flex-1)**
- Section eyebrow: "OPERATIONS" in 10px uppercase tracked white/30
- Each nav item: icon (16px, lucide) + label (14px, 500 weight)
- Inactive: `rgba(255,255,255,0.55)` text, transparent background
- Active: white text, `rgba(255,255,255,0.10)` background, white 4px left-border accent bar
- Hover: `rgba(255,255,255,0.08)` background
- Items: Dashboard, Users, Roles, Permissions, Approvals, Analytics, Audit Log

**User footer (bottom)**
- 32×32px avatar with green initial fallback
- User full name in 13px semibold white
- Role label in 10px white/50 capitalize
- Logout icon button (right, 14px, white/40)

---

### Top Bar (fixed, height 56px)

Background: `#FFFFFF`. Bottom border: 1px `#E0DDD5`.

- **Left:** Current page title in 15px semibold `#1A3A25`
- **Right:** Bell notification icon + user avatar + name + role

---

### Main Content Area

Background: `#F8F6F1` (warm off-white canvas). Padding: 24px. Scrollable.

---

## Components

### Card

```
background: #FFFFFF
border: 1px solid #E0DDD5
border-radius: 16px
padding: 20px
shadow: card
hover-shadow: card-hover
transition: 150ms ease
```

### Status Badge

Pill-shaped inline label. 8px border-radius. 10px horizontal padding, 3px vertical. 12px font, 600 weight. Always has coloured border.

| Status | Text | Background | Border |
|---|---|---|---|
| approved / active | `#1A8A3A` | `#E1F2E8` | `#1A8A3A` at 20% |
| submitted / pending / under_review | `#C8900A` | `#FEF3DA` | `#C8900A` at 20% |
| escalated | `#185FA5` | `#E6F1FB` | `#185FA5` at 20% |
| rejected / inactive / cancelled | `#D63333` | `#FCEBEB` | `#D63333` at 20% |
| preset (roles) | `#FFFFFF` | `#1A4A2E` | transparent |
| secondary / draft | `#6A7A6A` | `#F0EDE6` | `#E0DDD5` |

### Button

```
Primary:    bg #1A4A2E  text white   hover bg #2A6A44   radius 10px  height 40px  px 16px
Secondary:  bg #FFFFFF  text #1A4A2E border #E0DDD5     same radius/height
Danger:     bg #D63333  text white   hover bg #b82020
Ghost:      transparent text #6A7A6A hover bg #F8F6F1
Icon:       36×36px square, ghost style
```

### Input / Select

```
height: 40px
border: 1px solid #E0DDD5
border-radius: 10px
background: #FFFFFF
font-size: 14px
color: #1A3A25
placeholder-color: #8A8A7A
focus-ring: 2px #1A4A2E at 30% opacity
focus-border: #2A6A44
```

### Data Table

```
container: white, rounded-xl (14px), border #E0DDD5, overflow hidden
header row: background #F8F6F1, border-bottom #E0DDD5
  - cell: 11px uppercase bold tracked #8A8A7A, 16px vertical padding, 16px horizontal
data row: border-bottom #F0EDE6
  - hover: background #F8F6F1 at 70%
  - cell: 14px #1A3A25, 14px vertical padding
pagination: flex space-between, 14px #6A7A6A
```

### Sheet / Drawer (slide from right, 480px)

```
background: #FFFFFF
border-left: 1px solid #E0DDD5
shadow: sheet
header: px 24px, pt 24px, pb 16px, border-bottom #F0EDE6
body: px 24px, py 20px, scrollable
footer: px 24px, py 16px, border-top #F0EDE6, flex justify-end gap 12px
```

### Dialog / Modal

```
overlay: rgba(0,0,0,0.4) with backdrop-blur 4px
content: background white, border-radius 16px, border #E0DDD5, padding 24px, max-width 512px, shadow sheet
title: 18px bold #1A3A25
description: 14px #6A7A6A, margin-bottom 20px
```

### KPI Card

```
layout: flex row, space-between
left: eyebrow label (11px uppercase bold muted) + value (30px 800 weight ink) + subtext (12px secondary)
right: 44×44px rounded-xl icon container with tinted background + 20px icon
card: white, rounded-2xl, border, shadow, no-hover-effect
```

### Skeleton Loader

```
Animated pulse. Color: #E0DDD5 at 60%.
Table skeleton: header row of short rectangles + rows with circle avatar + varying-width rectangles
Card skeleton: label rect (h12 w24) + value rect (h8 w16) + subtext rect (h12 w28)
```

---

## Pages

### Login Page

Full-page centered layout. Background: `#F8F6F1`.

**Logo block (top center)**
- 64×64px FPS logo in white rounded-2xl card with shadow
- "FPS Admin Portal" in 22px 800 weight below
- "Farm Prosperity Solutions" in 14px muted below that

**Form card (white, rounded-2xl, border, shadow-sm, 28px padding)**
- "Sign in" heading 18px bold
- "Enter your credentials…" subtext 14px secondary
- Error banner (red bg, border, rounded-xl) — only when error
- Username label + input
- Password label + input with show/hide toggle (eye icon right)
- "Sign in" primary button full-width, 48px height
- Footer: "Farm Prosperity Solutions © 2025" 12px muted centered

---

### Dashboard

Page title: "Operations Dashboard". Description: "Field Intelligence Command Center".

**Stats Strip (4-column grid)**
Each KPI card shows: label (uppercase 11px), large value (30px 800), subtext (12px), icon (right, in tinted box).

| Card | Icon | Icon tint |
|---|---|---|
| Total Users | Users icon | green `#E1F2E8` |
| Pending Approvals | ClipboardCheck | amber `#FEF3DA` |
| Active Roles | BarChart3 | blue `#E6F1FB` |
| Audit Events | ScrollText | stone `#F0EDE6` |

**Charts row (2-column grid)**

*Productivity Chart (left card)*
- Title: "Field Executive Productivity"
- Stacked bar chart. X-axis: executive first names. Y-axis: count.
- Series: Visits `#1A4A2E`, Mandi `#C8900A`, Demos `#185FA5`
- Bar radius: 4px top. Bar size: 10px. Gap: 2px.
- Grid lines: horizontal only, `#F0EDE6` dashed.
- Tooltip: white card, 12px, 12px radius, border `#E0DDD5`.
- Legend: 11px, circle icons, 8px, below chart.

*Approval SLA Chart (right card)*
- Title: "Approval SLA — Turnaround Time"
- Grouped bar chart. X-axis: module names. Y-axis: hours.
- Series: Min `#E1F2E8` (with green stroke), Avg `#1A4A2E`, Max `#D63333`
- Bar size: 14px. Same grid/tooltip style.

**Bottom row (2-column grid)**

*Recent Approvals card (left)*
- Header row: "Recent Approvals" title + "View all →" link in green 12px
- List of 5 rows: module name bold + submitter + relative time (left) | StatusBadge (right)
- Row hover: `#F8F6F1` bg, 12px radius

*Platform Summary card (right)*
- Soft green-tinted border card (`#E1F2E8` bg, `#1A4A2E` border at 20%)
- 🌾 emoji large center
- "FPS Admin Portal" 15px bold
- Descriptive sentence 14px secondary
- 3-column mini-stat grid: Roles 6, Permissions 50, Modules 5
  Each cell: white bg, border, rounded-xl, value 21px extrabold primary, label 10px uppercase muted

---

### User Management

Page title: "User Management". Description: "N users in the system". Right: "Add User" primary button.

**Filter row**
- Search input with Search icon (flex-1, min 208px)
- Status select (144px): All Status / Active / Inactive
- Role select (176px): All Roles / Field Executive / Checker / Regional Head / Admin / Super Admin

**Data Table**
Columns: User (avatar + full name + @username) | Role (badge) | State | Phone | Status (badge) | Joined | Actions (⋯ menu)

Row actions dropdown:
- Edit → opens UserDrawer
- Deactivate → opens reason dialog (red)
- Reactivate (if inactive, green)
- Force Logout (amber)

**UserDrawer (right sheet, 480px)**
Title: "Create User" or "Edit User". Fields stacked with labels:
Username (create only) | Full Name | Phone | Employee ID | State | Role (select) | Password (create only)
Footer: Cancel (secondary) + Save (primary)

**Deactivate Dialog**
Title: "Deactivate User". Warning description. Textarea "Reason (optional)". Cancel + red "Deactivate" button.

---

### Role Management

Page title: "Role Management". Description: "N roles configured". Right: "Create Role" button.

**Card grid (4-column, responsive)**
Each role card:
- Thin 8px colour bar across top (green tones for admin roles, amber for checker, blue for regional)
- Icon in tinted square (40×40px, rounded-xl)
- Preset badge `#1A4A2E` bg white text | Custom badge secondary
- Role name 15px bold | role code 11px monospace muted
- Description 12px secondary (2-line clamp)
- Stats row: "N perms" + "N users" in 12px muted with icons, border-top
- Action row: "Manage" secondary button (flex-1) + trash icon (danger, only for custom roles)

**Create Role Dialog**
Fields: Role Name | Role Code (auto-kebab) | Description (textarea)
Footer: Cancel + "Create Role"

---

### Role Detail

Back button → breadcrumb "Roles".
Page title: role name. Description: role code or description.
Right actions: Preset badge with lock icon (if preset) OR "Save Changes (N)" primary button (if edits pending).

**Permission Matrix card**
Title: "Permission Matrix". Subtext about toggling.
Grouped by module (crops, mandi, product_demo, admin, analytics, sync).
Module header: 11px uppercase bold muted.
Permission items in 3-column grid:

Each permission tile (checkbox-style button):
```
Granted state:   bg #E1F2E8, border #1A4A2E at 30%, text #1A4A2E
                 checkbox: filled #1A4A2E with white checkmark
Ungrant state:   bg white, border #E0DDD5, text #6A7A6A
                 checkbox: white with grey border
Preset role:     cursor-default, no hover
Custom role:     cursor-pointer, hover shadow-sm
```
Each tile shows: permission label (12px bold) + codename (10px monospace muted).

---

### Permission Catalogue

Page title: "Permission Catalogue". Description: "48 permissions across all modules". Right: "Grant Override" button.

**Search input** (max 208px, with Search icon).

**Two-column grid**

*Left: Catalogue cards (by module)*
One card per module. Header: module name title + "N permissions" subtext.
Each permission row (hover bg `#F8F6F1`):
- Permission label 13px bold | codename 10px mono muted
- Category badge (secondary, 10px, capitalize) — right

*Right: User Permission Overrides card*
Title: "User Permission Overrides". Subtext.
If empty: "No overrides configured" 14px muted centered.
Each override row:
- Allow/deny badge (green/red) + permission label 12px bold on same line
- @username + expiry date in 11px muted below
- Reason in 11px secondary italic
- × remove button (danger ghost, right)

**Grant Override Dialog**
Fields: User (select) | Permission (select, shows label + codename) | Effect (Allow / Deny select) | Reason (textarea) | Expires At (datetime-local, optional)

---

### Approval Queue

Page title: "Approval Queue". Description: "N approvals".

**Filter row**
- Status select (176px): All Status / Submitted / Under Review / Escalated / Resubmitted / Approved / Rejected
- Module select (176px): All Modules / Crops / Mandi / Product Demo

**Data Table**
Columns: Module (name + truncated ID mono) | Submitted By | Status (badge) | Current Approver | Submitted (relative time) | Actions (⋯)

Row click → navigates to `/approvals/[id]`

Row actions: Force Approve (green) | Reassign

**Force Approve Dialog**
Title: "Force Approve". Warning description. Comment textarea. Cancel + "Force Approve" primary.

**Reassign Dialog**
Title: "Reassign Approval". New Approver select (all users). Comment textarea. Cancel + "Reassign".

---

### Approval Detail

Back button → "Approvals" breadcrumb.
Page title: module name. Description: submitted datetime.
Right: animated StatusBadge + "Force Approve" button (only for pending statuses).

**5-column grid split: 2 left + 3 right**

*Timeline card (2 cols)*
Title: "Timeline".
Vertical timeline list:
- Each item: circle icon (8px, white bg, border, shadow) with coloured icon inside + right content
- approved → green CheckCircle | rejected → red XCircle | others → grey Clock
- Action name 13px semibold capitalize | actor + relative time 12px muted below
- Comment (if any): grey bg rounded-lg 14px, 12px padding
- Vertical connector line between items: 1px `#F0EDE6`

*Details section (3 cols)*

Approval Details card:
6-cell 2-column grid: Module | Status badge | Submitted By | Current Approver | Submitted At | Revisions count

Data Snapshot card (if data exists):
`<pre>` block: 12px secondary, `#F8F6F1` bg, border `#E0DDD5`, rounded-xl, max-height 256px scrollable.

---

### Analytics

Page title: "Analytics". Description: "Performance and approval SLA insights".
Right: day-range pill selector (7d / 14d / 30d / 60d / 90d).
Active day: `#1A4A2E` bg white text. Inactive: ghost text. Container: white bg, border, rounded-xl, 4px padding.

**Full-width Productivity Chart card**
Title + subtext. 300px height ResponsiveContainer.
Same chart spec as Dashboard but full width and larger.
Tooltip `labelFormatter` shows full executive name.

**2-column grid below**

*SLA Chart (left)*
Title: "Approval SLA by Module". 240px height.
Grouped bars: Min (light green with green stroke) / Avg (dark green) / Max (red).
Y-axis label: "hours" rotated.

*SLA Summary table (right)*
Title: "SLA Summary".
List rows (border-bottom between):
Left: module name 13px bold + "N approvals" 12px muted
Right: avg hours 15px bold primary + "avg resolution" 10px muted

---

### Audit Log

Page title: "Audit Log". Description: "N total events recorded".
Right: "Export CSV" button (secondary, Download icon) — **only visible when `role === "super_admin"`**.

**Filter row**
- Actor search input with Search icon (flex-1 min 192px)
- Module select (160px)
- Event Type select (144px)

**Custom expandable table (not DataTable component)**

Column headers: (expand toggle) | Timestamp | Actor | Event | Module | Action | Object | IP

Each data row (hover `#F8F6F1`):
- Expand toggle: ChevronRight → ChevronDown
- Timestamp: 11px mono muted
- Actor: username 13px bold + role 10px muted capitalize (two lines)
- Event badge: coloured by type (create=green, delete=red, update=amber, login=blue, others=secondary)
- Module: 12px semibold secondary capitalize
- Action: 11px monospace secondary
- Object: 12px secondary (truncated at 32 chars)
- IP: 11px mono muted

**Expanded row** (full-width colspan, `#F8F6F1` bg):
"Changes" eyebrow label + JSON `<pre>` block (white bg, border, rounded-xl, max-height 192px)
Request ID: mono muted below

---

## Interaction Patterns

### Framer Motion Animations

| Trigger | Animation |
|---|---|
| Page load | `opacity: 0→1, y: 8→0` over 200ms ease-out |
| KPI cards | Staggered `y: 16→0, opacity: 0→1`, delay = index × 60ms |
| Drawer open | Slide in from right, 280ms spring (stiffness 300, damping 30) |
| Status badge change | `scale: 0.9→1, opacity: 0→1` with AnimatePresence |
| Sidebar active item | `layoutId="sidebar-active"` spring transition on left accent bar |
| Role cards | `scale: 0.97→1, opacity: 0→1` on mount |

### Loading States

- All data fetches show skeleton loaders (never blank white)
- Buttons show `Loader2` spinning icon during mutation
- Charts show animated pulse placeholder div at chart height

### Error States

- API errors show red banner inside the relevant card/dialog
- Toast-style inline feedback after mutations (success/fail)

---

## Colour Rules (matching FPS mobile)

1. **Semantic colour rule** — green/amber/red used only for status signals, never decorative
2. **One voice rule** — primary green `#1A4A2E` appears in: sidebar, primary buttons, active states, key data values only
3. **Flat by default** — surfaces differentiated by subtle borders, not depth; shadows only on cards and sheets
4. **No dark mode** — light mode only, optimised for desktop office use
5. **Uppercase restraint** — ALL-CAPS only for section eyebrows and label metadata; never body text

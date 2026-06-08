# FPS RBAC & Admin Management System — Architecture Overview

**Version:** 1.0  
**Date:** 2026-06-07  
**Audience:** Engineering leads, backend architects, mobile engineers  

---

## 1. Why This Exists

The current FPS system has a single `role` CharField on the User model with three values: `field_executive`, `admin`, `viewer`. This is a seed — not an architecture.

As FPS scales to multiple states, regional teams, verification workflows, and eventually SaaS, we need:

- Fine-grained, composable permissions (not role strings)
- Maker-checker approval pipelines with audit trails
- Region-scoped data visibility
- A dedicated admin portal (not just Django Admin)
- Offline-compatible permission delivery to mobile clients
- Permission revocation that propagates to devices

This document is the top-level architecture overview. Detailed implementation lives in numbered sibling documents.

---

## 2. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        FPS Platform                             │
│                                                                 │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────┐  │
│  │  Mobile App  │    │   Admin Portal   │    │  Django API  │  │
│  │ (React Native│    │  (Next.js Web)   │    │   Backend    │  │
│  │ WatermelonDB)│    │                  │    │              │  │
│  └──────┬───────┘    └────────┬─────────┘    └──────┬───────┘  │
│         │                    │                      │          │
│         │  JWT + Permissions │  JWT (admin scope)   │          │
│         └────────────────────┴──────────────────────┘          │
│                                      │                         │
│                         ┌────────────▼────────────┐            │
│                         │     Permission Engine    │            │
│                         │  (Django + Redis cache)  │            │
│                         └────────────┬─────────────┘           │
│                                      │                         │
│         ┌─────────────┬──────────────┼──────────────┐          │
│         ▼             ▼              ▼               ▼          │
│  ┌─────────────┐ ┌─────────┐ ┌──────────────┐ ┌──────────┐    │
│  │  PostgreSQL  │ │  Redis  │ │ Approval     │ │ Audit    │    │
│  │  + PostGIS   │ │  Cache  │ │ Engine       │ │ Engine   │    │
│  └─────────────┘ └─────────┘ └──────────────┘ └──────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Design Principles

### 3.1 Attribute-Based Permission Model (ABAC-lite)

Pure RBAC breaks down when you need "FE can edit own entries but not others" or "Regional Head sees only Nanded district data." We use a hybrid:

- **Roles** define a baseline permission bundle
- **User-level overrides** extend or restrict those defaults
- **Attribute conditions** (owns record, in region, in reporting chain) gate data access

This is sometimes called ReBAC (Relationship-Based Access Control) at the data layer.

### 3.2 Permission Evaluation Order

```
1. Is the user active? → No → 403
2. Is the endpoint admin-only? → Is user admin/superadmin? → No → 403
3. Does the user's role have the required permission?
4. Does the user have a personal DENY override? → Yes → 403
5. Does the user have a personal ALLOW override? → Yes → 200
6. Role permission = final answer
```

### 3.3 Offline-First Compatibility

Permissions are embedded into the JWT access token as a compact claims object. The mobile app reads permissions from the token without a network call. When the token expires (recommended: 8h for field use), a refresh is required — this is the sync window where permission changes propagate.

For permission revocations that must be immediate (e.g., user terminated), the refresh token is blacklisted server-side. The next sync attempt fails, forcing re-login.

### 3.4 Defence-in-Depth

Permissions are enforced at three layers:

| Layer | Mechanism | Purpose |
|-------|-----------|---------|
| Mobile UI | Navigation guards, hidden buttons | UX — prevent confusion |
| API middleware | DRF permission classes | Primary enforcement |
| DB queries | Filtered querysets per user | Defence against API bypass |

---

## 4. Document Index

| File | Contents |
|------|----------|
| `01-DATABASE-SCHEMA.md` | All tables, fields, indexes, relationships |
| `02-PERMISSION-ENGINE.md` | How permissions are stored, resolved, cached |
| `03-PRESET-ROLES.md` | Recommended roles with full permission sets |
| `04-BACKEND-ARCHITECTURE.md` | Django apps, DRF classes, middleware, services |
| `05-APPROVAL-WORKFLOW.md` | Maker-checker lifecycle, state machine, engine |
| `06-ADMIN-PANEL.md` | Admin portal pages, flows, API strategy, stack |
| `07-MOBILE-INTEGRATION.md` | Permission sync, navigation guards, offline handling |
| `08-AUDIT-SYSTEM.md` | Audit tables, immutable logs, compliance |
| `09-SECURITY.md` | JWT strategy, token management, attack mitigations |
| `10-SCALABILITY.md` | Query optimization, caching, async processing |
| `11-IMPLEMENTATION-PHASES.md` | Step-by-step delivery plan |

---

## 5. Key Technology Decisions

### Backend
- **Django + DRF** — existing, extend in place
- **`django-guardian`** — object-level permissions (evaluate; may replace with custom)
- **Redis** — permission cache with user-scoped TTL
- **Celery** — async audit writes, notification dispatch
- **`django-simple-history`** — model change tracking (complements custom audit engine)

### Admin Portal
- **Next.js 15** — SSR, API routes, React Server Components
- **Separate authentication scope** — admin JWT audience claim `aud: fps-admin`
- **Deployed internally** — not public-facing

### Mobile
- **Permission claims in JWT** — zero extra round-trips offline
- **WatermelonDB** — existing, no change to sync engine
- **React Navigation guards** — screen-level gating

### Rationale for NOT using django.contrib.auth permissions directly

Django's built-in permission system is model-scoped and binary. It cannot express:
- "can edit own entries but not others"
- "can view analytics for Nanded but not Pune"
- "module-level access gating"

We will define our own permission codenames and resolution engine, and optionally map them to Django's system for Django Admin compatibility.

---

## 6. Risk Summary

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Stale permissions on offline device | High | Medium | 8h JWT expiry + revocation blacklist |
| Permission cache inconsistency | Medium | High | Cache invalidation on every permission write |
| Approval queue growth under high volume | Medium | Medium | Async processing + pagination |
| Admin portal XSS/auth bypass | Low | Critical | Separate auth scope, CSP headers |
| Maker-checker deadlock (no approver available) | Medium | Medium | Escalation path + admin override |
| Schema migration on live data | Low | High | Additive-only migrations, feature flags |

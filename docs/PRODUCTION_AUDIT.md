# FPS Production-Readiness Audit

## Context

The FPS (Farm Prosperity Solutions / fps-cims) platform is about to be deployed to
field executives operating in rural India with unstable connectivity, Android process
kills, large photo uploads, and long offline sessions. This is a zero-trust
production audit to surface and prioritize risk **before rollout** — no feature work.

Per your direction: **this is a report only. No code changes will be made.** Mobile
(React Native) findings are included with the caveat that any fix needs an APK rebuild
+ field test before it can be trusted.

The codebase was inspected directly (backend Django/DRF, RN+WatermelonDB mobile,
Render/Neon/Cloudinary infra). Two findings that surfaced during exploration were
**verified false and dropped**:
- *Public register role-escalation* — false. [accounts/serializers.py:18-26](backend/accounts/serializers.py#L18) omits `role` from writable fields and hardcodes `field_executive` in `create()`.
- *WatermelonDB migration order corruption* — false. The library `sortBy(toVersion)` before applying (verified in `node_modules/@nozbe/watermelondb/Schema/migrations`), so the out-of-order list is harmless. Cosmetic only.

The proposed action on approval: **save this report to `docs/PRODUCTION_AUDIT.md`** (a doc, not code). Nothing else changes.

---

# Executive Summary

The platform is **functionally complete but not yet production-hardened.** Core flows
work and several good patterns exist (client-stable `local_id` + DB unique constraints
for idempotency, offline session restore from cached user, FlatList with `keyExtractor`,
correct Android 13+ media permissions, production security headers gated on `not DEBUG`).

However, multiple reliability and observability gaps will bite under the exact field
conditions described:

**Highest-risk areas**
1. **Observability is near-zero.** No `LOGGING` config, no Sentry/error tracking, no
   request audit. Production failures (sync 500s, upload timeouts, connection
   exhaustion) are invisible until a user complains. This is the single biggest
   operational blind spot.
2. **Offline sync has a concurrency race.** The idempotency "check-then-save" is not
   atomic; concurrent retries on flaky networks can throw an uncaught `IntegrityError`
   (HTTP 500), which the client treats as a failure and retries — a self-sustaining
   error loop on the worst networks.
3. **Token refresh has no single-flight guard.** Parallel requests hitting 401 spawn N
   concurrent refreshes; with `ROTATE_REFRESH_TOKENS=True` only one survives, the rest
   poison `AsyncStorage` → spurious logout in the field.
4. **No crash recovery.** No React `ErrorBoundary` — any unhandled throw white-screens
   the entire app.
5. **Large photo uploads will fail on 2G.** No client-side image compression; full-quality
   photos vs a 60s axios timeout = sync that never completes on low bandwidth.

**Deployment blockers:** PostGIS extension prerequisite not enforced (fresh-DB migrate
fails), missing pagination on list endpoints (unbounded responses as data grows), and
the unaddressed observability gap.

**Rollout readiness:** Not ready for a wide rollout. Suitable for a **small piloted
rollout (≤ a few users, monitored manually)** once Phase 1 below is addressed.

---

# Production Readiness Scores (/10)

| Dimension | Score | Note |
|---|---|---|
| Overall Production Readiness | 5.5 | Works; not hardened |
| Backend Reliability | 6 | Idempotency race + pagination gaps |
| Mobile Reliability | 5 | No ErrorBoundary, refresh stampede |
| Offline Sync Reliability | 5.5 | Good `local_id` design, racy commit |
| Infrastructure Readiness | 6 | Render/Neon/Cloudinary wired, PostGIS prereq fragile |
| Deployment Readiness | 5.5 | Startup migrate/seed on shared DB, uncommitted migration |
| Security | 5 | No token revocation, public media URLs, validation gaps |
| Scalability | 4.5 | No indexes, unbounded lists, N+1 risk |
| Observability & Monitoring | 2 | No logging, no error tracking |
| Disaster Recovery Readiness | 3 | No backups/runbook documented, no rollback plan |

---

# Critical Issues

### C1 — Idempotency check-then-save is not atomic → 500 on concurrent retries
- **Severity:** Critical
- **Problem:** All three sync create endpoints pre-check `Model.objects.filter(executive=user, local_id=...).first()` then `serializer.save()` separately. Two concurrent identical retries both miss the pre-check, both save, the second violates the `(executive, local_id)` unique constraint → uncaught `IntegrityError` → HTTP 500. [crops/views.py:230-252](backend/crops/views.py#L230), [mandi/views.py:55-66](backend/mandi/views.py#L55), [product_demo/views.py:48-62](backend/product_demo/views.py#L48)
- **Impact:** On the flakiest networks (where retries overlap most), sync returns 500; the client marks the record failed and retries forever. Operational failure exactly where reliability matters most.
- **Root cause:** Non-atomic compare-and-set; `IntegrityError` not caught.
- **Fix:** Wrap in `transaction.atomic()` and use `get_or_create(... defaults=...)`, or catch `IntegrityError` and re-fetch + return the existing record as 200. Idempotent on every retry.

### C2 — Token refresh stampede vs `ROTATE_REFRESH_TOKENS`
- **Severity:** Critical
- **Problem:** The 401 response interceptor refreshes with no shared in-flight promise. [api/client.ts:76-108](mobile/FarmProsperity/src/api/client.ts#L76). Parallel requests (auto-sync + photo upload + screen loads) all 401 → N concurrent `POST /auth/refresh/`. Backend `ROTATE_REFRESH_TOKENS=True` ([settings.py:247](backend/fps_backend/settings.py#L247)) invalidates all but the last; the losing responses overwrite `AsyncStorage` with a now-invalid access token.
- **Impact:** Spurious forced logout / cascading 401s in the field; user must re-login with no signal.
- **Root cause:** No single-flight refresh; multiple writers to the token store.
- **Fix:** Module-level `let refreshPromise`; first 401 creates it, concurrent 401s `await` the same promise, then retry. Only one refresh call per window.

### C3 — No React ErrorBoundary → full-app crash with no recovery
- **Severity:** Critical
- **Problem:** No `ErrorBoundary` / `componentDidCatch` anywhere; `App.tsx` does not wrap navigation. Any unhandled render/runtime throw white-screens the app.
- **Impact:** A single bad record, malformed JSON, or image error hard-crashes the app. Unsynced WatermelonDB data is intact but inaccessible until force-restart — costly when the user had to travel for signal.
- **Root cause:** Missing top-level error boundary.
- **Fix:** Add an `ErrorBoundary` wrapping the navigator with a "reload" action; optionally report caught errors once monitoring exists (H4).

---

# High Severity Issues

### H1 — Missing pagination on list endpoints
- **Severity:** High
- **Problem:** No global `DEFAULT_PAGINATION_CLASS` ([settings.py:150-162](backend/fps_backend/settings.py#L150)); only `FarmerVisitViewSet` and `ProductDemoViewSet` set `pagination_class`. `VillageViewSet`, `FarmerViewSet`, `CropEntryViewSet`, `MandiArrivalViewSet`, district/block/village-master/crop-master viewsets return **all rows** in one response.
- **Impact:** As arrivals/visits grow, list calls balloon response size and server memory → slow app, OOM, DoS surface.
- **Fix:** Set a global default pagination (reuse `fps_backend.pagination.MobilePagination`); keep a sane `max_page_size`.

### H2 — No backend logging / error monitoring
- **Severity:** High
- **Problem:** No `LOGGING` block in settings; no Sentry/Rollbar in `requirements.txt`. Idempotency conflicts, integrity errors, upload failures are silent (stdout only, lost on restart).
- **Impact:** Production is operationally blind; MTTR depends on user reports.
- **Fix:** Add structured `LOGGING` (console handler, JSON-ish format), and integrate an error tracker (Sentry SDK) gated on an env DSN. Log idempotency hits and caught `IntegrityError`s.

### H3 — No `AppState` foreground sync trigger
- **Severity:** High
- **Problem:** `useAutoSync` only listens to `NetInfo` *change* events. [sync/useAutoSync.ts](mobile/FarmProsperity/src/sync/useAutoSync.ts). After an Android kill + relaunch where network is already "online" (no change event), queued records may sit unsynced until the next throttle window.
- **Impact:** Delayed/lost-feeling sync after process kill — the most common field scenario.
- **Fix:** Add `AppState.addEventListener('change', ...)` → trigger sync on transition to `active`; also kick a sync once on app mount.

### H4 — No client-side image compression → uploads time out on low bandwidth
- **Severity:** High
- **Problem:** Photos captured at full quality (`quality: 1`), no resize, sent via multipart against a 60s axios timeout ([api/client.ts:52](mobile/FarmProsperity/src/api/client.ts#L52)). On 2G, a few multi-MB photos exceed the timeout.
- **Impact:** Sync of photo-bearing records (crop monitoring, product demo) never completes on poor connections; perpetual retry.
- **Fix:** Compress/resize before persisting (target ~500 KB, longest edge ~1280px). Consider a longer timeout for multipart and/or chunked retry.

### H5 — Cross-executive aggregate data leak (`yoy_comparison`, `summary`)
- **Severity:** High
- **Problem:** `yoy_comparison` queries `MandiArrival.objects.filter(...)` directly instead of `self.get_queryset()` → any executive sees org-wide totals. [mandi/views.py:85-94](backend/mandi/views.py#L85). `FarmerVisit.summary` leaks an org-wide `team_members` count. [crops/views.py:285](backend/crops/views.py#L285).
- **Impact:** Object-level authorization bypass; non-admins read data outside their scope.
- **Fix:** Route both through `self.get_queryset()` (which already scopes by `submitted_by`/`executive`); scope the team count to the requesting user's data or gate it admin-only.

### H6 — No token revocation / logout (blacklist not installed)
- **Severity:** High
- **Problem:** `token_blacklist` is not in `INSTALLED_APPS`; `BLACKLIST_AFTER_ROTATION=False` with `ROTATE_REFRESH_TOKENS=True`. [settings.py:244-250](backend/fps_backend/settings.py#L244). Logout is client-side token delete only — the refresh token stays valid for its 30-day life. Old rotated refresh tokens are never invalidated.
- **Impact:** A leaked/stolen refresh token is replayable for 30 days; no server-side logout.
- **Fix:** Install `rest_framework_simplejwt.token_blacklist`, set `BLACKLIST_AFTER_ROTATION=True`, add a logout endpoint that blacklists. (Requires a migration — additive, safe.)

### H7 — PostGIS extension prerequisite not enforced at deploy
- **Severity:** High
- **Problem:** Models use real `PointField` ([crops/models.py:21,114,270](backend/crops/models.py#L21), [product_demo/models.py:95](backend/product_demo/models.py#L95)), so PostGIS is genuinely required. The Docker start `migrate` does **not** run `CREATE EXTENSION IF NOT EXISTS postgis`. On a fresh Neon DB without the extension enabled, first migrate fails.
- **Impact:** Deploy to a new/rebuilt database fails hard; needs manual SQL to unblock.
- **Fix:** Add an initial migration `RunSQL("CREATE EXTENSION IF NOT EXISTS postgis")` (Django ships `CreateExtension` for this) ordered before the first `PointField` migration, or document/automate enabling it on Neon. (Note: PostGIS is *used for storage* but no spatial queries exist — do **not** "remove GDAL"; that would break the schema.)

### H8 — Sync lacks a global in-flight mutex
- **Severity:** High
- **Problem:** `syncPendingRecords()` has no global lock; `useAutoSync` guards its own auto path but a manual sync (or a second trigger) can overlap. [sync/syncService.ts:41-63](mobile/FarmProsperity/src/sync/syncService.ts#L41).
- **Impact:** Overlapping runs double the POST load (mitigated from *duplication* by `local_id`, but amplifies C1's race and wastes scarce bandwidth).
- **Fix:** Module-level in-flight promise in `syncService` so concurrent calls share one run.

### H9 — Photo URIs may point at purgeable cache dir
- **Severity:** High
- **Problem:** Captured photo URIs are stored as-is in `*_photos_json`; image-picker camera output often lands in app cache. Android can purge cache under storage pressure before a long-deferred sync runs.
- **Impact:** Sync fails with file-not-found; the photo is unrecoverable without re-entering the record — silent data loss for long offline sessions.
- **Fix:** Copy captured images into a persistent app dir (e.g. `DocumentDirectory`) on capture; store that path. Verify file existence before sync and surface a clear error if missing.

---

# Medium Severity Issues

- **M1 — Missing DB indexes.** No `db_index`/`Meta.indexes` on hot filter fields (`executive`, `submitted_by`, `created_by`, `local_id`, `submitted_at`, `date`). Table scans as data grows. *Fix:* add indexes (additive migration).
- **M2 — GPS not range-validated.** Lat/long accepted as raw floats; no `[-90,90]/[-180,180]` check before `Point(lng,lat)`. [crops/serializers.py:88](backend/crops/serializers.py#L88), [product_demo/serializers.py:90](backend/product_demo/serializers.py#L90). Bad GPS corrupts geometry. *Fix:* validate ranges in serializer.
- **M3 — Negative monetary/quantity allowed.** `arrival_quantity`, `avg/min/max_rate` are `DecimalField` with no positivity validators. [mandi/models.py:50-65](backend/mandi/models.py#L50). Corrupts aggregates/reports. *Fix:* `MinValueValidator(0)` / validate min≤avg≤max.
- **M4 — Cloudinary public unsigned URLs.** Media backend serves public URLs; farmer/demo photos (potential PII) are readable by anyone with the link. [settings.py:192-200](backend/fps_backend/settings.py#L192). *Fix:* private delivery / signed URLs, or accept-and-document the exposure.
- **M5 — Multi-instance startup race.** Docker CMD runs `migrate`+seed on every boot; if Render autoscales >1 instance they race on the shared Neon DB. [Dockerfile](backend/Dockerfile). *Fix:* move migrate/seed to a Render pre-deploy/release command, not per-container start.
- **M6 — No `ATOMIC_REQUESTS` / per-request transaction net.** Multi-step writes (visit + nested crops + photos) aren't request-atomic. *Fix:* serializers already use `transaction.atomic()` for nested creates; consider `ATOMIC_REQUESTS=True` as a safety net.
- **M7 — `complete-after` not idempotent on retry.** Product-demo after-update deletes+recreates after-photos without a guard; a retried-after-success call re-clobbers. [product_demo/views.py](backend/product_demo/views.py). *Fix:* short-circuit if already `completed`/phase guard.
- **M8 — Uncommitted migration + seed drift.** `mandi/migrations/0004_replace_mandi_list.py` (untracked) and `seed_data.py`/`seedReferenceData.ts` (unstaged) aren't committed — deploys won't pick them up; mandi list stays stale. *Fix:* review what 0004 deletes/replaces, then commit deliberately.
- **M9 — Release build hardening.** ProGuard/minify disabled; release signing depends on an external `keystore.properties` with no presence check. *Fix:* enable & test ProGuard; document keystore handling for CI.
- **M10 — Double-tap submit race.** Submit guards via `disabled={submitting}` but a fast double-tap before re-render can create two local records (they dedupe server-side via `local_id`, but show as dup locally). *Fix:* debounce / ref-guard the handler.

---

# Low Severity Issues

- **L1 — Health endpoint subject to `SECURE_SSL_REDIRECT`.** [urls.py:12-17](backend/fps_backend/urls.py#L12). HTTP probes get 301; fine if Render uses HTTPS/follows redirects. *Fix:* exempt if probes fail.
- **L2 — `conn_max_age=600` vs Neon connection ceiling.** Safe at 3 workers; risky if autoscaled. Monitor.
- **L3 — WatermelonDB migrations listed out of order.** Harmless (lib sorts by `toVersion`). Reorder for readability only.
- **L4 — Schema inconsistencies.** `mobile_number` length (10 vs 15) and acreage `decimal_places` (2 vs 4) differ across models; `demo_result` optional-vs-required mismatch between v3 migration and schema (cosmetic — WDB stores nullable).
- **L5 — `approval_status` field exists but no workflow.** Present/serialized but never transitioned; either implement approval or stop exposing it.
- **L6 — `.env.example` ships a real-looking dev password** (`DB_PASSWORD=kushagra123`). Replace with a generic placeholder; confirm no real secret is in committed `.env`.

---

# Infrastructure Audit
- **Render:** Docker runtime, Singapore, `starter`, `autoDeploy: true`. Startup runs migrate/collectstatic/createsuperuser/seed then gunicorn (3 workers, 120s timeout). Risk: per-container migrate/seed on shared DB (M5); aborts boot on failed migrate (good — fixed in 0a7b1c1).
- **Neon (Postgres+PostGIS):** `conn_max_age=600`, engine overridden to `postgis`. PostGIS extension must pre-exist (H7). Connection ceiling fine single-instance (L2).
- **Cloudinary:** Storage switches on `CLOUDINARY_URL` presence (good local fallback). Public URLs (M4).
- **PostGIS:** Genuinely used (`PointField` storage); no spatial queries → no GiST index needed yet. Keep GDAL.
- **Settings:** Prod security headers correctly gated on `not DEBUG`; `SECRET_KEY`/`ALLOWED_HOSTS` fail-fast in prod (good). Missing: `LOGGING` (H2), monitoring, pagination default (H1).
- **Secrets:** `sync: false` for secrets in `render.yaml` (good). Audit `.env`/`.env.example` (L6).

# Mobile Reliability Audit
- Lifecycle: offline session restore from cached user is a strong pattern (authStore). Gaps: no ErrorBoundary (C3), no AppState sync (H3).
- Sync resilience: per-record failure isolation + stable `local_id` (good); no global mutex (H8), refresh stampede (C2).
- Image handling: no compression (H4), cache-dir persistence risk (H9).
- Permissions: Android 13+ `READ_MEDIA_IMAGES` and dual fine/coarse location handled correctly (good).
- Rendering: FlatList + `keyExtractor` used (good).
- Build: ProGuard off, external keystore (M9); production API URL correctly hardcoded for release.

# Offline Sync Audit
- Idempotency design (client `local_id` + DB unique constraint) is correct in principle; the **commit is racy** (C1).
- Retry: per-record, persists `syncError`; no exponential backoff (acceptable, but pairs badly with C1 loop).
- Conflict resolution: last-write-wins via server; `complete-after` retry clobbers (M7).
- WatermelonDB schema/migrations consistent and additive; out-of-order list cosmetic (L3).

# Security Audit
- JWT: 12h access / 30d refresh, rotation on. **No blacklist/logout** (H6). No custom claims leakage observed.
- RBAC: `IsStaffUser` gate on admin portal (reasonable); object-level scoping via `get_queryset` mostly correct **except** H5 bypasses.
- Mass assignment: server sets `executive`/`submitted_by`/`created_by`/`role` server-side; register hardcodes role (verified safe).
- Media exposure: public Cloudinary URLs (M4).
- Token storage: `AsyncStorage` (acceptable for RN; not hardware-backed — note for high-sensitivity later).

# Database & Scalability Audit
- Indexes: missing on hot fields (M1).
- N+1: admin list serializers call `.count()`/`values_list()` per row — verify `prefetch_related` covers them.
- Pagination: missing on most list endpoints (H1).
- Transactions: nested creates atomic; no `ATOMIC_REQUESTS` (M6).
- Growth: unbounded lists + no indexes are the main scaling risks.

# Deployment Audit
- Startup safety: good — failed migrate now aborts boot. Risk: per-instance migrate/seed (M5), PostGIS prereq (H7).
- Migrations: uncommitted 0004 (M8); otherwise additive.
- Rollback: no documented rollback/backup runbook (DR score 3).

---

# Prioritized Fix Roadmap

## Phase 1 — Immediate Production Blockers (before any rollout)
1. **C1 Idempotency race** → `get_or_create`/`atomic`+catch `IntegrityError`. Risk: sync 500 loop. Impact: stops the worst-network failure mode.
2. **H1 Pagination default** → global `MobilePagination`. Risk: unbounded responses. Impact: bounded memory/latency.
3. **H2 Logging + error tracking** → `LOGGING` + Sentry DSN env. Risk: blind prod. Impact: visibility/MTTR.
4. **H7 PostGIS extension** → `CreateExtension` migration or documented Neon step. Risk: fresh-DB deploy fails. Impact: reproducible deploys.
5. **H5 Authz leak** → route `yoy_comparison`/`summary` through `get_queryset()`. Risk: cross-tenant read. Impact: closes IDOR.
6. **C2 Refresh single-flight** *(mobile, needs rebuild+test)* → shared refresh promise. Impact: no spurious logout.
7. **C3 ErrorBoundary** *(mobile)* → wrap navigator. Impact: no white-screen crash.

## Phase 2 — High-Risk Stability (before scaling users)
- **H3** AppState sync trigger *(mobile)* • **H4** image compression *(mobile)* • **H8** sync mutex *(mobile)* • **H9** persistent photo dir *(mobile)* • **H6** token blacklist + logout • **M1** DB indexes.

## Phase 3 — Reliability Hardening
- **M2** GPS validation • **M3** positive-value validation • **M5** move migrate/seed off per-container start • **M6** `ATOMIC_REQUESTS` • **M7** idempotent `complete-after` • **M8** commit/seed hygiene • **M10** double-tap guard.

## Phase 4 — Performance, Security & Scalability
- N+1 audit on admin serializers • **M4** signed media URLs • **M9** ProGuard/release hardening • **L1/L2** probe + connection tuning • **L4/L5/L6** schema/secret cleanup • DR runbook (backups, rollback).

---

# Verification (of the report itself)
- False positives already eliminated by direct file reads: register role-escalation, WatermelonDB migration-order corruption, "remove unused PostGIS."
- Each issue cites a verified `file:line`. No code is changed by this report.
- On approval: write this document to `docs/PRODUCTION_AUDIT.md`. No other edits.

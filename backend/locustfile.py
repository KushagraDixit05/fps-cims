"""
FPS RBAC Performance Test Suite
================================
Locust load testing for the FPS RBAC system (Phase 8).

Scenarios:
  PermissionResolutionUser  — mobile login → GET /api/auth/me/ (exercises JWT
                              decode, permission cache, and DB fallback).
  ApprovalQueueUser         — login as checker → GET /api/approvals/queue/
                              (exercises approval queryset + permission filter).
  AdminPortalUser           — login as admin → GET /api/admin/users/ + audit log
                              (exercises IsAdminPortalUser + admin queryset).

Usage:
  # Install locust (dev deps):
  pip install -r requirements-dev.txt

  # Run against local dev server (requires Django + Postgres + Redis running):
  locust -f locustfile.py --host=http://localhost:8000

  # Headless run (100 concurrent users, 10/s spawn rate, 60s):
  locust -f locustfile.py --host=http://localhost:8000 \
    --headless -u 100 -r 10 --run-time 60s

Targets from the Phase 8 spec:
  - Permission resolution under load (cache hit path < 10ms p95)
  - Approval queue at 10,000 pending items (< 500ms p95)
  - Audit log writes non-blocking (request cycle unaffected)
"""
import random

from locust import HttpUser, between, task

# ---------------------------------------------------------------------------
# Credentials — override these with env vars or a locust config file before
# running against a real environment.
# ---------------------------------------------------------------------------
MOBILE_USER = {"username": "field_exec_1", "password": "password123"}
CHECKER_USER = {"username": "checker_1",    "password": "password123"}
ADMIN_USER   = {"username": "admin",         "password": "adminpass123"}


class PermissionResolutionUser(HttpUser):
    """
    Simulates a field executive hitting the /api/auth/me/ endpoint after login.
    Each iteration exercises JWT validation + PermissionService (cache hit path
    after the first request per user session).
    """
    weight = 5
    wait_time = between(0.5, 2)

    def on_start(self):
        resp = self.client.post(
            "/api/auth/login/",
            json=MOBILE_USER,
            name="[setup] mobile login",
        )
        if resp.status_code == 200:
            self._token = resp.json().get("access")
        else:
            self._token = None

    @task(3)
    def get_profile(self):
        if not self._token:
            return
        self.client.get(
            "/api/auth/me/",
            headers={"Authorization": f"Bearer {self._token}"},
            name="GET /api/auth/me/",
        )

    @task(1)
    def refresh_token(self):
        """Trigger a token refresh — exercises blacklist check."""
        if not self._token:
            return
        resp = self.client.post(
            "/api/auth/login/",
            json=MOBILE_USER,
            name="POST /api/auth/login/ (re-login)",
        )
        if resp.status_code == 200:
            self._token = resp.json().get("access")


class ApprovalQueueUser(HttpUser):
    """
    Simulates a checker polling the approval queue.
    Target: queue endpoint with 10,000 pending items should respond < 500ms p95.
    """
    weight = 2
    wait_time = between(1, 5)

    def on_start(self):
        resp = self.client.post(
            "/api/auth/login/",
            json=CHECKER_USER,
            name="[setup] checker login",
        )
        if resp.status_code == 200:
            self._token = resp.json().get("access")
        else:
            self._token = None

    @task(4)
    def get_queue(self):
        if not self._token:
            return
        self.client.get(
            "/api/approvals/queue/",
            headers={"Authorization": f"Bearer {self._token}"},
            name="GET /api/approvals/queue/",
        )

    @task(1)
    def get_history(self):
        if not self._token:
            return
        self.client.get(
            "/api/approvals/history/",
            headers={"Authorization": f"Bearer {self._token}"},
            name="GET /api/approvals/history/",
        )


class AdminPortalUser(HttpUser):
    """
    Simulates an admin user driving the admin portal.
    Uses the Phase 8 scoped login endpoint (/api/admin/auth/login/)
    which issues aud='fps-admin' tokens validated by IsAdminPortalUser.
    """
    weight = 1
    wait_time = between(2, 8)

    def on_start(self):
        resp = self.client.post(
            "/api/admin/auth/login/",
            json=ADMIN_USER,
            name="[setup] admin login (scoped)",
        )
        if resp.status_code == 200:
            self._token = resp.json().get("access")
        else:
            self._token = None

    def _headers(self):
        return {"Authorization": f"Bearer {self._token}"} if self._token else {}

    @task(3)
    def list_users(self):
        self.client.get(
            "/api/admin/users/",
            headers=self._headers(),
            name="GET /api/admin/users/",
        )

    @task(2)
    def list_approvals(self):
        self.client.get(
            "/api/admin/approvals/",
            headers=self._headers(),
            name="GET /api/admin/approvals/",
        )

    @task(2)
    def view_audit_log(self):
        self.client.get(
            "/api/admin/audit/",
            headers=self._headers(),
            name="GET /api/admin/audit/",
        )

    @task(1)
    def view_sync_monitor(self):
        self.client.get(
            "/api/admin/sync/",
            headers=self._headers(),
            name="GET /api/admin/sync/",
        )

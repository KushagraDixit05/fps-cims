# Scalability Architecture

---

## 1. Database Indexing Strategy

All indexes are defined in `01-DATABASE-SCHEMA.md`. Key patterns:

### Partial Indexes for Filtered Queries

Most high-traffic queries hit active records only:

```sql
-- Only index active users — inactive users are excluded from most queries
CREATE INDEX idx_user_active_role ON accounts_user(primary_role_id)
    WHERE is_active = TRUE;

-- Only pending approvals need to be fast — completed ones are archival
CREATE INDEX idx_approval_pending ON workflow_approvalinstance(current_approver_id, status)
    WHERE status IN ('submitted', 'under_review', 'resubmitted');
```

### GIN Index for JSONB Districts

```sql
-- user.districts is queried as "district IN user.districts"
CREATE INDEX idx_user_districts ON accounts_user USING GIN(districts);
```

### Composite Indexes for Common Joins

```sql
-- Audit log queries almost always filter by actor + time
CREATE INDEX idx_audit_actor_time ON audit_auditlog(actor_id, created_at DESC);
```

---

## 2. Permission Caching

### Current Design (Phase 1–2)

Redis with per-user keys, 5-minute TTL. Sufficient for up to ~5,000 concurrent users with default Redis configuration.

### Scale-Up Path

When Redis becomes a bottleneck (unusual load pattern), use a two-layer cache:

```
Layer 1: In-process cache (Python `functools.lru_cache` or `cachetools.TTLCache`)
    TTL: 60 seconds
    Capacity: 1,000 entries per process
    Purpose: Eliminate Redis round-trips for repeated requests from same user
    
Layer 2: Redis
    TTL: 5 minutes
    Purpose: Shared cache across all worker processes
    
Layer 3: PostgreSQL
    Purpose: Source of truth
```

```python
from cachetools import TTLCache
from threading import Lock

_local_cache = TTLCache(maxsize=1000, ttl=60)
_local_cache_lock = Lock()

class PermissionService:
    @classmethod
    def get_user_permissions(cls, user) -> set[str]:
        cache_key = f"fps:perms:{user.id}"
        
        # Layer 1: in-process
        with _local_cache_lock:
            if cache_key in _local_cache:
                return set(_local_cache[cache_key])
        
        # Layer 2: Redis
        cached = redis_cache.get(cache_key)
        if cached:
            result = set(cached)
            with _local_cache_lock:
                _local_cache[cache_key] = list(result)
            return result
        
        # Layer 3: DB
        perms = cls._resolve_from_db(user)
        redis_cache.set(cache_key, list(perms), timeout=300)
        with _local_cache_lock:
            _local_cache[cache_key] = list(perms)
        return perms
```

---

## 3. Database Connection Pooling

```python
# settings.py
DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        # ...
        'CONN_MAX_AGE': 600,        # keep connections alive 10 minutes
        'OPTIONS': {
            'pool': {
                'min_size': 2,
                'max_size': 10,    # per worker process
                'max_idle': 300,
            }
        }
    }
}
```

Or use PgBouncer in transaction pooling mode outside Django. At 50+ Gunicorn workers this is essential.

---

## 4. Async Processing

### What Must Be Sync (blocking)

- Authentication + token issuance
- Permission checks (Redis hit — microseconds)
- Data reads

### What Can Be Async (Celery)

- Audit log writes
- Push notifications (FCM calls)
- Approval escalation checks
- Report generation (CSV export)
- Email sending
- Bulk user operations (deactivate 500 FEs in a region)

```python
# Audit writes — fire and forget
write_audit_log_async.delay(payload)   # Celery task

# Report generation — user waits for download link
generate_report_async.apply_async(
    args=[report_params],
    countdown=0,
    link=notify_user_report_ready.s(user_id),  # callback task
)
```

---

## 5. QuerySet Optimization

### Select Related for Common API Responses

```python
# Don't do N+1 queries in approval queue
ApprovalInstance.objects.filter(
    status__in=['submitted', 'under_review']
).select_related(
    'workflow',
    'submitted_by',
    'submitted_by__primary_role',
    'current_approver',
).prefetch_related(
    'approvalaction_set',
)
```

### Analytics Queries — Aggregation in DB

Never pull raw records to Python and aggregate there. Push aggregation to PostgreSQL:

```python
from django.db.models import Count, Avg, F, ExpressionWrapper, DurationField
from django.db.models.functions import TruncWeek

analytics = (
    ApprovalInstance.objects
    .filter(status='approved', approved_at__isnull=False)
    .annotate(week=TruncWeek('submitted_at'))
    .values('week')
    .annotate(
        total=Count('id'),
        avg_hours=Avg(
            ExpressionWrapper(
                F('approved_at') - F('submitted_at'),
                output_field=DurationField(),
            )
        ),
    )
    .order_by('-week')
)
```

---

## 6. Approval Queue Pagination

The approval queue can grow to thousands of pending items during busy harvest periods. Always paginate:

```python
class ApprovalQueueView(generics.ListAPIView):
    pagination_class = CursorPagination   # cursor > offset for large datasets
    page_size = 25

    def get_queryset(self):
        return (
            ApprovalInstance.objects
            .filter(
                status__in=['submitted', 'under_review', 'resubmitted'],
                workflow__approver_role_codes__contains=[self.request.user.primary_role.code],
            )
            .filter_by_user_regions(self.request.user)   # custom queryset method
            .select_related('submitted_by', 'workflow')
            .order_by('submitted_at')   # oldest first = FIFO queue
        )
```

**Cursor pagination** (not offset) is required here because:
- Offset pagination re-scans from the beginning every page — O(n) at deep pages
- Cursor pagination uses an indexed column as anchor — O(1) regardless of depth

---

## 7. Horizontal Scaling

### Backend Workers

Django is stateless after the Redis cache is introduced. Scale horizontally with Gunicorn + Nginx:

```
Nginx (load balancer)
    → Gunicorn worker 1 (Django)
    → Gunicorn worker 2 (Django)
    → Gunicorn worker N (Django)
    
All workers share:
    → PostgreSQL (one primary, optional read replicas)
    → Redis (permission cache + Celery broker)
```

### Read Replicas for Analytics

Heavy analytics queries should not hit the primary DB:

```python
DATABASES = {
    'default': { ... },      # writes
    'readonly': { ... },     # analytics replica — same schema
}

class AnalyticsView(APIView):
    def get(self, request):
        # Route heavy queries to read replica
        data = AnalyticsQueryService.run(using='readonly')
        return Response(data)
```

### Celery Workers

Scale Celery workers independently from Django workers:

```yaml
# docker-compose.yml
  celery-worker:
    build: ./backend
    command: celery -A fps_backend worker --concurrency=4 -Q default,notifications
    scale: 3   # 3 instances × 4 concurrency = 12 tasks parallel
    
  celery-beat:
    build: ./backend
    command: celery -A fps_backend beat   # single instance for cron
```

---

## 8. Audit Log Archival

At 10,000 audit entries/day (large deployment), the audit table grows by ~3.6M rows/year. Manage this:

```sql
-- Phase 1: Monthly partitions (add when daily volume > 5000)
CREATE TABLE audit_auditlog_2026_06 
    PARTITION OF audit_auditlog
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

-- Phase 2: Archive old partitions to S3 using pg_dump
-- Detach the partition, dump to S3, drop from PostgreSQL
ALTER TABLE audit_auditlog DETACH PARTITION audit_auditlog_2024_01;
```

---

## 9. Future SaaS Considerations

If FPS evolves into a multi-tenant SaaS platform:

### Organization Model

```python
class Organization(models.Model):
    id   = models.UUIDField(primary_key=True)
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)  # "fps-maharashtra", "fps-telangana"
    # ...

# Add organization FK to: User, Role, Region, ApprovalWorkflow
# All queries gain WHERE organization_id = current_tenant filter
```

### Tenant Isolation Strategy

Use **schema-per-tenant** (PostgreSQL schemas) for strong isolation, or **row-level tenancy** (simpler but requires discipline in every query). Row-level is recommended for a modest number of tenants (<100). Schema-per-tenant for large enterprise.

### Role Portability

Preset roles are defined at the organization level. When onboarding a new organization, seed their role table with defaults. They can then customize — changes to their roles don't affect other tenants.

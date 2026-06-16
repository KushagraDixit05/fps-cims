# FPS Platform — Cloud Deployment Plan

**Version:** 1.1  
**Date:** June 2026  
**Author:** Kushagra Dixit  
**Status:** Draft

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Architecture](#2-current-architecture)
3. [Cloud Platform Comparison](#3-cloud-platform-comparison)
4. [Recommended Architecture](#4-recommended-architecture)
5. [Deployment Strategy Options](#5-deployment-strategy-options)
6. [Recommended Path for This Project](#6-recommended-path-for-this-project)
7. [Migration Plan](#7-migration-plan)
8. [Security Checklist](#8-security-checklist)
9. [Monitoring & Maintenance](#9-monitoring--maintenance)
10. [Cost Estimation](#10-cost-estimation)
11. [Final Recommendation](#11-final-recommendation)

---

## 1. Executive Summary

### Recommendation: AWS — Option D (Full AWS Stack, Company-Owned)

**Platform:** Amazon Web Services (AWS)  
**Deployment model:** Docker Compose on EC2, with all supporting services (database, media, admin portal) on AWS

### Why AWS?

- The manager has already provisioned an EC2 instance, making AWS the pragmatic choice.
- AWS has the widest ecosystem support for every component this project needs: RDS with PostGIS, ElastiCache (Redis), S3, CloudFront, ACM (free SSL), Route53, and CloudWatch.
- AWS is the most documented cloud platform for Django + PostgreSQL deployments, making troubleshooting easier.
- The team's existing theoretical familiarity is with AWS concepts, reducing the learning curve.
- All services can be owned, billed, and managed under a single company AWS account — no dependency on personal intern accounts.

### Why Not Option A (with free tiers)?

The current free-tier services (Neon, Cloudinary, Vercel) are on the intern's personal accounts. The company cannot take over these accounts on handoff. Business continuity requires the company to own all infrastructure.

### Tradeoffs

| Factor | AWS | Azure | GCP |
|---|---|---|---|
| Familiarity | Best (team's background) | Lower | Lower |
| PostGIS on managed DB | RDS supports it natively | Azure DB for PostgreSQL supports it | Cloud SQL supports it |
| Cost at small scale | Cheapest option | Higher baseline | Comparable to AWS |
| Documentation quality | Best | Good | Good |
| Ecosystem for Django | Largest community | Smaller | Smaller |
| Existing infra | EC2 already exists | None | None |

### Immediate Action

Deploy Option D — full AWS stack under the company's AWS account. This is the only path that ensures the company retains full control of data and infrastructure after the internship ends.

---

## 2. Current Architecture

### What Is Running Now

```
Internet
    │
    ├── Mobile App (React Native)
    │       └── calls API → Render (Django backend)
    │
    ├── Browser (admin users)
    │       └── visits admin portal → Vercel (Next.js)
    │
    └── Render (Django backend)
            ├── reads/writes → Neon (PostgreSQL + PostGIS)
            └── uploads/serves media → Cloudinary
```

### Component Breakdown

| Component | Provider | Plan | Notes |
|---|---|---|---|
| Django API backend | Render | Starter ($7/mo or free) | Docker deployment, autodeploy on push to `main` |
| PostgreSQL + PostGIS | Neon | Free tier | Serverless, connection pooling enabled |
| Media storage | Cloudinary | Free tier | Durable photo storage |
| Admin portal | Vercel | Hobby (free) | Next.js 16, zero-config deployment |
| CI/CD | GitHub Actions | Free tier | Weekly DB backup only |
| SSL/TLS | Render (auto) | Included | Edge proxy terminates TLS |

### Current Limitations

**Render (backend):**
- Free/Starter plan spins down after 15 minutes of inactivity — cold start delays of 30–60 seconds affect mobile users.
- Ephemeral filesystem — no persistent disk; media files cannot be stored locally (hence Cloudinary).
- Limited to 512 MB RAM on Starter plan; Celery workers cannot run alongside gunicorn.
- No SSH access for debugging.
- Autoscaling is unavailable on lower plans.
- Deployments can take 3–5 minutes.

**Neon (database):**
- Free tier has compute limits and auto-suspends after 5 minutes of inactivity.
- Not suitable for production workloads that require consistent low-latency queries.
- PostGIS works but is an extension that must be enabled per database.

**Cloudinary:**
- Free tier has 25 GB storage and 25 GB monthly bandwidth.
- Vendor lock-in for media delivery.
- No fine-grained access control on media URLs.

**Vercel (admin portal):**
- No significant limitations for a Next.js app of this size.
- Free Hobby plan is sufficient technically.
- **Critical issue:** Vercel account is registered to the intern's personal email. The company cannot take ownership of a Vercel Hobby account — it must be migrated to a company-owned hosting solution.

**Ownership risk (all services):**
All four services (Render, Neon, Cloudinary, Vercel) are registered to the intern's personal accounts. When the internship ends, the company loses access to the database, media files, API server, and admin portal. This is the primary driver for migrating everything to the company's own AWS account.

---

## 3. Cloud Platform Comparison

### Comparison Table: AWS vs Azure vs GCP (for this project)

| Category | AWS | Azure | GCP |
|---|---|---|---|
| **Existing infra** | EC2 already provisioned | None | None |
| **Team familiarity** | Highest | Low | Low |
| **Learning curve** | Lowest (for this team) | High | Medium |
| **Managed PostgreSQL + PostGIS** | RDS for PostgreSQL (PostGIS extension available) | Azure Database for PostgreSQL (PostGIS via extension) | Cloud SQL for PostgreSQL (PostGIS available) |
| **Managed Redis** | ElastiCache | Azure Cache for Redis | Cloud Memorystore |
| **Object storage** | S3 (industry standard) | Azure Blob Storage | Cloud Storage |
| **Container support** | ECS, EKS, EC2 Docker | ACI, AKS, VMs | Cloud Run, GKE, GCE |
| **Serverless containers** | ECS Fargate | Azure Container Apps | Cloud Run |
| **CDN** | CloudFront | Azure CDN | Cloud CDN |
| **SSL certs** | ACM (free, auto-renew) | App Service certs ($69/yr) | Certificate Manager |
| **DNS** | Route53 ($0.50/zone/mo) | Azure DNS | Cloud DNS |
| **Monitoring/logs** | CloudWatch (free tier) | Azure Monitor | Cloud Logging/Monitoring |
| **Secrets management** | AWS Secrets Manager or SSM Parameter Store | Azure Key Vault | Secret Manager |
| **Estimated monthly cost (MVP)** | $15–20 | $25–35 | $20–30 |
| **Estimated monthly cost (production)** | $45–80 | $70–110 | $55–90 |
| **Free tier generosity** | Best | Moderate | Good |
| **Community/Django resources** | Largest | Smaller | Medium |
| **Vendor docs quality** | Excellent | Good | Good |
| **Scaling** | Flexible (EC2→ECS→EKS) | Flexible | Excellent (Cloud Run) |
| **PostGIS in managed DB** | Supported on RDS PostgreSQL 13+ | Supported | Supported |
| **India region availability** | `ap-south-1` (Mumbai) | Central India | Mumbai |
| **Verdict** | **Best fit** | Overkill / unfamiliar | Good but no existing infra |

### Why Not Azure?

- No existing infrastructure.
- Higher baseline cost.
- More complex IAM model (Active Directory concepts).
- Django community support is smallest here.

### Why Not GCP?

- No existing infrastructure.
- Cloud Run (serverless containers) is excellent but requires rethinking the deployment model.
- GCP is a strong long-term option but switching now adds overhead with no clear benefit.
- Team familiarity is lowest with GCP tooling.

---

## 4. Recommended Architecture

### Production Architecture Diagram

```
                           ┌─────────────────────────────────────┐
                           │              AWS Cloud               │
                           │                                      │
  Mobile App   ──HTTPS──►  │  ┌─────────────────────────────┐   │
  (React Native)           │  │     EC2 Instance             │   │
                           │  │   (t3.small, ap-south-1)     │   │
  Browser      ──HTTPS──►  │  │                              │   │
  (Admin Portal)           │  │  ┌────────┐  ┌───────────┐  │   │
  (Vercel)                 │  │  │ Nginx  │  │  Django   │  │   │
                           │  │  │ :443   │  │ (Gunicorn)│  │   │
                           │  │  │ :80    │  │  :8000    │  │   │
                           │  │  └────┬───┘  └─────┬─────┘  │   │
                           │  │       │             │        │   │
                           │  │       └──────┬──────┘        │   │
                           │  │             │               │   │
                           │  │  ┌──────────▼──────────┐   │   │
                           │  │  │   Docker Compose     │   │   │
                           │  │  │   (nginx + django    │   │   │
                           │  │  │    + celery worker)  │   │   │
                           │  │  └─────────────────────┘   │   │
                           │  └─────────────────────────────┘   │
                           │           │          │              │
                           │    ┌──────▼──┐  ┌───▼────────┐    │
                           │    │   RDS   │  │ElastiCache │    │
                           │    │Postgres │  │  (Redis)   │    │
                           │    │+PostGIS │  │  (future)  │    │
                           │    └─────────┘  └────────────┘    │
                           │                                     │
                           │  ┌─────────┐   ┌───────────────┐  │
                           │  │   S3    │   │  CloudWatch   │  │
                           │  │ (media) │   │ (logs+alerts) │  │
                           │  └─────────┘   └───────────────┘  │
                           │                                     │
                           │  ┌──────────────────────────────┐  │
                           │  │  ACM (free SSL certificate)  │  │
                           │  │  Route53 (DNS)               │  │
                           │  └──────────────────────────────┘  │
                           └─────────────────────────────────────┘

   AWS Amplify (Next.js admin portal — company-owned, auto-deploy on push)
   GitHub Actions (CI/CD, deploys to EC2 via SSH)
```

### Component Decisions

#### EC2 Instance
- **Type:** `t3.small` (2 vCPU, 2 GB RAM) — sufficient for the current scale.
- **OS:** Ubuntu 24.04 LTS.
- **Region:** `ap-south-1` (Mumbai) — closest to Indian agricultural users and field executives.
- **Storage:** 20 GB gp3 EBS root volume.
- **Elastic IP:** Attach one so the IP doesn't change on instance restart.

#### Nginx (reverse proxy, running in Docker)
- Handles HTTPS termination using Let's Encrypt / ACM certificates.
- Proxies all `/api/`, `/admin/`, `/static/`, `/media/` requests to gunicorn on port 8000.
- Serves static files directly from the collected static volume.
- Handles CORS headers at the proxy layer.

#### Django + Gunicorn (Docker container)
- Already Dockerized — `backend/Dockerfile` is production-ready.
- 3 gunicorn workers (current setting in Dockerfile is good).
- Reads all config from environment variables.

#### Celery Worker (Docker container — add when needed)
- Add a `celery-worker` service to `docker-compose.yml` when background tasks are implemented.
- Shares the same Django image, different entrypoint.

#### RDS PostgreSQL + PostGIS vs Neon

**Short-term (< 3 months):** Keep Neon. It's free, already working, and PostGIS is enabled. No migration cost.

**Medium-term:** Migrate to RDS PostgreSQL 15 (`db.t3.micro`) with PostGIS extension enabled:
```sql
CREATE EXTENSION postgis;
CREATE EXTENSION postgis_topology;
```
RDS gives persistent storage, automated backups, point-in-time recovery, and Multi-AZ option. Costs ~$15/month.

#### Redis (ElastiCache)
- Add when Celery is activated.
- `cache.t3.micro` — ~$13/month.
- Used for task queuing and optionally Django cache.

#### S3 vs Cloudinary

**Short-term:** Keep Cloudinary. It's free, already working, no migration effort.

**Medium-term:** Migrate to S3 + CloudFront:
- S3 for durable object storage (~$0.023/GB/month).
- CloudFront as CDN for media delivery to field users across India.
- Requires adding `boto3` and `django-storages` to requirements.
- Better cost control and no vendor lock-in at scale.

#### SSL
- Use **Let's Encrypt via Certbot** (free, auto-renews every 90 days) — easiest for single EC2.
- Alternative: **AWS ACM** (free) if using an Application Load Balancer.

#### DNS
- Keep existing domain DNS (if any) or use **Route53** ($0.50/hosted zone/month).
- Point an `A` record to the EC2 Elastic IP.

#### Secrets Management
- **AWS SSM Parameter Store** (free tier) for secrets — avoid hardcoding in `docker-compose.yml`.
- Alternative: `.env` file on EC2, not committed to git, loaded by Docker Compose.

#### Admin Portal (AWS Amplify)
- Deploys to AWS Amplify under the company's AWS account — replaces Vercel.
- Zero-config Next.js hosting with Git-based auto-deploy, same developer experience as Vercel.
- Set `NEXT_PUBLIC_API_URL` env var in Amplify console to point to the EC2 API domain.
- Amplify provisions a free ACM SSL certificate and supports custom domains (e.g., `admin.fps-platform.in`).

---

## 5. Deployment Strategy Options

### Option A — Docker Compose on EC2

**Description:** Run all backend services (Django, Nginx, Celery) as Docker containers via Docker Compose on a single EC2 instance.

```
EC2 Instance
├── Nginx container  (port 80/443)
├── Django container (port 8000, internal)
├── Celery container (no port, internal)
└── Docker volumes
    ├── static_files/
    └── certbot_certs/
```

**Pros:**
- Cheapest option — one EC2 instance covers everything.
- Simplest operational model — one server to SSH into and debug.
- Docker Compose config is already written (`backend/docker-compose.yml`).
- Fastest time to migrate from Render — hours, not days.
- Full SSH access for debugging — unlike Render.
- Easy rollback — `git pull && docker compose up -d`.
- No AWS-specific expertise required beyond basic EC2 management.

**Cons:**
- Single point of failure — if EC2 goes down, everything goes down.
- Manual scaling — upgrading instance type requires stopping the server briefly.
- No automatic failover.
- Deployments require SSH or a simple CI script.

**Estimated monthly cost:**
- EC2 t3.small: ~$15
- RDS t3.micro (optional, otherwise Neon free): ~$15
- S3 (optional, otherwise Cloudinary free): ~$2
- Data transfer: ~$2
- **Total: $15–34/month** depending on DB/media choices

**Maintenance effort:** Low — one server, Docker Compose, straightforward operations.

**Scalability:** Vertical scaling only (upgrade instance type). Sufficient for ~10,000 API requests/day.

**Recommended use case:** Current stage of the project. Internship projects, early-stage production, teams without dedicated DevOps.

---

### Option B — ECS Fargate

**Description:** Run containers as managed serverless tasks on AWS ECS with Fargate compute. No EC2 instances to manage.

```
Application Load Balancer (ALB)
    └── ECS Service (Fargate)
        ├── Django task (1–N replicas, auto-scaled)
        └── Celery task (1–N replicas)
RDS + ElastiCache + S3 (same as Option A)
```

**Pros:**
- No EC2 instance management — AWS handles the underlying compute.
- Auto-scaling built in — scales up on high traffic, scales down to save cost.
- High availability — multiple tasks running across availability zones.
- Better for production workloads with variable traffic.
- Zero-downtime deployments via rolling updates.
- Integrates natively with ECR, ALB, CloudWatch, and Secrets Manager.

**Cons:**
- Higher cost — Fargate pricing is per vCPU/hour and per GB/hour.
- More complex setup — ECS task definitions, IAM roles, ECR registry, ALB.
- Harder to debug — no SSH; must use ECS Exec or CloudWatch logs.
- Requires understanding ECS concepts (task definitions, services, clusters).
- Build pipeline must push Docker images to ECR.

**Estimated monthly cost:**
- ALB: ~$16
- ECS Fargate (1 task, 0.25 vCPU, 0.5 GB): ~$8
- RDS t3.micro: ~$15
- ElastiCache t3.micro: ~$13
- S3: ~$2
- ECR storage: ~$1
- **Total: ~$55–75/month**

**Maintenance effort:** Medium — managed compute, but ECS/ECR/IAM adds complexity.

**Scalability:** Excellent — automatic horizontal scaling from 1 to N tasks.

**Recommended use case:** When the project has consistent production traffic, a dedicated DevOps person, or the team wants to grow into AWS-native tooling.

---

### Option C — Kubernetes (EKS)

**Description:** Run the entire backend on AWS EKS (managed Kubernetes), with Helm charts for service definitions.

**Pros:**
- Enterprise-grade orchestration.
- Maximum scalability and flexibility.
- Portable — Kubernetes manifests work across cloud providers.
- Advanced features: rolling updates, canary deployments, service mesh.

**Cons:**
- Significant operational overhead — Kubernetes is complex to operate.
- EKS control plane costs $0.10/hour (~$73/month) just for the cluster, before any nodes.
- Requires Kubernetes expertise that is rare and expensive.
- Complete overkill for a project with < 100 concurrent users.
- Setup time: days to weeks.
- Debugging requires kubectl expertise.

**Estimated monthly cost:**
- EKS control plane: ~$73
- EC2 worker nodes (2× t3.medium): ~$60
- RDS, ElastiCache, S3, ALB: ~$50
- **Total: $180–220/month minimum**

**Maintenance effort:** Very high.

**Scalability:** Maximum possible.

**Recommended use case:** Large-scale production with dedicated SRE/DevOps team, 10+ microservices, enterprise compliance requirements. Not suitable for this project at its current stage.

---

### Option D — Full AWS Stack (Company-Owned) ✅ Recommended

**Description:** Same Docker Compose deployment as Option A on EC2, but every supporting service is replaced with an AWS-native equivalent under the company's AWS account. No dependency on third-party managed services registered to personal accounts.

```
AWS Account (Company-Owned)
│
├── EC2 t3.small (ap-south-1)
│   ├── Nginx container        (port 80/443)
│   ├── Django container       (port 8000, internal)
│   └── Celery container       (add when needed)
│
├── RDS db.t3.micro            (PostgreSQL 15 + PostGIS)
├── S3 bucket                  (media uploads + static files)
├── CloudFront distribution    (CDN for S3 media)
├── AWS Amplify                (Next.js admin portal)
├── ElastiCache t3.micro       (Redis — add when Celery activated)
├── ACM certificate            (free SSL, auto-renews)
├── Route53 hosted zone        (DNS for API + admin domains)
├── SSM Parameter Store        (secrets — no .env files on disk)
└── CloudWatch                 (logs, metrics, billing alerts)
```

**Why this is different from Option A:**

| Service | Option A | Option D |
|---|---|---|
| PostgreSQL | Neon (intern's account) | RDS (company AWS account) |
| Media storage | Cloudinary (intern's account) | S3 (company AWS account) |
| Admin portal | Vercel (intern's account) | AWS Amplify (company AWS account) |
| Backend | EC2 (company AWS account) | EC2 (company AWS account) |

**Pros:**
- Company owns 100% of infrastructure — no vendor accounts to transfer on handoff.
- Single AWS console, single bill, single IAM for all services.
- RDS gives automated backups, PITR, and consistent latency vs. Neon's serverless cold starts.
- S3 + CloudFront gives durable, cost-controlled media storage with CDN delivery across India.
- AWS Amplify deploys Next.js with zero config, similar to Vercel, under the company account.
- SSM Parameter Store replaces `.env` files — secrets are managed centrally and not stored on disk.
- Scales the same way as Option A (vertical EC2 upgrade) until ECS is needed.

**Cons:**
- Costs ~$40–50/month vs. ~$10/month with free tiers.
- Requires migrating existing data from Neon → RDS and media from Cloudinary → S3.
- Requires small code change: swap `django-cloudinary-storage` for `django-storages` with S3.

**Estimated monthly cost (50–100 users):**

| Service | Monthly |
|---|---|
| EC2 t3.small | ~$15 |
| RDS db.t3.micro | ~$15 |
| S3 (20 GB media + requests) | ~$2 |
| CloudFront (50 GB transfer) | ~$4 |
| AWS Amplify (admin portal) | ~$1 |
| Route53 (1 hosted zone) | ~$0.50 |
| ACM (SSL) | $0 |
| SSM Parameter Store | $0 (free tier) |
| CloudWatch | ~$0 (free tier) |
| Data transfer | ~$3 |
| **Total** | **~$40–50/month** |

**Maintenance effort:** Low — same as Option A operationally. One EC2 instance, Docker Compose, SSH access. AWS Amplify and RDS are fully managed.

**Scalability:** Same as Option A — vertical EC2 scaling. RDS and Amplify scale independently without touching EC2.

**Recommended use case:** This project, at 50–100 users, where the company must own all infrastructure and the internship is ending. The clean handover path.

---

## 6. Recommended Path for This Project

### Now: Option D (Full AWS Stack — Company-Owned)

**Rationale:**

The primary constraint is not cost or complexity — it is ownership. All current free-tier services (Neon, Cloudinary, Vercel) are registered under the intern's personal accounts. The company has 50–100 active users and cannot afford to lose access to the database, media files, or admin portal when the internship ends.

Option D resolves this cleanly: every service runs under the company's AWS account.

**Services to run on the company's AWS account:**

| Service | AWS Replacement | Notes |
|---|---|---|
| Django API (Render) | EC2 + Docker Compose | Already Dockerized, direct lift-and-shift |
| PostgreSQL (Neon) | RDS db.t3.micro + PostGIS | Migrate data with `pg_dump` / `pg_restore` |
| Media storage (Cloudinary) | S3 + CloudFront | Requires `django-storages` swap (small code change) |
| Admin portal (Vercel) | AWS Amplify | Zero-config Next.js hosting, similar to Vercel |
| Redis (not yet active) | ElastiCache t3.micro | Add when Celery is activated |

**Setup priority:**

1. **EC2 + Nginx + Docker Compose** — backend goes live on EC2 first.
2. **RDS** — provision RDS, run PostGIS extension, migrate data from Neon.
3. **S3 + CloudFront** — create bucket, swap storage backend, migrate media files from Cloudinary.
4. **AWS Amplify** — connect the admin-portal Git repo, set env vars, deploy.
5. **Route53 + ACM** — DNS and SSL for both domains.
6. **SSM Parameter Store** — move all secrets off `.env` files into SSM.
7. **ElastiCache** — add when Celery implementation begins.

### Later: Option B (ECS Fargate)

Migrate to ECS Fargate when **any two of these are true:**
- Daily API requests exceed 50,000.
- Team hires a dedicated backend/DevOps engineer.
- Downtime tolerance drops below 1 hour/month.
- Celery workloads require independent scaling from the API.

The Docker images from Option D work in ECS without modification — migration is infrastructure-only, no code changes.

---

## 7. Migration Plan

### Prerequisites

- [ ] AWS account with billing set up.
- [ ] AWS CLI installed locally (`aws configure` with IAM user credentials).
- [ ] EC2 instance is running, SSH key pair is available.
- [ ] Domain name is available (e.g., `api.fps-platform.in`).
- [ ] Git access to the repository.

---

### Phase 1: EC2 Setup

#### 1.1 Connect to EC2

```bash
ssh -i your-key.pem ubuntu@<EC2_IP>
```

#### 1.2 Install dependencies on EC2

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu
newgrp docker

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Install Nginx (optional if using Docker-based Nginx)
# Certbot for SSL
sudo apt install certbot -y

# Install Git
sudo apt install git -y
```

#### 1.3 Attach an Elastic IP

In the AWS Console:
1. Go to EC2 > Elastic IPs > Allocate Elastic IP.
2. Associate it with your EC2 instance.
3. This IP will not change on restart.

---

### Phase 2: DNS Setup

#### 2.1 Point your domain to EC2

In your DNS provider (Route53 or existing registrar), add:

```
Type    Name              Value
A       api               <ELASTIC_IP>
A       www               <ELASTIC_IP>   (optional)
```

Wait for DNS propagation (5–30 minutes).

---

### Phase 3: SSL Setup (Let's Encrypt)

```bash
# On EC2, stop anything running on port 80 first
sudo certbot certonly --standalone -d api.fps-platform.in

# Certificates are stored at:
# /etc/letsencrypt/live/api.fps-platform.in/fullchain.pem
# /etc/letsencrypt/live/api.fps-platform.in/privkey.pem

# Auto-renewal (add to crontab)
0 3 * * * certbot renew --quiet
```

---

### Phase 4: Prepare Docker Compose

Create a production `docker-compose.prod.yml` on the EC2 instance:

```yaml
version: "3.9"

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - static_files:/app/staticfiles:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - django

  django:
    image: ghcr.io/<your-org>/fps-backend:latest
    expose:
      - "8000"
    volumes:
      - static_files:/app/staticfiles
    env_file:
      - .env.production
    restart: unless-stopped

  celery:
    image: ghcr.io/<your-org>/fps-backend:latest
    command: celery -A fps_backend worker -l info
    env_file:
      - .env.production
    restart: unless-stopped
    profiles:
      - celery  # only starts if explicitly enabled

volumes:
  static_files:
```

#### Nginx config (`nginx/nginx.conf`):

```nginx
server {
    listen 80;
    server_name api.fps-platform.in;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name api.fps-platform.in;

    ssl_certificate     /etc/letsencrypt/live/api.fps-platform.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.fps-platform.in/privkey.pem;

    location /static/ {
        alias /app/staticfiles/;
        expires 30d;
    }

    location / {
        proxy_pass         http://django:8000;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
}
```

---

### Phase 5: Environment Variables

Create `/home/ubuntu/fps/.env.production` on EC2 (never commit this file):

```bash
DEBUG=False
SECRET_KEY=<generate-a-new-strong-secret-key>
ALLOWED_HOSTS=api.fps-platform.in,<ELASTIC_IP>
DATABASE_URL=postgres://fps_user:password@fps-db.xxxx.ap-south-1.rds.amazonaws.com:5432/fps_production
AWS_STORAGE_BUCKET_NAME=fps-media-bucket
AWS_S3_REGION_NAME=ap-south-1
CORS_ALLOWED_ORIGINS=https://admin.fps-platform.in
DJANGO_SUPERUSER_USERNAME=admin
DJANGO_SUPERUSER_PASSWORD=<strong-password>
DJANGO_SUPERUSER_EMAIL=admin@fps-platform.in
```

> Note: No `CLOUDINARY_URL` — media now goes to S3 via IAM role on EC2 (no hardcoded AWS credentials needed).

Generate a new `SECRET_KEY`:

```python
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

---

### Phase 6: CI/CD Pipeline

Add a GitHub Actions workflow (`.github/workflows/deploy.yml`):

```yaml
name: Deploy to EC2

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build and push Docker image
        run: |
          echo ${{ secrets.GITHUB_TOKEN }} | docker login ghcr.io -u ${{ github.actor }} --password-stdin
          docker build -t ghcr.io/${{ github.repository }}/fps-backend:latest ./backend
          docker push ghcr.io/${{ github.repository }}/fps-backend:latest

      - name: Deploy to EC2
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ubuntu
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            cd ~/fps
            docker pull ghcr.io/${{ github.repository }}/fps-backend:latest
            docker compose -f docker-compose.prod.yml up -d --no-deps django
            docker compose -f docker-compose.prod.yml exec -T django python manage.py migrate --noinput
            docker compose -f docker-compose.prod.yml exec -T django python manage.py collectstatic --noinput
```

**GitHub Secrets to configure:**
- `EC2_HOST` — Elastic IP address
- `EC2_SSH_KEY` — Private SSH key content (the .pem file contents)

---

### Phase 7: First Deployment

On EC2:

```bash
cd ~/fps
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml exec django python manage.py migrate
docker compose -f docker-compose.prod.yml exec django python manage.py collectstatic --noinput
docker compose -f docker-compose.prod.yml exec django python manage.py createsuperuser
```

---

### Phase 8: Update Mobile App API URL

In the React Native app, update the production API base URL from:
```
https://fps-cims-backend.onrender.com
```
to:
```
https://api.fps-platform.in
```

Rebuild and redistribute the APK for field users.

---

### Phase 9: Deploy Admin Portal to AWS Amplify

1. In the AWS Console, go to **AWS Amplify > New App > Host a web app**.
2. Connect the GitHub repository and select the `main` branch.
3. Set the build settings (Amplify auto-detects Next.js):
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - cd admin-portal && npm ci
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: admin-portal/.next
       files:
         - '**/*'
     cache:
       paths:
         - admin-portal/node_modules/**/*
   ```
4. Add environment variables in Amplify console:
   - `NEXT_PUBLIC_API_URL=https://api.fps-platform.in`
5. Set a custom domain (e.g., `admin.fps-platform.in`) in Amplify > Domain Management — Amplify provisions ACM SSL automatically.
6. Deploy. Amplify redeploys automatically on every push to `main`.

---

### Phase 10: Cutover

1. Verify the new EC2 deployment is working correctly (test all endpoints).
2. Update DNS to point to EC2 Elastic IP (if using a custom domain).
3. Keep Render service running for 48 hours as a fallback.
4. Disable Render service once stable.

### Rollback Strategy

If the EC2 deployment fails:
1. Revert DNS to Render's domain (instant).
2. Re-enable Render autodeploy.
3. Mobile app users fall back to the previous API URL.

For Docker rollbacks:
```bash
# Roll back to previous image
docker compose -f docker-compose.prod.yml stop django
docker pull ghcr.io/<your-org>/fps-backend:<previous-tag>
docker compose -f docker-compose.prod.yml up -d django
```

---

### Phase 11: Company Handoff — Migrate Off Personal Accounts

This phase replaces the personal-account-hosted services with AWS-native equivalents. It is the critical step for Option D.

#### 11A: Migrate Database from Neon → RDS

**Step 1: Provision RDS**

In the AWS Console:
1. Go to RDS > Create database.
2. Engine: PostgreSQL 15.
3. Template: Free tier (db.t3.micro).
4. DB identifier: `fps-production`.
5. Master username: `fps_user`, generate a strong password.
6. VPC: Same VPC as EC2.
7. Public access: **No** (only accessible from EC2 within the VPC).
8. Enable automated backups (7-day retention).

**Step 2: Enable PostGIS on RDS**

```bash
# Connect to RDS from EC2
psql -h fps-db.xxxx.ap-south-1.rds.amazonaws.com -U fps_user -d fps_production

# Inside psql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
\q
```

**Step 3: Export data from Neon**

```bash
# On your local machine (with psql installed)
pg_dump \
  "postgres://user:pass@ep-xxx.neon.tech/dbname?sslmode=require" \
  --no-owner --no-privileges \
  -f fps_neon_backup.sql
```

**Step 4: Import into RDS**

```bash
# From EC2 (which has VPC access to RDS)
psql \
  -h fps-db.xxxx.ap-south-1.rds.amazonaws.com \
  -U fps_user -d fps_production \
  < fps_neon_backup.sql
```

**Step 5: Update `DATABASE_URL` in `.env.production`** and restart Django container.

---

#### 11B: Migrate Media from Cloudinary → S3

**Step 1: Create S3 bucket**

```bash
aws s3 mb s3://fps-media-bucket --region ap-south-1

# Block all public access (CloudFront will serve media, not S3 directly)
aws s3api put-public-access-block \
  --bucket fps-media-bucket \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

**Step 2: Attach IAM role to EC2 for S3 access**

In the AWS Console:
1. Go to IAM > Roles > Create role > AWS service > EC2.
2. Attach this inline policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::fps-media-bucket",
        "arn:aws:s3:::fps-media-bucket/*"
      ]
    }
  ]
}
```
3. Name the role `fps-ec2-role`.
4. Go to EC2 > Your instance > Actions > Security > Modify IAM role > attach `fps-ec2-role`.

**Step 3: Update Django to use S3 storage**

In `backend/requirements.txt`, add:
```
boto3>=1.35.0
django-storages[s3]>=1.14.0
```

Remove (or keep as fallback for dev):
```
django-cloudinary-storage
cloudinary
```

In `backend/fps_backend/settings.py`, replace the Cloudinary storage config with:
```python
# Media files → S3
DEFAULT_FILE_STORAGE = "storages.backends.s3boto3.S3Boto3Storage"
AWS_STORAGE_BUCKET_NAME = env("AWS_STORAGE_BUCKET_NAME")
AWS_S3_REGION_NAME = env("AWS_S3_REGION_NAME", default="ap-south-1")
AWS_S3_FILE_OVERWRITE = False
AWS_DEFAULT_ACL = None
MEDIA_URL = f"https://{env('AWS_CLOUDFRONT_DOMAIN', default=f'{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com')}/"
```

**Step 4: Migrate existing Cloudinary media to S3**

For each existing photo/media file stored in Cloudinary, download and re-upload to S3. A one-time script:
```python
# run as: python manage.py shell < migrate_media.py
import boto3
import requests
from django.db import connection

s3 = boto3.client("s3", region_name="ap-south-1")
bucket = "fps-media-bucket"

# Fetch all media URLs from your models (example for visit photos)
with connection.cursor() as cursor:
    cursor.execute("SELECT id, photo FROM crops_farmervisit WHERE photo != ''")
    rows = cursor.fetchall()

for row_id, url in rows:
    if url.startswith("http"):  # Cloudinary URL
        response = requests.get(url, timeout=30)
        key = url.split("/upload/")[-1]  # extract path
        s3.put_object(Bucket=bucket, Key=key, Body=response.content)
        print(f"Migrated: {key}")
```

> After migration, update records in the database to use the new S3 key format, then delete from Cloudinary.

**Step 5: Set up CloudFront for media delivery**

In the AWS Console:
1. Go to CloudFront > Create Distribution.
2. Origin: the S3 bucket (use Origin Access Control — OAC — not public URLs).
3. Viewer protocol policy: HTTPS only.
4. Cache policy: CachingOptimized.
5. Add CNAME `media.fps-platform.in` if desired.
6. Set `AWS_CLOUDFRONT_DOMAIN` env var to the CloudFront domain (e.g., `d1234abcd.cloudfront.net`).

---

#### 11C: Deploy Admin Portal to AWS Amplify

(See Phase 9 above — Amplify replaces Vercel with identical developer experience.)

After Amplify is live and confirmed working:
1. Remove the Vercel project from the intern's account.
2. Update any mobile app or backend CORS config to use the new Amplify domain.

---

#### 11D: Decommission Personal Account Services

Once all data is confirmed migrated and all services are running on the company AWS account:

- [ ] Verify RDS has all Neon data (row counts match).
- [ ] Verify S3 has all Cloudinary media files.
- [ ] Verify Amplify admin portal is working.
- [ ] Update `CORS_ALLOWED_ORIGINS` in Django to the Amplify domain.
- [ ] Update mobile app API URL to the new EC2 domain.
- [ ] Run the existing DB backup workflow against RDS (update `.github/workflows/db-backup.yml` with new `DATABASE_URL`).
- [ ] Delete Neon project from intern's account.
- [ ] Delete Cloudinary account from intern's account.
- [ ] Delete Vercel project from intern's account.
- [ ] Delete Render service from intern's account.

---

## 8. Security Checklist

### EC2 Security Groups

```
Inbound Rules:
  Port 22  (SSH)    — Source: YOUR_OFFICE_IP/32 only (NOT 0.0.0.0/0)
  Port 80  (HTTP)   — Source: 0.0.0.0/0 (redirects to HTTPS)
  Port 443 (HTTPS)  — Source: 0.0.0.0/0

Outbound Rules:
  All traffic — 0.0.0.0/0 (allow all outbound)
```

**Never** allow SSH from `0.0.0.0/0`. If you need to SSH from multiple locations, use a VPN or AWS Systems Manager Session Manager.

### RDS Security Group (when using RDS)

```
Inbound Rules:
  Port 5432 (PostgreSQL) — Source: EC2 Security Group ID only
  (Do NOT expose RDS to the internet)
```

### IAM Best Practices

- Create a **dedicated IAM user** for GitHub Actions with only the permissions it needs (ECR push, nothing else).
- Never use root account credentials in code or CI/CD.
- Enable MFA on the root account and all IAM users.
- Use **IAM roles** for EC2 instance if it needs to access S3 or other AWS services — never put AWS access keys on the EC2 instance itself.

Example: Attach an EC2 IAM role with this policy for S3 access:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::fps-media-bucket/*"
    }
  ]
}
```

### HTTPS / SSL

- [ ] SSL certificate installed and auto-renewing via certbot.
- [ ] HTTP → HTTPS redirect configured in Nginx.
- [ ] HSTS enabled in Django settings (`SECURE_HSTS_SECONDS = 31536000`) — already configured.
- [ ] `SECURE_SSL_REDIRECT = True` in production settings — already configured.
- [ ] Secure cookies: `SESSION_COOKIE_SECURE = True`, `CSRF_COOKIE_SECURE = True` — already configured.

### SSH Hardening

```bash
# On EC2 — edit /etc/ssh/sshd_config
PasswordAuthentication no      # Key-only auth (should already be default on EC2)
PermitRootLogin no             # No root SSH
MaxAuthTries 3

sudo systemctl restart sshd
```

### JWT Security

- Access tokens: 12 hours (already set in settings).
- Refresh tokens: 30 days with rotation (already set).
- Tokens transmitted over HTTPS only.
- `SECRET_KEY` must be a strong random value (50+ characters) — never reuse the development key.
- Blacklisted refresh tokens on logout (verify `rest_framework_simplejwt.token_blacklist` is in INSTALLED_APPS).

### Environment Variables

- [ ] `.env.production` file is on EC2 only, NOT in git.
- [ ] `.env` is in `.gitignore`.
- [ ] `DEBUG=False` in production.
- [ ] `SECRET_KEY` is unique to production.
- [ ] `ALLOWED_HOSTS` lists only the production domain.
- [ ] Database password is a strong, unique password.

### Backups

- [ ] Neon free tier: automatic 7-day point-in-time recovery.
- [ ] RDS (when used): enable automated backups (7-day retention).
- [ ] Weekly GitHub Actions DB dump (already implemented in `.github/workflows/db-backup.yml`).
- [ ] S3 versioning enabled on media bucket (when S3 is used).

### Firewall Summary

```
Internet → EC2:80 (→ redirect to 443)
Internet → EC2:443 (Nginx → Django:8000)
EC2 → Neon:5432 (outbound, SSL required)
EC2 → Cloudinary API (outbound HTTPS)
EC2 → S3 (outbound HTTPS, when used)
SSH: Office IP → EC2:22 only
RDS: EC2 → RDS:5432 only (when RDS used, private subnet)
```

---

## 9. Monitoring & Maintenance

### Logs

**Django application logs:**
```bash
# View live logs
docker compose -f docker-compose.prod.yml logs -f django

# View Nginx access logs
docker compose -f docker-compose.prod.yml logs -f nginx
```

**CloudWatch log streaming (optional but recommended):**
Install the CloudWatch agent on EC2 to stream logs:
```bash
sudo apt install amazon-cloudwatch-agent -y
```
Configure `/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json` to watch Docker log files.

### Uptime Monitoring

Use a free external service to monitor your API endpoint:
- **UptimeRobot** (free tier) — monitors every 5 minutes, sends email/SMS on downtime.
- Add monitor: `https://api.fps-platform.in/api/health/` (or `/api/auth/login/` for a known endpoint).
- Add a simple health check endpoint in Django:

```python
# In accounts/views.py or a separate health app
from django.http import JsonResponse

def health_check(request):
    return JsonResponse({"status": "ok"})
```

```python
# In urls.py
path("api/health/", health_check),
```

### Metrics

**Basic EC2 metrics** (available free in CloudWatch):
- CPU utilization.
- Memory utilization (requires CloudWatch agent).
- Disk usage.
- Network in/out.

**Set CloudWatch alarms:**
- CPU > 80% for 5 minutes → email alert.
- Disk > 85% usage → email alert.

### Database Backups

**Neon:** Automatic 7-day PITR on free tier.

**When using RDS:**
```bash
# Manual snapshot via AWS CLI
aws rds create-db-snapshot \
  --db-instance-identifier fps-production \
  --db-snapshot-identifier fps-$(date +%Y%m%d)
```

The existing GitHub Actions weekly backup workflow is a good safety net — keep it running.

### Health Checks in Docker Compose

Add health checks to the `docker-compose.prod.yml`:

```yaml
django:
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8000/api/health/"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 60s
```

### Cost Monitoring

- Set an AWS Billing Alert: Billing > Budgets > Create Budget → alert at $50/month.
- Review AWS Cost Explorer monthly to identify unexpected charges.
- EC2 instance type can be downsized if metrics show low utilization.

### Maintenance Routine (monthly)

```bash
# On EC2
sudo apt update && sudo apt upgrade -y    # OS security patches
docker system prune -f                    # Remove old images/containers
certbot renew                             # SSL renewal (auto, but check)
```

---

## 10. Cost Estimation

### Tier 1: MVP Scale (< 50 active users, development/testing)

Keep everything on managed free tiers, only pay for EC2:

| Service | Provider | Monthly Cost |
|---|---|---|
| EC2 t3.micro | AWS | $8.50 |
| PostgreSQL | Neon (free tier) | $0 |
| Media storage | Cloudinary (free tier) | $0 |
| Admin portal | Vercel (free tier) | $0 |
| SSL | Let's Encrypt | $0 |
| Domain | External registrar | ~$1 |
| **Total** | | **~$10/month** |

> Note: EC2 t3.micro is 1 vCPU / 1 GB RAM. Sufficient for < 20 concurrent users.

---

### Tier 2: Small Production Scale (50–500 active users)

**Option 2A — With GitHub Actions + Vercel (mixed):**

EC2 + RDS + S3, CI/CD on GitHub, admin on Vercel:

| Service | Provider | Monthly Cost |
|---|---|---|
| EC2 t3.small | AWS | $15 |
| RDS t3.micro (PostgreSQL + PostGIS) | AWS | $15 |
| EBS storage (30 GB gp3) | AWS | $2.50 |
| S3 (10 GB media) | AWS | $0.23 |
| CloudFront (50 GB transfer) | AWS | $4 |
| Route53 hosted zone | AWS | $0.50 |
| Data transfer out (10 GB) | AWS | $0.90 |
| GitHub Actions (CI/CD) | GitHub | $0 (free tier) |
| Admin portal | Vercel | $0 (free tier) |
| SSL | Let's Encrypt or ACM | $0 |
| **Total** | | **~$38–45/month** |

**Option 2B — 100% AWS (no GitHub Actions, no Vercel):**

All services, CI/CD, and hosting under a single AWS account:

| Service | Provider | Monthly Cost |
|---|---|---|
| EC2 t3.small | AWS | $15 |
| RDS t3.micro (PostgreSQL + PostGIS) | AWS | $15 |
| EBS storage (30 GB gp3) | AWS | $2.50 |
| S3 (10 GB media + artifacts) | AWS | $0.50 |
| CloudFront (50 GB transfer) | AWS | $4 |
| AWS Amplify (admin portal hosting) | AWS | ~$1 |
| AWS CodePipeline (CI/CD trigger) | AWS | $1 (1 active pipeline) |
| AWS CodeBuild (build + deploy) | AWS | ~$1 (100 build-mins/month free, then $0.005/min) |
| Route53 hosted zone | AWS | $0.50 |
| ACM (SSL) | AWS | $0 |
| SSM Parameter Store (secrets) | AWS | $0 (free tier) |
| Data transfer out (10 GB) | AWS | $0.90 |
| **Total** | | **~$41–50/month** |

> **When to use Option 2B:** When the company wants zero dependency on GitHub or Vercel — for example, if the codebase is moved to AWS CodeCommit, or if all tooling must be auditable under the company's AWS CloudTrail logs. Cost difference vs. Option 2A is negligible (~$3/month). CodePipeline + CodeBuild replaces GitHub Actions; Amplify replaces Vercel.

---

### Tier 3: Medium Production Scale (500–5,000 active users)

Full AWS stack with Redis, load balancer, and enhanced monitoring:

| Service | Provider | Monthly Cost |
|---|---|---|
| EC2 t3.medium | AWS | $30 |
| RDS t3.small (Multi-AZ off) | AWS | $28 |
| ElastiCache t3.micro (Redis) | AWS | $13 |
| ALB (Application Load Balancer) | AWS | $16 |
| S3 (50 GB media) | AWS | $1.15 |
| CloudFront (200 GB transfer) | AWS | $17 |
| Route53 | AWS | $0.50 |
| EBS 50 GB gp3 | AWS | $4 |
| CloudWatch logs | AWS | $5 |
| Data transfer | AWS | $5 |
| Vercel (admin portal) | Vercel | $0 |
| **Total** | | **~$120–150/month** |

---

### Tier D: Company-Owned Production Scale (50–100 users — Recommended)

All services under the company's AWS account. No free-tier personal accounts:

| Service | Provider | Monthly Cost |
|---|---|---|
| EC2 t3.small | AWS | $15 |
| RDS db.t3.micro (PostgreSQL 15 + PostGIS) | AWS | $15 |
| EBS storage (20 GB gp3) | AWS | $1.60 |
| S3 (20 GB media + requests) | AWS | $2 |
| CloudFront (50 GB media transfer) | AWS | $4 |
| AWS Amplify (admin portal) | AWS | ~$1 |
| Route53 (1 hosted zone) | AWS | $0.50 |
| ACM (SSL) | AWS | $0 |
| SSM Parameter Store | AWS | $0 (free tier) |
| CloudWatch (logs + alerts) | AWS | $0 (free tier) |
| Data transfer out (10 GB) | AWS | $0.90 |
| **Total** | | **~$40–50/month** |

> This is ~$40/month more than the free-tier option, but it is the only option where the company owns all services. The cost is justified by business continuity.

### Cost Optimization Tips

- Use **Reserved Instances** (1-year term) to save 30–40% on EC2 and RDS — reduces Tier D to ~$28–35/month.
- Enable **S3 Intelligent-Tiering** for media storage that isn't accessed frequently.
- Use **CloudFront** to reduce data transfer costs from EC2.
- Right-size instances using CloudWatch metrics — don't over-provision.
- **Do not** keep Neon, Cloudinary, or Vercel — they are on personal accounts and must be replaced.

---

## 11. Final Recommendation

### Recommended Cloud Provider: AWS

AWS is the right choice: the existing EC2 instance is already there, the team's background is AWS-first, and AWS provides every service this project needs (RDS + PostGIS, S3, CloudFront, Amplify, ElastiCache, ACM, Route53, CloudWatch) under a single account and bill.

### Recommended Deployment Model: Option D — Full AWS Stack (Company-Owned)

**This is the only acceptable path** given that the current setup runs on the intern's personal accounts. With 50–100 active users and an internship nearing its end, the company needs to own every service.

| Component | Service | Why |
|---|---|---|
| **API backend** | EC2 t3.small + Docker Compose | Already Dockerized, direct lift-and-shift from Render |
| **Database** | RDS db.t3.micro (PostgreSQL 15 + PostGIS) | Replaces Neon; automated backups, consistent latency |
| **Media storage** | S3 + CloudFront | Replaces Cloudinary; durable, cost-controlled, CDN delivery |
| **Admin portal** | AWS Amplify | Replaces Vercel; zero-config Next.js, company-owned |
| **SSL** | ACM (free) | Auto-renewing, integrates with Amplify and ALB |
| **DNS** | Route53 | Both `api.*` and `admin.*` domains in one place |
| **Secrets** | SSM Parameter Store | Replaces `.env` files; centrally managed |
| **Monitoring** | CloudWatch | Logs, metrics, billing alerts |
| **Redis** | ElastiCache t3.micro | Add when Celery is activated |

**Total cost: ~$40–50/month.** With 1-year Reserved Instances on EC2 and RDS, this drops to ~$28–35/month.

### Why This Is the Best Balance

| Factor | Assessment |
|---|---|
| **Ownership** | 100% company-owned — no intern account dependency |
| **Cost** | ~$40–50/month. Reasonable for a 50–100 user production platform |
| **Simplicity** | One AWS account, one console, one bill |
| **Migration effort** | 1–2 days: data migration + one small code change (S3 storage backend) |
| **Operational overhead** | Low — Docker Compose on EC2, Amplify and RDS are fully managed |
| **Debugging** | Full SSH access to EC2, CloudWatch for logs |
| **Upgrade path** | Option B (ECS Fargate) when scale demands it — no code changes needed |
| **Handoff quality** | Manager receives one AWS account with everything inside |

### When to Revisit This Plan

Move to Option B (ECS Fargate) when:
- Field users exceed 1,000 concurrent or 100,000 daily API calls.
- Downtime tolerance drops below 1 hour/month.
- A dedicated backend/DevOps engineer joins the team.
- Celery workloads need to scale independently of the API.

Until then, Option D on EC2 is the right balance of cost, simplicity, and ownership for the FPS platform at its current scale.

---

*This plan was written for the FPS (Farm Prosperity Solutions) platform. Infrastructure decisions should be revisited as the project scales to production.*

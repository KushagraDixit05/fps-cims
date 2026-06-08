FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    gdal-bin \
    libgdal-dev \
    libpq-dev \
    binutils \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir "GDAL==$(gdal-config --version)"

COPY . .

EXPOSE 8000

# All setup runs at container start so env vars (SECRET_KEY, DATABASE_URL) are available.
# createsuperuser --noinput uses DJANGO_SUPERUSER_* env vars; || true skips if user exists.
# Seed commands use get_or_create so they're safe to run on every deploy.
CMD python manage.py migrate && \
    python manage.py collectstatic --noinput && \
    python manage.py createsuperuser --noinput || true && \
    python manage.py seed_crop_master && \
    python manage.py seed_product_master && \
    gunicorn fps_backend.wsgi:application --bind 0.0.0.0:$PORT

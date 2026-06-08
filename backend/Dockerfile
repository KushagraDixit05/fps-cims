FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    gdal-bin \
    libgdal-dev \
    libpq-dev \
    binutils \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# migrate + collectstatic run at container start so SECRET_KEY and DATABASE_URL are available
CMD python manage.py migrate && \
    python manage.py collectstatic --noinput && \
    gunicorn fps_backend.wsgi:application --bind 0.0.0.0:$PORT

#!/bin/bash
set -e

echo "=========================================================="
echo "🐬 [Dolphin Flow] Starting Services Container Initialization"
echo "=========================================================="

# Ensure environment variables have sensible fallbacks
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
REDIS_HOST="${REDIS_HOST:-redis}"
REDIS_PORT="${REDIS_PORT:-6379}"

# Wait for PostgreSQL
echo "==> Waiting for PostgreSQL ($DB_HOST:$DB_PORT)..."
until python -c "
import socket, sys
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.settimeout(2)
try:
    s.connect(('$DB_HOST', int('$DB_PORT')))
    s.close()
    sys.exit(0)
except Exception:
    sys.exit(1)
" 2>/dev/null; do
    sleep 1
done
echo "==> PostgreSQL is ready!"

# Wait for Redis
echo "==> Waiting for Redis ($REDIS_HOST:$REDIS_PORT)..."
until python -c "
import socket, sys
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.settimeout(2)
try:
    s.connect(('$REDIS_HOST', int('$REDIS_PORT')))
    s.close()
    sys.exit(0)
except Exception:
    sys.exit(1)
" 2>/dev/null; do
    sleep 1
done
echo "==> Redis is ready!"

# Automatic Database Migration (only run by web container)
if [ "$RUN_MIGRATIONS" = "true" ]; then
    echo "==> Applying database migrations..."
    python manage.py migrate --noinput
fi

# Automatic Static File Collection (only run by web container)
if [ "$COLLECT_STATIC" = "true" ]; then
    echo "==> Collecting static assets..."
    python manage.py collectstatic --noinput
fi

echo "=========================================================="
echo "🚀 [Dolphin Flow] Executing command: $@"
echo "=========================================================="
exec "$@"

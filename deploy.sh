#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# Load deployment coordinates if .deploy.env exists (gitignored)
if [ -f "$ROOT_DIR/.deploy.env" ]; then
    set -a
    # shellcheck disable=SC1091
    source "$ROOT_DIR/.deploy.env"
    set +a
fi

DEPLOY_HOST="${DEPLOY_HOST:-}"
DEPLOY_PORT="${DEPLOY_PORT:-22}"
DEPLOY_USER="${DEPLOY_USER:-}"
DEPLOY_DIR="${DEPLOY_DIR:-/opt/dolphin-plus}"

SKIP_FRONTEND=false
REBUILD_IMAGE=false
GIT_PUSH=false
DRY_RUN=false

usage() {
    cat <<'EOF'
Usage: ./deploy.sh [options]

Deploy Dolphin Plus from this workstation to the VPS over SSH/rsync.
Works even when the VPS cannot reach GitHub, PyPI, npm, or Docker Hub.

Options:
  --skip-frontend   Skip rebuilding frontend/dist (for backend/nginx-only changes)
  --rebuild-image   Rebuild dophinplus-web:latest locally and stream to VPS
                    (only needed when backend/Dockerfile or requirements change)
  --git-push        Run `git push origin main` before deploying
  --dry-run         Preview rsync changes without modifying the server
  -h, --help        Show this help message

Configuration (.deploy.env or environment variables):
  DEPLOY_HOST       Server IP or hostname
  DEPLOY_PORT       SSH port (default: 22)
  DEPLOY_USER       SSH username
  DEPLOY_DIR        Remote project path (default: /opt/dolphin-plus)
EOF
}

while [ $# -gt 0 ]; do
    case "$1" in
        --skip-frontend) SKIP_FRONTEND=true ;;
        --rebuild-image) REBUILD_IMAGE=true ;;
        --git-push)      GIT_PUSH=true ;;
        --dry-run)       DRY_RUN=true ;;
        -h|--help)       usage; exit 0 ;;
        *)
            echo "Unknown option: $1" >&2
            usage
            exit 1
            ;;
    esac
    shift
done

if [ -z "$DEPLOY_HOST" ] || [ -z "$DEPLOY_USER" ]; then
    echo "[-] DEPLOY_HOST and DEPLOY_USER must be set (.deploy.env or env)." >&2
    echo "    Run: cp .deploy.env.example .deploy.env" >&2
    exit 1
fi

for cmd in ssh rsync; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
        echo "[-] Missing required command: $cmd" >&2
        exit 1
    fi
done

if [ "$SKIP_FRONTEND" = false ] && [ "$DRY_RUN" = false ]; then
    if ! command -v npm >/dev/null 2>&1; then
        echo "[-] npm is required to build frontend/dist (or pass --skip-frontend)" >&2
        exit 1
    fi
fi

if [ "$REBUILD_IMAGE" = true ] && [ "$DRY_RUN" = false ]; then
    if ! command -v docker >/dev/null 2>&1; then
        echo "[-] docker is required locally for --rebuild-image" >&2
        exit 1
    fi
fi

REMOTE="${DEPLOY_USER}@${DEPLOY_HOST}"
CTL_SOCK="/tmp/dolphin-deploy-$$.sock"
ASKPASS_SCRIPT=""

cleanup() {
    if [ -S "$CTL_SOCK" ]; then
        ssh -S "$CTL_SOCK" -O exit -p "$DEPLOY_PORT" "$REMOTE" >/dev/null 2>&1 || true
    fi
    rm -f "$CTL_SOCK"
    if [ -n "$ASKPASS_SCRIPT" ] && [ -f "$ASKPASS_SCRIPT" ]; then
        rm -f "$ASKPASS_SCRIPT"
    fi
}
trap cleanup EXIT

SSH_OPTS=(-p "$DEPLOY_PORT" -o ControlPath="$CTL_SOCK" -o StrictHostKeyChecking=accept-new)

echo "=========================================================="
echo "🐬  Dolphin Plus -> Continuous Deploy ($REMOTE:$DEPLOY_DIR)"
echo "=========================================================="

if [ "$GIT_PUSH" = true ]; then
    echo "==> Pushing local commits to GitHub (origin/main)..."
    if [ "$DRY_RUN" = true ]; then
        echo "    [dry-run] git push origin main"
    else
        git push origin main
    fi
fi

if [ "$SKIP_FRONTEND" = false ] && [ "$DRY_RUN" = false ]; then
    echo "==> Clean-building React Admin + Operator frontend assets..."
    rm -rf "$ROOT_DIR/frontend/dist"
    npm --prefix "$ROOT_DIR/frontend" run build
    if [ ! -f "$ROOT_DIR/frontend/dist/index.html" ]; then
        echo "[-] frontend/dist/index.html was not generated! Aborting deploy." >&2
        exit 1
    fi
fi

echo "==> Opening SSH control connection to $REMOTE:$DEPLOY_PORT..."
if [ -n "${DEPLOY_PASSWORD:-}" ]; then
    ASKPASS_SCRIPT="$(mktemp)"
    chmod 700 "$ASKPASS_SCRIPT"
    cat > "$ASKPASS_SCRIPT" <<'ASKPASS_EOF'
#!/usr/bin/env sh
printf '%s\n' "$DEPLOY_PASSWORD"
ASKPASS_EOF
    DISPLAY="${DISPLAY:-:0}" SSH_ASKPASS="$ASKPASS_SCRIPT" SSH_ASKPASS_REQUIRE=force \
        ssh -M -fN "${SSH_OPTS[@]}" "$REMOTE" </dev/null >/dev/null 2>&1
else
    ssh -M -fN "${SSH_OPTS[@]}" "$REMOTE" >/dev/null 2>&1
fi

RSYNC_RSH="ssh -p $DEPLOY_PORT -o ControlPath=$CTL_SOCK"
RSYNC_FLAGS=(-az --itemize-changes)
if [ "$DRY_RUN" = true ]; then
    RSYNC_FLAGS+=(--dry-run)
fi

echo "==> Syncing root configuration files..."
rsync "${RSYNC_FLAGS[@]}" -e "$RSYNC_RSH" \
    "$ROOT_DIR/docker-compose.yml" \
    "$ROOT_DIR/run.sh" \
    "$ROOT_DIR/deploy.sh" \
    "$ROOT_DIR/DEPLOYMENT_GUIDE.md" \
    "$ROOT_DIR/.env.example" \
    "$ROOT_DIR/.deploy.env.example" \
    "$REMOTE:$DEPLOY_DIR/"

echo "==> Syncing gateway/..."
rsync "${RSYNC_FLAGS[@]}" --delete -e "$RSYNC_RSH" \
    "$ROOT_DIR/gateway/" \
    "$REMOTE:$DEPLOY_DIR/gateway/"

echo "==> Syncing backend/ (preserving VPS .env, media, backups, staticfiles)..."
rsync "${RSYNC_FLAGS[@]}" --delete -e "$RSYNC_RSH" \
    --filter='P .env' \
    --filter='P .env.*' \
    --filter='P /staticfiles/***' \
    --filter='P /media/***' \
    --filter='P /backups/***' \
    --filter='P /db.sqlite3*' \
    --filter='P /celerybeat-schedule*' \
    --exclude='.env' \
    --exclude='.env.*' \
    --exclude='staticfiles/' \
    --exclude='media/' \
    --exclude='backups/' \
    --exclude='db.sqlite3*' \
    --exclude='celerybeat-schedule*' \
    --exclude='__pycache__/' \
    --exclude='*.py[cod]' \
    --exclude='.venv*/' \
    "$ROOT_DIR/backend/" \
    "$REMOTE:$DEPLOY_DIR/backend/"

echo "==> Syncing frontend/ (including clean dist/ without stale bundles)..."
rsync "${RSYNC_FLAGS[@]}" --delete -e "$RSYNC_RSH" \
    --exclude='node_modules/' \
    --exclude='.vite/' \
    "$ROOT_DIR/frontend/" \
    "$REMOTE:$DEPLOY_DIR/frontend/"

if [ "$DRY_RUN" = true ]; then
    echo "=========================================================="
    echo "🧪  Dry-run completed. No changes applied on VPS."
    echo "=========================================================="
    exit 0
fi

if [ "$REBUILD_IMAGE" = true ]; then
    echo "==> Building updated backend image (dophinplus-web:latest) locally..."
    docker build -t dophinplus-web:latest "$ROOT_DIR/backend"
    echo "==> Streaming dophinplus-web:latest to VPS over SSH..."
    docker save dophinplus-web:latest | gzip | ssh "${SSH_OPTS[@]}" "$REMOTE" "gunzip | docker load"
fi

echo "==> Applying containers, migrations, static assets, and running health checks on VPS..."
ssh "${SSH_OPTS[@]}" "$REMOTE" "bash -s" -- "$DEPLOY_DIR" <<'REMOTE_EOF'
set -euo pipefail
DEPLOY_DIR="$1"
cd "$DEPLOY_DIR"

chmod +x backend/entrypoint.sh deploy.sh run.sh

docker compose up -d --no-build --remove-orphans
docker compose restart web celery_worker celery_beat

echo "==> Waiting for Django backend (127.0.0.1:8000) to finish migrations & startup..."
web_ready=false
for _ in $(seq 1 30); do
    if [ "$(curl -s --max-time 3 -o /dev/null -w '%{http_code}' http://127.0.0.1:8000/api/auth/me/)" = "200" ]; then
        web_ready=true
        break
    fi
    sleep 1
done

if [ "$web_ready" != true ]; then
    echo "[-] Backend did not become ready within 30s!" >&2
    docker compose ps
    docker logs dolphin-web --tail 40
    exit 1
fi

docker compose restart gateway

echo "==> Waiting for Nginx gateway (127.0.0.1:80)..."
ready=false
for _ in $(seq 1 15); do
    if [ "$(curl -s --max-time 3 -o /dev/null -w '%{http_code}' http://127.0.0.1/api/auth/me/)" = "200" ]; then
        ready=true
        break
    fi
    sleep 1
done

if [ "$ready" != true ]; then
    echo "[-] Gateway did not become ready within 15s!" >&2
    docker compose ps
    docker logs dolphin-gateway --tail 30
    exit 1
fi

check_code() {
    local method="$1" path="$2" expected="$3" got
    if [ "$method" = "POST" ]; then
        got="$(curl -s --max-time 3 -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d '{}' "http://127.0.0.1${path}")"
    else
        got="$(curl -s --max-time 3 -o /dev/null -w '%{http_code}' "http://127.0.0.1${path}")"
    fi
    echo "    $method $path -> $got (expected $expected)"
    if [ "$got" != "$expected" ]; then
        echo "[-] Smoke check failed for $method $path (got $got, expected $expected)" >&2
        exit 1
    fi
}

echo "==> Running HTTP smoke tests..."
check_code GET "/" "302"
check_code GET "/operator/" "302"
check_code GET "/accounts/login/" "200"
check_code GET "/admin/" "200"
check_code GET "/djangoadmin/login/" "200"
check_code GET "/api/auth/me/" "200"
check_code GET "/api/dashboard/stats/" "403"
check_code POST "/api/auth/quick-login/" "403"

js_bundle="$(grep -o 'index-[^"]*\.js' frontend/dist/index.html | head -n 1 || true)"
if [ -n "$js_bundle" ]; then
    check_code GET "/admin/assets/${js_bundle}" "200"
fi

echo "==> Container status:"
docker compose ps
REMOTE_EOF

echo "=========================================================="
echo "✅  Deploy completed and verified!"
echo "=========================================================="

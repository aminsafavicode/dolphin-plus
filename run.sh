#!/bin/bash
set -e

echo "=========================================================="
echo "🐬  Dolphin Flow - Enterprise Platform Launcher"
echo "=========================================================="

# Check Docker
if ! docker info > /dev/null 2>&1; then
    echo "[-] Docker daemon is not running! Please start Docker first."
    exit 1
fi

# Check .env
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    echo "[*] Creating .env from template..."
    cp .env.example .env
fi

if [ ! -f "backend/.env" ] && [ -f "backend/.env.example" ]; then
    echo "[*] Creating backend/.env from template..."
    cp backend/.env.example backend/.env
fi

# Build frontend if dist doesn't exist
if [ ! -d "frontend/dist" ]; then
    echo "[*] Building React Admin frontend inside temporary node container..."
    docker run --rm -v "$(pwd)/frontend:/app" -w /app node:20-alpine sh -c "npm install && npm run build:admin"
fi

# Boot services
echo "[*] Building and starting all containers..."
docker compose up -d --build

echo ""
echo "=========================================================="
echo "✅  Dolphin Plus is successfully running!"
echo "=========================================================="
echo "🌐  Operator Panel (Main):  http://localhost/ (or /operator/)"
echo "🚀  React Admin Studio:     http://localhost/admin/"
echo "⚙️   Django Unfold Admin:    http://localhost/djangoadmin/"
echo "🔌  REST API:               http://localhost/api/"
echo "📊  Real-time Sockets:      ws://localhost/ws/"
echo "📋  View Logs:              docker compose logs -f"
echo "🛑  Stop System:            docker compose down"
echo "=========================================================="

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
if [ ! -f "backend/.env" ] && [ -f "backend/.env.example" ]; then
    echo "[*] Creating backend/.env from template..."
    cp backend/.env.example backend/.env
fi

# Boot services
echo "[*] Building and starting all containers..."
docker compose up -d --build

echo ""
echo "=========================================================="
echo "✅  Dolphin Flow is successfully running!"
echo "=========================================================="
echo "🌐  Operator Panel:     http://localhost:8000/operator/"
echo "⚙️   Django Admin:       http://localhost:8000/admin/"
echo "📊  Real-time Sockets:  ws://localhost:8000/ws/operator/dashboard/"
echo "📋  View Logs:          docker compose logs -f"
echo "🛑  Stop System:        docker compose down"
echo "=========================================================="

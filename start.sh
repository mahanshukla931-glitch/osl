#!/usr/bin/env bash
# OpenSense Labs MCP Hub
# Startup orchestration script for Backend and Frontend

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PATH="/home/osl/.nvm/versions/node/v24.15.0/bin:$PATH"

echo "=========================================================="
echo "   OpenSense Labs MCP Hub – Enterprise Control Center   "
echo "=========================================================="

# 1. Kill any prior instances on ports 8000 and 3000
echo "[1/3] Checking ports 8000 & 3000..."
fuser -k 8000/tcp 2>/dev/null || true
fuser -k 3000/tcp 2>/dev/null || true

# 2. Launch FastAPI backend
echo "[2/3] Starting FastAPI backend on http://127.0.0.1:8000..."
cd "$DIR"
PYTHONPATH=. ./backend/venv/bin/python3 -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 > backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend started with PID $BACKEND_PID"

# Wait for backend health check
sleep 3
if curl -s http://127.0.0.1:8000/health | grep -q "healthy"; then
    echo "✓ Backend is healthy and responding!"
else
    echo "Waiting an extra moment for backend..."
    sleep 3
fi

# 3. Launch Next.js frontend
echo "[3/3] Starting Next.js frontend on http://localhost:3000..."
cd "$DIR/frontend"
npm start > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend started with PID $FRONTEND_PID"

echo "=========================================================="
echo "OpenSense Labs MCP Hub is now LIVE!"
echo "  • Frontend: http://localhost:3000"
echo "  • Backend API: http://localhost:8000"
echo "  • API Docs: http://localhost:8000/docs"
echo "  • Default Admin: admin@opensenselabs.com / OpenSense@2026!"
echo "  • Developer: developer@opensenselabs.com / OpenSense@2026!"
echo "=========================================================="

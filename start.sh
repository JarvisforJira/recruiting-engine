#!/bin/bash

ROOT="/Users/claudiapitts/SaltAIr-Platform/recruiting-engine"

echo "Starting Recruiting Engine..."

# Backend
cd "$ROOT/backend" && uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
echo "Backend running on http://localhost:8000 (PID: $BACKEND_PID)"

# Frontend
cd "$ROOT/frontend" && npm run dev &
FRONTEND_PID=$!
echo "Frontend running on http://localhost:5173 (PID: $FRONTEND_PID)"

echo ""
echo "Press Ctrl+C to stop both servers."

wait

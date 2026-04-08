#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  AI Factory 시작"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Backend 의존성 설치
echo "[1/3] 백엔드 의존성 설치 중..."
cd "$ROOT/backend"
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install -q -r requirements.txt

# Frontend 의존성 설치
echo "[2/3] 프론트엔드 의존성 설치 중..."
cd "$ROOT/frontend"
if [ ! -d "node_modules" ]; then
  npm install
fi

# 서버 실행
echo "[3/3] 서버 시작..."
echo ""
echo "  백엔드: http://localhost:8000"
echo "  프론트: http://localhost:3000"
echo ""

cd "$ROOT/backend"
source .venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

cd "$ROOT/frontend"
npm run dev &
FRONTEND_PID=$!

echo "PID: 백엔드=$BACKEND_PID, 프론트=$FRONTEND_PID"
echo "종료: Ctrl+C"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait

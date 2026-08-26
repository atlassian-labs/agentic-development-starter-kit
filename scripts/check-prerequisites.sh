#!/bin/bash
# check-prerequisites.sh — Run this before starting your agentic-first project
# Usage: bash scripts/check-prerequisites.sh

set -e

PASS=0
FAIL=0
WARN=0

check() {
  local name="$1"
  local cmd="$2"
  local expected="$3"
  local fix="$4"
  
  if eval "$cmd" &>/dev/null; then
    echo "✅ $name"
    PASS=$((PASS+1))
  else
    echo "❌ $name — $fix"
    FAIL=$((FAIL+1))
  fi
}

warn() {
  local name="$1"
  local cmd="$2"
  local fix="$3"
  
  if eval "$cmd" &>/dev/null; then
    echo "✅ $name"
    PASS=$((PASS+1))
  else
    echo "⚠️  $name (optional) — $fix"
    WARN=$((WARN+1))
  fi
}

echo ""
echo "🔍 Checking prerequisites for agentic-first development..."
echo "==========================================================="
echo ""

# Node.js
NODE_VER=$(node --version 2>/dev/null | sed 's/v//' | cut -d. -f1)
if [ ! -z "$NODE_VER" ] && [ "$NODE_VER" -ge 18 ]; then
  echo "✅ Node.js $(node --version)"
  PASS=$((PASS+1))
else
  echo "❌ Node.js 18+ required — install from https://nodejs.org or use nvm: nvm install 18"
  FAIL=$((FAIL+1))
fi

# npm
check "npm" "npm --version" "" "Install with Node.js from https://nodejs.org"

# AI agent CLI
if which your-agent-cli &>/dev/null; then
  echo "✅ your-agent-cli $(your-agent-cli --version 2>/dev/null | head -1)"
  PASS=$((PASS+1))
else
  echo "❌ your-agent-cli not found — install from https://developer.example.com/cloud/your-agent-cli/install/"
  FAIL=$((FAIL+1))
fi

# your-agent-cli authentication
if your-agent-cli auth whoami &>/dev/null 2>&1; then
  ACLI_USER=$(your-agent-cli auth whoami 2>/dev/null | head -1)
  echo "✅ your-agent-cli authenticated as: $ACLI_USER"
  PASS=$((PASS+1))
else
  echo "❌ your-agent-cli not authenticated — run: your-agent-cli auth login"
  FAIL=$((FAIL+1))
fi

# an AI coding agent availability
if your-agent-cli --help &>/dev/null 2>&1; then
  echo "✅ your-agent-cli available"
  PASS=$((PASS+1))
else
  echo "❌ AI agent CLI command not available — ensure you have access to your AI coding agent"
  FAIL=$((FAIL+1))
fi

# Port 9050 check
if lsof -i :9050 &>/dev/null 2>&1; then
  echo "✅ Port 9050 in use (AI coding agent likely running)"
  PASS=$((PASS+1))
else
  echo "⚠️  Port 9050 free — start your AI coding agent on port 9050"
  WARN=$((WARN+1))
fi

# .env file
if [ -f ".env" ]; then
  echo "✅ .env file exists"
  PASS=$((PASS+1))
else
  echo "❌ .env file missing — run: cp .env.example .env && fill in values"
  FAIL=$((FAIL+1))
fi

# Required env vars
ENV_VARS=("JIRA_EMAIL" "JIRA_API_TOKEN" "JIRA_HOST")
for var in "${ENV_VARS[@]}"; do
  if [ -f ".env" ] && grep -q "^${var}=.\+" .env 2>/dev/null; then
    echo "✅ $var set"
    PASS=$((PASS+1))
  else
    echo "❌ $var not set in .env — required for issue tracker sync"
    FAIL=$((FAIL+1))
  fi
done

# Optional: git configured
warn "git configured" "git config user.email" "run: git config --global user.email 'you@example.com'"

# Optional: SQLite3 available
warn "sqlite3 CLI" "which sqlite3" "install: brew install sqlite3 (useful for DB inspection)"

# Optional: pnpm
warn "pnpm" "which pnpm" "install: npm install -g pnpm"

echo ""
echo "==========================================================="
echo "Results: ✅ $PASS passed | ⚠️  $WARN warnings | ❌ $FAIL failed"
echo ""

if [ $FAIL -gt 0 ]; then
  echo "🚫 Fix the ❌ failures above before starting."
  echo "   Then re-run: bash scripts/check-prerequisites.sh"
  exit 1
else
  echo "🚀 All required prerequisites met! You're ready to start."
  echo ""
  echo "Next steps:"
  echo "  1. npm install"
  echo "  2. npm run setup          # Init database"
  echo "  3. your-agent-cli serve 9050 &   # Start your AI coding agent"
  echo "  4. node server.js         # Start the server"
  echo "  5. Open http://localhost:4000"
fi

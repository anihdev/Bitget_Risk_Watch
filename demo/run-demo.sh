#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOCAL_NODE_BIN="$ROOT_DIR/.tools/node/node-v22.14.0-linux-x64/bin"

if [ -d "$LOCAL_NODE_BIN" ]; then
  export PATH="$LOCAL_NODE_BIN:$PATH"
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not available on PATH."
  echo "Install Node.js or use the local toolchain at $LOCAL_NODE_BIN."
  exit 1
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "npx is not available on PATH."
  exit 1
fi

cd "$ROOT_DIR"

export RUNTIME_MODE="${RUNTIME_MODE:-SIMULATION}"

echo "================================================================"
echo "Bitget Risk Watch Demo"
echo "================================================================"
echo "Mode: $RUNTIME_MODE"
echo ""

echo "[1/5] Running portfolio scan"
npx ts-node src/index.ts
echo ""

echo "[2/5] Query: which positions are at risk?"
npx ts-node src/query.ts "which positions are at risk?"
echo ""

echo "[3/5] Query: why is BTC flagged?"
npx ts-node src/query.ts "why is BTC flagged?"
echo ""

echo "[4/5] Query: what actions do you recommend?"
npx ts-node src/query.ts "what actions do you recommend?"
echo ""

echo "[5/5] Latest audit summary"
node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync('audit-log.json','utf8')); const last=data[data.length-1]; console.log(JSON.stringify({timestamp:last.timestamp, mode:last.mode, riskLevel:last.riskLevel, scanStatus:last.scanStatus, flaggedPositions:last.flaggedPositions.map(p => ({symbol:p.symbol, riskLevel:p.riskLevel}))}, null, 2));"

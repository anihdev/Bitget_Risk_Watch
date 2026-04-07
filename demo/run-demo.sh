#!/bin/bash
set -euo pipefail

# Demo runner that exercises the scan and query flow with a predictable sequence.
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOCAL_NODE_BIN="$ROOT_DIR/.tools/node/node-v22.14.0-linux-x64/bin"

if [ -d "$LOCAL_NODE_BIN" ]; then
  # Prefer the bundled Node toolchain so the demo works even without a global install.
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

echo "[1/6] Running portfolio scan"
npx ts-node src/index.ts
echo "Scan shows Bitget skill calls, funding context, and flagged positions."
echo ""

echo "[2/6] Query: which positions are at risk?"
npx ts-node src/query.ts "which positions are at risk?"
echo ""

echo "[3/6] Query: why is BTC flagged?"
npx ts-node src/query.ts "why is BTC flagged?"
echo ""

echo "[4/6] Query: what actions do you recommend?"
npx ts-node src/query.ts "what actions do you recommend?"
echo ""

echo "[5/6] Query: what changed since last scan?"
npx ts-node src/query.ts "what changed since last scan?"
echo ""

echo "[6/6] Latest audit summary"
node -e "const fs=require('fs'); const emojis={SAFE:'✅',WARNING:'⚠️',CRITICAL:'🚨'}; const data=JSON.parse(fs.readFileSync('audit-log.json','utf8')); const last=data[data.length-1]; console.log('Timestamp: ' + last.timestamp); console.log('Mode: ' + last.mode); console.log('Overall Risk: ' + emojis[last.riskLevel] + ' ' + last.riskLevel); console.log('Scan Status: ' + last.scanStatus); console.log('Skill Calls:'); for (const s of last.skillCalls) console.log('  - ' + s.command + ' -> ' + s.status); console.log('Flagged Positions:'); for (const p of last.flaggedPositions) console.log('  - ' + p.symbol + ' [' + emojis[p.riskLevel] + ' ' + p.riskLevel + ']');"

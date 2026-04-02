#!/bin/bash
echo "=== Bitget Risk Watch Demo ==="
echo ""
echo "Step 1: Checking BTC ticker..."
bgc spot spot_get_ticker --symbol BTCUSDT | jq '.data.lastPr'
echo ""
echo "Step 2: Running risk scan..."
npx ts-node src/index.ts
echo ""
echo "Step 3: Showing audit log..."
cat audit-log.json | jq '.[0:3]'
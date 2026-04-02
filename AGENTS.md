# Bitget Risk Watch — Agent Instructions

## Purpose
This agent monitors a Bitget portfolio, detects risky positions,
and recommends protective actions using Bitget AgentHub tools.

## Agent Loop
1. Fetch account and market data via bgc CLI
2. Classify each position: SAFE / WARNING / CRITICAL
3. Generate recommended actions for risky positions
4. Log everything to audit-log.json
5. Answer user queries about risk state

## Key Commands
- `npx ts-node src/index.ts` — run full risk scan
- `bgc futures futures_get_positions --productType USDT-FUTURES` — live positions
- `bgc spot spot_get_ticker --symbol BTCUSDT` — live price
- `bgc account get_account_assets` — account balance

## Risk Rules
- No stop-loss → WARNING
- Leverage > 10x → WARNING
- Unrealized loss > 15% → CRITICAL
- Margin ratio > 80% → CRITICAL

## Demo Mode
Set SIMULATION_MODE=true in .env to run with mock data safely.
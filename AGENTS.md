 # Bitget Risk Watch — Agent Instructions

  ## Purpose
  Build a Bitget-native portfolio risk assistant for the Bitget AgentHub Skills Challenge.

  The agent monitors Bitget futures positions, detects risky exposure, explains why a position is risky, and recommends protective actions. The MVP supports real Bitget account
  reads while remaining recommendation-first.

  ## Product Direction
  This is a separate project from `ckb-agent`.

  We may reuse architectural ideas from `ckb-agent`, but we must not reuse CKB-specific code, terminology, or assumptions.

  Reuse these concepts:
  - fetch -> analyze -> classify -> act -> report loop
  - SAFE / WARNING / CRITICAL risk levels
  - high-signal output instead of noisy logs
  - audit trail for every scan and recommendation
  - simulation mode for safe demos
  - query interface for “what changed?” style questions

  Do not reuse:
  - CKB RPC/indexer code
  - smart contracts
  - lock scripts
  - Fiber logic
  - oracle/cell model assumptions
  - CKB naming in docs or code

  ## Scope
  - Primary market: `USDT-FUTURES`
  - Primary Bitget interface: `bgc` / Bitget skills
  - MVP modes: `SIMULATION` and `LIVE_READ`
  - No autonomous live order placement in MVP
  - If execution is added later, it must require explicit confirmation

  ## Runtime Modes
  The project should support three runtime modes:

  - `SIMULATION`
    - uses mock data only
    - safe for demos and development
    - no live Bitget reads
    - no order execution

  - `LIVE_READ`
    - uses real Bitget account, position, and market data
    - generates real risk analysis and recommendations
    - no order execution

  - `LIVE_EXECUTE`
    - uses real Bitget data and can execute actions
    - out of scope for MVP
    - must not be enabled unless an explicit confirmation flow exists

  Development preference:
  - use `LIVE_READ` when valid Bitget credentials and `bgc` access are available
  - use `SIMULATION` when credentials are unavailable or when recording demos

  ## Core Workflow
  1. Fetch account assets, futures positions, and market data via `bgc`
  2. Normalize Bitget responses into internal typed objects
  3. Classify each position as `SAFE`, `WARNING`, or `CRITICAL`
  4. Generate recommended protective actions for risky positions
  5. Write a structured audit record
  6. Return a readable summary for terminal/demo/query use

  ## Live Read Requirements
  When running in `LIVE_READ` mode:
  - fetch real account balances
  - fetch real futures positions
  - fetch real market or ticker data if needed
  - normalize all upstream responses before classification
  - handle auth failures, empty accounts, malformed responses, and rate limits cleanly
  - never place orders

  ## Required Outputs Per Scan
  Each scan must produce:
  - portfolio summary
  - risky position list
  - clear reason each position was flagged
  - recommended action for each risky position
  - structured audit log entry

  ## Initial Risk Rules
  - No stop-loss -> `WARNING`
  - Leverage > `10x` -> `WARNING`
  - Unrealized loss > `15%` -> `CRITICAL`
  - Margin ratio > `80%` -> `CRITICAL`

  These rules should be configurable.

  ## Recommendation Rules
  Examples of allowed recommendations:
  - add stop-loss
  - reduce position size
  - lower leverage
  - close partial position
  - avoid new entries until margin improves

  Recommendations must explain why they were chosen.

  ## Supported Queries
  The project should support these user-facing queries:
  - `scan my portfolio`
  - `which positions are at risk?`
  - `why is BTC flagged?`
  - `what actions do you recommend?`
  - `what changed since last scan?`
  - `show my risk summary`

  ## Safety Rules
  - `SIMULATION` and `LIVE_READ` are valid MVP modes
  - Do not place live orders without an explicit confirmation flow
  - If required Bitget data is missing, return `INCOMPLETE` or a clear warning rather than guessing
  - Handle empty accounts, API failures, and malformed data cleanly
  - Never leak secrets or raw credentials in logs

  ## Data Model Expectations
  The internal position model should support at least:
  - `symbol`
  - `side`
  - `size`
  - `entryPrice`
  - `markPrice`
  - `leverage`
  - `unrealizedPnl`
  - `unrealizedPnlPct`
  - `marginRatio`
  - `stopLossPresent`
  - `riskLevel`
  - `riskReasons`
  - `recommendation`

  ## Audit Log Schema
  Each audit record should include:
  - `timestamp`
  - `mode`
  - `productType`
  - `accountSummary`
  - `positions`
  - `flaggedPositions`
  - `riskLevel`
  - `riskReasons`
  - `recommendation`
  - `scanStatus`

  Use JSON for audit output. Prefer newline-delimited JSON or a structured array file.

  ## Commands
  Expected commands:
  - `npx ts-node src/index.ts` -> run full scan
  - `npx ts-node src/query.ts "which positions are at risk?"` -> query latest scan
  - `bgc futures futures_get_positions --productType USDT-FUTURES` -> live positions
  - `bgc account get_account_assets` -> account balances
  - `bgc spot spot_get_ticker --symbol BTCUSDT` -> ticker data if needed

  ## File Structure
  Recommended structure:
  - `src/index.ts`
  - `src/config.ts`
  - `src/types.ts`
  - `src/bitget.ts`
  - `src/fetcher.ts`
  - `src/classifier.ts`
  - `src/recommender.ts`
  - `src/audit.ts`
  - `src/reporter.ts`
  - `src/query.ts`

  ## Demo Expectations
  The demo should show:
  1. agent startup
  2. Bitget data fetch
  3. detected risky positions
  4. explanation of why they are risky
  5. recommended protective actions
  6. audit output or summary
  7. user query after the scan

  Use `SIMULATION` for fully controlled demos.
  Use `LIVE_READ` if you want a real-account demo without execution.

  ## Working Style
  When making changes:
  - keep the implementation practical and small
  - prefer a polished MVP over broad incomplete features
  - keep outputs screenshot/video friendly
  - prefer simple, explainable logic over “AI-sounding” complexity
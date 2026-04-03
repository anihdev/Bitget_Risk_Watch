# Bitget Risk Watch

Bitget Risk Watch is a Bitget-native AI risk assistant for `USDT-FUTURES`, built for the Bitget Agent Hub Skills Challenge.

It monitors a Bitget futures portfolio, identifies risky positions, explains exactly why they are risky, recommends protective actions, and records every scan in an audit log. The MVP is recommendation-first: it reads real account data in `LIVE_READ`, but does not place live orders.

## Conventions

### Emoji Usage

Emojis in this project are intentional visual indicators, not decoration:

| Emoji | Meaning |
|-------|---------|
| ✅ | `SAFE` - position is healthy |
| ⚠️ | `WARNING` - position approaching risk threshold |
| 🚨 | `CRITICAL` - position requires immediate action |

These appear in logs, reports, terminal output, and documentation by design.

## What it does

Bitget Risk Watch answers the questions a futures trader actually asks:

- which positions are at risk right now?
- why are they risky?
- what should I do next?
- what changed since the last scan?

### Why it is useful

Most crypto agents focus on finding trades. This one focuses on controlling damage after trades already exist.

That makes it practical:

- risk is surfaced in a few lines, not buried in exchange screens
- each flagged position includes plain-English reasons
- recommendations are defensive and immediate
- the audit log creates a visible history for follow-up queries and demos
- Bitget Skill usage is visible in the runtime output instead of hidden in the code

### Challenge fit

This project is best positioned for:

- `Most Practical Agent`
- `Best Skill Combination`

It is intentionally built as a polished, single-agent system.

## Bitget AgentHub Alignment

Against Bitget's available developer surfaces, this repo currently uses:

- `Skills`
  The live workflow is built around `bgc`, which is the Bitget skill-driven agent interface.
- `CLI tools`
  The app invokes Bitget commands directly from Node for terminal, automation, and agent workflows.

So the clearest description is:

`Bitget Risk Watch is a Skills-based, CLI-driven Bitget futures risk agent.`

## Bitget Commands Used

The current repo uses these Bitget tools:

- `bgc account get_account_assets`
  Fetches account balances and account asset state.
- `bgc futures futures_get_positions --productType USDT-FUTURES`
  Fetches live futures positions for risk analysis.
- `bgc futures futures_get_ticker --symbol BTCUSDT`
  Adds market context for each futures position, including a live price fallback and 24h price-change data when Bitget returns it.
- `bgc futures futures_get_funding_rate --symbol BTCUSDT`
  Adds funding-rate context so the agent can warn when carry costs are elevated.
- `bgc spot spot_get_ticker --symbol BTCUSDT`
  Used as a fallback when a futures ticker price is unavailable.

The live scan path actively depends on the account and futures position calls, and enriches positions with verified market context from ticker and funding commands.

## Product Flow

Each scan follows a simple, explainable loop:

1. fetch Bitget account assets and futures positions
2. normalize raw responses into typed internal objects
3. classify each position as `✅ SAFE`, `⚠️ WARNING`, or `🚨 CRITICAL`
4. generate defensive recommendations
5. write a structured JSON audit record
6. answer user queries from the latest scan history

This keeps the output high-signal and UI/UX-friendly.

## Runtime Modes

### `SIMULATION`

Uses bundled mock data only. This is the safest mode for demos.

### `LIVE_READ`

Uses real Bitget reads through `bgc` to analyze actual portfolio risk. No live execution is performed.

### `LIVE_EXECUTE`

Declared for future expansion, but intentionally non-executable in the current MVP.

## Risk Rules

The default rules are intentionally simple and configurable:

- no stop-loss -> `⚠️ WARNING`
- leverage above `10x` -> `⚠️ WARNING`
- unrealized loss worse than `15%` -> `🚨 CRITICAL`
- margin ratio at or above `80%` -> `🚨 CRITICAL`
- funding rate at or above `0.3%` in absolute terms -> `⚠️ WARNING`

Generated recommendations currently include:

- add stop-loss
- lower leverage
- reduce position size
- close partial position
- avoid new entries until margin pressure improves

## Supported Queries

After running a scan, the agent supports:

- `scan my portfolio`
- `which positions are at risk?`
- `why is BTC flagged?`
- `what actions do you recommend?`
- `what changed since last scan?`
- `show my risk summary`

## Demo Flow

This repo is designed to demo well in terminal screenshots or a short screen recording.

Recommended demo flow:

1. start in `SIMULATION` for a deterministic scan
2. run the portfolio scan and show the visible Bitget Skill traces
3. show the risky positions, market context, human explanations, and confidence-tagged recommendations
4. show the confirmation-only execution path for a recommended action
5. run `why is BTC flagged?`
6. run `what changed since last scan?`
7. optionally open `audit-log.json`
8. optionally show `LIVE_READ` with a real account if authenticated `bgc` access is available

The included demo helper is [`demo/run-demo.sh`](/home/anihdev/Bitget_Risk_Watch/demo/run-demo.sh).

## Example Outcome

In the current simulation portfolio:

- overall portfolio risk is `🚨 CRITICAL`
- `BTCUSDT` is flagged `🚨 CRITICAL`
- `SOLUSDT` is flagged `⚠️ WARNING`
- `ETHUSDT` remains `✅ SAFE`

That makes the CLI output consistent for demo recording and challenge submission material.

## Audit Trail

Each run appends a record to [`audit-log.json`](/home/anihdev/Bitget_Risk_Watch/audit-log.json) containing:

- `timestamp`
- `mode`
- `productType`
- `skillCalls`
- `accountSummary`
- `positions`
- `flaggedPositions`
- `riskLevel`
- `riskReasons`
- `recommendation`
- `scanStatus`
- `fetchWarnings`

The audit file is stored as a structured JSON array and powers the query interface.

## Safety Model

- `SIMULATION` and `LIVE_READ` are the intended MVP modes
- the current implementation never places live orders
- `LIVE_EXECUTE` is intentionally disabled as an execution path
- if live Bitget data is missing or malformed, the scan returns warnings and downgrades status instead of guessing
- credentials are not written into logs

## Project Structure

- [`src/index.ts`](/home/anihdev/Bitget_Risk_Watch/src/index.ts): full scan entry point
- [`src/config.ts`](/home/anihdev/Bitget_Risk_Watch/src/config.ts): runtime and thresholds
- [`src/types.ts`](/home/anihdev/Bitget_Risk_Watch/src/types.ts): internal data models
- [`src/bitget.ts`](/home/anihdev/Bitget_Risk_Watch/src/bitget.ts): Bitget `bgc` integration, normalization, and optional ticker fallback enrichment
- [`src/fetcher.ts`](/home/anihdev/Bitget_Risk_Watch/src/fetcher.ts): scan input assembly and simulation data
- [`src/classifier.ts`](/home/anihdev/Bitget_Risk_Watch/src/classifier.ts): risk classification
- [`src/recommender.ts`](/home/anihdev/Bitget_Risk_Watch/src/recommender.ts): recommendation generation
- [`src/reporter.ts`](/home/anihdev/Bitget_Risk_Watch/src/reporter.ts): terminal report rendering
- [`src/audit.ts`](/home/anihdev/Bitget_Risk_Watch/src/audit.ts): audit storage
- [`src/query.ts`](/home/anihdev/Bitget_Risk_Watch/src/query.ts): query interface

## Setup

Install dependencies:

```bash
npm install
```

Example environment:

```bash
RUNTIME_MODE=SIMULATION
LEVERAGE_THRESHOLD=10
LOSS_THRESHOLD_PCT=15
MARGIN_DANGER_PCT=80
FUNDING_WARNING_PCT=0.3
```

Use `SIMULATION` for demos and `LIVE_READ` when `bgc` is authenticated and available.

For a challenge demo, the best live story is:

1. `SIMULATION` mode for a deterministic first scan
2. visible `bgc` command traces in the report
3. funding-rate and 24h market context on risky positions
4. a follow-up query like `why is BTC flagged?`
5. an audit-log view showing the same scan persisted

## Commands

Run a scan:

```bash
npx ts-node src/index.ts
```

Query the latest result:

```bash
npx ts-node src/query.ts "which positions are at risk?"
npx ts-node src/query.ts "why is BTC flagged?"
npx ts-node src/query.ts "what changed since last scan?"
```

Type-check:

```bash
npm run typecheck
```

## Verification

Verified in this repo:

- `npm run typecheck`
- `npx ts-node src/index.ts`
- `npx ts-node src/query.ts "which positions are at risk?"`
- `npx ts-node src/query.ts "why is BTC flagged?"`
- `npx ts-node src/query.ts "scan my portfolio"`
- `npx ts-node src/query.ts "what changed since last scan?"`

## Current MVP Coverage

The Agent covers main MVP requirements:

- Bitget-native `USDT-FUTURES` focus
- `SIMULATION` and `LIVE_READ`
- recommendation-first workflow
- risk classification and explanations
- audit logging
- follow-up query support
- demo-friendly CLI output

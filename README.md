# Bitget Risk Watch

**Bitget Risk Watch is a Bitget-native AI portfolio risk monitor for `USDT-FUTURES`.**

It monitors a Bitget futures portfolio, identifies risky positions, explains exactly why they are risky, recommends protective actions, and records every scan in an audit log. The MVP runs in `SIMULATION`, it reads real account data in `LIVE_READ`, and it can also run a separate, explicit trading console when you intentionally enable execution mode `LIVE_EXECUTE`.

Built for the **Bitget Agent Hub Skills Challenge**.

## What This Ai-Agent Does

It is a risk-control tool for positions on Bitget. It answers questions like:

- Which positions are risky right now?
- Why was BTC flagged?
- What should I do next?
- What changed since the last scan?
- If I decide to act, what exact Bitget command would I run?

## Core Workflow

The scan follows one simple loop:

1. Fetch Bitget account and futures position data
2. Normalize the responses into typed internal objects
3. Classify each position as `SAFE`, `WARNING`, or `CRITICAL`
4. Recommend protective actions
5. Save a structured audit record
6. Support follow-up queries from the latest scan history

## Runtime Modes

### `SIMULATION`

Safe demo mode.

- Uses bundled mock portfolio data
- No Bitget reads
- No order placement

### `LIVE_READ`

Live analysis mode.

- Reads real Bitget account data
- Does not place orders
- Uses read-only Bitget CLI calls in the scan path

### `LIVE_EXECUTE`

Execution-enabled mode.

- Scans still remain read-only
- Only the separate execution console can place orders
- Destructive actions require an explicit confirmation token

## What It Can Do

### Portfolio Risk Scan

It can:

- read Bitget balances and futures positions
- enrich positions with market and funding context
- detect missing stop-loss, high leverage, large unrealized loss, high margin ratio, and elevated funding pressure
- explain each flag in plain English
- recommend concrete protective actions
- store the result in `audit-log.json`
- generate a browser-friendly `latest-report.html` from the latest scan

### Query Interface

It can answer:

- `scan my portfolio`
- `which positions are at risk?`
- `why is BTC flagged?`
- `what actions do you recommend?`
- `what changed since last scan?`
- `show my risk summary`

### Trading Console

It can:

- preview a supported action before sending anything
- close part of a position
- reduce position size
- lower leverage
- inspect live positions
- inspect open orders
- inspect fills
- cancel one order
- cancel all orders for a symbol

### Real-Time Bitget Skill  Follow-Ups

The Agent supports all Bitget Skill Hub enrichments for follow-up context:

- `macro-analyst`
- `market-intel`
- `news-briefing`
- `sentiment-analyst`
- `technical-analysis`

The core scan works without them. The report and query layer suggest when to use them.

## Safety Model

Trading actions are treated as sensitive operations. The current implementation enforces:

- scans never place live orders
- scan-time Bitget calls use `--read-only`
- execution is separate from scanning
- execution requires `RUNTIME_MODE=LIVE_EXECUTE`
- execution always previews the exact Bitget command first
- destructive actions require a symbol-and-action-specific confirmation token
- execution attempts and outcomes are logged in `execution-audit.jsonl`
- credentials are read from environment variables only

## Bitget-Native Design

This repo is built around Bitget’s CLI tool surface, `bgc`, from `bitget-client`.

Relevant Bitget commands used by the project:

- `bgc account get_account_assets`
- `bgc futures futures_get_positions --productType USDT-FUTURES`
- `bgc futures futures_get_ticker --productType USDT-FUTURES --symbol BTCUSDT`
- `bgc futures futures_get_funding_rate --productType USDT-FUTURES --symbol BTCUSDT`
- `bgc futures futures_place_order`
- `bgc futures futures_set_leverage`
- `bgc futures futures_cancel_orders`
- `bgc futures futures_get_orders`
- `bgc futures futures_get_fills`

Relevant Bitget API references:

- Futures positions:
  https://www.bitget.com/api-doc/contract/position/get-all-position
- Futures place order:
  https://www.bitget.com/api-doc/contract/trade/Place-Order
- Futures cancel order:
  https://www.bitget.com/api-doc/contract/trade/Cancel-Order
- Futures leverage config:
  https://www.bitget.com/api-doc/contract/account/Change-Leverage
- Futures modify order:
  https://www.bitget.com/api-doc/contract/trade/Modify-Order

## Supported Market Scope

Current focus:

- `USDT-FUTURES`

The project is optimized for one futures product type so the risk rules, normalization, and execution logic remain consistent and reliable.

## Risk Rules

Default rules:

- no stop-loss -> `WARNING`
- leverage above `10x` -> `WARNING`
- unrealized loss worse than `15%` -> `CRITICAL`
- margin ratio at or above `80%` -> `CRITICAL`
- funding rate at or above `0.3%` in absolute terms -> `WARNING`

These are configurable through environment variables.

## Recommendations

The agent currently generates recommendations such as:

- add stop-loss
- lower leverage
- reduce position size
- close partial position
- avoid new entries until margin pressure improves
- review funding exposure before the next funding window

Not every recommendation is executable automatically.

The current live execution flow supports only verified actions:

- `close partial position`
- `reduce position size`
- `lower leverage`
- order and fill inspection
- order cancellation

Stop-loss / TP-SL execution remains recommendation-only.

## Audit Trail

There are two audit surfaces:

### Scan Audit

Stored in [`audit-log.json`](/home/anihdev/Bitget_Risk_Watch/audit-log.json)

Contains:

- timestamp
- mode
- productType
- runtime diagnostics
- skill calls
- account summary
- positions
- flagged positions
- overall risk
- risk reasons
- recommendations
- scan status
- warnings

### Execution Audit

Stored in `execution-audit.jsonl`

Contains one line per execution-related event:

- preview shown
- confirmation missing
- command succeeded
- command failed

## Setup

### Prerequisites

- Node.js 18+ or the bundled Node toolchain in `.tools/node`
- Bitget CLI (`bgc`)
- Bitget API credentials for `LIVE_READ` or `LIVE_EXECUTE`

### 1. Install dependencies

```bash
npm install
```

### 2. Install Bitget CLI

```bash
npm install -g bitget-client
```

Verify:

```bash
bgc --help
```

### 3. Configure environment variables

Example `.env.local`:

```bash
BITGET_API_KEY=your_api_key_here
BITGET_SECRET_KEY=your_secret_here
BITGET_PASSPHRASE=your_passphrase_here
RUNTIME_MODE=LIVE_READ
LEVERAGE_THRESHOLD=10
LOSS_THRESHOLD_PCT=15
MARGIN_DANGER_PCT=80
FUNDING_WARNING_PCT=0.3
```

Important:
- `RUNTIME_MODE` can be `SIMULATION`, `LIVE_READ`, or `LIVE_EXECUTE`

### 4. Optional: install Bitget Codex skills

If you want Codex-side Skill Hub enrichments available:

```bash
npx bitget-hub upgrade bitget-skill
npx bitget-hub upgrade bitget-skill-hub
npx bitget-hub install --target codex
```

### 5. Optional: technical-analysis Python dependencies

On Ubuntu, if `pip install pandas numpy` fails with `externally-managed-environment`, use a virtual environment:

```bash
sudo apt install python3-venv
python3 -m venv .venv
. .venv/bin/activate
pip install pandas numpy
```

## Usage

### Run a scan

```bash
npx ts-node src/index.ts
```

Or:

```bash
npm run scan
```

Each scan updates:

- `audit-log.json`
- `latest-report.html`

Open the HTML file in a browser for a cleaner demo view than raw terminal output.

### Serve the report on localhost

```bash
npm run report
```

Default URL:

- `http://127.0.0.1:4173`

Optional environment variables:

- `REPORT_PORT=8080`
- `REPORT_HOST=127.0.0.1`

### Query the latest scan

```bash
npx ts-node src/query.ts "which positions are at risk?"
npx ts-node src/query.ts "why is BTC flagged?"
npx ts-node src/query.ts "what actions do you recommend?"
npx ts-node src/query.ts "what changed since last scan?"
npx ts-node src/query.ts "show my risk summary"
```

### Query Skill Hub enrichments

```bash
npx ts-node src/query.ts "skill hub enrichments"
npx ts-node src/query.ts "sentiment analysis"
npx ts-node src/query.ts "technical analysis"
npx ts-node src/query.ts "macro outlook"
npx ts-node src/query.ts "full market assessment"
```

### Run the demo

```bash
npm run demo
```

### Use the execution console

Preview a supported action:

```bash
RUNTIME_MODE=LIVE_EXECUTE npx ts-node src/execute.ts BTCUSDT --action "close partial position"
```

Execute it:

```bash
RUNTIME_MODE=LIVE_EXECUTE npx ts-node src/execute.ts BTCUSDT --action "close partial position" --confirm EXECUTE:BTCUSDT:CLOSE_PARTIAL_POSITION --size-pct 25
```

Lower leverage:

```bash
RUNTIME_MODE=LIVE_EXECUTE npx ts-node src/execute.ts BTCUSDT --action "lower leverage" --confirm EXECUTE:BTCUSDT:LOWER_LEVERAGE --leverage 9
```

Inspect live trading state:

```bash
RUNTIME_MODE=LIVE_EXECUTE npx ts-node src/execute.ts BTCUSDT --show-positions
RUNTIME_MODE=LIVE_EXECUTE npx ts-node src/execute.ts BTCUSDT --show-orders
RUNTIME_MODE=LIVE_EXECUTE npx ts-node src/execute.ts BTCUSDT --show-fills
```

Cancel orders:

```bash
RUNTIME_MODE=LIVE_EXECUTE npx ts-node src/execute.ts BTCUSDT --cancel --order-id 123456 --confirm EXECUTE:BTCUSDT:CANCEL_ORDER
RUNTIME_MODE=LIVE_EXECUTE npx ts-node src/execute.ts BTCUSDT --cancel-all --confirm EXECUTE:BTCUSDT:CANCEL_ALL_ORDERS
```

The inspection commands render a simplified operator view first. If Bitget returns an unfamiliar payload shape, the console falls back to raw JSON.

## Demo

Best demo sequence:

1. run a `SIMULATION` scan
2. show flagged positions and clear explanations
3. run follow-up queries
4. show the execution preview and confirmation gate
5. show `audit-log.json`
6. show `execution-audit.jsonl`
7. show Skill Hub enrichment suggestions

This demonstrates:

- Bitget-native reads
- explainable risk classification
- actionable recommendations
- execution safety
- auditability
- Skill Hub extensibility

## Project Structure

- [`src/index.ts`](/home/anihdev/Bitget_Risk_Watch/src/index.ts): scan entry point
- [`src/config.ts`](/home/anihdev/Bitget_Risk_Watch/src/config.ts): runtime config and thresholds
- [`src/types.ts`](/home/anihdev/Bitget_Risk_Watch/src/types.ts): internal models
- [`src/bitget.ts`](/home/anihdev/Bitget_Risk_Watch/src/bitget.ts): Bitget integration and normalization
- [`src/fetcher.ts`](/home/anihdev/Bitget_Risk_Watch/src/fetcher.ts): simulation and live scan input assembly
- [`src/classifier.ts`](/home/anihdev/Bitget_Risk_Watch/src/classifier.ts): risk classification
- [`src/recommender.ts`](/home/anihdev/Bitget_Risk_Watch/src/recommender.ts): recommendation generation
- [`src/reporter.ts`](/home/anihdev/Bitget_Risk_Watch/src/reporter.ts): terminal reporting
- [`src/query.ts`](/home/anihdev/Bitget_Risk_Watch/src/query.ts): follow-up question interface
- [`src/execute.ts`](/home/anihdev/Bitget_Risk_Watch/src/execute.ts): explicit trading console
- [`src/skillHub.ts`](/home/anihdev/Bitget_Risk_Watch/src/skillHub.ts): Skill Hub enrichment routing
- [`src/audit.ts`](/home/anihdev/Bitget_Risk_Watch/src/audit.ts): scan and execution audit helpers

## Verification

Commands verified in this repo:

- `npm run typecheck`
- `npx ts-node src/index.ts`
- `npx ts-node src/query.ts "which positions are at risk?"`
- `npx ts-node src/query.ts "skill hub enrichments"`
- `RUNTIME_MODE=LIVE_EXECUTE npx ts-node src/execute.ts BTCUSDT --show-positions`
- `RUNTIME_MODE=LIVE_EXECUTE npx ts-node src/execute.ts BTCUSDT --cancel-all`

## Current State

- explainable risk scan
- clear read-only live analysis path
- explicit confirmation-gated execution console
- execution audit logging
- queryable scan history

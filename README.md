# Bitget Risk Watch

Bitget Risk Watch is a Bitget-native AI risk assistant for `USDT-FUTURES`, built for the Bitget Agent Hub Skills Challenge.

It monitors a Bitget futures portfolio, identifies risky positions, explains exactly why they are risky, recommends protective actions, and records every scan in an audit log. The MVP runs in `SIMULATION` it reads real account data in `LIVE_READ`, It can also run a separate, explicit trading console when you intentionally enable execution mode `LIVE_EXECUTE`.

---

## Conventions

### Emoji Usage

Emojis in this project are **intentional visual indicators**, not decoration:

| Emoji | Meaning |
|-------|---------|
| ✅ | `SAFE` - position is healthy |
| ⚠️ | `WARNING` - position approaching risk threshold |
| 🚨 | `CRITICAL` - position requires immediate action |

These appear in logs, reports, terminal output, and documentation by design.

---

## What This Project Is

This project is not a signal bot and it is not a trade-finding assistant.
It is a risk-control tool for positions that already exist.
It is designed to answer questions like:

- Which positions are currently risky?
- Why was BTC flagged?
- What should I do to reduce exposure?
- What changed since the last scan?
- If I choose to act, what Bitget command would actually run?

## What It Does

The core scan follows one loop:

1. Read Bitget balances and futures positions
2. Normalize raw Bitget responses into typed internal objects
3. Classify risk as `SAFE`, `WARNING`, or `CRITICAL`
4. Generate defensive recommendations
5. Save a structured audit record
6. Answer follow-up questions from the saved scan history

This keeps the agent practical and explainable.

## Why It Is Useful

Most trading tools focus on entering trades.

Bitget Risk Watch focuses on limiting damage after a trade already exists:

- risky positions are surfaced in plain English
- each flag includes a reason, not just a label
- recommendations are protective rather than speculative
- the scan path is read-only by default
- execution is separated from scanning
- every scan and execution attempt leaves a trace

## Bitget-Native Design

This repo is built around Bitget’s CLI tool surface, `bgc`, from `bitget-client`.

Relevant Bitget surfaces:

- Bitget CLI / tool interface:
  `bgc`
- Account assets:
  `bgc account get_account_assets`
- Futures positions:
  `bgc futures futures_get_positions --productType USDT-FUTURES`
- Futures market data:
  `bgc futures futures_get_ticker --productType USDT-FUTURES --symbol BTCUSDT`
- Futures funding:
  `bgc futures futures_get_funding_rate --productType USDT-FUTURES --symbol BTCUSDT`
- Futures trading:
  `bgc futures futures_place_order`
  `bgc futures futures_set_leverage`
  `bgc futures futures_cancel_orders`
  `bgc futures futures_get_orders`
  `bgc futures futures_get_fills`

Bitget API references that matter for this repo:

- Futures position reads:
  https://www.bitget.com/api-doc/contract/position/get-all-position
- Futures place order:
  https://www.bitget.com/api-doc/contract/trade/Place-Order
- Futures cancel order:
  https://www.bitget.com/api-doc/contract/trade/Cancel-Order
- Futures leverage config:
  https://www.bitget.com/api-doc/contract/account/Change-Leverage
- Futures modify order:
  https://www.bitget.com/api-doc/contract/trade/Modify-Order

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
- Forces read-only Bitget CLI calls

### `LIVE_EXECUTE`

Execution-enabled mode.

- Still keeps scanning read-only
- Only the separate execution command can place orders
- Requires explicit confirmation tokens before destructive actions

## Supported Market Scope

Current focus:

- `USDT-FUTURES`

This is a deliberate product choice, not a Bitget limitation.

The agent is currently optimized for one futures product type so the risk rules, normalization, and execution logic remain consistent and reliable.

## Risk Rules

Default rules:

- no stop-loss -> `WARNING`
- leverage above `10x` -> `WARNING`
- unrealized loss worse than `15%` -> `CRITICAL`
- margin ratio at or above `80%` -> `CRITICAL`
- funding rate at or above `0.3%` in absolute terms -> `WARNING`

These are configurable in the environment.

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

## Safety Model

This project treats trading actions as sensitive operations.

Safety decisions in the current implementation:

- scans never place live orders
- scan-time Bitget calls use `--read-only`
- execution is separate from scanning
- execution requires `RUNTIME_MODE=LIVE_EXECUTE`
- execution shows the exact Bitget command before submission
- destructive actions require a symbol-and-action-specific confirmation token
- execution attempts and outcomes are logged separately from scan history
- credentials are read from environment variables only

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

This makes it easier to review sensitive actions after the fact.

## How To Set It Up

### 1. Install project dependencies

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

Example `.env`:

```bash
RUNTIME_MODE=SIMULATION
BITGET_API_KEY=""
BITGET_SECRET_KEY=""
BITGET_PASSPHRASE=""
LEVERAGE_THRESHOLD=10
LOSS_THRESHOLD_PCT=15
MARGIN_DANGER_PCT=80
FUNDING_WARNING_PCT=0.3
```

### 4. Choose a mode

- use `SIMULATION` for demos
- use `LIVE_READ` for real portfolio analysis without trading
- use `LIVE_EXECUTE` only when you intentionally want the trading console enabled

## How To Run It

### Run a scan

```bash
npx ts-node src/index.ts
```

### Ask questions about the latest scan

```bash
npx ts-node src/query.ts "which positions are at risk?"
npx ts-node src/query.ts "why is BTC flagged?"
npx ts-node src/query.ts "what actions do you recommend?"
npx ts-node src/query.ts "what changed since last scan?"
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

These inspection commands now render a simplified operator view first. If Bitget returns an unfamiliar payload shape, the console falls back to raw JSON so data is never hidden.

Cancel orders:

```bash
RUNTIME_MODE=LIVE_EXECUTE npx ts-node src/execute.ts BTCUSDT --cancel --order-id 123456 --confirm EXECUTE:BTCUSDT:CANCEL_ORDER
RUNTIME_MODE=LIVE_EXECUTE npx ts-node src/execute.ts BTCUSDT --cancel-all --confirm EXECUTE:BTCUSDT:CANCEL_ALL_ORDERS
```

Optional demo trading:

```bash
RUNTIME_MODE=LIVE_EXECUTE npx ts-node src/execute.ts BTCUSDT --action "close partial position" --paper-trading
```

## What The Report Means

The report intentionally explains things in plain language.

Key sections:

- `Status`
  Explains whether the scan had enough usable data
- `Runtime Diagnostics`
  Explains whether `bgc` was available, whether credentials were present, and whether the scan was running in read-only mode
- `Bitget Skills`
  Shows the exact Bitget commands that were attempted
- `Warnings`
  Explains what was missing or incomplete
- `Risky Positions`
  Shows the positions that need attention and why

If `Status` is `INCOMPLETE`, it means the scan ran but did not have enough usable live data to produce a full portfolio risk assessment.

## Demo Story

For a layman-friendly demo, use this sequence:

1. Start in `SIMULATION`
2. Run a scan
3. Show how BTC gets flagged and why
4. Ask `why is BTC flagged?`
5. Ask `what actions do you recommend?`
6. Show that the execution console previews a real Bitget command before doing anything
7. Show the audit files

This demonstrates:

- Bitget-native reads
- explainable classification
- protective actions
- execution safety
- auditability

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
- [`src/audit.ts`](/home/anihdev/Bitget_Risk_Watch/src/audit.ts): scan and execution audit helpers

## Verification

Commands verified in this repo:

- `npm run typecheck`
- `npx ts-node src/index.ts`
- `npx ts-node src/query.ts "which positions are at risk?"`
- `RUNTIME_MODE=LIVE_EXECUTE npx ts-node src/execute.ts BTCUSDT --show-positions`
- `RUNTIME_MODE=LIVE_EXECUTE npx ts-node src/execute.ts BTCUSDT --cancel-all`

## Current MVP Coverage

The Agent covers main MVP requirements:

- Bitget-native `USDT-FUTURES` focus
- `SIMULATION`,`LIVE_READ` and `LIVE_EXECUTE` modes
- explainable risk classification
- clear read-only scan path
- explicit trading console
- confirmation-gated destructive actions
- execution audit trail
- queryable scan history
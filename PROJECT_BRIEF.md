 # Bitget Risk Watch — Project Brief

  ## Goal
  Build a separate repo for the Bitget AgentHub Skills Challenge.

  The project is a Bitget-native AI risk assistant called `Bitget Risk Watch`. It monitors a Bitget futures portfolio, detects risky positions, explains the reasons clearly,
  and recommends protective actions using Bitget developer tools.

  ## Challenge Fit
  This project is intended to align with the Bitget AgentHub Skills Challenge.

  Target strengths:
  - practical utility
  - clear use case
  - strong use of Bitget tools
  - natural-language queryability
  - demo-friendly outputs

  Preferred category focus:
  - `Most Practical Agent`
  - optionally `Best Skill Combination`

  We are not optimizing for a complex multi-agent system in MVP.

  ## Submission Strategy
  Start with a `single-agent` submission.

  Reason:
  - simpler to finish
  - easier to explain
  - easier to demo
  - lower integration risk
  - still strong for challenge judging

  Only expand to multi-agent later if the single-agent version is already polished.

  ## Runtime Strategy
  Preferred real-world operating mode:
  - `LIVE_READ`

  This means the agent uses real Bitget account and market data for scanning and recommendations, while remaining recommendation-only in MVP.

  Supported modes:
  - `SIMULATION` -> mock data for demos and safe development
  - `LIVE_READ` -> real Bitget reads, no order execution
  - `LIVE_EXECUTE` -> real reads plus execution, explicitly out of MVP unless a confirmation flow is added

  ## Product Definition
  `Bitget Risk Watch` should:
  - read Bitget futures account and position data
  - identify risky positions based on clear rules
  - explain why a position is risky
  - recommend defensive actions
  - keep a visible audit trail
  - support simple user queries about risk state

  MVP should support live reading and remain recommendation-first.
  Execution can be a later phase if explicit confirmation is implemented.

  ## What To Reuse From ckb-agent
  Reuse only the architectural ideas:
  - fetch -> analyze -> classify -> act -> report loop
  - SAFE / WARNING / CRITICAL status system
  - high-signal notifications and summaries
  - audit logging
  - simulation mode
  - simple query interface for latest state

  ## What To Replace
  Replace all CKB-specific implementation with Bitget-native integration:
  - Bitget positions instead of CKB positions
  - Bitget account/market data instead of blockchain reads
  - Bitget tool calls instead of smart-contract interaction
  - exchange risk logic instead of collateral health factor logic

  Do not import CKB concepts into the new repo.

  ## Core User Story
  A user wants an AI agent that can scan their Bitget futures account and answer:
  - which positions are risky right now?
  - why are they risky?
  - what should I do next?

  The answer must be concrete, readable, and useful.

  ## Initial Scope
  Primary market:
  - `USDT-FUTURES`

  Primary integration:
  - `bgc` / Bitget skills

  Primary outputs:
  - portfolio summary
  - risk classifications
  - recommended actions
  - structured audit log

  ## Suggested Rules
  Initial default rules:
  - no stop-loss -> WARNING
  - leverage > 10x -> WARNING
  - unrealized loss > 15% -> CRITICAL
  - margin ratio > 80% -> CRITICAL

  Rules should live in config so they can be tuned later.

  ## Live Read Requirements
  The project should be able to run against a real Bitget account in `LIVE_READ` mode.

  That requires:
  - authenticated Bitget access through `bgc` or the Bitget API
  - stable parsing and normalization of real Bitget responses
  - safe handling of missing fields, empty positions, auth failures, and rate limits
  - no live order placement in MVP

  The live-read path is a first-class requirement, not a later extra.

  ## Demo Plan
  The demo should be short and clear.

  Suggested sequence:
  1. start the agent
  2. fetch Bitget portfolio data
  3. show one or more flagged positions
  4. explain each flag in plain English
  5. show recommendations
  6. show audit output
  7. ask a follow-up query like `what changed since last scan?`

  The demo should be safe to run in `SIMULATION`.
  A second demo can optionally use `LIVE_READ`.

  ## X Post Direction
  The public post should communicate:
  - what the agent does
  - why it is useful
  - that it uses Bitget tools
  - screenshots or short video of the workflow

  Suggested positioning:
  `Bitget Risk Watch monitors Bitget futures risk, flags dangerous positions, and recommends protective actions through a Bitget-native agent workflow.`

  ## Non-Goals For MVP
  Do not try to build all of this in version one:
  - full autonomous live execution
  - complex multi-agent orchestration
  - spot + futures + options all at once
  - advanced AI reasoning chains without clear value
  - large frontend dashboard before the CLI flow works

  ## Deliverables
  The repo should include:
  - working scan command
  - `SIMULATION` mode
  - `LIVE_READ` mode
  - audit logging
  - query command
  - README
  - `.env.example`
  - clear demo flow

  ## Engineering Priorities
  1. correctness of risk classification
  2. clean Bitget integration
  3. robust live-read handling
  4. readable output
  5. safe behavior
  6. demo readiness

  ## Success Criteria
  The MVP is successful if:
  - it runs reliably
  - it produces understandable risk summaries
  - it supports real Bitget reads without execution
  - it shows clear value in a short demo
  - it is obviously aligned with Bitget’s challenge
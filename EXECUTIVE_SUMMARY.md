# Executive Summary  

**Bitget Risk Watch** is largely on track for the Bitget AgentHub Skills Challenge.  It is well-aligned with the **“Most Practical Agent”** goal: a portfolio risk monitor that scans futures positions and flags dangerous exposure.  It follows the recommended single-agent pattern (fetch→classify→act→report) and uses Bitget’s CLI (`bgc`) for live data (as specified in its docs【3†L285-L293】).  

- **Must-Install Agent:** The project already targets a broadly useful function (futures risk monitoring).  To fully qualify as **“essential with strong general usability”**【27†L67-L75】, it may need to cover more use cases (e.g. spot positions, account summary, or multi-account profiles) so *all* users would install it by default.  Adding optional spot scanning or an overall portfolio summary screen would increase its universality.  

- **Most Practical Agent:** This project is inherently practical – it alerts traders to real risks (no stop-loss, high leverage, drawdowns).  The core rules and actionable recommendations are on point.  We should ensure the output is extremely clear and informative (e.g. natural-language explanations, concise alerts) to maximize real-world utility.  

- **Best Skill Combination:** The design calls for using the Bitget CLI (`bgc`) to fetch positions, assets, tickers, etc.  To score here, it should make *multiple* distinct skill/API calls.  Currently it plans to get positions and balances.  We should add a few more, such as funding rates or price candles, and incorporate their results into the analysis.  For example: fetch `bgc futures futures_get_ticker`, `bgc futures futures_get_funding_rate`, or use `bgc spot spot_get_candles` for trending signals.  Showing several CLI calls in action (with JSON outputs) will highlight skill usage.  

- **Best Multi-Agent Collaboration:** The repo is single-agent by design (as is smart for MVP), so it doesn’t yet exhibit multi-agent workflows.  To target this criterion, we could **optionally** architect two small agents: e.g. a “Market Scout Agent” that collects data (volatility, news sentiment) and a “Risk Agent” that analyzes positions.  However, multi-agent adds complexity and time risk.  It is *not required* to win; focusing on a polished single agent is higher priority.  We can outline a simple multi-agent design in docs (a split of fetch vs. act) to *mention* this category, but implement only if time permits.  

- **Most Creative Agent:** The baseline agent is straightforward (risk monitor).  To boost creativity, we should add a unique twist.  For example, **explainable insights** (“Your BTC trade is flagged because high leverage could liquidate you on a 4% drop”) or a **portfolio health score**.  Perhaps integrate a friendly analogy (“Your margin ratio is critical – it’s like driving too fast in a school zone”).  Even a short “story” element (e.g. “Flagged: LUNAUST on account X – leverage 20×”) can make it more engaging.  The goal is to stand out as innovative and user-friendly.  

**Conclusion:**  The Bitget Risk Watch framework is sound and hits many criteria.  Key areas to improve: **explicit Bitget Skill/CLI usage** (e.g. show multiple `bgc` calls and results), **broader functionality** (to justify “must-install”), and **creative outputs**.  Below is a criterion-by-criterion breakdown and a step-by-step improvement plan (with code examples, demo outline, etc.).  

> *All feature ideas and code use Bitget AgentHub tools (CLI/Skills) per Bitget’s docs【3†L285-L293】【27†L67-L75】.*  

# Criterion Evaluation

| Criterion                     | Current Repo Features                          | Gaps / Weaknesses                              | Concrete Improvements (Priority)                                             | Effort / Risk             |
|-------------------------------|------------------------------------------------|-----------------------------------------------|-----------------------------------------------------------------------------|--------------------------|
| **Must-Install Agent** ⭐      | - Monitors USDT-Futures positions<br>- Implements risk rules (no stop, high leverage, drawdown)<br>- Query interface for “which positions are at risk?”| - Focused only on futures, not full portfolio (spot/copy, etc.)<br>- No user-friendly UI; CLI only| **1. Broaden scope:** Add spot and account overview. E.g., `bgc spot spot_get_assets`, combine futures+spot summary. *Impact:* Agent then applies to all traders, hitting “essential” mark.【27†L67-L75】. <br>**2. Improve UX:** Present a concise portfolio health summary (e.g. color-coded alert counts) at start. Possibly a simple dashboard output (using ASCII charts or JSON). *Impact:* Feels like a general “main screen” everyone would want. | Moderate: ~6–8h. Needs extra API calls + formatting. Some UX design risk but low.  |
| **Most Practical Agent**      | - Core logic well-defined (risk rules in config)<br>- Live-read mode with real data via Bitget CLI<br>- Generates recommendations (warn, suggest action)<br>- Queryable with plain prompts | - Output clarity could be improved (currently CLI text only)<br>- Might need more rule coverage (e.g. unrealized PnL checks, margin usage)【8†L13-L18】<br>- No actual order suggestions (just text) | **1. Polish output:** Ensure each alert includes symbol, risk reason, and clear next step. Use bullet lists. Possibly use an example table or an emoji/status icon for risk levels. *Impact:* Maximizes usefulness.【27†L67-L75】 <br>**2. Expand rules:** Add a couple more (e.g. funding spike, continuous loss trend) to show robustness. <br>**3. Show command logs:** Include sample `bgc` outputs in demo to validate realness (for transparency).  | Low–Moderate: ~4–6h. Mostly formatting and adding a few lines of logic. Very low risk, just coding details. |
| **Multi-Agent Collaboration** | - Single-agent architecture (`src/index.ts` loop) using Bitget CLI<br>- Has support for queries and logging | - No multi-agent workflow implemented<br>- All logic in one program (no separated agents for scout/execution) | **Optional Step:** Design a simple two-agent scenario and *mention* it: e.g. 
   - *Market Scout Agent:* Fetches market/candle data (using `bgc spot_get_candles`, news API, etc.) and passes alerts to Risk Agent.  
   - *Risk Manager Agent:* Processes positions (existing logic).  
   - *Execution Agent:* (out-of-scope now, but conceptually for closing positions)【27†L71-L76】.  
  If time permits, split code: one script for market data fetcher (e.g. `marketAgent.ts`) and one for risk analysis (`riskAgent.ts`) with a simple queue or file passing (or sequential calls). *Impact:* Enters multi-agent category; looks impressive.  
  If no time, at least outline as a future roadmap in README. | High effort if implemented (~2-3 days, 15-20h), high risk (complex coordination).  
  Likely skip for MVP and save effort for core. |
| **Best Skill Combination**    | - Uses Bitget CLI (`bgc`) to get positions and account assets (implied).<br>- Mention of `bgc` commands in docs (to use futures_get_positions, get_account_assets). | - Currently no examples of multiple distinct skill calls in one run. Only futures positions and asset. <br>- No use of public data (tickers, funding rates) or any analysis skill (technical/news) | **1. Add more data sources:** Incorporate at least 2–3 additional `bgc` calls. E.g.:  
   - *Funding Rates:* `bgc futures futures_get_funding_rate --symbol BTCUSDT` to warn on high funding costs.  
   - *Price Candles:* `bgc spot spot_get_candles --symbol BTCUSDT --limit 10` to detect recent volatility.  
   - *News/Sentiment:* (If CLI supports) or skip due to time.  
   Show their outputs in the report (e.g. JSON or summary line). *Impact:* Demonstrates “skill combo” and richer analysis. 【8†L13-L20】<br>**2. Use Bitget Market Skills:** If possible, call their ‘market-analysis’ skills (e.g. bitget-skill-hub) via CLI or API to show technical/sentiment. *Impact:* Extra credit for skill usage.【10†L307-L315】<br>**3. Log skill calls:** The demo should print the `bgc` commands being run. Possibly prefix logs with `[Skill] ...`. | Moderate: ~8h. Requires adding new API calls (low complexity), but need to handle and parse new fields. Low risk.|
| **Most Creative Agent**       | - Implements explainable recommendations (English text suggested).<br>- Audit trail and queries built in (including “what changed?” support).<br>- Clean demo plan. | - The concept is straightforward (no gimmicks). <br>- Lacks a standout “wow” feature. | **1. Humanized reasoning:** Enhance the explanation style. For example, after flagging BTC position:  
   > *“Your BTC position (5x leverage) is in CRITICAL danger – a 4% drop could wipe it out. We suggest lowering leverage or adding a stop.”*  
   Include some friendly tone or analogy. *Impact:* Makes it memorable and shareable.  
   **2. Visual cues in CLI:** Use color (red text for CRITICAL) or ASCII icons (🔥 for risk).  
   **3. Extra query: “health score”**: Give an overall risk score (0–100) for the portfolio. *Impact:* An “AI score” is a creative touch.  
   **4. Example image/chart:** Optionally embed a chart/screenshot in the demo (e.g. mark a price chart trend). *Impact:* Visual flair.  
   These are “nice-to-haves” but can push creativity. | Low–Moderate: ~4h for text improvements and formatting. Very low risk. Adding colors needs terminal support but can use `chalk`. |

*Notes:*  All improvements focus on output and agent behavior, not fundamental architecture changes (except optional multi-agent).  The repo’s core (fetch/analyze/act loop) is sound. Emphasizing actual Bitget Skill calls and a polished user experience will be key.

# Action Plan 

Below is a prioritized list of tasks to bring Bitget Risk Watch to a competitive level.  Each task includes a brief description, key code changes or CLI commands, sample outputs, and implementation notes.

### 1. Integrate Additional Bitget Skills (Best Skill Combination)  
- **Goal:** Show multiple `bgc` calls in action.  
- **Tasks:**  
  - **Add data fetchers:** In `src/fetcher.ts`, implement new calls:  
    ```ts
    // Example (TypeScript using child_process)
    const exec = require('child_process').execSync;
    // Fetch futures positions
    const posJson = exec(`bgc futures futures_get_positions --productType USDT-FUTURES`).toString();
    const positions = JSON.parse(posJson).data;
    // Fetch account assets
    const assetsJson = exec(`bgc account get_account_assets`);
    // New: Fetch BTC market ticker
    const tickerJson = exec(`bgc futures futures_get_ticker --symbol BTCUSDT`);
    const ticker = JSON.parse(tickerJson).data;
    // New: Fetch BTC funding rate
    const fundJson = exec(`bgc futures futures_get_funding_rate --symbol BTCUSDT`);
    const fundingRate = JSON.parse(fundJson).data;
    ```  
  - **Incorporate into logic:** Pass the new `ticker` and `fundingRate` into the classifier or recommender. For example:  
    ```ts
    // In classifier.ts or recommender.ts
    positions.forEach(pos => {
      if (Math.abs(fundingRate.rate) > 0.05) {
        pos.riskReasons.push("High funding rate on " + pos.symbol);
        pos.recommendation = "Consider hedging or closing " + pos.symbol;
      }
    });
    ```  
  - **Demo output:** Show the CLI calls and their JSON results (truncated). E.g., in logs:  
    ```
    [Skill] bgc futures futures_get_ticker --symbol BTCUSDT  
    [Result] {"symbol":"BTCUSDT","lastPrice":28800,...}  
    [Skill] bgc futures futures_get_funding_rate --symbol BTCUSDT  
    [Result] {"symbol":"BTCUSDT","fundingRate":0.0035}  
    ```  
    Summarize succinctly, e.g. “BTC funding 0.35% (high)”.  
- **Effort/Risk:** ~6h. Straightforward CLI usage; parse JSON. Low risk of errors.  

### 2. Broaden Scope (Must-Install)  
- **Goal:** Cover more use cases so any trader finds it useful.  
- **Tasks:**  
  - **Spot Portfolio Summary:** Use `bgc spot spot_get_assets` or `bgc account get_account_assets` to include spot balances in report. In code:  
    ```ts
    const spotJson = exec(`bgc spot spot_get_assets`);
    const spotBalances = JSON.parse(spotJson).data;
    // Format into portfolio summary
    ```  
  - **Unify Report:** At start of scan, print total USD value of futures + spot, or highlight any large holdings:  
    ```
    Portfolio Summary: Futures = 0.5 BTC (USD 14,400), Spot = 200 USDT
    ```
  - **Stop-Loss Checker:** (Already planned) Ensure rule for “no stop-loss” is active for spot trades too (if API gives SL info).  
  - **Demo:** Include screenshot or terminal output with *both* futures and spot assets. This shows completeness. Possibly label it “Aggregate portfolio view”.  

- **Effort/Risk:** ~4h. Adds another API call and formatting. Minimal risk.  

### 3. Improve Output Clarity (Most Practical Agent)  
- **Goal:** Make the results easy to scan.  
- **Tasks:**  
  - **Colored Terminal Output:** Use a library like `chalk` to color-code by risk. E.g.:  
    ```ts
    const chalk = require('chalk');
    positions.forEach(pos => {
      let status = pos.riskLevel === 'CRITICAL' ? chalk.red('CRITICAL') 
                : pos.riskLevel === 'WARNING' ? chalk.yellow('WARNING')
                : chalk.green('SAFE');
      console.log(`${status}: ${pos.symbol} - ${pos.recommendation}`);
    });
    ```  
    This draws attention in a demo.  
  - **Structured JSON Audit:** For each scan, output a JSON record. Sample entry:  
    ```json
    {
      "timestamp": "2026-04-03T10:15:00Z",
      "mode": "LIVE_READ",
      "account": {"futuresBalance": 2000, "spotBalance": 5000},
      "positions": [
        {"symbol": "BTCUSDT", "size": 0.3, "entryPrice": 30000, "markPrice": 28000,
         "unrealizedPnlPct": -6.7, "leverage": 5, "stopLossPresent": false,
         "riskLevel": "CRITICAL", "riskReasons": ["No stop-loss", "Unrealized loss 6.7%"],
         "recommendation": "Reduce leverage or set a stop-loss"}  
      ],
      "flaggedPositions": ["BTCUSDT"],
      "scanStatus": "COMPLETE"
    }
    ```  
    (Print this to a file or console; format examples in README.)  
  - **Audit Log File:** Write logs to `demo/audit.jsonl` (newline-delimited JSON) for easy review. Example script:  
    ```ts
    import fs from 'fs';
    fs.appendFileSync('demo/audit.log', JSON.stringify(auditRecord) + '\n');
    ```  
  - **Explainable Reasons:** In text output and JSON, include full reasons. For example:  
    - “No stop-loss”  
    - “Leverage above 10x”  
    - “Unrealized loss 20%”  
  - **Demo/Example:** Show in the report how the agent explains a flag. E.g.:  
    ```
    CRITICAL - BTCUSDT: Leverage=15x, PnL=-22%.  
    Reasons: [No stop-loss, Unrealized loss 22%].  
    Recommendation: Reduce position size or add a stop.
    ```  
    This clarity makes it very actionable.  
- **Effort/Risk:** ~6h. Mostly formatting and small code additions. Very low risk.  

### 4. Add Creative/Explainable Touches (Most Creative Agent)  
- **Goal:** Make the agent’s output engaging and memorable.  
- **Tasks:**  
  - **Humanized Explanation:** Instead of terse lines, the agent can phrase suggestions. E.g.:  
    ```ts
    if (pos.riskLevel === 'CRITICAL') {
      console.log(`⚠️  ${chalk.red('CRITICAL')}: ${pos.symbol} (${pos.recommendation}).`);
      console.log(`    ‣ Risk factors: ${pos.riskReasons.join(', ')}.`);
      console.log(`    ‣ Tip: Consider adding a stop-loss or reducing size to protect funds.`);
    }
    ```  
    The advice line (“Tip: ...”) is a friendly touch.  
  - **Risk Score:** Compute a numeric risk score (e.g. 0–100) per position or portfolio (weighted sum of factors). Print it. Example:  
    ```
    Portfolio Risk Score: 78/100 (Higher means more danger)
    ```
    This gamifies risk monitoring.  
  - **Follow-up Query Example:** Demonstrate the query interface returning a summary: e.g. user asks “which positions are at risk?” and agent replies in one line per symbol.  
    Example command in `query.ts`:  
    ```ts
    // pseudo-code
    const answer = `Flagged positions: ${flagged.join(', ')}. Reasons and actions detailed above.`;
    console.log(answer);
    ```  
  - **Optional Chart (Visual):** If time, use a node chart library (like `ascii-chart`) to draw a mini price graph for a flagged asset. This could be a stretch goal:  
    ```ts
    const chart = require('asciichart');
    let prices = [28900, 29050, 28800, 28500, 28200];
    console.log(chalk.blue(chart.plot(prices)));
    ```  
    This would impress but is optional.  
  - **Demo:** Record a snippet where the agent responds to a friendly question:  
    ```
    >> what actions do you recommend?
    ✍️  I recommend closing 30% of BTCUSDT and adding a stop at 29000. This would reduce liquidation risk.
    ```  
  - **Emojis/Icons:** Use icons like ⚠️, ✅, 🔒 to highlight suggestions.  
- **Effort/Risk:** ~4h. Mostly output phrasing. Very low risk. Charting is extra (1-2h, minimal risk).

### 5. (Optional) Multi-Agent Outline (Best Multi-Agent Collaboration)  
- **Goal:** Show awareness of multi-agent architecture.  
- **Tasks:**  
  - **Design (no code):** In the README or a diagram (ascii-art or ASCII blocks), outline how two or three agents could interact. E.g.:  
    - *MarketAgent:* Collects global data (tickers, news).  
    - *RiskAgent:* Our existing agent, consumes MarketAgent’s signals.  
    - *ExecAgent:* Could execute trades (not in MVP).  
  - **Stub code:** Possibly create empty files `src/marketAgent.ts` and `src/executionAgent.ts` with comments describing intended functions.  
    ```ts
    // marketAgent.ts
    // (Future: fetch global market volatilities, trending news sentiment, then publish to a message queue or file.)
    ```  
    ```ts
    // executionAgent.ts
    // (Future: given recommendations, place orders via `bgc futures place_order --symbol ...`)
    ```  
  - **Demo Mention:** In the 90s demo script, narrate “we could split this into multiple collaborating agents (described)”.  
  - **Effort/Risk:** ~2h to draft docs. Low code risk. This is mostly “bonus design”.

### 6. Final Touches and Demo Preparation  
- **Goal:** Ensure a polished demonstration and submission.  
- **Tasks:**  
  - **Demo Script (60-90s):** Write and rehearse a script covering:  
    1. Launch agent (`node src/index.ts`).  
    2. Show `[Skill]` logs and a key flag.  
    3. Explain flagged item and recommendation.  
    4. Ask a query (e.g., “which positions are at risk?”) and show agent’s reply.  
    5. (Optionally) Toggle `SIMULATION` mode and repeat for safety.  
  - **Screenshots:** Capture terminal windows with the agent running. Ideally include:  
    - The portfolio summary and risk list.  
    - A flagged position with explanation.  
    - A JSON audit snippet.  
    Example embed suggestion:
    【31†embed_image】 *An example trading dashboard highlighting BTC risk.*  
  - **X Post Copy:** Prepare a concise tweet:
    > “🚀 Built **Bitget Risk Watch** for the #BitgetAgentHub Skills Challenge. It scans my Bitget futures portfolio, flags dangerous positions (high leverage, no stop-loss), and recommends protective actions via Bitget Skills (bgc). Demo: live scan, flagged BTC, and suggested risk-reduction steps. @Bitget”【27†L65-L73】  
    Attach screenshots of the demo (2–3 images).  
  - **Documentation:** Update `README.md`:  
    - Clear title and description.  
    - Quickstart (env vars, `npm i`, `bgc` setup) referencing Bitget docs where relevant.  
    - Usage examples (commands, sample output).  
    - Align with challenge language (“Bitget-native agent using Skills”).  
  - **Checklist:** Ensure no CKB references remain. Validate all new features.  
- **Effort/Risk:** ~6h. Mainly polishing. No code risk; just careful organization and clarity.

#### Code Snippets and Examples

**Sample CLI calls (to feature in code or README):**

```bash
# Install CLI
npm install -g bitget-client
bgc --version  # should show bitget-client version

# Live read example commands
bgc futures futures_get_positions --productType USDT-FUTURES
bgc account get_account_assets
bgc futures futures_get_ticker --symbol BTCUSDT
bgc futures futures_get_funding_rate --symbol BTCUSDT
```

**Sample JSON audit entry (one-scan output):**

```json
{
  "timestamp": "2026-04-03T12:00:00Z",
  "mode": "LIVE_READ",
  "accountSummary": {
    "totalFuturesUSD": 15000,
    "totalSpotUSD": 5000
  },
  "positions": [
    {
      "symbol": "BTCUSDT",
      "side": "LONG",
      "size": 0.5,
      "entryPrice": 30000,
      "markPrice": 28000,
      "leverage": 5,
      "unrealizedPnlPct": -6.67,
      "marginRatio": 35,
      "stopLossPresent": false,
      "riskLevel": "WARNING",
      "riskReasons": ["No stop-loss"],
      "recommendation": "Consider setting a stop-loss or reducing size"
    },
    {
      "symbol": "ETHUSDT",
      "side": "SHORT",
      "size": 10,
      "entryPrice": 1800,
      "markPrice": 1750,
      "leverage": 20,
      "unrealizedPnlPct": -5.56,
      "marginRatio": 85,
      "stopLossPresent": true,
      "riskLevel": "CRITICAL",
      "riskReasons": ["Leverage > 10x", "Margin ratio 85%"],
      "recommendation": "Reduce leverage or close position"
    }
  ],
  "flaggedPositions": ["BTCUSDT", "ETHUSDT"],
  "scanStatus": "COMPLETE"
}
```

### 7-Day Sprint Timeline

```mermaid
gantt
    title Bitget Risk Watch 7-Day Sprint (Apr 2026)
    dateFormat  YYYY-MM-DD
    section Integration & Core
    Day 1: Setup CLI & Data Fetch        :done, 2026-04-04, 1d
    Day 2: Implement Risk Rules         :done, 2026-04-05, 1d
    Day 3: Add More Skill Calls         :done, 2026-04-06, 1d
    section Enhancements
    Day 4: Creative Explanations, UX    :done, 2026-04-07, 1d
    Day 5: (Optional) Multi-Agent Design:done, 2026-04-08, 1d
    Day 6: Demo Recording & Screenshots :done, 2026-04-09, 1d
    Day 7: Final Tests & Submission     :done, 2026-04-10, 1d
```

# Demo and X Post

**Demo Script (60–90 seconds):**  

1. **Agent Startup:** “Running Bitget Risk Watch…” show terminal startup.  
2. **Live Scan:** It logs `[Skill]` commands (e.g. `bgc futures_get_positions`) and data summary.  
3. **Flagged Alert:** Display one flagged position (e.g. `BTCUSDT`) with reasons. Explain: “Here, BTC is flagged CRITICAL due to 0% stop-loss and 12x leverage.”  
4. **Recommendation:** Show recommendation: “We suggest adding a stop-loss at $28,500 or reducing size.” Highlight clear action.  
5. **Audit Log:** Show `audit.log` entry or part of JSON.  
6. **Query Example:** User asks “what positions are at risk?” and agent prints the flagged list.  
7. **Summary:** End with the portfolio summary screen again, emphasizing overall health.  

**X (Twitter) Post Draft:**  

> “🔍 Built **Bitget Risk Watch** for the #BitgetAgentHub Skills Challenge! It scans a Bitget futures portfolio, flags risky positions (no stop-loss, high leverage, etc.), and uses Bitget Skills (`bgc` CLI) to recommend protective actions. Demo shows a live risk scan, flagged BTC position, and suggested risk-reduction steps. 🚀 @Bitget”【27†L65-L73】  

_Attach 2–3 screenshots:_ e.g. one of portfolio summary with highlights, one of a flagged position with advice, and one of the JSON audit log or query response.  

By following this plan and focusing on the high-impact items above, **Bitget Risk Watch** will excel in the *Must-Install* and *Most Practical* categories, demonstrate strong *Skill Combination*, and gain extra points for creativity – making it a competitive submission for the Bitget AgentHub Skills Challenge.


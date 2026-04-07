/** Builds and writes the browser-facing HTML report for the latest scan. */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildSkillHubSuggestions } from './skillHub';
import type { ClassifiedPosition, Recommendation, RiskLevel, ScanRecord } from './types';

/** Absolute output path for the generated HTML report. */
export const HTML_REPORT_FILE = resolve(process.cwd(), 'latest-report.html');
const AUTHOR_NAME = 'AnihDev';
const GITHUB_URL = 'https://github.com/anihdev/Bitget_Risk_Watch';

/** Writes the latest scan to disk as a self-contained HTML document. */
export function writeHtmlReport(scanRecord: ScanRecord): string {
  writeFileSync(HTML_REPORT_FILE, buildHtmlReport(scanRecord), 'utf8');
  return HTML_REPORT_FILE;
}

/** Generates the complete HTML document for one scan record. */
function buildHtmlReport(scanRecord: ScanRecord): string {
  const generatedAt = escapeHtml(new Date(scanRecord.timestamp).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }));
  const authorName = escapeHtml(AUTHOR_NAME);
  const githubUrl = escapeHtml(GITHUB_URL);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Bitget Risk Watch Report</title>
  <style>
    :root {
      --bg: #f4efe7;
      --panel: rgba(255, 252, 246, 0.92);
      --panel-strong: #fffdf9;
      --ink: #1e1a16;
      --muted: #6c6359;
      --line: rgba(54, 43, 33, 0.12);
      --safe: #227a52;
      --warning: #b7791f;
      --critical: #b2342b;
      --accent: #0f766e;
      --accent-soft: rgba(15, 118, 110, 0.08);
      --shadow: 0 18px 44px rgba(43, 30, 17, 0.12);
      --radius: 22px;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      font-family: Georgia, "Times New Roman", serif;
      color: var(--ink);
      background:
        radial-gradient(circle at top left, rgba(15, 118, 110, 0.18), transparent 32%),
        radial-gradient(circle at top right, rgba(183, 121, 31, 0.16), transparent 26%),
        linear-gradient(180deg, #f8f2ea 0%, #efe6d8 100%);
    }

    .shell {
      width: min(1180px, calc(100% - 32px));
      margin: 32px auto 56px;
    }

    .hero,
    .panel {
      background: var(--panel);
      backdrop-filter: blur(10px);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
    }

    .hero {
      padding: 28px;
      position: relative;
      overflow: hidden;
      background:
        linear-gradient(135deg, rgba(8, 17, 20, 0.08), rgba(15, 118, 110, 0.04) 42%, rgba(255, 252, 246, 0) 100%),
        var(--panel);
    }

    .hero::before {
      content: "";
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at top center, rgba(15, 118, 110, 0.12), transparent 34%),
        linear-gradient(180deg, rgba(12, 18, 20, 0.05), transparent 52%);
      pointer-events: none;
    }

    .hero::after {
      content: "";
      position: absolute;
      inset: auto -80px -80px auto;
      width: 240px;
      height: 240px;
      background: radial-gradient(circle, rgba(15, 118, 110, 0.18), transparent 68%);
      pointer-events: none;
    }

    .hero::selection {
      background: rgba(15, 118, 110, 0.16);
    }

    .hero > * {
      position: relative;
      z-index: 1;
    }

    .hero-mark {
      position: absolute;
      top: 20px;
      right: 28px;
      font: 600 9px/1 Arial, sans-serif;
      letter-spacing: 0.28em;
      text-transform: uppercase;
      color: rgba(30, 26, 22, 0.24);
      text-decoration: none;
      pointer-events: auto;
      z-index: 1;
    }

    .brand {
      display: grid;
      justify-items: center;
      gap: 8px;
      margin-bottom: 18px;
      text-align: center;
    }

    .brand-title {
      display: inline-flex;
      align-items: baseline;
      gap: 8px;
      font: 600 clamp(24px, 4vw, 38px)/1 Arial, sans-serif;
      letter-spacing: -0.03em;
      color: var(--ink);
      text-shadow: 0 0 18px rgba(15, 118, 110, 0.1);
      flex-wrap: wrap;
      justify-content: center;
    }

    .brand-title-main {
      color: var(--ink);
    }

    .brand-title-byline {
      font-size: 0.52em;
      letter-spacing: 0.02em;
      color: rgba(30, 26, 22, 0.48);
      text-transform: none;
    }

    .brand-sub {
      font: 600 12px/1.4 Arial, sans-serif;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--muted);
    }

    .brand-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 46px;
      padding: 0 22px;
      border-radius: 999px;
      border: 1px solid rgba(15, 118, 110, 0.3);
      background: linear-gradient(180deg, rgba(15, 118, 110, 0.16), rgba(15, 118, 110, 0.08));
      box-shadow:
        0 0 0 1px rgba(255, 255, 255, 0.45) inset,
        0 10px 24px rgba(15, 118, 110, 0.14),
        0 0 26px rgba(15, 118, 110, 0.14);
      color: var(--accent);
      font: 600 13px Arial, sans-serif;
      letter-spacing: 0.06em;
      text-decoration: none;
      transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
    }

    .brand-link:hover {
      transform: translateY(-1px);
      background: linear-gradient(180deg, rgba(15, 118, 110, 0.2), rgba(15, 118, 110, 0.1));
      box-shadow:
        0 0 0 1px rgba(255, 255, 255, 0.55) inset,
        0 16px 34px rgba(15, 118, 110, 0.18),
        0 0 34px rgba(15, 118, 110, 0.2);
    }

    h1, h2, h3 {
      margin: 0;
      font-weight: 600;
    }

    h1 {
      font-size: clamp(32px, 5vw, 52px);
      line-height: 0.98;
      max-width: 10ch;
    }

    .hero-copy {
      display: grid;
      gap: 16px;
      grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
      align-items: end;
    }

    .subhead {
      font-size: 18px;
      line-height: 1.55;
      color: var(--muted);
      max-width: 58ch;
    }

    .hero-meta {
      display: grid;
      gap: 12px;
      justify-items: start;
    }

    .runtime-strip {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-top: 22px;
      padding-top: 18px;
      border-top: 1px solid var(--line);
    }

    .runtime-item {
      padding: 14px 16px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.55);
      border: 1px solid var(--line);
    }

    .runtime-label {
      font: 600 11px Arial, sans-serif;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--muted);
    }

    .runtime-value {
      margin-top: 7px;
      font-size: 16px;
      line-height: 1.35;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-radius: 999px;
      font: 600 13px Arial, sans-serif;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      background: var(--accent-soft);
      color: var(--ink);
      border: 1px solid rgba(15, 118, 110, 0.16);
    }

    .badge.safe { color: var(--safe); border-color: rgba(34, 122, 82, 0.18); background: rgba(34, 122, 82, 0.08); }
    .badge.warning { color: var(--warning); border-color: rgba(183, 121, 31, 0.18); background: rgba(183, 121, 31, 0.08); }
    .badge.critical { color: var(--critical); border-color: rgba(178, 52, 43, 0.18); background: rgba(178, 52, 43, 0.08); }

    .grid {
      display: grid;
      gap: 18px;
      margin-top: 18px;
    }

    .summary-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .summary-card,
    .panel {
      padding: 22px;
    }

    .summary-card {
      background: var(--panel-strong);
      border: 1px solid var(--line);
      border-radius: 18px;
      box-shadow: 0 8px 24px rgba(43, 30, 17, 0.06);
    }

    .summary-card .label,
    th,
    .meta-label {
      font: 600 12px Arial, sans-serif;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--muted);
    }

    .summary-card .value {
      margin-top: 10px;
      font-size: clamp(24px, 4vw, 34px);
      line-height: 1.1;
    }

    .summary-card .hint {
      margin-top: 8px;
      color: var(--muted);
      font-size: 14px;
      line-height: 1.45;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
      margin-bottom: 18px;
    }

    .panel-title {
      display: grid;
      gap: 8px;
    }

    .panel-copy {
      color: var(--muted);
      max-width: 60ch;
      line-height: 1.5;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th {
      text-align: left;
      padding: 0 0 12px;
      border-bottom: 1px solid var(--line);
    }

    td {
      vertical-align: top;
      padding: 16px 8px 16px 0;
      border-bottom: 1px solid var(--line);
      line-height: 1.45;
    }

    tr:last-child td {
      border-bottom: none;
    }

    .mono {
      font-family: "Courier New", monospace;
      font-size: 13px;
    }

    .position-symbol {
      font-size: 18px;
      font-weight: 700;
    }

    .risk-list {
      display: grid;
      gap: 16px;
    }

    .skill-list {
      display: grid;
      gap: 14px;
    }

    .skill-card {
      padding: 18px;
      border: 1px solid var(--line);
      border-radius: 18px;
      background: var(--panel-strong);
    }

    .skill-name {
      font: 600 14px Arial, sans-serif;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--accent);
    }

    .skill-purpose {
      margin-top: 8px;
      line-height: 1.5;
    }

    .skill-meta {
      margin-top: 10px;
      color: var(--muted);
      line-height: 1.5;
    }

    .skill-prompt {
      margin-top: 12px;
      padding: 12px 14px;
      border-radius: 14px;
      background: rgba(15, 118, 110, 0.06);
      border: 1px solid rgba(15, 118, 110, 0.12);
      font: 13px/1.5 "Courier New", monospace;
      color: var(--ink);
    }

    .risk-card {
      padding: 20px;
      border: 1px solid var(--line);
      border-radius: 18px;
      background: var(--panel-strong);
    }

    .risk-card-header {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: flex-start;
      margin-bottom: 10px;
    }

    .reason,
    .recommendation {
      margin-top: 12px;
      padding-left: 14px;
      border-left: 3px solid rgba(15, 118, 110, 0.16);
    }

    .reason-list,
    .recommendation-list {
      display: grid;
      gap: 12px;
      margin-top: 12px;
    }

    .reason-item,
    .recommendation-item {
      padding-left: 14px;
      border-left: 3px solid rgba(15, 118, 110, 0.16);
    }

    .reason-title,
    .recommendation-title {
      font: 600 12px Arial, sans-serif;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--accent);
      margin-bottom: 6px;
    }

    .meta-grid {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      margin-top: 8px;
    }

    .meta-chip {
      padding: 14px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.6);
      border: 1px solid var(--line);
    }

    .meta-value {
      margin-top: 6px;
      font-size: 16px;
    }

    .warning-list {
      margin: 0;
      padding-left: 18px;
      color: var(--muted);
      line-height: 1.6;
    }

    details {
      margin-top: 16px;
    }

    details summary {
      cursor: pointer;
      font: 600 13px Arial, sans-serif;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--accent);
    }

    pre {
      margin: 14px 0 0;
      padding: 18px;
      overflow: auto;
      border-radius: 16px;
      background: #191613;
      color: #f5ecdf;
      font: 13px/1.55 "Courier New", monospace;
    }

    .footer-note {
      margin-top: 16px;
      color: var(--muted);
      font-size: 14px;
      line-height: 1.5;
    }

    @media (max-width: 900px) {
      .hero-copy,
      .summary-grid,
      .meta-grid,
      .runtime-strip {
        grid-template-columns: 1fr;
      }

      .brand {
        margin-bottom: 20px;
      }

      .hero-mark {
        top: 16px;
        right: 18px;
        letter-spacing: 0.18em;
      }

      .panel-header,
      .risk-card-header {
        flex-direction: column;
      }

      table,
      thead,
      tbody,
      th,
      td,
      tr {
        display: block;
      }

      thead {
        display: none;
      }

      td {
        padding: 10px 0;
      }

      td::before {
        content: attr(data-label);
        display: block;
        margin-bottom: 6px;
        font: 600 12px Arial, sans-serif;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted);
      }
    }
  </style>
</head>
<body>
  <main class="shell">
    <section class="hero">
      <a href="${githubUrl}" target="_blank" rel="noreferrer" class="hero-mark">github.com/anihdev/Bitget_Risk_Watch</a>
      <div class="brand">
        <div class="brand-title">
          <span class="brand-title-main">Bitget Risk Watch</span>
          <span class="brand-title-byline">| by ${authorName}</span>
        </div>
        <div class="brand-sub">Bitget-native AI risk engine</div>
        <a href="${githubUrl}" target="_blank" rel="noreferrer" class="brand-link">Live now - open source</a>
      </div>
      <div class="hero-copy">
        <div>
          <h1>Portfolio risk report</h1>
          <p class="subhead">Bitget Risk Watch terminal output for ${escapeHtml(scanRecord.productType)} positions. This is a Real-Time report showing what is at risk, why it was flagged, and the protective actions recommended by bitget market-analysis skills via CLI.</p>
        </div>
        <div class="hero-meta">
          <div class="badge ${riskClass(scanRecord.riskLevel)}">${escapeHtml(scanRecord.riskLevel)} overall risk</div>
          <div class="badge">${escapeHtml(scanRecord.mode)} mode</div>
          <div class="badge">${escapeHtml(scanRecord.scanStatus)} scan status</div>
          <div class="footer-note">Generated ${generatedAt}</div>
        </div>
      </div>
      <div class="runtime-strip">
        <div class="runtime-item">
          <div class="runtime-label">Runtime</div>
          <div class="runtime-value">${escapeHtml(scanRecord.mode)}</div>
        </div>
        <div class="runtime-item">
          <div class="runtime-label">Product</div>
          <div class="runtime-value">${escapeHtml(scanRecord.productType)}</div>
        </div>
        <div class="runtime-item">
          <div class="runtime-label">Scan Status</div>
          <div class="runtime-value">${escapeHtml(scanRecord.scanStatus)}</div>
        </div>
        <div class="runtime-item">
          <div class="runtime-label">Source</div>
          <div class="runtime-value">${escapeHtml(describeScanSource(scanRecord))}</div>
        </div>
      </div>
    </section>

    <section class="grid summary-grid">
      <article class="summary-card">
        <div class="label">Total Equity</div>
        <div class="value">${formatUsd(scanRecord.accountSummary.totalEquity)}</div>
        <div class="hint">Available balance: ${formatUsd(scanRecord.accountSummary.totalAvailable)}</div>
      </article>
      <article class="summary-card">
        <div class="label">Open Positions</div>
        <div class="value">${scanRecord.accountSummary.openPositionCount}</div>
        <div class="hint">${scanRecord.flaggedPositions.length} currently flagged</div>
      </article>
      <article class="summary-card">
        <div class="label">Unrealized PnL</div>
        <div class="value">${formatUsd(scanRecord.accountSummary.totalUnrealizedPnl)}</div>
        <div class="hint">${escapeHtml(describePnlTone(scanRecord.accountSummary.totalUnrealizedPnl))}</div>
      </article>
      <article class="summary-card">
        <div class="label">Diagnostics</div>
        <div class="value">${scanRecord.diagnostics.bgcAvailable ? 'CLI Ready' : 'CLI Missing'}</div>
        <div class="hint">${escapeHtml(describeDiagnostics(scanRecord))}</div>
      </article>
    </section>

    <section class="panel grid">
      <div class="panel-header">
        <div class="panel-title">
          <h2>Risk table</h2>
          <div class="panel-copy">The full position list with leverage, PnL, margin pressure, stop-loss state, and live market context used for classification.</div>
        </div>
      </div>
      ${renderPositionTable(scanRecord.positions)}
    </section>

    <section class="panel grid">
      <div class="panel-header">
        <div class="panel-title">
          <h2>Flagged positions</h2>
          <div class="panel-copy">Focused explanations for positions currently marked as warning or critical, including the recommended protection steps.</div>
        </div>
      </div>
      ${renderFlaggedPositions(scanRecord.flaggedPositions)}
    </section>

    <section class="panel grid">
      <div class="panel-header">
        <div class="panel-title">
          <h2>Recommended Follow-up</h2>
          <div class="panel-copy">Suggested Professional follow-ups for deeper market context after core risk scan. These are optional analyst extensions..</div>
        </div>
      </div>
      ${renderSkillHubSuggestions(scanRecord)}
    </section>

    <section class="panel grid">
      <div class="panel-header">
        <div class="panel-title">
          <h2>Audit and warnings</h2>
          <div class="panel-copy">Runtime safety state, upstream fetch warnings, and a raw JSON view.</div>
        </div>
      </div>
      <div class="meta-grid">
        <div class="meta-chip">
          <div class="meta-label">Bitget CLI</div>
          <div class="meta-value">${scanRecord.diagnostics.bgcAvailable ? 'Available' : 'Unavailable'}</div>
        </div>
        <div class="meta-chip">
          <div class="meta-label">Credentials</div>
          <div class="meta-value">${scanRecord.diagnostics.credentialsPresent ? 'Present' : 'Missing'}</div>
        </div>
        <div class="meta-chip">
          <div class="meta-label">Safety Mode</div>
          <div class="meta-value">${scanRecord.diagnostics.readOnlyMode ? 'Read-only' : 'Execution Enabled'}</div>
        </div>
      </div>
      ${renderWarnings(scanRecord.fetchWarnings)}
      <details>
        <summary>Raw scan JSON</summary>
        <pre>${escapeHtml(JSON.stringify(scanRecord, null, 2))}</pre>
      </details>
    </section>
  </main>
</body>
</html>`;
}

/** Renders the full position table shown in the report. */
function renderPositionTable(positions: ClassifiedPosition[]): string {
  if (positions.length === 0) {
    return '<p class="panel-copy">No open USDT-FUTURES positions were found in this scan.</p>';
  }

  const rows = positions.map((position) => `
    <tr>
      <td data-label="Symbol">
        <div class="position-symbol">${escapeHtml(position.symbol)}</div>
        <div class="panel-copy">${escapeHtml(position.side)} ${escapeHtml(String(position.size))}</div>
      </td>
      <td data-label="Risk">
        <span class="badge ${riskClass(position.riskLevel)}">${escapeHtml(position.riskLevel)}</span>
      </td>
      <td data-label="Leverage">${position.leverage.toFixed(1)}x</td>
      <td data-label="PnL">${formatUsd(position.unrealizedPnl)}<br />${formatPercent(position.unrealizedPnlPct)}</td>
      <td data-label="Margin">${position.marginRatio.toFixed(1)}%</td>
      <td data-label="Stop Loss">${position.stopLossPresent ? 'Present' : 'Missing'}</td>
      <td data-label="Market">
        <div>24h: ${formatNullablePercent(position.marketContext.priceChange24hPct)}</div>
        <div>Funding: ${formatNullablePercent(position.marketContext.fundingRatePct)}</div>
        <div class="mono">${escapeHtml(position.marketContext.markPriceSource)}</div>
      </td>
    </tr>
  `).join('');

  return `<table>
    <thead>
      <tr>
        <th>Position</th>
        <th>Risk</th>
        <th>Leverage</th>
        <th>PnL</th>
        <th>Margin Ratio</th>
        <th>Stop Loss</th>
        <th>Market Context</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

/** Renders the expanded explanation cards for flagged positions only. */
function renderFlaggedPositions(flagged: ClassifiedPosition[]): string {
  if (flagged.length === 0) {
    return '<p class="panel-copy">No positions are currently flagged. The latest scan considered all open positions safe.</p>';
  }

  return `<div class="risk-list">${flagged.map((position) => `
    <article class="risk-card">
      <div class="risk-card-header">
        <div>
          <h3>${escapeHtml(position.symbol)}</h3>
          <div class="panel-copy">${escapeHtml(position.side)} ${escapeHtml(String(position.size))} at ${escapeHtml(String(position.entryPrice))}, mark ${escapeHtml(String(position.markPrice))}</div>
        </div>
        <div class="badge ${riskClass(position.riskLevel)}">${escapeHtml(position.riskLevel)}</div>
      </div>
      <div class="reason">
        <div class="reason-title">Why it was flagged</div>
        <div class="reason-list">${position.riskReasons.map((reason) => `
          <div class="reason-item">
            <div>${escapeHtml(reason.message)}</div>
            <div class="panel-copy">${escapeHtml(reason.traderExplanation)}</div>
          </div>
        `).join('')}</div>
      </div>
      <div class="recommendation">
        <div class="recommendation-title">Recommended actions</div>
        <div class="recommendation-list">${position.recommendation.map(renderRecommendation).join('')}</div>
      </div>
    </article>
  `).join('')}</div>`;
}

/** Renders one recommendation block inside a flagged-position card. */
function renderRecommendation(recommendation: Recommendation): string {
  return `
    <div class="recommendation-item">
      <div>${escapeHtml(recommendation.summary)}</div>
      <div class="panel-copy">${escapeHtml(recommendation.rationale)}</div>
      <div class="panel-copy">Confidence: ${escapeHtml(recommendation.confidence)} | Execution path: ${escapeHtml(recommendation.executionPath.skill)} | Confirmation required: ${recommendation.executionPath.confirmationRequired ? 'Yes' : 'No'}</div>
    </div>
  `;
}

/** Renders the optional Skill Hub follow-up suggestions for the current scan. */
function renderSkillHubSuggestions(scanRecord: ScanRecord): string {
  const suggestions = buildSkillHubSuggestions(scanRecord);
  if (suggestions.length === 0) {
    return '<p class="panel-copy">No enrichment suggestions were generated for this scan.</p>';
  }

  return `<div class="skill-list">${suggestions.map((skill) => `
    <article class="skill-card">
      <div class="skill-name">${escapeHtml(skill.name)}</div>
      <div class="skill-purpose">${escapeHtml(skill.purpose)}</div>
      <div class="skill-meta">When to use: ${escapeHtml(skill.whenToUse)}</div>
      <div class="skill-prompt">${escapeHtml(skill.examplePrompt)}</div>
    </article>
  `).join('')}</div>`;
}

/** Renders upstream warnings collected during fetch and normalization. */
function renderWarnings(warnings: string[]): string {
  if (warnings.length === 0) {
    return '<p class="panel-copy">No upstream fetch warnings were recorded for this scan, All is fine.</p>';
  }

  return `<ul class="warning-list">${warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join('')}</ul>`;
}

/** Describes whether the latest unrealized PnL is net positive, negative, or flat. */
function describePnlTone(value: number): string {
  if (value > 0) {
    return 'Net open profit across the scanned portfolio.';
  }
  if (value < 0) {
    return 'Net open loss across the scanned portfolio.';
  }
  return 'No unrealized profit or loss in the latest scan.';
}

/** Summarizes runtime diagnostics for the dashboard header. */
function describeDiagnostics(scanRecord: ScanRecord): string {
  if (!scanRecord.diagnostics.bgcAvailable) {
    return 'Bitget CLI is not available, so only simulation or limited reads can run here.';
  }
  if (!scanRecord.diagnostics.credentialsPresent && scanRecord.mode !== 'SIMULATION') {
    return 'CLI is available, but private live reads still need credentials.';
  }
  if (scanRecord.diagnostics.readOnlyMode) {
    return 'Scan path remains read-only and cannot place live orders.';
  }
  return 'Execution mode is enabled. Confirm sensitive actions explicitly.';
}

/** Summarizes where the data in the current report came from. */
function describeScanSource(scanRecord: ScanRecord): string {
  if (scanRecord.mode === 'SIMULATION') {
    return 'Bundled simulation data';
  }
  if (!scanRecord.diagnostics.bgcAvailable) {
    return 'Live Bitget read unavailable';
  }
  if (!scanRecord.diagnostics.credentialsPresent) {
    return 'Live read attempted without credentials';
  }
  if (scanRecord.mode === 'LIVE_EXECUTE') {
    return 'Live Bitget read, execution console enabled';
  }
  return 'Live Bitget read';
}

/** Maps risk levels to CSS badge classes. */
function riskClass(riskLevel: RiskLevel): string {
  return riskLevel.toLowerCase();
}

/** Formats USD values for the HTML report. */
function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

/** Formats a signed percentage for table display. */
function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

/** Formats optional percentages while preserving null as n/a. */
function formatNullablePercent(value: number | null): string {
  if (value === null) {
    return 'n/a';
  }
  return `${value >= 0 ? '+' : ''}${value.toFixed(3)}%`;
}

/** Escapes raw text before injecting it into the HTML document. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Answers natural-language questions against the latest saved scan history. */
import { readAuditHistory, readLatestAuditRecord } from './audit';
import { answerSkillHubQuery } from './skillHub';
import type { ClassifiedPosition, ScanRecord } from './types';
import { formatRiskLabel } from './visuals';

/** CLI entry point for query mode. */
function main(): void {
  const question = process.argv.slice(2).join(' ').trim().toLowerCase();
  if (!question) {
    console.log('Usage: npx ts-node src/query.ts "which positions are at risk?"');
    process.exitCode = 1;
    return;
  }

  const latest = readLatestAuditRecord();
  if (!latest) {
    console.log('No audit record found. Run `npx ts-node src/index.ts` first.');
    process.exitCode = 1;
    return;
  }

  console.log(answerQuery(question, latest, readAuditHistory()));
}

/** Routes a user question to the matching query handler. */
function answerQuery(question: string, latest: ScanRecord, history: ScanRecord[]): string {
  const skillHubAnswer = answerSkillHubQuery(question, latest);
  if (skillHubAnswer) {
    return skillHubAnswer;
  }

  if (question.includes('scan my portfolio')) {
    return buildPortfolioSummary(latest);
  }

  if (question.includes('at risk')) {
    if (latest.flaggedPositions.length === 0) {
      return `${formatRiskLabel('SAFE')} No open positions are currently flagged.`;
    }
    return latest.flaggedPositions
      .map((position) => `${position.symbol}: ${formatRiskLabel(position.riskLevel)} because ${joinReasons(position)}`)
      .join('\n');
  }

  if (question.startsWith('why is ') || question.startsWith('why was ')) {
    const symbol = extractSymbol(question);
    const position = findPositionBySymbol(latest.positions, symbol);
    if (!position) {
      return `No position found for ${symbol.toUpperCase()}.`;
    }
    if (position.riskLevel === 'SAFE') {
      return `${position.symbol} is ${formatRiskLabel('SAFE')} in the latest scan.`;
    }
    return `${position.symbol} is ${formatRiskLabel(position.riskLevel)} because ${joinReasons(position)}.`;
  }

  if (question.includes('recommend')) {
    if (latest.flaggedPositions.length === 0) {
      return 'No protective actions are needed right now.';
    }
    return latest.flaggedPositions
      .map(
        (position) =>
          `${position.symbol}: ${position.recommendation.map((item) => item.summary).join(' ')}`,
      )
      .join('\n');
  }

  if (question.includes('what changed')) {
    const previous = history.length > 1 ? history[history.length - 2] : null;
    if (!previous) {
      return 'No previous scan is available yet.';
    }
    return describeChanges(previous, latest);
  }

  if (question.includes('risk summary') || question.includes('show my')) {
    return buildPortfolioSummary(latest);
  }

  return 'Supported queries: scan my portfolio, which positions are at risk, why is BTC flagged, what actions do you recommend, what changed since last scan, show my risk summary, skill hub enrichments, macro outlook, news briefing, sentiment analysis, technical analysis, full market assessment.';
}

/** Compares the current scan with the previous one and highlights material changes. */
function describeChanges(previous: ScanRecord, latest: ScanRecord): string {
  const previousMap = new Map(previous.positions.map((position) => [position.symbol, position]));
  const changes: string[] = [];

  for (const position of latest.positions) {
    const prior = previousMap.get(position.symbol);
    if (!prior) {
      changes.push(`${position.symbol} is new in the latest scan with ${position.riskLevel} risk.`);
      changes[changes.length - 1] = `${position.symbol} is new in the latest scan with ${formatRiskLabel(position.riskLevel)} risk.`;
      continue;
    }
    if (prior.riskLevel !== position.riskLevel) {
      changes.push(
        `${position.symbol} moved from ${formatRiskLabel(prior.riskLevel)} to ${formatRiskLabel(position.riskLevel)}.`,
      );
    }
    if (Math.abs(prior.marginRatio - position.marginRatio) >= 5) {
      changes.push(
        `${position.symbol} margin ratio changed from ${prior.marginRatio.toFixed(1)}% to ${position.marginRatio.toFixed(1)}%.`,
      );
    }
  }

  for (const position of previous.positions) {
    if (!latest.positions.some((item) => item.symbol === position.symbol)) {
      changes.push(`${position.symbol} is no longer open.`);
    }
  }

  return changes.length > 0 ? changes.join('\n') : 'No material changes since the last scan.';
}

/** Joins all risk reasons for a position into one readable explanation. */
function joinReasons(position: ClassifiedPosition): string {
  return position.riskReasons
    .map((reason) => `${reason.message} ${reason.traderExplanation}`)
    .join('; ');
}

/** Builds the compact portfolio summary used by multiple query intents. */
function buildPortfolioSummary(latest: ScanRecord): string {
  return [
    `Overall risk: ${formatRiskLabel(latest.riskLevel)}`,
    `Open positions: ${latest.accountSummary.openPositionCount}`,
    `Flagged positions: ${latest.flaggedPositions.length}`,
    `Unrealized PnL: ${latest.accountSummary.totalUnrealizedPnl.toFixed(2)}`,
  ].join('\n');
}

/** Finds a position by exact or prefix symbol match. */
function findPositionBySymbol(
  positions: ClassifiedPosition[],
  requestedSymbol: string,
): ClassifiedPosition | undefined {
  const normalized = requestedSymbol.toLowerCase();
  return positions.find((item) => {
    const symbol = item.symbol.toLowerCase();
    return symbol === normalized || symbol.startsWith(normalized);
  });
}

/** Extracts the symbol token from "why is ..." style questions. */
function extractSymbol(question: string): string {
  const match = question.match(/why (?:is|was) ([a-z0-9-]+)/);
  return match?.[1]?.toLowerCase() ?? '';
}

main();

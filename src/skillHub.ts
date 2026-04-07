/** Maps scan context to optional Bitget Skill Hub follow-up suggestions. */
import type { ScanRecord } from './types';

export type SkillHubSkillName =
  | 'macro-analyst'
  | 'market-intel'
  | 'news-briefing'
  | 'sentiment-analyst'
  | 'technical-analysis';

export interface SkillHubSkill {
  name: SkillHubSkillName;
  purpose: string;
  whenToUse: string;
  examplePrompt: string;
}

const SKILLS: SkillHubSkill[] = [
  {
    name: 'macro-analyst',
    purpose: 'Explains global macro and cross-asset context for the portfolio.',
    whenToUse: 'Use when you want to understand whether the broader market regime is risk-on or risk-off.',
    examplePrompt:
      'Use macro-analyst to explain whether the current macro regime increases risk for my Bitget futures portfolio.',
  },
  {
    name: 'market-intel',
    purpose: 'Adds ETF, whale-flow, DeFi, and structural market context.',
    whenToUse: 'Use when a flagged major coin needs deeper on-chain or institutional context.',
    examplePrompt:
      'Use market-intel to explain whether ETF flows, whale activity, or on-chain data increase risk for BTC right now.',
  },
  {
    name: 'news-briefing',
    purpose: 'Summarizes the latest market-moving news and narrative shifts.',
    whenToUse: 'Use when a position looks risky and you want to know whether news flow is part of the reason.',
    examplePrompt:
      'Use news-briefing to summarize the latest headlines that could affect my flagged Bitget futures positions.',
  },
  {
    name: 'sentiment-analyst',
    purpose: 'Explains funding, long/short positioning, leverage crowding, and market mood.',
    whenToUse: 'Use when funding pressure, leverage crowding, or squeeze risk may affect a flagged position.',
    examplePrompt:
      'Use sentiment-analyst to explain funding, long-short ratios, open interest, and squeeze risk for BTCUSDT.',
  },
  {
    name: 'technical-analysis',
    purpose: 'Adds indicator-driven support, resistance, trend, and momentum context.',
    whenToUse: 'Use when you want entry, exit, support, resistance, and indicator context for a flagged symbol.',
    examplePrompt:
      'Use technical-analysis to map trend, momentum, support, and resistance for BTCUSDT on 4h and 1d.',
  },
];

/** Returns the static Skill Hub catalog exposed by this project. */
export function getSkillHubCatalog(): SkillHubSkill[] {
  return SKILLS;
}

/** Suggests enrichments based on the latest portfolio risk context. */
export function buildSkillHubSuggestions(scanRecord: ScanRecord): SkillHubSkill[] {
  const suggestions: SkillHubSkill[] = [];
  const hasFlagged = scanRecord.flaggedPositions.length > 0;
  const hasCritical = scanRecord.flaggedPositions.some((position) => position.riskLevel === 'CRITICAL');
  const hasFundingRisk = scanRecord.flaggedPositions.some((position) =>
    position.riskReasons.some((reason) => reason.code === 'HIGH_FUNDING_RATE'),
  );

  if (hasFundingRisk || hasFlagged) {
    suggestions.push(getSkill('sentiment-analyst'));
  }

  if (hasCritical) {
    suggestions.push(getSkill('technical-analysis'));
    suggestions.push(getSkill('news-briefing'));
  }

  if (scanRecord.riskLevel !== 'SAFE') {
    suggestions.push(getSkill('macro-analyst'));
    suggestions.push(getSkill('market-intel'));
  }

  if (suggestions.length === 0) {
    suggestions.push(getSkill('sentiment-analyst'));
    suggestions.push(getSkill('technical-analysis'));
  }

  return dedupeByName(suggestions);
}

/** Answers Skill Hub-specific user queries from the query interface. */
export function answerSkillHubQuery(question: string, scanRecord: ScanRecord): string | null {
  if (question.includes('full market assessment')) {
    return formatSkillList([
      getSkill('macro-analyst'),
      getSkill('sentiment-analyst'),
      getSkill('technical-analysis'),
    ]);
  }

  if (question.includes('macro')) {
    return formatSingleSkill(getSkill('macro-analyst'));
  }

  if (question.includes('market intel') || question.includes('whale') || question.includes('etf')) {
    return formatSingleSkill(getSkill('market-intel'));
  }

  if (question.includes('news') || question.includes('briefing')) {
    return formatSingleSkill(getSkill('news-briefing'));
  }

  if (question.includes('sentiment') || question.includes('funding') || question.includes('open interest')) {
    return formatSingleSkill(getSkill('sentiment-analyst'));
  }

  if (question.includes('technical') || question.includes('ta') || question.includes('support') || question.includes('resistance')) {
    return formatSingleSkill(getSkill('technical-analysis'));
  }

  if (question.includes('skill hub') || question.includes('bitget skills') || question.includes('enrichment')) {
    return [
      'Optional Bitget Skill Hub enrichments for the latest scan:',
      formatSkillList(buildSkillHubSuggestions(scanRecord)),
    ].join('\n');
  }

  return null;
}

/** Looks up one skill definition by name. */
function getSkill(name: SkillHubSkillName): SkillHubSkill {
  const skill = SKILLS.find((item) => item.name === name);
  if (!skill) {
    throw new Error(`Unknown skill: ${name}`);
  }
  return skill;
}

/** Removes duplicate skill suggestions while preserving display order. */
function dedupeByName(items: SkillHubSkill[]): SkillHubSkill[] {
  const seen = new Set<SkillHubSkillName>();
  return items.filter((item) => {
    if (seen.has(item.name)) {
      return false;
    }
    seen.add(item.name);
    return true;
  });
}

/** Formats a one-skill response for direct query answers. */
function formatSingleSkill(skill: SkillHubSkill): string {
  return [
    `${skill.name}: ${skill.purpose}`,
    `When to use: ${skill.whenToUse}`,
    `Prompt: ${skill.examplePrompt}`,
  ].join('\n');
}

/** Formats a list of skills for terminal output. */
function formatSkillList(skills: SkillHubSkill[]): string {
  return skills
    .map(
      (skill) =>
        `- ${skill.name}: ${skill.purpose}\n  When to use: ${skill.whenToUse}\n  Prompt: ${skill.examplePrompt}`,
    )
    .join('\n');
}

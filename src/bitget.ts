import { execFileSync } from 'node:child_process';
import type {
  AccountAsset,
  NormalizedPosition,
  RuntimeMode,
  ScanStatus,
  SkillCall,
} from './types';

type JsonRecord = Record<string, unknown>;
type BgErrorType =
  | 'MISSING_CLI'
  | 'MISSING_CREDENTIALS'
  | 'AUTH'
  | 'VALIDATION'
  | 'RATE_LIMIT'
  | 'UNKNOWN';

interface BgErrorDetails {
  type: BgErrorType;
  userMessage: string;
  rawMessage: string;
}

export interface BitgetLiveState {
  diagnostics: {
    bgcAvailable: boolean;
    credentialsPresent: boolean;
    readOnlyMode: boolean;
  };
  accountAssets: AccountAsset[];
  positions: NormalizedPosition[];
  fetchWarnings: string[];
  skillCalls: SkillCall[];
  scanStatus: ScanStatus;
}

export function readLivePortfolioState(
  productType: 'USDT-FUTURES',
  runtimeMode: RuntimeMode,
): BitgetLiveState {
  const fetchWarnings: string[] = [];
  const skillCalls: SkillCall[] = [];
  let scanStatus: ScanStatus = 'COMPLETE';
  const diagnostics = {
    bgcAvailable: isBgcAvailable(),
    credentialsPresent: hasBitgetCredentials(),
    readOnlyMode: true,
  };

  if (!diagnostics.bgcAvailable) {
    fetchWarnings.push(
      'Bitget CLI is not available on this machine, so LIVE_READ could not contact Bitget. Install it with `npm install -g bitget-client` first.',
    );
    return {
      diagnostics,
      accountAssets: [],
      positions: [],
      fetchWarnings,
      skillCalls,
      scanStatus: 'INCOMPLETE',
    };
  }

  if (!diagnostics.credentialsPresent) {
    fetchWarnings.push(
      'Bitget API credentials were not found, so private account data could not be requested. Configure BITGET_API_KEY, BITGET_SECRET_KEY, and BITGET_PASSPHRASE for LIVE_READ.',
    );
    return {
      diagnostics,
      accountAssets: [],
      positions: [],
      fetchWarnings,
      skillCalls,
      scanStatus: 'INCOMPLETE',
    };
  }

  const assetsPayload = readBgcJson(['account', 'get_account_assets'], fetchWarnings, skillCalls);
  const positionsPayload = readBgcJson(
    ['futures', 'futures_get_positions', '--productType', productType],
    fetchWarnings,
    skillCalls,
  );

  const accountAssets = normalizeAccountAssets(assetsPayload);
  const positions = enrichPositionsWithTickers(
    normalizePositions(positionsPayload),
    fetchWarnings,
    skillCalls,
  );

  if (fetchWarnings.length > 0 || accountAssets.length === 0 || positionsPayload === null) {
    scanStatus = accountAssets.length === 0 && positions.length === 0 ? 'INCOMPLETE' : 'PARTIAL';
  }

  if (runtimeMode === 'LIVE_EXECUTE') {
    fetchWarnings.push('LIVE_EXECUTE is intentionally read-only in this MVP.');
    scanStatus = scanStatus === 'COMPLETE' ? 'PARTIAL' : scanStatus;
  }

  if (positions.length === 0) {
    fetchWarnings.push(
      `No open ${productType} positions were found on this account, so there was nothing to risk-check.`,
    );
  }

  if (accountAssets.length === 0) {
    fetchWarnings.push(
      'Account balances could not be confirmed from the Bitget response, so portfolio totals may be incomplete.',
    );
  }

  if (scanStatus === 'INCOMPLETE' && accountAssets.length === 0 && positions.length === 0) {
    fetchWarnings.push(
      `Live scan finished without usable balances or open ${productType} positions, so a full portfolio risk assessment was not possible.`,
    );
  }

  return { diagnostics, accountAssets, positions, fetchWarnings, skillCalls, scanStatus };
}

function readBgcJson(
  args: string[],
  fetchWarnings: string[],
  skillCalls: SkillCall[],
): unknown | null {
  const fullArgs = ['--read-only', ...args];
  const command = `bgc ${fullArgs.join(' ')}`;
  try {
    const output = execFileSync('bgc', fullArgs, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const parsed = JSON.parse(output) as unknown;
    const cliError = extractCliError(parsed, output);
    if (cliError) {
      fetchWarnings.push(cliError.userMessage);
      skillCalls.push({
        surface: 'Bitget AgentHub Skills',
        command,
        status: 'FAILED',
        note: cliError.rawMessage,
      });
      return null;
    }

    skillCalls.push({
      surface: 'Bitget AgentHub Skills',
      command,
      status: 'SUCCESS',
      note: 'Bitget skill call completed successfully.',
    });
    return parsed;
  } catch (error: unknown) {
    const cliPayload = extractPayloadFromFailure(error);
    const cliError = cliPayload ? extractCliError(cliPayload, JSON.stringify(cliPayload)) : null;
    if (cliError) {
      fetchWarnings.push(cliError.userMessage);
      skillCalls.push({
        surface: 'Bitget AgentHub Skills',
        command,
        status: 'FAILED',
        note: cliError.rawMessage,
      });
      return null;
    }

    const details = normalizeBgcFailure(error, command);
    fetchWarnings.push(details.userMessage);
    skillCalls.push({
      surface: 'Bitget AgentHub Skills',
      command,
      status: 'FAILED',
      note: details.rawMessage,
    });
    return null;
  }
}

function normalizeAccountAssets(payload: unknown): AccountAsset[] {
  const entries = unwrapCollection(payload);
  return entries
    .map((entry) => {
      const asset = readString(entry, ['coin', 'asset', 'marginCoin']) ?? 'UNKNOWN';
      return {
        asset,
        available: readNumber(entry, ['available', 'availableBalance', 'usdtAvailable', 'free']) ?? 0,
        equity: readNumber(entry, ['equity', 'balance', 'accountEquity', 'total']) ?? 0,
        locked: readNumber(entry, ['frozen', 'locked', 'hold']) ?? 0,
        unrealizedPnl: readNumber(entry, ['unrealizedPL', 'upl', 'unrealizedPnl']) ?? 0,
      };
    })
    .filter((entry) => entry.asset !== 'UNKNOWN' || entry.equity !== 0);
}

function normalizePositions(payload: unknown): NormalizedPosition[] {
  const entries = unwrapCollection(payload);
  return entries
    .map((entry) => normalizePosition(entry))
    .filter((position): position is NormalizedPosition => position !== null);
}

function normalizePosition(entry: JsonRecord): NormalizedPosition | null {
  const symbol = readString(entry, ['symbol', 'instId', 'marginCoin']);
  if (!symbol) {
    return null;
  }

  const size = readNumber(entry, ['size', 'total', 'positionSize', 'holdSideSize']) ?? 0;
  const entryPrice = readNumber(entry, ['entryPrice', 'openPriceAvg', 'averageOpenPrice']) ?? 0;
  const rawMarkPrice = readNumber(entry, ['markPrice', 'marketPrice', 'last']);
  const markPrice = rawMarkPrice ?? entryPrice;
  const leverage = readNumber(entry, ['leverage']) ?? 0;
  const unrealizedPnl = readNumber(entry, ['unrealizedPL', 'upl', 'unrealizedPnl']) ?? 0;
  const unrealizedPnlPct = inferUnrealizedPnlPct(entry, unrealizedPnl, entryPrice, size);
  const marginRatio = inferMarginRatio(entry);
  const stopLossPresent = inferStopLossPresent(entry);

  return {
    symbol,
    side: inferSide(entry),
    size,
    entryPrice,
    markPrice,
    leverage,
    unrealizedPnl,
    unrealizedPnlPct,
    marginRatio,
    stopLossPresent,
    marketContext: {
      fundingRatePct: null,
      priceChange24hPct: inferPct(readNumber(entry, ['priceChangePercent', 'changeUtc24h', 'chgUtc'])),
      markPriceSource: rawMarkPrice === null ? 'futures_ticker' : 'position',
    },
  };
}

function enrichPositionsWithTickers(
  positions: NormalizedPosition[],
  fetchWarnings: string[],
  skillCalls: SkillCall[],
): NormalizedPosition[] {
  return positions.map((position) => {
    const tickerSnapshot = readTickerSnapshot(position.symbol, fetchWarnings, skillCalls);
    const fundingRatePct = readFundingRate(position.symbol, fetchWarnings, skillCalls);

    let nextPosition: NormalizedPosition = {
      ...position,
      marketContext: {
        ...position.marketContext,
        fundingRatePct,
        priceChange24hPct: tickerSnapshot?.priceChange24hPct ?? position.marketContext.priceChange24hPct,
        markPriceSource: tickerSnapshot?.markPriceSource ?? position.marketContext.markPriceSource,
      },
    };

    if (position.markPrice > 0 && position.markPrice !== position.entryPrice) {
      return nextPosition;
    }

    const tickerPrice = tickerSnapshot?.markPrice ?? null;
    if (tickerPrice === null) {
      return nextPosition;
    }

    nextPosition = {
      ...nextPosition,
      markPrice: tickerPrice,
    };

    return nextPosition;
  });
}

function readTickerSnapshot(
  symbol: string,
  fetchWarnings: string[],
  skillCalls: SkillCall[],
): { markPrice: number | null; priceChange24hPct: number | null; markPriceSource: 'futures_ticker' | 'spot_ticker_fallback' } | null {
  const futuresPayload = readBgcJson(
    ['futures', 'futures_get_ticker', '--symbol', symbol],
    fetchWarnings,
    skillCalls,
  );
  const futuresEntry = unwrapFirstRecord(futuresPayload);

  if (futuresEntry) {
    return {
      markPrice: readNumber(futuresEntry, ['markPrice', 'lastPr', 'last', 'close', 'price']),
      priceChange24hPct: inferPct(
        readNumber(futuresEntry, [
          'changeUtc24h',
          'priceChangePercent',
          'chgUtc',
          'changeRate',
          'riseFallRate',
        ]),
      ),
      markPriceSource: 'futures_ticker',
    };
  }

  const spotPayload = readBgcJson(['spot', 'spot_get_ticker', '--symbol', symbol], fetchWarnings, skillCalls);
  const spotEntry = unwrapFirstRecord(spotPayload);
  if (!spotEntry) {
    return null;
  }

  return {
    markPrice: readNumber(spotEntry, ['lastPr', 'last', 'close', 'price']),
    priceChange24hPct: inferPct(
      readNumber(spotEntry, ['priceChangePercent', 'changeUtc24h', 'chgUtc', 'changeRate', 'riseFallRate']),
    ),
    markPriceSource: 'spot_ticker_fallback',
  };
}

function readFundingRate(
  symbol: string,
  fetchWarnings: string[],
  skillCalls: SkillCall[],
): number | null {
  const payload = readBgcJson(
    ['futures', 'futures_get_funding_rate', '--symbol', symbol],
    fetchWarnings,
    skillCalls,
  );
  const entry = unwrapFirstRecord(payload);
  if (!entry) {
    return null;
  }

  return inferPct(readNumber(entry, ['fundingRate', 'fundRate']));
}

function unwrapCollection(payload: unknown): JsonRecord[] {
  if (Array.isArray(payload)) {
    return payload.filter(isJsonRecord);
  }

  if (!isJsonRecord(payload)) {
    return [];
  }

  const candidates = [payload.data, payload.list, payload.result];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(isJsonRecord);
    }
    if (isJsonRecord(candidate)) {
      const nested = [candidate.list, candidate.data, candidate.rows];
      for (const value of nested) {
        if (Array.isArray(value)) {
          return value.filter(isJsonRecord);
        }
      }
    }
  }

  return [];
}

function unwrapFirstRecord(payload: unknown): JsonRecord | null {
  const collection = unwrapCollection(payload);
  const first = collection[0];
  if (first) {
    return first;
  }

  return isJsonRecord(payload) ? payload : null;
}

function inferSide(entry: JsonRecord): 'long' | 'short' | 'unknown' {
  const side = readString(entry, ['holdSide', 'side', 'posSide'])?.toLowerCase();
  if (side === 'long' || side === 'buy') {
    return 'long';
  }
  if (side === 'short' || side === 'sell') {
    return 'short';
  }
  return 'unknown';
}

function inferStopLossPresent(entry: JsonRecord): boolean {
  const stopLoss = readNumber(entry, [
    'stopLossPrice',
    'presetStopLossPrice',
    'stopSurplusTriggerPrice',
    'planStopLossPrice',
  ]);
  return typeof stopLoss === 'number' && stopLoss > 0;
}

function inferUnrealizedPnlPct(
  entry: JsonRecord,
  unrealizedPnl: number,
  entryPrice: number,
  size: number,
): number {
  const direct = readNumber(entry, ['unrealizedPLR', 'uplRate', 'unrealizedPnlPct', 'profitRate']);
  if (typeof direct === 'number') {
    return Math.abs(direct) <= 1 ? direct * 100 : direct;
  }

  const notional = entryPrice * Math.abs(size);
  if (notional === 0) {
    return 0;
  }

  return (unrealizedPnl / notional) * 100;
}

function inferMarginRatio(entry: JsonRecord): number {
  const direct = readNumber(entry, ['marginRatio', 'marginRate', 'keepMarginRate']);
  if (typeof direct === 'number') {
    return Math.abs(direct) <= 1 ? direct * 100 : direct;
  }
  return 0;
}

function inferPct(value: number | null): number | null {
  if (typeof value !== 'number') {
    return null;
  }
  return Math.abs(value) <= 1 ? value * 100 : value;
}

function isBgcAvailable(): boolean {
  try {
    execFileSync('bgc', ['--version'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return true;
  } catch {
    return false;
  }
}

function hasBitgetCredentials(): boolean {
  return Boolean(
    process.env.BITGET_API_KEY &&
      process.env.BITGET_SECRET_KEY &&
      process.env.BITGET_PASSPHRASE,
  );
}

function extractCliError(payload: unknown, fallback: string): BgErrorDetails | null {
  if (!isJsonRecord(payload) || payload.ok !== false || !isJsonRecord(payload.error)) {
    return null;
  }

  const type = typeof payload.error.type === 'string' ? payload.error.type : 'UnknownError';
  const message =
    typeof payload.error.message === 'string' ? payload.error.message : fallback;
  const suggestion =
    typeof payload.error.suggestion === 'string' ? payload.error.suggestion : null;

  const rawMessage = suggestion ? `${type}: ${message} ${suggestion}` : `${type}: ${message}`;

  if (type === 'ConfigError' && message.includes('requires API credentials')) {
    return {
      type: 'MISSING_CREDENTIALS',
      userMessage:
        'Bitget received no usable private API credentials, so account data could not be loaded. Set BITGET_API_KEY, BITGET_SECRET_KEY, and BITGET_PASSPHRASE before using LIVE_READ.',
      rawMessage,
    };
  }

  if (type === 'ValidationError') {
    return {
      type: 'VALIDATION',
      userMessage: `Bitget CLI validation failed for ${message.replace(/"/g, '')}.`,
      rawMessage,
    };
  }

  return {
    type: 'UNKNOWN',
    userMessage: `Bitget CLI returned an error: ${message}`,
    rawMessage,
  };
}

function normalizeBgcFailure(error: unknown, command: string): BgErrorDetails {
  const message = error instanceof Error ? error.message : 'Unknown bgc error';
  const combinedOutput = readFailureOutput(error);

  if (
    message.includes('ENOENT') ||
    message.includes('not found') ||
    /spawnSync bgc ENOENT/i.test(message)
  ) {
    return {
      type: 'MISSING_CLI',
      userMessage:
        'Bitget CLI is not installed or not on PATH, so live Bitget reads cannot run. Install it with `npm install -g bitget-client`.',
      rawMessage: combinedOutput || message,
    };
  }

  if (/credential|passphrase|api key/i.test(combinedOutput || message)) {
    return {
      type: 'MISSING_CREDENTIALS',
      userMessage:
        'Bitget credentials were rejected or incomplete, so account data could not be trusted. Verify BITGET_API_KEY, BITGET_SECRET_KEY, and BITGET_PASSPHRASE.',
      rawMessage: combinedOutput || message,
    };
  }

  if (/auth|unauthori[sz]ed|forbidden/i.test(combinedOutput || message)) {
    return {
      type: 'AUTH',
      userMessage: `Bitget rejected the account request while running ${command}. Check API key permissions and account access.`,
      rawMessage: combinedOutput || message,
    };
  }

  if (/rate limit|too many requests|429/i.test(combinedOutput || message)) {
    return {
      type: 'RATE_LIMIT',
      userMessage: `Bitget temporarily limited requests while running ${command}, so this scan could not finish with full live data. Retry in a moment.`,
      rawMessage: combinedOutput || message,
    };
  }

  return {
    type: 'UNKNOWN',
    userMessage: `${command} failed: ${combinedOutput || message}`,
    rawMessage: combinedOutput || message,
  };
}

function extractPayloadFromFailure(error: unknown): unknown | null {
  const output = readFailureOutput(error);
  if (!output) {
    return null;
  }

  try {
    return JSON.parse(output);
  } catch {
    return null;
  }
}

function readFailureOutput(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return '';
  }

  const stdout = 'stdout' in error ? toUtf8(error.stdout) : '';
  const stderr = 'stderr' in error ? toUtf8(error.stderr) : '';
  return [stdout, stderr].filter(Boolean).join('\n').trim();
}

function toUtf8(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (Buffer.isBuffer(value)) {
    return value.toString('utf8').trim();
  }
  return '';
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(entry: JsonRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = entry[key];
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim();
    }
  }
  return null;
}

function readNumber(entry: JsonRecord, keys: string[]): number | null {
  for (const key of keys) {
    const value = entry[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

import { execFileSync } from 'node:child_process';
import type { AccountAsset, NormalizedPosition, RuntimeMode, ScanStatus } from './types';

type JsonRecord = Record<string, unknown>;

export interface BitgetLiveState {
  accountAssets: AccountAsset[];
  positions: NormalizedPosition[];
  fetchWarnings: string[];
  scanStatus: ScanStatus;
}

export function readLivePortfolioState(
  productType: 'USDT-FUTURES',
  runtimeMode: RuntimeMode,
): BitgetLiveState {
  const fetchWarnings: string[] = [];
  let scanStatus: ScanStatus = 'COMPLETE';

  const assetsPayload = readBgcJson(['account', 'get_account_assets'], fetchWarnings);
  const positionsPayload = readBgcJson(
    ['futures', 'futures_get_positions', '--productType', productType],
    fetchWarnings,
  );

  const accountAssets = normalizeAccountAssets(assetsPayload);
  const positions = enrichPositionsWithTickers(normalizePositions(positionsPayload), fetchWarnings);

  if (fetchWarnings.length > 0 || accountAssets.length === 0 || positionsPayload === null) {
    scanStatus = accountAssets.length === 0 && positions.length === 0 ? 'INCOMPLETE' : 'PARTIAL';
  }

  if (runtimeMode === 'LIVE_EXECUTE') {
    fetchWarnings.push('LIVE_EXECUTE is intentionally read-only in this MVP.');
    scanStatus = scanStatus === 'COMPLETE' ? 'PARTIAL' : scanStatus;
  }

  if (positions.length === 0) {
    fetchWarnings.push(`No futures positions were returned for ${productType}.`);
  }

  return { accountAssets, positions, fetchWarnings, scanStatus };
}

function readBgcJson(args: string[], fetchWarnings: string[]): unknown | null {
  try {
    const output = execFileSync('bgc', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return JSON.parse(output);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown bgc error';
    fetchWarnings.push(`bgc ${args.join(' ')} failed: ${message}`);
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
  };
}

function enrichPositionsWithTickers(
  positions: NormalizedPosition[],
  fetchWarnings: string[],
): NormalizedPosition[] {
  return positions.map((position) => {
    if (position.markPrice > 0 && position.markPrice !== position.entryPrice) {
      return position;
    }

    const tickerPrice = readTickerPrice(position.symbol, fetchWarnings);
    if (tickerPrice === null) {
      return position;
    }

    return {
      ...position,
      markPrice: tickerPrice,
    };
  });
}

function readTickerPrice(symbol: string, fetchWarnings: string[]): number | null {
  const payload = readBgcJson(['spot', 'spot_get_ticker', '--symbol', symbol], fetchWarnings);
  const entry = unwrapFirstRecord(payload);
  if (!entry) {
    return null;
  }
  return readNumber(entry, ['lastPr', 'last', 'close', 'price']);
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

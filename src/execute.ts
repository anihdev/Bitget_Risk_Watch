/** Provides a confirmation-gated console for explicit execution and account management commands. */
import { execFileSync } from 'node:child_process';
import { config } from './config';
import { appendExecutionAuditRecord, readLatestAuditRecord } from './audit';
import type { ClassifiedPosition, ExecutionAuditRecord, Recommendation } from './types';

/** Supported console operation types. */
type Operation = 'execute' | 'cancel' | 'orders' | 'fills' | 'positions';

/** Parsed CLI options for the execution console. */
interface CliOptions {
  symbol: string;
  operation: Operation;
  action?: string;
  confirm?: string;
  sizePct?: number;
  leverage?: string;
  orderId?: string;
  cancelAll: boolean;
  paperTrading: boolean;
  includeHistory: boolean;
  limit?: number;
}

/** Human-readable preview plus raw Bitget CLI arguments for a pending command. */
interface CommandPreview {
  args: string[];
  summary: string[];
}

/** CLI entry point for the execution console. */
function main(): void {
  const options = parseArgs(process.argv.slice(2));

  if (!options.symbol) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  if (config.runtimeMode !== 'LIVE_EXECUTE') {
    console.log(
      'Execution tools are disabled in the current mode. Set RUNTIME_MODE=LIVE_EXECUTE before using the trading console.',
    );
    process.exitCode = 1;
    return;
  }

  const latest = readLatestAuditRecord();
  const auditPosition = latest
    ? latest.positions.find((item) => item.symbol.toLowerCase() === options.symbol.toLowerCase())
    : null;
  const position = auditPosition ?? readLivePosition(options.symbol);

  if (options.operation === 'execute') {
    handleExecution(options, position);
    return;
  }

  handleNonExecutionOperation(options);
}

/** Handles recommendation-backed trading actions with confirmation gating. */
function handleExecution(options: CliOptions, position: ClassifiedPosition | null): void {
  if (!position) {
    console.log(`No position found for ${options.symbol.toUpperCase()} in the latest scan.`);
    console.log('No live position could be confirmed either, so no execution request was prepared.');
    process.exitCode = 1;
    return;
  }

  const executable = getExecutableRecommendations(position);
  if (executable.length === 0) {
    console.log(`${position.symbol} has no supported executable recommendations in the current flow.`);
    process.exitCode = 1;
    return;
  }

  if (!options.action) {
    console.log(`Executable actions for ${position.symbol}:`);
    for (const item of executable) {
      console.log(`- ${item.action}: ${item.summary}`);
    }
    console.log('\nRe-run with --action "<action>" to preview the exact Bitget command.');
    return;
  }

  const recommendation = executable.find(
    (item) => item.action.toLowerCase() === options.action?.toLowerCase(),
  );
  if (!recommendation) {
    console.log(`Unsupported action "${options.action}" for ${position.symbol}.`);
    console.log('Supported actions:');
    for (const item of executable) {
      console.log(`- ${item.action}`);
    }
    process.exitCode = 1;
    return;
  }

  const preview = buildExecutionCommand(position, recommendation, options);
  printPreview(preview);

  const requiredConfirmToken = buildConfirmToken(position.symbol, recommendation.action);
  // Every actionable preview is audited before any live request can be sent.
  writeExecutionAudit({
    symbol: position.symbol,
    operation: 'PREVIEW',
    action: recommendation.action,
    command: buildCommandString(preview.args),
    confirmationProvided: options.confirm === requiredConfirmToken,
    paperTrading: options.paperTrading,
    status: options.confirm === requiredConfirmToken ? 'PREVIEWED' : 'BLOCKED',
    note:
      options.confirm === requiredConfirmToken
        ? 'Execution preview confirmed and ready to submit.'
        : 'Execution preview shown. No order was sent because the required confirmation token was not provided.',
    ...(requiredConfirmToken ? { confirmationTokenRequired: requiredConfirmToken } : {}),
  });

  if (options.confirm !== requiredConfirmToken) {
    console.log('\nNo trade was sent.');
    console.log(`To execute this action, re-run with: --confirm ${requiredConfirmToken}`);
    process.exitCode = 1;
    return;
  }

  runBgcCommand(preview.args, {
    symbol: position.symbol,
    operation: 'EXECUTE',
    action: recommendation.action,
    command: buildCommandString(preview.args),
    confirmationProvided: true,
    paperTrading: options.paperTrading,
    ...(requiredConfirmToken ? { confirmationTokenRequired: requiredConfirmToken } : {}),
  });
}

/** Handles read-only queries and destructive order-management commands. */
function handleNonExecutionOperation(options: CliOptions): void {
  const preview = buildManagementCommand(options);
  printPreview(preview);

  const destructive = options.operation === 'cancel';
  const requiredConfirmToken = destructive
    ? buildConfirmToken(options.symbol, options.cancelAll ? 'cancel_all_orders' : 'cancel_order')
    : undefined;
  // Cancellation flows use the same preview-then-confirm pattern as order execution.
  writeExecutionAudit({
    symbol: options.symbol,
    operation: mapOperation(options.operation),
    action: summarizeManagementAction(options),
    command: buildCommandString(preview.args),
    confirmationProvided: requiredConfirmToken ? options.confirm === requiredConfirmToken : false,
    paperTrading: options.paperTrading,
    status:
      destructive && options.confirm !== requiredConfirmToken ? 'BLOCKED' : 'PREVIEWED',
    note:
      destructive && options.confirm !== requiredConfirmToken
        ? 'Management action preview shown. No request was sent because the required confirmation token was not provided.'
        : 'Management command preview shown.',
    ...(requiredConfirmToken ? { confirmationTokenRequired: requiredConfirmToken } : {}),
  });

  if (destructive) {
    if (options.confirm !== requiredConfirmToken) {
      console.log('\nNo cancellation request was sent.');
      console.log(`To execute this action, re-run with: --confirm ${requiredConfirmToken}`);
      process.exitCode = 1;
      return;
    }
  }

  runBgcCommand(preview.args, {
    symbol: options.symbol,
    operation: mapOperation(options.operation),
    action: summarizeManagementAction(options),
    command: buildCommandString(preview.args),
    confirmationProvided: Boolean(requiredConfirmToken),
    paperTrading: options.paperTrading,
    ...(requiredConfirmToken ? { confirmationTokenRequired: requiredConfirmToken } : {}),
  });
}

/** Parses command-line arguments into the execution console option model. */
function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    symbol: '',
    operation: 'execute',
    cancelAll: false,
    paperTrading: false,
    includeHistory: false,
  };

  if (args[0] && !args[0].startsWith('--')) {
    options.symbol = args[0];
  }

  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    if (arg === '--action' && next) {
      options.action = next;
      index += 1;
      continue;
    }

    if (arg === '--confirm' && next) {
      options.confirm = next;
      index += 1;
      continue;
    }

    if (arg === '--size-pct' && next) {
      options.sizePct = Number(next);
      index += 1;
      continue;
    }

    if (arg === '--leverage' && next) {
      options.leverage = next;
      index += 1;
      continue;
    }

    if (arg === '--order-id' && next) {
      options.orderId = next;
      index += 1;
      continue;
    }

    if (arg === '--limit' && next) {
      options.limit = Number(next);
      index += 1;
      continue;
    }

    if (arg === '--paper-trading') {
      options.paperTrading = true;
      continue;
    }

    if (arg === '--history') {
      options.includeHistory = true;
      continue;
    }

    if (arg === '--cancel') {
      options.operation = 'cancel';
      continue;
    }

    if (arg === '--cancel-all') {
      options.operation = 'cancel';
      options.cancelAll = true;
      continue;
    }

    if (arg === '--show-orders') {
      options.operation = 'orders';
      continue;
    }

    if (arg === '--show-fills') {
      options.operation = 'fills';
      continue;
    }

    if (arg === '--show-positions') {
      options.operation = 'positions';
    }
  }

  return options;
}

/** Filters recommendations down to the actions this console can actually execute. */
function getExecutableRecommendations(position: ClassifiedPosition): Recommendation[] {
  return position.recommendation.filter((item) =>
    ['futures_place_order', 'futures_set_leverage'].includes(item.executionPath.skill),
  );
}

/** Converts one recommendation into a concrete Bitget CLI trade command preview. */
function buildExecutionCommand(
  position: ClassifiedPosition,
  recommendation: Recommendation,
  options: CliOptions,
): CommandPreview {
  const prefix = options.paperTrading ? ['--paper-trading'] : [];

  if (recommendation.executionPath.skill === 'futures_set_leverage') {
    const leverage = options.leverage ?? String(Math.max(1, config.thresholds.leverageWarning - 1));
    return {
      args: [
        ...prefix,
        'futures',
        'futures_set_leverage',
        '--productType',
        config.productType,
        '--symbol',
        position.symbol,
        '--marginCoin',
        'USDT',
        '--leverage',
        leverage,
      ],
      summary: [
        `Symbol: ${position.symbol}`,
        `Action: ${recommendation.action}`,
        `Effect: Set leverage to ${leverage}x for ${position.symbol}.`,
        `Environment: ${options.paperTrading ? 'Bitget demo trading' : 'Live account'}`,
      ],
    };
  }

  const sizePct = validateSizePct(options.sizePct ?? 25);
  const orderSize = formatDecimal((Math.abs(position.size) * sizePct) / 100);
  const side = position.side === 'long' ? 'sell' : position.side === 'short' ? 'buy' : 'sell';

  // Reduce-only orders are used so this flow cannot accidentally increase exposure.
  const orders = JSON.stringify([
    {
      symbol: position.symbol,
      productType: config.productType,
      marginCoin: 'USDT',
      marginMode: 'crossed',
      side,
      orderType: 'market',
      size: orderSize,
      reduceOnly: 'YES',
      clientOid: buildClientOid(position.symbol, recommendation.action),
    },
  ]);

  return {
    args: [...prefix, 'futures', 'futures_place_order', '--orders', orders],
    summary: [
      `Symbol: ${position.symbol}`,
      `Action: ${recommendation.action}`,
      `Effect: Submit a reduce-only market order for ${sizePct}% of the current position (${orderSize} contracts/units).`,
      `Trade side: ${side}`,
      `Environment: ${options.paperTrading ? 'Bitget demo trading' : 'Live account'}`,
    ],
  };
}

/** Builds a preview for non-execution management and inspection commands. */
function buildManagementCommand(options: CliOptions): CommandPreview {
  const prefix = options.paperTrading ? ['--paper-trading'] : [];

  if (options.operation === 'cancel') {
    if (!options.cancelAll && !options.orderId) {
      throw new Error('Cancellation requires either --cancel-all or --order-id <id>.');
    }

    const args = options.cancelAll
      ? [
          ...prefix,
          'futures',
          'futures_cancel_orders',
          '--productType',
          config.productType,
          '--symbol',
          options.symbol,
          '--cancelAll',
          'true',
        ]
      : [
          ...prefix,
          'futures',
          'futures_cancel_orders',
          '--productType',
          config.productType,
          '--symbol',
          options.symbol,
          '--orderId',
          String(options.orderId),
        ];

    return {
      args,
      summary: [
        `Symbol: ${options.symbol}`,
        `Action: ${options.cancelAll ? 'cancel all open orders for this symbol' : `cancel order ${options.orderId}`}`,
        `Environment: ${options.paperTrading ? 'Bitget demo trading' : 'Live account'}`,
      ],
    };
  }

  if (options.operation === 'orders') {
    const args = [
      ...prefix,
      '--read-only',
      'futures',
      'futures_get_orders',
      '--productType',
      config.productType,
      '--symbol',
      options.symbol,
      '--status',
      options.includeHistory ? 'history' : 'open',
    ];

    if (options.orderId) {
      args.push('--orderId', options.orderId);
    }
    if (options.limit) {
      args.push('--limit', String(options.limit));
    }

    return {
      args,
      summary: [
        `Symbol: ${options.symbol}`,
        `Action: ${options.includeHistory ? 'show order history' : 'show open orders'}`,
      ],
    };
  }

  if (options.operation === 'fills') {
    const args = [
      ...prefix,
      '--read-only',
      'futures',
      'futures_get_fills',
      '--productType',
      config.productType,
      '--symbol',
      options.symbol,
    ];

    if (options.orderId) {
      args.push('--orderId', options.orderId);
    }
    if (options.limit) {
      args.push('--limit', String(options.limit));
    }
    if (options.includeHistory) {
      args.push('--startTime', '1');
    }

    return {
      args,
      summary: [
        `Symbol: ${options.symbol}`,
        `Action: ${options.includeHistory ? 'show fill history' : 'show recent fills'}`,
      ],
    };
  }

  const args = [
    ...prefix,
    '--read-only',
    'futures',
    'futures_get_positions',
    '--productType',
    config.productType,
    '--symbol',
    options.symbol,
  ];

  if (options.includeHistory) {
    args.push('--history', 'true');
  }

  return {
    args,
    summary: [
      `Symbol: ${options.symbol}`,
      `Action: ${options.includeHistory ? 'show position history' : 'show current position state'}`,
    ],
  };
}

/** Executes a prepared Bitget CLI command and audits the result. */
function runBgcCommand(
  args: string[],
  context: Omit<ExecutionAuditRecord, 'timestamp' | 'mode' | 'productType' | 'status' | 'note' | 'response'>,
): void {
  try {
    const output = execFileSync('bgc', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    writeExecutionAudit({
      ...context,
      status: 'SUCCESS',
      note: 'Bitget command completed successfully.',
      response: output.trim(),
    });
    renderCommandResult(context.action, output.trim());
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown bgc error';
    const stdout = readErrorStream(error, 'stdout');
    const stderr = readErrorStream(error, 'stderr');

    writeExecutionAudit({
      ...context,
      status: 'FAILED',
      note: 'Bitget command failed.',
      response: [stdout, stderr].filter(Boolean).join('\n').trim() || message,
    });
    console.log('\nBitget request failed.');
    if (stdout) {
      console.log(stdout);
    }
    if (stderr) {
      console.log(stderr);
    }
    if (!stdout && !stderr) {
      console.log(message);
    }
    process.exitCode = 1;
  }
}

/** Renders successful command output in a simplified operator view when possible. */
function renderCommandResult(action: string, rawOutput: string): void {
  console.log('\nBitget response:');

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawOutput);
  } catch {
    console.log(rawOutput);
    return;
  }

  if (action.includes('position')) {
    if (renderPositions(parsed)) {
      return;
    }
  }

  if (action.includes('order')) {
    if (renderOrders(parsed)) {
      return;
    }
  }

  if (action.includes('fill')) {
    if (renderFills(parsed)) {
      return;
    }
  }

  console.log(JSON.stringify(parsed, null, 2));
}

/** Renders a compact position list from Bitget position payloads. */
function renderPositions(payload: unknown): boolean {
  const entries = unwrapCollection(payload);
  if (entries.length === 0) {
    return false;
  }

  console.log('Open Positions');
  for (const entry of entries) {
    const symbol = readString(entry, ['symbol', 'instId']) ?? 'UNKNOWN';
    const side = inferSide(entry);
    const size = readNumber(entry, ['size', 'total', 'positionSize', 'holdSideSize']) ?? 0;
    const entryPrice = readNumber(entry, ['entryPrice', 'openPriceAvg', 'averageOpenPrice']) ?? 0;
    const markPrice = readNumber(entry, ['markPrice', 'marketPrice', 'last']) ?? 0;
    const leverage = readNumber(entry, ['leverage']) ?? 0;
    const pnl = readNumber(entry, ['unrealizedPL', 'upl', 'unrealizedPnl']) ?? 0;
    const margin = readPercent(readNumber(entry, ['marginRatio', 'marginRate', 'keepMarginRate']));

    console.log(`- ${symbol} | ${side} | size ${formatNumber(size)} | leverage ${formatNumber(leverage)}x`);
    console.log(
      `  Entry ${formatNumber(entryPrice)} | Mark ${formatNumber(markPrice)} | Unrealized PnL ${formatSignedNumber(pnl)} | Margin ${margin}`,
    );
  }

  return true;
}

/** Renders a compact order list from Bitget order payloads. */
function renderOrders(payload: unknown): boolean {
  const entries = unwrapCollection(payload);
  if (entries.length === 0) {
    return false;
  }

  console.log('Orders');
  for (const entry of entries) {
    const symbol = readString(entry, ['symbol']) ?? 'UNKNOWN';
    const orderId = readString(entry, ['orderId']) ?? 'n/a';
    const side = readString(entry, ['side']) ?? 'n/a';
    const orderType = readString(entry, ['orderType']) ?? 'n/a';
    const price = readNumber(entry, ['price', 'orderPrice']) ?? 0;
    const size = readNumber(entry, ['size', 'baseVolume']) ?? 0;
    const state = readString(entry, ['state', 'status']) ?? 'unknown';

    console.log(`- ${symbol} | ${state} | ${side} ${orderType}`);
    console.log(
      `  Order ID ${orderId} | Price ${price > 0 ? formatNumber(price) : 'market'} | Size ${formatNumber(size)}`,
    );
  }

  return true;
}

/** Renders a compact fill list from Bitget fill payloads. */
function renderFills(payload: unknown): boolean {
  const entries = unwrapCollection(payload);
  if (entries.length === 0) {
    return false;
  }

  console.log('Fills');
  for (const entry of entries) {
    const symbol = readString(entry, ['symbol']) ?? 'UNKNOWN';
    const side = readString(entry, ['side']) ?? 'n/a';
    const price = readNumber(entry, ['price', 'fillPrice']) ?? 0;
    const size = readNumber(entry, ['size', 'fillSize']) ?? 0;
    const fee = readNumber(entry, ['fee', 'fillFee']) ?? 0;
    const fillTime = readString(entry, ['cTime', 'fillTime', 'uTime']) ?? 'n/a';

    console.log(`- ${symbol} | ${side} | Price ${formatNumber(price)} | Size ${formatNumber(size)}`);
    console.log(`  Fee ${formatSignedNumber(fee)} | Time ${fillTime}`);
  }

  return true;
}

/** Writes a timestamped execution audit entry with shared runtime metadata. */
function writeExecutionAudit(
  payload: Omit<ExecutionAuditRecord, 'timestamp' | 'mode' | 'productType'>,
): void {
  appendExecutionAuditRecord({
    timestamp: new Date().toISOString(),
    mode: config.runtimeMode,
    productType: config.productType,
    ...payload,
  });
}

/** Reconstructs a shell-friendly command string for previews and audit logs. */
function buildCommandString(args: string[]): string {
  return `bgc ${args.join(' ')}`;
}

/** Maps local console operation names to the execution audit schema. */
function mapOperation(operation: Operation): ExecutionAuditRecord['operation'] {
  if (operation === 'cancel') {
    return 'CANCEL';
  }
  if (operation === 'execute') {
    return 'EXECUTE';
  }
  return 'QUERY';
}

/** Summarizes a management command in plain language for audit logs. */
function summarizeManagementAction(options: CliOptions): string {
  if (options.operation === 'cancel') {
    return options.cancelAll ? 'cancel all orders' : `cancel order ${options.orderId ?? ''}`.trim();
  }
  if (options.operation === 'orders') {
    return options.includeHistory ? 'show order history' : 'show open orders';
  }
  if (options.operation === 'fills') {
    return options.includeHistory ? 'show fill history' : 'show recent fills';
  }
  return options.includeHistory ? 'show position history' : 'show current position';
}

/** Falls back to a live position lookup when the latest audit record is unavailable or stale. */
function readLivePosition(symbol: string): ClassifiedPosition | null {
  try {
    const output = execFileSync(
      'bgc',
      [
        '--read-only',
        'futures',
        'futures_get_positions',
        '--productType',
        config.productType,
        '--symbol',
        symbol,
      ],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    const parsed = JSON.parse(output) as unknown;
    const entry = unwrapFirstRecord(parsed);
    if (!entry) {
      return null;
    }

    const normalizedSymbol = readString(entry, ['symbol']) ?? symbol.toUpperCase();
    const size = readNumber(entry, ['size', 'total', 'positionSize', 'holdSideSize']) ?? 0;
    if (size === 0) {
      return null;
    }

    return {
      symbol: normalizedSymbol,
      side: inferSide(entry),
      size,
      entryPrice: readNumber(entry, ['entryPrice', 'openPriceAvg', 'averageOpenPrice']) ?? 0,
      markPrice: readNumber(entry, ['markPrice', 'marketPrice', 'last']) ?? 0,
      leverage: readNumber(entry, ['leverage']) ?? 0,
      unrealizedPnl: readNumber(entry, ['unrealizedPL', 'upl', 'unrealizedPnl']) ?? 0,
      unrealizedPnlPct: 0,
      marginRatio: readNumber(entry, ['marginRatio', 'marginRate', 'keepMarginRate']) ?? 0,
      stopLossPresent: false,
      marketContext: {
        fundingRatePct: null,
        priceChange24hPct: null,
        markPriceSource: 'position',
      },
      riskLevel: 'SAFE',
      riskReasons: [],
      recommendation: [
        {
          action: 'close partial position',
          summary: `Close part of ${normalizedSymbol}.`,
          confidence: 'MEDIUM',
          rationale: 'Live position fallback was used because no fresh audit-backed recommendation was available.',
          executionPath: {
            skill: 'futures_place_order',
            side: inferSide(entry) === 'long' ? 'sell' : inferSide(entry) === 'short' ? 'buy' : 'reduce_only',
            sizeHint: 'Close a user-selected percentage of the current position',
            confirmationRequired: true,
          },
        },
        {
          action: 'lower leverage',
          summary: `Lower leverage on ${normalizedSymbol}.`,
          confidence: 'MEDIUM',
          rationale: 'Live position fallback was used because no fresh audit-backed recommendation was available.',
          executionPath: {
            skill: 'futures_set_leverage',
            side: 'n/a',
            sizeHint: 'Target a lower leverage value',
            confirmationRequired: true,
          },
        },
      ],
    };
  } catch {
    return null;
  }
}

/** Returns the first record from a response payload regardless of envelope shape. */
function unwrapFirstRecord(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  return unwrapCollection(payload)[0] ?? (isRecord(payload) ? (payload as Record<string, unknown>) : null);
}

/** Unwraps array-like collections from common Bitget response envelopes. */
function unwrapCollection(payload: unknown): Record<string, unknown>[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }

  const record = payload as Record<string, unknown>;
  const directCandidates = [record.data, record.list, record.result];
  for (const candidate of directCandidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(isRecord);
    }
    if (isRecord(candidate)) {
      const nestedCandidates = [candidate.list, candidate.data, candidate.rows];
      for (const nested of nestedCandidates) {
        if (Array.isArray(nested)) {
          return nested.filter(isRecord);
        }
      }
    }
  }

  return isRecord(record.data) ? [record.data] : isRecord(record) ? [record] : [];
}

/** Reads the first populated string value from a record. */
function readString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return null;
}

/** Reads the first numeric value from a record, including numeric strings. */
function readNumber(record: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }
  return null;
}

/** Infers position side labels from Bitget payload fields. */
function inferSide(record: Record<string, unknown>): 'long' | 'short' | 'unknown' {
  const side = readString(record, ['holdSide', 'side', 'posSide'])?.toLowerCase();
  if (side === 'long' || side === 'buy') {
    return 'long';
  }
  if (side === 'short' || side === 'sell') {
    return 'short';
  }
  return 'unknown';
}

/** Narrows unknown values into plain object records. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** Formats a percentage that may be returned as either a decimal or whole percent. */
function readPercent(value: number | null): string {
  if (value === null) {
    return 'n/a';
  }
  const pct = Math.abs(value) <= 1 ? value * 100 : value;
  return `${pct.toFixed(1)}%`;
}

/** Formats generic numeric values for operator output. */
function formatNumber(value: number): string {
  return Number.isFinite(value) ? value.toFixed(value >= 1000 ? 2 : 4).replace(/\.?0+$/, '') : '0';
}

/** Formats signed numeric values with an explicit positive prefix. */
function formatSignedNumber(value: number): string {
  const formatted = formatNumber(value);
  return value > 0 ? `+${formatted}` : formatted;
}

/** Reads either stdout or stderr from a failed child-process invocation. */
function readErrorStream(error: unknown, key: 'stdout' | 'stderr'): string {
  if (!error || typeof error !== 'object' || !(key in error)) {
    return '';
  }
  const value = (error as Record<string, unknown>)[key];
  if (typeof value === 'string') {
    return value.trim();
  }
  if (Buffer.isBuffer(value)) {
    return value.toString('utf8').trim();
  }
  return '';
}

/** Validates user-supplied size percentages before building an order preview. */
function validateSizePct(value: number): number {
  if (!Number.isFinite(value) || value <= 0 || value > 100) {
    throw new Error('size percentage must be between 0 and 100.');
  }
  return value;
}

/** Builds the explicit confirmation token required for destructive actions. */
function buildConfirmToken(symbol: string, action: string): string {
  return `EXECUTE:${symbol.toUpperCase()}:${action.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`;
}

/** Builds a deterministic client order identifier for execution requests. */
function buildClientOid(symbol: string, action: string): string {
  return `riskwatch_${symbol.toLowerCase()}_${action.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${Date.now()}`;
}

/** Formats order size decimals without trailing zeros. */
function formatDecimal(value: number): string {
  return value.toFixed(8).replace(/\.?0+$/, '');
}

/** Prints the operator-facing preview summary before any command is sent. */
function printPreview(preview: CommandPreview): void {
  console.log('Execution preview:');
  for (const line of preview.summary) {
    console.log(`- ${line}`);
  }
  console.log(`- Command: bgc ${preview.args.join(' ')}`);
}

/** Prints execution console usage and supported management commands. */
function printUsage(): void {
  console.log('Usage: npx ts-node src/execute.ts <SYMBOL> [--action "<action>"] [--confirm TOKEN] [--size-pct 25] [--leverage 9] [--paper-trading]');
  console.log('Management commands:');
  console.log('- --cancel --order-id <id>');
  console.log('- --cancel-all');
  console.log('- --show-orders [--history] [--limit 20]');
  console.log('- --show-fills [--history] [--limit 20]');
  console.log('- --show-positions [--history]');
}

try {
  main();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown execution failure';
  console.error(message);
  process.exitCode = 1;
}

/** Persists scan and execution history so later commands can query prior state. */
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import type { ExecutionAuditRecord, ScanRecord } from './types';

const AUDIT_FILE = './audit-log.json';
const EXECUTION_AUDIT_FILE = './execution-audit.jsonl';

/** Appends a full scan record to the JSON audit history. */
export function appendAuditRecord(record: ScanRecord): void {
  const history = readAuditHistory();
  history.push(record);
  writeFileSync(AUDIT_FILE, JSON.stringify(history, null, 2));
}

// Reads the scan audit file, falling back to an empty history if it is missing or malformed.
export function readAuditHistory(): ScanRecord[] {
  if (!existsSync(AUDIT_FILE)) {
    return [];
  }

  try {
    const raw = readFileSync(AUDIT_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ScanRecord[]) : [];
  } catch {
    return [];
  }
}

/** Returns the most recent scan record for query and preview flows. */
export function readLatestAuditRecord(): ScanRecord | null {
  const history = readAuditHistory();
  const latest = history[history.length - 1];
  return latest ?? null;
}

/** Appends a single execution-related event to the line-delimited execution audit log. */
export function appendExecutionAuditRecord(record: ExecutionAuditRecord): void {
  appendFileSync(EXECUTION_AUDIT_FILE, `${JSON.stringify(record)}\n`);
}

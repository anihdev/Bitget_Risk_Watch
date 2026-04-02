import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import type { ScanRecord } from './types';

const AUDIT_FILE = './audit-log.json';

export function appendAuditRecord(record: ScanRecord): void {
  const history = readAuditHistory();
  history.push(record);
  writeFileSync(AUDIT_FILE, JSON.stringify(history, null, 2));
}

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

export function readLatestAuditRecord(): ScanRecord | null {
  const history = readAuditHistory();
  const latest = history[history.length - 1];
  return latest ?? null;
}

import * as fs from 'fs';
const AUDIT_FILE = './audit-log.json';

export function logEntry(entry: object) {
  let log = [];
  if (fs.existsSync(AUDIT_FILE)) {
    log = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf-8'));
  }
  log.push({ timestamp: new Date().toISOString(), ...entry });
  fs.writeFileSync(AUDIT_FILE, JSON.stringify(log, null, 2));
}
import { appendAuditRecord } from './audit';
import { classifyPortfolio } from './classifier';
import { config } from './config';
import { fetchScanInput } from './fetcher';
import { renderScanReport } from './reporter';

async function main(): Promise<void> {
  const scanInput = fetchScanInput();
  const scanRecord = classifyPortfolio(scanInput, config);

  appendAuditRecord(scanRecord);
  renderScanReport(scanRecord);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown failure';
  console.error(`Scan failed: ${message}`);
  process.exitCode = 1;
});

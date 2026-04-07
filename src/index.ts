/** Entry point for a full portfolio scan and report refresh. */
import { appendAuditRecord } from './audit';
import { classifyPortfolio } from './classifier';
import { config } from './config';
import { fetchScanInput } from './fetcher';
import { writeHtmlReport } from './htmlReport';
import { ensureReportPreviewServer } from './reportPreview';
import { renderScanReport } from './reporter';

/** Runs the end-to-end scan pipeline from data fetch through reporting. */
async function main(): Promise<void> {
  const scanInput = fetchScanInput();
  const scanRecord = classifyPortfolio(scanInput, config);

  // Persist the scan first so the query and preview layers always have a latest record to read.
  appendAuditRecord(scanRecord);
  writeHtmlReport(scanRecord);
  await ensureReportPreviewServer();
  renderScanReport(scanRecord);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown failure';
  console.error(`Scan failed: ${message}`);
  process.exitCode = 1;
});

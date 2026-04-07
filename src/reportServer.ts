/** Serves the generated HTML report over a small local HTTP server. */
import { createServer } from 'node:http';
import type { ServerResponse } from 'node:http';
import type { IncomingMessage } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { readLatestAuditRecord } from './audit';
import { HTML_REPORT_FILE, writeHtmlReport } from './htmlReport';

const DEFAULT_PORT = Number(process.env.REPORT_PORT ?? 4173);
const HOST = process.env.REPORT_HOST ?? '127.0.0.1';

/** CLI entry point for the standalone report preview server. */
function main(): void {
  ensureLatestReport();

  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', `http://${HOST}:${DEFAULT_PORT}`);
    const pathname = url.pathname;

    if (pathname === '/' || pathname === '/latest-report.html') {
      return sendFile(response, HTML_REPORT_FILE, 'text/html; charset=utf-8');
    }

    if (pathname === '/health') {
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ status: 'ok', file: HTML_REPORT_FILE }));
      return;
    }

    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Report route not found.');
  });

  server.listen(DEFAULT_PORT, HOST, () => {
    console.log(`Report server running at http://${HOST}:${DEFAULT_PORT}`);
    console.log(`Serving ${HTML_REPORT_FILE}`);
  });
}

/** Regenerates the HTML report from the latest audit record if no report file exists yet. */
function ensureLatestReport(): void {
  if (existsSync(HTML_REPORT_FILE)) {
    return;
  }

  const latest = readLatestAuditRecord();
  if (!latest) {
    throw new Error('No report found. Run `npx ts-node src/index.ts` first to generate the latest scan report.');
  }

  writeHtmlReport(latest);
}

/** Writes one static asset response for the report server routes. */
function sendFile(
  response: ServerResponse<IncomingMessage>,
  filePath: string,
  fallbackContentType: string,
): void {
  if (!existsSync(filePath)) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Report file not found.');
    return;
  }

  const extension = extname(filePath).toLowerCase();
  const contentType = extension === '.html' ? 'text/html; charset=utf-8' : fallbackContentType;
  response.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store' });
  response.end(readFileSync(filePath));
}

main();

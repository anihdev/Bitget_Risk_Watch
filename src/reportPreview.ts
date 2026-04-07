/** Starts or reuses a lightweight localhost preview for the generated HTML report. */
import { request } from 'node:http';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const DEFAULT_PORT = Number(process.env.REPORT_PORT ?? 4173);
const HOST = process.env.REPORT_HOST ?? '127.0.0.1';
const HEALTH_PATH = '/health';
const STARTUP_TIMEOUT_MS = 1200;

/** Describes whether the preview server was reused or started during the current scan. */
export interface ReportPreviewState {
  url: string;
  started: boolean;
}

/** Ensures a preview server is available before the scan exits. */
export async function ensureReportPreviewServer(): Promise<ReportPreviewState> {
  const url = reportBaseUrl();
  if (await isServerHealthy()) {
    return { url, started: false };
  }

  startDetachedServer();
  return { url, started: true };
}

/** Returns the base localhost URL for the HTML report preview. */
export function reportBaseUrl(): string {
  return `http://${HOST}:${DEFAULT_PORT}`;
}

/** Checks whether the preview server is already reachable on the configured host and port. */
function isServerHealthy(): Promise<boolean> {
  return new Promise((resolvePromise) => {
    const req = request(
      {
        host: HOST,
        port: DEFAULT_PORT,
        path: HEALTH_PATH,
        method: 'GET',
        timeout: STARTUP_TIMEOUT_MS,
      },
      (response) => {
        resolvePromise(response.statusCode === 200);
        response.resume();
      },
    );

    req.on('error', () => resolvePromise(false));
    req.on('timeout', () => {
      req.destroy();
      resolvePromise(false);
    });
    req.end();
  });
}

/** Launches the report server as a detached process so the scan command can return immediately. */
function startDetachedServer(): void {
  const tsNodeBin = resolve(process.cwd(), 'node_modules/ts-node/dist/bin.js');
  const reportServerEntrypoint = resolve(process.cwd(), 'src/reportServer.ts');

  const child = spawn(process.execPath, [tsNodeBin, reportServerEntrypoint], {
    detached: true,
    stdio: 'ignore',
    env: process.env,
  });

  child.unref();
}

/** Starts or reuses a lightweight preview for the generated HTML report. */
import { request } from 'node:http';
import { spawn } from 'node:child_process';
import { networkInterfaces } from 'node:os';
import { resolve } from 'node:path';

const DEFAULT_PORT = Number(process.env.REPORT_PORT ?? 4173);
const HOST = process.env.REPORT_HOST ?? '0.0.0.0';
const HEALTHCHECK_HOST = HOST === '0.0.0.0' ? '127.0.0.1' : HOST;
const HEALTH_PATH = '/health';
const STARTUP_TIMEOUT_MS = 1200;

/** Describes whether the preview server was reused or started during the current scan. */
export interface ReportPreviewState {
  url: string;
  accessUrls: string[];
  started: boolean;
}

/** Ensures a preview server is available before the scan exits. */
export async function ensureReportPreviewServer(): Promise<ReportPreviewState> {
  const accessUrls = reportAccessUrls();
  const url = accessUrls[0] ?? reportBaseUrl();
  if (await isServerHealthy()) {
    return { url, accessUrls, started: false };
  }

  startDetachedServer();
  return { url, accessUrls, started: true };
}

/** Returns the base local-machine URL for the HTML report preview. */
export function reportBaseUrl(): string {
  return `http://127.0.0.1:${DEFAULT_PORT}`;
}

/** Returns the best-known local and LAN URLs for opening the HTML report preview. */
export function reportAccessUrls(): string[] {
  const urls = new Set<string>([reportBaseUrl()]);

  for (const netIf of Object.values(networkInterfaces())) {
    for (const address of netIf ?? []) {
      if (address.internal || address.family !== 'IPv4') {
        continue;
      }

      urls.add(`http://${address.address}:${DEFAULT_PORT}`);
    }
  }

  return Array.from(urls);
}

/** Checks whether the preview server is already reachable on the configured host and port. */
function isServerHealthy(): Promise<boolean> {
  return new Promise((resolvePromise) => {
    const req = request(
      {
        host: HEALTHCHECK_HOST,
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

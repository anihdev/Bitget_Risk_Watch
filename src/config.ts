/** Resolves environment-driven runtime settings and risk thresholds. */
import * as dotenv from 'dotenv';
import type { AppConfig, RuntimeMode } from './types';

dotenv.config();

/** Chooses the active runtime mode, defaulting to safe simulation behavior. */
function resolveRuntimeMode(): RuntimeMode {
  const explicitMode = process.env.RUNTIME_MODE?.toUpperCase();
  if (explicitMode === 'SIMULATION' || explicitMode === 'LIVE_READ' || explicitMode === 'LIVE_EXECUTE') {
    return explicitMode;
  }

  if (process.env.SIMULATION_MODE === 'true') {
    return 'SIMULATION';
  }

  return 'SIMULATION';
}

/** Shared application configuration used across scan, report, and execution flows. */
export const config: AppConfig = {
  runtimeMode: resolveRuntimeMode(),
  productType: 'USDT-FUTURES',
  thresholds: {
    leverageWarning: Number(process.env.LEVERAGE_THRESHOLD ?? 10),
    lossCriticalPct: Number(process.env.LOSS_THRESHOLD_PCT ?? 15),
    marginCriticalPct: Number(process.env.MARGIN_DANGER_PCT ?? 80),
    fundingWarningPct: Number(process.env.FUNDING_WARNING_PCT ?? 0.3),
  },
};

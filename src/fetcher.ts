import { execSync } from 'child_process';

export function getSpotTicker(symbol: string) {
  const out = execSync(`bgc spot spot_get_ticker --symbol ${symbol}`);
  return JSON.parse(out.toString());
}

export function getFuturesPositions() {
  const out = execSync(`bgc futures futures_get_positions --productType USDT-FUTURES`);
  return JSON.parse(out.toString());
}

export function getAccountAssets() {
  const out = execSync(`bgc account get_account_assets`);
  return JSON.parse(out.toString());
}

export function getFundingRate(symbol: string) {
  const out = execSync(`bgc futures futures_get_funding_rate --productType USDT-FUTURES --symbol ${symbol}`);
  return JSON.parse(out.toString());
}
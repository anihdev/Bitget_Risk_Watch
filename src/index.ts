import { getFuturesPositions, getAccountAssets } from './fetcher';
import { classifyPosition } from './classifier';
import { printHeader, printRisk, printSummary } from './reporter';
import { logEntry } from './audit';
import * as dotenv from 'dotenv';
dotenv.config();

const SIMULATION = process.env.SIMULATION_MODE === 'true';

async function runGuardian() {
  printHeader();

  if (SIMULATION) {
    console.log('⚡ SIMULATION MODE — using mock data\n');
  }

  console.log('📡 Fetching account state...\n');

  // In simulation mode, use mock positions for demo
  const positions = SIMULATION ? getMockPositions() : getFuturesPositions().data;

  const risks = positions.map(classifyPosition);
  risks.forEach(printRisk);
  printSummary(risks);

  // Log to audit trail
  risks.forEach(risk => {
    if (risk.riskLevel !== 'SAFE') {
      logEntry({ type: 'RISK_DETECTED', ...risk });
    }
  });

  console.log('📋 Audit log updated: audit-log.json\n');
}

function getMockPositions() {
  return [
    { symbol: 'BTCUSDT', leverage: '15', unrealizedPLR: '-0.18', marginRatio: '0.85', stopLossPrice: '0' },
    { symbol: 'ETHUSDT', leverage: '5', unrealizedPLR: '-0.04', marginRatio: '0.30', stopLossPrice: '2800' },
    { symbol: 'SOLUSDT', leverage: '3', unrealizedPLR: '0.07', marginRatio: '0.15', stopLossPrice: '120' },
  ];
}

runGuardian();
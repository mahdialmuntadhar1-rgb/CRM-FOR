/// <reference types="node" />
import { spawnSync } from 'node:child_process';

const STEPS: Array<{ name: string; args: string[] }> = [
  { name: 'phone audit', args: ['tsx', 'scripts/auditPhones.ts'] },
  { name: 'phone normalization (write mode)', args: ['tsx', 'scripts/normalizeBusinessesPhones.ts', '--dry-run=false'] },
  { name: 'audience preview', args: ['tsx', 'scripts/previewAudience.ts', '--limit=20'] },
];

function runStep(name: string, args: string[]) {
  console.log(`\n=== Running step: ${name} ===`);

  const result = spawnSync('npx', args, {
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error(`Step failed: ${name} (exit=${result.status ?? 'unknown'})`);
  }
}

function main() {
  for (const step of STEPS) {
    runStep(step.name, step.args);
  }

  console.log('\nE2E pipeline checks completed successfully.');
}

try {
  main();
} catch (error) {
  console.error('[runPhonePipelineE2E] Fatal:', error);
  process.exitCode = 1;
}

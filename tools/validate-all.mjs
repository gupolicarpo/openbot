#!/usr/bin/env node
// validate-all.mjs — validate every bots/*.yaml; exit 1 if any invalid.
// Usage: node tools/validate-all.mjs [bots-dir]

import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const botsDir = resolve(process.argv[2] ?? join(__dirname, '..', 'bots'));
const validateScript = join(__dirname, 'validate-openbot.mjs');

let files;
try { files = readdirSync(botsDir).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml')); }
catch (e) { console.error(`❌ ${botsDir}: ${e.code}`); process.exit(2); }

let failed = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, [validateScript, join(botsDir, f)], { stdio: 'inherit' });
  if (r.status !== 0) failed++;
}
console.log(`\n${files.length} bot(s), ${failed} invalid.`);
process.exit(failed > 0 ? 1 : 0);
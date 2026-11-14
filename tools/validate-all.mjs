#!/usr/bin/env node
// validate-all.mjs — validate every bot (personal + examples, or one folder); exit 1 if any invalid.
// Usage: node tools/validate-all.mjs [bots-dir]

import { spawnSync } from 'node:child_process';
import { readdirSync, existsSync } from 'node:fs';
import { SCOPES } from './lib/paths.mjs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const botsDirs = process.argv[2] ? [resolve(process.argv[2])] : [SCOPES.personal.bots, SCOPES.project.bots].filter((d) => existsSync(d));
const validateScript = join(__dirname, 'validate-openbot.mjs');

let files = [];
for (const botsDir of botsDirs) {
  try { files.push(...readdirSync(botsDir).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml')).map((f) => join(botsDir, f))); }
  catch (e) { console.error(`❌ ${botsDir}: ${e.code}`); process.exit(2); }
}

let failed = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, [validateScript, f], { stdio: 'inherit' });
  if (r.status !== 0) failed++;
}
console.log(`\n${files.length} bot(s), ${failed} invalid.`);
process.exit(failed > 0 ? 1 : 0);
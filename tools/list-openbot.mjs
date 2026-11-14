#!/usr/bin/env node
// list-openbot.mjs — list your personal bots and the example bots (or the bots in one folder)
// Usage: node tools/list-openbot.mjs [bots-dir]

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import yaml from './lib/yaml.mjs';
import { SCOPES, displayPath } from './lib/paths.mjs';

const dirs = process.argv[2] ? [resolve(process.argv[2])] : [SCOPES.personal.bots, SCOPES.project.bots];

for (const botsDir of dirs) {
let entries;
try { entries = existsSync(botsDir) || process.argv[2] ? readdirSync(botsDir).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml')) : []; }
catch (e) { console.error(`❌ cannot read ${botsDir}: ${e.code}`); process.exit(2); }

if (entries.length === 0) { console.log(`No bots in ${displayPath(botsDir)}`); continue; }

const rows = [];
for (const f of entries.sort()) {
  try {
    const doc = yaml.load(readFileSync(join(botsDir, f), 'utf8'));
    const kinds = Array.isArray(doc.tasks) ? doc.tasks.map((t) => t.kind).join(', ') : '-';
    rows.push({ icon: doc.icon ?? '🤖', name: doc.name ?? '?', version: doc.version ?? '?', desc: doc.description ?? '', kinds });
  } catch (e) {
    rows.push({ icon: '⚠️', name: `(invalid: ${f})`, version: '-', desc: `parse error: ${e.message}`, kinds: '-' });
  }
}

console.log(`Bots in ${displayPath(botsDir)}:`);
for (const r of rows) {
  console.log(`- ${r.icon} ${r.name} (v${r.version})${r.desc ? ' — ' + r.desc : ''} [${r.kinds}]`);
}
}
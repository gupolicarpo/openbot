#!/usr/bin/env node
// list-openbot.mjs — list bots in bots/*.yaml
// Usage: node tools/list-openbot.mjs [bots-dir]

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import yaml from './lib/yaml.mjs';

const botsDir = resolve(process.argv[2] ?? 'bots');

let entries;
try { entries = readdirSync(botsDir).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml')); }
catch (e) { console.error(`❌ cannot read ${botsDir}: ${e.code}`); process.exit(2); }

if (entries.length === 0) { console.log(`No bots in ${botsDir}`); process.exit(0); }

const rows = [];
for (const f of entries.sort()) {
  try {
    const doc = yaml.load(readFileSync(join(botsDir, f), 'utf8'));
    const kinds = Array.isArray(doc.tasks) ? doc.tasks.map((t) => t.kind).join(', ') : '-';
    rows.push({ name: doc.name ?? '?', version: doc.version ?? '?', desc: doc.description ?? '', kinds });
  } catch (e) {
    rows.push({ name: `(invalid: ${f})`, version: '-', desc: `parse error: ${e.message}`, kinds: '-' });
  }
}

console.log(`Bots in ${botsDir}:`);
for (const r of rows) {
  console.log(`- ${r.name} (v${r.version})${r.desc ? ' — ' + r.desc : ''} [${r.kinds}]`);
}
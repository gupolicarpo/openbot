#!/usr/bin/env node
// memory-openbot.mjs — persistent memory over a bot's history (JSONL keyword store).
// Usage: node tools/memory-openbot.mjs <bot> [add <text> | search <query> | show]

import { readFileSync, existsSync, appendFileSync } from 'node:fs';
import { resolve } from 'node:path';

const arg = process.argv[2];
const cmd = process.argv[3] ?? 'show';
const q = process.argv[4];

if (!arg) { console.error('usage: node tools/memory-openbot.mjs <bot> [add <text> | search <query> | show]'); process.exit(2); }
const memPath = resolve(/\.ya?ml$/i.test(arg) ? arg.replace(/\.ya?ml$/i, '.memory.jsonl') : `bots/${arg}.memory.jsonl`);

if (cmd === 'add' && q) {
  appendFileSync(memPath, JSON.stringify({ ts: new Date().toISOString(), text: q }) + '\n', 'utf8');
  console.log(`added to ${memPath}`);
} else {
  const entries = existsSync(memPath)
    ? readFileSync(memPath, 'utf8').trim().split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return { text: l }; } })
    : [];
  if (cmd === 'search') {
    const needle = (q ?? '').toLowerCase();
    const hits = entries.filter((e) => (e.text ?? '').toLowerCase().includes(needle));
    console.log(`${hits.length} hit(s) for "${q}" in ${memPath}:`);
    for (const h of hits.slice(-10)) console.log(`- [${h.ts ?? '?'}] ${h.text}`);
  } else {
    console.log(`${entries.length} entry(ies) in ${memPath}:`);
    for (const e of entries.slice(-10)) console.log(`- [${e.ts ?? '?'}] ${e.text}`);
  }
}
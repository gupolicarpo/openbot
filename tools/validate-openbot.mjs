#!/usr/bin/env node
// validate-openbot.mjs — validate an openbot.yaml manifest against schema v1.2 (shared rules in tools/lib/manifest.mjs).
// Usage: node tools/validate-openbot.mjs <path-to-manifest.yaml>
// Exit codes: 0 valid, 1 invalid, 2 usage/internal error.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import yaml from './lib/yaml.mjs';
import { validate } from './lib/manifest.mjs';

const arg = process.argv[2];
if (!arg) { console.error('usage: node tools/validate-openbot.mjs <manifest.yaml>'); process.exit(2); }
const abs = resolve(arg);
let raw;
try { raw = readFileSync(abs, 'utf8'); } catch (e) { console.error(`❌ cannot read ${abs}: ${e.code}`); process.exit(2); }
let doc;
try {
  if (abs.endsWith('.json') || raw.trimStart().startsWith('{')) doc = JSON.parse(raw);
  else {
    doc = yaml.load(raw);
  }
} catch (e) { console.error(`❌ ${abs}: parse error: ${e.message}`); process.exit(1); }

const { errors, warnings } = validate(doc);
for (const w of warnings) console.warn(`⚠  ${w.field}: ${w.reason}`);
if (errors.length > 0) {
  console.error(`❌ ${abs}: ${errors.length} error(s)`);
  for (const e of errors) console.error(`  ${e.field}: ${e.reason}`);
  process.exit(1);
}
console.log(`✅ ${abs}: valid (${doc.icon ?? '🤖'} name=${doc.name}, tasks=${Array.isArray(doc.tasks) ? doc.tasks.length : 0})`);
#!/usr/bin/env node
// schedule-openbot.mjs — plan/trigger scheduled bots.
// Usage: node tools/schedule-openbot.mjs <bot-name-or-path> [--once]

import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
function loadYaml() {
  try { return require('js-yaml'); } catch {}
  const candidates = [
    process.env.OPENBOT_JSYAML,
    'C:/Users/gupol/AppData/Roaming/npm/node_modules/@deepseek-ai/dsh/node_modules/js-yaml/index.js',
    'C:/Users/gupol/AppData/Roaming/npm/node_modules/@deepseek-ai/dsh/node_modules/js-yaml',
  ].filter(Boolean);
  for (const c of candidates) if (existsSync(c)) { try { return require(c); } catch {} }
  return null;
}

const arg = process.argv[2];
const once = process.argv.includes('--once');
if (!arg) { console.error('usage: node tools/schedule-openbot.mjs <bot> [--once]'); process.exit(2); }
const path = /\.(ya?ml)$/i.test(arg) ? resolve(arg) : resolve('bots', `${arg}.yaml`);
const yaml = loadYaml();
if (!yaml) { console.error('❌ js-yaml not found'); process.exit(2); }
let doc;
try { doc = yaml.load(readFileSync(path, 'utf8')); }
catch (e) { console.error(`❌ ${path}: ${e.message}`); process.exit(1); }

const scheduled = (doc.tasks || []).filter((t) => t.kind === 'scheduled');
if (scheduled.length === 0) { console.log(`Bot "${doc.name}" has no scheduled tasks.`); process.exit(0); }

function nextRun(schedule) {
  const m = /^every\s+(\d+)\s*([smhd])$/i.exec(schedule);
  if (m) {
    const n = Number(m[1]);
    const unit = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[m[2].toLowerCase()];
    return new Date(Date.now() + n * unit).toISOString();
  }
  return null;
}

for (const t of scheduled) {
  const next = nextRun(t.schedule);
  if (next) console.log(`⏰ ${doc.name}/${t.id}: every ${t.schedule} → next ${next}`);
  else console.log(`⏰ ${doc.name}/${t.id}: cron "${t.schedule}" (interpreted by a cron daemon)`);
  if (once) console.log(`   would run now: ${t.prompt}${t.output ? ' → ' + t.output : ''}`);
}
if (once) console.log('Note: model execution is delegated to the harness runner (openbot skill); this script plans the schedule.');
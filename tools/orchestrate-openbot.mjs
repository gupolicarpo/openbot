#!/usr/bin/env node
// orchestrate-openbot.mjs — plan a multi-bot pipeline / composer.
// Supports pipeline.yaml (steps) and compose.yaml (mode: compose, steps + aggregate).
// Usage: node tools/orchestrate-openbot.mjs <pipeline.yaml|compose.yaml>

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
if (!arg) { console.error('usage: node tools/orchestrate-openbot.mjs <pipeline.yaml|compose.yaml>'); process.exit(2); }
const yaml = loadYaml();
if (!yaml) { console.error('❌ js-yaml not found'); process.exit(2); }
let pipe;
try { pipe = yaml.load(readFileSync(resolve(arg), 'utf8')); } catch (e) { console.error(`❌ ${arg}: ${e.message}`); process.exit(1); }

const steps = pipe.steps ?? pipe.children ?? [];
const isCompose = pipe.mode === 'compose' || !!pipe.aggregate;
if (steps.length === 0) { console.error('❌ no steps'); process.exit(1); }
console.log(`Pipeline: ${pipe.name ?? '(unnamed)'} (${steps.length} steps)${isCompose ? ' [compose]' : ''}`);

for (let i = 0; i < steps.length; i++) {
  const s = steps[i];
  const botPath = /\.ya?ml$/i.test(s.bot) ? resolve(s.bot) : resolve('bots', `${s.bot}.yaml`);
  let bot;
  try { bot = yaml.load(readFileSync(botPath, 'utf8')); } catch (e) { console.error(`  ❌ step ${i + 1}: bot "${s.bot}" not found`); process.exit(1); }
  const task = bot.tasks.find((t) => t.id === s.task) ?? bot.tasks[0];
  if (!task) { console.error(`  ❌ step ${i + 1}: bot "${s.bot}" has no task`); process.exit(1); }
  const ins = Object.entries(s.inputs ?? task.inputs ?? {}).map(([k, v]) => `${k}=${v}`);
  console.log(`${i + 1}. ${bot.name}/${task.id}${task.output ? ' → ' + task.output : ''}`);
  console.log(`   run: node tools/run-openbot.mjs ${bot.name} --task ${task.id}${ins.length ? ' --input ' + ins.join(' --input ') : ''}`);
}
if (isCompose) {
  console.log(`\ncompose: each step runs as a native harness subagent (DSH subagent/team, Claude Code /agents, Codex subagents) and the results are aggregated with: "${pipe.aggregate ?? ''}"`);
}
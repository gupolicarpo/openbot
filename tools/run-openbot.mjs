#!/usr/bin/env node
// run-openbot.mjs — programmatic execution hook for a bot.
// Delegates to a harness agent CLI (dsh headless / claude -p / codex exec) via
// the openbot skill (path A: tools + memory + approval), or calls an
// OpenAI-compatible API directly (--via openai), or prints the exact command
// (--dry-run).
// Usage: node tools/run-openbot.mjs <bot> [--task <id>] [--input k=v ...]
//        [--via dsh|claude|codex|openai|auto] [--dry-run]

import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import yaml from './lib/yaml.mjs';
import { findBot, displayPath } from './lib/paths.mjs';

const args = process.argv.slice(2);
const botArg = args[0];
const dryRun = args.includes('--dry-run');
const taskIdx = args.indexOf('--task');
const taskId = taskIdx >= 0 ? args[taskIdx + 1] : null;
const viaIdx = args.indexOf('--via');
const via = viaIdx >= 0 ? args[viaIdx + 1] : 'auto';
const inputs = {};
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--input' && args[i + 1] && args[i + 1].includes('=')) {
    const [k, v] = args[i + 1].split('=');
    inputs[k] = v;
  }
}

if (!botArg) { console.error('usage: node tools/run-openbot.mjs <bot> [--task <id>] [--input k=v ...] [--via dsh|claude|codex|openai|auto] [--dry-run]'); process.exit(2); }
const path = findBot(botArg).path;
let doc;
try { doc = yaml.load(readFileSync(path, 'utf8')); } catch (e) { console.error(`❌ ${path}: ${e.message}`); process.exit(1); }
const task = doc.tasks.find((t) => !taskId || t.id === taskId) ?? doc.tasks[0];
if (!task) { console.error('❌ no task'); process.exit(1); }

const insText = Object.entries(inputs).map(([k, v]) => `${k}=${v}`).join(', ') || '(none)';
const instruction = `Use the openbot skill to run the bot "${doc.name}" (manifest ${displayPath(path)}), task "${task.id}", inputs: ${insText}. Execute it in the current directory and report the result.`;

const system = [
  `You are: ${doc.persona?.role ?? doc.name}`,
  doc.persona?.tone ? `Tone: ${doc.persona.tone}` : '',
  ...(doc.persona?.constraints ?? []).map((c) => `Constraint: ${c}`),
  '',
  ...(doc.instructions ?? []),
].filter(Boolean).join('\n');
const user = [task.prompt, ...(Object.keys(inputs).length ? ['', 'Inputs:', ...Object.entries(inputs).map(([k, v]) => `- ${k}: ${v}`)] : [])].join('\n');

function cliAvailable(cmd) {
  const r = spawnSync(`${cmd} --version`, { stdio: 'ignore', shell: true });
  return r.status === 0;
}
function pickHarness() {
  if (via !== 'auto') return via;
  if (cliAvailable('dsh')) return 'dsh';
  if (cliAvailable('claude')) return 'claude';
  if (cliAvailable('codex')) return 'codex';
  if (baseURL && apiKey) return 'openai';
  return 'dry';
}
const quote = (s) => `"${String(s).replace(/"/g, '\\"')}"`;
const CMD = {
  dsh: `dsh headless ${quote(instruction)}`,
  claude: `claude -p ${quote(instruction)}`,
  codex: `codex exec ${quote(instruction)}`,
};

const apiKey = process.env.OPENBOT_LLM_API_KEY ?? process.env.OPENAI_API_KEY;
const baseURL = process.env.OPENBOT_LLM_BASE_URL ?? process.env.OPENAI_BASE_URL;
const model = process.env.OPENBOT_LLM_MODEL ?? 'gpt-4o-mini';
const harness = pickHarness();

if (dryRun || harness === 'dry') {
  console.log('=== DELEGATE (dry run) ===');
  console.log(`harness: ${harness}`);
  console.log(`instruction: ${instruction}`);
  console.log('command:');
  if (CMD[harness]) console.log(`  ${CMD[harness]}`);
  else console.log(`  (raw LLM call via ${model})`);
  process.exit(0);
}

if (CMD[harness]) {
  const r = spawnSync(CMD[harness], { stdio: 'inherit', shell: true });
  process.exit(r.status ?? 1);
}
if (harness === 'openai') {
  const resp = await fetch(`${baseURL.replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
  });
  const data = await resp.json();
  if (!resp.ok) { console.error('❌ LLM error:', JSON.stringify(data)); process.exit(1); }
  console.log(data.choices?.[0]?.message?.content ?? JSON.stringify(data));
  process.exit(0);
}
console.error(`no harness CLI and no LLM configured (--via ${harness}); use --dry-run to see the command`);
process.exit(2);
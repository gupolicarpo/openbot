#!/usr/bin/env node
// export-agents-openbot.mjs — compile bots/*.yaml into Claude Code subagents
// (.claude/agents/openbot-<name>.md), so each bot runs with its own clean
// context, its own tools and (optionally) its own model. The manifest stays the
// source of truth; the generated files must not be edited by hand.
// Usage: node tools/export-agents-openbot.mjs [bot ...] [--out <dir>] [--check]
//   --check  exit 1 if any generated file is missing or out of date (for CI)

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from './lib/yaml.mjs';
import { validate, toClaudeAgent, agentName } from './lib/manifest.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BOTS = join(ROOT, 'bots');

export function exportAgents({ bots, out = join(ROOT, '.claude', 'agents'), check = false } = {}) {
  const all = readdirSync(BOTS).filter((f) => /\.ya?ml$/.test(f)).map((f) => f.replace(/\.ya?ml$/, ''));
  const selected = bots?.length ? bots : all;
  const lines = [];
  let stale = 0;
  if (!check) mkdirSync(out, { recursive: true });
  for (const name of selected) {
    const file = existsSync(join(BOTS, `${name}.yaml`)) ? `${name}.yaml` : `${name}.yml`;
    let doc;
    try { doc = yaml.load(readFileSync(join(BOTS, file), 'utf8')); } catch (e) { lines.push(`❌ ${name}: parse error: ${e.message}`); stale++; continue; }
    const { errors } = validate(doc);
    if (errors.length) { lines.push(`❌ ${name}: invalid (${errors.map((e) => e.field).join(', ')}) — not exported`); stale++; continue; }
    const target = join(out, `${agentName(doc.name)}.md`);
    const md = toClaudeAgent(doc, `bots/${file}`);
    const current = existsSync(target) ? readFileSync(target, 'utf8').replace(/\r\n/g, '\n') : null;
    if (current === md) { lines.push(`= ${doc.icon ?? '🤖'} ${agentName(doc.name)} (up to date)`); continue; }
    if (check) { lines.push(`✗ ${agentName(doc.name)}: ${current === null ? 'missing' : 'out of date'}`); stale++; continue; }
    writeFileSync(target, md, 'utf8');
    lines.push(`✅ ${doc.icon ?? '🤖'} ${agentName(doc.name)} → ${target}`);
  }
  // Remove subagents whose bot no longer exists (full export only).
  if (!bots?.length && existsSync(out)) {
    for (const f of readdirSync(out).filter((x) => /^openbot-.*\.md$/.test(x))) {
      if (all.includes(f.slice('openbot-'.length, -3))) continue;
      if (check) { lines.push(`✗ ${f}: bot no longer exists`); stale++; }
      else { rmSync(join(out, f)); lines.push(`🗑  removed ${f} (bot no longer exists)`); }
    }
  }
  return { text: lines.join('\n'), stale };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const outIdx = args.indexOf('--out');
  const out = outIdx >= 0 ? resolve(args[outIdx + 1]) : undefined;
  const check = args.includes('--check');
  const bots = args.filter((a, i) => !a.startsWith('--') && i !== outIdx + 1);
  const { text, stale } = exportAgents({ bots, out, check });
  console.log(text);
  if (check && stale) { console.error(`\n${stale} subagent(s) out of date — run: node tools/export-agents-openbot.mjs`); process.exit(1); }
}

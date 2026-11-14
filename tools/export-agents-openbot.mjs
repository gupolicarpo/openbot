#!/usr/bin/env node
// export-agents-openbot.mjs — compile bots into Claude Code subagents
// (openbot-<name>.md: personal bots → ~/.claude/agents, project bots →
// <repo>/.claude/agents; see lib/paths.mjs), so each bot runs with its own clean
// context, its own tools and (optionally) its own model. The manifest stays the
// source of truth; the generated files must not be edited by hand.
// Usage: node tools/export-agents-openbot.mjs [bot ...] [--out <dir>] [--check]
//   --check  exit 1 if any generated file is missing or out of date (for CI)

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from './lib/yaml.mjs';
import { validate, toClaudeAgent, agentName } from './lib/manifest.mjs';
import { SCOPES, listBotFiles, findBot, displayPath } from './lib/paths.mjs';


// bots: names to export (default: every bot). out: override the target folder
// (default: ~/.claude/agents for personal bots, <repo>/.claude/agents for project bots).
export function exportAgents({ bots, out, check = false, scopes = ['personal', 'project'] } = {}) {
  const all = listBotFiles(scopes);
  const selected = bots?.length ? bots.map((b) => findBot(b)) : all;
  const lines = [];
  let stale = 0;
  for (const bot of selected) {
    const dir = out ?? SCOPES[bot.scope].agents;
    let doc;
    try { doc = yaml.load(readFileSync(bot.path, 'utf8')); } catch (e) { lines.push(`❌ ${bot.name}: ${e.code === 'ENOENT' ? 'not found' : `parse error: ${e.message}`}`); stale++; continue; }
    const { errors } = validate(doc);
    if (errors.length) { lines.push(`❌ ${bot.name}: invalid (${errors.map((e) => e.field).join(', ')}) — not exported`); stale++; continue; }
    const target = join(dir, `${agentName(doc.name)}.md`);
    const md = toClaudeAgent(doc, displayPath(bot.path));
    const current = existsSync(target) ? readFileSync(target, 'utf8').replace(/\r\n/g, '\n') : null;
    if (current === md) { lines.push(`= ${doc.icon ?? '🤖'} ${agentName(doc.name)} (up to date)`); continue; }
    if (check) { lines.push(`✗ ${agentName(doc.name)}: ${current === null ? 'missing' : 'out of date'}`); stale++; continue; }
    mkdirSync(dir, { recursive: true });
    writeFileSync(target, md, 'utf8');
    lines.push(`✅ ${doc.icon ?? '🤖'} ${agentName(doc.name)} → ${target}`);
  }
  // Remove subagents whose bot no longer exists (full export only), per scope.
  if (!bots?.length && !out) {
    for (const scope of scopes) {
      const dir = SCOPES[scope].agents;
      if (!existsSync(dir)) continue;
      const names = all.filter((b) => b.scope === scope).map((b) => b.name);
      for (const f of readdirSync(dir).filter((x) => /^openbot-.*\.md$/.test(x))) {
        if (names.includes(f.slice('openbot-'.length, -3))) continue;
        if (check) { lines.push(`✗ ${f}: bot no longer exists`); stale++; }
        else { rmSync(join(dir, f)); lines.push(`🗑  removed ${f} (bot no longer exists)`); }
      }
    }
  }
  return { text: lines.join('\n'), stale };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const outIdx = args.indexOf('--out');
  const out = outIdx >= 0 ? resolve(args[outIdx + 1]) : undefined;
  const check = args.includes('--check');
  const bots = args.filter((a, i) => !a.startsWith('--') && (outIdx < 0 || i !== outIdx + 1));
  const { text, stale } = exportAgents({ bots, out, check });
  console.log(text);
  if (check && stale) { console.error(`\n${stale} subagent(s) out of date — run: node tools/export-agents-openbot.mjs`); process.exit(1); }
}

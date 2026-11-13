#!/usr/bin/env node
// install-openbot.mjs — install the openbot skill into a harness's skills dir.
// Usage: node tools/install-openbot.mjs <harness...> [--project] [--dest <dir>]
//   harness: dsh | claude | codex | all   (default: all)
//   --project: install to <cwd>/.<harness>/skills instead of the user home.
//   --dest <dir>: override the destination skills root (for testing/bundling).

import { cp, mkdir, rm, readdir } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillDir = resolve(__dirname, '..', '.agents', 'skills', 'openbot');
const HOME = homedir();

const ROOTS = {
  dsh:    { user: join(HOME, '.agents', 'skills'), project: '.agents/skills' },
  claude: { user: join(HOME, '.claude', 'skills'),  project: '.claude/skills' },
  codex:  { user: join(HOME, '.codex', 'skills'),   project: '.codex/skills' },
};

const args = process.argv.slice(2);
const level = args.includes('--project') ? 'project' : 'user';
const destIdx = args.indexOf('--dest');
const destOverride = destIdx >= 0 ? resolve(args[destIdx + 1]) : null;
const named = args.filter((a, i) => !a.startsWith('--') && i !== destIdx + 1);
let harnesses = named.length ? named : ['all'];
if (harnesses.includes('all')) harnesses = ['dsh', 'claude', 'codex'];

async function installTo(root) {
  await mkdir(root, { recursive: true });
  const dest = join(root, 'openbot');
  if (resolve(dest) === resolve(skillDir)) return { dest, files: [], skipped: true };
  await rm(dest, { recursive: true, force: true });
  await cp(skillDir, dest, { recursive: true });
  const files = (await readdir(dest, { recursive: true }))
    .filter((f) => typeof f === 'string' && f.endsWith('.md'))
    .sort();
  return { dest, files, skipped: false };
}

console.log(`Source: ${skillDir}\n`);
for (const h of harnesses) {
  if (!ROOTS[h]) { console.error(`❌ unknown harness "${h}" (use dsh|claude|codex|all)`); process.exitCode = 2; continue; }
  const root = destOverride ?? (level === 'project' ? resolve(process.cwd(), ROOTS[h].project) : ROOTS[h].user);
  const { dest, files, skipped } = await installTo(root);
  if (skipped) { console.log(`⏭  ${h.padEnd(7)} already the source (${dest})`); continue; }
  console.log(`✅ ${h.padEnd(7)} ${level.padEnd(8)} → ${dest}`);
  for (const f of files) console.log(`     - ${f}`);
}
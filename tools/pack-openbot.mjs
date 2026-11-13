#!/usr/bin/env node
// pack-openbot.mjs — bundle a bot (manifest + referenced inputs + README) into
// a shareable folder for distribution.
// Usage: node tools/pack-openbot.mjs <bot> [--out <dir>]

import { createRequire } from 'node:module';
import { cp, mkdir, rm, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';

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
const outIdx = process.argv.indexOf('--out');
const outRoot = resolve(outIdx >= 0 ? process.argv[outIdx + 1] : 'dist/packs');
if (!arg) { console.error('usage: node tools/pack-openbot.mjs <bot> [--out <dir>]'); process.exit(2); }
const botPath = /\.ya?ml$/i.test(arg) ? resolve(arg) : resolve('bots', `${arg}.yaml`);
const yaml = loadYaml();
if (!yaml) { console.error('❌ js-yaml not found'); process.exit(2); }
let bot;
try { bot = yaml.load(await readFile(botPath, 'utf8')); } catch (e) { console.error(`❌ ${botPath}: ${e.message}`); process.exit(1); }

const packDir = join(outRoot, bot.name);
await rm(packDir, { recursive: true, force: true });
await mkdir(packDir, { recursive: true });
await cp(botPath, join(packDir, 'openbot.yaml'));

const referenced = [];
for (const t of bot.tasks ?? []) {
  for (const v of Object.values(t.inputs ?? {})) {
    if (typeof v === 'string' && existsSync(resolve(v))) {
      const dest = join(packDir, v);
      await mkdir(dirname(dest), { recursive: true });
      await cp(resolve(v), dest);
      referenced.push(v);
    }
  }
}

const readme = [
  `# ${bot.name} (v${bot.version})`,
  '',
  bot.description ?? '',
  '',
  '## Instalar',
  'Copie esta pasta para um workspace e use a skill `openbot` (DSH, Claude Code',
  'ou Codex) para rodar o bot, ou:',
  '```bash',
  'node tools/run-openbot.mjs openbot.yaml --task <id>',
  '```',
  referenced.length ? `\n## Entradas referenciadas\n${referenced.map((f) => `- ${f}`).join('\n')}` : '',
].join('\n');
await writeFile(join(packDir, 'README.md'), readme + '\n');

const files = (await readdir(packDir, { recursive: true })).filter((f) => typeof f === 'string').sort();
console.log(`packed ${bot.name} → ${packDir}`);
for (const f of files) console.log(`  - ${f}`);
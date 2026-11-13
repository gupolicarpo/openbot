#!/usr/bin/env node
// zip-skill-openbot.mjs — package the openbot skill as a .zip for the Claude
// app (Settings → Capabilities → Skills → Upload). The upload accepts only
// `name` and `description` in the frontmatter, so `whenToUse` is folded into
// the description and other keys are dropped.
// Usage: node tools/zip-skill-openbot.mjs [out.zip]   (default: dist/openbot-skill.zip)

import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import yaml from './lib/yaml.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(ROOT, '.agents', 'skills', 'openbot');
const out = resolve(process.argv[2] ?? join(ROOT, 'dist', 'openbot-skill.zip'));

const raw = readFileSync(join(src, 'SKILL.md'), 'utf8').replace(/\r\n/g, '\n');
const m = raw.match(/^---\n([\s\S]*?)\n---\n/);
if (!m) { console.error('❌ SKILL.md has no frontmatter'); process.exit(1); }
const fm = yaml.load(m[1]);
let description = [fm.description, fm.whenToUse].filter(Boolean).join(' ');
if (description.length > 1024) description = description.slice(0, 1021) + '...';
const clean = `---\n${yaml.dump({ name: fm.name, description }, { lineWidth: -1 }).trim()}\n---\n` + raw.slice(m[0].length);

const stage = join(tmpdir(), `openbot-skill-${process.pid}`);
rmSync(stage, { recursive: true, force: true });
cpSync(src, join(stage, 'openbot'), { recursive: true });
writeFileSync(join(stage, 'openbot', 'SKILL.md'), clean, 'utf8');
mkdirSync(dirname(out), { recursive: true });
if (existsSync(out)) rmSync(out);

// Windows ships bsdtar as tar.exe (can write zip); elsewhere use `zip`.
const r = process.platform === 'win32'
  ? spawnSync(join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe'), ['-a', '-c', '-f', out, 'openbot'], { cwd: stage, stdio: 'inherit' })
  : spawnSync('zip', ['-r', '-q', out, 'openbot'], { cwd: stage, stdio: 'inherit' });
rmSync(stage, { recursive: true, force: true });
if (r.status !== 0) { console.error('❌ zip failed'); process.exit(1); }
console.log(`✅ ${out}\n   upload it in the Claude app: Settings → Capabilities → Skills → Upload skill`);

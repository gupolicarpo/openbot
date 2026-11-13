#!/usr/bin/env node
// validate-openbot.mjs — validate an openbot.yaml manifest against schema v1.1.
// Usage: node tools/validate-openbot.mjs <path-to-manifest.yaml>
// Exit codes: 0 valid, 1 invalid, 2 usage/internal error.

import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);

const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const KINDS = ['task', 'chat', 'scheduled', 'api'];
const MEMORY = ['none', 'session', 'history'];
const CAPABILITIES = ['explore', 'plan', 'general'];
const KNOWN_HARNESS_TOOLS = new Set([
  'read', 'grep', 'glob', 'write', 'edit', 'bash', 'pwsh', 'web_search',
  'web_fetch', 'subagent', 'workflow', 'list', 'ask_user_question',
]);

function loadYaml() {
  try { return require('js-yaml'); } catch {}
  const candidates = [
    process.env.OPENBOT_JSYAML,
    'C:/Users/gupol/AppData/Roaming/npm/node_modules/@deepseek-ai/dsh/node_modules/js-yaml/index.js',
    'C:/Users/gupol/AppData/Roaming/npm/node_modules/@deepseek-ai/dsh/node_modules/js-yaml',
  ].filter(Boolean);
  for (const c of candidates) {
    if (existsSync(c)) { try { return require(c); } catch {} }
  }
  return null;
}

function validate(doc) {
  const errors = [];
  const warnings = [];
  if (typeof doc !== 'object' || doc === null || Array.isArray(doc)) {
    return { errors: [{ field: '(root)', reason: 'manifest must be a YAML/JSON object' }], warnings: [] };
  }
  // name
  if (typeof doc.name !== 'string' || doc.name.length === 0) {
    errors.push({ field: 'name', reason: 'required string' });
  } else if (!NAME_RE.test(doc.name)) {
    errors.push({ field: 'name', reason: `"${doc.name}" is not kebab-case (a-z0-9, single hyphens)` });
  }
  // version
  if (typeof doc.version !== 'string' || doc.version.length === 0) {
    errors.push({ field: 'version', reason: 'required string' });
  }
  // persona
  if (typeof doc.persona !== 'object' || doc.persona === null) {
    errors.push({ field: 'persona', reason: 'required object' });
  } else if (typeof doc.persona.role !== 'string' || doc.persona.role.length === 0) {
    errors.push({ field: 'persona.role', reason: 'required non-empty string' });
  }
  // instructions
  if (!Array.isArray(doc.instructions) || doc.instructions.length === 0) {
    errors.push({ field: 'instructions', reason: 'required non-empty list' });
  } else if (doc.instructions.some((i) => typeof i !== 'string' || i.length === 0)) {
    errors.push({ field: 'instructions', reason: 'every item must be a non-empty string' });
  }
  // capabilities (preset shorthand)
  if (doc.capabilities !== undefined && !CAPABILITIES.includes(doc.capabilities)) {
    errors.push({ field: 'capabilities', reason: `must be one of ${CAPABILITIES.join('|')}` });
  }
  // tools
  if (doc.tools !== undefined) {
    if (typeof doc.tools !== 'object' || doc.tools === null) {
      errors.push({ field: 'tools', reason: 'must be an object' });
    } else {
      if (doc.tools.harness !== undefined) {
        if (!Array.isArray(doc.tools.harness)) {
          errors.push({ field: 'tools.harness', reason: 'must be a list of strings' });
        } else {
          for (const t of doc.tools.harness) {
            if (typeof t !== 'string') errors.push({ field: 'tools.harness', reason: 'items must be strings' });
            else if (!KNOWN_HARNESS_TOOLS.has(t)) warnings.push({ field: `tools.harness[${t}]`, reason: 'unknown tool name (non-blocking)' });
          }
        }
      }
      if (doc.tools.mcp !== undefined && !Array.isArray(doc.tools.mcp)) {
        errors.push({ field: 'tools.mcp', reason: 'must be a list of strings' });
      }
    }
  }
  // tasks
  if (!Array.isArray(doc.tasks) || doc.tasks.length === 0) {
    errors.push({ field: 'tasks', reason: 'required non-empty list' });
  } else {
    const seen = new Set();
    doc.tasks.forEach((t, i) => {
      const prefix = `tasks[${i}]`;
      if (typeof t !== 'object' || t === null) { errors.push({ field: prefix, reason: 'must be an object' }); return; }
      if (typeof t.id !== 'string' || t.id.length === 0) errors.push({ field: `${prefix}.id`, reason: 'required non-empty string' });
      else if (seen.has(t.id)) errors.push({ field: `${prefix}.id`, reason: `duplicate id "${t.id}"` });
      else seen.add(t.id);
      if (!KINDS.includes(t.kind)) errors.push({ field: `${prefix}.kind`, reason: `must be one of ${KINDS.join('|')}` });
      if (typeof t.prompt !== 'string' || t.prompt.length === 0) errors.push({ field: `${prefix}.prompt`, reason: 'required non-empty string' });
      if (t.kind === 'scheduled' && (typeof t.schedule !== 'string' || t.schedule.length === 0)) errors.push({ field: `${prefix}.schedule`, reason: 'required for kind "scheduled" (cron or interval)' });
      if (t.kind === 'api' && (typeof t.route !== 'string' || t.route.length === 0)) errors.push({ field: `${prefix}.route`, reason: 'required for kind "api" (HTTP path)' });
    });
  }
  // execution
  if (doc.execution !== undefined) {
    if (typeof doc.execution !== 'object' || doc.execution === null) {
      errors.push({ field: 'execution', reason: 'must be an object' });
    } else {
      if (doc.execution.mode !== undefined && !KINDS.includes(doc.execution.mode)) errors.push({ field: 'execution.mode', reason: `must be one of ${KINDS.join('|')}` });
      if (doc.execution.memory !== undefined && !MEMORY.includes(doc.execution.memory)) errors.push({ field: 'execution.memory', reason: `must be one of ${MEMORY.join('|')}` });
    }
  }
  return { errors, warnings };
}

const arg = process.argv[2];
if (!arg) { console.error('usage: node tools/validate-openbot.mjs <manifest.yaml>'); process.exit(2); }
const abs = resolve(arg);
let raw;
try { raw = readFileSync(abs, 'utf8'); } catch (e) { console.error(`❌ cannot read ${abs}: ${e.code}`); process.exit(2); }
const yaml = loadYaml();
let doc;
try {
  if (abs.endsWith('.json') || raw.trimStart().startsWith('{')) doc = JSON.parse(raw);
  else {
    if (!yaml) { console.error('❌ js-yaml not found; install it or set OPENBOT_JSYAML to its index.js'); process.exit(2); }
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
console.log(`✅ ${abs}: valid (name=${doc.name}, tasks=${Array.isArray(doc.tasks) ? doc.tasks.length : 0})`);
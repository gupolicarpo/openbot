#!/usr/bin/env node
// mcp-openbot.mjs — OpenBot as a dependency-free MCP server (stdio, JSON-RPC).
// Exposes: openbot_list, openbot_validate, openbot_run, openbot_memory,
//          openbot_orchestrate, openbot_pack.
// Connect with any MCP client (DSH / Claude Code / Codex):
//   command: node tools/mcp-openbot.mjs
// Protocol version: 2024-11-05 (content[] / isError).

import { createRequire } from 'node:module';
import { readFileSync, readdirSync, existsSync, appendFileSync, mkdirSync, rmSync, cpSync, writeFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';

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
const yaml = loadYaml();

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const BOTS = join(ROOT, 'bots');

const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const KINDS = ['task', 'chat', 'scheduled', 'api'];
const MEMORY = ['none', 'session', 'history'];

function resolveBot(arg) {
  return /\.ya?ml$/i.test(String(arg)) ? resolve(String(arg)) : join(BOTS, `${arg}.yaml`);
}
function loadBot(arg) {
  if (!yaml) throw new Error('js-yaml not found; set OPENBOT_JSYAML');
  return yaml.load(readFileSync(resolveBot(arg), 'utf8'));
}

function validate(doc) {
  const errors = [];
  const warnings = [];
  if (typeof doc !== 'object' || doc === null || Array.isArray(doc)) {
    return { errors: [{ field: '(root)', reason: 'must be a YAML/JSON object' }], warnings: [] };
  }
  if (typeof doc.name !== 'string' || !doc.name) errors.push({ field: 'name', reason: 'required string' });
  else if (!NAME_RE.test(doc.name)) errors.push({ field: 'name', reason: `"${doc.name}" is not kebab-case` });
  if (typeof doc.version !== 'string' || !doc.version) errors.push({ field: 'version', reason: 'required string' });
  if (typeof doc.persona !== 'object' || doc.persona === null) errors.push({ field: 'persona', reason: 'required object' });
  else if (typeof doc.persona.role !== 'string' || !doc.persona.role) errors.push({ field: 'persona.role', reason: 'required non-empty string' });
  if (!Array.isArray(doc.instructions) || doc.instructions.length === 0) errors.push({ field: 'instructions', reason: 'required non-empty list' });
  if (!Array.isArray(doc.tasks) || doc.tasks.length === 0) {
    errors.push({ field: 'tasks', reason: 'required non-empty list' });
  } else {
    const seen = new Set();
    doc.tasks.forEach((t, i) => {
      const p = `tasks[${i}]`;
      if (typeof t !== 'object' || t === null) { errors.push({ field: p, reason: 'must be an object' }); return; }
      if (typeof t.id !== 'string' || !t.id) errors.push({ field: `${p}.id`, reason: 'required' });
      else if (seen.has(t.id)) errors.push({ field: `${p}.id`, reason: `duplicate "${t.id}"` });
      else seen.add(t.id);
      if (!KINDS.includes(t.kind)) errors.push({ field: `${p}.kind`, reason: `must be one of ${KINDS.join('|')}` });
      if (typeof t.prompt !== 'string' || !t.prompt) errors.push({ field: `${p}.prompt`, reason: 'required' });
      if (t.kind === 'scheduled' && (typeof t.schedule !== 'string' || !t.schedule)) errors.push({ field: `${p}.schedule`, reason: 'required for scheduled' });
      if (t.kind === 'api' && (typeof t.route !== 'string' || !t.route)) errors.push({ field: `${p}.route`, reason: 'required for api' });
    });
  }
  if (doc.execution?.memory !== undefined && !MEMORY.includes(doc.execution.memory)) errors.push({ field: 'execution.memory', reason: `must be one of ${MEMORY.join('|')}` });
  return { errors, warnings };
}

function listBots() {
  const files = readdirSync(BOTS).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml')).sort();
  const rows = files.map((f) => {
    try {
      const d = yaml.load(readFileSync(join(BOTS, f), 'utf8'));
      return `- ${d.name} (v${d.version}) — ${d.description ?? ''} [${(d.tasks ?? []).map((t) => t.kind).join(', ')}]`;
    } catch (e) { return `- (invalid: ${f}) parse error`; }
  });
  return `Bots in ${BOTS}:\n${rows.join('\n')}`;
}

function buildInstruction(doc, task, inputs) {
  const ins = Object.entries(inputs ?? {}).map(([k, v]) => `${k}=${v}`).join(', ') || '(none)';
  const instruction = `Use the openbot skill to run the bot "${doc.name}" (manifest bots/${doc.name}.yaml), task "${task.id}", inputs: ${ins}. Execute it in the current directory and report the result.`;
  const via = (process.env.OPENBOT_VIA ?? 'dsh');
  const q = (s) => `"${String(s).replace(/"/g, '\\"')}"`;
  const cmd = { dsh: `dsh headless ${q(instruction)}`, claude: `claude -p ${q(instruction)}`, codex: `codex exec ${q(instruction)}` }[via];
  return `instruction: ${instruction}\ncommand: ${cmd}`;
}

function memory(bot, op, text) {
  const memPath = resolveBot(bot).replace(/\.ya?ml$/i, '.memory.jsonl');
  if (op === 'add') {
    if (!text) return 'error: text required for add';
    appendFileSync(memPath, JSON.stringify({ ts: new Date().toISOString(), text }) + '\n', 'utf8');
    return `added to ${memPath}`;
  }
  const entries = existsSync(memPath)
    ? readFileSync(memPath, 'utf8').trim().split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return { text: l }; } })
    : [];
  if (op === 'search') {
    const needle = (text ?? '').toLowerCase();
    const hits = entries.filter((e) => (e.text ?? '').toLowerCase().includes(needle));
    return `${hits.length} hit(s) for "${text}":\n${hits.slice(-10).map((h) => `- [${h.ts ?? '?'}] ${h.text}`).join('\n')}`;
  }
  return `${entries.length} entry(ies):\n${entries.slice(-10).map((e) => `- [${e.ts ?? '?'}] ${e.text}`).join('\n')}`;
}

function orchestratePlan(pipePath) {
  const pipe = yaml.load(readFileSync(resolve(pipePath), 'utf8'));
  const steps = pipe.steps ?? [];
  const lines = [`Pipeline: ${pipe.name ?? '(unnamed)'} (${steps.length} steps)`];
  steps.forEach((s, i) => {
    const d = loadBot(s.bot);
    const t = d.tasks.find((x) => x.id === s.task) ?? d.tasks[0];
    lines.push(`${i + 1}. ${d.name}/${t.id}${t.output ? ' → ' + t.output : ''}`);
  });
  return lines.join('\n');
}

function pack(bot, out) {
  const botPath = resolveBot(bot);
  const d = yaml.load(readFileSync(botPath, 'utf8'));
  const packDir = join(resolve(out ?? join(ROOT, 'dist', 'packs')), d.name);
  rmSync(packDir, { recursive: true, force: true });
  mkdirSync(packDir, { recursive: true });
  cpSync(botPath, join(packDir, 'openbot.yaml'));
  const refs = [];
  for (const t of d.tasks ?? []) for (const v of Object.values(t.inputs ?? {})) {
    if (typeof v === 'string' && existsSync(resolve(v))) {
      mkdirSync(dirname(join(packDir, v)), { recursive: true });
      cpSync(resolve(v), join(packDir, v));
      refs.push(v);
    }
  }
  writeFileSync(join(packDir, 'README.md'), `# ${d.name} (v${d.version})\n\n${d.description ?? ''}\n`);
  return `packed ${d.name} → ${packDir}`;
}

const TOOLS = [
  { name: 'openbot_list', description: 'List all bots in bots/ with name, version, description and task kinds.', inputSchema: { type: 'object', properties: {} } },
  { name: 'openbot_validate', description: 'Validate a bot manifest against schema v1.1 (field + reason errors).', inputSchema: { type: 'object', properties: { bot: { type: 'string', description: 'Bot name or manifest path' } }, required: ['bot'] } },
  { name: 'openbot_run', description: 'Build the delegation instruction + command to run a bot via a harness CLI (dsh/claude/codex).', inputSchema: { type: 'object', properties: { bot: { type: 'string' }, task: { type: 'string' }, inputs: { type: 'object' } }, required: ['bot'] } },
  { name: 'openbot_memory', description: 'Persistent memory: add / search / show entries for a bot.', inputSchema: { type: 'object', properties: { bot: { type: 'string' }, op: { type: 'string', enum: ['add', 'search', 'show'] }, text: { type: 'string' } }, required: ['bot', 'op'] } },
  { name: 'openbot_orchestrate', description: 'Print the ordered multi-bot plan for a pipeline.yaml.', inputSchema: { type: 'object', properties: { pipeline: { type: 'string' } }, required: ['pipeline'] } },
  { name: 'openbot_pack', description: 'Bundle a bot (manifest + referenced inputs + README) into a shareable folder.', inputSchema: { type: 'object', properties: { bot: { type: 'string' }, out: { type: 'string' } }, required: ['bot'] } },
];

function callTool(name, args) {
  switch (name) {
    case 'openbot_list': return listBots();
    case 'openbot_validate': {
      const d = loadBot(args.bot);
      const { errors } = validate(d);
      if (errors.length) return `❌ ${args.bot}: ${errors.length} error(s)\n` + errors.map((e) => `  ${e.field}: ${e.reason}`).join('\n');
      return `✅ ${args.bot}: valid (name=${d.name}, tasks=${(d.tasks ?? []).length})`;
    }
    case 'openbot_run': {
      const d = loadBot(args.bot);
      const t = d.tasks.find((x) => x.id === args.task) ?? d.tasks[0];
      return buildInstruction(d, t, args.inputs);
    }
    case 'openbot_memory': return memory(args.bot, args.op, args.text);
    case 'openbot_orchestrate': return orchestratePlan(args.pipeline);
    case 'openbot_pack': return pack(args.bot, args.out);
    default: throw new Error(`unknown tool "${name}"`);
  }
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
function send(obj) { process.stdout.write(JSON.stringify(obj) + '\n'); }
rl.on('line', (line) => {
  let msg;
  try { msg = JSON.parse(line); } catch { return; }
  if (msg.method === 'initialize') {
    send({ jsonrpc: '2.0', id: msg.id, result: { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'openbot-mcp', version: '0.1.0' } } });
  } else if (msg.method === 'tools/list') {
    send({ jsonrpc: '2.0', id: msg.id, result: { tools: TOOLS } });
  } else if (msg.method === 'tools/call') {
    try {
      const text = callTool(msg.params?.name, msg.params?.arguments ?? {});
      send({ jsonrpc: '2.0', id: msg.id, result: { content: [{ type: 'text', text }], isError: false } });
    } catch (e) {
      send({ jsonrpc: '2.0', id: msg.id, result: { content: [{ type: 'text', text: 'error: ' + e.message }], isError: true } });
    }
  } else if (msg.method === 'ping') {
    send({ jsonrpc: '2.0', id: msg.id, result: {} });
  }
});
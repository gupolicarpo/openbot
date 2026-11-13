#!/usr/bin/env node
// mcp-openbot.mjs — OpenBot as a dependency-free MCP server (stdio, JSON-RPC).
// Prompts: new-bot, edit-bot, chat-with-bot.
// Exposes: openbot_list, openbot_validate, openbot_run, openbot_memory,
//          openbot_orchestrate, openbot_pack, openbot_get, openbot_save.
// Connect with any MCP client (DSH / Claude Code / Codex):
//   command: node tools/mcp-openbot.mjs
// Protocol version: 2024-11-05 (content[] / isError).

import { readFileSync, readdirSync, existsSync, appendFileSync, mkdirSync, rmSync, cpSync, writeFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';
import yaml from './lib/yaml.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const BOTS = join(ROOT, 'bots');

// MCP clients launch the server from whatever folder they were started in.
// Pin the working directory to the repo root so repo-relative paths in tool
// arguments (sample/pipeline.yaml, bots/x.yaml, pack inputs) always resolve.
process.chdir(ROOT);

const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const KINDS = ['task', 'chat', 'scheduled', 'api'];
const MEMORY = ['none', 'session', 'history'];

function resolveBot(arg) {
  return /\.ya?ml$/i.test(String(arg)) ? resolve(String(arg)) : join(BOTS, `${arg}.yaml`);
}
function loadBot(arg) {
  return yaml.load(readFileSync(resolveBot(arg), 'utf8'));
}

function iconError(icon) {
  if (icon === undefined) return null;
  if (typeof icon !== 'string') return 'must be a string (one emoji)';
  const n = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(icon)].length;
  return n === 1 && !/s/.test(icon) ? null : `"${icon}" must be exactly one emoji/character`;
}
const ico = (d) => d?.icon ?? '🤖';

function validate(doc) {
  const errors = [];
  const warnings = [];
  if (typeof doc !== 'object' || doc === null || Array.isArray(doc)) {
    return { errors: [{ field: '(root)', reason: 'must be a YAML/JSON object' }], warnings: [] };
  }
  if (typeof doc.name !== 'string' || !doc.name) errors.push({ field: 'name', reason: 'required string' });
  else if (!NAME_RE.test(doc.name)) errors.push({ field: 'name', reason: `"${doc.name}" is not kebab-case` });
  if (typeof doc.version !== 'string' || !doc.version) errors.push({ field: 'version', reason: 'required string' });
  const iconErr = iconError(doc.icon);
  if (iconErr) errors.push({ field: 'icon', reason: iconErr });
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
      return `- ${ico(d)} ${d.name} (v${d.version}) — ${d.description ?? ''} [${(d.tasks ?? []).map((t) => t.kind).join(', ')}]`;
    } catch (e) { return `- ⚠️ (invalid: ${f}) parse error`; }
  });
  return `Bots in ${BOTS}:\n${rows.join('\n')}`;
}

function buildInstruction(doc, task, inputs) {
  const ins = Object.entries(inputs ?? {}).map(([k, v]) => `${k}=${v}`).join(', ') || '(none)';
  const instruction = `Use the openbot skill to run the bot ${ico(doc)} "${doc.name}" (manifest bots/${doc.name}.yaml), task "${task.id}", inputs: ${ins}. Execute it in the current directory and report the result.`;
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
    lines.push(`${i + 1}. ${ico(d)} ${d.name}/${t.id}${t.output ? ' → ' + t.output : ''}`);
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
  writeFileSync(join(packDir, 'README.md'), `# ${ico(d)} ${d.name} (v${d.version})\n\n${d.description ?? ''}\n`);
  return `packed ${d.name} → ${packDir}`;
}

// MCP prompts: in Claude Code they show up as /mcp__openbot__<name>; in the
// Claude app's Chat mode, in the "+" menu of the openbot server. They are
// self-contained (no skill needed) and only use this server's tools.
const PROMPTS = [
  { name: 'new-bot', description: 'Create a new OpenBot bot through a guided interview (no YAML).', arguments: [{ name: 'idea', description: 'One line about what the bot should do (optional)', required: false }] },
  { name: 'edit-bot', description: 'Edit an existing OpenBot bot through a short interview.', arguments: [{ name: 'bot', description: 'Bot name (as in bots/<name>.yaml)', required: true }] },
  { name: 'chat-with-bot', description: 'Talk to an OpenBot bot: Claude takes on its persona for this conversation.', arguments: [{ name: 'bot', description: 'Bot name (as in bots/<name>.yaml)', required: true }] },
];
const FENCE = String.fromCharCode(96).repeat(3);
const INTERVIEW_RULES = [
  'Interview me in my language, in batches of 2-5 questions. For each question propose a recommended answer (pre-filled from what I already said) that I can confirm or change.',
  'Use a structured question tool if this harness has one (Claude Code: AskUserQuestion); otherwise ask in plain text and STOP your turn to wait for my answers.',
  'Do NOT create or modify any bot until I have explicitly approved the final summary.',
];
const MANIFEST_SPEC = [
  'Manifest fields (YAML): name (kebab-case, unique), icon (exactly one emoji), version ("0.1" for new bots), description (one line),',
  'persona: { role (required), tone, constraints: [what it must never do] }, instructions: [standing rules, >=1],',
  'tools: { harness: [...] } (omit = read-only), tasks: [{ id, kind: task|chat|scheduled|api, prompt, inputs: {...}, output: <file> }]',
  '(scheduled needs schedule: "<cron>", api needs route: "/path"). A bot you talk to needs a kind: chat task whose prompt is its standing behavior.',
];
const OPEN_SESSION = [
  "Then open the bot's own conversation:",
  '- If you can start a separate session (Claude Code desktop: the start_session tool; load it with ToolSearch if deferred), start one now (initiation "user_asked", context "fresh", use_worktree false, title "<icon> <name>", name "<name>") with the prompt: Use the openbot skill in chat mode, or the openbot_get tool: you are the bot "<name>". Greet me in role and wait for my first message. Then link it to me.',
  "- Otherwise (e.g. the Claude app's Chat mode): tell me to open a new chat and pick the openbot prompt \"chat-with-bot\" with bot = <name>.",
];
function chatPrompt(d) {
  const icon = d.icon ?? '🤖';
  const chatTask = (d.tasks ?? []).find((t) => t.kind === 'chat') ?? (d.tasks ?? [])[0];
  return [
    'For the rest of this conversation you ARE the OpenBot bot ' + icon + ' "' + d.name + '" (v' + d.version + ').',
    'Role: ' + d.persona?.role,
    d.persona?.tone ? 'Tone: ' + d.persona.tone : '',
    ...(d.persona?.constraints ?? []).map((c) => 'Constraint: ' + c),
    'Instructions:', ...(d.instructions ?? []).map((i) => '- ' + i),
    chatTask ? 'Standing behavior (task "' + chatTask.id + '"): ' + chatTask.prompt : '',
    'Start every message you write as the bot with "' + icon + ' **' + d.name + ':**". Speak my language. Stay in role until I say "sair do bot".',
    'Greet me now in role, in one or two lines, and wait for my first message.',
  ].filter(Boolean).join('\n');
}
function getPrompt(name, args = {}) {
  const msg = (description, text) => ({ description, messages: [{ role: 'user', content: { type: 'text', text } }] });
  if (name === 'new-bot') {
    const idea = args.idea ? 'My idea: "' + args.idea + '".' : 'Start by asking me what the bot should do.';
    return msg('Guided creation of a new bot', [
      'I want to create a new OpenBot bot. ' + idea,
      'Run this interview, in order:',
      '0. Restate my idea in one line and say you will ask a few questions before creating anything.',
      '1. Name (check it is free with openbot_list), role/persona, and one emoji icon.',
      '2. Tone, constraints (what it must never do) and standing instructions.',
      '3. Tools (default: read-only).',
      '4. Main task(s): prompt, inputs, output file, kind. Include a kind: chat task so I can talk to it.',
      '5. Show a compact summary (not raw YAML) and ask "Posso criar?".',
      ...INTERVIEW_RULES,
      ...MANIFEST_SPEC,
      'After my explicit yes: call openbot_save with the full YAML manifest and approved: true. If it reports errors, fix them and save again. Report the path.',
      ...OPEN_SESSION,
    ].join('\n'));
  }
  if (name !== 'edit-bot' && name !== 'chat-with-bot') throw new Error('unknown prompt "' + name + '"');
  if (!args.bot) throw new Error('argument "bot" is required');
  const d = loadBot(args.bot);
  if (name === 'edit-bot') {
    return msg('Guided edit of ' + d.name, [
      'I want to edit the OpenBot bot ' + (d.icon ?? '🤖') + ' "' + d.name + '" (v' + d.version + '). Its current manifest:',
      FENCE + 'yaml', readFileSync(resolveBot(args.bot), 'utf8').trim(), FENCE,
      'Summarize it to me in 1-2 lines, then ask ONLY what I want to change.',
      ...INTERVIEW_RULES,
      'After my explicit yes: apply just that delta, keep everything else, bump version, and call openbot_save with the full YAML, approved: true and overwrite: true. Report the result.',
    ].join('\n'));
  }
  return msg('Chat with ' + d.name, chatPrompt(d));
}

function getBot(bot) {
  const d = loadBot(bot);
  return [
    (d.icon ?? '🤖') + ' ' + d.name + ' (v' + d.version + ') — ' + (d.description ?? ''),
    '', '## How to act as this bot', chatPrompt(d),
    '', '## Manifest (' + resolveBot(bot) + ')', readFileSync(resolveBot(bot), 'utf8').trim(),
  ].join('\n');
}

function saveBot({ manifest, approved, overwrite }) {
  if (approved !== true) throw new Error('refused: set approved=true only after the user explicitly approved the summary of this bot');
  if (typeof manifest !== 'string' || !manifest.trim()) throw new Error('manifest (YAML text) is required');
  const d = yaml.load(manifest);
  const { errors } = validate(d);
  if (errors.length) return '❌ not saved — ' + errors.length + ' error(s):\n' + errors.map((e) => '  ' + e.field + ': ' + e.reason).join('\n');
  const path = join(BOTS, d.name + '.yaml');
  if (existsSync(path) && overwrite !== true) throw new Error('bots/' + d.name + '.yaml already exists; pick another name, or pass overwrite=true when editing it');
  writeFileSync(path, manifest.replace(/^﻿/, '').trimEnd() + '\n', 'utf8');
  return '✅ saved ' + (d.icon ?? '🤖') + ' ' + d.name + ' (v' + d.version + ') → ' + path;
}

const TOOLS = [
  { name: 'openbot_list', description: 'List all bots in bots/ with name, version, description and task kinds.', inputSchema: { type: 'object', properties: {} } },
  { name: 'openbot_validate', description: 'Validate a bot manifest against schema v1.1 (field + reason errors).', inputSchema: { type: 'object', properties: { bot: { type: 'string', description: 'Bot name or manifest path' } }, required: ['bot'] } },
  { name: 'openbot_run', description: 'Build the delegation instruction + command to run a bot via a harness CLI (dsh/claude/codex).', inputSchema: { type: 'object', properties: { bot: { type: 'string' }, task: { type: 'string' }, inputs: { type: 'object' } }, required: ['bot'] } },
  { name: 'openbot_memory', description: 'Persistent memory: add / search / show entries for a bot.', inputSchema: { type: 'object', properties: { bot: { type: 'string' }, op: { type: 'string', enum: ['add', 'search', 'show'] }, text: { type: 'string' } }, required: ['bot', 'op'] } },
  { name: 'openbot_orchestrate', description: 'Print the ordered multi-bot plan for a pipeline.yaml.', inputSchema: { type: 'object', properties: { pipeline: { type: 'string' } }, required: ['pipeline'] } },
  { name: 'openbot_get', description: 'Get a bot: its icon, how to act as it (persona, instructions, chat behavior) and its full manifest. Use it to talk as the bot or before editing it.', inputSchema: { type: 'object', properties: { bot: { type: 'string', description: 'Bot name or manifest path' } }, required: ['bot'] } },
  { name: 'openbot_save', description: 'Validate and write a bot manifest to bots/<name>.yaml. Only call after the user explicitly approved the bot summary (approved=true). Refuses to overwrite unless overwrite=true.', inputSchema: { type: 'object', properties: { manifest: { type: 'string', description: 'Full YAML manifest' }, approved: { type: 'boolean', description: 'true only if the user explicitly approved this bot' }, overwrite: { type: 'boolean', description: 'true to replace an existing bot (edit flow)' } }, required: ['manifest', 'approved'] } },
  { name: 'openbot_pack', description: 'Bundle a bot (manifest + referenced inputs + README) into a shareable folder.', inputSchema: { type: 'object', properties: { bot: { type: 'string' }, out: { type: 'string' } }, required: ['bot'] } },
];

function callTool(name, args) {
  switch (name) {
    case 'openbot_list': return listBots();
    case 'openbot_validate': {
      const d = loadBot(args.bot);
      const { errors } = validate(d);
      if (errors.length) return `❌ ${ico(d)} ${args.bot}: ${errors.length} error(s)\n` + errors.map((e) => `  ${e.field}: ${e.reason}`).join('\n');
      return `✅ ${ico(d)} ${args.bot}: valid (name=${d.name}, tasks=${(d.tasks ?? []).length})`;
    }
    case 'openbot_run': {
      const d = loadBot(args.bot);
      const t = d.tasks.find((x) => x.id === args.task) ?? d.tasks[0];
      return buildInstruction(d, t, args.inputs);
    }
    case 'openbot_memory': return memory(args.bot, args.op, args.text);
    case 'openbot_orchestrate': return orchestratePlan(args.pipeline);
    case 'openbot_get': return getBot(args.bot);
    case 'openbot_save': return saveBot(args);
    case 'openbot_pack': return pack(args.bot, args.out);
    default: throw new Error(`unknown tool "${name}"`);
  }
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
function send(obj) { process.stdout.write(JSON.stringify(obj) + '\n'); }
rl.on('line', (line) => {
  let msg;
  if (!line.trim()) return;
  try { msg = JSON.parse(line); } catch {
    send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
    return;
  }
  if (msg.method === 'initialize') {
    send({ jsonrpc: '2.0', id: msg.id, result: { protocolVersion: '2024-11-05', capabilities: { tools: {}, prompts: {} }, serverInfo: { name: 'openbot-mcp', version: '0.1.0' } } });
  } else if (msg.method === 'prompts/list') {
    send({ jsonrpc: '2.0', id: msg.id, result: { prompts: PROMPTS } });
  } else if (msg.method === 'prompts/get') {
    try {
      send({ jsonrpc: '2.0', id: msg.id, result: getPrompt(msg.params?.name, msg.params?.arguments ?? {}) });
    } catch (e) {
      send({ jsonrpc: '2.0', id: msg.id, error: { code: -32602, message: e.message } });
    }
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
  } else if (msg.id !== undefined && msg.id !== null) {
    // Any other request must get an answer, or the client waits until timeout.
    // Messages without an id are notifications (e.g. notifications/initialized): no reply.
    send({ jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: `Method not found: ${msg.method}` } });
  }
});
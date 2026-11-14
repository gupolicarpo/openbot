// manifest.mjs — single source of truth for OpenBot manifests:
// validation (used by the CLI validator, the MCP server and the exporter) and
// compilation of a bot into a Claude Code subagent (.claude/agents/*.md).
import yaml from './yaml.mjs';

export const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const KINDS = ['task', 'chat', 'scheduled', 'api'];
export const MEMORY = ['none', 'session', 'history'];
export const MODELS = ['inherit', 'haiku', 'sonnet', 'opus', 'fable'];
export const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];
const CAPABILITIES = ['explore', 'plan', 'general'];
const VERIFIABLE = ['task', 'chat'];

// Portable harness tool names → Claude Code tool names (null = not available to a subagent).
export const CLAUDE_TOOLS = {
  read: 'Read', grep: 'Grep', glob: 'Glob', list: 'Glob', write: 'Write', edit: 'Edit',
  bash: 'Bash', pwsh: 'PowerShell', web_search: 'WebSearch', web_fetch: 'WebFetch',
  subagent: 'Agent', workflow: null, ask_user_question: null,
};
const READ_ONLY = ['read', 'grep', 'glob'];

const isStr = (v) => typeof v === 'string' && v.length > 0;
const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

export function iconError(icon) {
  if (icon === undefined) return null;
  if (typeof icon !== 'string') return 'must be a string (one emoji)';
  const n = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(icon)].length;
  return n === 1 && !/\s/.test(icon) ? null : `"${icon}" must be exactly one emoji/character`;
}

export function validate(doc) {
  const errors = [];
  const warnings = [];
  const err = (field, reason) => errors.push({ field, reason });
  const warn = (field, reason) => warnings.push({ field, reason });
  if (!isObj(doc)) return { errors: [{ field: '(root)', reason: 'manifest must be a YAML/JSON object' }], warnings };

  if (!isStr(doc.name)) err('name', 'required string');
  else if (!NAME_RE.test(doc.name)) err('name', `"${doc.name}" is not kebab-case (a-z0-9, single hyphens)`);
  if (!isStr(doc.version)) err('version', 'required string');
  const iconErr = iconError(doc.icon);
  if (iconErr) err('icon', iconErr);

  if (!isObj(doc.persona)) err('persona', 'required object');
  else if (!isStr(doc.persona.role)) err('persona.role', 'required non-empty string');
  if (!Array.isArray(doc.instructions) || doc.instructions.length === 0) err('instructions', 'required non-empty list');
  else if (doc.instructions.some((i) => !isStr(i))) err('instructions', 'every item must be a non-empty string');
  if (doc.capabilities !== undefined && !CAPABILITIES.includes(doc.capabilities)) err('capabilities', `must be one of ${CAPABILITIES.join('|')}`);

  // requires: what the bot needs from the environment (checked in the technical phase)
  if (doc.requires !== undefined && (!Array.isArray(doc.requires) || doc.requires.some((r) => !isStr(r)))) {
    err('requires', 'must be a list of non-empty strings');
  }

  if (doc.tools !== undefined) {
    if (!isObj(doc.tools)) err('tools', 'must be an object');
    else {
      if (doc.tools.harness !== undefined) {
        if (!Array.isArray(doc.tools.harness)) err('tools.harness', 'must be a list of strings');
        else for (const t of doc.tools.harness) {
          if (typeof t !== 'string') err('tools.harness', 'items must be strings');
          else if (!(t in CLAUDE_TOOLS)) warn(`tools.harness[${t}]`, 'unknown tool name (non-blocking)');
        }
      }
      if (doc.tools.mcp !== undefined && !Array.isArray(doc.tools.mcp)) err('tools.mcp', 'must be a list of strings');
    }
  }

  if (!Array.isArray(doc.tasks) || doc.tasks.length === 0) err('tasks', 'required non-empty list');
  else {
    const seen = new Set();
    doc.tasks.forEach((t, i) => {
      const p = `tasks[${i}]`;
      if (!isObj(t)) { err(p, 'must be an object'); return; }
      if (!isStr(t.id)) err(`${p}.id`, 'required non-empty string');
      else if (seen.has(t.id)) err(`${p}.id`, `duplicate id "${t.id}"`);
      else seen.add(t.id);
      if (!KINDS.includes(t.kind)) err(`${p}.kind`, `must be one of ${KINDS.join('|')}`);
      if (!isStr(t.prompt)) err(`${p}.prompt`, 'required non-empty string');
      if (t.kind === 'scheduled' && !isStr(t.schedule)) err(`${p}.schedule`, 'required for kind "scheduled" (cron or interval)');
      if (t.kind === 'api' && !isStr(t.route)) err(`${p}.route`, 'required for kind "api" (HTTP path)');
      if (t.inputs !== undefined && !isObj(t.inputs)) err(`${p}.inputs`, 'must be an object');

      // acceptance: how to tell the output is good (string or list of checks)
      if (t.acceptance !== undefined) {
        const ok = isStr(t.acceptance) || (Array.isArray(t.acceptance) && t.acceptance.length > 0 && t.acceptance.every(isStr));
        if (!ok) err(`${p}.acceptance`, 'must be a non-empty string or list of strings');
      } else if (VERIFIABLE.includes(t.kind)) warn(`${p}.acceptance`, 'missing: the bot cannot be verified against criteria');
      // test: a sample run used by the verification phase
      if (t.test !== undefined) {
        if (!isObj(t.test)) err(`${p}.test`, 'must be an object ({ inputs | message, expect })');
        else {
          if (t.test.inputs !== undefined && !isObj(t.test.inputs)) err(`${p}.test.inputs`, 'must be an object');
          if (t.test.message !== undefined && !isStr(t.test.message)) err(`${p}.test.message`, 'must be a non-empty string');
          if (t.test.expect !== undefined && !isStr(t.test.expect)) err(`${p}.test.expect`, 'must be a non-empty string');
          if (t.test.inputs === undefined && t.test.message === undefined) err(`${p}.test`, 'needs inputs (task) or message (chat)');
        }
      } else if (VERIFIABLE.includes(t.kind)) warn(`${p}.test`, 'missing: no sample run to verify the bot');
    });
  }

  if (doc.execution !== undefined) {
    if (!isObj(doc.execution)) err('execution', 'must be an object');
    else {
      if (doc.execution.mode !== undefined && !KINDS.includes(doc.execution.mode)) err('execution.mode', `must be one of ${KINDS.join('|')}`);
      if (doc.execution.memory !== undefined && !MEMORY.includes(doc.execution.memory)) err('execution.memory', `must be one of ${MEMORY.join('|')}`);
      if (doc.execution.model !== undefined && !MODELS.includes(doc.execution.model)) err('execution.model', `must be one of ${MODELS.join('|')}`);
      if (doc.execution.effort !== undefined && !EFFORTS.includes(doc.execution.effort)) err('execution.effort', `must be one of ${EFFORTS.join('|')}`);
    }
  }
  return { errors, warnings };
}

export const agentName = (bot) => `openbot-${bot}`;

// Claude Code tool list for a bot's subagent. No `tools` → read-only.
export function claudeTools(doc) {
  const harness = Array.isArray(doc.tools?.harness) ? doc.tools.harness : READ_ONLY;
  const out = new Set(harness.map((t) => CLAUDE_TOOLS[t]).filter(Boolean));
  for (const m of doc.tools?.mcp ?? []) if (isStr(m)) out.add(m);
  const mem = doc.execution?.memory;
  if (mem === 'history') { out.add('Read'); out.add('Write'); } // to read/append its own memory file
  return [...out];
}

const list = (v) => (Array.isArray(v) ? v : v === undefined ? [] : [v]);

// Compile a validated manifest into a Claude Code subagent definition (Markdown + frontmatter).
export function toClaudeAgent(doc, manifestPath) {
  const icon = doc.icon ?? '🤖';
  const uses = doc.tasks.map((t) => t.id).join(', ');
  const description = `${icon} OpenBot bot "${doc.name}" (v${doc.version}): ${doc.description ?? doc.persona.role}. `
    + `Delegate to it for its own tasks (${uses}); give it the task id and inputs.`;
  const fm = { name: agentName(doc.name), description, tools: claudeTools(doc).join(', ') };
  if (doc.execution?.model && doc.execution.model !== 'inherit') fm.model = doc.execution.model;
  if (doc.execution?.effort) fm.effort = doc.execution.effort;

  const L = [];
  L.push(`<!-- Generated from ${manifestPath} by tools/export-agents-openbot.mjs. Do not edit: change the manifest and re-export. -->`);
  L.push('', `You are the OpenBot bot ${icon} **${doc.name}** (v${doc.version}).`, '', `Role: ${doc.persona.role}`);
  if (doc.persona.tone) L.push(`Tone: ${doc.persona.tone}`);
  const cons = list(doc.persona.constraints);
  if (cons.length) L.push('', '## Constraints (never break these)', ...cons.map((c) => `- ${c}`));
  L.push('', '## Instructions', ...doc.instructions.map((i) => `- ${i}`));
  if (doc.requires?.length) L.push('', '## Requires', ...doc.requires.map((r) => `- ${r}`),
    'If something listed here is not available to you, stop and report it instead of improvising.');
  const canWrite = claudeTools(doc).includes('Write');
  L.push('', '## Tasks');
  for (const t of doc.tasks) {
    L.push('', `### ${t.id} (${t.kind})`, t.prompt);
    if (t.inputs) L.push(`Default inputs: ${Object.entries(t.inputs).map(([k, v]) => `${k}=${v}`).join(', ')}`);
    if (t.output) L.push(canWrite
      ? `Write the result to: ${t.output}`
      : `Output file: ${t.output}. You cannot write files: put the full result in your report so the caller saves it there.`);
    const acc = list(t.acceptance);
    if (acc.length) L.push('Acceptance criteria (check each one before you finish):', ...acc.map((a) => `- ${a}`));
  }
  const mem = doc.execution?.memory;
  L.push('', '## How you work',
    '- You run with a clean context: rely only on this definition and on what the caller passes you (task id + inputs). If an input is missing or ambiguous, say so instead of guessing.',
    '- Do only the task you were given; do not do work outside it.',
    `- Start your final report with "${icon} **${doc.name}:**", then: what you did, where the result is, and for each acceptance criterion whether it is met (✅/❌) with one line of evidence.`);
  if (mem === 'history') L.push(`- Memory: read ${manifestPath.replace(/\.ya?ml$/i, '.memory.jsonl')} first if it exists; when done, append one JSON line {"ts": "<ISO time>", "text": "<what you learned>"} to it.`);
  return `---\n${yaml.dump(fm, { lineWidth: -1 }).trim()}\n---\n\n${L.join('\n')}\n`;
}

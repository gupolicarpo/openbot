// paths.mjs — where bots live.
// - personal bots (the user's own, never committed): $OPENBOT_HOME/bots, default ~/.openbot/bots;
//   exported to the user's Claude Code subagents, ~/.claude/agents.
// - project bots (the examples shipped with OpenBot): <repo>/bots; exported to <repo>/.claude/agents.
// New bots are personal. A name must be unique across both.
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OPENBOT_HOME = process.env.OPENBOT_HOME ? resolve(process.env.OPENBOT_HOME) : join(homedir(), '.openbot');

export const SCOPES = {
  personal: { bots: join(OPENBOT_HOME, 'bots'), agents: join(homedir(), '.claude', 'agents') },
  project: { bots: join(ROOT, 'bots'), agents: join(ROOT, '.claude', 'agents') },
};

const YAML_RE = /\.ya?ml$/i;

// Every bot as { name, path, scope }, personal first.
export function listBotFiles(scopes = ['personal', 'project']) {
  const out = [];
  for (const scope of scopes) {
    const dir = SCOPES[scope].bots;
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter((x) => YAML_RE.test(x)).sort()) {
      out.push({ name: f.replace(YAML_RE, ''), path: join(dir, f), scope });
    }
  }
  return out;
}

// A bot name or a manifest path → { name, path, scope }. Unknown names resolve to the personal folder.
export function findBot(arg) {
  const s = String(arg);
  if (YAML_RE.test(s)) {
    const path = resolve(s);
    const scope = Object.keys(SCOPES).find((k) => dirname(path) === SCOPES[k].bots) ?? 'project';
    return { name: s.replace(/^.*[\\/]/, '').replace(YAML_RE, ''), path, scope };
  }
  return listBotFiles().find((b) => b.name === s) ?? { name: s, path: join(SCOPES.personal.bots, `${s}.yaml`), scope: 'personal' };
}

// How a manifest path is shown (and embedded in generated subagents): repo-relative or ~-relative.
export function displayPath(path) {
  if (path.startsWith(ROOT)) return path.slice(ROOT.length + 1).replace(/\\/g, '/');
  if (path.startsWith(homedir())) return '~' + path.slice(homedir().length).replace(/\\/g, '/');
  return path;
}

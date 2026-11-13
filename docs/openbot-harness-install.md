# OpenBot — Per-harness install

The `openbot` skill is **portable**: it uses the Agent Skills format
(`SKILL.md`), read by DSH, Claude Code and Codex. The same files work in all
three.

## Install (automated)

```bash
node tools/install-openbot.mjs <harness...> [--project]
```

| Harness | Skills directory |
|---|---|
| `dsh` | `.agents/skills/openbot/` |
| `claude` | `.claude/skills/openbot/` |
| `codex` | `.codex/skills/openbot/` |
| `all` (default) | all three |

- `--project`: install into `<cwd>/.<harness>/skills` (project root).
- without `--project` (default): install into `~/.<harness>/skills` (user).

```bash
node tools/install-openbot.mjs claude codex     # user
node tools/install-openbot.mjs all --project    # project
```

## Install (manual)

```bash
# Claude Code
cp -r .agents/skills/openbot ~/.claude/skills/openbot      # user
cp -r .agents/skills/openbot .claude/skills/openbot        # project

# Codex
cp -r .agents/skills/openbot ~/.codex/skills/openbot       # user
cp -r .agents/skills/openbot .codex/skills/openbot         # project

# DSH (already a project skill in this workspace)
```

## How it works in each harness

- The skill instructs the agent to load `openbot.yaml` and *become* the bot,
  using the harness's native loop — no per-harness code.
- The `tools/` scripts (`validate`, `list`, `schedule`, `serve`) are optional,
  called via shell; `js-yaml` is vendored in `tools/vendor/` (no install needed; a local `js-yaml` or `OPENBOT_JSYAML` overrides it).
- Manifests live in `bots/*.yaml` in the workspace (or wherever the user points).

## Requirements
- Node.js ≥ 20 for the `tools/*.mjs` scripts.
- No npm install: `js-yaml` is vendored in `tools/vendor/` (no install needed; a local `js-yaml` or `OPENBOT_JSYAML` overrides it).

## Run programmatically (delegation)

For automation (scheduled/api/CI), use the hook that **delegates to the harness
agent** (instead of calling the raw model):

```bash
node tools/run-openbot.mjs <bot> --via dsh|claude|codex [--task <id>] [--input k=v ...] [--dry-run]
```

- `--via dsh`    → `dsh headless "<instruction>"`
- `--via claude` → `claude -p "<instruction>"`
- `--via codex`  → `codex exec "<instruction>"`
- `--via openai` → fallback: calls the model API directly
- `auto` (default) → detects the first installed CLI
- `--dry-run` → shows the instruction and the exact command

The `openbot` skill must be installed in the target harness (see above). The
agent then loads the skill, becomes the bot, and uses its tools — the full path A.
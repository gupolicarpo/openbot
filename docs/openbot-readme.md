# OpenBot — README

A lightweight layer to create, edit, list and run **bots** inside existing AI
harnesses (MVP: DeepSeek Harness). A bot is an `openbot.yaml` manifest with
personality, instructions, tools and tasks.

## Requirements
- A harness with the `openbot` skill installed (`.agents/skills/openbot`).
- Node.js ≥ 20 for the scripts in `tools/`.

## Commands (via harness or scripts)
| Action | How |
|---|---|
| Run (task) | "run the bot code-reviewer" — the skill executes and records the run |
| Chat | "chat with the bot support-assistant" — multi-turn |
| Create a bot (no YAML) | "create a bot" — guided interview |
| Edit a bot | "edit the bot X" — applies only the requested changes |
| List bots | "list the bots" or `node tools/list-openbot.mjs` |
| Validate a manifest | `node tools/validate-openbot.mjs bots/<name>.yaml` |
| Plan a schedule | `node tools/schedule-openbot.mjs <bot> [--once]` |
| Serve the API | `node tools/serve-openbot.mjs [port] [bots-dir]` |

## Layout
- `bots/*.yaml` — manifests; `bots/*.runs.jsonl` — run history.
- `sample/` — example inputs and outputs.
- `tools/` — `validate-openbot.mjs`, `list-openbot.mjs`, `schedule-openbot.mjs`, `serve-openbot.mjs`.
- `.agents/skills/openbot/` — the skill (run/chat/list/author-edit).
- `docs/` — schema, adapter spec, architecture, backlog.

## Extend
- **New bot:** create `bots/<name>.yaml` (schema in `docs/openbot-schema-v1.md`).
- **New harness:** implement the interface in `docs/openbot-adapter-spec-v1.md`.
- **Next items:** see `docs/openbot-backlog.md`.

## Advanced tools (`tools/`)
| Script | Purpose |
|---|---|
| `run-openbot.mjs` | Programmatic hook: builds the prompt and (if configured) calls the model |
| `memory-openbot.mjs` | Persistent memory (`add` / `search` / `show`) |
| `orchestrate-openbot.mjs` | Multi-bot orchestration (pipeline) |
| `pack-openbot.mjs` | Bundle a bot for distribution |
| `validate-all.mjs` | Validate all bots (CI) |

> `run-openbot.mjs` delegates to the harness agent (`dsh headless` / `claude -p`
> / `codex exec`) via the `openbot` skill; `--via openai` is the fallback for a
> direct LLM call.

## MCP server
`node tools/mcp-openbot.mjs` exposes the scripts as MCP tools
(`openbot_list/validate/run/memory/orchestrate/pack`) for DSH, Claude Code and
Codex. Config in `docs/openbot-mcp.md`.
# OpenBot

A lightweight layer to create, edit, list and run **bots** — with personality,
instructions, tools and tasks — **inside existing AI harnesses** (DeepSeek
Harness, Claude Code and Codex). Each bot is a portable `openbot.yaml` manifest;
an `openbot` runner skill executes it in the harness's native loop, without
reimplementing an agent.

## Features
- **Modes**: task (one-shot), chat (multi-turn), scheduled, api, compose (multi-bot), list.
- **Persona + instructions + tools + memory** per bot (declarative manifest).
- **Capability presets** (`explore` / `plan` / `general`).
- **Portable**: Agent Skills skill + installer + MCP server for DSH, Claude Code and Codex.
- **Tooling**: validator, listing, programmatic hook (delegates to the harness), memory, orchestration, pack, CI.

## Quick start
```bash
node tools/validate-all.mjs bots        # validate the bots
node tools/list-openbot.mjs             # list the bots
node tools/install-openbot.mjs claude codex   # install the skill into other harnesses
node tools/mcp-openbot.mjs              # MCP server (native tools)
```

## Layout
- `bots/*.yaml` — bot manifests.
- `tools/` — scripts (validate, list, run, memory, orchestrate, schedule, serve, pack, install, mcp).
- `.agents/skills/openbot/` — the skill (runner + author/edit).
- `docs/` — full documentation.

## Documentation
[README](docs/openbot-readme.md) · [schema](docs/openbot-schema-v1.md) ·
[adapter spec](docs/openbot-adapter-spec-v1.md) · [MCP](docs/openbot-mcp.md) ·
[harness install](docs/openbot-harness-install.md) ·
[architecture](docs/openbot-architecture.md) · [backlog](docs/openbot-backlog.md) ·
[smoke test](docs/smoke-test.md)
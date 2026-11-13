# OpenBot — Architecture notes

## Overview
OpenBot **does not implement an agent**. It configures and drives the agent the
harness already provides, using a portable manifest as the single source of truth.

```
openbot.yaml ──► runner (skill `openbot`) ──► harness native loop
   (bot)           validate + become the bot     model + tools
```

## Components
1. **Manifest** (`bots/*.yaml`, schema v1.1) — persona, instructions, tools, tasks, execution.
2. **Runner** (`.agents/skills/openbot/`) — modes: `run` (task) · `chat` · `list` · `author/edit` · `compose`.
3. **Scripts** (`tools/`):
   - `validate-openbot.mjs` — schema v1.1, field+reason errors, exit 0/1.
   - `list-openbot.mjs` — lists bots.
   - `schedule-openbot.mjs` — plans/triggers `kind: scheduled`.
   - `serve-openbot.mjs` — exposes `kind: api` as an HTTP endpoint.
4. **Adapter** (spec in `docs/openbot-adapter-spec-v1.md`) — contract for other
   harnesses (`load`/`resolveTools`/`run`/`record`/`report`).
5. **Run log** (`bots/*.runs.jsonl`) — one JSON line per run.

## Execution modes
- `task` — 1 execution → result (agent).
- `chat` — multi-turn conversation (agent), in-memory `session`.
- `scheduled` — schedule planned by `schedule-openbot.mjs`; model execution is
  triggered by the harness runner (native scheduler).
- `api` — `serve-openbot.mjs` registers routes and responds; the model handler is
  the adapter's `run` hook (P2).

## Design decisions
- **Inside the harness**: the runner is a skill, not a server (NFR-1).
- **Portable manifest**: pure YAML/JSON, no code (NFR-2).
- **Reuses the harness**: model, loop and native tools (NFR-3).
- **Skill first**: markdown runner; a code plugin is an optional evolution.

## Extension points
- **Adapters**: implement `load/resolveTools/run/record/report` per harness.
- **Programmatic hook**: let scheduled/api invoke the model outside the agent
  (completes the non-interactive cycle).
- **Memory**: `none`/`session` today; evolve toward history/vector store.

## Advanced tools
- `run-openbot.mjs` — programmatic hook: builds the prompt and (with an API
  configured) calls the model; completes the non-interactive cycle.
- `memory-openbot.mjs` — persistent JSONL memory (keyword search).
- `orchestrate-openbot.mjs` — multi-bot pipeline (sequence of bots/tasks).
- `pack-openbot.mjs` — bundles a bot (manifest + inputs + README).
- `validate-all.mjs` — batch validation (used in CI).
- `plugins/openbot/` — Cordis plugin skeleton (not compiled).
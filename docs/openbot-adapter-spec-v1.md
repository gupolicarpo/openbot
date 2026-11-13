# OpenBot — Adapter Spec v1

Defines the interface a harness runner must implement to support OpenBot. Goal:
the **same manifest** runs on any conforming harness.

## Principles
- The adapter **reuses** the harness's agent loop, model and tools. It does not
  implement an agent.
- The manifest is the single source of truth; the adapter never changes it.
- A `task` bot receives inputs and returns an output artifact.

## Interface (contract)

| Operation | Logical signature | Responsibility |
|---|---|---|
| `load` | `load(path) -> Bot \| {errors[]}` | read + parse + validate against schema v1 |
| `resolveTools` | `resolveTools(tools, harness) -> allowed` | map `tools.harness` to native tools and attach `tools.mcp` |
| `run` | `run(bot, task, ctx) -> RunResult` | adopt persona/instructions, execute the task, return the result |
| `record` | `record(bot, run)` | append one JSONL line to `bots/<name>.runs.jsonl` |
| `report` | `report(run) -> summary` | summarize result and status to the user |

`RunResult` = `{bot, task, status: completed|failed, result, startedAt, finishedAt}`.

## Validation
Every adapter must reject invalid manifests with **field + reason** (rules in
`references/schema.md`). Reference validator:
`node tools/validate-openbot.mjs <manifest>`.

## Reference adapter: DSH
The DSH runner is the `openbot` skill (run mode): the harness agent interprets
the manifest and executes the task. It is the reference implementation, not a
dependency.

## Execution modes (declared, not implemented in the MVP)
- `task` — implemented (1 execution → result).
- `chat` — persistent multi-turn conversation (later stage).
- `scheduled` — recurring/scheduled execution (later stage).
- `api` — bot exposed as an endpoint for other apps (later stage).

The schema accepts these values in `tasks[].kind` / `execution.mode`; an MVP
runner emits a warning and runs the first `kind: task`, or reports the
limitation.

## Per-harness install (concrete)

The skill is portable (Agent Skills format). The same `SKILL.md` installs into:

| Harness | Directory | Install |
|---|---|---|
| DSH | `.agents/skills/openbot/` | `node tools/install-openbot.mjs dsh` |
| Claude Code | `.claude/skills/openbot/` | `node tools/install-openbot.mjs claude` |
| Codex | `.codex/skills/openbot/` | `node tools/install-openbot.mjs codex` |

Details and manual commands: `docs/openbot-harness-install.md`.
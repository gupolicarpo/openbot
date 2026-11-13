# openbot.yaml — schema & validation (v1.1)

Compact reference for the runner. A manifest is a YAML (or JSON) object.

## Fields

| Field | Type | Required |
|---|---|---|
| `name` | string (kebab-case) | yes |
| `version` | string | yes |
| `description` | string | no |
| `persona.role` | string | yes |
| `persona.tone` | string | no |
| `persona.constraints` | list<string> | no |
| `instructions` | list<string> (≥1) | yes |
| `tools.harness` | list<string> | no |
| `tools.mcp` | list<string> | no |
| `tasks` | list<object> (≥1) | yes |
| `tasks[].id` | string (unique) | yes |
| `tasks[].kind` | task\|chat\|scheduled\|api | yes |
| `tasks[].prompt` | string | yes |
| `tasks[].inputs` | object | no |
| `tasks[].output` | string | no (task/scheduled/api) |
| `tasks[].schedule` | string | no (required for scheduled) |
| `tasks[].route` | string | no (required for api) |
| `execution.mode` | task\|chat\|scheduled\|api | no (default `task`) |
| `execution.memory` | none\|session\|history | no (default `none`) |
| `capabilities` | explore\|plan\|general | no (shorthand for `tools.harness`) |

## Validation rules

Reject and report (field + reason); never guess:

1. `name` missing or not kebab-case → error.
2. `version` missing → error.
3. `persona.role` missing/empty → error.
4. `instructions` missing/empty → error.
5. `tasks` missing/empty → error.
6. duplicate `tasks[].id` → error.
7. `tasks[].kind` not in enum → error.
8. `kind: scheduled` without `tasks[].schedule` → error.
9. `kind: api` without `tasks[].route` → error.
10. `capabilities` outside `explore|plan|general` → error.
11. unknown name in `tools.harness` → warn (non-blocking).

## Modes
- `task` — 1 execution → result (implemented).
- `chat` — multi-turn conversation, in-memory `session` (implemented).
- `scheduled` — scheduled / on-demand (declared; `tools/schedule-openbot.mjs`).
- `api` — HTTP endpoint (declared; `tools/serve-openbot.mjs`).

## Run record (JSONL)

One line per run in `bots/<name>.runs.jsonl`:

```json
{"bot":"<name>","task":"<task.id>","status":"completed|failed","result":"<output path>","startedAt":"<ISO>","finishedAt":"<ISO>"}
```

## Memory

`execution.memory`: `none` (default) | `session` (in-memory chat) | `history`
(persisted in `bots/<name>.memory.jsonl` via `memory-openbot.mjs`).

## Capabilities (presets)

`capabilities` (optional) is a shorthand for `tools.harness`:

| Preset | Equivalent tools |
|---|---|
| `explore` | read, grep, glob, list (read-only) |
| `plan` | read, grep, glob (read-only, no shell/edits) |
| `general` | all harness tools |

`tools` takes precedence over `capabilities` when both are present.

## Compose (multi-bot)

A `compose.yaml` lists `steps` (child bots) and an `aggregate`. The runner in
`compose` mode dispatches each child as a **native harness subagent** and
aggregates the summaries. See SKILL.md (compose mode).

## Validator

Use the reference validator before running:

```bash
node tools/validate-openbot.mjs bots/<name>.yaml
```

Exit 0 = valid; exit 1 = invalid (field + reason).
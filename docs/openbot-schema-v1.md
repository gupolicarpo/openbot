# OpenBot — `openbot.yaml` schema v1.1

Canonical specification of the OpenBot bot manifest. A bot is declared in a YAML
file (JSON is also accepted) and executed by a runner inside an AI harness
(MVP: DSH).

## Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Bot name, kebab-case (`[a-z0-9]+(-[a-z0-9]+)*`), unique across bots. |
| `version` | string | yes | Manifest version (e.g. `"0.1"`). |
| `description` | string | no | One line, shown in lists/selection. |
| `icon` | string | no | Exactly one emoji that identifies the bot in lists, MCP results and the conversation (every reply as the bot starts with it). Default `🤖`. |
| `persona` | object | yes | The bot's personality / role. |
| `persona.role` | string | yes | Role the bot assumes (becomes the system prompt). |
| `persona.tone` | string | no | Tone of voice. |
| `persona.constraints` | list<string> | no | Permanent limits (what the bot never does). |
| `instructions` | list<string> | yes (≥1) | Standing guidelines. |
| `tools` | object | no | Allowed tools. |
| `tools.harness` | list<string> | no | Allowlist of native harness tools. |
| `tools.mcp` | list<string> | no | MCP servers to attach. |
| `tasks` | list<object> | yes (≥1) | What the bot does. |
| `tasks[].id` | string | yes | Unique task identifier (within the bot). |
| `tasks[].kind` | enum | yes | `task` \| `chat` \| `scheduled` \| `api`. |
| `tasks[].prompt` | string | yes | The task / behavior to run. |
| `tasks[].inputs` | object | no | Inputs (key → value). |
| `tasks[].output` | string | no | Output artifact path (task/scheduled/api). |
| `tasks[].acceptance` | string \| list | no* | Checkable criteria for a good result. Used by the verification phase and by every run to report ✅/❌ per criterion. *Validator warns when a `task`/`chat` task has none. |
| `tasks[].test` | object | no* | Sample run: `inputs` (task) or `message` (chat), plus `expect` (what a good answer must show). *Warned when missing on `task`/`chat`. |
| `requires` | list | no | Capabilities the bot needs from the environment (e.g. "read files", "YouTube transcript"). Checked against what is really available in the technical phase; shown to the subagent, which stops if one is missing. |
| `tasks[].schedule` | string | no | Cron or interval (`every 1h`); required for `scheduled`. |
| `tasks[].route` | string | no | HTTP path (e.g. `/echo`); required for `api`. |
| `execution` | object | no | Default execution mode. |
| `execution.mode` | enum | no | `task` (default) \| `chat` \| `scheduled` \| `api`. |
| `execution.memory` | enum | no | `none` (default) \| `session` \| `history`. |
| `execution.model` | enum | no | `inherit` (default) \| `haiku` \| `sonnet` \| `opus` — model of the exported Claude Code subagent. |
| `capabilities` | enum | no | `explore` \| `plan` \| `general` — shorthand for `tools.harness`. |

## Validation rules (FR-7)

The runner must **reject and report** (field + reason), never guess:

1. `name` missing or not kebab-case → **error**.
2. `version` missing → **error**.
3. `persona.role` missing/empty → **error**.
4. `instructions` missing or empty list → **error**.
5. `tasks` missing or empty list → **error**.
6. duplicate `tasks[].id` → **error**.
7. `tasks[].kind` outside the enum → **error**.
8. `kind: scheduled` without `tasks[].schedule` → **error**.
9. `kind: api` without `tasks[].route` → **error**.
10. `capabilities` outside `explore|plan|general` → **error**.
11. unknown name in `tools.harness` → **warning** (non-blocking).

## Bots as Claude Code subagents

`node tools/export-agents-openbot.mjs` compiles every valid bot into
`.claude/agents/openbot-<name>.md`: a subagent with the bot's identity,
constraints, instructions, tasks, acceptance criteria, its own tools
(`tools.harness` mapped to Claude Code tools; read-only if omitted) and model.
The manifest stays the source of truth — never edit the generated files; CI
runs `--check` to catch stale ones. In Claude Code, running a task delegates
to that subagent, so the bot works in a **clean context**, not influenced by
the conversation that called it. Talking to a bot (chat) happens in its own
session instead.

## Execution modes

- `task` — one execution → result (**implemented**).
- `chat` — multi-turn conversation, in-memory `session` (**implemented**).
- `scheduled` — scheduled / on-demand (**declared**; `tools/schedule-openbot.mjs`).
- `api` — HTTP endpoint (**declared**; `tools/serve-openbot.mjs`).

## Capability presets

| Preset | Tools |
|---|---|
| `explore` | read, grep, glob, list (read-only) |
| `plan` | read, grep, glob (read-only, no shell) |
| `general` | all harness tools |

`tools` takes precedence over `capabilities` when both are present.

## Compose (multi-bot)

A `compose.yaml` (`mode: compose`, `steps`, `aggregate`) runs several child bots
as **native harness subagents** and aggregates the results. Example:
`sample/compose.yaml`.

## Minimal example

```yaml
name: code-reviewer
version: "0.1"
description: "Reviews code with a focus on bugs and security"
icon: "🔍"
persona:
  role: "Senior code reviewer"
  tone: "direct, constructive"
  constraints:
    - "Never suggest changes outside the diff"
instructions:
  - "Prioritize bugs and security before style"
tools:
  harness: [read, grep, glob]
tasks:
  - id: review-diff
    kind: task
    prompt: "Review the code in inputs.code_path and return a report"
    inputs:
      code_path: "./sample/buggy.py"
    output: "review-report.md"
execution:
  mode: task
  memory: none
```

Reference runner: `.agents/skills/openbot/` (skill `openbot`).

> `execution.memory`: `none` (default) | `session` (chat) | `history` (persisted
> to `bots/<name>.memory.jsonl`, via `memory-openbot.mjs`).
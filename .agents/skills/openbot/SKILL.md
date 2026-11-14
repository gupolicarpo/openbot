---
name: openbot
description: Create, edit, list, and run bots defined in an openbot.yaml manifest (persona + instructions + tools + tasks) inside this harness. Supports task (one-shot), chat (multi-turn conversation), scheduled (schedule plan + on-demand), and api (HTTP endpoint scaffold) modes, plus a guided author/edit flow that generates or updates manifests without the user writing YAML.
whenToUse: Use when the user asks to run, chat with, list, create, or edit a bot ("roda o bot X", "conversa com o bot", "lista os bots", "cria/edita um bot"), names a bot, or points at a *.yaml manifest.
metadata:
  version: "4"
  kind: workflow
---

# OpenBot

You are the OpenBot runner and author. Modes:

- **run** — execute a bot's task (`kind: task`), one shot.
- **chat** — hold a multi-turn conversation as the bot (`kind: chat`).
- **list** — list the bots (the user's own and the examples).
- **author/edit** — create or edit a bot via a guided interview (no YAML).
- **scheduled / api** — declared modes; run the task on demand, with reference
  scripts `tools/schedule-openbot.mjs` and `tools/serve-openbot.mjs`.

Choose the mode from the user's ask:

- "run/roda bot X" or a `*.yaml` path → **run**.
- "conversa com o bot X" / "chat" → **chat**.
- "lista os bots" → **list**.
- "create/make/edit/define a bot" → **author/edit**.

**Where bots live.** The user's bots are personal and never go into a
repository: `~/.openbot/bots/<name>.yaml` (`~` = the user's home folder, e.g.
`C:\Users\<user>` on Windows; `OPENBOT_HOME` overrides `~/.openbot`), exported
to `~/.claude/agents/openbot-<name>.md`. The project's `bots/` folder holds only
the example bots shipped with OpenBot. New bots are always personal; never
commit a personal bot. The tools in `tools/` look in both places, personal first.

**No file access?** (e.g. the Claude app's Chat mode.) Use the `openbot` MCP
server instead of reading/writing files: `openbot_list` to list,
`openbot_get` to load a bot (it returns how to act as it), `openbot_validate`
to check, and `openbot_save` (with `approved: true`, only after the user
approved the summary) to create or update a bot. If that server is not
connected either, say so and stop: do not invent a bot.

---

## Mode: run (task)

A task runs in a **clean context**, so the bot is not influenced by this
conversation. Each bot is compiled into a Claude Code subagent
(`openbot-<name>.md` in `~/.claude/agents/` for personal bots, in the
project's `.claude/agents/` for examples; generated from the manifest).

1. **Locate the manifest.** The user gives a path (e.g.
   `bots/code-reviewer.yaml`) or a bot name (look in
   `~/.openbot/bots/<name>.yaml`, then in the project's `bots/<name>.yaml`).
   If you cannot
   resolve it, ask which bot or path.
2. **Read and validate.** Parse and validate against
   [references/schema.md](references/schema.md) (or
   `node tools/validate-openbot.mjs`). If invalid, report field + reason and
   stop (do not guess fields).
3. **Run it isolated (preferred).** If the harness has subagents (Claude Code:
   the Agent tool):
   - make sure the subagent is current: `node tools/export-agents-openbot.mjs
     <name>` (cheap; it only rewrites when the manifest changed);
   - delegate to subagent type `openbot-<name>`, passing **only** the task id
     and its inputs (never this conversation's context). If that type is not
     loaded yet (created in this session), spawn a general-purpose subagent
     with the body of the exported `openbot-<name>.md` (`~/.claude/agents/` for
     personal bots, the project's `.claude/agents/` for examples) + task id + inputs;
   - if the subagent could not write `task.output` (read-only bot), save the
     result it returned to that path yourself.
   In a **pipeline**, every step is its own subagent call; pass a step only the
   previous step's output file/result it needs.
4. **Fallback — become the bot** (harness without subagents). Adopt
   `persona.role` (+ `tone`, `constraints`), follow `instructions`, use only
   the tools in `tools.harness`/`tools.mcp` (read-only if omitted), and do
   `task.prompt` with `task.inputs`, writing `task.output` when present.
5. **Show who is speaking.** The bot's `icon` (one emoji; `🤖` if absent):
   every block of bot speech starts with `<icon> **<name>:**` (e.g.
   `🔍 **code-reviewer:** …`) — the subagent's report already starts with it;
   keep it when you relay. Runner messages (validation errors, your own report)
   have no prefix. Once per block, not per paragraph; after a tool call or a
   runner line the next bot block gets it again. Conversation only: never write
   it into `task.output` files or `runs.jsonl`.
6. **Check acceptance.** For each `acceptance` item, ✅/❌ with one line of
   evidence from the result. Do not claim a criterion you did not check.
7. **Record the run.** Append one JSON line to `<name>.runs.jsonl`
   next to the manifest
   (`ts`, `task`, `status`, `acceptance`: passed/total, `output`).
8. **Report.** What ran, where the result is, acceptance per criterion.

## Mode: chat

1. **Locate + validate** the manifest (a chat bot has at least one
   `kind: chat` task; its `prompt` is the bot's standing behavior).
2. **Become the bot**: same as run (persona + instructions + tools), including
   the `<icon> **<name>:**` prefix on every reply as the bot.
3. **Converse**: hold a multi-turn conversation in the user's language. Greet
   as the persona, stay in role, honor `persona.constraints`, and keep the
   session in memory. Persist across sessions only when `execution.memory` is
   `history`.
4. **Record** when the session ends: append a run line with
   `status:"completed"` and `result:"<chat session>"`.
5. **Report** briefly as the runner.

## Mode: list

List every bot (personal, then examples) with icon, name, version, description, and task kinds.
Prefer `node tools/list-openbot.mjs`; otherwise read the manifests directly.

## Mode: author/edit

**Hard rule — interview first, write last.** Never create or change a
bot manifest in the same turn as the request. Even when the request
already describes the bot in detail, you MUST first run the interview and get
the user's explicit approval of the summary. Use what the request already says
to *pre-fill recommended answers* — the user then confirms or changes them —
but never skip asking. When the harness has a structured question tool
(Claude Code: `AskUserQuestion`), use it for each batch; otherwise ask in
plain text and stop your turn to wait for the answer. Writing the file before
the summary is approved is a failure of this mode.

Then follow [references/authoring.md](references/authoring.md), which has
three phases: **1. Interview** (the user says *what*, including how to tell a
good result: `acceptance`); **2. Technical check** (you answer *how*, with
evidence: what the bot `requires`, what in this environment provides it,
gaps, the simplest tools, the most cost-effective model + effort, a `test` case, risks); then the summary and
"Posso criar?"; after the yes, write + validate + export the subagent, and
**3. Verification** (run the test in a clean context, judge it against the
acceptance criteria, fix and re-run up to 3 times). Finally open a dedicated
chat session with the new bot (desktop app: `start_session`, titled
`<icon> <name>`; elsewhere give the command to open it).

## Scheduled & api (declared)

- **scheduled** (`kind: scheduled` with `tasks[].schedule`): run the task on
  demand and report the schedule. For a plan or a one-shot trigger, use
  `node tools/schedule-openbot.mjs <bot> [--once]`.
- **api** (`kind: api` with `tasks[].route`): expose the bot over HTTP with
  `node tools/serve-openbot.mjs`. The reference server validates and returns
  the task spec; wiring the model call is the adapter's `run` hook
  (see `docs/openbot-adapter-spec-v1.md`).

## Mode: compose

A composer manifest (`compose.yaml`: `mode: compose`, `steps`, `aggregate`)
runs several child bots and aggregates their results. For each step:
1. **Spawn a native subagent** of this harness (DSH `subagent`/`spawn_teammate`,
   Claude Code subagents, Codex subagents) with the child bot's manifest + task
   + inputs, telling it to run via the `openbot` skill.
2. **Collect each subagent's result.**
3. **Aggregate** the results into one output per `aggregate`.

Do not reimplement subagents — reuse the harness's own mechanism.

## Capabilities

`capabilities` (`explore` | `plan` | `general`) is a shorthand for
`tools.harness`. When `tools` is absent: `explore` → read-only search/list;
`plan` → read-only, no shell/edits; `general` → full tools. `tools` wins over
`capabilities` when both are present.

## Rules

- Do not act outside the manifest: no undeclared tools, no out-of-scope work.
- Produce task output in the language the task specifies (default: the user's
  language).
- If a manifest is missing required fields, stop and report instead of assuming
  values.
- One run at a time; do not run other bots or tasks unless asked.
# Authoring — create / edit a bot (guided)

Use this in **author/edit** mode: turn a conversation into a valid, *tested*
`openbot.yaml` without the user writing YAML. Creating a bot has three
phases with three different owners:

| Phase | Question it answers | Who answers |
|---|---|---|
| 1. Interview | **What** should the bot do, and how do we know it is good? | the user |
| 2. Technical check | **How** will it work here, with what, and what is missing? | you, with evidence |
| 3. Verification | Does what was built **actually meet** what the user wanted? | a test run, judged against the acceptance criteria |

**Hard rule — interview first, write last.** Never create or change a
bot manifest in the same turn as the request. Even when the request
already describes the bot in detail, you MUST first run the interview and get
the user's explicit approval of the summary. Use what the request already says
to *pre-fill recommended answers* — the user then confirms or changes them —
but never skip asking. When the harness has a structured question tool
(Claude Code: `AskUserQuestion`), use it for each batch; otherwise ask in
plain text and stop your turn to wait for the answer. Writing the file before
the summary is approved is a failure of this mode.

## Phase 1 — Interview (what)

Ask in the user's language, in batches of 2–5, each question with a
recommended answer.

| # | Question (EN) | Field | Default / recommendation |
|---|---|---|---|
| 1 | What is the bot's name? | `name` | kebab-case, unique (check `node tools/list-openbot.mjs` or `openbot_list`) |
| 1b | Which emoji represents it? | `icon` | one that fits the role (exactly one emoji) |
| 2 | What is its role/personality? | `persona.role` | — |
| 3 | What is its tone of voice? | `persona.tone` | "direct, clear" |
| 4 | What must it never do? | `persona.constraints` | — |
| 5 | What standing instructions? | `instructions` | — |
| 6 | What is the main task? What goes in, what comes out? | `tasks[].prompt`, `inputs`, `output` | — |
| 7 | **How will you know the result is good?** | `tasks[].acceptance` | propose 2–4 checkable criteria |
| 8 | Do you also want to talk to it? | a `kind: chat` task | yes, if it is an assistant |

## Phase 2 — Technical check (how) — you answer, with evidence

Answer these yourself. **Evidence means something you can point at** (a tool,
skill or MCP server you can actually see in this session, a file that exists,
the validator's output) — not your own assurance. Keep it proportional: for a
simple text bot this is 2–3 lines; go deeper only when the bot needs
integrations, credentials, network or actions with side effects.

1. **Capabilities** — what does the bot need (read files, web, transcribe a
   video, send a message…)? → `requires`.
2. **Availability** — for each one, what in *this* environment provides it?
   Name it (e.g. "YouTube transcript → `youtube-transcriber` skill",
   "web → `WebFetch`"). Nothing provides it → it is a **gap**.
3. **Simplest setup** — the minimal `tools.harness` / `tools.mcp`
   (read-only unless it must write) and `execution.memory`.
4. **Model and effort** — you decide `execution.model` and
   `execution.effort` from the answers and the instructions you just drafted:
   the **cheapest pair you expect to meet the acceptance criteria**. Always
   set both explicitly (no `inherit`), so the bot's cost does not depend on
   whoever calls it.

   | Model | API price in/out per 1M tokens (Nov 2026) | Pick it when |
   |---|---|---|
   | `haiku` | $0.10 / $0.50 | well-defined text work: summarize, extract, classify, format, simple FAQ chat |
   | `sonnet` | $2 / $10 | judgment or several steps: code review, research with web, multi-step tool use, nuanced writing |
   | `opus` | $4 / $20 | hard reasoning, long agentic work, or a costly mistake (security, money, irreversible actions) |
   | `fable` | $8 / $40 | only if the user asks for it, or `opus` at `high` already failed the test |

   | Effort | Pick it when |
   |---|---|
   | `low` | short, direct answers; chat; high-volume tasks (`scheduled`, `api`) |
   | `medium` | the default: a few steps, some checking |
   | `high` | correctness matters more than speed (review, analysis, code) |
   | `xhigh` / `max` | only after a lower level failed the test |

   Push the choice down when the bot runs often (`scheduled`, `api`, a busy
   chat), and up when an error is expensive. Lower effort on a cheaper model
   comes first; a bigger model is the last lever. Give one line of reasons
   (e.g. "haiku + low: short summary of one file, runs daily").
5. **Test case** — one `test` per task/chat task: real sample inputs (an
   existing file, or a small one you will create under `sample/`) or, for a
   chat task, a sample `message`; plus what a good answer must show (`expect`).
6. **Risks** — does it write files, use the network, cost money, need
   credentials? Say so.
**Gaps:** resolve the ones that are purely technical yourself; bring back to
the user only decisions that are theirs (a paid API, an account, a scope
change), as specific questions. **Never invent an integration** that does not
exist here.

## Summary and approval

Show a compact summary (not raw YAML) with: what it does, acceptance criteria,
how it will work (tools, **model + effort with the one-line reason**), gaps
and how they were resolved, the test that will be run, and risks. Say the
user can change the model or effort before approving. Ask **"Posso criar?"**
(in the user's language). Stop and wait.

## Write, export, verify

After an explicit yes:

1. **Write + validate** — write `~/.openbot/bots/<name>.yaml` (UTF-8, no
   BOM): the user's bots are personal and **never** go into the repository,
   so do not write them to the project's `bots/` (that holds only the
   examples) and never commit them. Or call `openbot_save` with
   `approved: true`, which writes there. Run `node tools/validate-openbot.mjs
   ~/.openbot/bots/<name>.yaml` (or `openbot_validate`). Fix every error. Treat the
   `acceptance`/`test` warnings as errors for task and chat tasks.
2. **Export the subagent** — `node tools/export-agents-openbot.mjs <name>`
   (or `openbot_export`; `openbot_save` already does it). This creates
   `~/.claude/agents/openbot-<name>.md` (the user's own subagents, available
   in every project): the bot as a Claude Code subagent with
   its own clean context.
3. **Phase 3 — Verification** — run each `test`, in a **clean context**:
   - Claude Code: delegate with the Agent tool to `openbot-<name>`. A subagent
     file created in this session may only load in the next one; if that type
     is not available yet, spawn a general-purpose subagent and give it the
     body of `.claude/agents/openbot-<name>.md` plus the test inputs.
   - Judge the result yourself against each `acceptance` item and the test's
     `expect`, quoting the output as evidence (✅/❌ per criterion).
   - **Fail?** Diagnose. If the bot definition is wrong (unclear prompt,
     missing instruction, wrong tool), fix the manifest, re-export and re-run.
     If the instructions are right but the model could not do the work
     (shallow reasoning, missed steps), go up one level, effort first and
     then model, and say so in the report. If the user picked the model or
     effort themselves, ask before changing it.
     If the *requirement* was wrong or impossible, go back to the user. Stop
     after **3 attempts** and report honestly what still fails.
   - Without a way to run it (e.g. the Claude app's Chat mode): do a
     rehearsal in the conversation and label it clearly as a rehearsal, not a
     real run.
4. **Report** — path, subagent, test result per criterion, anything still open.
5. **Open the bot's own session.** Creating a bot includes a dedicated
   conversation with it — the user asked for the bot, so start it without
   asking again.
   - **Claude Code desktop app** (a `start_session` tool exists, e.g.
     `mcp__ccd_session__start_session`; load it with ToolSearch if it is only
     listed as deferred): start a session with `initiation: "user_asked"`,
     `context: "fresh"`, `use_worktree: false` (same project folder),
     `title: "<icon> <name>"`, `name: "<name>"`, prompt
     `Use the openbot skill in chat mode: you are the bot "<name>".
     Greet me in role and wait for my first message.`,
     and as background one line on what the bot does. Then link the session
     to the user (`[<icon> <name>](#<session id>)`).
   - **Any other harness** (no session tool): end by giving the exact command
     to open a chat with the bot, e.g. `claude "conversa com o bot <name>"`.
   - Skip this only if the user said they do not want a chat session.

## Flow (edit)

1. Read the current manifest (personal first, then the examples in `bots/`).
2. Summarize it to the user (1–2 lines).
3. Ask **only** what changes; redo the Phase 2 check only for what changed.
4. After approval: apply the delta, keep the rest, bump `version`,
   re-validate, re-export, re-run the tests (Phase 3) and report.

## Validation before finishing

- `name` kebab-case and unique; `icon` one emoji.
- `persona.role`, `instructions`, `tasks` present and non-empty.
- Every task/chat task has `acceptance` and `test`, and its test passed (or
  the report says plainly why not).
- `.claude/agents/openbot-<name>.md` exported and up to date.

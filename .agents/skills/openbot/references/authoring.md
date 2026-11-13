# Authoring — create / edit a bot (guided)

Use this in **author/edit** mode: turn a conversation into a valid
`openbot.yaml` without the user writing YAML. Interview in the user's language,
in batches of 2–5, prefer options with a recommendation, and record decisions
in a ledger.

**Hard rule — interview first, write last.** Never create or change a
`bots/*.yaml` file in the same turn as the request. Even when the request
already describes the bot in detail, you MUST first run the interview and get
the user's explicit approval of the summary. Use what the request already says
to *pre-fill recommended answers* — the user then confirms or changes them —
but never skip asking. When the harness has a structured question tool
(Claude Code: `AskUserQuestion`), use it for each batch; otherwise ask in
plain text and stop your turn to wait for the answer. Writing the file before
step 5 (summary approved) is a failure of this mode.

## Question → field map

(The questions below are examples; ask them in the user's language.)

| # | Question (EN) | Field | Default / recommendation |
|---|---|---|---|
| 1 | What is the bot's name? | `name` | kebab-case, unique |
| 1b | Which emoji represents it? | `icon` | suggest one that fits the role (exactly one emoji) |
| 2 | What is its role/personality? | `persona.role` | — |
| 3 | What is its tone of voice? | `persona.tone` | "direct, clear" |
| 4 | What must it never do? | `persona.constraints` | — |
| 5 | What standing instructions? | `instructions` | — |
| 6 | Which tools can it use? | `tools.harness` / `tools.mcp` | read-only (`read`, `grep`, `glob`) |
| 7 | What is the main task? | `tasks[0].prompt` | — |
| 8 | What inputs? | `tasks[0].inputs` | — |
| 9 | Where to save the output? | `tasks[0].output` | `<name>-report.md` |
| 10 | Execution mode? | `execution.mode` | `task` (MVP) |

## Flow (create)

0. **Restate** the idea in one line and say you will ask a few questions
   before creating anything (e.g. "Antes de criar, umas perguntas rápidas").
1. **Name + role + icon** (1–3 questions; propose a name and an emoji).
2. **Tone + constraints + instructions** (batch).
3. **Tools** — offer the read-only default; ask more only if needed.
4. **Task** — prompt, inputs, output.
5. **Draft & confirm** — show a compact summary (not raw YAML) and ask
   "Posso criar?" (in the user's language). Stop and wait; do not write yet.
6. **Write + validate** — only after an explicit yes, write `bots/<name>.yaml`, validate against
   `references/schema.md`, fix any error and report the path.
7. **Open the bot's own session.** Creating a bot includes a dedicated
   conversation with it — the user asked for the bot, so start it without
   asking again.
   - **Claude Code desktop app** (a `start_session` tool exists, e.g.
     `mcp__ccd_session__start_session`; load it with ToolSearch if it is only
     listed as deferred): start a session with `initiation: "user_asked"`,
     `context: "fresh"`, `use_worktree: false` (same project folder),
     `title: "<icon> <name>"`, `name: "<name>"`, prompt
     `Use the openbot skill in chat mode: you are the bot "<name>"
     (bots/<name>.yaml). Greet me in role and wait for my first message.`,
     and as background one line on what the bot does. Then link the session
     to the user (`[<icon> <name>](#<session id>)`).
   - **Any other harness** (no session tool): end by giving the exact command
     to open a chat with the bot, e.g. `claude "conversa com o bot <name>"`.
   - Skip this only if the user said they do not want a chat session.

## Flow (edit)

1. Read the current `bots/<name>.yaml`.
2. Summarize it to the user (1–2 lines).
3. Ask **only** what changes.
4. Apply the delta, keep the rest, bump `version`, re-validate and report.

## Validation before finishing

- `name` kebab-case and unique.
- `persona.role`, `instructions`, `tasks` present and non-empty.
- `tasks[].kind` = `task` (MVP).
- Write the file as UTF-8 (no BOM).
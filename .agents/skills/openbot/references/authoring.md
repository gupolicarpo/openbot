# Authoring — create / edit a bot (guided)

Use this in **author/edit** mode: turn a conversation into a valid
`openbot.yaml` without the user writing YAML. Interview in the user's language,
in batches of 2–5, prefer options with a recommendation, and record decisions
in a ledger.

## Question → field map

(The questions below are examples; ask them in the user's language.)

| # | Question (EN) | Field | Default / recommendation |
|---|---|---|---|
| 1 | What is the bot's name? | `name` | kebab-case, unique |
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

1. **Name + role** (1–2 questions).
2. **Tone + constraints + instructions** (batch).
3. **Tools** — offer the read-only default; ask more only if needed.
4. **Task** — prompt, inputs, output.
5. **Draft & confirm** — show a compact summary (not raw YAML) and confirm.
6. **Write + validate** — write `bots/<name>.yaml`, validate against
   `references/schema.md`, fix any error and report the path.

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
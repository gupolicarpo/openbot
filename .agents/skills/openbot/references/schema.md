# openbot.yaml — schema & validation (v1.1)

Compact reference for the runner. A manifest is a YAML (or JSON) object.

## Fields

| Campo | Tipo | Obrigatório |
|---|---|---|
| `name` | string (kebab-case) | sim |
| `version` | string | sim |
| `description` | string | não |
| `persona.role` | string | sim |
| `persona.tone` | string | não |
| `persona.constraints` | list<string> | não |
| `instructions` | list<string> (≥1) | sim |
| `tools.harness` | list<string> | não |
| `tools.mcp` | list<string> | não |
| `tasks` | list<object> (≥1) | sim |
| `tasks[].id` | string (único) | sim |
| `tasks[].kind` | task\|chat\|scheduled\|api | sim |
| `tasks[].prompt` | string | sim |
| `tasks[].inputs` | object | não |
| `tasks[].output` | string | não (task/scheduled/api) |
| `tasks[].schedule` | string | não (obrigatório p/ scheduled) |
| `tasks[].route` | string | não (obrigatório p/ api) |
| `execution.mode` | task\|chat\|scheduled\|api | não (default `task`) |
| `execution.memory` | none\|session | não (default `none`; `session` p/ chat) |

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
10. unknown name in `tools.harness` → warn (non-blocking).

## Modos
- `task` — 1 execução → resultado (implementado).
- `chat` — conversa multi-turno (implementado; memória `session` em memória).
- `scheduled` — execução agendada/sob demanda (declarado; `tools/schedule-openbot.mjs`).
- `api` — endpoint HTTP (declarado; `tools/serve-openbot.mjs`).

## Run record (JSONL)

Uma linha por run em `bots/<name>.runs.jsonl`:

```json
{"bot":"<name>","task":"<task.id>","status":"completed|failed","result":"<output path>","startedAt":"<ISO>","finishedAt":"<ISO>"}
```

## Validator

Use o validador de referência antes de rodar:

```bash
node tools/validate-openbot.mjs bots/<nome>.yaml
```

Exit 0 = válido; exit 1 = inválido (campo + motivo).
> execution.memory: 
one (default) | session (chat em memória) | history (persistido em ots/<name>.memory.jsonl via memory-openbot.mjs).

## Capabilities (presets)

`capabilities` (opcional) é um atalho para `tools.harness`:

| Preset | Ferramentas equivalentes |
|---|---|
| `explore` | read, grep, glob, list (só leitura) |
| `plan` | read, grep, glob (só leitura, sem shell/edição) |
| `general` | todas as ferramentas do harness |

Se `tools` estiver presente, ele prevalece sobre `capabilities`.

## Compose (multi-bot)

Um `compose.yaml` lista `steps` (bots-filhos) e um `aggregate`. O runner no modo
`compose` despacha cada filho como **subagente nativo do harness** e agrega os
resumos. Veja o SKILL.md (modo compose).
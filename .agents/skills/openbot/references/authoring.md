# Authoring — create / edit a bot (guided)

Use this in **author/edit** mode: turn a conversation into a valid
`openbot.yaml` without the user writing YAML. Interview in the user's language,
in batches of 2–5, prefer options with a recommendation, and record decisions
in a ledger.

## Question → field map

| # | Pergunta (PT) | Campo | Default / recomendação |
|---|---|---|---|
| 1 | Qual o nome do bot? | `name` | kebab-case, único |
| 2 | Qual o papel/personalidade dele? | `persona.role` | — |
| 3 | Qual o tom de voz? | `persona.tone` | "direto, claro" |
| 4 | O que ele nunca deve fazer? | `persona.constraints` | — |
| 5 | Quais instruções permanentes? | `instructions` | — |
| 6 | Quais ferramentas ele pode usar? | `tools.harness` / `tools.mcp` | read-only (`read`, `grep`, `glob`) |
| 7 | Qual a tarefa principal? | `tasks[0].prompt` | — |
| 8 | Quais entradas? | `tasks[0].inputs` | — |
| 9 | Onde salvar a saída? | `tasks[0].output` | `<name>-report.md` |
| 10 | Modo de execução? | `execution.mode` | `task` (MVP) |

## Flow (create)

1. **Name + role** (1–2 perguntas).
2. **Tone + constraints + instructions** (batch).
3. **Tools** — oferecer o default read-only; perguntar mais só se precisar.
4. **Task** — prompt, inputs, output.
5. **Draft & confirm** — mostrar um resumo compacto (não o YAML cru) e confirmar.
6. **Write + validate** — escrever `bots/<name>.yaml`, validar contra
   `references/schema.md`, corrigir qualquer erro e reportar o caminho.

## Flow (edit)

1. Ler o `bots/<name>.yaml` atual.
2. Resumir ao usuário (1–2 linhas).
3. Perguntar **apenas** o que muda.
4. Aplicar o delta, manter o resto, subir `version`, revalidar e reportar.

## Validação antes de finalizar

- `name` kebab-case e único.
- `persona.role`, `instructions`, `tasks` presentes e não vazios.
- `tasks[].kind` = `task` (MVP).
- Escrever o arquivo em UTF-8 (sem BOM).
# OpenBot — Adapter Spec v1

Define a interface que um runner de harness precisa implementar para suportar o
OpenBot. Objetivo: o **mesmo manifesto** roda em qualquer harness conforme.

## Princípios
- O adaptador **reusa** o loop de agente, o modelo e as ferramentas do harness.
  Ele não implementa agente nenhum.
- O manifesto é a única fonte de verdade; o adaptador nunca o altera.
- Um bot em modo `task` recebe entradas e devolve um artefato de saída.

## Interface (contrato)

| Operação | Assinatura lógica | Responsabilidade |
|---|---|---|
| `load` | `load(path) -> Bot \| {errors[]}` | ler + parsear + validar contra o schema v1 |
| `resolveTools` | `resolveTools(tools, harness) -> allowed` | mapear `tools.harness` para ferramentas nativas e anexar `tools.mcp` |
| `run` | `run(bot, task, ctx) -> RunResult` | adotar persona/instruções, executar a tarefa, devolver resultado |
| `record` | `record(bot, run)` | anexar uma linha JSONL a `bots/<name>.runs.jsonl` |
| `report` | `report(run) -> summary` | resumir resultado e status ao usuário |

`RunResult` = `{bot, task, status: completed|failed, result, startedAt, finishedAt}`.

## Validação
Todo adaptador deve rejeitar manifestos inválidos com **campo + motivo**
(regras em `references/schema.md`). Validador de referência:
`node tools/validate-openbot.mjs <manifest>`.

## Adaptador de referência: DSH
O runner do DSH é a skill `openbot` (modo `run`): o agente do harness
interpreta o manifesto e executa a tarefa. É a implementação de referência,
não uma dependência.

## Modos de execução (declarados, não implementados no MVP)
- `task` — implementado (1 execução → resultado).
- `chat` — conversa multi-turno persistente (etapa posterior).
- `scheduled` — execução recorrente/agendada (etapa posterior).
- `api` — bot exposto como endpoint para outros apps (etapa posterior).

O schema aceita esses valores em `tasks[].kind` / `execution.mode`; um runner
MVP emite aviso e executa o primeiro `kind: task`, ou reporta a limitação.
## Instalação por harness (concreto)

A skill é portável (formato Agent Skills). O mesmo `SKILL.md` instala em:

| Harness | Diretório | Instalar |
|---|---|---|
| DSH | `.agents/skills/openbot/` | `node tools/install-openbot.mjs dsh` |
| Claude Code | `.claude/skills/openbot/` | `node tools/install-openbot.mjs claude` |
| Codex | `.codex/skills/openbot/` | `node tools/install-openbot.mjs codex` |

Detalhes e comandos manuais: `docs/openbot-harness-install.md`.
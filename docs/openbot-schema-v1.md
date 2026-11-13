# OpenBot — Schema `openbot.yaml` v1.1

Specificação canônica do manifesto de bot do OpenBot. Um bot é declarado num
arquivo YAML (JSON também é aceito) e executado por um runner dentro de um
harness de IA (MVP: DSH).

## Campos

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `name` | string | sim | Nome do bot, kebab-case (`[a-z0-9]+(-[a-z0-9]+)*`), único entre os bots. |
| `version` | string | sim | Versão do manifesto (ex.: `"0.1"`). |
| `description` | string | não | Uma linha, exibida em listas/seleção. |
| `persona` | object | sim | Personalidade / papel do bot. |
| `persona.role` | string | sim | Papel que o bot assume (vira o system prompt da execução). |
| `persona.tone` | string | não | Tom de voz. |
| `persona.constraints` | list<string> | não | Limites permanentes (o que o bot nunca faz). |
| `instructions` | list<string> | sim (≥1) | Diretrizes permanentes do bot. |
| `tools` | object | não | Ferramentas permitidas. |
| `tools.harness` | list<string> | não | Allowlist de ferramentas nativas do harness. |
| `tools.mcp` | list<string> | não | Servidores MCP a anexar. |
| `tasks` | list<object> | sim (≥1) | O que o bot faz. |
| `tasks[].id` | string | sim | Identificador único da tarefa (dentro do bot). |
| `tasks[].kind` | enum | sim | `task` \| `chat` \| `scheduled` \| `api`. |
| `tasks[].prompt` | string | sim | A tarefa / comportamento a executar. |
| `tasks[].inputs` | object | não | Entradas (chave → valor). |
| `tasks[].output` | string | não | Caminho do artefato de saída (task/scheduled/api). |
| `tasks[].schedule` | string | não | Cron ou intervalo (`every 1h`); obrigatório p/ `scheduled`. |
| `tasks[].route` | string | não | Caminho HTTP (ex.: `/echo`); obrigatório p/ `api`. |
| `execution` | object | não | Modo de execução padrão. |
| `execution.mode` | enum | não | `task` (default) \| `chat` \| `scheduled` \| `api`. |
| `execution.memory` | enum | não | `none` (default) \| `session` (para `chat`). |

## Regras de validação (FR-7)

O runner deve **rejeitar e reportar** (campo + motivo), nunca adivinhar valores:

1. `name` ausente ou fora do padrão kebab-case → **erro**.
2. `version` ausente → **erro**.
3. `persona.role` ausente ou vazio → **erro**.
4. `instructions` ausente ou lista vazia → **erro**.
5. `tasks` ausente ou lista vazia → **erro**.
6. `tasks[].id` duplicado → **erro**.
7. `tasks[].kind` fora do enum → **erro**.
8. `kind: scheduled` sem `tasks[].schedule` → **erro**.
9. `kind: api` sem `tasks[].route` → **erro**.
10. `tools.harness` com nome de ferramenta desconhecido → **aviso** (não bloqueia).

## Modos de execução

- `task` — 1 execução → resultado (**implementado**).
- `chat` — conversa multi-turno, memória `session` em memória (**implementado**).
- `scheduled` — agendado/sob demanda (**declarado**; `tools/schedule-openbot.mjs`).
- `api` — endpoint HTTP (**declarado**; `tools/serve-openbot.mjs`).

## Exemplo mínimo

```yaml
name: code-reviewer
version: "0.1"
description: "Revisa código com foco em bugs e segurança"
persona:
  role: "Senior code reviewer"
  tone: "direto, construtivo"
  constraints:
    - "Não sugerir mudanças fora do diff"
instructions:
  - "Priorizar bugs e segurança antes de estilo"
tools:
  harness: [read, grep, glob]
tasks:
  - id: review-diff
    kind: task
    prompt: "Revisar o código em inputs.code_path e devolver um relatório"
    inputs:
      code_path: "./sample/buggy.py"
    output: "review-report.md"
execution:
  mode: task
  memory: none
```

Runner de referência: `.agents/skills/openbot/` (skill `openbot`).
> execution.memory: 
one (default) | session (chat) | history (persistido, ots/<name>.memory.jsonl).

## Capabilities (presets)

`capabilities` (opcional): `explore` | `plan` | `general` — atalho para
`tools.harness`.

| Preset | Ferramentas |
|---|---|
| `explore` | read, grep, glob, list (só leitura) |
| `plan` | read, grep, glob (só leitura, sem shell) |
| `general` | todas as ferramentas do harness |

`tools` prevalece sobre `capabilities` quando ambos estão presentes.

## Compose (multi-bot)

Um `compose.yaml` (`mode: compose`, `steps`, `aggregate`) roda vários bots-filhos
como **subagentes nativos do harness** e agrega os resultados. Exemplo:
`sample/compose.yaml`.
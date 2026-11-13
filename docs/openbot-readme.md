# OpenBot — README

Camada leve para criar, editar, listar e rodar **bots** dentro de harnesses de
IA existentes (MVP: DeepSeek Harness). Um bot é um manifesto `openbot.yaml` com
personalidade, instruções, ferramentas e tarefas.

## Requisitos
- Um harness com a skill `openbot` instalada (`.agents/skills/openbot`).
- Node.js ≥ 20 para os scripts em `tools/`.

## Comandos (via harness ou scripts)
| Ação | Como |
|---|---|
| Rodar (task) | "roda o bot code-reviewer" — skill executa e registra o run |
| Conversar (chat) | "conversa com o bot support-assistant" — multi-turno |
| Criar bot (sem YAML) | "cria um bot" — entrevista guiada |
| Editar bot | "edita o bot X" — aplica só as mudanças pedidas |
| Listar bots | "lista os bots" ou `node tools/list-openbot.mjs` |
| Validar manifesto | `node tools/validate-openbot.mjs bots/<nome>.yaml` |
| Planejar agendamento | `node tools/schedule-openbot.mjs <bot> [--once]` |
| Servir API | `node tools/serve-openbot.mjs [porta] [bots-dir]` |

## Layout
- `bots/*.yaml` — manifestos; `bots/*.runs.jsonl` — histórico de runs.
- `sample/` — entradas e saídas de exemplo.
- `tools/` — `validate-openbot.mjs`, `list-openbot.mjs`,
  `schedule-openbot.mjs`, `serve-openbot.mjs`.
- `.agents/skills/openbot/` — a skill (run/chat/list/author-edit).
- `docs/` — schema, adapter spec, arquitetura, backlog.

## Estender
- **Novo bot:** crie `bots/<nome>.yaml` (schema em `docs/openbot-schema-v1.md`).
- **Novo harness:** implemente a interface de `docs/openbot-adapter-spec-v1.md`.
- **Próximos itens:** ver `docs/openbot-backlog.md`.
## Ferramentas avançadas (`tools/`)
| Script | Função |
|---|---|
| `run-openbot.mjs` | Hook programático: monta o prompt e (se configurado) chama o modelo |
| `memory-openbot.mjs` | Memória persistente (`add` / `search` / `show`) |
| `orchestrate-openbot.mjs` | Orquestração multi-bot (pipeline) |
| `pack-openbot.mjs` | Empacota um bot para distribuição |
| `validate-all.mjs` | Valida todos os bots (CI) |
> `run-openbot.mjs` delega ao agente do harness (`dsh headless` / `claude -p` /
> `codex exec`) via skill `openbot`; `--via openai` é o fallback para LLM direto.
## MCP server
`node tools/mcp-openbot.mjs` expõe os scripts como tools MCP
(`openbot_list/validate/run/memory/orchestrate/pack`) para DSH, Claude Code e
Codex. Config em `docs/openbot-mcp.md`.
# OpenBot

Uma camada leve para criar, editar, listar e rodar **bots** — com personalidade,
instruções, ferramentas e tarefas — **dentro de harnesses de IA existentes**
(DeepSeek Harness, Claude Code e Codex). Cada bot é um manifesto portátil
`openbot.yaml`; uma runner-skill `openbot` o executa no loop nativo do harness,
sem reimplementar agente.

## Funcionalidades
- **Modos**: task (1 execução), chat (multi-turno), scheduled, api, compose (multi-bot), list.
- **Persona + instruções + ferramentas + memória** por bot (manifesto declarativo).
- **Capability presets** (`explore` / `plan` / `general`).
- **Portável**: skill (Agent Skills) + instalador + MCP server para DSH, Claude Code e Codex.
- **Tooling**: validador, listagem, hook programático (delega ao harness), memória, orquestração, pack, CI.

## Começo rápido
```bash
node tools/validate-all.mjs bots        # valida os bots
node tools/list-openbot.mjs             # lista os bots
node tools/install-openbot.mjs claude codex   # instala a skill nos outros harnesses
node tools/mcp-openbot.mjs              # MCP server (tools nativas)
```

## Layout
- `bots/*.yaml` — manifestos dos bots.
- `tools/` — scripts (validate, list, run, memory, orchestrate, schedule, serve, pack, install, mcp).
- `.agents/skills/openbot/` — a skill (runner + author/edit).
- `docs/` — documentação completa.

## Documentação
[README](docs/openbot-readme.md) · [schema](docs/openbot-schema-v1.md) ·
[adapter spec](docs/openbot-adapter-spec-v1.md) · [MCP](docs/openbot-mcp.md) ·
[instalação por harness](docs/openbot-harness-install.md) ·
[arquitetura](docs/openbot-architecture.md) · [backlog](docs/openbot-backlog.md) ·
[smoke test](docs/smoke-test.md)
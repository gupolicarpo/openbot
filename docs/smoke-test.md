# OpenBot — Smoke test (cross-harness)

Verificação mínima de portabilidade em cada harness. Rode após instalar os CLIs.

## Pré-requisitos
- Node.js ≥ 20.
- `claude` e/ou `codex` no PATH.
- `js-yaml` disponível (local ou via `OPENBOT_JSYAML`).

## 1. DSH (referência — já validado)
- [x] skill carregada (catálogo mostra `openbot`).
- [x] bots validados (`node tools/validate-all.mjs bots`).
- [x] MCP server (`node tools/mcp-openbot.mjs`).

## 2. Claude Code
1. Instalar a skill:
   `node tools/install-openbot.mjs claude`
2. Listar bots:
   `claude -p "use the openbot skill to list the bots"`
3. Rodar um bot:
   `claude -p "use the openbot skill to run the bot code-reviewer on sample/change.patch"`
4. MCP:
   `claude mcp add openbot -- node tools/mcp-openbot.mjs`

## 3. Codex
1. `node tools/install-openbot.mjs codex`
2. `codex exec "use the openbot skill to list the bots"`
3. `codex exec "use the openbot skill to run the bot code-reviewer on sample/change.patch"`
4. `codex mcp add openbot -- node tools/mcp-openbot.mjs`

## 4. Registro de resultados
| Harness | Skill (list) | Skill (run) | MCP (openbot_list) |
|---|---|---|---|
| DSH | ✅ | ✅ | ✅ |
| Claude Code | ⬜ | ⬜ | ⬜ |
| Codex | ⬜ | ⬜ | ⬜ |
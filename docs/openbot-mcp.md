# OpenBot — MCP server

O OpenBot também é um **MCP server** (sem dependências): expõe os scripts como
tools MCP, usáveis por qualquer agente com cliente MCP — DSH, Claude Code,
Codex/ChatGPT.

## Tools
- `openbot_list` · `openbot_validate` · `openbot_run` · `openbot_memory` ·
  `openbot_orchestrate` · `openbot_pack`

## Conectar

Comando do servidor: `node tools/mcp-openbot.mjs`

### Claude Code
```bash
claude mcp add openbot -- node tools/mcp-openbot.mjs
```
ou `.mcp.json` no projeto:
```json
{ "mcpServers": { "openbot": { "command": "node", "args": ["tools/mcp-openbot.mjs"] } } }
```

### Codex (OpenAI)
```bash
codex mcp add openbot -- node tools/mcp-openbot.mjs
```
ou `~/.codex/config.toml`:
```toml
[mcp_servers.openbot]
command = "node"
args = ["tools/mcp-openbot.mjs"]
```

### DSH
Adicione o servidor à configuração MCP do seu perfil (como o servidor `rea`),
apontando para `node tools/mcp-openbot.mjs`.

## Testar manualmente
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node tools/mcp-openbot.mjs
```
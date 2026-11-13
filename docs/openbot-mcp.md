# OpenBot — MCP server

OpenBot is also a **dependency-free MCP server**: it exposes the scripts as MCP
tools, usable by any agent with an MCP client — DSH, Claude Code, Codex/ChatGPT.

## Tools
- `openbot_list` · `openbot_validate` · `openbot_run` · `openbot_memory` ·
  `openbot_orchestrate` · `openbot_pack`

## Connect

Server command: `node tools/mcp-openbot.mjs`

### Claude Code
```bash
claude mcp add openbot -- node tools/mcp-openbot.mjs
```
or `.mcp.json` in the project:
```json
{ "mcpServers": { "openbot": { "command": "node", "args": ["tools/mcp-openbot.mjs"] } } }
```

### Codex (OpenAI)
```bash
codex mcp add openbot -- node tools/mcp-openbot.mjs
```
or `~/.codex/config.toml`:
```toml
[mcp_servers.openbot]
command = "node"
args = ["tools/mcp-openbot.mjs"]
```

### DSH
Add the server to your profile's MCP configuration (like the `rea` server),
pointing at `node tools/mcp-openbot.mjs`.

## Test manually
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node tools/mcp-openbot.mjs
```
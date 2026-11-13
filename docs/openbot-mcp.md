# OpenBot — MCP server

OpenBot is also a **dependency-free MCP server**: it exposes the scripts as MCP
tools, usable by any agent with an MCP client — DSH, Claude Code, Codex/ChatGPT.

## Tools
- `openbot_list` · `openbot_validate` · `openbot_run` · `openbot_memory` ·
  `openbot_orchestrate` · `openbot_pack`

## Connect

Server command: `node tools/mcp-openbot.mjs` — no npm install needed (`js-yaml` is vendored in
`tools/vendor/`). The server pins its working directory to the repo root, so repo-relative
arguments such as `sample/pipeline.yaml` work no matter where the client was started.
When registering it globally, always use the **absolute** path to the script: a relative
path only works if the client happens to start in the repo root.

### Claude Code
The repo ships a project-scoped `.mcp.json`, so opening Claude Code in the repo root is
enough: approve the `openbot` server when asked (or later via `/mcp`), and its tools appear as
`mcp__openbot__openbot_list`, `mcp__openbot__openbot_validate`, …

To use it from any folder, register it with an absolute path instead:
```bash
claude mcp add --scope user openbot -- node <absolute-path-to-repo>/tools/mcp-openbot.mjs
```

### Codex (OpenAI)
```bash
codex mcp add openbot -- node <absolute-path-to-repo>/tools/mcp-openbot.mjs
```
or `~/.codex/config.toml`:
```toml
[mcp_servers.openbot]
command = "node"
args = ["<absolute-path-to-repo>/tools/mcp-openbot.mjs"]
```

### DSH
Add the server to your profile's MCP configuration (like the `rea` server),
pointing at `node tools/mcp-openbot.mjs`.

## Test manually
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node tools/mcp-openbot.mjs
```
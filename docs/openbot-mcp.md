# OpenBot — MCP server

OpenBot is also a **dependency-free MCP server**: it exposes the scripts as MCP
tools, usable by any agent with an MCP client — DSH, Claude Code, Codex/ChatGPT.

## Tools
- `openbot_list` · `openbot_validate` · `openbot_run` · `openbot_memory` ·
  `openbot_orchestrate` · `openbot_pack`
- `openbot_export` — compile bots into Claude Code subagents (`.claude/agents/openbot-<name>.md`).
- `openbot_get` — a bot's icon, how to act as it, and its full manifest.
- `openbot_save` — validate + write `bots/<name>.yaml`; refuses unless `approved: true`
  (set only after the user approved the summary) and refuses to overwrite unless
  `overwrite: true`. This is what lets clients **without file access** (the Claude app's
  Chat mode) create and edit bots. It also re-exports the bot's subagent.

## Prompts (slash commands)
- `new-bot` (optional `idea`) — guided interview to create a bot; in Claude Code: `/mcp__openbot__new-bot`.
- `edit-bot` (`bot`) — guided edit of an existing bot: `/mcp__openbot__edit-bot`.
- `chat-with-bot` (`bot`) — Claude takes on the bot's persona for the conversation:
  `/mcp__openbot__chat-with-bot`.

The prompts are self-contained (they don't need the skill). `new-bot`/`edit-bot` only *start*
the interview: nothing is written until the user approves the summary. After creating a bot,
`new-bot` opens a dedicated session with it in the Claude Code desktop app, or tells the user
to start a new chat with `chat-with-bot` elsewhere.

### Claude app (Chat mode)
Chat mode reads neither `.mcp.json` nor `~/.claude/skills`:
1. Add the server to `claude_desktop_config.json` (Windows: `%APPDATA%\Claude\`), then
   restart the app:
   ```json
   { "mcpServers": { "openbot": { "command": "node", "args": ["<absolute-path-to-repo>/tools/mcp-openbot.mjs"] } } }
   ```
   The prompts appear in the chat's "+" menu under `openbot`.
2. Optional — the skill: `node tools/zip-skill-openbot.mjs` builds `dist/openbot-skill.zip`;
   upload it in Settings → Capabilities → Skills.

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
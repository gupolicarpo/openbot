# OpenBot — Smoke test (cross-harness)

Minimal portability check per harness. Run after installing the CLIs.

## Prerequisites
- Node.js ≥ 20.
- `claude` and/or `codex` on PATH.
- Nothing else: `js-yaml` is vendored in `tools/vendor/` (no install needed; a local `js-yaml` or `OPENBOT_JSYAML` overrides it).

## 1. DSH (reference — already validated)
- [x] skill loaded (catalog shows `openbot`).
- [x] bots validated (`node tools/validate-all.mjs bots`).
- [x] MCP server (`node tools/mcp-openbot.mjs`).

## 2. Claude Code
1. Install the skill:
   `node tools/install-openbot.mjs claude`
2. List bots:
   `claude -p "use the openbot skill to list the bots"`
3. Run a bot:
   `claude -p "use the openbot skill to run the bot code-reviewer on sample/change.patch"`
4. MCP:
   open Claude Code in the repo root (the project `.mcp.json` registers `openbot`; approve it once), or
   `claude mcp add openbot -- node <absolute-path-to-repo>/tools/mcp-openbot.mjs`

## 3. Codex
1. `node tools/install-openbot.mjs codex`
2. `codex exec "use the openbot skill to list the bots"`
3. `codex exec "use the openbot skill to run the bot code-reviewer on sample/change.patch"`
4. `codex mcp add openbot -- node <absolute-path-to-repo>/tools/mcp-openbot.mjs`

## 4. Results log
| Harness | Skill (list) | Skill (run) | MCP (openbot_list) |
|---|---|---|---|
| DSH | ✅ | ✅ | ✅ |
| Claude Code | ⬜ | ⬜ | ⬜ |
| Codex | ⬜ | ⬜ | ⬜ |
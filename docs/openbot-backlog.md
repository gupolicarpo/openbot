# OpenBot — Backlog

## ✅ Done (P1 + P2 + P3)
- Modes chat / scheduled / api / listing (P1).
- Skill portability (DSH, Claude Code, Codex) + installer (P2).
- Programmatic execution hook — `run-openbot.mjs` delegates to the harness agent (P2).
- MCP server — cross-harness native tools (`mcp-openbot.mjs`) (P2).
- Persistent memory, multi-bot orchestration, distribution/pack, CI (P3).
- **Capability presets** (`explore`/`plan`/`general`) — inspired by Grok.
- **Compose** (multi-bot via native harness subagents) — inspired by Grok.

## Remaining (future)
- Native code plugin: Cordis skeleton in `plugins/openbot/` (not compiled/tested).
- Vector store (embeddings) instead of keyword search in memory.
- Hosted marketplace (search/download of bots) beyond local `pack`.
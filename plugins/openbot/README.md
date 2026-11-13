# OpenBot — DSH (Cordis) plugin (esqueleto)

Registra a skill `openbot` no runtime do DSH como skill de runtime (em código,
em vez de lida do diretório `.agents/skills/`).

## Status
- **Esqueleto de código**: não compilado nem testado contra o plugin runtime do DSH.
- Para uso real: compilar com o toolchain do DSH, empacotar (`SKILL.md` +
  `references/` junto) e carregar como plugin.

## Estrutura
- `package.json`
- `src/index.js` — `apply(ctx)` registra a skill em `ctx.skills`.
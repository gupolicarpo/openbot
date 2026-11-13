# OpenBot — DSH (Cordis) plugin (skeleton)

Registers the `openbot` skill in the DSH runtime as a runtime skill (in code,
instead of being read from the `.agents/skills/` directory).

## Status
- **Code skeleton**: not compiled or tested against the DSH plugin runtime.
- For real use: build with the DSH toolchain, bundle (`SKILL.md` +
  `references/` together) and load as a plugin.

## Structure
- `package.json`
- `src/index.js` — `apply(ctx)` registers the skill in `ctx.skills`.
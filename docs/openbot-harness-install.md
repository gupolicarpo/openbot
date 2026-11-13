# OpenBot — Instalação por harness

A skill `openbot` é **portável**: usa o formato Agent Skills (`SKILL.md`), lido
por DSH, Claude Code e Codex. Os mesmos arquivos funcionam nos três harnesses.

## Instalar (automatizado)

```bash
node tools/install-openbot.mjs <harness...> [--project]
```

| Harness | Diretório de skills |
|---|---|
| `dsh` | `.agents/skills/openbot/` |
| `claude` | `.claude/skills/openbot/` |
| `codex` | `.codex/skills/openbot/` |
| `all` (default) | os três |

- `--project`: instala em `<cwd>/.<harness>/skills` (raiz do projeto).
- sem `--project` (default): instala em `~/.<harness>/skills` (usuário).

```bash
node tools/install-openbot.mjs claude codex     # usuário
node tools/install-openbot.mjs all --project    # projeto
```

## Instalar (manual)

```bash
# Claude Code
cp -r .agents/skills/openbot ~/.claude/skills/openbot      # usuário
cp -r .agents/skills/openbot .claude/skills/openbot        # projeto

# Codex
cp -r .agents/skills/openbot ~/.codex/skills/openbot       # usuário
cp -r .agents/skills/openbot .codex/skills/openbot         # projeto

# DSH (já é uma skill de projeto neste workspace)
```

## Como funciona em cada harness

- A skill instrui o agente a carregar `openbot.yaml` e *virar* o bot, usando o
  loop nativo do harness — nenhum código específico por harness.
- Os scripts em `tools/` (`validate`, `list`, `schedule`, `serve`) são
  opcionais, chamados via shell, e precisam de `js-yaml` (local ou via
  `OPENBOT_JSYAML` apontando para o `index.js`).
- Os manifestos vivem em `bots/*.yaml` no workspace (ou onde o usuário apontar).

## Requisitos
- Node.js ≥ 20 para os scripts `tools/*.mjs`.
- `js-yaml` disponível (no `node_modules` local, no DSH instalado, ou via
  `OPENBOT_JSYAML`).
## Executar programaticamente (delegação)

Para automação (scheduled/api/CI), use o hook que **delega ao agente do
harness** (em vez de chamar o modelo cru):

```bash
node tools/run-openbot.mjs <bot> --via dsh|claude|codex [--task <id>] [--input k=v ...] [--dry-run]
```

- `--via dsh`    → `dsh headless "<instrução>"`
- `--via claude` → `claude -p "<instrução>"`
- `--via codex`  → `codex exec "<instrução>"`
- `--via openai` → fallback: chama a API do modelo diretamente
- `auto` (default) → detecta o primeiro CLI instalado
- `--dry-run` → mostra a instrução e o comando exato

A skill `openbot` precisa estar instalada no harness alvo (ver acima). Assim o
agente carrega a skill, vira o bot e usa as ferramentas — o caminho A completo.
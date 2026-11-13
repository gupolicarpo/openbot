# OpenBot — Notas de arquitetura

## Visão
O OpenBot **não implementa um agente**. Ele configura e dirige o agente que o
harness já tem, usando um manifesto portátil como única fonte de verdade.

```
openbot.yaml ──► runner (skill `openbot`) ──► loop nativo do harness
   (bot)           valida + vira o bot          modelo + ferramentas
```

## Componentes
1. **Manifesto** (`bots/*.yaml`, schema v1.1) — persona, instructions, tools,
   tasks, execution.
2. **Runner** (`.agents/skills/openbot/`) — modos:
   - `run` (task) · `chat` · `list` · `author/edit`.
3. **Scripts** (`tools/`):
   - `validate-openbot.mjs` — schema v1.1, erros campo+motivo, exit 0/1.
   - `list-openbot.mjs` — lista bots.
   - `schedule-openbot.mjs` — planeja/gera plano de `kind: scheduled`.
   - `serve-openbot.mjs` — expõe `kind: api` como endpoint HTTP.
4. **Adaptador** (spec em `docs/openbot-adapter-spec-v1.md`) — contrato para
   outros harnesses (`load`/`resolveTools`/`run`/`record`/`report`).
5. **Run log** (`bots/*.runs.jsonl`) — uma linha JSON por execução.

## Modos de execução
- `task` — 1 execução → resultado (agente).
- `chat` — conversa multi-turno (agente), memória `session` em memória.
- `scheduled` — agendamento planejado por `schedule-openbot.mjs`; a execução do
  modelo é disparada pelo runner do harness (agendador nativo).
- `api` — `serve-openbot.mjs` registra as rotas e responde; o handler de modelo
  é o hook `run` do adaptador (P2).

## Decisões de design
- **Dentro do harness**: o runner é uma skill, não um servidor (NFR-1).
- **Manifesto portátil**: YAML/JSON puro, sem código (NFR-2).
- **Reusa o harness**: modelo, loop e ferramentas nativas (NFR-3).
- **Skill primeiro**: runner em markdown; plugin de código é evolução opcional.

## Pontos de extensão
- **Adaptadores**: implementar `load/resolveTools/run/record/report` por harness.
- **Hook programático**: permitir que scheduled/api chamem o modelo fora do
  agente (completa o ciclo não-interativo).
- **Memória**: `none`/`session` hoje; evoluir para histórico/vector store.
## Ferramentas avançadas
- `run-openbot.mjs` — hook programático: monta o prompt e (com API configurada)
  chama o modelo; completa o ciclo não-interativo de scheduled/api.
- `memory-openbot.mjs` — memória persistente JSONL (busca por keyword).
- `orchestrate-openbot.mjs` — pipeline multi-bot (sequência de bots/tarefas).
- `pack-openbot.mjs` — empacota um bot (manifesto + entradas + README).
- `validate-all.mjs` — validação em lote (usada no CI).
- `plugins/openbot/` — esqueleto de plugin Cordis (não compilado).
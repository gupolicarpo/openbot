# Production Plan — OpenBot

> Decomposes the Execution Brief into stages with verifiable "exit gates".
> Feed one stage at a time to an execution model.

## Principles
1. **Walking skeleton first:** Stage 1 is the thinnest end-to-end slice.
2. **Vertical slices after:** each stage delivers a complete, usable capability,
   not a horizontal layer.
3. **A gate after every stage:** nothing advances until the exit gate passes.
4. **Defer ≠ drop:** items out of the MVP go to the backlog with a note.
5. **Demo every stage:** something runnable always remains.

## Stages

### Stage 0 — Foundations
- **Goal:** `openbot.yaml` schema v1 + examples.
- **Deliverable:** schema spec (fields, types, required) + 1 example manifest
  (code reviewer) + validation rules.
- **Exit gate:** the schema is documented and the example manifest validates against it.

### Stage 1 — Walking skeleton
- **Goal:** DSH runner (skill `openbot`) that runs **one** bot in task mode.
- **Deliverable:** skill `openbot` (SKILL.md + references) that reads an
  `openbot.yaml` and executes the bot's task in the DSH native loop, returning
  the result.
- **Exit gate:** running `openbot` with the reviewer manifest produces a review
  report end-to-end (FR-2, FR-3, FR-7).

### Stage 2 — Create/edit flow (the "simple UI")
- **Goal:** guided (conversational) flow that generates and updates manifests.
- **Deliverable:** *author/edit* mode in the `openbot` skill that interviews the
  user and writes/updates `openbot.yaml` — no YAML by hand.
- **Exit gate:** a non-technical user creates a valid bot via the guided flow
  (FR-4, FR-5, NFR-4).

### Stage 3 — Hardening
- **Goal:** robust validation + clear errors + adapter spec + declare the other
  execution modes.
- **Deliverable:** manifest validator with actionable messages (field + reason);
  adapter interface document; enumerate chat/scheduled/api in the schema
  (declared, not implemented).
- **Exit gate:** an invalid manifest reports an actionable error; adapter spec written.

### Stage 4 — Validation
- **Goal:** validate against the real success criteria.
- **Deliverable:** the reviewer runs on a real diff (local file); a non-technical
  user creates **and** edits a bot end-to-end; run history visible (FR-6).
- **Exit gate:** success criteria 1 and 2 of the brief demonstrated.

### Stage 5 — Handoff
- **Goal:** leave the project in a state to grow.
- **Deliverable:** README (run/extend), architecture notes, backlog.
- **Exit gate:** a new person (or model) runs the project and finds the next task
  from the notes alone.

## Backlog (deferred, not dropped)
- **Chat** mode · **scheduled** job · **api** endpoint.
- Other harnesses (Claude Code, OpenAI, etc.) via adapter.
- **Multi-bot** orchestration.
- Bot **distribution/marketplace**.
- **Persistent memory** of conversation.
- Code **plugin** (Cordis) for native tooling, evolving from the skill.

## Kickoff prompt (ready to paste)

> You are building **OpenBot, MVP**. Attached: the full Execution Brief.
> Start at **Stage 1** of the Production Plan: a DSH skill `openbot` that reads
> an `openbot.yaml` manifest and executes **one** bot in task mode, returning the
> result.
> Deliver: the schema v1, the `openbot` skill (SKILL.md + references), and the
> example **"code reviewer"** bot running end-to-end.
> Do not implement chat/scheduled/api, other harnesses, or a separate web app.
> Report against Stage 1's exit gate.
>
> *(Adaptation: for Claude, wrap the brief sections in tags
> `<requirements>`/`<scope>`/`<task>`; for o-series/DeepSeek-R1, keep the system
> prompt minimal and do not request step-by-step reasoning.)*

## How to hand off to an execution model
- Feed **one stage at a time**, always attaching the brief (or the Scope/FR/NFR
  sections + the current stage).
- Start the stage with: "Build Stage N. Current state: ... . Exactly what Stage
  N must produce and its exit gate: ...".
- Ask the model to **report against the exit gate**, not just "done".
- If context is tight, attach only Scope + FRs + NFRs + the current stage.
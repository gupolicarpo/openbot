# Plano de Produção — OpenBot

> Decompõe o Execution Brief em estágios com "gates" (exit gate) verificáveis.
> Alimente um estágio por vez a um modelo de execução.

## Princípios
1. **Walking skeleton primeiro:** o Stage 1 é a fatia mínima ponta a ponta.
2. **Fatias verticais depois:** cada estágio entrega uma capacidade completa e
   usável, não uma camada horizontal.
3. **Gate após cada estágio:** nada avança sem o exit gate passar.
4. **Adiar ≠ descartar:** itens fora do MVP vão para o backlog com nota.
5. **Demo a cada estágio:** sempre sobra algo executável.

## Stages

### Stage 0 — Foundations
- **Objetivo:** schema `openbot.yaml` v1 + exemplos.
- **Entrega:** especificação do schema (campos, tipos, obrigatoriedade) + 1
  manifesto exemplo (revisor de código) + regras de validação.
- **Exit gate:** o schema está documentado e o manifesto exemplo valida contra ele.

### Stage 1 — Walking skeleton
- **Objetivo:** runner DSH (skill `openbot`) que roda **um** bot em modo tarefa.
- **Entrega:** skill `openbot` (SKILL.md + references) que lê um `openbot.yaml`
  e executa a tarefa do bot no loop nativo do DSH, devolvendo o resultado.
- **Exit gate:** rodar `openbot` com o manifesto do revisor produz um relatório
  de revisão ponta a ponta (FR-2, FR-3, FR-7).

### Stage 2 — Create/edit flow (a "UI simples")
- **Objetivo:** fluxo guiado (conversacional) que gera e atualiza manifestos.
- **Entrega:** modo *author/edit* na skill `openbot` que entrevista o usuário e
  escreve/atualiza o `openbot.yaml` — sem o usuário tocar em YAML.
- **Exit gate:** um não técnico cria um bot válido pelo fluxo guiado (FR-4,
  FR-5, NFR-4).

### Stage 3 — Hardening
- **Objetivo:** validação robusta + erros claros + spec do adaptador + declaração
  dos demais modos de execução.
- **Entrega:** validador de manifesto com mensagens acionáveis (campo + motivo);
  documento da interface de adaptador para outros harnesses; enumeração dos
  modos chat/agendado/API no schema (declarados, não implementados).
- **Exit gate:** manifesto inválido reporta erro acionável; adapter spec escrito.

### Stage 4 — Validation
- **Objetivo:** validar contra os critérios de sucesso reais.
- **Entrega:** o revisor roda num diff real (arquivo local); um não técnico
  cria **e** edita um bot ponta a ponta; histórico de runs visível (FR-6).
- **Exit gate:** critérios de sucesso 1 e 2 do brief demonstrados.

### Stage 5 — Handoff
- **Objetivo:** deixar o projeto em estado de crescer.
- **Entrega:** README (rodar/estender), notas de arquitetura, backlog.
- **Exit gate:** uma pessoa (ou modelo) nova roda o projeto e acha a próxima
  tarefa só pelas notas.

## Backlog (adiado, não descartado)
- Modo **chat** contínuo · **job agendado** · **endpoint/API**.
- Outros harnesses (Claude Code, OpenAI, etc.) via adaptador.
- Orquestração **multi-bot**.
- **Distribuição/marketplace** de bots.
- **Memória persistente** de conversa.
- Plugin de **código** (Cordis) para tooling nativo, evoluindo da skill.

## Prompt de kickoff (pronto para colar)

> Você vai construir o **OpenBot, MVP**. Anexo: Execution Brief completo.
> Comece pelo **Stage 1** do Plano de Produção: uma skill DSH `openbot` que lê
> um manifesto `openbot.yaml` e executa **um** bot em modo tarefa, devolvendo o
> resultado.
> Entregue: o schema v1 do manifesto, a skill `openbot` (SKILL.md + references)
> e o bot de exemplo **"revisor de código"** rodando de ponta a ponta.
> Não implemente chat/agendado/API, outros harnesses, nem um app web separado.
> Reporte contra o exit gate do Stage 1.
>
> *(Adaptação: para Claude, envolva as seções do brief em tags
> `<requirements>`/`<scope>`/`<task>`; para modelos o-series/DeepSeek-R1,
> mantenha o system prompt mínimo e não peça raciocínio passo a passo.)*

## Como entregar a um modelo de execução
- Alimente **um estágio por vez**, sempre anexando o brief (ou as seções
  Scope/FR/NFR + o estágio atual).
- Inicie o estágio com: "Construa o Stage N. Estado atual: ... . Exatamente o
  que o Stage N deve produzir e seu exit gate: ...".
- Peça ao modelo para **reportar contra o exit gate**, não apenas "pronto".
- Se o contexto apertar, anexe só Scope + FRs + NFRs + o estágio atual.
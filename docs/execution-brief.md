# Execution Brief — OpenBot

> Gerado pela skill `prototype-anything`. Prosa em PT-BR; termos técnicos padronizados.
> Documento de especificação: qualquer modelo de execução deve conseguir começar o Stage 1 sem re-perguntar "o que é o OpenBot".

## Resumo

OpenBot é uma camada leve que roda **dentro** de harnesses de IA já existentes
(começando pelo DeepSeek Harness — DSH) para criar e administrar **bots**: cada
bot é um manifesto portátil `openbot.yaml` com **personalidade, instruções,
ferramentas e tarefas**. Um runner fino por harness lê o manifesto e executa o
bot no loop nativo do harness, sem reimplementar agente nenhum.

**MVP:** runner no DSH (skill `openbot`) + fluxo guiado de criação/edição (a
"UI simples") + bot de exemplo *revisor de código*, validado ponta a ponta,
começando por um **agente de tarefa** (1 execução → resultado).

## 1. Meta
- name: OpenBot
- version: 0.1
- domain: web-app (componente data-ai / orquestração de agentes)
- execution model: model-neutral (DSH primeiro; interface de adaptador definida para os demais)

## 2. Visão & objetivo
- **Uma linha:** criar e administrar bots (personalidade + instruções +
  ferramentas + tarefas) como manifestos portáteis que rodam dentro de
  harnesses de IA já existentes.
- **Critérios de sucesso:**
  1. Um dev escreve `openbot.yaml` (revisor de código) e o roda no DSH,
     recebendo um relatório de revisão.
  2. Um não técnico cria um bot simples pelo fluxo guiado, **sem** editar YAML.
  3. O schema é independente de harness (a interface de adaptador é
     especificada mesmo que só o DSH esteja implementado no MVP).
- **Por que agora:** eliminar o retrabalho de redefinir
  personalidade/instruções/ferramentas a cada uso e reusar harnesses maduros em
  vez de construir outro runtime.

## 3. Usuários & personas
- **Primário — autor técnico:** desenvolvedor/operador que define bots via
  manifesto (persona, instruções, ferramentas, tarefas).
- **Secundário — usuário não técnico:** roda, monitora e edita bots por um
  fluxo guiado (conversacional), sem escrever YAML.
- **Não é usuário (ainda):** quem orquestra muitos bots em conjunto ou distribui
  bots num marketplace.

## 4. Escopo
- **In scope (MVP):** schema do manifesto v1; runner no DSH (skill `openbot`) em
  modo tarefa; fluxo guiado de criação/edição; 1 bot exemplo (revisor de
  código); validação de manifesto; especificação da interface de adaptador.
- **Out of scope (MVP):** modos chat/agendado/API implementados; harnesses além
  do DSH; orquestração multi-bot; marketplace/distribuição; memória persistente
  de conversa; app web servido separadamente.

## 5. Requisitos funcionais
- **FR-1** — Como autor técnico, defino um bot num `openbot.yaml` (nome,
  persona, instruções, ferramentas, tarefas).
  - Dado um manifesto válido, o runner o carrega sem pedir dados extras.
- **FR-2** — Como autor, rodo um bot em modo tarefa e recebo um resultado.
  - Dada uma tarefa, o runner a executa e devolve um artefato/relatório.
- **FR-3** — Como autor, declaro as ferramentas do bot (ferramentas nativas do
  harness e/ou servidores MCP) e o runner as conecta.
  - Dado um manifesto com `tools`, o bot só usa as ferramentas declaradas.
- **FR-4** — Como não técnico, crio um bot por um fluxo guiado que gera o
  manifesto sem eu escrever YAML.
  - Dado o fluxo concluído, existe um `openbot.yaml` válido.
- **FR-5** — Como não técnico, edito um bot existente pelo mesmo fluxo.
  - Dada uma edição, ela é refletida no manifesto e validada.
- **FR-6** — Como qualquer usuário, vejo o histórico/resultado das execuções.
  - Dado um run, ele registra status, resultado e timestamps.
- **FR-7** — O runner valida o manifesto antes de rodar.
  - Dado um manifesto inválido, o runner reporta erro acionável (campo + motivo).

## 6. Requisitos não funcionais
- **NFR-1** — Roda dentro do DSH, sem servidor/processo adicional.
- **NFR-2** — Manifesto é YAML/JSON puro e portável (nenhum código obrigatório).
- **NFR-3** — Reusa o modelo e o roteamento de ferramentas do harness (não reimplementa).
- **NFR-4** — O fluxo guiado fala a língua do usuário.

## 7. UX & direção de design
- **Visual:** a "UI" é a própria interface conversacional do harness + um fluxo
  guiado de perguntas (form-like).
- **Fluxos principais:** listar bots → criar/editar (fluxo guiado) → rodar bot →
  ver resultado.
- **Tom:** direto e técnico no manifesto; acolhedor no fluxo guiado.

## 8. Dados & modelo de domínio
- **Entidades:** `Bot` {name, version, description, persona, instructions[],
  tools[], tasks[], execution} · `Task` {id, kind, prompt, inputs, output} ·
  `Run` {bot, task, status, result, startedAt, finishedAt}.
- **Relações:** Bot *tem* várias Tasks; Bot *tem* vários Runs.
- **Storage:** manifestos em `bots/*.yaml` no workspace; runs em log JSONL local
  por bot (ex.: `bots/<name>.runs.jsonl`).

## 9. Restrições técnicas & stack
- Manifesto **YAML** (JSON aceito).
- Runner DSH = **skill `openbot`** (SKILL.md + references, como o REA).
- Sem backend próprio; reusa o harness.

## 10. Riscos & mitigações
- **"Dentro do harness" + "UI simples" conflito** → UI = fluxo guiado na
  interface do harness (não um app web separado).
- **Schema evolui com os modos** → versionar (v1) + validar.
- **Runner-skill depende de comportamento não determinístico do agente** →
  validar manifesto + instruções precisas; evoluir para plugin de código se preciso.
- **Portabilidade real exige adaptadores** → especificar a interface de
  adaptador agora, implementar só DSH.

## 11. Suposições
- Runner MVP = **skill** (markdown); um plugin Cordis de código é evolução
  opcional para tooling nativo.
- Um bot roda num harness por vez (sem orquestração entre harnesses no MVP).
- Ferramentas = subconjunto das nativas do harness + MCPs declarados.
- Manifesto em YAML (JSON também aceito).

## 12. Perguntas em aberto
- Nenhuma bloqueante para o MVP. (Itens de etapa futura — chat/agendado/API,
  outros harnesses, orquestração, distribuição, memória — estão no backlog.)

## 13. Definição de pronto
FR-1..FR-7 e NFR-1..NFR-4 passam seus critérios; o revisor de código roda de
ponta a ponta no DSH e produz relatório; um não técnico cria um bot pelo fluxo
guiado.

---

## Anexo A — Schema `openbot.yaml` v1 (rascunho)

```yaml
# openbot.yaml — schema v1 (draft)
name: code-reviewer            # required, kebab-case
version: "0.1"                 # required
description: "Revisa diffs com foco em bugs e segurança"  # opcional (listas)
persona:                       # required — personalidade / system prompt
  role: "Senior code reviewer"
  tone: "directo, construtivo, sem enrolação"
  constraints:
    - "Nunca sugerir mudanças fora do diff"
instructions:                  # required — diretrizes permanentes
  - "Revisar corretude, segurança e legibilidade"
  - "Reportar bloqueios primeiro, depois sugestões"
tools:                         # opcional — ferramentas que o bot pode usar
  harness:                     # allowlist de ferramentas nativas do harness
    - read
    - grep
    - glob
  mcp:                         # servidores MCP a anexar
    - github
tasks:                         # required — o que o bot faz
  - id: review-diff
    kind: task                 # task | chat | scheduled | api (MVP: task)
    prompt: "Revisar o diff preparado e devolver relatório priorizado"
    inputs:
      diff_path: "./diff.patch"
    output: "review-report.md"
execution:
  mode: task                   # MVP: task
  memory: none                 # MVP: none
```

## Decision ledger (final)

| # | Decisão | Resposta |
|---|---------|----------|
| 1 | Forma | Dentro dos harnesses (manifesto + runner) |
| 2 | Usuário | Técnicos (autoria) + não técnicos (rodar/monitorar/editar) |
| 3 | Harness | Adaptador plugável, DSH primeiro |
| 4 | Execução | Todas as formas; esqueleto = tarefa |
| 5 | Ação central | Criar bot e rodá-lo |
| 6 | Artefato | `openbot.yaml` + runner por harness |
| 7 | Administrar (não técnico) | Rodar + monitorar + editar |
| 8 | Primeiro esqueleto | Agente de tarefa |
| 9 | MVP inclui UI simples | Sim |
| 10 | Primeiro bot | Revisor de código |
| 11 | UI simples | Fluxo guiado dentro do harness |
| 12 | Histórico de runs | Log JSONL local por bot |
| 13 | Revisor x GitHub | Não no MVP; recebe diff/path local |
| 14 | Onde vivem os bots | Pasta `bots/` no workspace |

## Notas de execução por modelo

- **Model-neutral (padrão):** usar a estrutura Markdown acima como está.
- **Claude:** envolver as seções do brief em tags (`<requirements>`, `<scope>`,
  `<task>`) e colocar o comando em `<task>`.
- **o-series / DeepSeek-R1:** manter o system prompt mínimo; não pedir
  raciocínio passo a passo.
- **Modelos abertos (Llama/Qwen):** alimentar um estágio por vez.
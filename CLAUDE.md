# CLOSER — Master Prompt para Claude Code
## Protótipo interno, single-tenant | 4 semanas | 3h/dia

---

## COMO USAR ESTE DOCUMENTO

Cola este ficheiro inteiro como `CLAUDE.md` na raiz de um repositório novo. Abre a primeira sessão do Claude Code com a frase:

> "Lê o `CLAUDE.md` e diz-me o teu plano para a Sessão 1. Não escrevas código ainda."

Em cada sessão nova, o Claude Code carrega este documento como contexto persistente. Não o resumas, não cortes secções. A densidade é intencional.

No fim de cada sessão, peço-te para acrescentar uma entrada à secção 14 (Decisões acumuladas) com o que ficou decidido nesse dia. Isso garante que decisões não se perdem entre sessões.

---

## 1. QUEM ÉS NESTAS SESSÕES

És o meu par de programação no projecto **Closer**. Vamos trabalhar juntos durante 4 semanas, em sessões de cerca de 3 horas por dia. Eu sou o Miguel, agente imobiliário em Lisboa (Elevancy Real Estate, AMI Softlats 16462), e tu és o dev sénior que eu não contratei.

Regras de colaboração não-negociáveis:

**Plano antes de código.** Quando eu pedir uma feature, primeiro mostras um plano em bullet points, esperas aprovação, só depois escreves código. Saltar para código sem plano é interrupção imediata.

**Pergunta quando não sabes.** Instruções ambíguas levam pergunta, não suposição silenciosa. Suposições erradas custam-me horas a desfazer.

**Honestidade técnica.** Se algo que peço é má ideia, dizes. Se há trade-off, explicas os dois lados. Não és um yes-man.

**Sem scope creep.** Se te apetecer adicionar "só mais isto rapidamente", a resposta é não. Validamos antes de expandir.

**Português europeu nas mensagens de UI, logs visíveis ao utilizador, e prompts de IA. Inglês no código (variáveis, comentários, commits).** Mistura intencional, não acidente.

**Commits pequenos e frequentes.** Nunca PRs monstros de 30 ficheiros. Um commit = uma decisão lógica.

---

## 2. CONTEXTO DO PROJECTO

**Closer** é um SaaS B2B vertical para agentes imobiliários portugueses. A versão que vamos construir nestas 4 semanas é um **protótipo interno single-tenant** que eu corro na minha operação (Elevancy) para validar a tese antes de cobrar a outros agentes.

O que isto significa, explicitamente:

- **Single-tenant.** Só eu uso. Sem multi-tenancy, sem RLS complexo, sem credenciais por tenant, sem OAuth per-user. Quando passar para multi-tenant é refactor consciente no Mês 2 ou 3, depois de validar a tese.
- **Funcional, não polido.** UI feia é aceitável. Bugs em edge cases é aceitável. **Lead a ficar sem resposta é não-aceitável.**
- **Dogfooding desde o Dia 7.** Eu uso isto na Elevancy a sério. Se eu não uso, não serve para vender depois.

O que faz: capta lead da Meta Lead Ads, qualifica em <60s no WhatsApp via Claude, marca visita no meu Google Calendar.

**Lead Engine apenas.** Sem documentos, sem clonagem de voz, sem geração de campanhas. Esses módulos vêm em meses futuros, não agora.

---

## 3. STACK DEFINITIVO

Não negociamos. Já está decidido.

| Camada | Escolha | Razão |
|---|---|---|
| Linguagem | TypeScript strict mode | Type safety, refactor seguro |
| Backend | Node.js 20 LTS + Fastify | Performance, ecossistema maduro |
| DB + Auth | Supabase (Free tier para já) | Postgres real, auth incluído |
| WhatsApp | Twilio Business API | Aprovação mais rápida que Meta directo |
| AI | Claude Sonnet 4.5 + Haiku 4.5 | Qualidade na qualificação, custo na classificação |
| Calendário | Google Calendar API | Universal |
| Queues | BullMQ + Upstash Redis | Per-namespace nativo, free tier OK |
| Logging | pino | Structured JSON, performance |
| Errors | Sentry | Alertas em tempo real |
| Hosting | Railway | Container persistente, deploy simples |
| Repo | GitHub privado | Standard |
| Secrets | Railway env vars | Nunca em `.env` commited |
| CI/CD | GitHub Actions | Standard |
| Validação | Zod | Schemas em todas as fronteiras externas |

**Porque não Vercel:** serverless mata-me em queues longas e webhooks com retries.
**Porque não Prisma:** Supabase JS client + types gerados via `supabase gen types` é mais alinhado e não cria abstracção que possa contornar regras do Postgres acidentalmente.
**Porque não n8n para já:** o protótipo é simples, n8n adiciona overhead sem ganho. Adicionamos quando houver integrações externas que mudem com frequência.

---

## 4. PRINCÍPIOS DE QUALIDADE DESDE O DIA 1

- **TypeScript strict.** Sem `any`, sem `// @ts-ignore` sem comentário a explicar porquê.
- **Lint a falhar = build falha.** ESLint + Prettier configurados antes da primeira feature.
- **Pino structured logs.** Nunca `console.log`. JSON sempre, com `level`, `msg`, `context`.
- **Sentry em todos os ambientes.** Mesmo development, com sample rate baixo.
- **Commits convencionais.** `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`. Pequenos e frequentes.
- **Validação de input com Zod.** Toda a rota que recebe payload externa valida com Zod schema.
- **Erros nunca silenciosos.** Throw ou log com `level: 'error'`. Catch vazio é bug.
- **Idempotência em todos os webhooks.** Meta retransmite, Twilio retransmite, GCal retransmite. Repetir um lead é bug.
- **Secrets nunca em código.** Nem para "testes rápidos". Sempre `process.env`, validado por Zod no arranque.

---

## 5. SCOPE FUNCIONAL — exaustivo

Tudo o que está aqui é obrigatório. Tudo o que não está aqui está fora.

### 5.1 Ingestion de leads
- Endpoint público webhook Meta Lead Ads
- Verificação de signature (X-Hub-Signature-256) obrigatória
- Persistência em Supabase com idempotência por `meta_lead_id`
- Falha de validação → 401 + log Sentry, nunca silencioso

### 5.2 Auto-resposta sub-60s
- Trigger imediato após ingestion: enfileirar job em BullMQ
- Worker consome, deteta língua (PT default, EN/FR fallback), envia primeira mensagem WhatsApp
- Templates Twilio aprovados pré-registados
- Métrica obrigatória: tempo entre ingestion e primeira mensagem enviada (target p95 <60s)

### 5.3 Qualificação multi-turn
- Conversa orquestrada por Claude Sonnet 4.5
- 4–7 perguntas adaptativas: timing, pré-aprovação de crédito, orçamento, motivação, financiamento, zona, tipologia
- Output estruturado via tool use (JSON schema enforced):

```json
{
  "score": "Hot | Warm | Cold | Time-waster",
  "timing_months": "number | null",
  "budget_eur": { "min": "number", "max": "number" },
  "financing_status": "approved | in_process | needed | cash | unknown",
  "zones": ["string"],
  "property_type": ["string"],
  "motivation": "string",
  "language_detected": "pt | en | fr",
  "summary": "string"
}
```

- Persistir em `lead_qualifications` com payload completo
- Limite duro: 7 mensagens minhas antes de classificar à força como Time-waster

### 5.4 Scheduling de visita
- Quando score = Hot ou Warm + lead pediu visita: propor 3 slots dos próximos 5 dias úteis
- OAuth Google Calendar (single-tenant: a minha conta, refresh token guardado encriptado)
- Slots respeitam buffer de 30min entre visitas e horário de trabalho configurável
- Confirmação por WhatsApp → cria evento + invite por email ao lead
- Reminder automático 24h antes via WhatsApp template

### 5.5 Manual override
- Botão no dashboard "Tomar conversa" para qualquer lead
- Quando activo: worker pausa respostas automáticas neste lead
- Voltar a "auto" é explícito (botão "Devolver ao Closer")

### 5.6 Dashboard mínimo
- Para Sessão 1 a 6: usar Supabase Studio directamente para ver dados
- Para Sessão 7 em diante: dashboard simples (Base44 ou Next.js minimal, decidimos na altura)
- Lista leads, conversa por lead, override, métricas básicas

---

## 6. FORA DE SCOPE — não construir

Lista exaustiva. Se te ocorrer adicionar algo abaixo, a resposta é não:

- Multi-tenancy, RLS, credenciais por tenant — Mês 2/3
- Document Engine (CMI, caderneta, certidão permanente) — Mês 2
- Voice Engine (clonagem de voz) — Mês 3
- Gerador de campanhas Meta — Mês 3
- Stripe billing — manual nos primeiros pilotos
- Self-service onboarding — onboarding 1:1 manual
- Marketing site público
- App nativa mobile
- Sync com CRMs PT (eGO, X-IMO, HCPro) — Mês 4-6
- Multi-língua de UI além de PT — Mês 4
- Notificações push
- Integrações Idealista / Imovirtual / Casafari — Mês 6+
- Visual generation (Higgsfield, Kling, Nano Banana)
- White-label / brokerage tier — Mês 12

---

## 7. ESTRUTURA DO REPOSITÓRIO

```
closer/
├── CLAUDE.md
├── README.md
├── .gitignore
├── .nvmrc
├── .github/workflows/
│   ├── ci.yml
│   └── deploy.yml
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── webhooks/
│   │   │   │   │   ├── meta-lead-ads.ts
│   │   │   │   │   ├── twilio-incoming.ts
│   │   │   │   │   └── twilio-status.ts
│   │   │   │   ├── leads/
│   │   │   │   ├── visits/
│   │   │   │   └── health.ts
│   │   │   ├── lib/
│   │   │   │   ├── supabase.ts
│   │   │   │   ├── claude.ts
│   │   │   │   ├── twilio.ts
│   │   │   │   ├── google-calendar.ts
│   │   │   │   ├── encryption.ts
│   │   │   │   ├── logger.ts
│   │   │   │   └── env.ts
│   │   │   ├── middleware/
│   │   │   │   ├── verify-meta-signature.ts
│   │   │   │   └── verify-twilio-signature.ts
│   │   │   └── server.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── workers/
│       ├── src/
│       │   ├── queues/
│       │   │   ├── lead-ingestion.ts
│       │   │   ├── lead-qualification.ts
│       │   │   ├── visit-scheduling.ts
│       │   │   └── reminders.ts
│       │   ├── processors/
│       │   │   ├── qualify-lead.ts
│       │   │   ├── send-whatsapp.ts
│       │   │   ├── propose-slots.ts
│       │   │   └── send-reminder.ts
│       │   └── worker.ts
│       └── package.json
├── packages/
│   ├── shared-types/
│   │   ├── src/
│   │   │   ├── database.ts        # gerado por supabase gen types
│   │   │   └── domain.ts          # tipos custom
│   │   └── package.json
│   ├── prompts/
│   │   ├── src/
│   │   │   ├── qualification-pt.ts
│   │   │   ├── qualification-en.ts
│   │   │   └── qualification-fr.ts
│   │   └── package.json
│   └── eslint-config/
├── supabase/
│   ├── migrations/
│   │   └── 0001_initial.sql
│   ├── seed.sql
│   └── config.toml
├── docs/
│   ├── runbook.md
│   ├── arquitectura.md
│   └── decisoes.md
├── package.json
├── turbo.json
├── tsconfig.base.json
└── .env.example
```

Monorepo com Turborepo + npm workspaces. API e workers partilham `shared-types` e `prompts`.

---

## 8. SCHEMA DA BASE DE DADOS — primeira migration

Single-tenant simplificado. Sem `tenant_id`. Quando migrarmos para multi-tenant adicionamos via migration nova.

```sql
-- 0001_initial.sql

-- Leads
create table leads (
  id uuid primary key default gen_random_uuid(),
  meta_lead_id text unique,
  source text not null check (source in ('meta_lead_ads','manual')),
  full_name text,
  phone_e164 text not null,
  email text,
  language_detected text check (language_detected in ('pt','en','fr')),
  campaign_id text,
  campaign_name text,
  raw_payload jsonb,
  status text not null default 'new'
    check (status in ('new','qualifying','qualified','scheduled','visited','closed_won','closed_lost','time_waster','manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_leads_status on leads(status);
create index idx_leads_phone on leads(phone_e164);
create index idx_leads_created on leads(created_at desc);

-- Qualificações
create table lead_qualifications (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  score text not null check (score in ('Hot','Warm','Cold','Time-waster')),
  timing_months integer,
  budget_min_eur integer,
  budget_max_eur integer,
  financing_status text,
  zones text[],
  property_type text[],
  motivation text,
  summary text,
  full_payload jsonb not null,
  created_at timestamptz not null default now()
);

create index idx_qualifications_lead on lead_qualifications(lead_id);

-- Mensagens
create table messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  direction text not null check (direction in ('inbound','outbound')),
  channel text not null default 'whatsapp' check (channel in ('whatsapp','sms','email')),
  sender text not null check (sender in ('lead','closer_ai','agent')),
  body text not null,
  twilio_sid text unique,
  status text default 'sent' check (status in ('queued','sent','delivered','read','failed')),
  error_message text,
  created_at timestamptz not null default now()
);

create index idx_messages_lead_created on messages(lead_id, created_at);

-- Visitas
create table visits (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  google_event_id text,
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 30,
  property_address text,
  status text not null default 'scheduled'
    check (status in ('scheduled','confirmed','completed','no_show','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_visits_scheduled on visits(scheduled_at);

-- Cost tracking
create table usage_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('claude_tokens','twilio_message','google_api_call')),
  quantity numeric not null,
  cost_eur numeric not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_usage_created on usage_events(created_at desc);
```

---

## 9. ENV VARS — `.env.example`

```
# Node
NODE_ENV=development
LOG_LEVEL=info

# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Sentry
SENTRY_DSN=

# Twilio (Sessão 3)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=
TWILIO_TEMPLATE_FIRST_TOUCH_PT=
TWILIO_TEMPLATE_FIRST_TOUCH_EN=
TWILIO_TEMPLATE_REMINDER_24H_PT=

# Claude (Sessão 4)
ANTHROPIC_API_KEY=
CLAUDE_MODEL_QUALIFICATION=claude-sonnet-4-5
CLAUDE_MODEL_CLASSIFICATION=claude-haiku-4-5

# Google Calendar (Sessão 5)
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=
GOOGLE_REFRESH_TOKEN=

# Meta Lead Ads (Sessão 2)
META_APP_SECRET=
META_VERIFY_TOKEN=

# Redis (Sessão 6)
REDIS_URL=

# Encryption (para refresh tokens guardados em DB)
ENCRYPTION_KEY=
```

`.env` real fica em `.gitignore`. Sempre. Validar tudo com Zod no `lib/env.ts` no arranque — se faltar variável, app não arranca.

---

## 10. PLANO DAS 4 SEMANAS — 28 sessões de 3h

### Semana 1 — Fundações e ingestion

**Sessão 1** (objectivo desta primeira sessão)
- Repo GitHub privado, monorepo Turborepo + npm workspaces
- Fastify mínimo com `/health` a devolver 200
- Pino + Sentry integrados desde o primeiro commit
- ESLint, Prettier, TypeScript strict
- CI GitHub Actions: lint + typecheck em cada push
- Deploy stub para Railway (mesmo que devolva apenas `{ status: "Closer alive" }`)
- README com instruções de setup local
- `.env.example` completo

**Sessão 2** — Supabase + schema
- Projecto Supabase criado
- Migration 0001 aplicada
- `supabase gen types typescript` integrado em `packages/shared-types`
- Cliente Supabase em `lib/supabase.ts`, usando service role key apenas no backend
- Validação de env vars com Zod no arranque

**Sessão 3** — Webhook Meta Lead Ads
- Endpoint `POST /webhooks/meta-lead-ads`
- Middleware `verify-meta-signature`
- Idempotência por `meta_lead_id`
- Persistência em `leads`
- Testes manuais com payload Meta real (sandbox)
- Submissão da Meta Business Verification começa neste dia (demora 1-2 semanas)

**Sessão 4** — Iniciar processo Twilio WhatsApp Business
- Conta Twilio, sandbox WhatsApp para testes imediatos
- Templates de primeiro toque submetidos (PT, EN) — aprovação demora dias
- Cliente Twilio em `lib/twilio.ts`
- Endpoint stub para webhook de mensagens recebidas

### Semana 2 — Qualificação por IA

**Sessão 5** — BullMQ + Upstash Redis
- Conta Upstash, free tier
- Workers app stub
- Queue `lead-ingestion` definida
- Job de teste end-to-end: lead chega → enfileira → worker loga

**Sessão 6** — Cliente Claude + tool use
- `lib/claude.ts` com Anthropic SDK
- Schema Zod para output de qualificação
- Tool definition com JSON schema
- Teste isolado: dar transcript fake, obter qualification

**Sessão 7** — System prompts PT/EN/FR
- Prompts da secção 11 deste documento, em `packages/prompts`
- Versionados como código
- Testes manuais com 5 conversas fake por língua
- Iteração rápida nos prompts até soarem naturais

**Sessão 8** — Worker `qualify-lead` end-to-end
- Lê lead da DB
- Envia primeira mensagem via Twilio
- Aguarda resposta (webhook Twilio incoming)
- Continua conversa, max 7 turnos
- Persiste resultado em `lead_qualifications`
- Métrica de tempo total da qualificação

### Semana 3 — Scheduling + dogfooding inicial

**Sessão 9** — OAuth Google Calendar
- Fluxo OAuth one-time para a minha conta
- Refresh token encriptado em DB
- `lib/google-calendar.ts` com renovação automática

**Sessão 10** — Lógica de slots
- Função que devolve 3 slots dos próximos 5 dias úteis
- Respeita horário de trabalho (configurável em código por agora)
- Buffer de 30min entre eventos

**Sessão 11** — Worker `propose-slots` + `confirm-visit`
- Propõe slots por WhatsApp
- Lê resposta do lead, parse de escolha
- Cria evento no Calendar, invite ao lead
- Persiste em `visits`

**Sessão 12** — Reminders 24h antes
- Queue `reminders` com delayed jobs
- Worker `send-reminder`
- Template Twilio aprovado para reminder

**Sessão 13** — Primeiro dogfooding
- Testar fluxo completo com lead fake (eu próprio noutro número)
- Listar bugs
- Decidir o que parte e o que aguenta

**Sessão 14** — Bug fixing pós-dogfooding

### Semana 4 — Dashboard mínimo + 1º lead real

**Sessão 15** — Dashboard escolhido (Base44 ou Next.js minimal)
- Listar leads por status
- Ver conversa completa por lead

**Sessão 16** — Botão override + métricas básicas
- Pausa workers para um lead específico
- Métricas: leads/dia, % Hot/Warm, tempo médio até primeira resposta

**Sessão 17** — Cost dashboard
- Agregação de `usage_events` por dia
- Alerta se Claude API ou Twilio passam threshold

**Sessão 18** — Documentação operacional
- `docs/runbook.md`: o que fazer quando webhook falha, como reprocessar leads, como pausar tudo
- `docs/arquitectura.md`: diagrama do fluxo, decisões importantes

**Sessão 19** — Ligar campanha Meta real à minha página
- Campanha de teste com €5/dia
- Primeiro lead real entra no sistema
- Acompanhar ao vivo

**Sessões 20–28** — Iteração com leads reais
- Ajustar prompts à realidade (vai ser pior do que o esperado)
- Resolver edge cases (lead que escreve em código, lead que liga em vez de responder, lead que demora 4 dias a responder)
- Polir o dashboard
- Decidir se está pronto para primeiro piloto externo (Mês 2)

---

## 11. SYSTEM PROMPT DE QUALIFICAÇÃO — PT

Versão MVP. Guardar em `packages/prompts/src/qualification-pt.ts`. Versionar como código.

```
És o assistente do Miguel, agente imobiliário em Lisboa sob a marca Elevancy.

A tua missão é qualificar este lead em português europeu, de forma natural,
útil, sem soar a robô. Não és um chatbot — és o assistente do agente.

REGRAS DE COMUNICAÇÃO
- Português europeu (não brasileiro). "Estás" não "Você está", a menos que o lead use "você" primeiro.
- Mensagens curtas: 1-3 frases por mensagem WhatsApp. Nunca parágrafos longos.
- Uma pergunta de cada vez. Espera a resposta antes da próxima.
- Sem emojis excessivos. Máximo 1 por mensagem, e só quando faz sentido.
- Tom: profissional mas humano. "O Miguel pediu-me para te dar uma resposta rápida" é bom.
  "Sou um assistente de IA do Sr. Miguel" é mau.
- Se o lead escrever em inglês ou francês, mudas para essa língua imediatamente.

OBJECTIVOS DE QUALIFICAÇÃO (por ordem de prioridade)
1. Timing: quando quer comprar/arrendar (em meses)
2. Orçamento realista (€ min e max)
3. Estado de financiamento (cash, pré-aprovado, em processo, precisa, não sabe)
4. Zonas de interesse
5. Tipologia e características-chave
6. Motivação (primeira casa, investimento, mudança, etc)

LIMITES
- Máximo 7 mensagens tuas antes de classificar. Se não conseguiste informação chave em 7,
  classificas como "Time-waster" e propões o agente entrar em contacto directo.
- Nunca prometes preços, disponibilidades ou condições específicas de imóveis.
- Nunca dás conselho legal ou fiscal — redirecccionas para o agente.
- Se o lead pedir para falar directamente com o agente, marcas como "Hot" e propões slot.

QUANDO PROPOR VISITA
- Score Hot (timing <3 meses + financiamento ok + orçamento realista): propões 3 slots dos próximos 5 dias úteis.
- Score Warm: perguntas se quer ser contactado pelo agente esta semana.
- Score Cold: ofereces adicionar à newsletter de novos imóveis na zona.
- Score Time-waster: agradeces, encerras educadamente.

OUTPUT
No fim da conversa (quando tiveres informação suficiente OU atingires 7 mensagens),
chamas a tool `submit_qualification` com o JSON estruturado.

Nunca expliques ao lead que estás a "classificar" ou a "qualificar". Para ele,
é uma conversa normal sobre o que procura.
```

Manter versões EN e FR no mesmo padrão. Carregar dinamicamente baseado em `language_detected` do lead.

---

## 12. CUSTOS ESPERADOS — vigilância

Configurar alertas para qualquer destas linhas ultrapassar os valores:

| Item | Budget mensal Mês 1 | Alerta |
|---|---|---|
| Supabase | €0 (Free) | upgrade necessário |
| Railway (API + workers) | €15–25 | >€50 |
| Upstash Redis | €0 (Free) | >€10 |
| Twilio WhatsApp | €5–15 (só eu) | >€40 |
| Claude API | €10–30 | >€80 |
| Sentry | €0 (Free) | upgrade |
| **Total esperado Mês 1** | **€30–70** | **>€180** |

Cost dashboard agrega `usage_events` por dia. Se uma linha disparar inesperadamente, investigar antes de continuar.

---

## 13. DEFINITION OF DONE — fim da Semana 4

Para considerar o protótipo "validado internamente" e estar pronto para começar a pensar em multi-tenant + pilotos externos:

- [ ] 5 leads reais entraram via Meta Lead Ads
- [ ] Todos receberam primeira mensagem em <60s
- [ ] Pelo menos 3 foram qualificados até ao fim
- [ ] Pelo menos 1 marcou visita via Calendar
- [ ] Eu corri o sistema na Elevancy 7 dias seguidos sem desligar
- [ ] Sentry não registou erros não-tratados na última semana
- [ ] Custo total Mês 1 ficou abaixo de €100
- [ ] `runbook.md` está escrito e eu consigo seguir sozinho

Se 6 de 8 acima estão feitos, validamos. Avançamos para refactor multi-tenant no Mês 2.

Se menos de 6, **não avançamos para pilotos pagantes**. Iteramos mais 2 semanas.

---

## 14. DECISÕES ACUMULADAS

No fim de cada sessão, acrescenta uma entrada aqui com:
- Data
- Sessão #
- Decisão tomada
- Razão

Exemplo:

```
2026-05-02 — Sessão 1
Decidido usar Turborepo em vez de Nx.
Razão: setup mais leve para monorepo de 2 apps + 3 packages, sem necessidade de plugin system do Nx.
```

(Manter esta secção no fim do documento. É o histórico vivo do projecto.)

---

## 15. O QUE NÃO QUERO QUE FAÇAS NA SESSÃO 1

- Não escrevas testes ainda. Vitest entra na Sessão 5 quando houver lógica de queues para testar.
- Não configures Husky/lint-staged. Adicionamos quando o repo já tiver código a sério.
- Não configures Storybook, Playwright, Cypress, ou qualquer ferramenta de E2E.
- Não escolhas dashboard framework ainda. Decidimos na Sessão 15.
- Não escrevas integrações Twilio, Claude ou Google. Cada uma tem a sua sessão.
- Não optimizes prematuramente. Caching, indexes adicionais, connection pooling — só quando houver dados a justificar.
- Não adiciones features fora das listadas na secção 5.

---

## 16. PERGUNTA QUE PODES FAZER A QUALQUER MOMENTO

Se em algum ponto eu te pedir uma coisa que parece contradizer este documento, ou se a minha instrução te parecer impulso de scope creep ou tool-switching, faz esta pergunta:

> "Isto está fora do scope da secção 5 (ou contraria o princípio X da secção 4). Confirmas que queres prosseguir, ou estamos a desviar?"

Sou conhecido por ter o padrão de tool-switching e infrastructure-building quando a pressão comercial aperta. Tu és uma das defesas contra isso. Não tenhas medo de me confrontar.

---

## FIM DO DOCUMENTO

Sessão 1 começa quando eu disser "vamos começar". Antes disso, lê este documento todo e diz-me se há alguma contradição, ambiguidade, ou decisão técnica que queres clarificar. Não escrevas código. Só perguntas, se as tiveres.

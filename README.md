# Closer

CRM vertical para agentes imobiliários portugueses.
Protótipo interno single-tenant — Elevancy Real Estate.

## Pré-requisitos

- Node.js 20+ (`node --version`)
- npm 10+

## Setup local

```bash
# 1. Instalar dependências
npm install

# 2. Criar ficheiro de ambiente
cp .env.example .env
# Editar .env com as tuas credenciais

# 3. Arrancar todas as apps em desenvolvimento
npm run dev
```

## Apps

| App | URL local | Descrição |
|---|---|---|
| `api` | http://localhost:3000 | Backend Fastify |
| `web` | http://localhost:3001 | Frontend Next.js |

## Verificar que está a funcionar

```bash
curl http://localhost:3000/health
# {"status":"Closer alive","env":"development","version":"0.1.0"}
```

## Scripts disponíveis

```bash
npm run dev        # arranca tudo em desenvolvimento
npm run build      # compila tudo para produção
npm run lint       # verifica código
npm run typecheck  # verifica tipos TypeScript
```

## Estrutura

```
apps/
  api/      — Fastify backend (webhooks, rotas)
  workers/  — BullMQ workers (Sessão 8+)
  web/      — Next.js dashboard (Sessão 3+)
packages/
  eslint-config/  — configuração ESLint partilhada
  shared-types/   — tipos TypeScript partilhados
  prompts/        — prompts de qualificação (PT/EN/FR)
```

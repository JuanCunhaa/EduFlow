# ExamFlow — Platform Evolution Roadmap

> Documento estratégico de transformação: de ferramenta pessoal de estudo para plataforma pública, multi-tenant, de preparação para certificações.

---

## Índice

- [Visão Geral](#visão-geral)
- [Fase 0 — Fundação (Pré-Lançamento)](#fase-0--fundação-pré-lançamento)
- [Fase 1 — MVP Público](#fase-1--mvp-público)
- [Fase 2 — Crescimento (6 meses)](#fase-2--crescimento-6-meses)
- [Fase 3 — Escala (12+ meses)](#fase-3--escala-12-meses)
- [North Star Arquitetural](#north-star-arquitetural)

---

## Visão Geral

### Estado Atual
- Next.js 16 + Firebase (Auth + Firestore) + TypeScript
- Aplicação single-tenant (dados por usuário em `users/{uid}/questions`)
- 5 certificações hardcoded (CISSP, CC, SSCP, CCSP, CGRC)
- Sem billing, sem cache, sem observabilidade, sem proteção de conteúdo

### Objetivo
Plataforma pública tipo **"Shopify para certificações"** — infraestrutura para qualquer certificação, com marketplace de conteúdo, contas enterprise e adaptive testing.

---

## Fase 0 — Fundação (Pré-Lançamento)

> Tudo que DEVE existir antes de qualquer usuário público tocar o sistema.

### 0.1 — Reestruturação do Modelo de Dados
- [ ] Criar collection `certifications` (metadata, domínios, passing score, formato do exame)
- [ ] Criar collection `question_banks` (pertence à plataforma ou a criadores verificados)
- [ ] Criar collection `questions` global (vinculada a banks, com métricas de qualidade)
- [ ] Criar collection `exam_sessions` (sessões de exame dos usuários)
- [ ] Criar collection `user_progress` (progresso por certificação/domínio)
- [ ] Migrar dados existentes do modelo `users/{uid}/questions` para o novo modelo
- [ ] Remover enum hardcoded de certificações (`CISSP | CC | SSCP | CCSP | CGRC`) — tornar dinâmico via Firestore
- [ ] Atualizar Firestore rules para o novo modelo de dados
- [ ] Atualizar índices compostos para as novas collections
- [ ] Atualizar service layer (`question-service.ts`, `exam-service.ts`) para o novo modelo
- [ ] Atualizar todos os API routes para o novo modelo
- [ ] Atualizar hooks (`useQuestions`, `useExams`) para o novo modelo
- [ ] Atualizar todas as páginas para consumir o novo formato de dados

### 0.2 — Sistema de Entitlements e Planos
- [ ] Criar collection `subscriptions` / `entitlements`
- [ ] Definir estrutura de planos: Free, Pro, Enterprise
- [ ] Criar middleware de verificação de entitlements (antes de cada API call)
- [ ] Implementar limites por plano:
  - [ ] Free: X exames/mês, Y certificações
  - [ ] Pro: ilimitado, todas as certificações, explanations completas
  - [ ] Enterprise: tudo + org management + API access
- [ ] Criar página de pricing / upgrade prompts
- [ ] Criar endpoints de gestão de subscription (CRUD)
- [ ] Implementar usage tracking (contagem de exames no ciclo de billing)

### 0.3 — Proteção de Conteúdo
- [ ] Remover `correctOptionIndex` e `explanation` de TODOS os endpoints de listagem de questões
- [ ] Garantir que respostas corretas só são expostas em contexto de review pós-exame
- [ ] Implementar rate limiting por conta (não só por IP) em endpoints de leitura
- [ ] Implementar detecção de scraping (padrões de leitura anômalos)
- [ ] Adicionar fingerprinting por usuário nas respostas de API (para rastrear leaks)
- [ ] Implementar watermark invisível no conteúdo exibido (opcional, high-effort)

### 0.4 — Cache Layer
- [ ] Implementar cache para question banks (Redis via Upstash ou in-memory)
- [ ] Adicionar `Cache-Control` headers em todos os GET endpoints
- [ ] Cache de metadata de certificações (quase estático — invalidar on admin change)
- [ ] Cache de analytics (pre-compute, TTL de 15 minutos)
- [ ] Implementar stale-while-revalidate pattern no server
- [ ] Medir e documentar economia de Firestore reads após cache

### 0.5 — Observabilidade
- [ ] Integrar serviço de log aggregation (Axiom, Betterstack, ou Datadog)
- [ ] Integrar error tracking (Sentry)
- [ ] Integrar uptime monitoring (BetterUptime, Checkly)
- [ ] Criar dashboard de métricas customizadas:
  - [ ] Exames iniciados/completados por hora
  - [ ] Latência p50/p95/p99 por endpoint
  - [ ] Taxa de erro por endpoint
  - [ ] Auth failures por minuto
  - [ ] Firestore reads/writes por hora
- [ ] Configurar alertas de custo no Firebase Console
- [ ] Configurar alertas de rate limit exceeded
- [ ] Implementar health check endpoint (`/api/health`)

### 0.6 — Infraestrutura de Deploy
- [ ] Configurar CI/CD pipeline (GitHub Actions)
  - [ ] Lint + Type check
  - [ ] Testes (vitest)
  - [ ] Build
  - [ ] Deploy para staging
  - [ ] Deploy para produção (manual approval)
- [ ] Criar ambiente de staging separado (Firebase project separado)
- [ ] Configurar backup automático do Firestore (export scheduled)
- [ ] Documentar processo de rollback
- [ ] Configurar branch protection no GitHub (require PR reviews, status checks)

### 0.7 — Legal e Compliance
- [ ] Criar página de Terms of Service
- [ ] Criar página de Privacy Policy
- [ ] Implementar cookie consent banner
- [ ] Implementar endpoint de data export (GDPR Art. 20)
- [ ] Implementar endpoint de data deletion (GDPR Art. 17)
- [ ] Documentar data retention policy
- [ ] Adicionar link para ToS/Privacy no footer e na tela de login

### 0.8 — Abuse Prevention
- [ ] Rate limiting por account (não só por IP) — global across endpoints
- [ ] Bot detection no sign-up (reCAPTCHA v3 ou Turnstile)
- [ ] Detecção de anomalia em sessões de exame:
  - [ ] Completar 150 questões em < 5 minutos = flag
  - [ ] Score de 100% em < 20% do tempo alocado = flag
  - [ ] IP switching durante exame = flag
- [ ] Sistema de flag/review para contas suspeitas
- [ ] Implementar account lockout após N tentativas de login falhas
- [ ] Implementar email verification (Firebase Auth já suporta)

---

## Fase 1 — MVP Público

> Funcionalidades necessárias para um lançamento público viável.

### 1.1 — Admin Panel
- [ ] Criar rota `/admin` protegida por role
- [ ] CRUD de certificações (criar, editar, ativar/desativar)
- [ ] CRUD de domínios por certificação
- [ ] CRUD de question banks
- [ ] Dashboard de uso da plataforma (users, exams, revenue)
- [ ] Gestão de usuários (busca, ban, change plan, view history)
- [ ] Queue de review para questões flagged

### 1.2 — Onboarding Flow
- [ ] Tela de welcome após primeiro login
- [ ] Seleção de certificação alvo
- [ ] Assessment inicial (mini-exame de 10 questões para calibrar nível)
- [ ] Dashboard personalizado baseado na certificação escolhida

### 1.3 — Billing Integration
- [ ] Integrar Stripe (ou Lemon Squeezy para simplicidade)
- [ ] Checkout flow para upgrade Free → Pro
- [ ] Webhook handler para eventos do Stripe (subscription.created, updated, deleted, invoice.paid, payment_failed)
- [ ] Página de gestão de subscription (cancel, change plan, update payment)
- [ ] Grace period para pagamentos falhos
- [ ] Trial period configurável

### 1.4 — Experiência do Exame Aprimorada
- [ ] Timer visual com warning nos últimos 5 minutos
- [ ] Flag/bookmark de questões para revisão
- [ ] Navegação entre questões (ir para qualquer questão, não só sequencial)
- [ ] Review screen antes do submit (lista de questões respondidas/não respondidas/flagged)
- [ ] Feedback detalhado pós-exame por domínio com links para estudo
- [ ] Histórico de exames com filtros (certificação, data, score range)

### 1.5 — Landing Page e Marketing Site
- [ ] Landing page pública (não requer auth)
- [ ] Seção de features
- [ ] Seção de pricing com comparação de planos
- [ ] Seção de testimonials/social proof
- [ ] Blog (pode ser MDX-based no Next.js)
- [ ] SEO optimization (meta tags, sitemap, robots.txt)
- [ ] Open Graph images para share

### 1.6 — Email System
- [ ] Welcome email após signup
- [ ] Email de confirmação de subscription
- [ ] Email de lembrete para exames não completados
- [ ] Weekly progress digest
- [ ] Email de pagamento falho
- [ ] Usar Resend, SendGrid, ou AWS SES

---

## Fase 2 — Crescimento (6 meses)

> Funcionalidades que criam diferenciação e retenção.

### 2.1 — Motor de Certificações Genérico
- [ ] Schema configurável para definição de exames:
  - [ ] Tipos de questão (multiple choice, multiple select, drag-and-drop, fill-in-the-blank)
  - [ ] Regras de scoring (uniforme, ponderado, crédito parcial, penalidade)
  - [ ] Regras de tempo (fixo, por questão, sem limite)
  - [ ] Parâmetros adaptativos (se habilitado)
- [ ] Renderizador de questão plugável (componente por tipo de questão)
- [ ] Scoring engine como strategy pattern (troca de algoritmo sem mudar código)
- [ ] Suporte a imagens em questões e opções de resposta
- [ ] Suporte a code snippets em questões (com syntax highlighting)

### 2.2 — Sistema de Qualidade de Questões
- [ ] Calcular Item Discrimination Index automaticamente
- [ ] Calcular dificuldade real baseada em performance dos usuários (não manual)
- [ ] Detectar questões problemáticas automaticamente:
  - [ ] Acerto > 95% = muito fácil, pouco valor
  - [ ] Acerto < 5% = muito difícil ou confusa
  - [ ] Discrimination index negativo = questão ruim
- [ ] Sistema de report de questões por usuários
- [ ] Queue de review para questões reportadas
- [ ] Versionamento de questões (editar sem perder histórico)

### 2.3 — Adaptive Learning
- [ ] Implementar spaced repetition no Study Mode (algoritmo SM-2 ou FSRS)
- [ ] Identificação de fraquezas por domínio baseada em performance histórica
- [ ] Geração personalizada de exames (foco em domínios fracos)
- [ ] Progress tracking visual (heatmap de domínios, trend lines)
- [ ] Estimativa de readiness para o exame real (% de chance de passar)

### 2.4 — Organizações e Teams
- [ ] Modelo de dados para organizations
- [ ] Roles dentro de org: owner, admin, member
- [ ] Convite de membros por email
- [ ] Admin pode atribuir certificações para membros
- [ ] Dashboard de progresso do time para managers
- [ ] Relatórios exportáveis (PDF/CSV) para compliance
- [ ] SSO integration (SAML/OIDC) para enterprise

### 2.5 — Search
- [ ] Integrar search engine (Algolia, Typesense, ou Meilisearch)
- [ ] Full-text search em questões
- [ ] Filtros: certificação, domínio, dificuldade, tags, performance pessoal
- [ ] Autocomplete com sugestões
- [ ] Search analytics (o que as pessoas procuram e não encontram)

### 2.6 — Gamification e Engagement
- [ ] Sistema de streaks (dias consecutivos estudando)
- [ ] Badges/achievements (primeiro exame, 10 exames, score perfeito, etc.)
- [ ] Leaderboard por certificação (opt-in)
- [ ] Daily challenge (1 questão por dia, compartilhável)
- [ ] Progress sharing (imagem gerada para redes sociais)

---

## Fase 3 — Escala (12+ meses)

> Funcionalidades que criam moat competitivo e viabilizam hyperscale.

### 3.1 — Content Marketplace
- [ ] Portal de criador de conteúdo (signup, profile, dashboard)
- [ ] Workflow de publicação de question banks:
  - [ ] Draft → Review → Published
  - [ ] Revisão de qualidade automatizada + manual
- [ ] Revenue sharing (70/30, 80/20, etc.)
- [ ] Rating e reviews de question banks por usuários
- [ ] Featured banks curados pela plataforma
- [ ] Analytics para criadores (downloads, ratings, revenue)
- [ ] Ferramentas de criação de questões com preview

### 3.2 — Adaptive Testing (CAT)
- [ ] Implementar Item Response Theory (IRT) — 1PL, 2PL, ou 3PL model
- [ ] Calibração de item pools com dados reais de resposta
- [ ] Exames de tamanho variável (termina quando confiança estatística é atingida)
- [ ] Relatório de score com margem de erro (como o exame real)
- [ ] Validação estatística do engine (comparar scores CAT vs scores fixos)

### 3.3 — API Platform
- [ ] API pública documentada (OpenAPI/Swagger)
- [ ] API key management
- [ ] Rate limiting por API key
- [ ] Webhooks para eventos (exam_completed, user_registered, subscription_changed)
- [ ] Integração LTI (Learning Tools Interoperability) para LMS:
  - [ ] Canvas, Moodle, Blackboard, Google Classroom
- [ ] SDK JavaScript/TypeScript para embedding
- [ ] Sandbox environment para developers

### 3.4 — AI Features
- [ ] Geração de questões via LLM a partir de material de estudo (PDF, texto)
- [ ] Enriquecimento automático de explanations
- [ ] Assistente de estudo com linguagem natural
- [ ] Auto-tagging de questões
- [ ] Detecção de questões duplicadas/similares
- [ ] Scoring automático de qualidade de questões geradas
- [ ] Geração de study guides personalizados

### 3.5 — White-Label
- [ ] Custom domains para clientes enterprise
- [ ] Temas customizáveis (cores, logo, fonts)
- [ ] Emails com branding do cliente
- [ ] Isolamento completo de dados por tenant
- [ ] Configuração de features por tenant (liga/desliga funcionalidades)
- [ ] Deploy automatizado de instâncias white-label

### 3.6 — Multi-Region e Performance
- [ ] Data residency configurável (EU, US, APAC)
- [ ] Edge-deployed read replicas
- [ ] CDN para assets estáticos e conteúdo público
- [ ] Connection pooling para database
- [ ] Background workers para jobs pesados (analytics, reports, AI)
- [ ] Queue system (BullMQ, AWS SQS) para processamento assíncrono
- [ ] Auto-scaling baseado em demanda

### 3.7 — Offline e Mobile
- [ ] Progressive Web App (PWA) com service worker
- [ ] Offline exam taking com dados encriptados localmente
- [ ] Sync-on-reconnect para ambientes com conectividade instável
- [ ] Push notifications (exam reminders, streak alerts)
- [ ] App nativa mobile (React Native) — avaliar necessidade vs PWA

### 3.8 — Proctoring e Integridade
- [ ] Browser lockdown mode (fullscreen, bloquear copiar/colar)
- [ ] Detecção de tab switching durante exame
- [ ] Webcam proctoring básico (presença, não reconhecimento facial)
- [ ] Integração com serviços de proctoring terceirizados (ProctorU, ExamSoft)
- [ ] Relatório de integridade por sessão de exame
- [ ] Certificados verificáveis (blockchain ou verificação por URL)

---

## North Star Arquitetural

### 3–5 Anos: O que o ExamFlow ideal se parece

```
┌─────────────────────────────────────────────────────────────┐
│                    EDGE / CDN LAYER                         │
│  (Vercel Edge, CloudFront) — Static assets, cached reads   │
├─────────────────────────────────────────────────────────────┤
│                    API GATEWAY                              │
│  Auth, Rate Limiting, Entitlements, Routing                 │
├──────────────┬──────────────┬───────────────────────────────┤
│  Question    │  Exam        │  User & Billing               │
│  Service     │  Engine      │  Service                      │
│  (read-heavy,│  (stateful   │  (PostgreSQL,                 │
│  cached)     │  sessions)   │  Stripe webhooks)             │
├──────────────┴──────────────┴───────────────────────────────┤
│                 EVENT BUS / QUEUE                           │
│  (exam.completed, question.reported, subscription.changed)  │
├──────────────┬──────────────┬───────────────────────────────┤
│  Analytics   │  AI Workers  │  Notification                 │
│  Pipeline    │  (question   │  Service                      │
│  (pre-compute│  generation, │  (email, push,                │
│  dashboards) │  IRT calibr.)│  in-app)                      │
├──────────────┴──────────────┴───────────────────────────────┤
│                    DATA LAYER                               │
│  PostgreSQL (users, subs, orgs)                             │
│  Document Store (questions, exam configs)                   │
│  Redis (cache, sessions, rate limits)                       │
│  Search Engine (Typesense/Algolia)                          │
│  Object Storage (images, PDFs, exports)                     │
└─────────────────────────────────────────────────────────────┘
```

### Moat Competitivo (3 pilares)

1. **Dados** — Milhões de respostas criam a calibração de itens mais precisa do mercado. Ninguém pode comprar isso.
2. **Network Effects** — Criadores publicam no ExamFlow porque é onde os usuários estão. Usuários estudam no ExamFlow porque é onde o melhor conteúdo está.
3. **Integration Depth** — LTI com todo LMS, API com sistemas de RH, SSO enterprise. Uma vez implantado, custo de troca é enorme.

---

## Priorização Resumida

| Prioridade | Item | Impacto | Esforço |
|---|---|---|---|
| 🔴 P0 | Reestruturação do modelo de dados | Bloqueante | Alto |
| 🔴 P0 | Sistema de entitlements/planos | Bloqueante | Médio |
| 🔴 P0 | Proteção de conteúdo | Bloqueante | Médio |
| 🔴 P0 | Legal (ToS, Privacy) | Bloqueante | Baixo |
| 🟡 P1 | Cache layer | Alto | Médio |
| 🟡 P1 | Observabilidade | Alto | Médio |
| 🟡 P1 | CI/CD + staging | Alto | Médio |
| 🟡 P1 | Admin panel | Alto | Alto |
| 🟡 P1 | Billing (Stripe) | Alto | Alto |
| 🟢 P2 | Certification engine genérico | Diferenciação | Alto |
| 🟢 P2 | Adaptive learning | Diferenciação | Alto |
| 🟢 P2 | Organizations/Teams | Revenue | Alto |
| 🟢 P2 | Search | UX | Médio |
| 🔵 P3 | Content marketplace | Moat | Muito Alto |
| 🔵 P3 | CAT (Adaptive Testing) | Moat | Muito Alto |
| 🔵 P3 | API platform | Ecosystem | Alto |
| 🔵 P3 | AI features | Moat | Alto |
| 🔵 P3 | White-label | Revenue | Muito Alto |

---

*Documento gerado em 10/02/2026. Atualizar conforme progresso.*

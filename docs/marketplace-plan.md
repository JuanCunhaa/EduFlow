# EduFlow Marketplace — Plano de Implementação Arquitetural

> **Autor:** Análise automatizada (Staff+ Engineer review)
> **Data:** 2026-02-11
> **Versão:** 1.0
> **Status:** DRAFT — aguardando decisões do owner

---

## Índice

1. [Resumo Executivo](#1-resumo-executivo)
2. [Análise Crítica da Ideia](#2-análise-crítica-da-ideia)
3. [Alternativas Arquiteturais](#3-alternativas-arquiteturais)
4. [Arquitetura Recomendada](#4-arquitetura-recomendada)
5. [Modelo de Dados](#5-modelo-de-dados)
6. [APIs](#6-apis)
7. [Fluxo de Importação](#7-fluxo-de-importação)
8. [Segurança](#8-segurança)
9. [Performance](#9-performance)
10. [Plano por Fases](#10-plano-por-fases)
11. [Estratégia de Testes](#11-estratégia-de-testes)
12. [Riscos](#12-riscos)
13. [Perguntas para o Owner](#13-perguntas-para-o-owner)

---

## 1. Resumo Executivo

### O que existe hoje

O EduFlow é um app Next.js 16 + Firebase (Firestore + Admin SDK) com:

- **Modelo multi-tenant por UID:** Tudo vive sob `users/{uid}/studies`, `users/{uid}/questions`, `users/{uid}/exams`.
- **Domínios embedded:** `StudyDomain[]` é um array dentro do documento `Study` (não é subcollection).
- **Perguntas referenciando study:** `Question.studyId` + `Question.domainIds[]` (array-contains-any, max 10).
- **Auth via session cookie:** Firebase Auth → session cookie `__session` (7 dias).
- **Admin:** Custom claims `roles: ['admin']` + fallback `ADMIN_UID` env var.
- **Rate limiting:** Firestore-backed (`_rateLimits` collection).
- **Scraping guard:** Fingerprinting + burst detection.
- **Bulk import existente:** `POST /api/questions/import` — até 500 perguntas por batch, com rate limit (3/min).
- **Validação:** Zod schemas com HTML stripping.
- **Firestore rules:** All writes blocked from client (server-only via Admin SDK).
- **Zero hardcode de conteúdo:** Tudo já é dinâmico no banco.

### O que se quer construir

Um **Marketplace** onde:
1. Admin cria Studies → Domains → Questions em uma *collection* global** (não user-scoped).
2. Usuários pesquisam Studies, navegam Domains, selecionam até 10 domains e **importam** para sua collection pessoal.
3. Após importação, o conteúdo é independente — editável, deletável, sem afetar o marketplace.

---

## 2. Análise Crítica da Ideia

### ✅ O que está BOM na proposta

| Aspecto | Avaliação |
|---------|-----------|
| Separação marketplace vs personal | ✅ Correto — dados importados devem ser independentes |
| Hierarquia Study → Domain → Question | ✅ Já existe no sistema, não precisa inventar nada |
| Admin-only para publicação | ✅ Simples e seguro para o estágio atual |
| Import atômico | ✅ Fundamental — import parcial = estado corrupto |
| Rastreabilidade (source_id) | ✅ Necessário para idempotência e analytics |
| Zero hardcode | ✅ Já é a realidade do sistema |

### ⚠️ O que precisa de CUIDADO

| Aspecto | Risco | Mitigação |
|---------|-------|-----------|
| **Seleção de até 10 domínios** | O limite de 10 é bom (matches Firestore `array-contains-any` limit), mas importar 10 domínios com centenas de questions cada pode gerar um batch gigante | Paginar a importação ou usar batched writes com chunks de 500 |
| **Duplicação de dados** | Cada import cria uma cópia completa de todas as perguntas. 100 users importando 500 perguntas = 50k documentos | Isso é **intencional** e correto para o modelo — não é um bug, é a feature. Firestore lida bem com isso |
| **Domains como embedded array** | Domains não são subcollection — são embeddados no Study doc. Isso é bom para leitura mas significa que o marketplace study doc pode crescer se tiver 30 domains | Com max 30 domains × ~100 bytes cada = ~3KB. Muito dentro do limite de 1MB do Firestore |
| **Versionamento de perguntas** | Complexidade alta, benefício baixo no estágio atual | **NÃO implementar agora** — rastreabilidade simples (sourceId) é suficiente |

### ❌ O que está ERRADO ou é PERIGOSO

| Aspecto | Problema |
|---------|----------|
| **Bulk insert via CSV/JSON no admin** | CSV parsing no servidor é frágil e abre superfície de ataque (injection, encoding issues). JSON é suficiente — já existe `bulkImportSchema` |
| **Sistema de revisão** | Overengineering puro para um sistema single-admin. Não tem reviewers |
| **Auditoria completa** | Logs estruturados no `logger` já existente são suficientes. Um audit trail formal é premature |

### 🧠 Diagnóstico Final

> **A ideia é sólida.** A arquitetura proposta está 90% correta.
>
> Os 10% que preciso corrigir:
> 1. A estrutura de collections precisa ser cuidadosa (onde vive o marketplace data).
> 2. Idempotência precisa ser "block + inform", não "merge" (merge é perigoso).
> 3. Não adicionar versionamento, revisão, ou auditoria formal agora.

---

## 3. Alternativas Arquiteturais

### Opção A — Collection Global Separada (RECOMENDADA)

```
marketplace/studies/{studyId}         ← Study doc (com domains[])
marketplace/questions/{questionId}    ← Questions do marketplace
users/{uid}/studies/{studyId}         ← Cópia pessoal do user
users/{uid}/questions/{questionId}    ← Cópia pessoal do user
```

**Como funciona:**
- O marketplace vive em uma **top-level collection** `marketplace/studies` e `marketplace/questions`.
- Totalmente separado das collections de usuário.
- Import copia dados do marketplace para o namespace do user.
- Admin CRUD opera apenas na collection marketplace.

**Prós:**
- ✅ Separação completa — impossível um user afetar o marketplace
- ✅ Firestore rules simples: marketplace é read-only para authenticated users, write-only via Admin SDK
- ✅ Queries de busca no marketplace não precisam filtrar por UID
- ✅ Escalável — adicionar mais admins futuramente é trivial
- ✅ Sem risco de IDOR (user nunca tem referência direta ao dado do marketplace)
- ✅ Já alinhado com o padrão existente (Admin SDK para writes)

**Contras:**
- ⚠️ Duplicação de dados na importação (intencional e desejável)
- ⚠️ Precisa de novas Firestore rules para a collection `marketplace`

### Opção B — Usar o UID do Admin como "Namespace" do Marketplace

```
users/{ADMIN_UID}/studies/{studyId}      ← Study do admin = marketplace
users/{uid}/studies/{studyId}            ← Cópia pessoal
```

**Como funciona:**
- O admin cria studies/questions normalmente sob seu UID.
- Uma flag `isPublished: true` marca o que aparece no marketplace.
- Import copia de `users/{ADMIN_UID}/...` para `users/{uid}/...`.

**Prós:**
- ✅ Reusa toda a infra existente sem nenhuma mudança
- ✅ Zero refactor

**Contras:**
- ❌ **Acoplamento perigoso** — marketplace está preso a UM UID
- ❌ Se o admin perder a conta, marketplace morre
- ❌ `isPublished` flag mistura concerns (personal vs marketplace no mesmo namespace)
- ❌ Queries do marketplace precisam filtrar `where('isPublished', '==', true)` dentro das collections do admin
- ❌ Firestore rules ficam complexas (precisa permitir que outros users leiam as collections do admin)
- ❌ Escala mal se quiser múltiplos admins

### Opção C — Subcollection `marketplace` dentro de `metadata`

```
metadata/marketplace/studies/{studyId}
metadata/marketplace/questions/{questionId}
```

**Como funciona:**
- Usa o doc `metadata/marketplace` como raiz.
- Subcollections `studies` e `questions` dentro dele.

**Prós:**
- ✅ Organizado sob um namespace existente

**Contras:**
- ❌ Subcollections dentro de subcollections → path profundo demais
- ❌ `metadata` já é usada para outra coisa (config)
- ❌ Firestore não permite queries entre subcollections diferentes de forma eficiente (sem collection group indexes extras)

### Comparação Final

| Critério | Opção A (Global) | Opção B (Admin UID) | Opção C (metadata) |
|----------|:-:|:-:|:-:|
| Separação de concerns | ✅ Excelente | ❌ Misturado | ⚠️ Ok |
| Simplicidade | ✅ Simples | ✅ Mais simples | ⚠️ Path complexo |
| Escalabilidade | ✅ Escala | ❌ Preso a 1 UID | ⚠️ Ok |
| Segurança | ✅ Rules simples | ❌ Rules complexas | ⚠️ Ok |
| Refactor necessário | ⚠️ Moderado | ✅ Nenhum | ⚠️ Moderado |
| Risco futuro | ✅ Baixo | ❌ Alto | ⚠️ Médio |

### 🏆 Recomendação: Opção A

> **Opção A é a correta.** O custo de implementação é moderado, mas o benefício arquitetural é enorme. Opção B é um atalho que vai gerar arrependimento.

---

## 4. Arquitetura Recomendada

### 4.1 Visão Geral

```
┌─────────────────────────────────────────────────────────┐
│                    FIRESTORE                             │
│                                                          │
│  ┌─────────────────────┐    ┌──────────────────────┐    │
│  │  marketplace/        │    │  users/{uid}/         │    │
│  │  ├── studies/{id}    │───→│  ├── studies/{id}     │    │
│  │  └── questions/{id}  │    │  ├── questions/{id}   │    │
│  │                      │    │  ├── exams/{id}       │    │
│  │  (global, read-only  │    │  └── stats/current    │    │
│  │   for auth users)    │    │                       │    │
│  └─────────────────────┘    │  (user-scoped,         │    │
│                              │   full CRUD)           │    │
│                              └──────────────────────┘    │
└─────────────────────────────────────────────────────────┘

         │                              │
         ▼                              ▼
┌─────────────────┐           ┌─────────────────┐
│  Admin APIs      │           │  User APIs       │
│  (requireAdmin)  │           │  (withAuth)      │
│                  │           │                  │
│  CRUD estudos    │           │  Browse mktplace │
│  CRUD domínios   │           │  Import          │
│  CRUD perguntas  │           │  CRUD pessoal    │
└─────────────────┘           └─────────────────┘
```

### 4.2 Novo Middleware: `withAdmin`

O sistema já tem `isAdmin()` em `server-auth.ts`. Precisamos de um wrapper de rota:

```typescript
// Novo em api-middleware.ts
export function withAdmin(handler, options) {
    return withAuth(async (request, context) => {
        if (!isAdmin(context.user)) {
            throw new ForbiddenError('Admin access required');
        }
        return handler(request, context);
    }, { checkRevoked: true, ...options });
}
```

### 4.3 Camadas

```
┌──────────────────────────────────────────┐
│  API Routes (app/api/marketplace/...)     │ ← HTTP boundary
├──────────────────────────────────────────┤
│  Middleware (withAuth / withAdmin)         │ ← Auth + validation
├──────────────────────────────────────────┤
│  Services (marketplace-service.ts, etc.)  │ ← Business logic
├──────────────────────────────────────────┤
│  Firebase Admin SDK (admin-firestore.ts)  │ ← Data access
├──────────────────────────────────────────┤
│  Firestore                                │ ← Persistence
└──────────────────────────────────────────┘
```

---

## 5. Modelo de Dados

### 5.1 Marketplace Study

**Path:** `marketplace/studies/{studyId}`

```typescript
interface MarketplaceStudy {
    id: string;
    abbreviation: string;              // e.g. "CISSP"
    name: string;                      // e.g. "Certified Information Systems Security Professional"
    description: string;               // Para exibição no marketplace
    domains: MarketplaceDomain[];      // Embedded (mesmo padrão de Study)
    questionCount: number;             // Denormalized — total de perguntas
    domainQuestionCounts: Record<string, number>; // Denormalized — perguntas por domínio
    importCount: number;               // Quantas vezes foi importado (analytics)
    accentColor?: string;
    tags: string[];                    // Para busca/filtro
    isActive: boolean;                 // Soft-delete / draft / published
    createdAt: Timestamp;
    updatedAt: Timestamp;
    createdBy: string;                 // admin UID (auditoria)
}

interface MarketplaceDomain {
    id: string;           // "d1", "d2", etc.
    abbreviation: string; // "SAM"
    name: string;         // "Security and Risk Management"
    order: number;
    description?: string; // Descrição para exibição no marketplace
}
```

**Justificativas:**
- `domains` continua embedded (mesmo padrão de `Study`). Com max 30 domains, o documento fica ~5KB.
- `domainQuestionCounts` é denormalizado para mostrar "Equação 1º grau (45 perguntas)" sem query extra.
- `importCount` é um counter atômico (FieldValue.increment) — útil para analytics mas não crítico.
- `isActive` permite draft/publish sem deletar.
- `createdBy` para auditoria mínima (quem criou).

### 5.2 Marketplace Question

**Path:** `marketplace/questions/{questionId}`

```typescript
interface MarketplaceQuestion {
    id: string;
    studyId: string;                   // Ref para marketplace/studies/{studyId}
    domainIds: string[];               // Mesmo formato do Question existente
    text: string;
    options: Option[];                 // 4 ou 5 itens
    correctOptionIndex: number;
    explanation: Explanation;
    difficulty: Difficulty;
    tags: string[];
    isActive: boolean;                 // Soft-delete
    createdAt: Timestamp;
    updatedAt: Timestamp;
    createdBy: string;                 // admin UID
}
```

**Nota:** A estrutura é **idêntica** a `Question` existente, com acréscimo de `isActive` e `createdBy`. Isso é intencional — simplifica a importação (é praticamente um copy).

### 5.3 Campos de Rastreabilidade (no User Data)

Quando o user importa, os documentos criados em `users/{uid}/studies` e `users/{uid}/questions` ganham campos extras:

```typescript
// Campos adicionados ao Study do user após import
interface ImportedStudyMetadata {
    _source: {
        type: 'marketplace';                     // Extensível para futuras fontes
        marketplaceStudyId: string;              // ID original no marketplace
        importedAt: Timestamp;                   // Quando importou
        importedDomainIds: string[];             // Quais domínios foram selecionados
        marketplaceQuestionCount: number;        // Quantas perguntas existiam na hora do import
    };
}

// Campos adicionados ao Question do user após import
interface ImportedQuestionMetadata {
    _source: {
        type: 'marketplace';
        marketplaceQuestionId: string;           // ID original no marketplace
        marketplaceStudyId: string;              // Estudo de origem
        importedAt: Timestamp;
    };
}
```

**Por que `_source` como objeto e não campos flat?**
- Namespace claro — não colide com campos existentes
- Extensível — se no futuro houver import de outras fontes (CSV, outro user), basta adicionar novos `type`s
- Query-friendly — `where('_source.type', '==', 'marketplace')` funciona no Firestore

### 5.4 Índices Necessários

```json
{
    "indexes": [
        {
            "collectionGroup": "studies",
            "queryScope": "COLLECTION",
            "fields": [
                { "fieldPath": "isActive", "order": "ASCENDING" },
                { "fieldPath": "createdAt", "order": "DESCENDING" }
            ]
        },
        {
            "collectionGroup": "questions",
            "queryScope": "COLLECTION",
            "fields": [
                { "fieldPath": "studyId", "order": "ASCENDING" },
                { "fieldPath": "isActive", "order": "ASCENDING" },
                { "fieldPath": "createdAt", "order": "DESCENDING" }
            ]
        },
        {
            "collectionGroup": "questions",
            "queryScope": "COLLECTION",
            "fields": [
                { "fieldPath": "studyId", "order": "ASCENDING" },
                { "fieldPath": "isActive", "order": "ASCENDING" },
                { "fieldPath": "difficulty", "order": "ASCENDING" }
            ]
        }
    ]
}
```

**Nota:** Esses são os índices para as collections dentro de `marketplace/`. Os `collectionGroup` precisam ser ajustados ao path real (`marketplace/studies`, `marketplace/questions`). Se Firestore não suportar `collectionGroup` para paths com prefixo, usar collection-level indexes normais.

---

## 6. APIs

### 6.1 Estrutura de Rotas

```
app/api/marketplace/
├── studies/
│   ├── route.ts                    GET (browse) + POST (admin create)
│   └── [studyId]/
│       ├── route.ts                GET (detail) + PUT (admin update) + DELETE (admin)
│       └── questions/
│           └── route.ts            GET (list questions) + POST (admin create)
├── questions/
│   ├── route.ts                    POST (admin bulk create)
│   └── [questionId]/
│       └── route.ts                PUT (admin update) + DELETE (admin)
└── import/
    └── route.ts                    POST (user import)
```

### 6.2 Endpoints Detalhados

#### Browse (Público autenticado)

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| `GET` | `/api/marketplace/studies` | `withAuth` | Lista studies ativos no marketplace |
| `GET` | `/api/marketplace/studies/[studyId]` | `withAuth` | Detalhe de um study com domains |
| `GET` | `/api/marketplace/studies/[studyId]/questions` | `withAuth` | Lista perguntas de um study (sem `correctOptionIndex` e sem `explanation`) |

#### Admin CRUD

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| `POST` | `/api/marketplace/studies` | `withAdmin` | Criar study no marketplace |
| `PUT` | `/api/marketplace/studies/[studyId]` | `withAdmin` | Atualizar study |
| `DELETE` | `/api/marketplace/studies/[studyId]` | `withAdmin` | Soft-delete study (isActive=false) |
| `POST` | `/api/marketplace/studies/[studyId]/questions` | `withAdmin` | Criar pergunta(s) — aceita single ou array |
| `PUT` | `/api/marketplace/questions/[questionId]` | `withAdmin` | Atualizar pergunta |
| `DELETE` | `/api/marketplace/questions/[questionId]` | `withAdmin` | Soft-delete pergunta |
| `POST` | `/api/marketplace/questions` | `withAdmin` | Bulk create perguntas (max 500, JSON body) |

#### Import (Core)

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| `POST` | `/api/marketplace/import` | `withAuth` | Importar domains selecionados de um study |

**Request body do import:**
```typescript
{
    studyId: string;          // marketplace study ID
    domainIds: string[];      // 1–10 domain IDs selecionados
}
```

### 6.3 Validação (Novos Zod Schemas)

```typescript
// Em lib/validators.ts — novos schemas

export const createMarketplaceStudySchema = z.object({
    abbreviation: safeString(1).pipe(z.string().max(20)),
    name: safeString(2).pipe(z.string().max(200)),
    description: safeString(10).pipe(z.string().max(2000)),
    domains: z.array(studyDomainSchema).min(1).max(30),
    accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    tags: z.array(z.string().transform(stripHtml).pipe(z.string().max(50))).max(20).default([]),
});

export const marketplaceImportSchema = z.object({
    studyId: z.string().min(1),
    domainIds: z.array(z.string().min(1)).min(1).max(10),
});

export const marketplaceBulkQuestionsSchema = z.object({
    studyId: z.string().min(1),
    questions: z.array(
        createQuestionSchema.omit({ studyId: true })
    ).min(1).max(500),
});
```

### 6.4 Novo Service: `marketplace-service.ts`

```typescript
// Pseudo-structure — NÃO é o código final

// === Paths ===
const MARKETPLACE_STUDIES = 'marketplace/studies';
const MARKETPLACE_QUESTIONS = 'marketplace/questions';

// === Admin Operations ===
async function createMarketplaceStudy(adminUid, data) → string
async function updateMarketplaceStudy(adminUid, studyId, data) → void
async function deleteMarketplaceStudy(adminUid, studyId) → void  // soft-delete

async function createMarketplaceQuestion(adminUid, studyId, data) → string
async function bulkCreateMarketplaceQuestions(adminUid, studyId, questions[]) → { created: number, ids: string[] }
async function updateMarketplaceQuestion(adminUid, questionId, data) → void
async function deleteMarketplaceQuestion(adminUid, questionId) → void  // soft-delete

// === Browse Operations ===
async function listMarketplaceStudies(options?) → MarketplaceStudy[]
async function getMarketplaceStudy(studyId) → MarketplaceStudy
async function listMarketplaceQuestions(studyId, domainIds?, cursor?) → { questions, nextCursor }

// === Import ===
async function importFromMarketplace(uid, studyId, domainIds[]) → ImportResult
```

---

## 7. Fluxo de Importação

### 7.1 Pseudo-code Detalhado

```
FUNCTION importFromMarketplace(uid, marketplaceStudyId, selectedDomainIds[]):

    // ── 1. Validação ──
    VALIDATE selectedDomainIds.length >= 1 AND <= 10

    // ── 2. Buscar study do marketplace ──
    marketplaceStudy = GET marketplace/studies/{marketplaceStudyId}
    IF NOT marketplaceStudy OR NOT marketplaceStudy.isActive:
        THROW NotFoundError("Study not found in marketplace")

    // ── 3. Validar que os domainIds existem no study ──
    validDomains = marketplaceStudy.domains.filter(d => selectedDomainIds.includes(d.id))
    IF validDomains.length !== selectedDomainIds.length:
        THROW ValidationError("Invalid domain IDs")

    // ── 4. Verificar idempotência ──
    existingStudies = QUERY users/{uid}/studies
        WHERE _source.type == 'marketplace'
        AND _source.marketplaceStudyId == marketplaceStudyId
    
    IF existingStudies.length > 0:
        existingDomainIds = existingStudies[0]._source.importedDomainIds
        overlapIds = intersection(existingDomainIds, selectedDomainIds)
        
        IF overlapIds.length > 0:
            THROW ConflictError(
                "Already imported domains: " + overlapIds.join(', ') +
                ". Delete your existing study to reimport, or select different domains."
            )

    // ── 5. Buscar perguntas do marketplace (filtradas por domainIds) ──
    // Firestore: array-contains-any com os domainIds selecionados
    allQuestions = []
    FOR EACH chunk of selectedDomainIds (max 10 per query, Firestore limit):
        questions = QUERY marketplace/questions
            WHERE studyId == marketplaceStudyId
            AND isActive == true
            AND domainIds array-contains-any chunk
        allQuestions.push(...questions)
    
    // Deduplicate (uma pergunta pode ter múltiplos domainIds)
    allQuestions = deduplicate(allQuestions, by: 'id')

    // ── 6. Criar study pessoal (dentro de transaction/batch) ──
    batch = new WriteBatch()

    // 6a. Criar Study
    newStudyRef = users/{uid}/studies/{auto-id}
    batch.set(newStudyRef, {
        abbreviation: marketplaceStudy.abbreviation,
        name: marketplaceStudy.name,
        domains: validDomains,                    // Apenas os selecionados
        questionCount: allQuestions.length,
        examCount: 0,
        accentColor: marketplaceStudy.accentColor,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        _source: {
            type: 'marketplace',
            marketplaceStudyId: marketplaceStudyId,
            importedAt: serverTimestamp(),
            importedDomainIds: selectedDomainIds,
            marketplaceQuestionCount: allQuestions.length,
        }
    })

    // 6b. Criar Questions
    questionIdMap = {}   // marketplace ID → user ID (para rastreabilidade)
    FOR EACH question IN allQuestions:
        newQuestionRef = users/{uid}/questions/{auto-id}
        // Filtrar domainIds para incluir apenas os domínios selecionados
        filteredDomainIds = question.domainIds.filter(
            id => selectedDomainIds.includes(id)
        )
        batch.set(newQuestionRef, {
            studyId: newStudyRef.id,
            domainIds: filteredDomainIds,
            text: question.text,
            options: question.options,
            correctOptionIndex: question.correctOptionIndex,
            explanation: question.explanation,
            difficulty: question.difficulty,
            tags: question.tags,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            _source: {
                type: 'marketplace',
                marketplaceQuestionId: question.id,
                marketplaceStudyId: marketplaceStudyId,
                importedAt: serverTimestamp(),
            }
        })
        questionIdMap[question.id] = newQuestionRef.id

    // ── 7. Incrementar importCount no marketplace (fire-and-forget) ──
    // Fora do batch principal para não travar o import se falhar
    batch.update(marketplace/studies/{marketplaceStudyId}, {
        importCount: FieldValue.increment(1)
    })

    // ── 8. Commit atômico ──
    // Firestore batch limit = 500 writes
    // Se allQuestions.length + 2 (study + marketplace update) > 500:
    //   Dividir em múltiplos batches com retry
    IF batch.size <= 500:
        COMMIT batch
    ELSE:
        // Chunk strategy: primeiro batch cria study + primeiras N questions
        // Subsequent batches criam as questions restantes
        // Se um batch falhar, cleanup: delete study + questions já criadas
        COMMIT_CHUNKED(batch, chunkSize=498)  // 498 questions + 1 study + 1 marketplace update

    // ── 9. Retornar resultado ──
    RETURN {
        studyId: newStudyRef.id,
        importedQuestions: allQuestions.length,
        importedDomains: validDomains.length,
    }
```

### 7.2 Estratégia de Idempotência: BLOCK + INFORM

**Decisão:** Se o user já importou o mesmo study com os mesmos domínios, **bloquear e informar**.

**Por que NÃO merge:**
- Merge é perigoso — se o user editou uma pergunta e fazemos merge, qual versão ganha?
- Conflitos de domínios editados são irreconciliáveis sem UI de diff (overengineering).
- O user pode ter deletado perguntas intencionalmente.

**Por que NÃO duplicar:**
- Duplicar cria perguntas iguais no banco do user — confuso.
- O user pode acabar com 2 cópias de "Equação 1º grau" no mesmo study.

**Por que NÃO versionar:**
- Versioning requer UI de diff, merge resolution, e storage extra.
- Complexidade desproporcional ao benefício.

**Por que BLOCK + INFORM:**
- Simples e previsível.
- User sabe exatamente o que aconteceu.
- Se quiser reimportar: deleta o study pessoal → importa de novo.
- Se quiser domínios diferentes: seleciona apenas os novos.

**Granularidade:** O bloqueio é **por domínio**, não por study inteiro. Se o user importou domínios A e B, ele pode importar domínios C e D do mesmo study. Mas se tentar importar A novamente, é bloqueado (com mensagem indicando quais domínios já foram importados).

### 7.3 Atomicidade

- **Batch write** do Firestore (até 500 operações).
- Se ultrapassar 500: dividir em chunks sequenciais.
- Se um chunk falhar: **cleanup** dos chunks anteriores (best-effort delete).
- Alternativa segura para imports muito grandes: criar um doc de "import job" com status `pending` → `in_progress` → `completed` / `failed`, e processar assincronamente. **Mas isso é overengineering para o estágio atual.**

### 7.4 Limite Prático

Com 10 domínios selecionados, o pior caso é ~500+ perguntas. Isso pode ultrapassar o limite de 500 writes do batch. Solução:

```
Total writes = 1 (study) + N (questions) + 1 (marketplace update)

Se N <= 498: single batch ✅
Se N > 498: chunked batches com cleanup on failure
```

Para v1, eu recomendo **limitar a 498 perguntas por import** e retornar erro se ultrapassar. Se isso for restritivo demais, implementar chunked batches na v2.

---

## 8. Segurança

### 8.1 Modelo de Ameaças

| # | Ameaça | Severidade | Mitigação |
|---|--------|:----------:|-----------|
| T1 | **Privilege Escalation** — user chama admin APIs | CRÍTICA | `withAdmin` middleware verifica `isAdmin()`. Firestore rules bloqueiam writes no marketplace. Defense-in-depth: duas camadas. |
| T2 | **IDOR** — user acessa/modifica study de outro user | ALTA | Todas as queries user-scoped usam `uid` do token (não do request body). Já existe no sistema. |
| T3 | **Enumeração do marketplace** — scraper raspa todas as perguntas | ALTA | Browse endpoint **NÃO retorna `correctOptionIndex` nem `explanation`** para users não-admin. Scraping guard existente aplicado. |
| T4 | **Import abuse** — user faz milhares de imports para inflar o Firestore | MÉDIA | Rate limit: max 5 imports/hora por user. Max 10 domínios por import. Max 498 perguntas por import. |
| T5 | **Content injection** — admin cria pergunta com XSS | MÉDIA | `safeString()` com `stripHtml()` já existe nos validators. Aplicar nos novos schemas do marketplace. |
| T6 | **Denial of Service** — admin cria study com 500 perguntas de 1MB cada | BAIXA | `maxBodySize` no middleware (1MB default). Zod schema limita tamanho dos campos. |
| T7 | **Data exfiltration via import** — user importa tudo e exporta | MÉDIA | Rate limiting nos imports. Não há API de export em bulk. Dados importados não têm `correctOptionIndex` nos endpoints de browse (mas sim no import — isso é necessário para o user estudar). |

### 8.2 Firestore Rules (Adições)

```
// Marketplace — read-only for authenticated users, no client writes
match /marketplace/studies/{studyId} {
    allow read: if request.auth != null;
    allow write: if false;  // Admin SDK bypasses rules
}

match /marketplace/questions/{questionId} {
    allow read: if request.auth != null;
    allow write: if false;
}
```

### 8.3 Rate Limits (Novos)

```typescript
// Em lib/constants.ts
export const MARKETPLACE_IMPORT_RATE_LIMIT = 5;        // max imports por hora
export const MARKETPLACE_IMPORT_RATE_WINDOW = 3_600_000; // 1 hora
export const MARKETPLACE_BROWSE_RATE_LIMIT = 60;        // max browse requests por minuto
export const MARKETPLACE_ADMIN_RATE_LIMIT = 30;         // max admin writes por minuto
```

### 8.4 Proteção de Conteúdo no Browse

**CRÍTICO:** O endpoint de browse (`GET /api/marketplace/studies/[studyId]/questions`) **NÃO deve retornar:**
- `correctOptionIndex`
- `explanation`

Esses campos são o **valor** do marketplace. Se expostos no browse, qualquer user pode ler todas as respostas sem importar.

**Exceção:** O import copia esses campos para o namespace do user (necessário para estudar).

---

## 9. Performance

### 9.1 Queries Pesadas e Otimizações

| Operação | Preocupação | Otimização |
|----------|-------------|------------|
| Listar studies do marketplace | N studies com domains embedded | Cache `Cache-Control: public, max-age=300` (5min). Marketplace muda raramente. |
| Listar questions para import | Potencialmente centenas | Paginação com cursor. Projection (select apenas campos necessários). Firestore index em `studyId + isActive + createdAt`. |
| Import (leitura) | Ler todas as perguntas dos domains selecionados | `array-contains-any` com max 10 domainIds (limit do Firestore). Single query. |
| Import (escrita) | Batch write de 500+ docs | Chunked batches de 498. Parallelizable se necessário (mas sequential é mais seguro). |
| Check idempotência | Query por `_source.marketplaceStudyId` | Requer índice em `_source.marketplaceStudyId` na collection `users/{uid}/studies`. |

### 9.2 Caching Strategy

```typescript
// Marketplace studies — pode ser cacheado agressivamente
// (muda apenas quando admin edita, que é raro)
res.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');

// Marketplace questions (browse) — cache moderado
res.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');

// User's personal data — sem mudança (já é private)
res.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=120');
```

### 9.3 Denormalization Strategy

| Campo | Onde | Por quê |
|-------|------|---------|
| `questionCount` | `MarketplaceStudy` | Evita count query no browse |
| `domainQuestionCounts` | `MarketplaceStudy` | Mostra "Domain X (45 perguntas)" sem query extra |
| `importCount` | `MarketplaceStudy` | Analytics / social proof |

Esses contadores são atualizados atomicamente via `FieldValue.increment()` quando admin cria/deleta perguntas.

### 9.4 O que NÃO fazer

- ❌ **Fan-out on write** — não notificar users quando o marketplace muda. Não há necessidade.
- ❌ **Full-text search** — Firestore não suporta nativamente. Para v1, filtro por tags é suficiente. Se precisar de busca avançada, considerar Algolia/Typesense futuramente.
- ❌ **Materialized views** — desnecessário com a denormalization strategy acima.

---

## 10. Plano por Fases

### Fase 0 — Refactors Necessários

**Objetivo:** Preparar a base para receber o marketplace sem quebrar nada.

| # | Task | Risco | Checklist |
|---|------|:-----:|-----------|
| 0.1 | Criar `withAdmin` middleware em `api-middleware.ts` | Baixo | ☐ Implementar `withAdmin` ☐ Usar `isAdmin()` existente ☐ `checkRevoked: true` obrigatório ☐ Testes |
| 0.2 | Adicionar campo `_source` como optional nos types existentes | Baixo | ☐ Adicionar `_source?: SourceMetadata` a `Study` ☐ Adicionar `_source?: SourceMetadata` a `Question` ☐ Garantir que `_source` é ignorado em code paths existentes |
| 0.3 | Criar novos Zod schemas para marketplace | Baixo | ☐ `createMarketplaceStudySchema` ☐ `marketplaceImportSchema` ☐ `marketplaceBulkQuestionsSchema` ☐ Testes de validação |
| 0.4 | Adicionar novas constantes | Baixo | ☐ Rate limits do marketplace ☐ Import limits |

**Risco da fase:** BAIXO. Nenhuma mudança breaking. Tudo é aditivo.

---

### Fase 1 — Banco (Firestore Setup)

**Objetivo:** Criar a estrutura de dados do marketplace no Firestore.

| # | Task | Risco | Checklist |
|---|------|:-----:|-----------|
| 1.1 | Atualizar Firestore rules com collections do marketplace | Médio | ☐ `marketplace/studies/{studyId}` — read: auth, write: false ☐ `marketplace/questions/{questionId}` — read: auth, write: false ☐ Deploy rules ☐ Testar que user não pode escrever ☐ Testar que Admin SDK bypassa |
| 1.2 | Adicionar índices compostos | Baixo | ☐ `marketplace/studies`: `isActive` + `createdAt` ☐ `marketplace/questions`: `studyId` + `isActive` + `createdAt` ☐ `marketplace/questions`: `studyId` + `isActive` + `difficulty` ☐ Deploy indexes |
| 1.3 | Adicionar index de rastreabilidade | Baixo | ☐ `users/{uid}/studies`: `_source.type` + `_source.marketplaceStudyId` (para check de idempotência) |
| 1.4 | Definir types TypeScript | Baixo | ☐ `MarketplaceStudy` em `types/index.ts` ☐ `MarketplaceQuestion` em `types/index.ts` ☐ `SourceMetadata` em `types/index.ts` ☐ `ImportResult` em `types/index.ts` |

**Risco da fase:** MÉDIO. Firestore rules mal configuradas podem bloquear funcionalidade existente. Testar rules em emulator antes do deploy.

---

### Fase 2 — APIs

**Objetivo:** Implementar todas as rotas do marketplace.

| # | Task | Risco | Checklist |
|---|------|:-----:|-----------|
| 2.1 | Criar `marketplace-service.ts` | Médio | ☐ CRUD Studies ☐ CRUD Questions ☐ Bulk create questions ☐ List/Get operations ☐ Denormalized counters ☐ Soft-delete |
| 2.2 | Criar admin routes | Médio | ☐ `POST /api/marketplace/studies` ☐ `PUT /api/marketplace/studies/[studyId]` ☐ `DELETE /api/marketplace/studies/[studyId]` ☐ `POST /api/marketplace/studies/[studyId]/questions` ☐ `PUT /api/marketplace/questions/[questionId]` ☐ `DELETE /api/marketplace/questions/[questionId]` ☐ `POST /api/marketplace/questions` (bulk) ☐ Todas protegidas com `withAdmin` |
| 2.3 | Criar browse routes | Baixo | ☐ `GET /api/marketplace/studies` ☐ `GET /api/marketplace/studies/[studyId]` ☐ `GET /api/marketplace/studies/[studyId]/questions` ☐ Strip `correctOptionIndex` + `explanation` no browse ☐ Scraping guard no browse ☐ Cache headers |
| 2.4 | Adicionar rate limiting | Baixo | ☐ Browse: 60/min ☐ Admin: 30/min ☐ Import: 5/hour |

**Risco da fase:** MÉDIO. A bulk create pode ter edge cases com Firestore batch limits.

---

### Fase 3 — Importação

**Objetivo:** Implementar o core: importação de marketplace → personal.

| # | Task | Risco | Checklist |
|---|------|:-----:|-----------|
| 3.1 | Implementar import no `marketplace-service.ts` | ALTO | ☐ Validar domainIds contra study ☐ Check idempotência (block + inform) ☐ Fetch questions por domainIds (array-contains-any) ☐ Deduplicate questions ☐ Criar study pessoal com `_source` ☐ Criar questions pessoais com `_source` ☐ Filtrar domainIds nas questions para apenas os selecionados ☐ Batch write (chunked se > 498) ☐ Increment `importCount` no marketplace ☐ Increment `questionCount` no study pessoal ☐ Retornar resultado |
| 3.2 | Criar import route | Médio | ☐ `POST /api/marketplace/import` ☐ `withAuth` (não `withAdmin`) ☐ Rate limit: 5/hour ☐ Validação com `marketplaceImportSchema` |
| 3.3 | Implementar cleanup on failure | Médio | ☐ Se batch falhar parcialmente, deletar docs já criados ☐ Log error com contexto para debugging |
| 3.4 | Hook e UI para importação | Médio | ☐ `useMarketplace.ts` hook ☐ Tela de browse ☐ Domain selection UI ☐ Import confirmation dialog ☐ Loading states ☐ Error handling |

**Risco da fase:** ALTO. A importação é o core e tem mais edge cases:
- Questions com domainIds que incluem domains não-selecionados
- Batch size > 500
- Race condition se 2 imports simultâneos do mesmo user
- Firestore transaction limits

---

### Fase 4 — Hardening

**Objetivo:** Tornar o sistema robusto para produção.

| # | Task | Risco | Checklist |
|---|------|:-----:|-----------|
| 4.1 | Scraping guard no browse | Baixo | ☐ Aplicar `checkScrapingSignals` nos endpoints de browse ☐ Fingerprint + burst detection |
| 4.2 | Concurrency guard no import | Médio | ☐ Usar rate limit key `import-active:{uid}` para prevenir imports simultâneos ☐ Ou usar Firestore transaction no check de idempotência |
| 4.3 | Monitoring / Logging | Baixo | ☐ Log import events (studyId, domainIds, questionCount, duration) ☐ Log admin CRUD events ☐ Alertas se importCount de um study crescer anormalmente |
| 4.4 | Validar integridade | Baixo | ☐ Script para verificar que `questionCount` denormalizado está correto ☐ Script para verificar `domainQuestionCounts` |

**Risco da fase:** BAIXO. Melhorias incrementais.

---

### Fase 5 — Testes

**Objetivo:** Garantir que tudo funciona e continua funcionando.

| # | Task | Risco | Checklist |
|---|------|:-----:|-----------|
| 5.1 | Unit tests — marketplace-service | Baixo | ☐ CRUD studies ☐ CRUD questions ☐ Bulk create ☐ Denormalized counters ☐ Soft-delete |
| 5.2 | Unit tests — import | Médio | ☐ Happy path (import completo) ☐ Idempotência (block on duplicate domains) ☐ Partial domains (import apenas alguns) ☐ Large import (> 498 questions) ☐ Invalid domainIds ☐ Inactive study ☐ Empty questions for selected domains |
| 5.3 | Unit tests — auth/admin | Baixo | ☐ `withAdmin` rejects non-admin ☐ `withAdmin` allows admin ☐ Admin endpoints reject regular users |
| 5.4 | Integration tests | Médio | ☐ Full flow: admin create → user browse → user import → user sees data ☐ Import then edit → marketplace unchanged ☐ Import same study twice → ConflictError ☐ Import different domains from same study → success |
| 5.5 | Security tests | Baixo | ☐ Non-admin cannot POST/PUT/DELETE marketplace ☐ Browse does not expose correctOptionIndex ☐ Rate limits work ☐ IDOR: user cannot read another user's imported data |

**Risco da fase:** BAIXO (testes não quebram prod).

---

## 11. Estratégia de Testes

### 11.1 Abordagem

O projeto já usa **Vitest** com mocks do Firebase Admin SDK (evidenciado pelos arquivos em `lib/__tests__/`). A mesma abordagem se aplica:

```typescript
// Exemplo de teste para marketplace-service

describe('marketplace-service', () => {
    describe('importFromMarketplace', () => {
        it('should create study and questions in user namespace', async () => {
            // Arrange: mock marketplace study + questions
            // Act: call importFromMarketplace
            // Assert: verify batch.set calls with correct data + _source metadata
        });

        it('should block reimport of same domains', async () => {
            // Arrange: mock existing study with _source.importedDomainIds = ['d1']
            // Act: try to import with domainIds = ['d1']
            // Assert: throws ConflictError
        });

        it('should allow importing different domains from same study', async () => {
            // Arrange: mock existing study with _source.importedDomainIds = ['d1']
            // Act: import with domainIds = ['d2']
            // Assert: success
        });

        it('should filter question domainIds to only selected domains', async () => {
            // Arrange: question with domainIds = ['d1', 'd2', 'd3']
            // Act: import with selectedDomainIds = ['d1', 'd3']
            // Assert: imported question has domainIds = ['d1', 'd3']
        });

        it('should strip marketplace-only fields from imported questions', async () => {
            // Assert: imported questions don't have isActive, createdBy
        });
    });
});
```

### 11.2 Pirâmide de Testes

```
            /  E2E  \          ← Manual / Playwright (future)
           /─────────\
          / Integration\       ← Full flow com Firestore emulator
         /──────────────\
        /   Unit Tests    \    ← Vitest com mocks (a maioria)
       /───────────────────\
```

---

## 12. Riscos

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|-------|:------------:|:-------:|-----------|
| R1 | Import de >498 questions falha parcialmente | Média | Alto | Chunked batches com cleanup. Ou limitar a 498 na v1. |
| R2 | Firestore costs explodem com imports massivos | Baixa | Médio | Rate limit de imports. Monitor no Firebase console. Cada import = N+2 writes (barato, mas monitorar). |
| R3 | Admin cria study mal-formado que quebra o import | Média | Alto | Validação rigorosa nos Zod schemas. Testes do fluxo admin → import. |
| R4 | Race condition: 2 imports simultâneos criam study duplicado | Baixa | Médio | Rate limit + concurrency guard (`import-active:{uid}`). |
| R5 | Firestore index not ready quando deploy | Média | Médio | Criar indexes ANTES de deployar o código. Indexes podem levar minutos para construir. |
| R6 | `_source` field conflita com futuras features | Baixa | Baixo | Prefixo `_` indica campo interno. Namespace objeto previne colisões. |
| R7 | Denormalized counters ficam dessincronizados | Média | Baixo | Script de reconciliação periódico. Counters são informativos, não críticos. |

---

## 13. Perguntas para o Owner

Antes de implementar, preciso de decisões sobre:

### P1 — Limite de perguntas por import
> Se um import resultar em mais de 498 perguntas (Firestore batch limit - 2), o que fazer?
>
> - **Opção A:** Retornar erro "Too many questions, select fewer domains"
> - **Opção B:** Implementar chunked batches (mais complexo, mais robusto)
>
> **Minha recomendação:** Opção A para v1. Se for restritivo demais, mudar para B depois.

### P2 — Browse mostra questions ou apenas domínios?
> O user no browse precisa ver as perguntas antes de importar?
>
> - **Se sim:** Precisa de endpoint de browse de questions (sem respostas). Risco de scraping.
> - **Se não:** Browse mostra apenas Study + Domains com contadores. Mais simples e seguro.
>
> **Minha recomendação:** Mostrar apenas domínios com contadores na v1. "Equação 1º grau — 45 perguntas". Sem preview de questions.

### P3 — Reimport parcial (domínios novos no mesmo study)
> Se o user já importou domínios A e B, e agora quer importar C e D do mesmo study:
>
> - **Opção A:** Criar um NOVO study pessoal com apenas domínios C e D
> - **Opção B:** Adicionar domínios C e D ao study existente
>
> **Minha recomendação:** Opção A. Simples, sem mutação do study existente. O user pode renomear o study se quiser.

### P4 — O admin usa a mesma UI do user ou uma UI separada?
> Para criar estudos/domínios/perguntas do marketplace, o admin:
>
> - **Opção A:** Usa a mesma tela de criação existente, com um toggle "Publicar no marketplace"
> - **Opção B:** Tem uma área `/admin/marketplace` separada
>
> **Minha recomendação:** Opção B. Separação clara, sem risco de acidentalmente publicar dados pessoais.

### P5 — Notificação de updates
> Se o admin atualiza perguntas no marketplace depois que users importaram:
>
> - Users que já importaram **NÃO recebem a atualização** (by design).
> - Isso está ok?
>
> **Minha recomendação:** Sim, é o correto. Import = snapshot no tempo. Se precisar de sync, é outro feature (muito mais complexo).

### P6 — Tags / Categorias para busca no marketplace
> O `MarketplaceStudy` tem `tags[]`. Isso é suficiente para busca?
> Ou precisa de categorias hierárquicas (ex: "Tecnologia > Cloud > AWS")?
>
> **Minha recomendação:** Tags flat para v1. Categorias hierárquicas são overengineering sem evidência de necessidade.

### P7 — Firestore collection path
> O path `marketplace/studies/{studyId}` implica que `marketplace` é um **document** e `studies` é uma **subcollection**.
> O Firestore exige que subcollections estejam sob um document.
>
> **Opção A:** `marketplace` doc (pode ser vazio) → `marketplace/config` (dummy doc) → subcollection `studies`
> Path: `marketplace/config/studies/{studyId}`
>
> **Opção B:** Top-level collections com prefixo:
> `marketplace_studies/{studyId}` e `marketplace_questions/{questionId}`
>
> **Opção C:** Top-level collection sem prefixo mas com nomes distintos:
> `catalogStudies/{studyId}` e `catalogQuestions/{questionId}`
>
> **Minha recomendação:** Opção B. Simples, flat, sem nesting. `marketplace_studies` e `marketplace_questions` como top-level collections. Mais performático no Firestore (top-level collections têm melhor locality).

---

## Apêndice A — Novos Arquivos

```
src/
├── services/
│   └── marketplace-service.ts           ← NOVO: Business logic do marketplace
├── types/
│   └── index.ts                         ← EDITADO: Novos types (MarketplaceStudy, etc.)
├── lib/
│   ├── api-middleware.ts                ← EDITADO: withAdmin helper
│   ├── constants.ts                     ← EDITADO: Novas constantes
│   ├── errors.ts                        ← EDITADO: MarketplaceStudyNotFoundError, etc.
│   ├── validators.ts                    ← EDITADO: Novos Zod schemas
│   └── __tests__/
│       └── marketplace-service.test.ts  ← NOVO: Testes
├── hooks/
│   └── useMarketplace.ts               ← NOVO: SWR hooks para browse + import
├── app/
│   └── api/
│       └── marketplace/
│           ├── studies/
│           │   ├── route.ts             ← NOVO: GET (browse) + POST (admin)
│           │   └── [studyId]/
│           │       ├── route.ts         ← NOVO: GET + PUT + DELETE
│           │       └── questions/
│           │           └── route.ts     ← NOVO: GET (browse) + POST (admin)
│           ├── questions/
│           │   ├── route.ts             ← NOVO: POST bulk (admin)
│           │   └── [questionId]/
│           │       └── route.ts         ← NOVO: PUT + DELETE (admin)
│           └── import/
│               └── route.ts             ← NOVO: POST (user import)
```

## Apêndice B — Estimativa de Esforço

| Fase | Estimativa | Dependências |
|------|:----------:|:------------:|
| Fase 0 — Refactors | 2-3 horas | Nenhuma |
| Fase 1 — Banco | 1-2 horas | Fase 0 |
| Fase 2 — APIs | 6-8 horas | Fase 1 |
| Fase 3 — Importação | 4-6 horas | Fase 2 |
| Fase 4 — Hardening | 2-3 horas | Fase 3 |
| Fase 5 — Testes | 4-6 horas | Fase 3 |
| **Total** | **~20-28 horas** | |

---

*Documento gerado por análise automatizada do repositório EduFlow. Todas as referências a código existente foram verificadas contra o codebase real.*

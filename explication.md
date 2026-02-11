# EduFlow API Documentation (v2)

> Documentação completa dos endpoints do sistema de estudos.  
> Acesso requer autenticação via cookie `__session` (Firebase Session Cookie).

---

## Autenticação & Segurança

| Mecanismo | Descrição |
|-----------|-----------|
| **Session Cookie** | Todo request deve incluir `Cookie: __session=<firebase-session-cookie>` |
| **CSRF Protection** | Métodos mutativos (POST, PUT, PATCH, DELETE) requerem `Content-Type: application/json` |
| **Content Protection** | `correctOptionIndex`, `explanation` e `whyOthersWrong` **nunca** aparecem em respostas de listagem |
| **Scraping Guard** | Endpoints sensíveis possuem fingerprinting + burst detection (429 em caso de abuso) |
| **Rate Limiting** | Firestore-backed rate limiter com TTL auto-cleanup |
| **User Scoping** | Todas as leituras do cliente são restritas a `users/{uid}/*` |
| **Writes** | Apenas server-side via Admin SDK (nenhuma escrita direta do cliente) |

---

## Studies CRUD

### GET /api/studies — Listar estudos

Retorna todos os estudos do usuário autenticado.

```json
// Resposta 200
{
  "data": [
    {
      "id": "abc123",
      "abbreviation": "CISSP",
      "name": "Certified Information Systems Security Professional",
      "domains": [
        { "id": "d1", "abbreviation": "SAM", "name": "Security and Risk Management", "order": 0 }
      ],
      "questionCount": 150,
      "examCount": 5,
      "createdAt": "2026-02-01T00:00:00Z",
      "updatedAt": "2026-02-10T00:00:00Z"
    }
  ]
}
```

### POST /api/studies — Criar estudo

```jsonc
// Request body
{
  "abbreviation": "CISSP",             // string, 1–20 chars
  "name": "Certified Information...",  // string, 2–200 chars
  "domains": [                         // array, 1–30 itens
    {
      "id": "d1",                      // string, 1–20 chars
      "abbreviation": "SAM",           // string, min 1 char
      "name": "Security and Risk Management",
      "order": 0                       // integer, min 0
    }
  ]
}
```

```json
// Resposta 201
{ "data": { "id": "abc123" } }
```

### GET /api/studies/[studyId] — Buscar estudo

```json
// Resposta 200
{ "data": { "id": "abc123", "abbreviation": "CISSP", "name": "...", "domains": [...], ... } }
```

### PUT /api/studies/[studyId] — Atualizar estudo

Aceita partial update (qualquer subconjunto dos campos de criação).

### DELETE /api/studies/[studyId] — Deletar estudo

Deleta o estudo **e** todas as perguntas e exames associados (cascade).

```json
// Resposta 200
{ "data": { "deletedQuestions": 150, "deletedExams": 5 } }
```

---

## Questions CRUD

### GET /api/questions — Listar perguntas

**⚠️ Campos sensíveis removidos** (`correctOptionIndex`, `explanation`, `whyOthersWrong`).  
**🔒 Protegido por Scraping Guard** (30 req/min, 200 req/hr).

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `studyId` | string | Filtra por estudo (recomendado) |
| `domainIds` | string | IDs separados por vírgula, ex: `d1,d2` |
| `difficulty` | string | `easy`, `medium`, `hard`, ou `all` |
| `search` | string | Busca textual no enunciado, explicação e tags |
| `cursor` | string | ID do último item da página anterior |
| `limit` | number | Itens por página (1–200, default: 100) |

```json
// Resposta 200
{
  "data": [
    {
      "id": "q1",
      "studyId": "abc123",
      "domainIds": ["d1", "d3"],
      "text": "Which of the following...",
      "options": [
        { "label": "A", "text": "First option" },
        { "label": "B", "text": "Second option" },
        { "label": "C", "text": "Third option" },
        { "label": "D", "text": "Fourth option" },
        { "label": "E", "text": "Fifth option" }
      ],
      "difficulty": "medium",
      "tags": ["access-control"]
    }
  ],
  "nextCursor": "q2_id_or_null"
}
```

### POST /api/questions — Criar pergunta

```jsonc
{
  "studyId": "abc123",                // string, required
  "domainIds": ["d1", "d3"],          // string[], 1–10 itens
  "text": "Which of the following best describes...?",  // string, min 10 chars
  "options": [                         // array, 4–5 itens
    { "label": "A", "text": "First option" },
    { "label": "B", "text": "Second option" },
    { "label": "C", "text": "Third option" },
    { "label": "D", "text": "Fourth option" }
  ],
  "correctOptionIndex": 1,            // integer, 0–4
  "explanation": "The correct answer is B because...",  // string, min 10 chars
  "whyOthersWrong": "A is wrong because...", // string | null (opcional)
  "difficulty": "medium",             // "easy" | "medium" | "hard"
  "tags": ["access-control"]          // string[] (default: [])
}
```

```json
// Resposta 201
{ "data": { "id": "q1" } }
```

> O campo `questionCount` do estudo é incrementado automaticamente.

### GET /api/questions/[questionId] — Buscar pergunta (com resposta)

Retorna **todos** os campos, incluindo `correctOptionIndex` e `explanation`.  
Usado apenas para edição.

### PUT /api/questions/[questionId] — Atualizar pergunta

Aceita partial update (qualquer subconjunto dos campos de criação).

### DELETE /api/questions/[questionId] — Deletar pergunta

Decrementa o `questionCount` do estudo associado.

### POST /api/questions/import — Importação em massa

```jsonc
{
  "questions": [
    // Array de perguntas no mesmo formato de POST /api/questions
    // min: 1, max: 500 — operação atômica via WriteBatch
  ]
}
```

```json
// Resposta 201
{ "data": { "imported": 2, "ids": ["q1", "q2"] } }
```

---

## Exams

### POST /api/exams — Criar exame

```jsonc
{
  "studyId": "abc123",           // string, required
  "questionCount": 25,           // 10 | 25 | 50 | 100 | 150
  "timeLimitMinutes": 60,        // integer, 0 = sem tempo
  "domainIds": ["d1", "d2"],     // string[] (vazio = todos)
  "difficulty": "all",           // "easy" | "medium" | "hard" | "all"
  "mode": "practice"             // ExamMode (ver tabela abaixo)
}
```

**Modos de exame (`ExamMode`):**

| Modo | Estratégia de seleção |
|------|-----------------------|
| `practice` | Seleção aleatória de todos os domínios |
| `weak_domains` | Prioriza domínios com score < 70% |
| `missed_topics` | Prioriza questões erradas recentemente |
| `real_mix` | Distribuição proporcional ao blueprint real |
| `domain_focus` | Filtra apenas pelos `domainIds` especificados |

```json
// Resposta 201
{
  "data": {
    "id": "exam1",
    "studyId": "abc123",
    "status": "in_progress",
    "config": { ... },
    "questions": [
      // Perguntas SEM correctOptionIndex, explanation, whyOthersWrong
    ]
  }
}
```

### GET /api/exams?studyId=X — Listar exames

### GET /api/exams/[examId] — Buscar exame

Exames `in_progress` NÃO retornam `questionIds` (anti-cheating).

### PATCH /api/exams/[examId] — Salvar resposta

```json
{ "questionId": "q1", "selectedOptionIndex": 2 }
```

### POST /api/exams/[examId]/submit — Submeter exame

Calcula score, domain scores, atualiza streak/badges.

```json
// Resposta 200
{
  "data": {
    "examId": "exam1",
    "score": 84,
    "domainScores": { "d1": { "domainId": "d1", "domain": "SAM", "correct": 8, "total": 10, "percentage": 80 } },
    "totalQuestions": 25,
    "correctAnswers": 21
  }
}
```

### POST /api/exams/[examId]/abandon — Abandonar exame

### GET /api/exams/[examId]/review — Revisão pós-exame

**🔒 Protegido por Scraping Guard** (10 req/min, 60 req/hr — threshold reduzido).  
Disponível **apenas** para exames `completed`. Retorna `correctOptionIndex`, `explanation`, e `whyOthersWrong`.

### GET /api/exams/in-progress?studyId=X — Exame em andamento

Retorna o exame `in_progress` do usuário (se existir) para resume.

---

## Analytics

### GET /api/analytics?studyId=X — Análises do estudo

Retorna statistics scoped a um estudo específico.

---

## Retention (Stats, Goals, Badges, Daily Challenge)

### GET /api/stats — Obter stats de retenção

```json
{
  "data": {
    "currentStreak": 7,
    "longestStreak": 14,
    "lastActiveDate": "2026-02-11",
    "totalQuestionsAnswered": 250,
    "totalExamsCompleted": 10,
    "dailyGoal": 10,
    "badges": ["first_exam", "streak_7"],
    "recentDays": [
      { "date": "2026-02-11", "questionsAnswered": 12, "correctAnswers": 9, "examsCompleted": 1 }
    ]
  }
}
```

### PUT /api/stats — Atualizar meta diária

```json
// Request body
{ "dailyGoal": 15 }  // integer, 1–200
```

### GET /api/daily-challenge?studyId=X — Desafio diário

Retorna 5 perguntas dos domínios mais fracos do usuário. Cacheado por dia.

```json
{
  "data": {
    "questions": [/* sem correctOptionIndex, explanation, whyOthersWrong */],
    "date": "2026-02-11"
  }
}
```

### GET /api/share-image?studyId=X — Imagem compartilhável

Retorna uma **imagem PNG** (1200×630) com o progresso do estudo.  
Content-Type: `image/png`. Gerado via `next/og` (ImageResponse).

Conteúdo da imagem:
- Nome do estudo
- Streak (dias consecutivos)
- Precisão (%)
- Badges ganhos
- Progresso da meta diária

---

## Badges

| Badge ID | Condição |
|----------|----------|
| `first_exam` | Completar o primeiro exame |
| `streak_3` | Streak de 3 dias |
| `streak_7` | Streak de 7 dias |
| `streak_30` | Streak de 30 dias |
| `perfect_score` | 100% em qualquer exame |
| `centurion` | 100 perguntas respondidas |
| `domain_master` | ≥90% em todos os domínios de um estudo |

Badges são calculados server-side no submit do exame. Idempotente — adicionados apenas se não existirem.

---

## Respostas de Erro

| Status | Body | Causa |
|:------:|------|-------|
| `400` | `{ "error": "Validation failed", "details": { ... } }` | Body não passa na validação Zod |
| `401` | `{ "error": "Unauthorized" }` | Cookie `__session` ausente ou inválido |
| `404` | `{ "error": "Not found", "code": "STUDY_NOT_FOUND" }` | Recurso não encontrado |
| `415` | `{ "error": "Content-Type must be application/json" }` | CSRF protection — Content-Type inválido |
| `429` | `{ "error": "Too many requests. Please slow down." }` | Scraping guard ou rate limiter ativado |
| `500` | `{ "error": "Internal server error" }` | Erro inesperado |

---

## Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow write: if false;

      match /studies/{studyId} {
        allow read: if request.auth != null && request.auth.uid == uid;
        allow write: if false;
      }
      match /questions/{questionId} {
        allow read: if request.auth != null && request.auth.uid == uid;
        allow write: if false;
      }
      match /exams/{examId} {
        allow read: if request.auth != null && request.auth.uid == uid;
        allow write: if false;
      }
      match /stats/{doc} {
        allow read: if request.auth != null && request.auth.uid == uid;
        allow write: if false;
      }
    }
    match /_rateLimits/{doc} {
      allow read, write: if false;
    }
  }
}
```

---

## Firestore Indexes Necessários

| Collection | Campos | Propósito |
|------------|--------|-----------|
| `questions` | `studyId` ASC, `createdAt` DESC | Listar perguntas por estudo |
| `questions` | `studyId` ASC, `difficulty` ASC | Filtrar por dificuldade |
| `questions` | `studyId` ASC, `difficulty` ASC, `createdAt` DESC | Filtro combinado |
| `exams` | `studyId` ASC, `startedAt` DESC | Listar exames por estudo |
| `exams` | `status` ASC, `startedAt` DESC | Encontrar exame em andamento |
| `exams` | `studyId` ASC, `status` ASC, `startedAt` DESC | Filtro combinado |

---

## Operações Firestore

| Endpoint | Reads | Writes |
|----------|-------|--------|
| `POST /api/questions` | 1 auth | 1 doc write + 1 counter update |
| `POST /api/questions/import` | 1 auth | 1 batch write (até 500 docs + counters) |
| `POST /api/exams` | 1 auth + pool query | 1 exam doc + question reads |
| `POST /api/exams/[id]/submit` | 1 auth + 1 exam | 1 exam update + 1 stats update |
| `DELETE /api/studies/[id]` | 1 auth + 1 study | batch deletes (questions + exams + study) |

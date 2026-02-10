# Question Management API

> Endpoints para criação e importação em massa de perguntas no banco de questões.  
> Acesso restrito a administradores — requer `ADMIN_UID` configurado no servidor.

---

## POST /api/questions — Criar Pergunta

Cria uma única pergunta no banco.

### Endpoint

```
POST /api/questions
```

**Autenticação:** Cookie `__session` (admin only)  
**Autorização:** `uid === ADMIN_UID` — retorna `403` para usuários comuns

### Headers

| Header | Valor | Obrigatório |
|--------|-------|:-----------:|
| `Content-Type` | `application/json` | ✅ |
| `Cookie` | `__session=<firebase-session-cookie>` | ✅ |

### JSON Schema

```jsonc
{
  "certification": "CISSP",         // enum: CISSP | CC | SSCP | CCSP | CGRC
  "domain": "Security and Risk Management",  // string, min 1 char
  "domainNumber": 1,                // integer 1–8
  "text": "Which of the following best describes...?",  // string, min 10 chars
  "options": [                      // array — exatamente 4 itens
    { "label": "A", "text": "First option" },
    { "label": "B", "text": "Second option" },
    { "label": "C", "text": "Third option" },
    { "label": "D", "text": "Fourth option" }
  ],
  "correctOptionIndex": 1,          // integer 0–3 (B neste exemplo)
  "explanation": "The correct answer is B because...",  // string, min 10 chars
  "difficulty": "medium",           // enum: easy | medium | hard
  "tags": ["access-control"]        // string[] (default: [])
}
```

### Regras de Validação

| Campo | Tipo | Restrição |
|-------|------|-----------|
| `certification` | `string` | `CISSP` \| `CC` \| `SSCP` \| `CCSP` \| `CGRC` |
| `domain` | `string` | `min(1)` — nome do domínio por extenso |
| `domainNumber` | `integer` | `1 ≤ n ≤ 8` |
| `text` | `string` | `min(10)` — enunciado da pergunta |
| `options` | `array` | Exatamente **4 itens**, cada um com `label` e `text` não vazios |
| `correctOptionIndex` | `integer` | `0 ≤ n ≤ 3` — índice da resposta correta |
| `explanation` | `string` | `min(10)` — explicação da resposta |
| `difficulty` | `string` | `easy` \| `medium` \| `hard` |
| `tags` | `string[]` | Opcional, default `[]` |

### Resposta de Sucesso — `201 Created`

```json
{
  "data": {
    "id": "aB3cD4eF5gH6iJ7k"
  }
}
```

> O servidor adiciona `createdAt` e `updatedAt` automaticamente via `FieldValue.serverTimestamp()`.

---

## POST /api/questions/import — Importação em Massa

Importa até **500 perguntas** em uma única operação atômica via Firestore `WriteBatch`.

### Endpoint

```
POST /api/questions/import
```

**Autenticação:** Cookie `__session` (admin only)  
**Atomicidade:** Todas as perguntas são salvas ou nenhuma (batch commit)

### JSON Schema

```jsonc
{
  "questions": [
    {
      "certification": "CISSP",
      "domain": "Security and Risk Management",
      "domainNumber": 1,
      "text": "Which of the following best describes the principle of least privilege?",
      "options": [
        { "label": "A", "text": "Users receive the maximum access level by default" },
        { "label": "B", "text": "Users receive only the minimum access necessary to perform their duties" },
        { "label": "C", "text": "All users share the same access level for simplicity" },
        { "label": "D", "text": "Access is granted based on seniority within the organization" }
      ],
      "correctOptionIndex": 1,
      "explanation": "The principle of least privilege dictates that users should only have the minimum level of access required to perform their job functions, reducing the attack surface.",
      "difficulty": "medium",
      "tags": ["access-control", "least-privilege"]
    },
    {
      "certification": "CISSP",
      "domain": "Asset Security",
      "domainNumber": 2,
      "text": "What is the primary purpose of data classification in an organization?",
      "options": [
        { "label": "A", "text": "To reduce storage costs" },
        { "label": "B", "text": "To determine the level of protection each data asset requires" },
        { "label": "C", "text": "To comply with open data regulations" },
        { "label": "D", "text": "To make all data publicly available" }
      ],
      "correctOptionIndex": 1,
      "explanation": "Data classification helps organizations identify the sensitivity and value of data assets, ensuring appropriate security controls are applied based on the classification level.",
      "difficulty": "medium",
      "tags": ["data-classification", "asset-security"]
    }
  ]
}
```

### Regras de Validação

| Regra | Detalhe |
|-------|---------|
| Array `questions` | `min(1)`, `max(500)` |
| Cada pergunta | Mesmas regras de `POST /api/questions` (schema idêntico) |
| Limite Firestore | WriteBatch suporta no máximo 500 operações |

### Resposta de Sucesso — `201 Created`

```json
{
  "data": {
    "imported": 2,
    "ids": [
      "aB3cD4eF5gH6iJ7k",
      "lM8nO9pQ0rS1tU2v"
    ]
  }
}
```

---

## Respostas de Erro (ambos endpoints)

| Status | Body | Causa |
|:------:|------|-------|
| `400` | `{ "error": "Validation failed", "details": { ... } }` | Corpo não passa na validação Zod |
| `401` | `{ "error": "Unauthorized" }` | Cookie `__session` ausente ou inválido |
| `403` | `{ "error": "Forbidden" }` | Usuário autenticado não é admin |
| `500` | `{ "error": "Internal server error" }` | Erro do Firestore ou exceção não tratada |

---

## Operações Firestore

```
POST /api/questions        →  1 auth read + 1 doc write
POST /api/questions/import →  1 auth read + 1 batch write (até 500 docs)
```

> O batch write é atômico — se qualquer documento falhar na escrita, nenhum é salvo. IDs são gerados automaticamente pelo Firestore (`db.collection('questions').doc()`).

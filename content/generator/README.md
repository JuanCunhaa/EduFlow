# Gerador de Questões — 100% IA

Gera questões de prova em massa usando Groq (grátis) ou OpenAI. Roda via `npx tsx`, fora do build/dev.

## Setup

```bash
# Para Groq (grátis): https://console.groq.com/keys
$env:GROQ_API_KEY="gsk_..."

# Para OpenAI (opcional):
$env:OPENAI_API_KEY="sk-..."
```

## Comandos

### Gerar questões

```bash
# Gerar 10 questões por domínio para TODOS os domínios do CISSP
npx tsx content/generator/generate.ts --cert cissp --count 10

# Só um domínio específico
npx tsx content/generator/generate.ts --cert cissp --domain sam --count 10

# Em português
npx tsx content/generator/generate.ts --cert cissp --count 10 --lang pt-BR

# Qualquer certificação (IA descobre os domínios sozinha)
npx tsx content/generator/generate.ts --cert "CISM" --count 10
npx tsx content/generator/generate.ts --cert "AWS Cloud Practitioner" --count 5 --lang es


# Usar OpenAI (GPT-4)
npx tsx content/generator/generate.ts --cert cissp --count 10 --model gpt-4

# Ver o prompt sem chamar a API
### 🤖 Recommended Models

| Model | Type | Speed | Cost | Best For |
| :--- | :--- | :--- | :--- | :--- |
| **`gpt-4o-mini`** | Fast | ⚡⚡⚡ | 💲 | **Speed & Budget** (Drafting, bulk gen) |
| **`gpt-4o`** | Smart | ⚡⚡ | 💲💲 | **Quality** (Final polish, complex topics) |
| **`gpt-5-nano`** / `o1` | Reasoning | 🐢 | 💲💲 | **Deep Logic** (Math, coding, complex scenarios) |
| **`llama-3.3-70b`** | Groq | ⚡⚡⚡ | 🆓 | **Free** (High performance, limited rate) |

> **Note**: Reasoning models (`gpt-5`, `o1`) take 1-2 minutes to "think" before responding. Use `gpt-4o-mini` if you want instant results.

### 🛠️ Usage

| Flag | O que faz | Padrão |
|------|-----------|--------|
| `--cert` | Nome do certificado (qualquer um) | Obrigatório |
| `--domain` | ID ou número do domínio (omitir = todos) | todos |
| `--count` | Questões por domínio (1-30) | 10 |
| `--lang` | Idioma das questões (en, pt-BR, es, fr, de, ja...) | en |
| `--model` | Modelo Groq ou OpenAI (`gpt-*`) | llama-3.3-70b-versatile |
| `--temperature` | Temperatura do LLM | 0.7 |
| `--dry-run` | Mostra prompt sem chamar API | false |

### Importar no marketplace

```bash
# Um arquivo
npx tsx content/generator/import-to-marketplace.ts --file content/cissp/domain-1-sam/batch-001.json --study-id ID_DO_STUDY

# Todos os batches de um diretório
npx tsx content/generator/import-to-marketplace.ts --dir content/cissp/domain-1-sam --study-id ID_DO_STUDY

# Só validar, sem escrever no Firestore
npx tsx content/generator/import-to-marketplace.ts --dir content/cissp --study-id ID_DO_STUDY --dry-run
```

Requer `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY` no `.env.local`.

## Novo recurso: metadata do estudo

Ao gerar questões, é criado automaticamente um arquivo JSON com os metadados do estudo (ex: cissp-study.json, enem-study.json), contendo:
- Certificação
- Domínios/temas
- Idioma
- Data

Esse arquivo pode ser usado para criar um novo study via API ou para reutilizar os domínios em futuras gerações.

## Gerar questões e salvar metadata

```bash
npx tsx content/generator/generate.ts --cert ENEM --count 10 --lang pt-BR
# Vai criar batches e também content/enem/enem-study.json
```

## Reutilizar domínios de um estudo existente

(Em breve: será possível passar --study-file content/enem/enem-study.json para gerar novos batches usando os mesmos domínios.)

## Importar para marketplace

```bash
npx tsx content/generator/import-to-marketplace.ts --dir content/enem --study-id ID_DO_STUDY
```

## Certs já embutidos (sem API extra)

`cissp`, `cc`, `sscp`, `ccsp`, `security+` (aliases: `sec+`, `securityplus`, `sy0-701`)

Qualquer outro nome → IA descobre domínios automaticamente (+1 chamada).

## Fluxo completo

```bash
$env:GROQ_API_KEY="gsk_..."

# 1. Gera (80 questões CISSP em ~20s)
npx tsx content/generator/generate.ts --cert cissp --count 10 --lang pt-BR

# 2. Revisa os arquivos em content/cissp/domain-*/

# 3. Importa
npx tsx content/generator/import-to-marketplace.ts --dir content/cissp/domain-1-sam --study-id MEU_STUDY_ID
```

## Dicas

- `--count 10` é o sweet spot (mais = mais alucinação)
- `--dry-run` pra ver o prompt antes de gastar tokens
- Questões inválidas são removidas automaticamente do batch
- Cada batch salva qual modelo e idioma foi usado no metadata

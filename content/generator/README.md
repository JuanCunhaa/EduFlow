# Gerador de Questões — 100% IA

Gera questões de prova em massa usando OpenAI. Roda via `npx tsx`, fora do build/dev.

## Setup

```bash
# OpenAI API Key: https://platform.openai.com/api-keys
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

# ENEM em português
npx tsx content/generator/generate.ts --cert ENEM --count 10 --lang pt-BR --model gpt-4o-mini

# Qualquer certificação (IA descobre os domínios sozinha)
npx tsx content/generator/generate.ts --cert "CISM" --count 10

# Ver o prompt sem chamar a API
npx tsx content/generator/generate.ts --cert cissp --count 5 --dry-run
```

### 🤖 Recommended Models

| Model | Speed | Cost | Best For |
| :--- | :--- | :--- | :--- |
| **`gpt-4o-mini`** | ⚡⚡⚡ | 💲 | **Speed & Budget** (Default, bulk gen) |
| **`gpt-4o`** | ⚡⚡ | 💲💲 | **Quality** (Final polish, complex topics) |
| **`o1`** / **`o3-mini`** | 🐢 | 💲💲 | **Deep Logic** (Math, coding, complex scenarios) |

> **Note**: Reasoning models (`o1`, `o3`) take 1-2 minutes to "think" before responding. Use `gpt-4o-mini` if you want instant results.

### 🛠️ Usage

| Flag | O que faz | Padrão |
|------|-----------|--------|
| `--cert` | Nome do certificado (qualquer um) | Obrigatório |
| `--domain` | ID ou número do domínio (omitir = todos) | todos |
| `--count` | Questões por domínio (1-30) | 10 |
| `--lang` | Idioma das questões (en, pt-BR, es, fr, de, ja...) | en |
| `--model` | Modelo OpenAI | gpt-4o-mini |
| `--temperature` | Temperatura do LLM | 0.7 |
| `--dry-run` | Mostra prompt sem chamar API | false |
| `--no-import` | Pula a importação automática | false |
| `--auto-approve` | Pula a confirmação antes do import | false |

### Importar no marketplace

```bash
# Um arquivo
npx tsx content/generator/import-to-marketplace.ts --file content/cissp/domain-1-sam/batch-001.json --study-id ID_DO_STUDY

# Todos os batches de um diretório
npx tsx content/generator/import-to-marketplace.ts --dir content/cissp --study-id ID_DO_STUDY

# Só validar, sem escrever no Firestore
npx tsx content/generator/import-to-marketplace.ts --dir content/cissp --study-id ID_DO_STUDY --dry-run
```

Requer `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY` no `.env.local`.

## Metadata do estudo

Ao gerar questões, é criado automaticamente um arquivo JSON com os metadados do estudo (ex: cissp-study.json, enem-study.json), contendo:
- Certificação
- Domínios/temas
- Idioma
- Data

Esse arquivo pode ser usado para reutilizar os domínios em futuras gerações.

## Certs já embutidos (sem API extra)

`cissp`, `cc`, `sscp`, `ccsp`, `security+` (aliases: `sec+`, `securityplus`, `sy0-701`), `enem`

Qualquer outro nome → IA descobre domínios automaticamente (+1 chamada).

## Fluxo completo

```bash
$env:OPENAI_API_KEY="sk-..."

# 1. Gera (80 questões CISSP em ~20s)
npx tsx content/generator/generate.ts --cert cissp --count 10 --lang pt-BR

# 2. Revisa os arquivos em content/cissp/domain-*/

# 3. Importa (automático após geração, ou manual)
npx tsx content/generator/import-to-marketplace.ts --dir content/cissp --study-id MEU_STUDY_ID
```

## Dicas

- `--count 10` é o sweet spot (mais = mais alucinação)
- `--dry-run` pra ver o prompt antes de gastar tokens
- Questões inválidas são removidas automaticamente do batch
- Cada batch salva qual modelo e idioma foi usado no metadata
- O importador deduplica automaticamente (não importa questão com mesmo texto)

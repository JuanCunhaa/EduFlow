# Gerador de Conteúdo e Importação

Este repositório contém a automação para gerar e importar questões para a plataforma. Use este guia para criar novos conteúdos de forma rápida e segura.

## 🚀 Como Usar (Passo a Passo)

### 1. Gerar Questões

Use o comando abaixo para gerar um lote de questões usando Inteligência Artificial (OpenAI).
O sistema salva automaticamente o ID do estudo (studyId) para não criar duplicatas.

```bash
# Exemplo: Gerar 10 questões para o exame CISSP em Português
npx tsx content/generator/generate.ts --cert cissp --count 10 --lang pt-BR

# Exemplo: Gerar 5 questões apenas para o Domínio 1 do CISSP em Português
npx tsx content/generator/generate.ts --cert cissp --domain 1 --count 5 --lang pt-BR
```

**O que acontece:**

- As questões são geradas e salvas na pasta `content/{cert}/domain-{N}/`.
- O arquivo gerado terá o nome `batch-NNN.json`.
- O `studyId` é salvo ou reutilizado automaticamente do arquivo `*-study.json`.

### 2. Revisar (Opcional)

O script pausa após a geração para você revisar os arquivos criados.

- Se estiver tudo certo, digite **Y** para importar imediatamente.
- Se quiser editar algo, digite **n**, edite o arquivo JSON manualmente e importe depois.

### 3. Importar Manualmente (Se necessário)

Se você pulou a importação automática ou quer reimportar um arquivo editado:

```bash
# Importar um arquivo específico
npx tsx content/generator/import-to-marketplace.ts --file content/cissp/domain-1-sam/batch-001.json --study-id SEU_STUDY_ID

# Importar uma pasta inteira (busca recursiva)
npx tsx content/generator/import-to-marketplace.ts --dir content/cissp --study-id SEU_STUDY_ID
```

---

## 📂 Estrutura de Pastas

```
content/
├── generator/             # Scripts de geração e importação
├── cissp/                 # Conteúdo do exame CISSP
│   ├── cissp-study.json   # Arquivo de metadados (NÃO APAGUE)
│   ├── domain-1-sam/      # Questões do Domínio 1
│   │   ├── batch-001.json # Lote de questões geradas
│   │   └── ...
└── ...
```

## ⚠️ Dicas Importantes

- **Evite Duplicatas:** O importador verifica automaticamente se a questão já existe no banco.
- **Validação:** O sistema bloqueia questões inválidas (sem resposta correta, opções erradas, etc.).
- **Study ID:** O ID do estudo fica salvo no arquivo `*-study.json` dentro da pasta do exame. Não remova este arquivo para garantir que as novas questões vão para o mesmo simulado.

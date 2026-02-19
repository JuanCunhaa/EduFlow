# ExamFlow — Plataforma de Inteligência em Exames

> **Domine sua Próxima Certificação com Precisão de IA.**
> Uma plataforma multi-tenant premium para preparação de exames, projetada para se adaptar a qualquer certificação ou prova.

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Coverage](https://img.shields.io/badge/coverage-85%25-green)
![License](https://img.shields.io/badge/license-Proprietary-blue)
![Next.js](https://img.shields.io/badge/Next.js-16.1-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

---

## 📚 Índice

- [Sobre](#-sobre)
- [Funcionalidades](#-funcionalidades)
- [Arquitetura](#-arquitetura)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Instalação e Uso](#-instalação-e-uso)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [API](#-api)
- [Roadmap](#-roadmap)
- [Contribuindo](#-contribuindo)
- [Licença](#-licença)

---

## 💡 Sobre

**O Problema**: A preparação tradicional para exames (seja certificações de TI, concursos ou provas acadêmicas) é estática e não oferece feedback real sobre onde o candidato precisa melhorar.

**A Solução**: O **ExamFlow** é um motor de estudo adaptativo agnóstico a conteúdo. Ele utiliza IA para identificar lacunas de conhecimento, criar ciclos de revisão espaçada e fornecer métricas de prontidão em tempo real. Diferente de plataformas rígidas, o ExamFlow permite criar "Estudos" para qualquer objetivo, importando ou gerando questões automaticamente.

**Público-Alvo**: Profissionais buscando certificações, estudantes de concursos e qualquer pessoa que precise otimizar seu tempo de estudo com dados.

> 🖼️ **Nota**: Recomenda-se adicionar aqui um GIF demostrando o "Modo Exame" ou o Dashboard.

---

## ✨ Funcionalidades

- **🧠 Motor de Exame Inteligente**: 6 modos de estudo, incluindo "Mix Real" (simulação), "Domínios Fracos" (foco em erros) e "Revisão Espaçada" (algoritmo SM-2).
- **🛒 Marketplace de Conteúdo**: Compartilhe e importe pacotes de estudo criados pela comunidade para diversos exames (CISSP, AWS, OAB, ENEM, etc.).
- **📊 Analytics Avançado**: Acompanhe sua "Taxa de Prontidão", sequências de estudo (streaks) e desempenho detalhado por domínio de conhecimento.
- **🏆 Gamificação**: Sistema de conquistas (badges) e desafios diários para manter o engajamento.
- **� Criação e IA**: Ferramentas para criar questões manualmente ou gerar bancos de questões inteiros via IA (`content/generator`).
- **🔐 Multi-tenant e Seguro**: Arquitetura robusta com autenticação Firebase e regras de segurança por nível de acesso.
- **💳 Assinaturas Integradas**: Gestão completa de planos Free, Pro e Team via Stripe.
- **🎨 UI Premium**: Interface "Dark Mode First", fluida e responsiva, desenvolvida com Tailwind v4 e Framer Motion.

---

## 🏗 Arquitetura

Priorizamos a **simplicidade sênior**. Uma arquitetura serverless robusta, escalável e de fácil manutenção.

- **Frontend/Fullstack**: [Next.js 16](https://nextjs.org/) (App Router, Server Components).
- **Backend/DB**: [Firebase](https://firebase.google.com/) (Auth, Firestore, Storage, Security Rules).
- **Linguagem**: [TypeScript](https://www.typescriptlang.org/) (Tipagem estrita em todo o projeto).
- **Estilização**: [Tailwind CSS 4](https://tailwindcss.com/) + [Shadcn UI](https://ui.shadcn.com/).
- **Pagamentos**: [Stripe](https://stripe.com/).
- **Qualidade**: [Vitest](https://vitest.dev/) para testes unitários e ESLint para padronização.

**Fluxo de Dados**:

1.  **Cliente**: Next.js renderiza a UI e gerencia estado com `swr`.
2.  **API**: Route Handlers em `src/app/api` processam lógica sensível (pagamentos, validações complexas).
3.  **Dados**: Firestore armazena usuários, estudos, questões e histórico de exames com estrutura NoSQL otimizada para leitura.

### Modelo de Dados (Firestore)

Principais coleções e seus propósitos:

- **`users`**: Perfis de usuário, configurações e status da assinatura (Free/Pro).
- **`studies`**: Organizadores de conteúdo (ex: CISSP, OAB). Contém metadados como cor e nome.
- **`questions`**: Banco de questões atômicas. Cada questão pertence a um `studyId` e possui `domainIds`, dificuldade e explicação detalhada.
- **`exams`**: Registros de exames realizados, com pontuação, tempo gasto e respostas dadas.
- **`marketplace_studies`**: Pacotes de estudo públicos criados pela comunidade, prontos para importação.

---

## 📂 Estrutura do Projeto

```bash
src/
 ├── app/                 # Rotas e Páginas (Next.js App Router)
 │   ├── [locale]/        # Rotas internacionalizadas (i18n)
 │   │   ├── (landing)/   # Páginas de marketing
 │   │   ├── admin/       # Painel administrativo
 │   │   ├── dashboard/   # Área do aluno (visão geral)
 │   │   ├── exams/       # Interface de execução de exames
 │   │   ├── marketplace/ # Loja de pacotes de estudo
 │   │   └── study/       # Detalhes e gestão de um estudo específico
 │   └── api/             # Endpoints server-side
 │       ├── auth/        # Gerenciamento de sessão
 │       ├── billing/     # Webhooks e checkout do Stripe
 │       ├── exams/       # Processamento de submissões
 │       └── generator/   # Integração com OpenAI
 ├── components/          # Componentes React reutilizáveis
 ├── lib/                 # Lógica core
 │   ├── validators.ts    # Schemas Zod para validação total de dados
 │   └── ...
 ├── scripts/             # Scripts de manutenção e migração
 └── messages/            # Arquivos de tradução (pt-BR.json, en.json)
```

---

## 🔌 API Reference

O projeto utiliza **Next.js Route Handlers** para expor uma API segura. Principais módulos:

| Endpoint                | Descrição                                                                              |
| ----------------------- | -------------------------------------------------------------------------------------- |
| `/api/auth/*`           | Gerencia criação de usuários e sincronização com Firebase Auth.                        |
| `/api/billing/webhook`  | Recebe eventos do Stripe (renovações, cancelamentos) para atualizar status do usuário. |
| `/api/exams/submit`     | Processa respostas de exames, calcula pontuação e atualiza estatísticas de domínio.    |
| `/api/content/generate` | (Admin) Gera novas questões via IA baseado em parâmetros de estudo.                    |

---

## 🛠 Ferramentas e Scripts

A pasta `scripts/` contém utilitários essenciais para manutenção da plataforma:

- **`validate-questions.ts`**: Varre o banco de dados em busca de questões com formato inválido ou links quebrados.
- **`duplicate-detector.ts`**: Identifica questões semanticamente idênticas para manter a qualidade do banco.
- **`migrate-billing.ts`**: Script de migração para atualizar estruturas de dados de assinatura.

Para executar um script:

```bash
npx tsx scripts/validate-questions.ts
```

---

## 🚀 Instalação e Uso

### Pré-requisitos

- Node.js 18+
- Projeto Firebase configurado
- Conta Stripe (para funcionalidades de pagamento)

### Passo a Passo

1.  **Clone o repositório:**

    ```bash
    git clone https://github.com/seu-usuario/examflow.git
    cd examflow
    ```

2.  **Instale as dependências:**

    ```bash
    npm install
    # ou pnpm install
    ```

3.  **Configuração de Ambiente:**

    ```bash
    cp .env.example .env.local
    ```

    Preencha as chaves do Firebase, Stripe e OpenAI no arquivo `.env.local`.

4.  **Rodar Servidor de Desenvolvimento:**
    ```bash
    npm run dev
    ```
    Acesse `http://localhost:3000`.

### Scripts Úteis

- `npm run test`: Executa a suíte de testes com Vitest.
- `npm run lint`: Verifica problemas de código.
- `npx tsx content/generator/generate.ts`: (Interno) Gera questões via IA para popular o banco de dados.

### Deploy

A plataforma é otimizada para implantação na **Vercel**:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fseu-usuario%2Fexamflow)

Certifique-se de configurar as variáveis de ambiente no painel da Vercel após a importação.

---

## 🔐 Variáveis de Ambiente

| Variável                             | Descrição                                         |
| ------------------------------------ | ------------------------------------------------- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`       | Chave de API do Firebase (Web)                    |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`    | ID do Projeto Firebase                            |
| `STRIPE_SECRET_KEY`                  | Chave Secreta do Stripe (Server-side)             |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Chave Pública do Stripe (Client-side)             |
| `OPENAI_API_KEY`                     | Chave da OpenAI (para gerador de conteúdo)        |
| `NEXT_PUBLIC_APP_URL`                | URL base da aplicação (ex: http://localhost:3000) |

---

## � Roadmap

- [x] Motor de Exames e Pontuação
- [x] Dashboard de Aluno e Analytics
- [x] Marketplace de Conteúdo Comunitário
- [x] Internacionalização (PT-BR / EN)
- [ ] **App Mobile** (React Native / PWA)
- [ ] **Modo Offline** (Sincronização posterior)

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Se você tem uma ideia de melhoria:

1.  Faça um Fork do projeto.
2.  Crie uma Branch para sua feature (`git checkout -b feature/MinhaFeature`).
3.  Commit suas mudanças (`git commit -m 'feat: Adiciona nova funcionalidade'`).
4.  Push para a Branch (`git push origin feature/MinhaFeature`).
5.  Abra um Pull Request.

---

## 📄 Licença

**Proprietário.** Copyright © 2026 Juan Cunha. Todos os direitos reservados.
A cópia não autorizada deste arquivo, por qualquer meio, é estritamente proibida sem permissão prévia.

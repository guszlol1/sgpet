# SGPet – Sistema de Gestão Pet UFSCar

Sistema web de gestão para o pet shop Pet UFSCar, desenvolvido pelo Grupo 4 em resposta à RFP da Pet UFSCar (projeto PET-2026-01).

## Funcionalidades

| EAP | Funcionalidade | Sprint |
|---|---|---|
| 3.1 | Login e perfis (gerente e atendente) | 1 |
| 3.2 | Cadastro de produtos | 1 |
| 3.3 | Controle de estoque | 2 |
| 3.4 | Cadastro de clientes e pets | 2 |
| 3.5 | Registro de vendas (PDV) | 3 |
| 3.6 | Relatório de vendas | 3 |

## Tecnologias

- Front-end: React + Vite e Material UI (publicado na Vercel)
- Back-end: Node.js + Express (publicado no Render)
- Banco de dados e login: Supabase (PostgreSQL + Supabase Auth)
- Testes: Jest

## Estrutura do projeto

```
sgpet/
├── backend/                 # API Node.js + Express (Render)
│   ├── src/
│   │   ├── config/          # variáveis de ambiente e cliente do Supabase
│   │   ├── middlewares/     # autenticação, autorização por perfil e erros
│   │   ├── shared/          # erros e validações comuns
│   │   └── modules/         # um módulo por funcionalidade (rotas, service, repository, validações)
│   │       ├── auth/        # 3.1 Login e perfis
│   │       ├── produtos/    # 3.2 Cadastro de produtos
│   │       ├── estoque/     # 3.3 Controle de estoque
│   │       ├── clientes/    # 3.4 Cadastro de clientes e pets
│   │       ├── vendas/      # 3.5 Registro de vendas (PDV)
│   │       └── relatorios/  # 3.6 Relatório de vendas
│   ├── scripts/             # utilitários (ex.: criar usuários de teste)
│   └── tests/
│       └── unit/            # testes unitários (Jest)
├── frontend/                # React + Vite + Material UI (Vercel)
│   ├── public/
│   └── src/
│       ├── api/             # chamadas ao back-end
│       ├── components/      # componentes reutilizáveis
│       ├── contexts/        # contextos globais (ex.: sessão do usuário)
│       ├── routes/          # rotas e proteção por perfil
│       ├── theme/           # tema do Material UI
│       └── pages/           # uma pasta por tela
│           ├── Login/
│           ├── Produtos/
│           ├── Estoque/
│           ├── Clientes/
│           ├── Vendas/
│           └── Relatorios/
├── supabase/
│   ├── config.toml          # configuração da Supabase CLI (ambiente local)
│   ├── migrations/          # scripts SQL de criação das tabelas
│   └── seed/                # dados fictícios para desenvolvimento e apresentação
└── docs/                    # histórias de usuário, manual de uso e demais documentos
```

## Equipe

- Caio Monteiro Arraes – Gerente de Projeto e Front-end
- Gustavo Rossini Ports – Analista de Requisitos, Testes e Desenvolvedor
- Gustavo dos Santos da Boa Morte – Tech Lead e Back-end

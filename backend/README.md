# SGPet – Back-end

API em Node.js + Express. O banco e o login ficam no Supabase (PostgreSQL + Supabase Auth).

## Como rodar

### 1. Banco de dados no Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Aplique as migrações da pasta [`supabase/migrations`](../supabase/migrations), em ordem. Há duas formas:
   - pelo **SQL Editor** do painel, colando cada arquivo;
   - ou pela CLI, na raiz do repositório: `npx supabase link --project-ref <id-do-projeto>` e depois `npx supabase db push`.
3. (Opcional) Rode [`supabase/seed/01_produtos.sql`](../supabase/seed/01_produtos.sql) no SQL Editor para ter produtos de exemplo.
4. Em **Authentication > Sign In / Providers > Email**, desative **Allow new users to sign up**. Os usuários são criados só pelo script abaixo.

Para rodar o Supabase local (precisa do Docker): `npx supabase start` na raiz do repositório aplica as migrações e o seed automaticamente.

### 2. Back-end

```bash
cd backend
npm install
cp .env.example .env   # preencha com as chaves do Supabase (Project Settings > API)
npm run criar-usuarios # cria o gerente e o atendente de teste definidos no .env
npm run dev            # http://localhost:3333
```

| Script | O que faz |
|---|---|
| `npm run dev` | Sobe a API e reinicia a cada alteração |
| `npm start` | Sobe a API (usado no Render) |
| `npm test` | Roda os testes do Jest (pasta `tests/`) |
| `npm run criar-usuarios` | Cria os usuários de teste `SEED_*` do `.env` |

## Perfis

| Ação | Gerente | Atendente |
|---|---|---|
| Login, ver o próprio usuário | ✔ | ✔ |
| Listar e consultar produtos | ✔ | ✔ |
| Incluir, editar e remover produtos | ✔ | ✘ (403) |

O papel fica na tabela `perfis`. Ele é criado automaticamente por um gatilho quando o usuário é criado no Supabase Auth, a partir de `app_metadata.papel`, que só pode ser definido com a chave `service_role`.

## Endpoints

Todas as rotas, exceto `/health`, `/auth/login` e `/auth/renovar`, exigem o cabeçalho `Authorization: Bearer <token>`.

### Autenticação (3.1)

| Método | Rota | Corpo | Resposta |
|---|---|---|---|
| POST | `/auth/login` | `{ "email", "senha" }` | `{ token, refreshToken, expiraEm, usuario }` |
| POST | `/auth/renovar` | `{ "refreshToken" }` | igual ao login, com tokens novos |
| GET | `/auth/me` | – | `{ usuario: { id, email, nome, papel } }` |

O token vale 1 hora. Quando expirar, use `/auth/renovar`. Para sair, basta o front-end descartar os tokens.

### Produtos (3.2)

| Método | Rota | Perfil | Resposta |
|---|---|---|---|
| GET | `/produtos` | todos | lista de produtos ativos, por nome |
| GET | `/produtos/:id` | todos | o produto |
| POST | `/produtos` | gerente | `201` com o produto criado |
| PUT | `/produtos/:id` | gerente | o produto atualizado |
| DELETE | `/produtos/:id` | gerente | `204` |

Corpo de POST e PUT:

```json
{
  "nome": "Ração Premium Cães Adultos 15 kg",
  "categoria": "Ração",
  "preco": 249.9,
  "codigoBarras": "7890000000017",
  "estoqueMinimo": 5
}
```

Validações:

- `nome`: obrigatório, até 120 caracteres;
- `categoria`: obrigatória, até 60 caracteres;
- `preco`: obrigatório, maior que zero, até 2 casas decimais (aceita `"29,90"`);
- `codigoBarras`: obrigatório, de 8 a 14 dígitos, sem repetir entre produtos ativos;
- `estoqueMinimo`: inteiro maior ou igual a zero (padrão `0`).

A remoção é lógica: o produto deixa de aparecer, mas continua no banco para não quebrar o histórico de vendas, e o código de barras fica livre para outro cadastro.

### Erros

Todos os erros têm o formato `{ "erro": "mensagem" }`. Erros de validação trazem também `detalhes` com a mensagem de cada campo:

```json
{ "erro": "Dados do produto inválidos.", "detalhes": { "preco": "O preço deve ser maior que zero." } }
```

| Status | Quando |
|---|---|
| 400 | Dados inválidos |
| 401 | Sem token, token inválido/expirado ou e-mail e senha incorretos |
| 403 | Perfil sem permissão, ou usuário sem perfil |
| 404 | Produto ou rota não encontrados |
| 409 | Código de barras já cadastrado |

## Organização do código

```
src/
├── app.js            # monta o Express recebendo os serviços (facilita os testes)
├── server.js         # liga os serviços ao Supabase e sobe o servidor
├── config/           # variáveis de ambiente e clientes do Supabase
├── middlewares/      # autenticar, exigirPapel, tratarErros
├── shared/           # erros da aplicação e funções de validação comuns
└── modules/
    ├── auth/         # validacao, repository (Supabase), service (regras), routes
    └── produtos/     # validacao, repository (Supabase), service (regras), routes
```

Cada módulo separa as regras (`*.service.js` e `*.validacao.js`) do acesso ao Supabase (`*.repository.js`). Nos testes unitários, basta passar um repository falso para `criarAuthService` ou `criarProdutosService`, ou serviços falsos para `criarApp`.

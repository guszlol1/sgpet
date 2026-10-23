# SGPet – Front-end

Aplicação web em React + Vite com Material UI. Consome a API do back-end ([`../backend`](../backend)).

## Como rodar

O back-end precisa estar rodando (por padrão em `http://localhost:3333`).

```bash
cd frontend
npm install
cp .env.example .env   # ajuste VITE_API_URL se a API estiver em outro endereço
npm run dev            # http://localhost:5173
```

| Script | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com recarga automática |
| `npm run build` | Gera a versão de produção em `dist/` (usado na Vercel) |
| `npm run preview` | Serve a pasta `dist/` localmente |
| `npm run lint` | Verifica o código com o oxlint |

Na Vercel: diretório raiz `frontend`, comando de build `npm run build`, saída `dist` e a variável `VITE_API_URL` com o endereço da API no Render. O [`vercel.json`](vercel.json) faz as rotas (ex.: `/produtos`) funcionarem ao recarregar a página.

## Telas

| Rota | Tela | Perfis | Situação |
|---|---|---|---|
| `/login` | Login | – | Sprint 1 |
| `/produtos` | Lista, busca (nome ou código) e cadastro de produtos | todos (incluir, editar e remover: só gerente) | Sprint 1 |
| `/estoque` | Controle de estoque | gerente | Sprint 2 (tela provisória) |
| `/clientes` | Clientes e pets | todos | Sprint 2 (tela provisória) |
| `/vendas` | Registro de vendas (PDV) | todos | Sprint 3 (tela provisória) |
| `/relatorios` | Relatório de vendas | gerente | Sprint 3 (tela provisória) |

## Organização do código

```
src/
├── main.jsx               # tema, rotas e sessão
├── App.jsx                # mapa de rotas e permissões por perfil
├── api/
│   ├── cliente.js         # fetch com token, erros da API e renovação automática da sessão
│   ├── auth.js
│   └── produtos.js
├── contexts/
│   ├── AuthContext.js     # hook useAuth()
│   └── AuthProvider.jsx   # login, logout e usuário logado
├── routes/
│   ├── RotaProtegida.jsx  # exige login e, opcionalmente, um perfil
│   └── menu.js            # itens do menu lateral e quem vê cada um
├── components/            # Layout (barra e menu), diálogos e telas genéricas
├── theme/                 # tema do Material UI (cores, pt-BR)
└── pages/                 # uma pasta por tela
```

- **Sessão:** o token fica no `localStorage`. Quando expira, `api/cliente.js` renova pelo `/auth/renovar` e repete a requisição. Se não conseguir, volta para o login.
- **Permissões:** o menu e os botões escondem o que o perfil não pode fazer, mas quem garante é o back-end (403).
- **Validação:** `pages/Produtos/validarProduto.js` repete as regras do back-end para avisar antes de enviar. Erros devolvidos pela API aparecem no campo correspondente.
- **Nova tela:** crie a pasta em `pages/`, adicione a rota em `App.jsx` e o item em `routes/menu.js`.

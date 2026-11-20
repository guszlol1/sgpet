# Sprint 3 — registro de vendas (PDV) e relatório de vendas

Marco M3 (27/11/2026). Implementação feita sobre a branch da Sprint 2 (`feat/sprint2-estoque-clientes`), porque a baixa de estoque depende do saldo criado nela. **A Sprint 2 precisa entrar na `main` antes ou junto desta entrega.**

## Entregas do backlog

| Item | Implementação |
| --- | --- |
| US07 / EAP 3.5 – back-end | `POST /vendas` com validação, cálculo do total no servidor, conferência de saldo e baixa atômica do estoque; `GET /vendas/produtos` (catálogo do PDV com saldo). |
| US07 / EAP 3.5 – front-end | Tela de PDV: busca por nome ou código de barras (leitor + Enter), carrinho com ajuste de quantidade, cliente opcional, forma de pagamento, total em tempo real, atalho F2 para finalizar e aviso de estoque mínimo. |
| US08 / EAP 3.6 | `GET /relatorios/vendas?dataInicio&dataFim` (só gerente) e tela com filtro de período, cards de quantidade e valor total e tabela das vendas. |
| EAP 4.1 | Testes Jest de cálculo, baixa, alerta, validações, relatório e permissões; testes da migração em PostgreSQL isolado (PGlite); testes das funções do front-end. |
| EAP 4.2 | [Roteiro de testes do fluxo completo](roteiro-testes-fluxo-completo.md). |

## Regras de negócio

- **Permissões:** gerente e atendente registram vendas; o relatório é exclusivo do gerente (atendente recebe 403 na API e a tela fica fora do menu).
- **Itens:** de 1 a 100 por venda; quantidade inteira entre 1 e 100000. Itens repetidos do mesmo produto são somados.
- **Forma de pagamento:** somente `dinheiro`, `pix` ou `cartao` (a API também aceita "Pix", "Cartão" etc. e normaliza). Não há integração com maquininha.
- **Total:** o front-end envia só `produtoId` e `quantidade`. Preço, subtotais e total vêm do cadastro e são calculados no servidor em centavos inteiros (sem erro de ponto flutuante). Qualquer `preco` ou `valorTotal` enviado é ignorado.
- **Estoque:** se a quantidade de qualquer item passar do saldo, a venda inteira é recusada (409) e **nenhum saldo é alterado**. Vender exatamente o saldo é permitido (fica 0). O saldo nunca fica negativo (`check (saldo >= 0)` da Sprint 2).
- **Alerta pós-venda:** cada item volta com `saldo`, `estoqueMinimo` e `alertaEstoqueBaixo` (saldo ≤ mínimo), e a resposta traz `alertasEstoque` com os produtos que atingiram o mínimo.
- **Produto removido** (inativo) não pode ser vendido (404). **Cliente** é opcional; se informado, precisa existir (404).
- **Preço histórico:** cada item guarda o preço do momento da venda; alterar o preço do produto depois não muda vendas antigas.
- **Relatório:** datas `AAAA-MM-DD`, inclusivas, no horário de Brasília (−03:00, sem horário de verão desde 2019). `dataInicio ≤ dataFim` e no máximo 366 dias. Uma venda às 23:59 do último dia entra; uma às 00:00 do dia seguinte não. Soma em centavos; período sem vendas retorna tudo zerado.

## API

Todas as rotas exigem `Authorization: Bearer <token>`.

| Método | Rota | Perfil | Resultado |
| --- | --- | --- | --- |
| GET | `/vendas/produtos` | gerente, atendente | Produtos ativos com preço, saldo, mínimo e `alertaEstoqueBaixo`. |
| POST | `/vendas` | gerente, atendente | 201 com o resumo da venda gravada. |
| GET | `/relatorios/vendas?dataInicio=2026-11-01&dataFim=2026-11-30` | gerente | Vendas do período, `quantidadeVendas`, `quantidadeItens` e `valorTotal`. |

Exemplo de venda:

~~~json
{
  "formaPagamento": "pix",
  "clienteId": null,
  "itens": [
    { "produtoId": "UUID-da-racao", "quantidade": 3 },
    { "produtoId": "UUID-da-areia", "quantidade": 1 }
  ]
}
~~~

Resposta (resumida):

~~~json
{
  "id": "…", "dataHora": "2026-11-20T13:19:00Z", "formaPagamento": "pix",
  "valorTotal": 105.2, "quantidadeItens": 4,
  "itens": [
    { "nome": "Ração Premium", "quantidade": 3, "precoUnitario": 29.9, "subtotal": 89.7,
      "saldo": 4, "estoqueMinimo": 5, "alertaEstoqueBaixo": true }
  ],
  "alertasEstoque": [{ "nome": "Ração Premium", "saldo": 4, "estoqueMinimo": 5 }]
}
~~~

| Status | Quando |
| --- | --- |
| 400 | Carrinho vazio, quantidade inválida, forma de pagamento inválida, período inválido |
| 401 | Sem login |
| 403 | Perfil sem permissão (atendente no relatório) |
| 404 | Produto ou cliente inexistente |
| 409 | Estoque insuficiente (`detalhes` aponta o item, ex.: `itens.1.quantidade`) |

## Banco de dados

Migração nova: `supabase/migrations/20261120120000_sprint3_vendas.sql`.

- `vendas` (`usuario_id` → `perfis`, `cliente_id` opcional → `clientes`, `forma_pagamento` com `check`, `valor_total > 0`, `data_hora`).
- `itens_venda` (`venda_id` → `vendas` com `on delete cascade`, `produto_id` → `produtos`, `quantidade > 0`, `preco_unitario`, `subtotal` com `check (subtotal = quantidade * preco_unitario)` e um item por produto em cada venda).
- `registrar_venda(...)`: numa única transação valida, trava os produtos (`for update`, em ordem de id para evitar deadlock), confere o saldo, calcula com o preço do banco, grava venda e itens e dá baixa. Qualquer erro desfaz tudo.
- `relatorio_vendas(inicio, fim)`: devolve as vendas do intervalo `[inicio, fim)` num único JSON, sem esbarrar no limite de 1000 linhas da API do Supabase.
- RLS ligado e sem políticas; funções `SECURITY INVOKER` executáveis só por `service_role`, como nas sprints anteriores.

O histórico de saídas do estoque são os próprios `itens_venda` (a Sprint 2 só tem a tabela de entradas).

### Aplicar no Supabase

A migração foi testada localmente (PGlite) e **não foi aplicada ao projeto remoto**. Se a da Sprint 2 ainda não foi aplicada, ela sobe junto (as duas estão pendentes). Na raiz do repositório, com o projeto do grupo já vinculado:

~~~sh
npx supabase migration list --remote
npx supabase db push --remote --dry-run
npx supabase db push --remote
~~~

Ou cole o arquivo no **SQL Editor** do painel, depois da migração da Sprint 2.

## Modo em memória (API de testes)

`src/modules/vendas/vendas.memoria.js` implementa o mesmo contrato do repositório do Supabase (vendas e relatório) usando `Map`s em memória, com venda tudo-ou-nada. Ele é usado pelos testes HTTP (`tests/helpers/sprint2-fixtures.js`) e pode ser ligado à API genérica de testes passando os mesmos `Map`s de produtos e clientes:

~~~js
const repo = criarVendasRepositoryMemoria({ produtos, clientes, usuarios });
criarApp({ ..., vendasService: criarVendasService(repo), relatoriosService: criarRelatoriosService(repo) });
~~~

## Executar e verificar

~~~sh
cd backend
npm ci
npm test            # Jest: unitários + HTTP em memória
npm run test:db     # migrações reais em PostgreSQL isolado (PGlite)
cd ../frontend
npm ci
npm test
npm run lint
npm run build
~~~

Resultado local: **353 testes Jest em 16 suítes** (Sprints 1, 2 e 3), **27 testes de banco** (PGlite) e **63 testes do front-end**, todos aprovados. Lint sem avisos; build concluído com o aviso já existente sobre o tamanho do pacote JavaScript.

Também foi conferido no navegador, com a API rodando em memória: venda com leitura de código de barras + busca por nome, Pix, F2, alerta de estoque mínimo e limpeza da tela; atendente bloqueado no relatório; relatório do gerente batendo com a venda (1 venda, 4 itens, R$ 105,20). Isso não comprova a conexão com o Supabase real: depois de aplicar a migração, siga o [roteiro do fluxo completo](roteiro-testes-fluxo-completo.md).

## Pontos para a revisão de código

- O teste de vendas simultâneas usa PGlite (uma única conexão), então as vendas são serializadas. A proteção real contra venda acima do saldo é o `for update` na função, que só pode ser exercitado com conexões concorrentes no Supabase.
- O fuso do relatório é fixo em −03:00 (`relatorios.validacao.js`). Se o Brasil voltar a ter horário de verão, essa constante precisa mudar.
- `erros.naoEncontrado` passou a aceitar `detalhes` (opcional, compatível com as chamadas antigas).

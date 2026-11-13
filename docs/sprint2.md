# Sprint 2 — estoque, clientes e pets

Implementação baseada na main após os PRs #3 (testes) e #4 (configuração do Supabase), preservando a entrega anterior do grupo.

## Entregas do backlog

| Item | Implementação |
| --- | --- |
| US04 / EAP 3.3 | API e tela para registrar entradas de mercadorias. |
| US05 / EAP 3.3 | API e tela de saldo por produto, busca e filtro de estoque baixo. |
| US06 / EAP 3.4 | API e telas para cadastrar clientes com um ou mais pets, consultar e editar contatos e animais, e adicionar pets ao cadastro existente. |
| EAP 4.1 | Testes unitários, HTTP e das migrações/transações em PostgreSQL isolado; revisão de permissões, validações e contratos de persistência. |

## Regras e permissões

- Estoque: somente gerente; atendente recebe 403 inclusive ao chamar diretamente a API.
- Entrada: produto ativo, quantidade inteira entre 1 e 2147483647 e observação opcional de até 500 caracteres. O usuário responsável vem da sessão, nunca do corpo da requisição.
- Saldo inicial dos produtos: zero. Uma entrada é somada ao saldo em uma transação, junto de seu registro de auditoria. Produto removido não recebe entrada; saldo não pode exceder o limite do inteiro.
- Alerta: saldo menor ou igual ao estoque mínimo. Exemplo: mínimo 5; saldo 4 e 5 têm alerta, saldo 6 está regular. O mínimo é o do cadastro de produtos.
- Clientes e pets: gerente e atendente podem cadastrar, consultar e editar. Nome do cliente obrigatório (até 120 caracteres); telefone com DDD opcional (10 ou 11 dígitos) e e-mail opcional.
- Pet: nome obrigatório (até 80), espécie obrigatória (até 60), raça opcional (até 80). Não se exige CPF, data de nascimento ou outros dados fora da funcionalidade.
- Cadastro inicial: um a vinte pets por requisição; depois é possível adicionar novos pets. Cliente e pets iniciais são gravados na mesma transação. Um pet nunca é editado por meio da rota de outro cliente.
- Não foi incluída exclusão de clientes/pets, nem baixa por vendas, PDV ou relatório (Sprint 3).

## API

Todas as rotas abaixo exigem Authorization: Bearer <token>.

| Método | Rota | Perfil | Resultado |
| --- | --- | --- | --- |
| GET | /estoque | gerente | Produtos ativos com saldo, mínimo e alertaEstoqueBaixo. |
| POST | /estoque/entradas | gerente | 201: movimento registrado e novo saldo. |
| GET | /clientes | gerente, atendente | Clientes com seus pets. |
| GET | /clientes/:id | gerente, atendente | Cliente e seus pets; 404 se inexistente. |
| POST | /clientes | gerente, atendente | 201: cliente e pets criados em conjunto. |
| PUT | /clientes/:id | gerente, atendente | Atualiza somente nome e contatos. |
| POST | /clientes/:id/pets | gerente, atendente | 201: adiciona um animal ao cliente existente. |
| PUT | /clientes/:id/pets/:petId | gerente, atendente | Atualiza somente um animal pertencente ao cliente da rota. |

Exemplo de entrada:

~~~json
{ "produtoId": "UUID-do-produto", "quantidade": 5, "observacao": "Reposição" }
~~~

Exemplo de cliente:

~~~json
{
  "nome": "Ana Teste",
  "telefone": "11999999999",
  "email": "ana@example.com",
  "pets": [
    { "nome": "Luna", "especie": "Gato", "raca": "" },
    { "nome": "Rex", "especie": "Cão", "raca": "SRD" }
  ]
}
~~~

Erros seguem o padrão existente: erro e detalhes por campo, com 400, 401, 403 ou 404. Erros de pets no cadastro inicial usam chaves como pets.0.nome.

## Migração para o responsável pelo Supabase

Arquivo novo: supabase/migrations/20261113231552_sprint2_estoque_clientes_pets.sql.
Ele adiciona produtos.saldo, entradas_estoque, clientes, pets e duas funções transacionais. As migrações antigas e o seed anterior não foram renomeados nem reaplicados. Os produtos existentes recebem saldo zero; não é inventado um saldo a partir do estoque mínimo.

A migração foi testada localmente e **não foi aplicada ao Supabase remoto nesta entrega**. Antes de executar, o responsável deve atualizar o código, conferir o projeto vinculado e revisar as migrações pendentes. Com a CLI v3, na raiz do repositório:

~~~sh
npx supabase migration list --remote
npx supabase db push --remote --dry-run --skip-vault
npx supabase db push --remote --skip-vault
~~~

Esses comandos se referem ao projeto já vinculado pelo grupo. Não use outro projeto por engano e não publique chaves no GitHub. A CLI pede confirmação para a alteração remota. Nas versões v2, confira a ajuda local antes de usar os comandos porque as opções diferem.

RLS fica ligado nas novas tabelas, sem acesso direto por anon/authenticated, conforme a arquitetura existente. As funções são SECURITY INVOKER, executáveis somente por service_role. A chave secreta continua exclusivamente no back-end. O teste de banco também confirma bloqueio de funções e de leitura direta por usuários comuns.

## Executar e verificar

~~~sh
cd backend
npm ci
npm test
npm run test:db
npm run test:coverage
cd ../frontend
npm ci
npm test
npm run lint
npm run build
~~~

Resultado local: 221 testes Jest do back-end, 16 de PostgreSQL isolado e 51 de funções do front-end aprovados — 288 testes no total, incluindo a regressão da Sprint 1. O comando de cobertura inclui os módulos novos; o relatório detalhado é gerado pelo Jest. Lint sem avisos; build concluído com o aviso já existente de tamanho do pacote JavaScript.

Os testes de SQL usam PGlite com as migrações reais e apenas o schema mínimo de Auth simulado. Verificam vínculos, limites, permissões, acúmulo de entradas e rollback. O teste de múltiplas entradas usa uma instância de PostgreSQL embutido; não é um teste de carga com conexões independentes ao Supabase.

Também foram conferidos no navegador, com API real e persistência em memória de teste: login, registro de entrada, saldo após recarregar, cadastro com dois pets, inclusão de terceiro pet, edição de animal e bloqueio do estoque para atendente. Isso não comprova a conexão com o banco remoto.

## Conferência após aplicar no ambiente do grupo

1. Entrar como gerente e registrar 5 unidades em um produto de saldo zero e mínimo 5; confirmar saldo 5 e alerta.
2. Registrar mais uma unidade; confirmar saldo 6 e situação regular, inclusive após recarregar.
3. Cadastrar cliente com dois pets; recarregar, editar um pet e adicionar um terceiro.
4. Entrar como atendente: clientes e pets disponíveis; estoque bloqueado na interface e na API.
5. Conferir os registros no Supabase e executar a demonstração com o professor.

A revisão técnica local cobre permissões no servidor, responsabilidade obtida da sessão, validação antes de gravar, transações e retorno dos repositories. O aceite do grupo/professor e a revisão por outro integrante continuam sendo registrados pelo grupo no pull request.

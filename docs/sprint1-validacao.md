# Sprint 1 — validação (06/11/2026)

## Escopo

- US01 / EAP 3.1: login, renovação de sessão e perfis gerente/atendente.
- US02 / EAP 3.2: cadastro, consulta, edição e remoção lógica de produtos, com validações.
- US03 / EAP 3.2: busca por nome ou código de barras.
- EAP 4.1: testes automatizados de login e produtos.
- EAP 2.1: detalhamento das histórias da Sprint 2 em historias-sprint2.md.

## Como executar

Requer Node.js 22 ou superior. Na raiz do repositório:

~~~sh
cd backend
npm ci
npm test
npm run test:coverage
cd ../frontend
npm ci
npm test
npm run lint
npm run build
~~~

Os testes do back-end usam Jest. As funções puras de busca e formulário do front-end usam o executor nativo do Node.js, sem outra dependência.
O fluxo no GitHub Actions executa os mesmos comandos em push e pull request, sem chaves do Supabase.

## O que os testes verificam

- E-mail normalizado, senha preservada e rejeição de dados inválidos.
- Login e renovação válidos, credencial/token inválido, usuário sem perfil e erros de infraestrutura.
- API protegida: consulta para os dois perfis e alteração somente para gerente.
- Campos obrigatórios, preço positivo com duas casas, limites de nome/categoria/código e estoque mínimo inteiro não negativo.
- Código de barras duplicado (409), código do próprio produto na edição e produto inexistente (404).
- Ciclo HTTP de cadastro → consulta → edição → remoção → cadastro com o código liberado.
- Contratos do repository: conversão de campos, filtros de ativos e remoção lógica.
- Busca parcial por nome sem diferenciar maiúsculas/acentos e busca por código com zero inicial.
- Corpo JSON inválido e erros no formato esperado pelo front-end.

## Limites da evidência

Os testes unitários simulam o repository/SDK. Os testes HTTP usam Express, middlewares e services reais com repositories em memória. Eles não comprovam conexão com o Supabase remoto nem substituem a demonstração no navegador.

O front-end já estava na main (commit 8eb2e3f); não há merge de front-end pendente nessa versão. A busca foi extraída para uma função testável mantendo seu comportamento.

Para aceitar o M1 no ambiente real, validar separadamente: migrações aplicadas, usuários gerente/atendente, login com senha real, CRUD persistente e permissões. Não marcar essa etapa concluída apenas porque os testes simulados passaram.

## Resultado local registrado

- Back-end: 108 testes aprovados em 6 suítes (85 unitários e 23 de contrato HTTP).
- Front-end: 15 testes de busca e formulário aprovados.
- Lint do front-end: nenhum erro ou aviso.
- Build de produção: concluído; o Vite informa apenas aviso de tamanho do pacote JavaScript.
- Cobertura das linhas dos módulos incluídos na configuração do Jest: 96,56%. Não inclui inicialização/configuração do servidor ou scripts.

A integração e a configuração do Supabase real ficam em uma entrega separada do grupo. Este conjunto de testes não exige chaves, não aplica migrações e não altera o banco remoto.

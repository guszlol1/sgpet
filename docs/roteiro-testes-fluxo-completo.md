# Roteiro de testes do fluxo completo — SGPet (EAP 4.2)

Roteiro de validação ponta a ponta das 6 funcionalidades (3.1 a 3.6), para os testes integrados da Semana Final e para o critério de qualidade "nenhum erro crítico na apresentação final" (M4 – 04/12/2026).

## Identificação da execução

| Campo | Preenchimento |
| --- | --- |
| Data | ____/____/2026 |
| Ambiente | [ ] Publicado (Vercel + Render + Supabase)  [ ] Local (`npm run dev` + Supabase) |
| Versão / commit | |
| Executado por | |
| Colega no papel de atendente (cenário 5.4) | |

## Preparação geral

1. Migrações da Sprint 1, 2 e 3 aplicadas no Supabase, na ordem (`supabase/migrations`).
2. Seed de produtos aplicado (`supabase/seed/01_produtos.sql`) ou ao menos 3 produtos cadastrados.
3. Usuários de teste criados com `npm run criar-usuarios`: um **gerente** e um **atendente** (credenciais no `.env` do back-end; não anotar senhas neste documento).
4. Front-end apontando para a API correta (`VITE_API_URL`).
5. Ter à mão um cronômetro (celular) para o cenário 5.4.

Massa de dados sugerida (ajuste os nomes aos produtos do seed):

| Produto | Preço | Estoque mínimo | Saldo inicial (após cenário 3.1) |
| --- | --- | --- | --- |
| P1 – Ração | R$ 29,90 | 5 | 10 |
| P2 – Areia | R$ 15,50 | 1 | 2 |
| P3 – Petisco | R$ 0,10 | 0 | 50 |

Anote aqui os valores usados, porque os cenários 5 e 6 dependem deles: ______________________________

---

## 1. Login e controle de permissões (3.1)

### 1.1 Login do gerente
- **Pré-condições:** usuário gerente criado; sessão encerrada.
- **Passos:** abrir o sistema → informar e-mail e senha do gerente → Entrar.
- **Resultado esperado:** entra na tela de Produtos; o topo mostra o nome e o chip "Gerente"; o menu mostra Produtos, Estoque, Clientes e pets, Vendas (PDV) e Relatórios.
- **Status:** [ ] Passou / [ ] Falhou — Observações:

### 1.2 Login do atendente e menu restrito
- **Pré-condições:** usuário atendente criado; sair da sessão do gerente.
- **Passos:** entrar com o atendente.
- **Resultado esperado:** o menu mostra só Produtos, Clientes e pets e Vendas (PDV). Não há botões de incluir/editar/remover produto.
- **Status:** [ ] Passou / [ ] Falhou — Observações:

### 1.3 Bloqueio por URL
- **Pré-condições:** logado como atendente.
- **Passos:** digitar na barra de endereço `/estoque` e depois `/relatorios`.
- **Resultado esperado:** as duas telas exibem "Seu perfil não tem acesso a esta tela". Nenhum dado de estoque ou de vendas aparece.
- **Status:** [ ] Passou / [ ] Falhou — Observações:

### 1.4 Credenciais inválidas e sessão
- **Pré-condições:** sessão encerrada.
- **Passos:** tentar entrar com senha errada; depois entrar corretamente, recarregar a página (F5) e, por fim, clicar em Sair.
- **Resultado esperado:** senha errada mostra erro e não entra; após o F5 a sessão continua; após Sair volta ao login e as telas internas exigem novo login.
- **Status:** [ ] Passou / [ ] Falhou — Observações:

---

## 2. Cadastro e busca de produtos (3.2)

### 2.1 Incluir produto (gerente)
- **Pré-condições:** logado como gerente.
- **Passos:** Produtos → Novo produto → preencher nome, categoria, preço `29,90`, código de barras de 13 dígitos e estoque mínimo `5` → Salvar.
- **Resultado esperado:** mensagem de sucesso; produto aparece na lista com o preço R$ 29,90.
- **Status:** [ ] Passou / [ ] Falhou — Observações:

### 2.2 Validações do cadastro
- **Pré-condições:** logado como gerente.
- **Passos:** tentar salvar (a) sem nome, (b) com preço `0`, (c) com código de barras de 5 dígitos, (d) com um código de barras já usado.
- **Resultado esperado:** cada tentativa é recusada com mensagem no campo correspondente; nada é salvo.
- **Status:** [ ] Passou / [ ] Falhou — Observações:

### 2.3 Editar e remover
- **Pré-condições:** produto do 2.1 cadastrado.
- **Passos:** editar a categoria → salvar; depois remover um produto de teste e confirmar.
- **Resultado esperado:** a edição aparece na lista; o produto removido some da lista, do estoque e do PDV.
- **Status:** [ ] Passou / [ ] Falhou — Observações:

### 2.4 Busca por nome e por código (atendente)
- **Pré-condições:** logado como atendente.
- **Passos:** buscar por parte do nome sem acento (ex.: `racao`), depois por parte do código de barras.
- **Resultado esperado:** as duas buscas encontram o produto; a busca não diferencia maiúsculas nem acentos.
- **Status:** [ ] Passou / [ ] Falhou — Observações:

---

## 3. Entrada de estoque e alerta de estoque mínimo (3.3)

### 3.1 Registrar entradas
- **Pré-condições:** logado como gerente; P1, P2 e P3 cadastrados com saldo 0.
- **Passos:** Estoque → Registrar entrada → P1 com 10 unidades; repetir para P2 (2) e P3 (50).
- **Resultado esperado:** mensagem "Entrada registrada. Novo saldo: …"; saldos 10, 2 e 50 na tabela, mantidos após recarregar a página.
- **Status:** [ ] Passou / [ ] Falhou — Observações:

### 3.2 Alerta de estoque mínimo (limite)
- **Pré-condições:** um produto de teste com mínimo 5 e saldo 0.
- **Passos:** registrar entrada de 5 unidades; depois mais 1.
- **Resultado esperado:** com saldo 5 o produto aparece como "Estoque baixo" (saldo igual ao mínimo); com saldo 6 passa para "Regular". O filtro "Somente estoque baixo" mostra só os produtos em alerta.
- **Status:** [ ] Passou / [ ] Falhou — Observações:

### 3.3 Entradas inválidas
- **Pré-condições:** logado como gerente.
- **Passos:** tentar registrar quantidade `0`, `-1` e `1,5`.
- **Resultado esperado:** todas recusadas com mensagem; o saldo não muda.
- **Status:** [ ] Passou / [ ] Falhou — Observações:

---

## 4. Cadastro de clientes e pets (3.4)

### 4.1 Cliente com dois pets (atendente)
- **Pré-condições:** logado como atendente.
- **Passos:** Clientes e pets → Novo cliente → nome `Ana Teste`, telefone com DDD, e-mail → adicionar dois pets (ex.: Luna/Gato e Rex/Cão) → Salvar.
- **Resultado esperado:** cliente aparece com os dois pets, também após recarregar.
- **Status:** [ ] Passou / [ ] Falhou — Observações:

### 4.2 Editar cliente e pets
- **Pré-condições:** cliente do 4.1 cadastrado.
- **Passos:** editar o telefone; editar a raça de um pet; adicionar um terceiro pet.
- **Resultado esperado:** alterações salvas; cliente com 3 pets.
- **Status:** [ ] Passou / [ ] Falhou — Observações:

### 4.3 Validações
- **Pré-condições:** logado.
- **Passos:** tentar salvar cliente sem nome; cliente sem nenhum pet; pet sem espécie; telefone com 8 dígitos.
- **Resultado esperado:** cada caso recusado com mensagem; nenhum cadastro salvo pela metade.
- **Status:** [ ] Passou / [ ] Falhou — Observações:

---

## 5. Registro de venda no PDV (3.5)

### 5.1 Venda com cálculo, pagamento e baixa de estoque
- **Pré-condições:** logado como atendente; saldos P1 = 10, P2 = 2, P3 = 50 (anotar os saldos reais antes).
- **Passos:**
  1. Vendas (PDV) → digitar/ler o código de barras de P2 e pressionar Enter.
  2. Buscar `racao` e escolher P1; clicar em `+` até a quantidade 3.
  3. Buscar P3 e ajustar a quantidade para 3.
  4. Conferir o subtotal de cada linha e o total.
  5. Selecionar o cliente `Ana Teste` (opcional) e a forma de pagamento **Pix**.
  6. Finalizar (botão ou F2).
- **Resultado esperado:**
  - Subtotais: P1 = R$ 89,70; P2 = R$ 15,50; P3 = R$ 0,30. **Total = R$ 105,50** (conferir com a calculadora).
  - Mensagem "Venda concluída: R$ 105,50 em Pix"; carrinho, cliente e pagamento limpos e cursor de volta na busca.
  - Novos saldos: P1 = 7, P2 = 1, P3 = 47 (conferir no PDV e, como gerente, na tela de Estoque).
- **Status:** [ ] Passou / [ ] Falhou — Observações:

### 5.2 Alerta de estoque mínimo após a venda
- **Pré-condições:** após o 5.1, P2 está com saldo 1 e mínimo 1.
- **Passos:** observar o aviso exibido logo após finalizar a venda do 5.1; como gerente, abrir Estoque.
- **Resultado esperado:** aviso amarelo "Estoque mínimo atingido após a venda: P2 (saldo 1, mínimo 1)"; no Estoque, P2 aparece como "Estoque baixo".
- **Status:** [ ] Passou / [ ] Falhou — Observações:

### 5.3 Bloqueios da venda
- **Pré-condições:** logado como atendente; P2 com saldo 1.
- **Passos:**
  1. Adicionar P2 e tentar aumentar para 2 (botão `+` e digitando 2 no campo).
  2. Com um item no carrinho, tentar finalizar sem escolher a forma de pagamento (F2).
  3. Com o carrinho vazio, pressionar F2.
  4. Abrir o PDV em duas abas, colocar P2 (qtd 1) no carrinho das duas, finalizar na primeira e depois na segunda.
- **Resultado esperado:** (1) não permite passar do saldo e mostra "Estoque insuficiente…"; (2) pede a forma de pagamento; (3) pede para adicionar produto; (4) a segunda venda é recusada com "Estoque insuficiente para concluir a venda. Nenhum item foi baixado." e o saldo de P2 fica 0, nunca negativo.
- **Status:** [ ] Passou / [ ] Falhou — Observações:

### 5.4 Usabilidade: venda concluída em até 1 minuto
- **Pré-condições:** colega que não desenvolveu o PDV, no papel de atendente, já logado e com a tela do PDV aberta; lista com 3 produtos e quantidades escrita em papel (ex.: 2× P1 e 5× P3, pagamento em dinheiro).
- **Passos:** iniciar o cronômetro ao entregar o papel; o colega registra a venda sem ajuda; parar o cronômetro na mensagem "Venda concluída".
- **Resultado esperado:** venda correta concluída em **até 1 minuto** (meta). Tolerância do PGP: até 2 minutos.
- **Tempo medido:** ______ s
- **Status:** [ ] Passou (≤ 1 min) / [ ] Passou na tolerância (≤ 2 min) / [ ] Falhou — Observações:

---

## 6. Relatório de vendas (3.6)

### 6.1 Conferência do período
- **Pré-condições:** vendas dos cenários 5.1, 5.3 e 5.4 registradas hoje; anotar a quantidade e o valor de cada uma.
- **Passos:** logado como gerente → Relatórios → data inicial e final = hoje → Consultar.
- **Resultado esperado:**
  - "Quantidade de vendas" = número de vendas concluídas hoje (as recusadas no 5.3 **não** contam).
  - "Valor total do período" = soma exata dos totais anotados (conferir com a calculadora).
  - A tabela lista cada venda com data/hora, forma de pagamento, itens, cliente (Ana Teste na venda do 5.1), atendente e valor, e os valores batem com o PDV.
- **Valores conferidos:** quantidade ______ / valor total R$ ______
- **Status:** [ ] Passou / [ ] Falhou — Observações:

### 6.2 Limites do período e período vazio
- **Pré-condições:** vendas registradas hoje.
- **Passos:** consultar (a) de ontem até ontem; (b) de hoje até hoje; (c) do dia 1 do mês até hoje; (d) um mês sem vendas.
- **Resultado esperado:** (a) não inclui as vendas de hoje; (b) e (c) incluem todas as de hoje; (d) mostra 0 vendas, R$ 0,00 e "Nenhuma venda no período".
- **Status:** [ ] Passou / [ ] Falhou — Observações:

### 6.3 Validação do filtro e permissão
- **Pré-condições:** logado como gerente; depois como atendente.
- **Passos:** como gerente, consultar com data inicial maior que a final; como atendente, tentar abrir `/relatorios`.
- **Resultado esperado:** o gerente vê a mensagem "A data final deve ser igual ou posterior à inicial" e nada é consultado; o atendente vê "Seu perfil não tem acesso a esta tela".
- **Status:** [ ] Passou / [ ] Falhou — Observações:

---

## Resumo da execução

| Funcionalidade | Cenários | Passou | Falhou |
| --- | --- | --- | --- |
| 1. Login e permissões | 4 | | |
| 2. Produtos | 4 | | |
| 3. Estoque | 3 | | |
| 4. Clientes e pets | 3 | | |
| 5. PDV | 4 | | |
| 6. Relatório | 3 | | |
| **Total** | **21** | | |

Falhas encontradas (descrever, abrir issue no GitHub e anotar o número):

| # | Cenário | Descrição | Gravidade (crítica / média / baixa) | Issue |
| --- | --- | --- | --- | --- |
| 1 | | | | |

Critério de saída (PGP, seção 4.2): nenhuma falha crítica em aberto, as 6 funcionalidades aceitas e a venda do cenário 5.4 concluída em até 2 minutos.

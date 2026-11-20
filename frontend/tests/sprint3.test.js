import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  adicionarAoCarrinho,
  alterarQuantidade,
  filtrarProdutosVenda,
  montarVenda,
  produtoPorCodigo,
  removerDoCarrinho,
  totaisDoCarrinho,
  validarVenda,
} from '../src/pages/Vendas/carrinho.js';
import {
  dataLocalISO,
  descreverItens,
  periodoPadrao,
  validarPeriodo,
} from '../src/pages/Relatorios/periodo.js';

const racao = { id: 'r', nome: 'Ração Cães', categoria: 'Ração', codigoBarras: '0123456789012', preco: 29.9, saldo: 3 };
const areia = { id: 'a', nome: 'Areia', categoria: 'Higiene', codigoBarras: '7890000000024', preco: 0.1, saldo: 50 };
const vazio = { id: 'v', nome: 'Shampoo', categoria: 'Higiene', codigoBarras: '7890000000031', preco: 0.2, saldo: 0 };

function comItens(...pares) {
  return pares.reduce((c, [produto, vezes = 1]) => {
    for (let i = 0; i < vezes; i++) c = adicionarAoCarrinho(c, produto).carrinho;
    return c;
  }, []);
}

test('adicionar o mesmo produto soma a quantidade', () => {
  const c = comItens([racao, 2]);
  assert.equal(c.length, 1);
  assert.equal(c[0].quantidade, 2);
});

test('não deixa adicionar além do saldo nem produto sem estoque', () => {
  const c = comItens([racao, 3]);
  const r = adicionarAoCarrinho(c, racao);
  assert.equal(r.carrinho, c);
  assert.match(r.erro, /3 disponível/);
  assert.match(adicionarAoCarrinho([], vazio).erro, /sem estoque/);
});

test('altera quantidade respeitando saldo e só aceita inteiros positivos', () => {
  const c = comItens([racao]);
  assert.equal(alterarQuantidade(c, 'r', '3').carrinho[0].quantidade, 3);
  assert.match(alterarQuantidade(c, 'r', 4).erro, /Estoque insuficiente/);
  for (const valor of ['0', '-1', '1.5', 'abc', '']) {
    const r = alterarQuantidade(c, 'r', valor);
    assert.equal(r.carrinho, c);
    assert.ok(r.erro);
  }
});

test('remove item do carrinho', () => {
  assert.deepEqual(removerDoCarrinho(comItens([racao], [areia]), 'r').map((i) => i.produtoId), ['a']);
});

test('calcula subtotais e total em centavos sem erro de ponto flutuante', () => {
  const c = alterarQuantidade(comItens([racao], [areia]), 'a', 3).carrinho; // 29,90 + 3 × 0,10
  const t = totaisDoCarrinho(c);
  assert.deepEqual(t.itens.map((i) => i.subtotal), [29.9, 0.3]);
  assert.equal(t.valorTotal, 30.2);
  assert.equal(t.quantidadeItens, 4);
  assert.equal(totaisDoCarrinho([]).valorTotal, 0);
});

test('busca produto por nome sem acento, categoria ou código', () => {
  const lista = [racao, areia, vazio];
  assert.deepEqual(filtrarProdutosVenda(lista, 'RACAO').map((p) => p.id), ['r']);
  assert.deepEqual(filtrarProdutosVenda(lista, 'higiene').map((p) => p.id), ['a', 'v']);
  assert.deepEqual(filtrarProdutosVenda(lista, '0123').map((p) => p.id), ['r']);
  assert.equal(filtrarProdutosVenda(lista, '  ').length, 3);
});

test('leitor de código de barras exige o código completo', () => {
  assert.equal(produtoPorCodigo([racao, areia], ' 7890000000024 '), areia);
  assert.equal(produtoPorCodigo([racao, areia], '789000'), null);
  assert.equal(produtoPorCodigo([racao, areia], 'Areia'), null);
});

test('valida carrinho vazio e forma de pagamento', () => {
  assert.match(validarVenda([], 'pix'), /pelo menos um produto/);
  assert.match(validarVenda(comItens([racao]), ''), /forma de pagamento/);
  assert.match(validarVenda(comItens([racao]), 'boleto'), /forma de pagamento/);
  assert.equal(validarVenda(comItens([racao]), 'cartao'), '');
});

test('envia somente produto e quantidade para o back-end', () => {
  assert.deepEqual(montarVenda(comItens([racao, 2]), 'pix', ''), {
    formaPagamento: 'pix',
    clienteId: null,
    itens: [{ produtoId: 'r', quantidade: 2 }],
  });
  assert.equal(montarVenda(comItens([racao]), 'pix', 'c1').clienteId, 'c1');
});

test('período padrão vai do dia 1 do mês até hoje', () => {
  assert.deepEqual(periodoPadrao(new Date(2026, 10, 20)), {
    dataInicio: '2026-11-01',
    dataFim: '2026-11-20',
  });
  assert.equal(dataLocalISO(new Date(2026, 0, 5)), '2026-01-05');
});

test('valida o período do relatório', () => {
  assert.equal(validarPeriodo({ dataInicio: '2026-11-01', dataFim: '2026-11-01' }).valido, true);
  assert.ok(validarPeriodo({ dataInicio: '2026-11-30', dataFim: '2026-11-01' }).erros.dataFim);
  assert.ok(validarPeriodo({ dataInicio: '', dataFim: '2026-11-01' }).erros.dataInicio);
  assert.ok(validarPeriodo({ dataInicio: '2026-02-30', dataFim: '2026-03-01' }).erros.dataInicio);
});

test('descreve os itens da venda no relatório', () => {
  assert.equal(
    descreverItens([
      { nome: 'Ração', quantidade: 2 },
      { nome: 'Areia', quantidade: 1 },
    ]),
    '2× Ração, 1× Areia'
  );
});

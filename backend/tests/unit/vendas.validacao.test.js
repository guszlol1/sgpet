const {
  validarVenda,
  normalizarFormaPagamento,
} = require('../../src/modules/vendas/vendas.validacao');

const A = '11111111-1111-4111-8111-111111111111';
const B = '44444444-4444-4444-8444-444444444444';
const CLIENTE = '55555555-5555-4555-8555-555555555555';
const venda = { formaPagamento: 'pix', itens: [{ produtoId: A, quantidade: 2 }] };

describe('US07: validações da venda', () => {
  test('aceita venda válida e devolve somente produto e quantidade', () => {
    const r = validarVenda({ ...venda, valorTotal: 0.01, itens: [{ produtoId: A, quantidade: 2, preco: 1 }] });
    expect(r).toEqual({
      valido: true,
      erros: {},
      dados: { formaPagamento: 'pix', clienteId: null, itens: [{ produtoId: A, quantidade: 2 }] },
    });
  });

  test.each([undefined, null, [], {}, { ...venda, itens: [] }, { ...venda, itens: 'x' }])(
    'recusa carrinho vazio ou ausente: %j',
    (dados) => {
      const r = validarVenda(dados);
      expect(r.valido).toBe(false);
      expect(r.erros.itens).toMatch(/pelo menos um produto/);
    }
  );

  test.each([0, -1, 1.5, '2', null, true, NaN, Infinity, 100001])(
    'recusa quantidade inválida %j',
    (quantidade) => {
      const r = validarVenda({ ...venda, itens: [{ produtoId: A, quantidade }] });
      expect(r.valido).toBe(false);
      expect(r.erros['itens.0.quantidade']).toEqual(expect.any(String));
    }
  );

  test.each(['', 'abc', 123, null])('recusa produto inválido %j', (produtoId) => {
    expect(validarVenda({ ...venda, itens: [{ produtoId, quantidade: 1 }] }).erros).toHaveProperty([
      'itens.0.produtoId',
    ]);
  });

  test.each(['boleto', 'crediario', '', null, undefined, 1, 'cartao de credito'])(
    'recusa forma de pagamento %j',
    (formaPagamento) => {
      const r = validarVenda({ ...venda, formaPagamento });
      expect(r.valido).toBe(false);
      expect(r.erros.formaPagamento).toMatch(/dinheiro, Pix ou cartão/);
    }
  );

  test.each([
    ['dinheiro', 'dinheiro'],
    ['Dinheiro', 'dinheiro'],
    ['Pix', 'pix'],
    ['PIX', 'pix'],
    ['cartão', 'cartao'],
    [' Cartão ', 'cartao'],
    ['cartao', 'cartao'],
  ])('aceita forma de pagamento %j como %s', (formaPagamento, esperado) => {
    expect(validarVenda({ ...venda, formaPagamento }).dados.formaPagamento).toBe(esperado);
    expect(normalizarFormaPagamento(formaPagamento)).toBe(esperado);
  });

  test('cliente é opcional, mas precisa ser um id válido quando informado', () => {
    expect(validarVenda({ ...venda, clienteId: '' }).dados.clienteId).toBeNull();
    expect(validarVenda({ ...venda, clienteId: CLIENTE }).dados.clienteId).toBe(CLIENTE);
    expect(validarVenda({ ...venda, clienteId: 'x' }).erros.clienteId).toEqual(expect.any(String));
  });

  test('soma itens repetidos do mesmo produto', () => {
    const r = validarVenda({
      ...venda,
      itens: [
        { produtoId: A, quantidade: 2 },
        { produtoId: B, quantidade: 1 },
        { produtoId: A, quantidade: 3 },
      ],
    });
    expect(r.dados.itens).toEqual([
      { produtoId: A, quantidade: 5 },
      { produtoId: B, quantidade: 1 },
    ]);
  });

  test('limita a quantidade de itens da venda', () => {
    const itens = Array.from({ length: 101 }, () => ({ produtoId: A, quantidade: 1 }));
    expect(validarVenda({ ...venda, itens }).erros.itens).toMatch(/no máximo 100/);
  });
});

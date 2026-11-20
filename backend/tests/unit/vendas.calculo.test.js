const {
  calcularVenda,
  paraCentavos,
  somarValores,
  comAlertaEstoque,
} = require('../../src/modules/vendas/vendas.calculo');

const produto = (id, preco, saldo = 100, estoqueMinimo = 0) => ({
  id,
  nome: 'Produto ' + id,
  codigoBarras: '000000000' + id,
  preco,
  saldo,
  estoqueMinimo,
});

describe('US07: cálculo do total da venda', () => {
  test('item único: total = preço × quantidade', () => {
    const r = calcularVenda([{ produtoId: 'a', quantidade: 3 }], [produto('a', 29.9)]);
    expect(r.itens[0]).toMatchObject({ precoUnitario: 29.9, quantidade: 3, subtotal: 89.7 });
    expect(r.valorTotal).toBe(89.7);
  });

  test('múltiplos itens com quantidades variadas', () => {
    const r = calcularVenda(
      [
        { produtoId: 'a', quantidade: 2 },
        { produtoId: 'b', quantidade: 1 },
        { produtoId: 'c', quantidade: 5 },
      ],
      [produto('a', 249.9), produto('b', 12.5), produto('c', 3.99)]
    );
    expect(r.itens.map((i) => i.subtotal)).toEqual([499.8, 12.5, 19.95]);
    expect(r.valorTotal).toBe(532.25);
  });

  test.each([
    // [preços, quantidades, total esperado] — casos clássicos de erro em ponto flutuante
    [[0.1, 0.2], [1, 1], 0.3],
    [[19.99], [3], 59.97],
    [[0.07], [100], 7],
    [[1.15, 2.3, 4.45], [3, 3, 3], 23.7],
    [[9.95, 0.05], [7, 1], 69.7],
  ])('precisão de centavos: preços %j × %j = %s', (precos, quantidades, total) => {
    const produtos = precos.map((preco, i) => produto(String(i), preco));
    const itens = quantidades.map((quantidade, i) => ({ produtoId: String(i), quantidade }));
    expect(calcularVenda(itens, produtos).valorTotal).toBe(total);
  });

  test('0,1 + 0,2 em reais soma exatamente 0,30', () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(somarValores([0.1, 0.2])).toBe(0.3);
  });

  test.each([
    [29.9, 2990],
    [0.1, 10],
    [249.9, 24990],
    ['12.50', 1250],
  ])('converte %s reais em %s centavos', (reais, centavos) => {
    expect(paraCentavos(reais)).toBe(centavos);
  });

  test('usa o preço do cadastro, nunca um preço enviado no item', () => {
    const r = calcularVenda(
      [{ produtoId: 'a', quantidade: 1, preco: 0.01, subtotal: 0.01 }],
      [produto('a', 50)]
    );
    expect(r.valorTotal).toBe(50);
    expect(r.itens[0].precoUnitario).toBe(50);
  });

  test('informa o saldo após a baixa e o alerta de estoque mínimo', () => {
    const r = calcularVenda(
      [
        { produtoId: 'a', quantidade: 6 },
        { produtoId: 'b', quantidade: 1 },
      ],
      [produto('a', 10, 10, 5), produto('b', 10, 10, 5)]
    );
    expect(r.itens[0]).toMatchObject({ saldo: 4, estoqueMinimo: 5, alertaEstoqueBaixo: true });
    expect(r.itens[1]).toMatchObject({ saldo: 9, alertaEstoqueBaixo: false });
  });

  test('aponta produto inexistente e saldo insuficiente pelo índice do item', () => {
    const r = calcularVenda(
      [
        { produtoId: 'x', quantidade: 1 },
        { produtoId: 'a', quantidade: 4 },
      ],
      [produto('a', 10, 3)]
    );
    expect(r.naoEncontrados).toEqual({ 'itens.0.produtoId': 'Produto não encontrado.' });
    expect(r.semSaldo['itens.1.quantidade']).toMatch(/saldo disponível 3/);
  });

  test('vender exatamente o saldo disponível é permitido e zera o saldo', () => {
    const r = calcularVenda([{ produtoId: 'a', quantidade: 3 }], [produto('a', 10, 3, 0)]);
    expect(r.semSaldo).toEqual({});
    expect(r.itens[0]).toMatchObject({ saldo: 0, alertaEstoqueBaixo: true });
  });

  test.each([
    [4, 5, true],
    [5, 5, true],
    [6, 5, false],
    [0, 0, true],
  ])('saldo %s com mínimo %s gera alerta = %s', (saldo, estoqueMinimo, alerta) => {
    expect(comAlertaEstoque({ saldo, estoqueMinimo }).alertaEstoqueBaixo).toBe(alerta);
  });
});

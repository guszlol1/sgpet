const { validarProduto } = require('../../src/modules/produtos/produtos.validacao');

const produto = {
  nome: 'Ração', categoria: 'Alimentação', preco: 29.9, codigoBarras: '0123456789012', estoqueMinimo: 5,
};

describe('US02: validação de produtos', () => {
  test('normaliza textos e números sem perder zeros do código de barras', () => {
    const resultado = validarProduto({ ...produto, nome: ' Ração ', categoria: ' Alimentação ',
      preco: '29,90', codigoBarras: ' 0123456789012 ', estoqueMinimo: '5' });
    expect(resultado).toEqual({ valido: true, erros: {}, dados: produto });
  });

  test.each([undefined, null, ''])('estoque mínimo omitido (%j) assume zero', (estoqueMinimo) => {
    expect(validarProduto({ ...produto, estoqueMinimo }).dados.estoqueMinimo).toBe(0);
  });

  test.each([
    ['nome', ''], ['nome', 123], ['nome', 'a'.repeat(121)],
    ['categoria', ' '], ['categoria', 'a'.repeat(61)],
    ['preco', undefined], ['preco', null], ['preco', ''], ['preco', true],
    ['preco', 'abc'], ['preco', Infinity], ['preco', NaN], ['preco', 0],
    ['preco', -1], ['preco', 1.001], ['preco', 100000000],
    ['codigoBarras', ''], ['codigoBarras', '1234567'], ['codigoBarras', '1'.repeat(15)],
    ['codigoBarras', '1234567A'], ['estoqueMinimo', -1], ['estoqueMinimo', 1.5],
    ['estoqueMinimo', 'abc'], ['estoqueMinimo', true],
  ])('recusa %s inválido: %j', (campo, valor) => {
    const resultado = validarProduto({ ...produto, [campo]: valor });
    expect(resultado.valido).toBe(false);
    expect(resultado.erros[campo]).toEqual(expect.any(String));
  });

  test.each([0.01, 0.29, 1.1, 99999999.99])('aceita preço dentro dos limites: %s', (preco) => {
    expect(validarProduto({ ...produto, preco }).valido).toBe(true);
  });

  test.each(['12345678', '12345678901234'])('aceita limites do código: %s', (codigoBarras) => {
    expect(validarProduto({ ...produto, codigoBarras }).valido).toBe(true);
  });

  test('aceita os limites de nome e categoria', () => {
    expect(validarProduto({ ...produto, nome: 'a'.repeat(120), categoria: 'a'.repeat(60) }).valido)
      .toBe(true);
  });

  test('informa os campos obrigatórios ausentes de uma só vez', () => {
    expect(Object.keys(validarProduto().erros).sort()).toEqual(['categoria', 'codigoBarras', 'nome', 'preco']);
  });
});

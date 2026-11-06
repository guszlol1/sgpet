import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filtrarProdutos } from '../src/pages/Produtos/filtrarProdutos.js';
import { validarProduto, paraFormulario } from '../src/pages/Produtos/validarProduto.js';

const produtos = [
  { id: '1', nome: 'Ração Cães', categoria: 'Ração', preco: 29.9, codigoBarras: '0123456789012', estoqueMinimo: 2 },
  { id: '2', nome: 'Shampoo', categoria: 'Higiene', preco: 15, codigoBarras: '9876543210123', estoqueMinimo: 0 },
];
for (const busca of ['racao', 'RAÇÃO', '  ração  ', 'CÃES']) {
  test('US03: busca parcial sem acentos e maiúsculas: ' + busca, () => {
    assert.deepEqual(filtrarProdutos(produtos, busca).map(p => p.id), ['1']);
  });
}
test('US03: busca por código mantendo zero inicial', () => {
  assert.deepEqual(filtrarProdutos(produtos, '0123456789012').map(p => p.id), ['1']);
});
test('US03: busca vazia mostra todos sem alterar a lista', () => {
  assert.deepEqual(filtrarProdutos(produtos, ' '), produtos);
  assert.equal(produtos.length, 2);
});
test('US03: termo inexistente retorna lista vazia', () => {
  assert.deepEqual(filtrarProdutos(produtos, 'inexistente'), []);
});
test('edição formata preço em reais e preserva os valores do cadastro', () => {
  const form = paraFormulario(produtos[0]);
  assert.equal(form.preco, '29,90');
  assert.equal(form.codigoBarras, '0123456789012');
  assert.deepEqual(validarProduto(form), { valido: true, erros: {}, dados: {
    nome: 'Ração Cães', categoria: 'Ração', preco: 29.9, codigoBarras: '0123456789012', estoqueMinimo: 2,
  } });
});
for (const [campo, valor] of [['nome',''], ['categoria',''], ['preco','0'], ['preco','1,001'],
  ['codigoBarras','123'], ['estoqueMinimo','-1'], ['estoqueMinimo','1.5']]) {
  test('formulário recusa ' + campo + ' inválido: ' + valor, () => {
    const r = validarProduto({ ...paraFormulario(produtos[0]), [campo]: valor });
    assert.equal(r.valido, false);
    assert.equal(typeof r.erros[campo], 'string');
  });
}

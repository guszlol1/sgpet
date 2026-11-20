import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarEntrada, filtrarEstoque } from '../src/pages/Estoque/validarEntrada.js';
import {
  validarCliente,
  validarPet,
  filtrarClientes,
  petVazio,
} from '../src/pages/Clientes/validarCliente.js';
const estoque = [
  { id: '1', nome: 'Ração Cães', codigoBarras: '0123456789012', alertaEstoqueBaixo: true },
  { id: '2', nome: 'Shampoo', codigoBarras: '9876543210123', alertaEstoqueBaixo: false },
];
const entrada = { produtoId: '1', quantidade: ' 5 ', observacao: ' Reposição ' };
test('entrada converte quantidade para número e normaliza observação', () => {
  assert.deepEqual(validarEntrada(entrada), {
    valido: true,
    erros: {},
    dados: { produtoId: '1', quantidade: 5, observacao: 'Reposição' },
  });
});
for (const quantidade of ['', '0', '-1', '1.5', '1,5', 'abc', '1e3', '2147483648'])
  test('recusa quantidade inválida ' + quantidade, () => {
    assert.equal(validarEntrada({ ...entrada, quantidade }).valido, false);
  });
test('entrada exige produto', () =>
  assert.equal(validarEntrada({ ...entrada, produtoId: '' }).valido, false));
test('observação tem limite de 500 caracteres', () =>
  assert.equal(validarEntrada({ ...entrada, observacao: 'a'.repeat(501) }).valido, false));
test('busca estoque sem diferenciar acentos e maiúsculas', () =>
  assert.deepEqual(
    filtrarEstoque(estoque, 'RACAO').map((p) => p.id),
    ['1']
  ));
test('busca estoque por código preserva zero inicial', () =>
  assert.deepEqual(
    filtrarEstoque(estoque, '0123456789012').map((p) => p.id),
    ['1']
  ));
test('filtro de estoque baixo é combinado com busca', () => {
  assert.deepEqual(
    filtrarEstoque(estoque, '', true).map((p) => p.id),
    ['1']
  );
  assert.deepEqual(filtrarEstoque(estoque, 'Shampoo', true), []);
});
const pet = { nome: ' Luna ', especie: ' Gato ', raca: '' };
const cliente = {
  nome: ' Ana ',
  telefone: '(11) 99999-9999',
  email: ' ANA@SGPET.TEST ',
  pets: [pet],
};
test('cadastro normaliza contato e pets', () => {
  assert.deepEqual(validarCliente(cliente), {
    valido: true,
    erros: {},
    dados: {
      nome: 'Ana',
      telefone: '11999999999',
      email: 'ana@sgpet.test',
      pets: [{ nome: 'Luna', especie: 'Gato', raca: '' }],
    },
  });
});
test('contatos são opcionais', () =>
  assert.equal(validarCliente({ ...cliente, telefone: '', email: '' }).valido, true));
test('cadastro aceita vários pets', () =>
  assert.equal(validarCliente({ ...cliente, pets: [pet, pet] }).dados.pets.length, 2));
test('edição do cliente não altera pets', () =>
  assert.equal('pets' in validarCliente(cliente, false).dados, false));
for (const [campo, valor] of [
  ['nome', ''],
  ['nome', 'a'.repeat(121)],
  ['telefone', '123'],
  ['email', 'invalido'],
  ['pets', []],
  ['pets', Array(21).fill(pet)],
]) {
  test('cadastro recusa campo inválido: ' + campo, () =>
    assert.equal(validarCliente({ ...cliente, [campo]: valor }).valido, false)
  );
}
test('erros do pet identificam seu índice', () => {
  const r = validarCliente({ ...cliente, pets: [pet, petVazio()] });
  assert.equal(r.valido, false);
  assert.ok(r.erros['pets.1.nome']);
  assert.ok(r.erros['pets.1.especie']);
});
for (const [campo, valor] of [
  ['nome', ''],
  ['nome', 'a'.repeat(81)],
  ['especie', ''],
  ['especie', 'a'.repeat(61)],
  ['raca', 'a'.repeat(81)],
]) {
  test('pet recusa campo inválido: ' + campo, () =>
    assert.equal(validarPet({ ...pet, [campo]: valor }).valido, false)
  );
}
const clientes = [
  { nome: 'Márcia', telefone: '11999999999', email: 'marcia@sgpet.test', pets: [{ nome: 'Luna' }] },
];
for (const busca of ['marcia', 'LUNA', '1199999', 'marcia@sgpet.test', ''])
  test('busca de clientes e pets: ' + busca, () =>
    assert.equal(filtrarClientes(clientes, busca).length, 1)
  );
test('busca inexistente não retorna cliente', () =>
  assert.deepEqual(filtrarClientes(clientes, 'inexistente'), []));

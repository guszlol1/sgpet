const { textoAparado } = require('../../shared/validacao');

const PRECO_MAXIMO = 99999999.99;
const CODIGO_BARRAS = /^[0-9]{8,14}$/;

function paraNumero(valor) {
  if (typeof valor === 'number') return valor;
  if (typeof valor === 'string' && valor.trim() !== '') {
    return Number(valor.trim().replace(',', '.'));
  }
  return NaN;
}

function temAteDuasCasas(numero) {
  const centavos = numero * 100;
  return Math.abs(centavos - Math.round(centavos)) < 1e-6;
}

// Valida o corpo de criação/edição de produto.
// Devolve { valido, erros: { campo: mensagem }, dados } com os dados já normalizados.
function validarProduto(entrada = {}) {
  const erros = {};

  const nome = textoAparado(entrada.nome);
  if (!nome) erros.nome = 'Informe o nome do produto.';
  else if (nome.length > 120) erros.nome = 'O nome deve ter no máximo 120 caracteres.';

  const categoria = textoAparado(entrada.categoria);
  if (!categoria) erros.categoria = 'Informe a categoria.';
  else if (categoria.length > 60) erros.categoria = 'A categoria deve ter no máximo 60 caracteres.';

  const preco = paraNumero(entrada.preco);
  if (entrada.preco === undefined || entrada.preco === null || entrada.preco === '') {
    erros.preco = 'Informe o preço.';
  } else if (!Number.isFinite(preco)) erros.preco = 'O preço deve ser um número.';
  else if (preco <= 0) erros.preco = 'O preço deve ser maior que zero.';
  else if (preco > PRECO_MAXIMO) erros.preco = 'Preço acima do valor máximo permitido.';
  else if (!temAteDuasCasas(preco)) erros.preco = 'O preço deve ter no máximo 2 casas decimais.';

  const codigoBarras =
    typeof entrada.codigoBarras === 'number'
      ? String(entrada.codigoBarras)
      : textoAparado(entrada.codigoBarras);
  if (!codigoBarras) erros.codigoBarras = 'Informe o código de barras.';
  else if (!CODIGO_BARRAS.test(codigoBarras)) {
    erros.codigoBarras = 'O código de barras deve ter de 8 a 14 dígitos, apenas números.';
  }

  let estoqueMinimo = 0;
  if (entrada.estoqueMinimo !== undefined && entrada.estoqueMinimo !== null && entrada.estoqueMinimo !== '') {
    estoqueMinimo = paraNumero(entrada.estoqueMinimo);
    if (!Number.isInteger(estoqueMinimo) || estoqueMinimo < 0) {
      erros.estoqueMinimo = 'O estoque mínimo deve ser um número inteiro maior ou igual a zero.';
    }
  }

  return {
    valido: Object.keys(erros).length === 0,
    erros,
    dados: { nome, categoria, preco, codigoBarras, estoqueMinimo },
  };
}

module.exports = { validarProduto };

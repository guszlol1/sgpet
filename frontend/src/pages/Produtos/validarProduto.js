// Mesmas regras do back-end (backend/src/modules/produtos/produtos.validacao.js),
// para mostrar o erro antes de enviar. O back-end continua sendo quem decide.

export const produtoVazio = { nome: '', categoria: '', preco: '', codigoBarras: '', estoqueMinimo: '0' };

export function paraFormulario(produto) {
  return {
    nome: produto.nome,
    categoria: produto.categoria,
    preco: produto.preco.toFixed(2).replace('.', ','),
    codigoBarras: produto.codigoBarras,
    estoqueMinimo: String(produto.estoqueMinimo),
  };
}

export function validarProduto(form) {
  const erros = {};
  const nome = form.nome.trim();
  const categoria = form.categoria.trim();
  const precoTexto = form.preco.trim().replace(',', '.');
  const preco = Number(precoTexto);
  const codigoBarras = form.codigoBarras.trim();
  const estoqueTexto = form.estoqueMinimo.trim();
  const estoqueMinimo = estoqueTexto === '' ? 0 : Number(estoqueTexto);

  if (!nome) erros.nome = 'Informe o nome do produto.';
  else if (nome.length > 120) erros.nome = 'O nome deve ter no máximo 120 caracteres.';

  if (!categoria) erros.categoria = 'Informe a categoria.';
  else if (categoria.length > 60) erros.categoria = 'A categoria deve ter no máximo 60 caracteres.';

  if (!precoTexto) erros.preco = 'Informe o preço.';
  else if (!/^\d+(\.\d{1,2})?$/.test(precoTexto)) erros.preco = 'Use um valor como 29,90.';
  else if (preco <= 0) erros.preco = 'O preço deve ser maior que zero.';

  if (!codigoBarras) erros.codigoBarras = 'Informe o código de barras.';
  else if (!/^\d{8,14}$/.test(codigoBarras)) erros.codigoBarras = 'De 8 a 14 dígitos, apenas números.';

  if (!Number.isInteger(estoqueMinimo) || estoqueMinimo < 0) {
    erros.estoqueMinimo = 'Número inteiro maior ou igual a zero.';
  }

  return {
    valido: Object.keys(erros).length === 0,
    erros,
    dados: { nome, categoria, preco, codigoBarras, estoqueMinimo },
  };
}

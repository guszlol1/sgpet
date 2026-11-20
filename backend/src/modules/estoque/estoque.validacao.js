const { textoAparado, ehUuid } = require('../../shared/validacao');
const QUANTIDADE_MAXIMA = 2147483647;
function validarEntrada(entrada) {
  const body = entrada && typeof entrada === 'object' && !Array.isArray(entrada) ? entrada : {};
  const erros = {};
  const produtoId = textoAparado(body.produtoId);
  const quantidade = typeof body.quantidade === 'number' ? body.quantidade : NaN;
  const observacao = textoAparado(body.observacao);
  if (!ehUuid(produtoId)) erros.produtoId = 'Selecione um produto válido.';
  if (!Number.isInteger(quantidade) || quantidade <= 0 || quantidade > QUANTIDADE_MAXIMA) {
    erros.quantidade = 'Informe uma quantidade inteira entre 1 e 2147483647.';
  }
  if (body.observacao != null && typeof body.observacao !== 'string')
    erros.observacao = 'Informe uma observação em texto.';
  else if (observacao.length > 500)
    erros.observacao = 'A observação deve ter no máximo 500 caracteres.';
  return {
    valido: Object.keys(erros).length === 0,
    erros,
    dados: { produtoId, quantidade, observacao },
  };
}
module.exports = { validarEntrada };

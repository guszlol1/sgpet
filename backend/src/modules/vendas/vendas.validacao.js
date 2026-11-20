const { ehUuid, textoAparado } = require('../../shared/validacao');

const MAXIMO_ITENS = 100;
const QUANTIDADE_MAXIMA = 100000;
const FORMAS_PAGAMENTO = ['dinheiro', 'pix', 'cartao'];

// Aceita "Pix", "Cartão", "DINHEIRO" etc. e devolve o código gravado no banco.
function normalizarFormaPagamento(valor) {
  if (typeof valor !== 'string') return '';
  return valor
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

// Valida o corpo de POST /vendas. Só produto e quantidade vêm do front-end:
// preço, subtotal e total são sempre calculados no back-end.
function validarVenda(entrada) {
  const body = entrada && typeof entrada === 'object' && !Array.isArray(entrada) ? entrada : {};
  const erros = {};

  const formaPagamento = normalizarFormaPagamento(body.formaPagamento);
  if (!FORMAS_PAGAMENTO.includes(formaPagamento)) {
    erros.formaPagamento = 'Escolha a forma de pagamento: dinheiro, Pix ou cartão.';
  }

  let clienteId = null;
  if (body.clienteId != null && body.clienteId !== '') {
    clienteId = textoAparado(body.clienteId);
    if (!ehUuid(clienteId)) erros.clienteId = 'Selecione um cliente válido.';
  }

  const itensRecebidos = Array.isArray(body.itens) ? body.itens : [];
  if (itensRecebidos.length === 0) {
    erros.itens = 'Adicione pelo menos um produto à venda.';
  } else if (itensRecebidos.length > MAXIMO_ITENS) {
    erros.itens = `A venda pode ter no máximo ${MAXIMO_ITENS} itens.`;
  }

  // Itens repetidos do mesmo produto são somados numa linha só.
  const itens = [];
  const indicePorProduto = new Map();
  itensRecebidos.slice(0, MAXIMO_ITENS).forEach((item, indice) => {
    const dados = item && typeof item === 'object' ? item : {};
    const produtoId = textoAparado(dados.produtoId);
    const quantidade = dados.quantidade;
    let itemValido = true;
    if (!ehUuid(produtoId)) {
      erros[`itens.${indice}.produtoId`] = 'Selecione um produto válido.';
      itemValido = false;
    }
    if (!Number.isInteger(quantidade) || quantidade <= 0 || quantidade > QUANTIDADE_MAXIMA) {
      erros[`itens.${indice}.quantidade`] =
        `Informe uma quantidade inteira entre 1 e ${QUANTIDADE_MAXIMA}.`;
      itemValido = false;
    }
    if (!itemValido) return;
    if (indicePorProduto.has(produtoId)) {
      itens[indicePorProduto.get(produtoId)].quantidade += quantidade;
    } else {
      indicePorProduto.set(produtoId, itens.length);
      itens.push({ produtoId, quantidade });
    }
  });

  itens.forEach((item, indice) => {
    if (item.quantidade > QUANTIDADE_MAXIMA) {
      erros[`itens.${indice}.quantidade`] =
        `Informe uma quantidade inteira entre 1 e ${QUANTIDADE_MAXIMA}.`;
    }
  });

  return {
    valido: Object.keys(erros).length === 0,
    erros,
    dados: { formaPagamento, clienteId, itens },
  };
}

module.exports = { validarVenda, normalizarFormaPagamento, FORMAS_PAGAMENTO, QUANTIDADE_MAXIMA };

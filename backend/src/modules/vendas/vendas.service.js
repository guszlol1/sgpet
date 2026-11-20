const { erros } = require('../../shared/erros');
const { validarVenda } = require('./vendas.validacao');
const { calcularVenda, comAlertaEstoque } = require('./vendas.calculo');

const PAPEIS_VENDA = ['gerente', 'atendente'];

// Monta o resumo devolvido ao PDV, com o alerta de estoque mínimo de cada item.
function resumoDaVenda(venda) {
  const itens = venda.itens.map(comAlertaEstoque);
  return {
    ...venda,
    itens,
    quantidadeItens: itens.reduce((total, item) => total + item.quantidade, 0),
    alertasEstoque: itens
      .filter((item) => item.alertaEstoqueBaixo)
      .map(({ produtoId, nome, saldo, estoqueMinimo }) => ({
        produtoId,
        nome,
        saldo,
        estoqueMinimo,
      })),
  };
}

function criarVendasService(repo) {
  return {
    // Catálogo do PDV: produtos ativos com preço e saldo disponível.
    async listarProdutos() {
      return (await repo.listarProdutos()).map(comAlertaEstoque);
    },

    async registrar(entrada, usuario) {
      if (!usuario || !PAPEIS_VENDA.includes(usuario.papel)) throw erros.semPermissao();

      const resultado = validarVenda(entrada);
      if (!resultado.valido) {
        throw erros.requisicaoInvalida('Dados da venda inválidos.', resultado.erros);
      }
      const { formaPagamento, clienteId, itens } = resultado.dados;

      if (clienteId && !(await repo.clienteExiste(clienteId))) {
        throw erros.naoEncontrado('Cliente não encontrado.');
      }

      // Conferência prévia com os dados reais do cadastro, para devolver mensagens claras.
      // O repositório repete a conferência dentro da transação, com os produtos travados.
      const produtos = await repo.buscarProdutos(itens.map((item) => item.produtoId));
      const calculo = calcularVenda(itens, produtos);
      if (Object.keys(calculo.naoEncontrados).length > 0) {
        throw erros.naoEncontrado('Produto não encontrado.', calculo.naoEncontrados);
      }
      if (Object.keys(calculo.semSaldo).length > 0) {
        throw erros.conflito(
          'Estoque insuficiente para concluir a venda. Nenhum item foi baixado.',
          calculo.semSaldo
        );
      }

      const venda = await repo.registrar({
        usuarioId: usuario.id,
        clienteId,
        formaPagamento,
        itens,
      });
      return resumoDaVenda(venda);
    },
  };
}

module.exports = { criarVendasService, resumoDaVenda };

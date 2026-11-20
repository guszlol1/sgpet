const { erros } = require('../../shared/erros');
const { validarPeriodo } = require('./relatorios.validacao');
const { paraCentavos, paraReais } = require('../vendas/vendas.calculo');

// Soma as vendas do período em centavos, para o total bater exatamente com as vendas.
function resumirVendas(vendas) {
  let totalCentavos = 0;
  let quantidadeItens = 0;
  const lista = vendas.map((venda) => {
    const itensDaVenda = venda.itens.reduce((total, item) => total + item.quantidade, 0);
    totalCentavos += paraCentavos(venda.valorTotal);
    quantidadeItens += itensDaVenda;
    return { ...venda, quantidadeItens: itensDaVenda };
  });
  return {
    quantidadeVendas: lista.length,
    quantidadeItens,
    valorTotal: paraReais(totalCentavos),
    vendas: lista,
  };
}

function criarRelatoriosService(repo) {
  return {
    // US08: vendas do período (datas inclusivas), com quantidade e valor total.
    async vendasPorPeriodo(query, usuario) {
      if (!usuario || usuario.papel !== 'gerente') throw erros.semPermissao();
      const resultado = validarPeriodo(query);
      if (!resultado.valido) {
        throw erros.requisicaoInvalida('Período inválido.', resultado.erros);
      }
      const { dataInicio, dataFim, inicio, fim } = resultado.dados;
      const vendas = await repo.listarVendasPorPeriodo({ inicio, fim });
      return { periodo: { dataInicio, dataFim }, ...resumirVendas(vendas) };
    },
  };
}

module.exports = { criarRelatoriosService, resumirVendas };

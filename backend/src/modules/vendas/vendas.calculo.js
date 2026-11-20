// Regras de cálculo da venda. Os valores são somados em centavos inteiros para
// evitar erros de ponto flutuante (ex.: 0,1 + 0,2 = 0,30000000000000004).

function paraCentavos(valor) {
  return Math.round(Number(valor) * 100);
}

function paraReais(centavos) {
  return centavos / 100;
}

function somarValores(valores) {
  return paraReais(valores.reduce((total, valor) => total + paraCentavos(valor), 0));
}

function comAlertaEstoque(item) {
  return { ...item, alertaEstoqueBaixo: item.saldo <= item.estoqueMinimo };
}

// Recebe os itens pedidos ({ produtoId, quantidade }) e os produtos reais do cadastro.
// Devolve os itens com preço do cadastro, subtotal, saldo após a baixa e o total da venda,
// ou os problemas encontrados (produto inexistente ou saldo insuficiente), por índice do item.
function calcularVenda(itens, produtos) {
  const porId = new Map(produtos.map((p) => [p.id, p]));
  const naoEncontrados = {};
  const semSaldo = {};
  const calculados = [];
  let totalCentavos = 0;

  itens.forEach((item, indice) => {
    const produto = porId.get(item.produtoId);
    if (!produto) {
      naoEncontrados[`itens.${indice}.produtoId`] = 'Produto não encontrado.';
      return;
    }
    if (produto.saldo < item.quantidade) {
      semSaldo[`itens.${indice}.quantidade`] =
        `Estoque insuficiente para ${produto.nome}: saldo disponível ${produto.saldo}.`;
      return;
    }
    const precoCentavos = paraCentavos(produto.preco);
    const subtotalCentavos = precoCentavos * item.quantidade;
    totalCentavos += subtotalCentavos;
    calculados.push(
      comAlertaEstoque({
        produtoId: produto.id,
        nome: produto.nome,
        codigoBarras: produto.codigoBarras,
        quantidade: item.quantidade,
        precoUnitario: paraReais(precoCentavos),
        subtotal: paraReais(subtotalCentavos),
        saldo: produto.saldo - item.quantidade,
        estoqueMinimo: produto.estoqueMinimo,
      })
    );
  });

  return {
    naoEncontrados,
    semSaldo,
    itens: calculados,
    valorTotal: paraReais(totalCentavos),
  };
}

module.exports = { paraCentavos, paraReais, somarValores, calcularVenda, comAlertaEstoque };

function vendaDoRelatorio(v) {
  return {
    id: v.id,
    dataHora: v.data_hora,
    formaPagamento: v.forma_pagamento,
    valorTotal: Number(v.valor_total),
    clienteId: v.cliente_id,
    clienteNome: v.cliente_nome,
    atendenteNome: v.usuario_nome,
    itens: (v.itens || []).map((i) => ({
      produtoId: i.produto_id,
      nome: i.nome,
      quantidade: i.quantidade,
      precoUnitario: Number(i.preco_unitario),
      subtotal: Number(i.subtotal),
    })),
  };
}

function criarRelatoriosRepository({ supabaseAdmin }) {
  return {
    // Usa a função relatorio_vendas, que devolve tudo num único JSON
    // (sem o limite de 1000 linhas por consulta da API do Supabase).
    async listarVendasPorPeriodo({ inicio, fim }) {
      const { data, error } = await supabaseAdmin.rpc('relatorio_vendas', {
        p_inicio: inicio,
        p_fim: fim,
      });
      if (error) throw error;
      return (data || []).map(vendaDoRelatorio);
    },
  };
}

module.exports = { criarRelatoriosRepository, vendaDoRelatorio };

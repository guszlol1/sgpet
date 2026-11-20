const { erros } = require('../../shared/erros');

const COLUNAS_PRODUTO = 'id, nome, categoria, preco, codigo_barras, saldo, estoque_minimo';

function produtoParaApi(p) {
  return {
    id: p.id,
    nome: p.nome,
    categoria: p.categoria,
    preco: Number(p.preco),
    codigoBarras: p.codigo_barras,
    saldo: p.saldo,
    estoqueMinimo: p.estoque_minimo,
  };
}

function vendaParaApi(v) {
  return {
    id: v.id,
    dataHora: v.data_hora,
    usuarioId: v.usuario_id,
    clienteId: v.cliente_id,
    formaPagamento: v.forma_pagamento,
    valorTotal: Number(v.valor_total),
    itens: v.itens.map((i) => ({
      produtoId: i.produto_id,
      nome: i.nome,
      codigoBarras: i.codigo_barras,
      quantidade: i.quantidade,
      precoUnitario: Number(i.preco_unitario),
      subtotal: Number(i.subtotal),
      saldo: i.saldo,
      estoqueMinimo: i.estoque_minimo,
    })),
  };
}

function lerDetalhe(error) {
  try {
    return JSON.parse(error.details);
  } catch {
    return null;
  }
}

// Erros levantados pela função registrar_venda (ver a migração da Sprint 3).
function tratarErroVenda(error) {
  if (error.code === 'SGP01') {
    const d = lerDetalhe(error);
    throw erros.conflito(
      'Estoque insuficiente para concluir a venda. Nenhum item foi baixado.',
      d ? { itens: `Estoque insuficiente para ${d.nome}: saldo disponível ${d.saldo}.` } : undefined
    );
  }
  if (error.code === 'SGP02') throw erros.naoEncontrado('Cliente não encontrado.');
  if (error.code === 'P0002') throw erros.naoEncontrado('Produto não encontrado.');
  if (error.code === '42501') throw erros.semPermissao();
  if (['22023', '22003', '22P02', '23514'].includes(error.code)) {
    throw erros.requisicaoInvalida('Dados da venda inválidos.');
  }
  throw error;
}

function criarVendasRepository({ supabaseAdmin }) {
  return {
    async listarProdutos() {
      const { data, error } = await supabaseAdmin
        .from('produtos')
        .select(COLUNAS_PRODUTO)
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return data.map(produtoParaApi);
    },

    async buscarProdutos(ids) {
      const { data, error } = await supabaseAdmin
        .from('produtos')
        .select(COLUNAS_PRODUTO)
        .in('id', ids)
        .eq('ativo', true);
      if (error) throw error;
      return data.map(produtoParaApi);
    },

    async clienteExiste(id) {
      const { data, error } = await supabaseAdmin
        .from('clientes')
        .select('id')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },

    // Grava venda, itens e baixa de estoque numa única transação no banco.
    async registrar({ usuarioId, clienteId, formaPagamento, itens }) {
      const { data, error } = await supabaseAdmin.rpc('registrar_venda', {
        p_usuario_id: usuarioId,
        p_cliente_id: clienteId,
        p_forma_pagamento: formaPagamento,
        p_itens: itens.map((i) => ({ produto_id: i.produtoId, quantidade: i.quantidade })),
      });
      if (error) tratarErroVenda(error);
      return vendaParaApi(data);
    },
  };
}

module.exports = { criarVendasRepository, produtoParaApi, vendaParaApi };

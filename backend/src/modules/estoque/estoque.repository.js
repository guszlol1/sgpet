const { erros } = require('../../shared/erros');
function criarEstoqueRepository({ supabaseAdmin }) {
  return {
    async listar() {
      const { data, error } = await supabaseAdmin
        .from('produtos')
        .select('id, nome, categoria, codigo_barras, saldo, estoque_minimo')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return data.map((p) => ({
        id: p.id,
        nome: p.nome,
        categoria: p.categoria,
        codigoBarras: p.codigo_barras,
        saldo: p.saldo,
        estoqueMinimo: p.estoque_minimo,
      }));
    },
    async registrarEntrada({ produtoId, quantidade, observacao, usuarioId }) {
      const { data, error } = await supabaseAdmin.rpc('registrar_entrada_estoque', {
        p_produto_id: produtoId,
        p_quantidade: quantidade,
        p_usuario_id: usuarioId,
        p_observacao: observacao,
      });
      if (error) {
        if (error.code === 'P0002') throw erros.naoEncontrado('Produto não encontrado.');
        if (error.code === '42501') throw erros.semPermissao();
        if (['22003', '22023'].includes(error.code))
          throw erros.requisicaoInvalida('Não foi possível registrar a quantidade informada.', {
            quantidade: 'Quantidade inválida ou acima do limite do saldo.',
          });
        throw error;
      }
      return {
        entradaId: data.entrada_id,
        produtoId: data.produto_id,
        quantidade: data.quantidade,
        saldo: data.saldo,
        estoqueMinimo: data.estoque_minimo,
      };
    },
  };
}
module.exports = { criarEstoqueRepository };

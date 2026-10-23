const { erros } = require('../../shared/erros');

const COLUNAS = 'id, nome, categoria, preco, codigo_barras, estoque_minimo, criado_em, atualizado_em';
const VIOLACAO_UNICIDADE = '23505';

function paraApi(linha) {
  return {
    id: linha.id,
    nome: linha.nome,
    categoria: linha.categoria,
    preco: Number(linha.preco),
    codigoBarras: linha.codigo_barras,
    estoqueMinimo: linha.estoque_minimo,
    criadoEm: linha.criado_em,
    atualizadoEm: linha.atualizado_em,
  };
}

function paraBanco(dados) {
  return {
    nome: dados.nome,
    categoria: dados.categoria,
    preco: dados.preco,
    codigo_barras: dados.codigoBarras,
    estoque_minimo: dados.estoqueMinimo,
  };
}

function tratarErro(error) {
  if (error.code === VIOLACAO_UNICIDADE) {
    // Garantia do banco caso dois cadastros com o mesmo código cheguem ao mesmo tempo.
    throw erros.conflito('Já existe um produto com este código de barras.', {
      codigoBarras: 'Já existe um produto com este código de barras.',
    });
  }
  throw error;
}

function criarProdutosRepository({ supabaseAdmin }) {
  const tabela = () => supabaseAdmin.from('produtos');

  return {
    async listar() {
      const { data, error } = await tabela().select(COLUNAS).eq('ativo', true).order('nome');
      if (error) tratarErro(error);
      return data.map(paraApi);
    },

    async buscarPorId(id) {
      const { data, error } = await tabela()
        .select(COLUNAS)
        .eq('id', id)
        .eq('ativo', true)
        .maybeSingle();
      if (error) tratarErro(error);
      return data && paraApi(data);
    },

    async existeCodigoBarras(codigoBarras, ignorarId) {
      let consulta = tabela().select('id').eq('codigo_barras', codigoBarras).eq('ativo', true);
      if (ignorarId) consulta = consulta.neq('id', ignorarId);
      const { data, error } = await consulta.limit(1);
      if (error) tratarErro(error);
      return data.length > 0;
    },

    async criar(dados) {
      const { data, error } = await tabela().insert(paraBanco(dados)).select(COLUNAS).single();
      if (error) tratarErro(error);
      return paraApi(data);
    },

    async atualizar(id, dados) {
      const { data, error } = await tabela()
        .update(paraBanco(dados))
        .eq('id', id)
        .eq('ativo', true)
        .select(COLUNAS)
        .maybeSingle();
      if (error) tratarErro(error);
      return data && paraApi(data);
    },

    // Remoção lógica: marca o produto como inativo.
    async desativar(id) {
      const { data, error } = await tabela()
        .update({ ativo: false })
        .eq('id', id)
        .eq('ativo', true)
        .select('id')
        .maybeSingle();
      if (error) tratarErro(error);
      return Boolean(data);
    },
  };
}

module.exports = { criarProdutosRepository };

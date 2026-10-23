const { erros } = require('../../shared/erros');
const { ehUuid } = require('../../shared/validacao');
const { validarProduto } = require('./produtos.validacao');

const NAO_ENCONTRADO = 'Produto não encontrado.';
const CODIGO_DUPLICADO = 'Já existe um produto com este código de barras.';

function criarProdutosService(repo) {
  function validar(entrada) {
    const { valido, erros: errosCampos, dados } = validarProduto(entrada);
    if (!valido) throw erros.requisicaoInvalida('Dados do produto inválidos.', errosCampos);
    return dados;
  }

  async function garantirCodigoUnico(codigoBarras, ignorarId) {
    if (await repo.existeCodigoBarras(codigoBarras, ignorarId)) {
      throw erros.conflito(CODIGO_DUPLICADO, { codigoBarras: CODIGO_DUPLICADO });
    }
  }

  return {
    listar() {
      return repo.listar();
    },

    async obter(id) {
      const produto = ehUuid(id) ? await repo.buscarPorId(id) : null;
      if (!produto) throw erros.naoEncontrado(NAO_ENCONTRADO);
      return produto;
    },

    async criar(entrada) {
      const dados = validar(entrada);
      await garantirCodigoUnico(dados.codigoBarras);
      return repo.criar(dados);
    },

    async atualizar(id, entrada) {
      if (!ehUuid(id)) throw erros.naoEncontrado(NAO_ENCONTRADO);
      const dados = validar(entrada);
      await garantirCodigoUnico(dados.codigoBarras, id);

      const produto = await repo.atualizar(id, dados);
      if (!produto) throw erros.naoEncontrado(NAO_ENCONTRADO);
      return produto;
    },

    async remover(id) {
      const removido = ehUuid(id) && (await repo.desativar(id));
      if (!removido) throw erros.naoEncontrado(NAO_ENCONTRADO);
    },
  };
}

module.exports = { criarProdutosService };

const { erros } = require('../../shared/erros');
const { validarEntrada } = require('./estoque.validacao');
function comAlerta(produto) {
  return { ...produto, alertaEstoqueBaixo: produto.saldo <= produto.estoqueMinimo };
}
function criarEstoqueService(repo) {
  return {
    async listar() {
      return (await repo.listar()).map(comAlerta);
    },
    async registrarEntrada(entrada, usuario) {
      if (!usuario || usuario.papel !== 'gerente') throw erros.semPermissao();
      const resultado = validarEntrada(entrada);
      if (!resultado.valido)
        throw erros.requisicaoInvalida('Dados da entrada inválidos.', resultado.erros);
      return comAlerta(await repo.registrarEntrada({ ...resultado.dados, usuarioId: usuario.id }));
    },
  };
}
module.exports = { criarEstoqueService, comAlerta };

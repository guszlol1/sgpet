const { erros } = require('../../shared/erros');
const { ehUuid } = require('../../shared/validacao');
const { validarCliente, validarPet } = require('./clientes.validacao');
function validar(resultado, mensagem) {
  if (!resultado.valido) throw erros.requisicaoInvalida(mensagem, resultado.erros);
  return resultado.dados;
}
function criarClientesService(repo) {
  async function obter(id) {
    const cliente = ehUuid(id) ? await repo.obter(id) : null;
    if (!cliente) throw erros.naoEncontrado('Cliente não encontrado.');
    return cliente;
  }
  return {
    listar() {
      return repo.listar();
    },
    obter,
    criar(entrada) {
      return repo.criar(
        validar(validarCliente(entrada, { comPets: true }), 'Dados do cliente inválidos.')
      );
    },
    async atualizar(id, entrada) {
      await obter(id);
      const cliente = await repo.atualizar(
        id,
        validar(validarCliente(entrada), 'Dados do cliente inválidos.')
      );
      if (!cliente) throw erros.naoEncontrado('Cliente não encontrado.');
      return cliente;
    },
    async adicionarPet(clienteId, entrada) {
      await obter(clienteId);
      return repo.adicionarPet(clienteId, validar(validarPet(entrada), 'Dados do pet inválidos.'));
    },
    async atualizarPet(clienteId, petId, entrada) {
      if (!ehUuid(petId)) throw erros.naoEncontrado('Pet não encontrado.');
      await obter(clienteId);
      const pet = await repo.atualizarPet(
        clienteId,
        petId,
        validar(validarPet(entrada), 'Dados do pet inválidos.')
      );
      if (!pet) throw erros.naoEncontrado('Pet não encontrado para este cliente.');
      return pet;
    },
  };
}
module.exports = { criarClientesService };

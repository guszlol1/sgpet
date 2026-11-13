import { requisicao } from './cliente';
export const listarClientes = () => requisicao('/clientes');
export const criarCliente = (dados) => requisicao('/clientes', { metodo: 'POST', corpo: dados });
export const atualizarCliente = (id, dados) =>
  requisicao('/clientes/' + id, { metodo: 'PUT', corpo: dados });
export const adicionarPet = (clienteId, dados) =>
  requisicao('/clientes/' + clienteId + '/pets', { metodo: 'POST', corpo: dados });
export const atualizarPet = (clienteId, petId, dados) =>
  requisicao('/clientes/' + clienteId + '/pets/' + petId, { metodo: 'PUT', corpo: dados });

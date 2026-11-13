import { requisicao } from './cliente';
export const listarEstoque = () => requisicao('/estoque');
export const registrarEntrada = (entrada) =>
  requisicao('/estoque/entradas', { metodo: 'POST', corpo: entrada });

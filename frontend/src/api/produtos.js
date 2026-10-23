import { requisicao } from './cliente';

export const listarProdutos = () => requisicao('/produtos');
export const criarProduto = (produto) => requisicao('/produtos', { metodo: 'POST', corpo: produto });
export const atualizarProduto = (id, produto) =>
  requisicao(`/produtos/${id}`, { metodo: 'PUT', corpo: produto });
export const removerProduto = (id) => requisicao(`/produtos/${id}`, { metodo: 'DELETE' });

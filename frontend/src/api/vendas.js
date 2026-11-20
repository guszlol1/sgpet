import { requisicao } from './cliente';
export const listarProdutosVenda = () => requisicao('/vendas/produtos');
export const registrarVenda = (venda) => requisicao('/vendas', { metodo: 'POST', corpo: venda });

import { requisicao } from './cliente';
export const buscarRelatorioVendas = (dataInicio, dataFim) =>
  requisicao('/relatorios/vendas?' + new URLSearchParams({ dataInicio, dataFim }));

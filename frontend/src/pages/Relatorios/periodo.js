// Funções do relatório de vendas (sem React), testadas em tests/sprint3.test.js.

export const ROTULO_PAGAMENTO = { dinheiro: 'Dinheiro', pix: 'Pix', cartao: 'Cartão' };

const DATA = /^\d{4}-\d{2}-\d{2}$/;

// Data local no formato AAAA-MM-DD (o que o <input type="date"> usa).
export function dataLocalISO(data = new Date()) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

// Padrão: do primeiro dia do mês até hoje.
export function periodoPadrao(hoje = new Date()) {
  return {
    dataInicio: dataLocalISO(new Date(hoje.getFullYear(), hoje.getMonth(), 1)),
    dataFim: dataLocalISO(hoje),
  };
}

function dataValida(valor) {
  if (!DATA.test(valor || '')) return false;
  const [ano, mes, dia] = valor.split('-').map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
}

export function validarPeriodo({ dataInicio, dataFim }) {
  const erros = {};
  if (!dataValida(dataInicio)) erros.dataInicio = 'Informe a data inicial.';
  if (!dataValida(dataFim)) erros.dataFim = 'Informe a data final.';
  if (!erros.dataInicio && !erros.dataFim && dataInicio > dataFim) {
    erros.dataFim = 'A data final deve ser igual ou posterior à inicial.';
  }
  return { valido: Object.keys(erros).length === 0, erros };
}

const formatadorDataHora = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
});

export function formatarDataHora(iso) {
  return formatadorDataHora.format(new Date(iso));
}

export function descreverItens(itens) {
  return itens.map((i) => `${i.quantidade}× ${i.nome}`).join(', ');
}

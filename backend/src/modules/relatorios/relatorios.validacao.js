// A loja fica em São Carlos (SP). O Brasil não tem horário de verão desde 2019,
// então o fuso de Brasília é fixo em -03:00.
const FUSO_LOJA = '-03:00';
const DIAS_MAXIMOS = 366;
const DATA = /^(\d{4})-(\d{2})-(\d{2})$/;
const UM_DIA_MS = 24 * 60 * 60 * 1000;

// Converte "AAAA-MM-DD" em milissegundos UTC do dia; null se a data não existir (ex.: 31/02).
function lerData(valor) {
  const partes = typeof valor === 'string' ? DATA.exec(valor.trim()) : null;
  if (!partes) return null;
  const [ano, mes, dia] = partes.slice(1).map(Number);
  const ms = Date.UTC(ano, mes - 1, dia);
  const data = new Date(ms);
  if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) {
    return null;
  }
  return ms;
}

function formatarDia(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

// Valida dataInicio e dataFim (inclusivas, no horário da loja) e devolve o intervalo
// [inicio, fim) em ISO com fuso, pronto para consultar o banco.
function validarPeriodo(query) {
  const q = query && typeof query === 'object' ? query : {};
  const erros = {};
  const inicioMs = lerData(q.dataInicio);
  const fimMs = lerData(q.dataFim);

  if (inicioMs === null) erros.dataInicio = 'Informe a data inicial no formato AAAA-MM-DD.';
  if (fimMs === null) erros.dataFim = 'Informe a data final no formato AAAA-MM-DD.';
  if (inicioMs !== null && fimMs !== null) {
    if (inicioMs > fimMs) {
      erros.dataFim = 'A data final deve ser igual ou posterior à data inicial.';
    } else if ((fimMs - inicioMs) / UM_DIA_MS + 1 > DIAS_MAXIMOS) {
      erros.dataFim = `O período pode ter no máximo ${DIAS_MAXIMOS} dias.`;
    }
  }

  const valido = Object.keys(erros).length === 0;
  return {
    valido,
    erros,
    dados: valido
      ? {
          dataInicio: formatarDia(inicioMs),
          dataFim: formatarDia(fimMs),
          inicio: `${formatarDia(inicioMs)}T00:00:00${FUSO_LOJA}`,
          fim: `${formatarDia(fimMs + UM_DIA_MS)}T00:00:00${FUSO_LOJA}`,
        }
      : null,
  };
}

module.exports = { validarPeriodo, lerData, FUSO_LOJA, DIAS_MAXIMOS };

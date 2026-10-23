// Cliente HTTP do SGPet: adiciona o token, trata erros da API
// e renova a sessão automaticamente quando o token expira.

const URL_API = (import.meta.env.VITE_API_URL || 'http://localhost:3333').replace(/\/$/, '');
const CHAVE_SESSAO = 'sgpet.sessao';

export class ErroApi extends Error {
  constructor(status, mensagem, detalhes) {
    super(mensagem);
    this.status = status;
    this.detalhes = detalhes || {};
  }
}

export const sessaoArmazenada = {
  ler() {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_SESSAO));
    } catch {
      return null;
    }
  },
  salvar(sessao) {
    localStorage.setItem(
      CHAVE_SESSAO,
      JSON.stringify({ token: sessao.token, refreshToken: sessao.refreshToken })
    );
  },
  limpar() {
    localStorage.removeItem(CHAVE_SESSAO);
  },
};

// Chamado quando a sessão não pode ser renovada (o AuthContext registra o logout aqui).
let aoExpirarSessao = () => {};
export function definirAoExpirarSessao(funcao) {
  aoExpirarSessao = funcao;
}

async function enviar(caminho, { metodo = 'GET', corpo, token } = {}) {
  let resposta;
  try {
    resposta = await fetch(URL_API + caminho, {
      method: metodo,
      headers: {
        ...(corpo !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new ErroApi(0, 'Não foi possível conectar ao servidor. Verifique sua conexão.');
  }

  if (resposta.status === 204) return { resposta, dados: null };
  const dados = await resposta.json().catch(() => null);
  return { resposta, dados };
}

// Renovações simultâneas compartilham a mesma requisição.
let renovacaoEmAndamento = null;
function renovarSessao(refreshToken) {
  renovacaoEmAndamento ??= enviar('/auth/renovar', { metodo: 'POST', corpo: { refreshToken } })
    .then(({ resposta, dados }) => {
      if (!resposta.ok) return null;
      sessaoArmazenada.salvar(dados);
      return dados;
    })
    .catch(() => null)
    .finally(() => {
      renovacaoEmAndamento = null;
    });
  return renovacaoEmAndamento;
}

export async function requisicao(caminho, opcoes = {}) {
  const { autenticada = true, ...resto } = opcoes;
  const sessao = autenticada ? sessaoArmazenada.ler() : null;
  let { resposta, dados } = await enviar(caminho, { ...resto, token: sessao?.token });

  if (resposta.status === 401 && autenticada && sessao?.refreshToken) {
    const nova = await renovarSessao(sessao.refreshToken);
    if (nova) {
      ({ resposta, dados } = await enviar(caminho, { ...resto, token: nova.token }));
    } else {
      sessaoArmazenada.limpar();
      aoExpirarSessao();
    }
  }

  if (!resposta.ok) {
    throw new ErroApi(
      resposta.status,
      dados?.erro || 'Ocorreu um erro inesperado. Tente novamente.',
      dados?.detalhes
    );
  }
  return dados;
}

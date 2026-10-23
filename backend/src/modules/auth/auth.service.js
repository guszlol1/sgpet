const { erros } = require('../../shared/erros');
const { validarLogin } = require('./auth.validacao');

function criarAuthService(repo) {
  async function montarUsuario(usuarioAuth) {
    const perfil = await repo.buscarPerfil(usuarioAuth.id);
    if (!perfil) {
      throw erros.semPermissao('Usuário sem perfil cadastrado. Fale com o gerente da loja.');
    }
    return {
      id: usuarioAuth.id,
      email: usuarioAuth.email,
      nome: perfil.nome,
      papel: perfil.papel,
    };
  }

  async function respostaDaSessao(sessao) {
    return {
      token: sessao.access_token,
      refreshToken: sessao.refresh_token,
      expiraEm: sessao.expires_at,
      usuario: await montarUsuario(sessao.user),
    };
  }

  return {
    async login(entrada) {
      const { valido, erros: errosCampos, dados } = validarLogin(entrada);
      if (!valido) throw erros.requisicaoInvalida('Dados de login inválidos.', errosCampos);

      const sessao = await repo.entrar(dados.email, dados.senha);
      if (!sessao) throw erros.naoAutenticado('E-mail ou senha incorretos.');

      return respostaDaSessao(sessao);
    },

    async renovar(entrada = {}) {
      const { refreshToken } = entrada;
      if (typeof refreshToken !== 'string' || !refreshToken) {
        throw erros.requisicaoInvalida('Informe o refreshToken.');
      }

      const sessao = await repo.renovarSessao(refreshToken);
      if (!sessao) throw erros.naoAutenticado('Sessão expirada. Faça login novamente.');

      return respostaDaSessao(sessao);
    },

    async usuarioPorToken(token) {
      const usuarioAuth = await repo.usuarioDoToken(token);
      if (!usuarioAuth) {
        throw erros.naoAutenticado('Sessão inválida ou expirada. Faça login novamente.');
      }
      return montarUsuario(usuarioAuth);
    },
  };
}

module.exports = { criarAuthService };

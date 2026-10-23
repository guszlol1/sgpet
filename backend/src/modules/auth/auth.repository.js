// Status que o Supabase Auth devolve quando as credenciais ou o token
// são inválidos. Qualquer outro erro (rede, servidor fora do ar) é repassado.
const STATUS_CREDENCIAL_INVALIDA = [400, 401, 403];

function credencialInvalida(error) {
  return STATUS_CREDENCIAL_INVALIDA.includes(error.status);
}

function criarAuthRepository({ supabaseAdmin, criarClienteAuth }) {
  return {
    async entrar(email, senha) {
      const { data, error } = await criarClienteAuth().auth.signInWithPassword({
        email,
        password: senha,
      });
      if (error) {
        if (credencialInvalida(error)) return null;
        throw error;
      }
      return data.session;
    },

    async renovarSessao(refreshToken) {
      const { data, error } = await criarClienteAuth().auth.refreshSession({
        refresh_token: refreshToken,
      });
      if (error) {
        if (credencialInvalida(error)) return null;
        throw error;
      }
      return data.session;
    },

    async usuarioDoToken(token) {
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (error) {
        if (credencialInvalida(error)) return null;
        throw error;
      }
      return data.user;
    },

    async buscarPerfil(usuarioId) {
      const { data, error } = await supabaseAdmin
        .from('perfis')
        .select('id, nome, papel')
        .eq('id', usuarioId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  };
}

module.exports = { criarAuthRepository };

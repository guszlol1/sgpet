const { criarAuthRepository } = require('../../src/modules/auth/auth.repository');

describe('Contrato de autenticação com Supabase (cliente simulado)', () => {
  let auth;
  let repo;
  let criarClienteAuth;
  beforeEach(() => {
    auth = { signInWithPassword: jest.fn(), refreshSession: jest.fn(), getUser: jest.fn() };
    criarClienteAuth = jest.fn(() => ({ auth }));
    repo = criarAuthRepository({ supabaseAdmin: { auth }, criarClienteAuth });
  });

  test('encaminha e-mail/senha ao cliente e devolve a sessão', async () => {
    auth.signInWithPassword.mockResolvedValue({ data: { session: { access_token: 'teste' } }, error: null });
    await expect(repo.entrar('usuario@sgpet.test', 'senha')).resolves.toEqual({ access_token: 'teste' });
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'usuario@sgpet.test', password: 'senha' });
    await repo.entrar('outro@sgpet.test', 'outra');
    expect(criarClienteAuth).toHaveBeenCalledTimes(2);
  });

  test('encaminha o refresh token no formato do Supabase', async () => {
    auth.refreshSession.mockResolvedValue({ data: { session: { access_token: 'novo' } }, error: null });
    await expect(repo.renovarSessao('refresh')).resolves.toEqual({ access_token: 'novo' });
    expect(auth.refreshSession).toHaveBeenCalledWith({ refresh_token: 'refresh' });
  });

  test('consulta o usuário validando o token no servidor', async () => {
    auth.getUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null });
    await expect(repo.usuarioDoToken('token')).resolves.toEqual({ id: '1' });
    expect(auth.getUser).toHaveBeenCalledWith('token');
  });

  test.each([
    ['entrar', 'signInWithPassword'], ['renovarSessao', 'refreshSession'], ['usuarioDoToken', 'getUser'],
  ])('%s distingue credenciais inválidas de falha do servidor', async (metodo, chamada) => {
    for (const status of [400, 401, 403]) {
      auth[chamada].mockResolvedValue({ data: null, error: { status } });
      await expect(repo[metodo]('teste', 'teste')).resolves.toBeNull();
    }
    const erro = { status: 503, message: 'Serviço indisponível' };
    auth[chamada].mockResolvedValue({ data: null, error: erro });
    await expect(repo[metodo]('teste', 'teste')).rejects.toBe(erro);
  });
});

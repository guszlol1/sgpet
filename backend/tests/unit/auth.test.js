const { validarLogin } = require('../../src/modules/auth/auth.validacao');
const { criarAuthService } = require('../../src/modules/auth/auth.service');

describe('US01: validação de login', () => {
  test('normaliza o e-mail sem alterar os espaços da senha', () => {
    expect(validarLogin({ email: '  GERENTE@SGPET.TEST ', senha: ' senha ' })).toEqual({
      valido: true, erros: {}, dados: { email: 'gerente@sgpet.test', senha: ' senha ' },
    });
  });

  test.each([undefined, {}, { email: '' }, { email: 'sem-arroba', senha: 'teste' },
    { email: 'a@b.test', senha: '' }, { email: 123, senha: 456 }])(
    'recusa dados de login inválidos: %j', (entrada) => {
      expect(validarLogin(entrada).valido).toBe(false);
    }
  );
});

describe('US01: login, sessão e perfis', () => {
  let repo;
  let service;
  const usuario = { id: 'usuario-1', email: 'gerente@sgpet.test' };
  const perfil = { id: usuario.id, nome: 'Gerente Teste', papel: 'gerente' };
  const sessao = {
    access_token: 'token-teste', refresh_token: 'renovacao-teste', expires_at: 123456,
    user: usuario,
  };

  beforeEach(() => {
    repo = {
      entrar: jest.fn().mockResolvedValue(sessao),
      renovarSessao: jest.fn().mockResolvedValue(sessao),
      usuarioDoToken: jest.fn().mockResolvedValue(usuario),
      buscarPerfil: jest.fn().mockResolvedValue(perfil),
    };
    service = criarAuthService(repo);
  });

  test.each(['gerente', 'atendente'])('retorna a sessão com o perfil %s do banco', async (papel) => {
    repo.buscarPerfil.mockResolvedValue({ ...perfil, papel });
    const resposta = await service.login({ email: ' GERENTE@SGPET.TEST ', senha: 'senha-teste' });
    expect(repo.entrar).toHaveBeenCalledWith(usuario.email, 'senha-teste');
    expect(resposta).toEqual({
      token: sessao.access_token, refreshToken: sessao.refresh_token, expiraEm: sessao.expires_at,
      usuario: { ...usuario, nome: perfil.nome, papel },
    });
  });

  test('não consulta o Supabase quando os campos são inválidos', async () => {
    await expect(service.login({})).rejects.toMatchObject({ status: 400, detalhes: {
      email: expect.any(String), senha: expect.any(String),
    } });
    expect(repo.entrar).not.toHaveBeenCalled();
  });

  test('credenciais incorretas retornam 401', async () => {
    repo.entrar.mockResolvedValue(null);
    await expect(service.login({ email: usuario.email, senha: 'errada' }))
      .rejects.toMatchObject({ status: 401 });
    expect(repo.buscarPerfil).not.toHaveBeenCalled();
  });

  test('não concede acesso a usuário autenticado sem perfil cadastrado', async () => {
    repo.buscarPerfil.mockResolvedValue(null);
    await expect(service.login({ email: usuario.email, senha: 'teste' }))
      .rejects.toMatchObject({ status: 403 });
  });

  test('renova a sessão e consulta novamente o perfil', async () => {
    const resposta = await service.renovar({ refreshToken: 'anterior' });
    expect(repo.renovarSessao).toHaveBeenCalledWith('anterior');
    expect(repo.buscarPerfil).toHaveBeenCalledWith(usuario.id);
    expect(resposta.token).toBe(sessao.access_token);
  });

  test.each([undefined, {}, { refreshToken: '' }, { refreshToken: 123 }])(
    'recusa renovação sem token válido: %j', async (entrada) => {
      await expect(service.renovar(entrada)).rejects.toMatchObject({ status: 400 });
      expect(repo.renovarSessao).not.toHaveBeenCalled();
    }
  );

  test('renovação expirada retorna 401', async () => {
    repo.renovarSessao.mockResolvedValue(null);
    await expect(service.renovar({ refreshToken: 'expirado' })).rejects.toMatchObject({ status: 401 });
  });

  test('consulta o usuário pelo token', async () => {
    await expect(service.usuarioPorToken('token')).resolves.toEqual({ ...usuario,
      nome: perfil.nome, papel: perfil.papel });
    expect(repo.usuarioDoToken).toHaveBeenCalledWith('token');
  });

  test('token inválido não permite consultar o perfil', async () => {
    repo.usuarioDoToken.mockResolvedValue(null);
    await expect(service.usuarioPorToken('invalido')).rejects.toMatchObject({ status: 401 });
    expect(repo.buscarPerfil).not.toHaveBeenCalled();
  });

  test('falha de infraestrutura não é apresentada como senha incorreta', async () => {
    const erro = new Error('Supabase indisponível');
    repo.entrar.mockRejectedValue(erro);
    await expect(service.login({ email: usuario.email, senha: 'teste' })).rejects.toBe(erro);
  });
});

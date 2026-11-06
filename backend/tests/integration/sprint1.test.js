const { criarApp } = require('../../src/app');
const { criarAuthService } = require('../../src/modules/auth/auth.service');
const { criarProdutosService } = require('../../src/modules/produtos/produtos.service');

// Executa rotas, middlewares e services reais; somente a persistência é substituída.
// Não usa credenciais reais e não acessa o Supabase.
describe('Sprint 1: contrato HTTP de login e produtos', () => {
  let server;
  let baseUrl;
  let produtos;
  let contador;
  let dadosLogin;
  const entrada = { nome: 'Ração', categoria: 'Alimentos', preco: 29.9,
    codigoBarras: '0123456789012', estoqueMinimo: 0 };
  const usuarios = {
    gerente: { id: 'gerente', email: 'gerente@sgpet.test', nome: 'Gerente', papel: 'gerente' },
    atendente: { id: 'atendente', email: 'atendente@sgpet.test', nome: 'Atendente', papel: 'atendente' },
  };
  const sessao = (papel) => ({ access_token: papel, refresh_token: 'refresh-' + papel,
    expires_at: 123456, user: usuarios[papel] });
  const perfilPorEmail = (email) => Object.values(usuarios).find(u => u.email === email)?.papel;

  beforeAll(async () => {
    const authService = criarAuthService({
      entrar: async (email, senha) => {
        const papel = perfilPorEmail(email);
        return papel && senha === 'senha-teste' ? sessao(papel) : null;
      },
      renovarSessao: async (token) => {
        const papel = token.replace('refresh-', '');
        return usuarios[papel] ? sessao(papel) : null;
      },
      usuarioDoToken: async (token) => usuarios[token] || null,
      buscarPerfil: async (id) => usuarios[id] || null,
    });
    const produtosService = criarProdutosService({
      listar: async () => [...produtos.values()].filter(p => p.ativo),
      buscarPorId: async (id) => produtos.get(id)?.ativo ? produtos.get(id) : null,
      existeCodigoBarras: async (codigo, ignorarId) => [...produtos.values()]
        .some(p => p.ativo && p.codigoBarras === codigo && p.id !== ignorarId),
      criar: async (dados) => {
        const id = '00000000-0000-4000-8000-' + String(++contador).padStart(12, '0');
        const produto = { id, ...dados, ativo: true };
        produtos.set(id, produto);
        return produto;
      },
      atualizar: async (id, dados) => {
        if (!produtos.get(id)?.ativo) return null;
        const produto = { ...produtos.get(id), ...dados };
        produtos.set(id, produto);
        return produto;
      },
      desativar: async (id) => {
        if (!produtos.get(id)?.ativo) return false;
        produtos.set(id, { ...produtos.get(id), ativo: false });
        return true;
      },
    });
    const app = criarApp({ authService, produtosService });
    await new Promise((resolve, reject) => {
      server = app.listen(0, '127.0.0.1', resolve);
      server.once('error', reject);
    });
    baseUrl = 'http://127.0.0.1:' + server.address().port;
  });

  afterAll(async () => {
    if (server) await new Promise((resolve, reject) => server.close(e => e ? reject(e) : resolve()));
  });
  beforeEach(() => { produtos = new Map(); contador = 0; dadosLogin = { email: usuarios.gerente.email, senha: 'senha-teste' }; });

  async function request(url, { metodo = 'GET', token, corpo, texto } = {}) {
    const resposta = await fetch(baseUrl + url, {
      method: metodo,
      headers: { ...(token && { Authorization: 'Bearer ' + token }),
        ...((corpo !== undefined || texto !== undefined) && { 'Content-Type': 'application/json' }) },
      body: texto !== undefined ? texto : corpo !== undefined ? JSON.stringify(corpo) : undefined,
    });
    return { status: resposta.status, dados: resposta.status === 204 ? null : await resposta.json() };
  }

  test('health permanece público', async () => {
    expect(await request('/health')).toEqual({ status: 200, dados: { status: 'ok' } });
  });
  test.each(['gerente', 'atendente'])('login de %s retorna sessão e perfil', async (papel) => {
    const r = await request('/auth/login', { metodo: 'POST', corpo: { ...dadosLogin, email: usuarios[papel].email } });
    expect(r.status).toBe(200);
    expect(r.dados.usuario.papel).toBe(papel);
    expect(r.dados.token).toBe(papel);
  });
  test('senha incorreta retorna 401', async () => {
    expect((await request('/auth/login', { metodo: 'POST', corpo: { ...dadosLogin, senha: 'errada' } })).status).toBe(401);
  });
  test('login incompleto informa os erros de campo', async () => {
    const r = await request('/auth/login', { metodo: 'POST', corpo: {} });
    expect(r.status).toBe(400);
    expect(r.dados.detalhes).toEqual({ email: expect.any(String), senha: expect.any(String) });
  });
  test('consulta o próprio usuário com o token do login', async () => {
    const login = await request('/auth/login', { metodo: 'POST', corpo: dadosLogin });
    expect(await request('/auth/me', { token: login.dados.token }))
      .toEqual({ status: 200, dados: { usuario: usuarios.gerente } });
  });
  test('renova a sessão', async () => {
    const r = await request('/auth/renovar', { metodo: 'POST', corpo: { refreshToken: 'refresh-gerente' } });
    expect(r.status).toBe(200);
    expect(r.dados.token).toBe('gerente');
  });
  test('token expirado é recusado', async () => {
    expect((await request('/produtos', { token: 'expirado' })).status).toBe(401);
  });
  test.each([
    ['GET', '/produtos'], ['POST', '/produtos'], ['GET', '/produtos/um-id'],
    ['PUT', '/produtos/um-id'], ['DELETE', '/produtos/um-id'], ['GET', '/auth/me'],
  ])('%s %s exige autenticação', async (metodo, url) => {
    expect((await request(url, { metodo })).status).toBe(401);
  });
  test.each(['POST', 'PUT', 'DELETE'])('atendente não pode alterar produtos via %s', async (metodo) => {
    const url = metodo === 'POST' ? '/produtos' : '/produtos/11111111-1111-4111-8111-111111111111';
    expect((await request(url, { metodo, token: 'atendente', corpo: entrada })).status).toBe(403);
    expect(produtos.size).toBe(0);
  });
  test('gerente cadastra, consulta, edita e remove; atendente consulta', async () => {
    const criado = await request('/produtos', { metodo: 'POST', token: 'gerente', corpo: entrada });
    expect(criado.status).toBe(201);
    const id = criado.dados.id;
    const consulta = await request('/produtos/' + id, { token: 'atendente' });
    expect(consulta.dados).toMatchObject(entrada);
    expect((await request('/produtos', { token: 'atendente' })).dados).toHaveLength(1);
    const editado = await request('/produtos/' + id, { metodo: 'PUT', token: 'gerente', corpo: { ...entrada, preco: 39.9 } });
    expect(editado.status).toBe(200);
    expect(editado.dados.preco).toBe(39.9);
    expect(await request('/produtos/' + id, { metodo: 'DELETE', token: 'gerente' }))
      .toEqual({ status: 204, dados: null });
    expect((await request('/produtos', { token: 'gerente' })).dados).toEqual([]);
    expect((await request('/produtos/' + id, { token: 'gerente' })).status).toBe(404);
    expect((await request('/produtos', { metodo: 'POST', token: 'gerente', corpo: entrada })).status).toBe(201);
  });
  test('código duplicado retorna 409 com erro no campo', async () => {
    await request('/produtos', { metodo: 'POST', token: 'gerente', corpo: entrada });
    const r = await request('/produtos', { metodo: 'POST', token: 'gerente', corpo: entrada });
    expect(r.status).toBe(409);
    expect(r.dados.detalhes.codigoBarras).toEqual(expect.any(String));
  });
  test('produto inválido retorna 400 e não grava', async () => {
    const r = await request('/produtos', { metodo: 'POST', token: 'gerente', corpo: { ...entrada, preco: -1 } });
    expect(r.status).toBe(400);
    expect(r.dados.detalhes.preco).toEqual(expect.any(String));
    expect(produtos.size).toBe(0);
  });
  test.each(['null', '{invalido'])('JSON inválido para a API (%s) retorna 400', async (texto) => {
    expect((await request('/auth/login', { metodo: 'POST', texto })).status).toBe(400);
  });
  test('rota inexistente retorna erro padronizado', async () => {
    expect(await request('/rota-inexistente')).toEqual({ status: 404, dados: { erro: 'Rota não encontrada.' } });
  });
});

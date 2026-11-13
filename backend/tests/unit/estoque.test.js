const { validarEntrada } = require('../../src/modules/estoque/estoque.validacao');
const { criarEstoqueService, comAlerta } = require('../../src/modules/estoque/estoque.service');
const { criarEstoqueRepository } = require('../../src/modules/estoque/estoque.repository');
const id = '11111111-1111-4111-8111-111111111111';
const usuario = { id: '22222222-2222-4222-8222-222222222222', papel: 'gerente' };
const entrada = { produtoId: id, quantidade: 5, observacao: 'Reposição' };
describe('US04 e US05: validações e regras de estoque', () => {
  test.each([
    undefined,
    null,
    [],
    {},
    { ...entrada, produtoId: 'errado' },
    ...[0, -1, 1.5, '2', null, true, NaN, Infinity, 2147483648].map((quantidade) => ({
      ...entrada,
      quantidade,
    })),
    { ...entrada, observacao: 'a'.repeat(501) },
    { ...entrada, observacao: 1 },
  ])('recusa entrada inválida %j', (dados) => {
    expect(validarEntrada(dados).valido).toBe(false);
  });
  test('normaliza observação e ignora campos estranhos ao cadastro', () => {
    expect(validarEntrada({ ...entrada, observacao: ' Reposição ', saldo: 999 }).dados).toEqual(
      entrada
    );
  });
  test.each([1, 2147483647])('aceita quantidade válida %s', (quantidade) =>
    expect(validarEntrada({ ...entrada, quantidade }).valido).toBe(true)
  );
  test.each([
    [4, 5, true],
    [5, 5, true],
    [6, 5, false],
    [0, 0, true],
    [1, 0, false],
  ])('saldo %s e mínimo %s: alerta %s', (saldo, estoqueMinimo, esperado) => {
    expect(comAlerta({ saldo, estoqueMinimo }).alertaEstoqueBaixo).toBe(esperado);
  });
  test('lista saldos calculando alertas', async () => {
    const s = criarEstoqueService({
      listar: jest.fn().mockResolvedValue([{ id, saldo: 2, estoqueMinimo: 3 }]),
    });
    expect(await s.listar()).toEqual([
      { id, saldo: 2, estoqueMinimo: 3, alertaEstoqueBaixo: true },
    ]);
  });
  test('usa o usuário autenticado e nunca um usuárioId enviado no corpo', async () => {
    const repo = { registrarEntrada: jest.fn().mockResolvedValue({ saldo: 8, estoqueMinimo: 5 }) };
    const s = criarEstoqueService(repo);
    expect(await s.registrarEntrada({ ...entrada, usuarioId: 'forjado' }, usuario)).toMatchObject({
      saldo: 8,
      alertaEstoqueBaixo: false,
    });
    expect(repo.registrarEntrada).toHaveBeenCalledWith({ ...entrada, usuarioId: usuario.id });
  });
  test.each([null, { ...usuario, papel: 'atendente' }])(
    'nega registro por perfil não autorizado',
    async (u) => {
      const repo = { registrarEntrada: jest.fn() };
      await expect(criarEstoqueService(repo).registrarEntrada(entrada, u)).rejects.toMatchObject({
        status: 403,
      });
      expect(repo.registrarEntrada).not.toHaveBeenCalled();
    }
  );
  test('entrada inválida não chama a persistência', async () => {
    const repo = { registrarEntrada: jest.fn() };
    await expect(criarEstoqueService(repo).registrarEntrada({}, usuario)).rejects.toMatchObject({
      status: 400,
      detalhes: expect.any(Object),
    });
    expect(repo.registrarEntrada).not.toHaveBeenCalled();
  });
});
describe('Estoque: contrato da persistência', () => {
  test('executa a função atômica com os parâmetros corretos', async () => {
    const rpc = jest
      .fn()
      .mockResolvedValue({
        data: { entrada_id: 'entrada', produto_id: id, quantidade: 5, saldo: 8, estoque_minimo: 5 },
        error: null,
      });
    const r = await criarEstoqueRepository({ supabaseAdmin: { rpc } }).registrarEntrada({
      ...entrada,
      usuarioId: usuario.id,
    });
    expect(r).toEqual({
      entradaId: 'entrada',
      produtoId: id,
      quantidade: 5,
      saldo: 8,
      estoqueMinimo: 5,
    });
    expect(rpc).toHaveBeenCalledWith('registrar_entrada_estoque', {
      p_produto_id: id,
      p_quantidade: 5,
      p_usuario_id: usuario.id,
      p_observacao: 'Reposição',
    });
  });
  test.each([
    ['P0002', 404],
    ['42501', 403],
    ['22003', 400],
    ['22023', 400],
  ])('traduz %s para %s', async (code, status) => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: { code } });
    await expect(
      criarEstoqueRepository({ supabaseAdmin: { rpc } }).registrarEntrada(entrada)
    ).rejects.toMatchObject({ status });
  });
  test('propaga indisponibilidade do banco', async () => {
    const error = new Error('Falha de rede');
    const rpc = jest.fn().mockResolvedValue({ error });
    await expect(
      criarEstoqueRepository({ supabaseAdmin: { rpc } }).registrarEntrada(entrada)
    ).rejects.toBe(error);
  });
});

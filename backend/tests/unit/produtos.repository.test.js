const { criarProdutosRepository } = require('../../src/modules/produtos/produtos.repository');

// Simula apenas a resposta do SDK; verifica o contrato SQL usado pelo repository real.
describe('Produtos: contrato com Supabase', () => {
  let consulta;
  let repo;
  const linha = { id: '1', nome: 'Ração', categoria: 'Alimentos', preco: '29.90',
    codigo_barras: '0123456789012', estoque_minimo: 0, criado_em: '2026-10-22', atualizado_em: '2026-10-22' };
  beforeEach(() => {
    consulta = {};
    for (const metodo of ['select','eq','neq','order','insert','update','limit']) {
      consulta[metodo] = jest.fn(() => consulta);
    }
    consulta.maybeSingle = jest.fn().mockResolvedValue({ data: linha, error: null });
    consulta.single = jest.fn().mockResolvedValue({ data: linha, error: null });
    consulta.then = (resolve, reject) => Promise.resolve({ data: [linha], error: null }).then(resolve, reject);
    repo = criarProdutosRepository({ supabaseAdmin: { from: jest.fn(() => consulta) } });
  });
  test('lista somente ativos, por nome, convertendo preço e nomes dos campos', async () => {
    expect(await repo.listar()).toEqual([{ id: '1', nome: linha.nome, categoria: linha.categoria,
      preco: 29.9, codigoBarras: linha.codigo_barras, estoqueMinimo: 0,
      criadoEm: linha.criado_em, atualizadoEm: linha.atualizado_em }]);
    expect(consulta.eq).toHaveBeenCalledWith('ativo', true);
    expect(consulta.order).toHaveBeenCalledWith('nome');
  });
  test('consulta por ID exige produto ativo', async () => {
    await repo.buscarPorId('1');
    expect(consulta.eq).toHaveBeenCalledWith('id', '1');
    expect(consulta.eq).toHaveBeenCalledWith('ativo', true);
  });
  test('edição ignora o próprio ID ao procurar duplicidade', async () => {
    expect(await repo.existeCodigoBarras('0123456789012', '1')).toBe(true);
    expect(consulta.neq).toHaveBeenCalledWith('id', '1');
    expect(consulta.eq).toHaveBeenCalledWith('ativo', true);
  });
  test('cadastro não permite definir ID ou estado ativo pelo corpo', async () => {
    await repo.criar({ nome: linha.nome, categoria: linha.categoria, preco: 29.9,
      codigoBarras: linha.codigo_barras, estoqueMinimo: 0, id: 'forjado', ativo: false });
    expect(consulta.insert).toHaveBeenCalledWith({ nome: linha.nome, categoria: linha.categoria,
      preco: 29.9, codigo_barras: linha.codigo_barras, estoque_minimo: 0 });
  });
  test('remoção é lógica e não apaga o histórico', async () => {
    expect(await repo.desativar('1')).toBe(true);
    expect(consulta.update).toHaveBeenCalledWith({ ativo: false });
    expect(consulta.eq).toHaveBeenCalledWith('ativo', true);
  });
  test('violação de unicidade concorrente retorna conflito de campo', async () => {
    consulta.single.mockResolvedValue({ data: null, error: { code: '23505' } });
    await expect(repo.criar({})).rejects.toMatchObject({ status: 409,
      detalhes: { codigoBarras: expect.any(String) } });
  });
  test('falha inesperada do banco é propagada', async () => {
    const erro = { code: '08006', message: 'Conexão encerrada' };
    consulta.maybeSingle.mockResolvedValue({ data: null, error: erro });
    await expect(repo.buscarPorId('1')).rejects.toBe(erro);
  });
});

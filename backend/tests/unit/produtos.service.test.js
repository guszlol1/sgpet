const { criarProdutosService } = require('../../src/modules/produtos/produtos.service');

describe('US02: regras de cadastro de produtos', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const dados = { nome: 'Ração', categoria: 'Alimentos', preco: 29.9,
    codigoBarras: '0123456789012', estoqueMinimo: 0 };
  const produto = { id, ...dados };
  let repo;
  let service;

  beforeEach(() => {
    repo = {
      listar: jest.fn().mockResolvedValue([produto]),
      buscarPorId: jest.fn().mockResolvedValue(produto),
      existeCodigoBarras: jest.fn().mockResolvedValue(false),
      criar: jest.fn().mockResolvedValue(produto),
      atualizar: jest.fn().mockResolvedValue(produto),
      desativar: jest.fn().mockResolvedValue(true),
    };
    service = criarProdutosService(repo);
  });

  test('lista produtos disponíveis', async () => {
    await expect(service.listar()).resolves.toEqual([produto]);
  });

  test('consulta produto existente', async () => {
    await expect(service.obter(id)).resolves.toEqual(produto);
    expect(repo.buscarPorId).toHaveBeenCalledWith(id);
  });

  test('cadastro recebe dados normalizados', async () => {
    await expect(service.criar({ ...dados, nome: ' Ração ', preco: '29,90' })).resolves.toEqual(produto);
    expect(repo.criar).toHaveBeenCalledWith(dados);
  });

  test.each(['criar', 'atualizar'])('%s recusa produto inválido sem gravar', async (operacao) => {
    const acao = operacao === 'criar' ? service.criar({}) : service.atualizar(id, {});
    await expect(acao).rejects.toMatchObject({ status: 400, detalhes: expect.any(Object) });
    expect(repo[operacao]).not.toHaveBeenCalled();
    expect(repo.existeCodigoBarras).not.toHaveBeenCalled();
  });

  test.each(['criar', 'atualizar'])('%s recusa código duplicado sem gravar', async (operacao) => {
    repo.existeCodigoBarras.mockResolvedValue(true);
    const acao = operacao === 'criar' ? service.criar(dados) : service.atualizar(id, dados);
    await expect(acao).rejects.toMatchObject({ status: 409,
      detalhes: { codigoBarras: expect.any(String) } });
    expect(repo[operacao]).not.toHaveBeenCalled();
  });

  test('edição permite manter o código de barras do próprio produto', async () => {
    await expect(service.atualizar(id, dados)).resolves.toEqual(produto);
    expect(repo.existeCodigoBarras).toHaveBeenCalledWith(dados.codigoBarras, id);
    expect(repo.atualizar).toHaveBeenCalledWith(id, dados);
  });

  test.each(['obter', 'atualizar', 'remover'])('%s recusa ID inválido sem acessar o banco', async (operacao) => {
    await expect(service[operacao]('id-invalido', dados)).rejects.toMatchObject({ status: 404 });
    expect(repo.buscarPorId).not.toHaveBeenCalled();
    expect(repo.atualizar).not.toHaveBeenCalled();
    expect(repo.desativar).not.toHaveBeenCalled();
  });

  test.each([
    ['obter', 'buscarPorId', null], ['atualizar', 'atualizar', null], ['remover', 'desativar', false],
  ])('%s retorna 404 para produto inexistente ou removido', async (operacao, metodo, retorno) => {
    repo[metodo].mockResolvedValue(retorno);
    await expect(service[operacao](id, dados)).rejects.toMatchObject({ status: 404 });
  });

  test('remoção delega a desativação lógica', async () => {
    await expect(service.remover(id)).resolves.toBeUndefined();
    expect(repo.desativar).toHaveBeenCalledWith(id);
  });
});

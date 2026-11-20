const { validarPeriodo } = require('../../src/modules/relatorios/relatorios.validacao');
const {
  criarRelatoriosService,
  resumirVendas,
} = require('../../src/modules/relatorios/relatorios.service');
const { criarVendasRepositoryMemoria } = require('../../src/modules/vendas/vendas.memoria');

const gerente = { id: '22222222-2222-4222-8222-222222222222', papel: 'gerente', nome: 'Gerente' };
const atendente = { id: '33333333-3333-4333-8333-333333333333', papel: 'atendente' };

// Cria vendas em horários fixos (horário de Brasília) para testar os limites do período.
function montar(vendas) {
  const repo = criarVendasRepositoryMemoria({
    produtos: new Map(),
    usuarios: { gerente },
    vendas: vendas.map(([dataHora, valorTotal, quantidade = 1], i) => ({
      id: 'v' + i,
      dataHora: new Date(dataHora).toISOString(),
      usuarioId: gerente.id,
      clienteId: null,
      formaPagamento: 'pix',
      valorTotal,
      itens: [{ produtoId: 'p', nome: 'Ração', quantidade, precoUnitario: valorTotal, subtotal: valorTotal }],
    })),
  });
  return criarRelatoriosService(repo);
}

async function erroDe(promessa) {
  try {
    await promessa;
  } catch (e) {
    return e;
  }
  throw new Error('Era esperado um erro.');
}

describe('US08: validação do período', () => {
  test('converte as datas inclusivas em intervalo [inicio, fim) no fuso da loja', () => {
    expect(validarPeriodo({ dataInicio: '2026-11-01', dataFim: '2026-11-30' })).toEqual({
      valido: true,
      erros: {},
      dados: {
        dataInicio: '2026-11-01',
        dataFim: '2026-11-30',
        inicio: '2026-11-01T00:00:00-03:00',
        fim: '2026-12-01T00:00:00-03:00',
      },
    });
  });

  test('aceita início igual ao fim (um único dia) e virada de ano', () => {
    expect(validarPeriodo({ dataInicio: '2026-12-31', dataFim: '2026-12-31' }).dados.fim).toBe(
      '2027-01-01T00:00:00-03:00'
    );
  });

  test.each([
    [{}, ['dataInicio', 'dataFim']],
    [{ dataInicio: '01/11/2026', dataFim: '2026-11-30' }, ['dataInicio']],
    [{ dataInicio: '2026-02-30', dataFim: '2026-03-01' }, ['dataInicio']],
    [{ dataInicio: '2026-11-01', dataFim: '2026-13-01' }, ['dataFim']],
    [{ dataInicio: '2026-11-01', dataFim: 'ontem' }, ['dataFim']],
    [{ dataInicio: ['2026-11-01'], dataFim: '2026-11-02' }, ['dataInicio']],
  ])('recusa datas em formato inválido %j', (query, campos) => {
    const r = validarPeriodo(query);
    expect(r.valido).toBe(false);
    expect(Object.keys(r.erros).sort()).toEqual(campos.sort());
  });

  test('recusa data inicial posterior à final', () => {
    const r = validarPeriodo({ dataInicio: '2026-11-30', dataFim: '2026-11-01' });
    expect(r.erros.dataFim).toMatch(/igual ou posterior/);
  });

  test('limita o período a 366 dias', () => {
    expect(validarPeriodo({ dataInicio: '2026-01-01', dataFim: '2027-01-01' }).valido).toBe(true);
    expect(validarPeriodo({ dataInicio: '2026-01-01', dataFim: '2027-01-02' }).valido).toBe(false);
  });
});

describe('US08: relatório de vendas por período', () => {
  const vendas = [
    ['2026-10-31T23:59:59-03:00', 100], // fora: dia anterior ao início
    ['2026-11-01T00:00:00-03:00', 10.1], // dentro: primeiro instante do dia inicial
    ['2026-11-15T12:30:00-03:00', 20.2, 3],
    ['2026-11-30T23:59:59-03:00', 0.3], // dentro: último segundo do dia final
    ['2026-12-01T00:00:00-03:00', 500], // fora: primeiro instante do dia seguinte
  ];

  test('filtra pelos limites do período, inclusive o dia inicial e o final', async () => {
    const r = await montar(vendas).vendasPorPeriodo(
      { dataInicio: '2026-11-01', dataFim: '2026-11-30' },
      gerente
    );
    expect(r.vendas.map((v) => v.id)).toEqual(['v1', 'v2', 'v3']);
    expect(r.periodo).toEqual({ dataInicio: '2026-11-01', dataFim: '2026-11-30' });
  });

  test('conta as vendas e soma o valor total exatamente (sem erro de ponto flutuante)', async () => {
    const r = await montar(vendas).vendasPorPeriodo(
      { dataInicio: '2026-11-01', dataFim: '2026-11-30' },
      gerente
    );
    expect(10.1 + 20.2 + 0.3).not.toBe(30.6);
    expect(r).toMatchObject({ quantidadeVendas: 3, quantidadeItens: 5, valorTotal: 30.6 });
    expect(r.vendas[1]).toMatchObject({ quantidadeItens: 3, atendenteNome: 'Gerente' });
  });

  test('venda às 22h do último dia (01h UTC do dia seguinte) entra no período', async () => {
    const r = await montar([['2026-11-30T22:00:00-03:00', 50]]).vendasPorPeriodo(
      { dataInicio: '2026-11-30', dataFim: '2026-11-30' },
      gerente
    );
    expect(r.quantidadeVendas).toBe(1);
  });

  test('período sem vendas retorna tudo zerado', async () => {
    const r = await montar(vendas).vendasPorPeriodo(
      { dataInicio: '2025-01-01', dataFim: '2025-01-31' },
      gerente
    );
    expect(r).toEqual({
      periodo: { dataInicio: '2025-01-01', dataFim: '2025-01-31' },
      quantidadeVendas: 0,
      quantidadeItens: 0,
      valorTotal: 0,
      vendas: [],
    });
  });

  test('período inválido retorna 400 sem consultar o repositório', async () => {
    const repo = { listarVendasPorPeriodo: jest.fn() };
    const erro = await erroDe(
      criarRelatoriosService(repo).vendasPorPeriodo({ dataInicio: '2026-11-30', dataFim: '2026-11-01' }, gerente)
    );
    expect(erro.status).toBe(400);
    expect(repo.listarVendasPorPeriodo).not.toHaveBeenCalled();
  });

  test.each([atendente, null])('nega o relatório para perfil não gerente: %j', async (usuario) => {
    const repo = { listarVendasPorPeriodo: jest.fn() };
    const erro = await erroDe(
      criarRelatoriosService(repo).vendasPorPeriodo({ dataInicio: '2026-11-01', dataFim: '2026-11-30' }, usuario)
    );
    expect(erro.status).toBe(403);
    expect(repo.listarVendasPorPeriodo).not.toHaveBeenCalled();
  });

  test('resumo soma muitas vendas de centavos sem acumular erro', () => {
    const muitas = Array.from({ length: 1000 }, () => ({ valorTotal: 0.1, itens: [{ quantidade: 1 }] }));
    expect(resumirVendas(muitas)).toMatchObject({ quantidadeVendas: 1000, valorTotal: 100 });
  });
});

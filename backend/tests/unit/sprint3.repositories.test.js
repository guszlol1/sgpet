const { criarVendasRepository } = require('../../src/modules/vendas/vendas.repository');
const { criarRelatoriosRepository } = require('../../src/modules/relatorios/relatorios.repository');

// Simula o encadeamento de consultas do cliente do Supabase.
function supabaseFalso(resposta) {
  const chamadas = [];
  const consulta = {};
  for (const metodo of ['select', 'eq', 'in', 'order']) {
    consulta[metodo] = jest.fn((...args) => {
      chamadas.push([metodo, ...args]);
      return consulta;
    });
  }
  consulta.maybeSingle = jest.fn(async () => resposta);
  consulta.then = (resolver, rejeitar) => Promise.resolve(resposta).then(resolver, rejeitar);
  return {
    chamadas,
    from: jest.fn((tabela) => {
      chamadas.push(['from', tabela]);
      return consulta;
    }),
    rpc: jest.fn(async () => resposta),
  };
}

const linhaProduto = {
  id: 'p1',
  nome: 'Ração',
  categoria: 'Ração',
  preco: '29.90',
  codigo_barras: '7890000000017',
  saldo: 8,
  estoque_minimo: 5,
};

describe('Sprint 3: repositório de vendas no Supabase', () => {
  test('lista produtos ativos com saldo para o PDV', async () => {
    const supabase = supabaseFalso({ data: [linhaProduto], error: null });
    const lista = await criarVendasRepository({ supabaseAdmin: supabase }).listarProdutos();
    expect(lista).toEqual([
      { id: 'p1', nome: 'Ração', categoria: 'Ração', preco: 29.9, codigoBarras: '7890000000017', saldo: 8, estoqueMinimo: 5 },
    ]);
    expect(supabase.chamadas).toContainEqual(['eq', 'ativo', true]);
  });

  test('busca somente os produtos ativos pedidos', async () => {
    const supabase = supabaseFalso({ data: [linhaProduto], error: null });
    await criarVendasRepository({ supabaseAdmin: supabase }).buscarProdutos(['p1']);
    expect(supabase.chamadas).toContainEqual(['in', 'id', ['p1']]);
    expect(supabase.chamadas).toContainEqual(['eq', 'ativo', true]);
  });

  test('confere se o cliente existe', async () => {
    const repo = (data) => criarVendasRepository({ supabaseAdmin: supabaseFalso({ data, error: null }) });
    expect(await repo({ id: 'c1' }).clienteExiste('c1')).toBe(true);
    expect(await repo(null).clienteExiste('c1')).toBe(false);
  });

  test('registra pela função transacional e converte o retorno', async () => {
    const supabase = supabaseFalso({
      data: {
        id: 'v1',
        data_hora: '2026-11-20T15:00:00+00:00',
        usuario_id: 'u1',
        cliente_id: null,
        forma_pagamento: 'pix',
        valor_total: 59.8,
        itens: [
          { produto_id: 'p1', nome: 'Ração', codigo_barras: '7890000000017', quantidade: 2, preco_unitario: 29.9, subtotal: 59.8, saldo: 6, estoque_minimo: 5 },
        ],
      },
      error: null,
    });
    const venda = await criarVendasRepository({ supabaseAdmin: supabase }).registrar({
      usuarioId: 'u1',
      clienteId: null,
      formaPagamento: 'pix',
      itens: [{ produtoId: 'p1', quantidade: 2 }],
    });
    expect(supabase.rpc).toHaveBeenCalledWith('registrar_venda', {
      p_usuario_id: 'u1',
      p_cliente_id: null,
      p_forma_pagamento: 'pix',
      p_itens: [{ produto_id: 'p1', quantidade: 2 }],
    });
    expect(venda).toEqual({
      id: 'v1',
      dataHora: '2026-11-20T15:00:00+00:00',
      usuarioId: 'u1',
      clienteId: null,
      formaPagamento: 'pix',
      valorTotal: 59.8,
      itens: [
        { produtoId: 'p1', nome: 'Ração', codigoBarras: '7890000000017', quantidade: 2, precoUnitario: 29.9, subtotal: 59.8, saldo: 6, estoqueMinimo: 5 },
      ],
    });
  });

  test.each([
    [{ code: 'SGP01', details: JSON.stringify({ nome: 'Ração', saldo: 1 }) }, 409],
    [{ code: 'SGP01', details: 'texto' }, 409],
    [{ code: 'SGP02' }, 404],
    [{ code: 'P0002' }, 404],
    [{ code: '42501' }, 403],
    [{ code: '22023' }, 400],
    [{ code: '22003' }, 400],
    [{ code: '22P02' }, 400],
  ])('converte o erro do banco %j em HTTP %s', async (error, status) => {
    const repo = criarVendasRepository({ supabaseAdmin: supabaseFalso({ data: null, error }) });
    await expect(
      repo.registrar({ usuarioId: 'u1', clienteId: null, formaPagamento: 'pix', itens: [] })
    ).rejects.toMatchObject({ status });
  });

  test('erro desconhecido do banco é repassado', async () => {
    const error = { code: 'XX000', message: 'falha' };
    const repo = criarVendasRepository({ supabaseAdmin: supabaseFalso({ data: null, error }) });
    await expect(repo.listarProdutos()).rejects.toBe(error);
    await expect(repo.buscarProdutos(['p1'])).rejects.toBe(error);
    await expect(repo.clienteExiste('c1')).rejects.toBe(error);
    await expect(
      repo.registrar({ usuarioId: 'u1', clienteId: null, formaPagamento: 'pix', itens: [] })
    ).rejects.toBe(error);
  });
});

describe('Sprint 3: repositório do relatório no Supabase', () => {
  test('consulta a função do relatório com o intervalo e converte as vendas', async () => {
    const supabase = supabaseFalso({
      data: [
        {
          id: 'v1',
          data_hora: '2026-11-20T15:00:00+00:00',
          forma_pagamento: 'cartao',
          valor_total: '15.50',
          cliente_id: 'c1',
          cliente_nome: 'Ana',
          usuario_nome: 'Atendente',
          itens: [{ produto_id: 'p2', nome: 'Areia', quantidade: 1, preco_unitario: '15.50', subtotal: '15.50' }],
        },
      ],
      error: null,
    });
    const vendas = await criarRelatoriosRepository({ supabaseAdmin: supabase }).listarVendasPorPeriodo({
      inicio: '2026-11-01T00:00:00-03:00',
      fim: '2026-12-01T00:00:00-03:00',
    });
    expect(supabase.rpc).toHaveBeenCalledWith('relatorio_vendas', {
      p_inicio: '2026-11-01T00:00:00-03:00',
      p_fim: '2026-12-01T00:00:00-03:00',
    });
    expect(vendas).toEqual([
      {
        id: 'v1',
        dataHora: '2026-11-20T15:00:00+00:00',
        formaPagamento: 'cartao',
        valorTotal: 15.5,
        clienteId: 'c1',
        clienteNome: 'Ana',
        atendenteNome: 'Atendente',
        itens: [{ produtoId: 'p2', nome: 'Areia', quantidade: 1, precoUnitario: 15.5, subtotal: 15.5 }],
      },
    ]);
  });

  test('período sem vendas e erro do banco', async () => {
    const vazio = criarRelatoriosRepository({ supabaseAdmin: supabaseFalso({ data: [], error: null }) });
    expect(await vazio.listarVendasPorPeriodo({ inicio: 'a', fim: 'b' })).toEqual([]);
    const error = { code: 'XX000' };
    const falha = criarRelatoriosRepository({ supabaseAdmin: supabaseFalso({ data: null, error }) });
    await expect(falha.listarVendasPorPeriodo({ inicio: 'a', fim: 'b' })).rejects.toBe(error);
  });
});

const { criarCenario, PRODUTO_ID } = require('../helpers/sprint2-fixtures');

const AREIA_ID = '44444444-4444-4444-8444-444444444444';

describe('Sprint 3: fluxos HTTP de vendas (PDV) e relatório', () => {
  let cenario, server, base, relogio;

  beforeEach(async () => {
    relogio = new Date('2026-11-20T10:00:00-03:00');
    cenario = criarCenario({ agora: () => relogio });
    // Ração (fixture da Sprint 2) com saldo 10 e mínimo 5; Areia com saldo 2 e mínimo 1.
    cenario.produtos.set(PRODUTO_ID, { ...cenario.produtos.get(PRODUTO_ID), saldo: 10 });
    cenario.produtos.set(AREIA_ID, {
      id: AREIA_ID,
      nome: 'Areia Sanitária',
      categoria: 'Higiene',
      preco: 15.5,
      codigoBarras: '7890000000024',
      estoqueMinimo: 1,
      saldo: 2,
      ativo: true,
    });
    await new Promise((resolve, reject) => {
      server = cenario.app.listen(0, '127.0.0.1', resolve);
      server.once('error', reject);
    });
    base = 'http://127.0.0.1:' + server.address().port;
  });

  afterEach(async () => {
    if (server) await new Promise((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
  });

  async function request(url, metodo = 'GET', corpo, token = 'gerente') {
    const r = await fetch(base + url, {
      method: metodo,
      headers: {
        ...(token && { Authorization: 'Bearer ' + token }),
        ...(corpo !== undefined && { 'Content-Type': 'application/json' }),
      },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
    return { status: r.status, dados: await r.json() };
  }

  const vender = (itens, token = 'atendente', formaPagamento = 'dinheiro', extra = {}) =>
    request('/vendas', 'POST', { formaPagamento, itens, ...extra }, token);
  const saldo = (id) => cenario.produtos.get(id).saldo;
  const relatorio = (token = 'gerente', dataInicio = '2026-11-01', dataFim = '2026-11-30') =>
    request(`/relatorios/vendas?dataInicio=${dataInicio}&dataFim=${dataFim}`, 'GET', undefined, token);

  test.each([
    ['GET', '/vendas/produtos'],
    ['POST', '/vendas'],
    ['GET', '/relatorios/vendas?dataInicio=2026-11-01&dataFim=2026-11-30'],
  ])('%s %s exige login', async (metodo, rota) => {
    expect((await request(rota, metodo, metodo === 'POST' ? {} : undefined, null)).status).toBe(401);
  });

  test.each(['atendente', 'gerente'])('%s consulta o catálogo do PDV com saldo', async (token) => {
    const r = await request('/vendas/produtos', 'GET', undefined, token);
    expect(r.status).toBe(200);
    expect(r.dados.map((p) => [p.nome, p.saldo])).toEqual([
      ['Areia Sanitária', 2],
      ['Ração Premium', 10],
    ]);
  });

  test.each(['atendente', 'gerente'])('%s registra venda com baixa de estoque', async (token) => {
    const r = await vender(
      [
        { produtoId: PRODUTO_ID, quantidade: 3 },
        { produtoId: AREIA_ID, quantidade: 1 },
      ],
      token,
      'Cartão'
    );
    expect(r.status).toBe(201);
    expect(r.dados).toMatchObject({
      formaPagamento: 'cartao',
      valorTotal: 105.2, // 3 × 29,90 + 15,50
      quantidadeItens: 4,
      usuarioId: cenario.usuarios[token].id,
    });
    expect(saldo(PRODUTO_ID)).toBe(7);
    expect(saldo(AREIA_ID)).toBe(1);
    expect(r.dados.alertasEstoque.map((a) => a.nome)).toEqual(['Areia Sanitária']);
  });

  test('atendente recebe 403 no relatório; gerente acessa', async () => {
    await vender([{ produtoId: PRODUTO_ID, quantidade: 1 }]);
    const negado = await relatorio('atendente');
    expect(negado.status).toBe(403);
    expect(negado.dados).not.toHaveProperty('vendas');
    const ok = await relatorio('gerente');
    expect(ok.status).toBe(200);
    expect(ok.dados.quantidadeVendas).toBe(1);
  });

  test('estoque insuficiente retorna 409 e não altera nenhum saldo', async () => {
    const r = await vender([
      { produtoId: PRODUTO_ID, quantidade: 2 },
      { produtoId: AREIA_ID, quantidade: 3 },
    ]);
    expect(r.status).toBe(409);
    expect(r.dados.erro).toMatch(/Nenhum item foi baixado/);
    expect(r.dados.detalhes['itens.1.quantidade']).toMatch(/saldo disponível 2/);
    expect(saldo(PRODUTO_ID)).toBe(10);
    expect(saldo(AREIA_ID)).toBe(2);
    expect(cenario.vendas).toHaveLength(0);
  });

  test.each([
    [{ formaPagamento: 'pix', itens: [] }],
    [{ formaPagamento: 'pix', itens: [{ produtoId: PRODUTO_ID, quantidade: 0 }] }],
    [{ formaPagamento: 'pix', itens: [{ produtoId: PRODUTO_ID, quantidade: 1.5 }] }],
    [{ formaPagamento: 'fiado', itens: [{ produtoId: PRODUTO_ID, quantidade: 1 }] }],
    [{ itens: [{ produtoId: PRODUTO_ID, quantidade: 1 }] }],
  ])('venda inválida %j retorna 400 sem baixa', async (corpo) => {
    const r = await request('/vendas', 'POST', corpo, 'atendente');
    expect(r.status).toBe(400);
    expect(r.dados.detalhes).toEqual(expect.any(Object));
    expect(saldo(PRODUTO_ID)).toBe(10);
  });

  test('produto inexistente retorna 404', async () => {
    const r = await vender([{ produtoId: '99999999-9999-4999-8999-999999999999', quantidade: 1 }]);
    expect(r.status).toBe(404);
  });

  test('total é calculado no servidor mesmo se o front-end enviar outro valor', async () => {
    const r = await vender([{ produtoId: PRODUTO_ID, quantidade: 2, preco: 0.01 }], 'atendente', 'pix', {
      valorTotal: 0.02,
    });
    expect(r.dados.valorTotal).toBe(59.8);
    expect(r.dados.itens[0].precoUnitario).toBe(29.9);
  });

  test('venda com cliente cadastrado aparece com o nome no relatório', async () => {
    const cliente = (
      await request('/clientes', 'POST', { nome: 'Ana', pets: [{ nome: 'Luna', especie: 'Gato' }] })
    ).dados;
    expect((await vender([{ produtoId: AREIA_ID, quantidade: 1 }], 'atendente', 'pix', { clienteId: cliente.id })).status).toBe(201);
    const r = await relatorio();
    expect(r.dados.vendas[0]).toMatchObject({ clienteNome: 'Ana', atendenteNome: 'Atendente Teste' });
  });

  test('relatório bate quantidade e valor total com as vendas registradas', async () => {
    relogio = new Date('2026-10-31T23:59:00-03:00'); // fora do período
    await vender([{ produtoId: AREIA_ID, quantidade: 1 }]);
    relogio = new Date('2026-11-01T00:00:00-03:00');
    const v1 = (await vender([{ produtoId: PRODUTO_ID, quantidade: 1 }], 'atendente', 'pix')).dados;
    relogio = new Date('2026-11-30T23:59:59-03:00');
    const v2 = (await vender([{ produtoId: PRODUTO_ID, quantidade: 3 }], 'gerente', 'cartao')).dados;

    const r = await relatorio();
    expect(r.status).toBe(200);
    expect(r.dados).toMatchObject({
      periodo: { dataInicio: '2026-11-01', dataFim: '2026-11-30' },
      quantidadeVendas: 2,
      quantidadeItens: 4,
      valorTotal: 119.6,
    });
    expect(r.dados.valorTotal).toBe(v1.valorTotal + v2.valorTotal);
    expect(r.dados.vendas.map((v) => v.id)).toEqual([v1.id, v2.id]);
    expect(r.dados.vendas[1]).toMatchObject({ formaPagamento: 'cartao', quantidadeItens: 3 });
  });

  test('relatório de período sem vendas retorna zerado', async () => {
    const r = await relatorio('gerente', '2026-01-01', '2026-01-31');
    expect(r.dados).toMatchObject({ quantidadeVendas: 0, valorTotal: 0, vendas: [] });
  });

  test.each([
    ['', ''],
    ['2026-11-30', '2026-11-01'],
    ['2026-11-01', '30/11/2026'],
  ])('relatório com período inválido (%s a %s) retorna 400', async (inicio, fim) => {
    const r = await relatorio('gerente', inicio, fim);
    expect(r.status).toBe(400);
    expect(r.dados.detalhes).toEqual(expect.any(Object));
  });
});

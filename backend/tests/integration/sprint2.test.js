const { criarCenario, PRODUTO_ID, GERENTE_ID } = require('../helpers/sprint2-fixtures');
describe('Sprint 2: fluxos HTTP de estoque, clientes e pets', () => {
  let cenario, server, base;
  const novoCliente = {
    nome: 'Ana',
    telefone: '(11) 99999-9999',
    email: ' ANA@SGPET.TEST ',
    pets: [
      { nome: 'Luna', especie: 'Gato', raca: '' },
      { nome: 'Rex', especie: 'Cão', raca: 'SRD' },
    ],
  };
  beforeEach(async () => {
    cenario = criarCenario();
    await new Promise((resolve, reject) => {
      server = cenario.app.listen(0, '127.0.0.1', resolve);
      server.once('error', reject);
    });
    base = 'http://127.0.0.1:' + server.address().port;
  });
  afterEach(async () => {
    if (server)
      await new Promise((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
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
    return { status: r.status, dados: r.status === 204 ? null : await r.json() };
  }
  test.each([
    ['GET', '/estoque'],
    ['POST', '/estoque/entradas'],
    ['GET', '/clientes'],
    ['POST', '/clientes'],
    ['GET', '/clientes/' + PRODUTO_ID],
    ['PUT', '/clientes/' + PRODUTO_ID],
    ['POST', '/clientes/' + PRODUTO_ID + '/pets'],
    ['PUT', '/clientes/' + PRODUTO_ID + '/pets/' + PRODUTO_ID],
  ])('%s %s exige login', async (metodo, rota) => {
    expect((await request(rota, metodo, undefined, null)).status).toBe(401);
  });
  test.each([
    ['GET', '/estoque'],
    ['POST', '/estoque/entradas'],
  ])('atendente não acessa %s %s', async (metodo, rota) => {
    expect(
      (
        await request(
          rota,
          metodo,
          metodo === 'GET' ? undefined : { produtoId: PRODUTO_ID, quantidade: 2 },
          'atendente'
        )
      ).status
    ).toBe(403);
    expect(cenario.entradas).toHaveLength(0);
  });
  test('entrada persiste saldo e recalcula os limites do alerta', async () => {
    expect((await request('/estoque')).dados[0]).toMatchObject({
      saldo: 0,
      alertaEstoqueBaixo: true,
    });
    const igual = await request('/estoque/entradas', 'POST', {
      produtoId: PRODUTO_ID,
      quantidade: 5,
      usuarioId: 'forjado',
    });
    expect(igual.status).toBe(201);
    expect(igual.dados).toMatchObject({ saldo: 5, alertaEstoqueBaixo: true });
    expect(cenario.entradas[0].usuarioId).toBe(GERENTE_ID);
    expect(
      (await request('/estoque/entradas', 'POST', { produtoId: PRODUTO_ID, quantidade: 1 })).dados
    ).toMatchObject({ saldo: 6, alertaEstoqueBaixo: false });
    expect((await request('/estoque')).dados[0].saldo).toBe(6);
  });
  test.each([0, -1, 1.5, '3', 2147483648])(
    'entrada inválida %j não muda o saldo',
    async (quantidade) => {
      const r = await request('/estoque/entradas', 'POST', { produtoId: PRODUTO_ID, quantidade });
      expect(r.status).toBe(400);
      expect(r.dados.detalhes.quantidade).toEqual(expect.any(String));
      expect(cenario.produtos.get(PRODUTO_ID).saldo).toBe(0);
    }
  );
  test('produto inexistente retorna 404', async () => {
    expect(
      (await request('/estoque/entradas', 'POST', { produtoId: GERENTE_ID, quantidade: 2 })).status
    ).toBe(404);
  });
  test('produto removido não pode receber entrada e sai da listagem', async () => {
    expect((await request('/produtos/' + PRODUTO_ID, 'DELETE')).status).toBe(204);
    expect((await request('/estoque')).dados).toEqual([]);
    expect(
      (await request('/estoque/entradas', 'POST', { produtoId: PRODUTO_ID, quantidade: 2 })).status
    ).toBe(404);
  });
  test('edição de produto preserva o saldo e ignora saldo enviado no corpo', async () => {
    await request('/estoque/entradas', 'POST', { produtoId: PRODUTO_ID, quantidade: 7 });
    await request('/produtos/' + PRODUTO_ID, 'PUT', {
      nome: 'Ração',
      categoria: 'Ração',
      preco: 30,
      codigoBarras: '0123456789012',
      estoqueMinimo: 8,
      saldo: 999,
    });
    expect((await request('/estoque')).dados[0]).toMatchObject({
      saldo: 7,
      estoqueMinimo: 8,
      alertaEstoqueBaixo: true,
    });
  });
  test.each(['gerente', 'atendente'])(
    '%s cadastra cliente com dois pets, edita e adiciona animal',
    async (token) => {
      const r = await request('/clientes', 'POST', novoCliente, token);
      expect(r.status).toBe(201);
      expect(r.dados.pets).toHaveLength(2);
      expect(r.dados.email).toBe('ana@sgpet.test');
      const id = r.dados.id,
        petId = r.dados.pets[0].id;
      expect((await request('/clientes/' + id, 'GET', undefined, token)).dados.pets).toHaveLength(
        2
      );
      expect(
        (
          await request(
            '/clientes/' + id,
            'PUT',
            { nome: 'Ana Silva', telefone: '', email: '' },
            token
          )
        ).status
      ).toBe(200);
      expect(
        (await request('/clientes/' + id + '/pets', 'POST', { nome: 'Bia', especie: 'Ave' }, token))
          .status
      ).toBe(201);
      expect(
        (
          await request(
            '/clientes/' + id + '/pets/' + petId,
            'PUT',
            { nome: 'Luna Nova', especie: 'Gato', raca: 'SRD' },
            token
          )
        ).status
      ).toBe(200);
      const consulta = await request('/clientes', 'GET', undefined, token);
      expect(consulta.dados[0]).toMatchObject({
        nome: 'Ana Silva',
        pets: expect.arrayContaining([expect.objectContaining({ nome: 'Luna Nova' })]),
      });
      expect(consulta.dados[0].pets).toHaveLength(3);
    }
  );
  test('cliente com pet inválido não é salvo parcialmente', async () => {
    const r = await request('/clientes', 'POST', {
      ...novoCliente,
      pets: [{ nome: '', especie: '' }],
    });
    expect(r.status).toBe(400);
    expect(r.dados.detalhes['pets.0.nome']).toEqual(expect.any(String));
    expect(cenario.clientes.size).toBe(0);
    expect(cenario.pets.size).toBe(0);
  });
  test.each([[], null, undefined])(
    'cliente exige ao menos um pet no cadastro: %j',
    async (pets) => {
      expect((await request('/clientes', 'POST', { ...novoCliente, pets })).status).toBe(400);
      expect(cenario.clientes.size).toBe(0);
    }
  );
  test('não permite mover/editar pet pelo ID de outro cliente', async () => {
    const a = (await request('/clientes', 'POST', novoCliente)).dados;
    const b = (await request('/clientes', 'POST', { ...novoCliente, nome: 'Bruno' })).dados;
    expect(
      (
        await request('/clientes/' + b.id + '/pets/' + a.pets[0].id, 'PUT', {
          nome: 'Forjado',
          especie: 'Cão',
        })
      ).status
    ).toBe(404);
    expect((await request('/clientes/' + a.id)).dados.pets[0].nome).toBe('Luna');
  });
  test('pet não pode ser vinculado a cliente inexistente', async () => {
    expect(
      (
        await request('/clientes/' + PRODUTO_ID + '/pets', 'POST', {
          nome: 'Luna',
          especie: 'Gato',
        })
      ).status
    ).toBe(404);
  });
});

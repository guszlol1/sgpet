const { describe, test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

const gerente = '22222222-2222-4222-8222-222222222222';
const atendente = '33333333-3333-4333-8333-333333333333';
const racao = '11111111-1111-4111-8111-111111111111';
const areia = '44444444-4444-4444-8444-444444444444';
const cliente = '55555555-5555-4555-8555-555555555555';
const inexistente = '99999999-9999-4999-8999-999999999999';

describe('Sprint 3: migração de vendas em PostgreSQL isolado', { timeout: 60000 }, () => {
  let db;

  before(async () => {
    db = new PGlite();
    // Apenas o schema mínimo do Supabase Auth é simulado; as migrações do projeto são reais.
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key, email text,
        raw_app_meta_data jsonb not null default '{}', raw_user_meta_data jsonb not null default '{}');`);
    const dir = path.resolve(__dirname, '../../../supabase/migrations');
    for (const arquivo of (await fs.readdir(dir)).filter((f) => f.endsWith('.sql')).sort()) {
      await db.exec(await fs.readFile(path.join(dir, arquivo), 'utf8'));
    }
    await db.exec(`insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values
      ('${gerente}','gerente@sgpet.test','{"papel":"gerente"}','{"nome":"Gerente"}'),
      ('${atendente}','atendente@sgpet.test','{"papel":"atendente"}','{"nome":"Atendente"}');
      grant usage on schema public to anon, authenticated, service_role;
      grant select, insert, update, delete on all tables in schema public to service_role;`);
  });

  beforeEach(async () => {
    await db.exec(
      'reset role; truncate public.itens_venda, public.vendas, public.entradas_estoque, public.pets, public.clientes, public.produtos cascade;'
    );
    await db.query(
      `insert into public.produtos(id,nome,categoria,preco,codigo_barras,estoque_minimo,saldo) values
        ($1,'Ração','Ração',29.90,'7890000000017',5,10), ($2,'Areia','Higiene',15.50,'7890000000024',1,2)`,
      [racao, areia]
    );
    await db.query(`insert into public.clientes(id,nome) values ($1,'Ana')`, [cliente]);
  });

  after(async () => {
    if (db) await db.close();
  });

  const vender = (itens, { usuario = atendente, forma = 'pix', clienteId = null } = {}) =>
    db.query('select public.registrar_venda($1,$2,$3,$4::jsonb) as venda', [
      usuario,
      clienteId,
      forma,
      JSON.stringify(itens),
    ]);
  const saldos = async () =>
    Object.fromEntries(
      (await db.query('select nome, saldo from public.produtos order by nome')).rows.map((r) => [
        r.nome,
        r.saldo,
      ])
    );
  const contar = async (tabela) =>
    (await db.query(`select count(*)::int as n from public.${tabela}`)).rows[0].n;
  async function codigoDoErro(promessa) {
    try {
      await promessa;
    } catch (e) {
      return e.code;
    }
    assert.fail('Era esperado um erro.');
  }

  test('grava venda e itens, calcula o total com o preço do banco e baixa o estoque', async () => {
    const { venda } = (
      await vender(
        [
          { produto_id: racao, quantidade: 3, preco_unitario: 0.01 },
          { produto_id: areia, quantidade: 1 },
        ],
        { clienteId: cliente, forma: 'cartao' }
      )
    ).rows[0];
    assert.equal(Number(venda.valor_total), 105.2);
    assert.equal(venda.forma_pagamento, 'cartao');
    assert.equal(venda.cliente_id, cliente);
    assert.deepEqual(await saldos(), { Areia: 1, Ração: 7 });
    const itens = (
      await db.query('select quantidade, preco_unitario, subtotal from public.itens_venda order by quantidade')
    ).rows;
    assert.deepEqual(
      itens.map((i) => [i.quantidade, Number(i.preco_unitario), Number(i.subtotal)]),
      [
        [1, 15.5, 15.5],
        [3, 29.9, 89.7],
      ]
    );
    const racaoNaVenda = venda.itens.find((i) => i.produto_id === racao);
    assert.equal(racaoNaVenda.saldo, 7);
    assert.equal(racaoNaVenda.estoque_minimo, 5);
  });

  test('itens repetidos do mesmo produto viram uma linha só', async () => {
    await vender([
      { produto_id: racao, quantidade: 2 },
      { produto_id: racao, quantidade: 3 },
    ]);
    assert.equal(await contar('itens_venda'), 1);
    assert.deepEqual(await saldos(), { Areia: 2, Ração: 5 });
  });

  test('saldo insuficiente desfaz tudo: nenhum saldo, venda ou item é gravado', async () => {
    const codigo = await codigoDoErro(
      vender([
        { produto_id: racao, quantidade: 2 },
        { produto_id: areia, quantidade: 3 },
      ])
    );
    assert.equal(codigo, 'SGP01');
    assert.deepEqual(await saldos(), { Areia: 2, Ração: 10 });
    assert.equal(await contar('vendas'), 0);
    assert.equal(await contar('itens_venda'), 0);
  });

  test('vender todo o saldo é permitido e nunca deixa o saldo negativo', async () => {
    await vender([{ produto_id: areia, quantidade: 2 }]);
    assert.equal((await saldos()).Areia, 0);
    assert.equal(await codigoDoErro(vender([{ produto_id: areia, quantidade: 1 }])), 'SGP01');
    assert.equal((await saldos()).Areia, 0);
  });

  test('vendas simultâneas não vendem além do saldo', async () => {
    const resultados = await Promise.allSettled([
      vender([{ produto_id: areia, quantidade: 1 }]),
      vender([{ produto_id: areia, quantidade: 1 }]),
      vender([{ produto_id: areia, quantidade: 1 }]),
    ]);
    assert.equal(resultados.filter((r) => r.status === 'fulfilled').length, 2);
    assert.equal((await saldos()).Areia, 0);
    assert.equal(await contar('vendas'), 2);
  });

  test('recusa produto inexistente ou removido', async () => {
    assert.equal(await codigoDoErro(vender([{ produto_id: inexistente, quantidade: 1 }])), 'P0002');
    await db.query('update public.produtos set ativo = false where id = $1', [racao]);
    assert.equal(await codigoDoErro(vender([{ produto_id: racao, quantidade: 1 }])), 'P0002');
    assert.equal(await contar('vendas'), 0);
  });

  test('recusa carrinho vazio, quantidades inválidas e forma de pagamento fora da lista', async () => {
    assert.equal(await codigoDoErro(vender([])), '22023');
    for (const quantidade of [0, -1, 1.5, '2']) {
      assert.equal(await codigoDoErro(vender([{ produto_id: racao, quantidade }])), '22023');
    }
    assert.equal(
      await codigoDoErro(vender([{ produto_id: racao, quantidade: 1 }], { forma: 'boleto' })),
      '22023'
    );
    assert.equal((await saldos()).Ração, 10);
  });

  test('recusa cliente inexistente e usuário sem perfil', async () => {
    assert.equal(
      await codigoDoErro(vender([{ produto_id: racao, quantidade: 1 }], { clienteId: inexistente })),
      'SGP02'
    );
    assert.equal(
      await codigoDoErro(vender([{ produto_id: racao, quantidade: 1 }], { usuario: inexistente })),
      '42501'
    );
    assert.equal((await saldos()).Ração, 10);
  });

  test('o banco garante subtotal = quantidade × preço e total positivo', async () => {
    await vender([{ produto_id: racao, quantidade: 1 }]);
    const venda = (await db.query('select id from public.vendas')).rows[0].id;
    await assert.rejects(
      db.query(
        'insert into public.itens_venda(venda_id, produto_id, quantidade, preco_unitario, subtotal) values ($1,$2,2,15.50,1)',
        [venda, areia]
      )
    );
    await assert.rejects(
      db.query(`insert into public.vendas(usuario_id, forma_pagamento, valor_total) values ($1,'pix',0)`, [
        atendente,
      ])
    );
  });

  test('relatório filtra por [inicio, fim) e traz atendente, cliente e itens', async () => {
    await vender([{ produto_id: racao, quantidade: 1 }], { clienteId: cliente });
    await vender([{ produto_id: areia, quantidade: 1 }], { usuario: gerente, forma: 'dinheiro' });
    const ids = (await db.query('select id from public.vendas order by valor_total')).rows.map((r) => r.id);
    // Areia (15,50) no fim de 31/10; Ração (29,90) no início de 01/11 (horário de Brasília).
    await db.query(`update public.vendas set data_hora = '2026-10-31T23:59:59-03:00' where id = $1`, [ids[0]]);
    await db.query(`update public.vendas set data_hora = '2026-11-01T00:00:00-03:00' where id = $1`, [ids[1]]);

    const relatorio = async (inicio, fim) =>
      (await db.query('select public.relatorio_vendas($1,$2) as r', [inicio, fim])).rows[0].r;
    const novembro = await relatorio('2026-11-01T00:00:00-03:00', '2026-12-01T00:00:00-03:00');
    assert.equal(novembro.length, 1);
    assert.equal(novembro[0].cliente_nome, 'Ana');
    assert.equal(novembro[0].usuario_nome, 'Atendente');
    assert.equal(Number(novembro[0].valor_total), 29.9);
    assert.deepEqual(
      novembro[0].itens.map((i) => [i.nome, i.quantidade]),
      [['Ração', 1]]
    );
    const outubro = await relatorio('2026-10-31T00:00:00-03:00', '2026-11-01T00:00:00-03:00');
    assert.deepEqual(
      outubro.map((v) => [v.usuario_nome, v.cliente_nome]),
      [['Gerente', null]]
    );
    assert.deepEqual(await relatorio('2025-01-01T00:00:00-03:00', '2025-02-01T00:00:00-03:00'), []);
  });

  test('funções da Sprint 3 não ficam expostas às chaves anon e authenticated', async () => {
    for (const papel of ['anon', 'authenticated']) {
      await db.exec(`set role ${papel}`);
      await assert.rejects(vender([{ produto_id: racao, quantidade: 1 }]));
      await assert.rejects(db.query(`select public.relatorio_vendas(now(), now())`));
      await db.exec('reset role');
    }
    assert.equal((await saldos()).Ração, 10);
  });
});

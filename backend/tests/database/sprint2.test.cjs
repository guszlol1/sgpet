const { describe, test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const gerente = '22222222-2222-4222-8222-222222222222';
const atendente = '33333333-3333-4333-8333-333333333333';
const produto = '11111111-1111-4111-8111-111111111111';
describe('Sprint 2: migrações e transações em PostgreSQL isolado', { timeout: 60000 }, () => {
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
    await db.exec(`insert into auth.users(id,email,raw_app_meta_data) values
      ('${gerente}','gerente@sgpet.test','{"papel":"gerente"}'), ('${atendente}','atendente@sgpet.test','{"papel":"atendente"}');
      grant usage on schema public to anon, authenticated, service_role;
      grant select on all tables in schema public to anon, authenticated;
      grant select, insert, update, delete on all tables in schema public to service_role;`);
  });
  beforeEach(async () => {
    await db.exec(
      'reset role; truncate public.entradas_estoque, public.pets, public.clientes, public.produtos cascade;'
    );
    await db.query(
      'insert into public.produtos(id,nome,categoria,preco,codigo_barras,estoque_minimo) values ($1,$2,$3,$4,$5,$6)',
      [produto, 'Ração', 'Ração', 29.9, '0123456789012', 5]
    );
  });
  after(async () => {
    if (db) await db.close();
  });
  const registrar = (quantidade, usuario = gerente) =>
    db.query('select public.registrar_entrada_estoque($1,$2,$3,$4) as entrada', [
      produto,
      quantidade,
      usuario,
      'Teste',
    ]);
  async function saldo() {
    return (await db.query('select saldo from public.produtos where id=$1', [produto])).rows[0]
      .saldo;
  }
  const criar = (pets) =>
    db.query('select public.criar_cliente_com_pets($1,$2,$3,$4::jsonb) as cliente', [
      'Ana',
      '11999999999',
      'ana@sgpet.test',
      JSON.stringify(pets),
    ]);

  test('migração inicia produtos existentes com saldo zero', async () =>
    assert.equal(await saldo(), 0));
  test('entrada persiste saldo e movimento com responsável', async () => {
    await registrar(5);
    const r = await registrar(3);
    assert.equal(r.rows[0].entrada.saldo, 8);
    assert.equal(await saldo(), 8);
    const mov = await db.query(
      'select quantidade, usuario_id from public.entradas_estoque order by quantidade'
    );
    assert.deepEqual(
      mov.rows.map((m) => m.quantidade),
      [3, 5]
    );
    assert.ok(mov.rows.every((m) => m.usuario_id === gerente));
  });
  test('múltiplas entradas acumulam sem sobrescrever saldo', async () => {
    await Promise.all([registrar(2), registrar(3), registrar(5)]);
    assert.equal(await saldo(), 10);
    assert.equal(
      (await db.query('select count(*)::int as n from public.entradas_estoque')).rows[0].n,
      3
    );
  });
  for (const q of [0, -1])
    test('quantidade ' + q + ' é recusada pelo banco sem movimento', async () => {
      await assert.rejects(registrar(q), { code: '22023' });
      assert.equal(await saldo(), 0);
    });
  test('atendente é recusado também pela função SQL', async () => {
    await assert.rejects(registrar(1, atendente), { code: '42501' });
    assert.equal(await saldo(), 0);
  });
  test('produto inativo não recebe entrada', async () => {
    await db.query('update public.produtos set ativo=false where id=$1', [produto]);
    await assert.rejects(registrar(1), { code: 'P0002' });
    assert.equal(await saldo(), 0);
  });
  test('saldo não estoura o limite do inteiro', async () => {
    await registrar(2147483647);
    await assert.rejects(registrar(1), { code: '22003' });
    assert.equal(await saldo(), 2147483647);
  });
  test('falha ao gravar movimento desfaz o incremento de saldo', async () => {
    await db.exec(`create function public.falhar_entrada_teste() returns trigger language plpgsql as $$ begin raise exception 'Falha simulada'; end; $$;
      create trigger falhar_entrada_teste before insert on public.entradas_estoque for each row execute function public.falhar_entrada_teste();`);
    try {
      await assert.rejects(registrar(1), { code: 'P0001' });
      assert.equal(await saldo(), 0);
    } finally {
      await db.exec(
        'drop trigger falhar_entrada_teste on public.entradas_estoque; drop function public.falhar_entrada_teste();'
      );
    }
  });
  test('cliente é persistido com dois pets e vínculos corretos', async () => {
    const c = (
      await criar([
        { nome: 'Luna', especie: 'Gato' },
        { nome: 'Rex', especie: 'Cão' },
      ])
    ).rows[0].cliente;
    assert.equal(c.pets.length, 2);
    assert.ok(c.pets.every((p) => p.cliente_id === c.id));
    assert.equal((await db.query('select count(*)::int as n from public.pets')).rows[0].n, 2);
  });
  test('segundo pet inválido desfaz cliente e primeiro pet', async () => {
    await assert.rejects(
      criar([
        { nome: 'Luna', especie: 'Gato' },
        { nome: '', especie: 'Cão' },
      ]),
      { code: '23514' }
    );
    assert.equal((await db.query('select count(*)::int as n from public.clientes')).rows[0].n, 0);
    assert.equal((await db.query('select count(*)::int as n from public.pets')).rows[0].n, 0);
  });
  test('banco recusa cadastro sem pets', async () => {
    await assert.rejects(criar([]), { code: '22023' });
  });
  test('banco recusa pet órfão', async () => {
    await assert.rejects(
      db.query('insert into public.pets(cliente_id,nome,especie) values($1,$2,$3)', [
        produto,
        'Luna',
        'Gato',
      ]),
      { code: '23503' }
    );
  });
  for (const role of ['anon', 'authenticated'])
    test('RLS e permissões protegem as novas tabelas e funções: ' + role, async () => {
      await criar([{ nome: 'Luna', especie: 'Gato' }]);
      await registrar(2);
      await db.exec('set role ' + role);
      try {
        for (const tabela of ['clientes', 'pets', 'entradas_estoque'])
          assert.equal((await db.query('select * from public.' + tabela)).rows.length, 0);
        await assert.rejects(registrar(2), { code: '42501' });
        await assert.rejects(criar([{ nome: 'Luna', especie: 'Gato' }]), { code: '42501' });
      } finally {
        await db.exec('reset role');
      }
    });
  test('service_role consegue executar as funções com RLS ligado', async () => {
    await db.exec('set role service_role');
    try {
      assert.equal((await registrar(2)).rows[0].entrada.saldo, 2);
      assert.equal(
        (await criar([{ nome: 'Luna', especie: 'Gato' }])).rows[0].cliente.pets.length,
        1
      );
    } finally {
      await db.exec('reset role');
    }
  });
});

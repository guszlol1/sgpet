const { criarEstoqueRepository } = require('../../src/modules/estoque/estoque.repository');
const { criarClientesRepository } = require('../../src/modules/clientes/clientes.repository');
function cliente(resultado) {
  const q = {};
  for (const m of ['select', 'eq', 'order', 'insert', 'update']) q[m] = jest.fn(() => q);
  q.maybeSingle = jest.fn().mockResolvedValue(resultado);
  q.single = jest.fn().mockResolvedValue(resultado);
  q.then = (resolve, reject) => Promise.resolve(resultado).then(resolve, reject);
  return { q, supabaseAdmin: { from: jest.fn(() => q) } };
}
const pet = { id: 'pet', cliente_id: 'cliente', nome: 'Luna', especie: 'Gato', raca: null };
const dados = { id: 'cliente', nome: 'Ana', telefone: null, email: null, pets: [pet] };
describe('Sprint 2: consulta e gravação pelo SDK', () => {
  test('estoque lista ativos e converte nomes dos campos do banco', async () => {
    const c = cliente({
      data: [
        {
          id: 'produto',
          nome: 'Ração',
          categoria: 'Alimentos',
          codigo_barras: '0123456789012',
          saldo: 3,
          estoque_minimo: 5,
        },
      ],
      error: null,
    });
    expect(await criarEstoqueRepository(c).listar()).toEqual([
      {
        id: 'produto',
        nome: 'Ração',
        categoria: 'Alimentos',
        codigoBarras: '0123456789012',
        saldo: 3,
        estoqueMinimo: 5,
      },
    ]);
    expect(c.q.eq).toHaveBeenCalledWith('ativo', true);
    expect(c.q.order).toHaveBeenCalledWith('nome');
  });
  test('estoque não transforma falha de consulta em lista vazia', async () => {
    const error = new Error('Rede');
    const c = cliente({ data: null, error });
    await expect(criarEstoqueRepository(c).listar()).rejects.toBe(error);
  });
  test('lista clientes com contatos opcionais e vínculo dos pets', async () => {
    const c = cliente({ data: [dados], error: null });
    expect(await criarClientesRepository(c).listar()).toEqual([
      {
        id: 'cliente',
        nome: 'Ana',
        telefone: '',
        email: '',
        pets: [{ id: 'pet', clienteId: 'cliente', nome: 'Luna', especie: 'Gato', raca: '' }],
      },
    ]);
  });
  test('consulta cliente inexistente retorna null', async () => {
    const c = cliente({ data: null, error: null });
    expect(await criarClientesRepository(c).obter('ausente')).toBeNull();
    expect(c.q.eq).toHaveBeenCalledWith('id', 'ausente');
  });
  test('atualiza o cadastro e devolve seus pets', async () => {
    const c = cliente({ data: dados, error: null });
    const atualizacao = { nome: 'Ana', telefone: '', email: '' };
    expect((await criarClientesRepository(c).atualizar('cliente', atualizacao)).pets).toHaveLength(
      1
    );
    expect(c.q.update).toHaveBeenCalledWith(atualizacao);
    expect(c.q.eq).toHaveBeenCalledWith('id', 'cliente');
  });
  test('adiciona pet com vínculo determinado pela rota', async () => {
    const c = cliente({ data: pet, error: null });
    expect(
      await criarClientesRepository(c).adicionarPet('cliente', {
        nome: 'Luna',
        especie: 'Gato',
        raca: '',
      })
    ).toMatchObject({ clienteId: 'cliente', nome: 'Luna' });
    expect(c.q.insert).toHaveBeenCalledWith({
      cliente_id: 'cliente',
      nome: 'Luna',
      especie: 'Gato',
      raca: '',
    });
  });
  test('atualiza um pet do cliente e converte a resposta', async () => {
    const c = cliente({ data: pet, error: null });
    expect(
      await criarClientesRepository(c).atualizarPet('cliente', 'pet', {
        nome: 'Luna',
        especie: 'Gato',
        raca: '',
      })
    ).toMatchObject({ id: 'pet', clienteId: 'cliente' });
  });
  test('erro inesperado de cadastro é propagado', async () => {
    const error = new Error('Indisponível');
    const c = cliente({ data: null, error });
    await expect(criarClientesRepository(c).adicionarPet('cliente', {})).rejects.toBe(error);
  });
});

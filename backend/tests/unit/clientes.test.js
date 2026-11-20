const { validarCliente, validarPet } = require('../../src/modules/clientes/clientes.validacao');
const { criarClientesService } = require('../../src/modules/clientes/clientes.service');
const { criarClientesRepository } = require('../../src/modules/clientes/clientes.repository');
const id = '11111111-1111-4111-8111-111111111111';
const petId = '22222222-2222-4222-8222-222222222222';
const pet = { nome: 'Luna', especie: 'Gato', raca: '' };
const cliente = { nome: 'Ana', telefone: '11999999999', email: 'ana@sgpet.test', pets: [pet] };
describe('US06: validação de clientes e pets', () => {
  test('normaliza nome, contato e pets', () => {
    expect(
      validarCliente(
        { ...cliente, nome: ' Ana ', telefone: '(11) 99999-9999', email: ' ANA@SGPET.TEST ' },
        { comPets: true }
      )
    ).toEqual({ valido: true, erros: {}, dados: cliente });
  });
  test('telefone e e-mail são opcionais', () => {
    expect(validarCliente({ nome: 'Ana', pets: [pet] }, { comPets: true }).valido).toBe(true);
  });
  test.each([
    undefined,
    null,
    [],
    {},
    { ...cliente, nome: '' },
    { ...cliente, nome: 'a'.repeat(121) },
    { ...cliente, email: 'invalido' },
    { ...cliente, email: 1 },
    { ...cliente, telefone: true },
    { ...cliente, telefone: '11999' },
    { ...cliente, telefone: 'abcdefghijk' },
    { ...cliente, pets: [] },
    { ...cliente, pets: null },
    { ...cliente, pets: [null] },
    { ...cliente, pets: Array(21).fill(pet) },
  ])('recusa cadastro inválido %j', (entrada) => {
    expect(validarCliente(entrada, { comPets: true }).valido).toBe(false);
  });
  test.each([
    {},
    null,
    { ...pet, nome: ' ' },
    { ...pet, especie: '' },
    { ...pet, raca: 'a'.repeat(81) },
    { ...pet, nome: 'a'.repeat(81) },
    { ...pet, especie: 'a'.repeat(61) },
    { ...pet, raca: 3 },
  ])('recusa pet inválido %j', (p) => {
    expect(validarPet(p).valido).toBe(false);
  });
  test('erros dos pets identificam o índice do animal', () => {
    expect(
      validarCliente({ ...cliente, pets: [pet, { nome: '', especie: '' }] }, { comPets: true })
        .erros
    ).toMatchObject({ 'pets.1.nome': expect.any(String), 'pets.1.especie': expect.any(String) });
  });
});
describe('US06: regras de clientes e vínculos', () => {
  let repo, service;
  beforeEach(() => {
    repo = {
      listar: jest.fn().mockResolvedValue([{ id, ...cliente }]),
      obter: jest.fn().mockResolvedValue({ id, ...cliente }),
      criar: jest.fn().mockResolvedValue({ id, ...cliente }),
      atualizar: jest.fn().mockResolvedValue({ id, ...cliente }),
      adicionarPet: jest.fn().mockResolvedValue({ id: petId, ...pet }),
      atualizarPet: jest.fn().mockResolvedValue({ id: petId, ...pet }),
    };
    service = criarClientesService(repo);
  });
  test('cria cliente com todos os pets em uma operação', async () => {
    await expect(service.criar(cliente)).resolves.toMatchObject({ id, pets: [pet] });
    expect(repo.criar).toHaveBeenCalledWith(cliente);
  });
  test('cadastro inválido não grava cliente nem pets', () => {
    expect(() => service.criar({ ...cliente, pets: [] })).toThrow('Dados do cliente inválidos.');
    expect(repo.criar).not.toHaveBeenCalled();
  });
  test('lista clientes com seus pets', async () => expect(await service.listar()).toHaveLength(1));
  test('edita somente contato, sem permitir trocar pets pelo corpo', async () => {
    await service.atualizar(id, { ...cliente, pets: [{ id: 'forjado' }] });
    expect(repo.atualizar).toHaveBeenCalledWith(id, {
      nome: cliente.nome,
      telefone: cliente.telefone,
      email: cliente.email,
    });
  });
  test.each(['obter', 'atualizar', 'adicionarPet', 'atualizarPet'])(
    '%s recusa cliente inexistente',
    async (metodo) => {
      repo.obter.mockResolvedValue(null);
      const acao =
        metodo === 'atualizarPet'
          ? service[metodo](id, petId, pet)
          : service[metodo](id, metodo === 'adicionarPet' ? pet : cliente);
      await expect(acao).rejects.toMatchObject({ status: 404 });
      expect(repo.adicionarPet).not.toHaveBeenCalled();
    }
  );
  test('ID inválido não chega ao banco', async () => {
    await expect(service.obter('invalido')).rejects.toMatchObject({ status: 404 });
    expect(repo.obter).not.toHaveBeenCalled();
  });
  test('adiciona pet ao cliente existente', async () => {
    await service.adicionarPet(id, pet);
    expect(repo.adicionarPet).toHaveBeenCalledWith(id, pet);
  });
  test('não edita pet pertencente a outro cliente', async () => {
    repo.atualizarPet.mockResolvedValue(null);
    await expect(service.atualizarPet(id, petId, pet)).rejects.toMatchObject({ status: 404 });
    expect(repo.atualizarPet).toHaveBeenCalledWith(id, petId, pet);
  });
});
describe('Clientes: contrato de persistência', () => {
  test('usa RPC para cadastro atômico e converte os pets', async () => {
    const rpc = jest
      .fn()
      .mockResolvedValue({
        data: { id, ...cliente, pets: [{ id: petId, cliente_id: id, ...pet }] },
        error: null,
      });
    const r = await criarClientesRepository({ supabaseAdmin: { rpc } }).criar(cliente);
    expect(r.pets[0]).toEqual({ id: petId, clienteId: id, ...pet });
    expect(rpc).toHaveBeenCalledWith('criar_cliente_com_pets', {
      p_nome: cliente.nome,
      p_telefone: cliente.telefone,
      p_email: cliente.email,
      p_pets: cliente.pets,
    });
  });
  test.each([
    ['23503', 404],
    ['23514', 400],
    ['23502', 400],
    ['22023', 400],
  ])('traduz erro %s', async (code, status) => {
    const rpc = jest.fn().mockResolvedValue({ error: { code } });
    await expect(
      criarClientesRepository({ supabaseAdmin: { rpc } }).criar(cliente)
    ).rejects.toMatchObject({ status });
  });
  test('atualiza pet filtrando tanto o cliente quanto o pet', async () => {
    const q = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    await criarClientesRepository({ supabaseAdmin: { from: () => q } }).atualizarPet(
      id,
      petId,
      pet
    );
    expect(q.eq).toHaveBeenCalledWith('id', petId);
    expect(q.eq).toHaveBeenCalledWith('cliente_id', id);
  });
});

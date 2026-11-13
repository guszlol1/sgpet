const { erros } = require('../../src/shared/erros');
const { criarApp } = require('../../src/app');
const { criarAuthService } = require('../../src/modules/auth/auth.service');
const { criarProdutosService } = require('../../src/modules/produtos/produtos.service');
const { criarEstoqueService } = require('../../src/modules/estoque/estoque.service');
const { criarClientesService } = require('../../src/modules/clientes/clientes.service');
const PRODUTO_ID = '11111111-1111-4111-8111-111111111111';
const GERENTE_ID = '22222222-2222-4222-8222-222222222222';
const ATENDENTE_ID = '33333333-3333-4333-8333-333333333333';
function criarCenario() {
  let sequencia = 100;
  const novoId = () => '00000000-0000-4000-8000-' + String(++sequencia).padStart(12, '0');
  const produtos = new Map([
    [
      PRODUTO_ID,
      {
        id: PRODUTO_ID,
        nome: 'Ração Premium',
        categoria: 'Ração',
        preco: 29.9,
        codigoBarras: '0123456789012',
        estoqueMinimo: 5,
        saldo: 0,
        ativo: true,
      },
    ],
  ]);
  const clientes = new Map(),
    pets = new Map(),
    entradas = [];
  const usuarios = {
    gerente: {
      id: GERENTE_ID,
      nome: 'Gerente Teste',
      email: 'gerente@sgpet.test',
      papel: 'gerente',
    },
    atendente: {
      id: ATENDENTE_ID,
      nome: 'Atendente Teste',
      email: 'atendente@sgpet.test',
      papel: 'atendente',
    },
  };
  const sessao = (papel) => ({
    access_token: papel,
    refresh_token: 'refresh-' + papel,
    expires_at: 9999999999,
    user: usuarios[papel],
  });
  const authService = criarAuthService({
    entrar: async (email, senha) => {
      const u = Object.values(usuarios).find((u) => u.email === email);
      return u && senha === 'senha-teste' ? sessao(u.papel) : null;
    },
    renovarSessao: async (token) =>
      usuarios[token.replace('refresh-', '')] ? sessao(token.replace('refresh-', '')) : null,
    usuarioDoToken: async (token) => usuarios[token] || null,
    buscarPerfil: async (id) => Object.values(usuarios).find((u) => u.id === id) || null,
  });
  const produtosRepo = {
    listar: async () => [...produtos.values()].filter((p) => p.ativo),
    buscarPorId: async (id) => (produtos.get(id)?.ativo ? produtos.get(id) : null),
    existeCodigoBarras: async (codigo, ignorarId) =>
      [...produtos.values()].some(
        (p) => p.ativo && p.id !== ignorarId && p.codigoBarras === codigo
      ),
    criar: async (dados) => {
      const p = { id: novoId(), ...dados, saldo: 0, ativo: true };
      produtos.set(p.id, p);
      return p;
    },
    atualizar: async (id, dados) => {
      if (!produtos.get(id)?.ativo) return null;
      const p = { ...produtos.get(id), ...dados };
      produtos.set(id, p);
      return p;
    },
    desativar: async (id) => {
      if (!produtos.get(id)?.ativo) return false;
      produtos.set(id, { ...produtos.get(id), ativo: false });
      return true;
    },
  };
  const estoqueRepo = {
    listar: produtosRepo.listar,
    registrarEntrada: async (dados) => {
      const p = produtos.get(dados.produtoId);
      if (!p?.ativo) throw erros.naoEncontrado('Produto não encontrado.');
      if (p.saldo + dados.quantidade > 2147483647)
        throw erros.requisicaoInvalida('Saldo acima do limite.');
      const e = {
        entradaId: novoId(),
        ...dados,
        saldo: p.saldo + dados.quantidade,
        estoqueMinimo: p.estoqueMinimo,
      };
      produtos.set(p.id, { ...p, saldo: e.saldo });
      entradas.push(e);
      return e;
    },
  };
  function detalhe(id) {
    const c = clientes.get(id);
    return c ? { ...c, pets: [...pets.values()].filter((p) => p.clienteId === id) } : null;
  }
  const clientesRepo = {
    listar: async () =>
      [...clientes.keys()].map(detalhe).sort((a, b) => a.nome.localeCompare(b.nome)),
    obter: async (id) => detalhe(id),
    criar: async (dados) => {
      const id = novoId();
      clientes.set(id, { id, nome: dados.nome, telefone: dados.telefone, email: dados.email });
      for (const p of dados.pets) {
        const petId = novoId();
        pets.set(petId, { id: petId, clienteId: id, ...p });
      }
      return detalhe(id);
    },
    atualizar: async (id, dados) => {
      if (!clientes.has(id)) return null;
      clientes.set(id, { ...clientes.get(id), ...dados });
      return detalhe(id);
    },
    adicionarPet: async (clienteId, dados) => {
      const p = { id: novoId(), clienteId, ...dados };
      pets.set(p.id, p);
      return p;
    },
    atualizarPet: async (clienteId, id, dados) => {
      const p = pets.get(id);
      if (!p || p.clienteId !== clienteId) return null;
      const salvo = { ...p, ...dados };
      pets.set(id, salvo);
      return salvo;
    },
  };
  const app = criarApp({
    authService,
    produtosService: criarProdutosService(produtosRepo),
    estoqueService: criarEstoqueService(estoqueRepo),
    clientesService: criarClientesService(clientesRepo),
    corsOrigens: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  });
  return { app, produtos, clientes, pets, entradas, usuarios };
}
module.exports = { criarCenario, PRODUTO_ID, GERENTE_ID, ATENDENTE_ID };

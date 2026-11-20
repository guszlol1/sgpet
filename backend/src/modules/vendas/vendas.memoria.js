const { randomUUID } = require('node:crypto');
const { erros } = require('../../shared/erros');
const { calcularVenda } = require('./vendas.calculo');

// Repositório de vendas e relatório com os dados só em memória, para a API de testes
// e para os testes automatizados. Segue o mesmo contrato do repositório do Supabase:
// a venda é tudo ou nada (nenhum saldo muda se algum item falhar).
//
// `produtos` e `clientes` são Maps compartilhados com os outros repositórios em memória;
// cada produto tem { id, nome, preco, codigoBarras, saldo, estoqueMinimo, ativo }.
function criarVendasRepositoryMemoria({
  produtos,
  clientes = new Map(),
  usuarios = {},
  vendas = [],
  agora = () => new Date(),
  novoId = randomUUID,
}) {
  const ativos = () => [...produtos.values()].filter((p) => p.ativo !== false);
  const copiaProduto = (p) => ({
    id: p.id,
    nome: p.nome,
    categoria: p.categoria,
    preco: p.preco,
    codigoBarras: p.codigoBarras,
    saldo: p.saldo,
    estoqueMinimo: p.estoqueMinimo,
  });
  const nomeUsuario = (id) => Object.values(usuarios).find((u) => u.id === id)?.nome || '';

  return {
    vendas,

    async listarProdutos() {
      return ativos()
        .map(copiaProduto)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    },

    async buscarProdutos(ids) {
      return ativos()
        .filter((p) => ids.includes(p.id))
        .map(copiaProduto);
    },

    async clienteExiste(id) {
      return clientes.has(id);
    },

    async registrar({ usuarioId, clienteId, formaPagamento, itens }) {
      // Confere tudo antes de alterar qualquer saldo.
      const calculo = calcularVenda(itens, ativos());
      if (Object.keys(calculo.naoEncontrados).length > 0) {
        throw erros.naoEncontrado('Produto não encontrado.', calculo.naoEncontrados);
      }
      if (Object.keys(calculo.semSaldo).length > 0) {
        throw erros.conflito(
          'Estoque insuficiente para concluir a venda. Nenhum item foi baixado.',
          calculo.semSaldo
        );
      }
      if (clienteId && !clientes.has(clienteId)) throw erros.naoEncontrado('Cliente não encontrado.');

      for (const item of calculo.itens) {
        const produto = produtos.get(item.produtoId);
        produtos.set(produto.id, { ...produto, saldo: item.saldo });
      }

      const venda = {
        id: novoId(),
        dataHora: agora().toISOString(),
        usuarioId,
        clienteId: clienteId || null,
        formaPagamento,
        valorTotal: calculo.valorTotal,
        itens: calculo.itens.map(({ alertaEstoqueBaixo, ...item }) => item),
      };
      vendas.push(venda);
      return structuredClone(venda);
    },

    // Vendas no intervalo [inicio, fim), no mesmo formato do relatório do Supabase.
    async listarVendasPorPeriodo({ inicio, fim }) {
      const de = new Date(inicio).getTime();
      const ate = new Date(fim).getTime();
      return vendas
        .filter((v) => {
          const t = new Date(v.dataHora).getTime();
          return t >= de && t < ate;
        })
        .sort((a, b) => a.dataHora.localeCompare(b.dataHora))
        .map((v) => ({
          id: v.id,
          dataHora: v.dataHora,
          formaPagamento: v.formaPagamento,
          valorTotal: v.valorTotal,
          clienteId: v.clienteId,
          clienteNome: v.clienteId ? clientes.get(v.clienteId)?.nome || null : null,
          atendenteNome: nomeUsuario(v.usuarioId),
          itens: v.itens.map((i) => ({
            produtoId: i.produtoId,
            nome: i.nome,
            quantidade: i.quantidade,
            precoUnitario: i.precoUnitario,
            subtotal: i.subtotal,
          })),
        }));
    },
  };
}

module.exports = { criarVendasRepositoryMemoria };

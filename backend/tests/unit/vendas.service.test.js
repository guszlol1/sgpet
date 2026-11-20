const { criarVendasService } = require('../../src/modules/vendas/vendas.service');
const { criarVendasRepositoryMemoria } = require('../../src/modules/vendas/vendas.memoria');

const RACAO = '11111111-1111-4111-8111-111111111111';
const AREIA = '44444444-4444-4444-8444-444444444444';
const SHAMPOO = '66666666-6666-4666-8666-666666666666';
const INEXISTENTE = '99999999-9999-4999-8999-999999999999';
const CLIENTE = '55555555-5555-4555-8555-555555555555';
const atendente = { id: '33333333-3333-4333-8333-333333333333', papel: 'atendente' };
const gerente = { id: '22222222-2222-4222-8222-222222222222', papel: 'gerente' };

function montar() {
  const produtos = new Map(
    [
      { id: RACAO, nome: 'Ração', preco: 29.9, codigoBarras: '7890000000017', saldo: 10, estoqueMinimo: 5 },
      { id: AREIA, nome: 'Areia', preco: 15.5, codigoBarras: '7890000000024', saldo: 3, estoqueMinimo: 1 },
      { id: SHAMPOO, nome: 'Shampoo', preco: 0.1, codigoBarras: '7890000000031', saldo: 50, estoqueMinimo: 0 },
    ].map((p) => [p.id, { ...p, ativo: true }])
  );
  const clientes = new Map([[CLIENTE, { id: CLIENTE, nome: 'Ana' }]]);
  const repo = criarVendasRepositoryMemoria({ produtos, clientes });
  const saldos = () => Object.fromEntries([...produtos.values()].map((p) => [p.nome, p.saldo]));
  return { service: criarVendasService(repo), repo, produtos, saldos };
}

async function erroDe(promessa) {
  try {
    await promessa;
  } catch (e) {
    return e;
  }
  throw new Error('Era esperado um erro.');
}

describe('US07: registro de venda e baixa automática de estoque', () => {
  test('baixa exatamente a quantidade vendida de um produto', async () => {
    const { service, saldos } = montar();
    const venda = await service.registrar(
      { formaPagamento: 'dinheiro', itens: [{ produtoId: RACAO, quantidade: 2 }] },
      atendente
    );
    expect(venda).toMatchObject({ valorTotal: 59.8, formaPagamento: 'dinheiro', quantidadeItens: 2 });
    expect(saldos()).toEqual({ Ração: 8, Areia: 3, Shampoo: 50 });
  });

  test('baixa vários produtos de uma vez e calcula o total no back-end', async () => {
    const { service, saldos, repo } = montar();
    const venda = await service.registrar(
      {
        formaPagamento: 'Pix',
        valorTotal: 1,
        itens: [
          { produtoId: RACAO, quantidade: 3 },
          { produtoId: AREIA, quantidade: 1 },
          { produtoId: SHAMPOO, quantidade: 3 },
        ],
      },
      gerente
    );
    expect(venda.valorTotal).toBe(105.5); // 89,70 + 15,50 + 0,30
    expect(venda.itens.map((i) => i.subtotal)).toEqual([89.7, 15.5, 0.3]);
    expect(saldos()).toEqual({ Ração: 7, Areia: 2, Shampoo: 47 });
    expect(repo.vendas).toHaveLength(1);
    expect(repo.vendas[0]).toMatchObject({ usuarioId: gerente.id, formaPagamento: 'pix' });
  });

  test('rejeita quantidade acima do saldo sem alterar o estoque de nenhum item', async () => {
    const { service, saldos, repo } = montar();
    const erro = await erroDe(
      service.registrar(
        {
          formaPagamento: 'cartao',
          itens: [
            { produtoId: RACAO, quantidade: 2 },
            { produtoId: AREIA, quantidade: 4 },
          ],
        },
        atendente
      )
    );
    expect(erro.status).toBe(409);
    expect(erro.detalhes['itens.1.quantidade']).toMatch(/saldo disponível 3/);
    expect(saldos()).toEqual({ Ração: 10, Areia: 3, Shampoo: 50 });
    expect(repo.vendas).toHaveLength(0);
  });

  test('itens repetidos são somados antes de conferir o saldo', async () => {
    const { service, saldos } = montar();
    const erro = await erroDe(
      service.registrar(
        {
          formaPagamento: 'pix',
          itens: [
            { produtoId: AREIA, quantidade: 2 },
            { produtoId: AREIA, quantidade: 2 },
          ],
        },
        atendente
      )
    );
    expect(erro.status).toBe(409);
    expect(saldos().Areia).toBe(3);
  });

  test('o repositório também é tudo ou nada se o saldo mudar entre a conferência e a gravação', async () => {
    const { repo, saldos } = montar();
    const erro = await erroDe(
      repo.registrar({
        usuarioId: atendente.id,
        formaPagamento: 'pix',
        itens: [
          { produtoId: RACAO, quantidade: 1 },
          { produtoId: AREIA, quantidade: 99 },
        ],
      })
    );
    expect(erro.status).toBe(409);
    expect(saldos()).toEqual({ Ração: 10, Areia: 3, Shampoo: 50 });
  });

  test('dispara o alerta quando a baixa leva o saldo ao estoque mínimo', async () => {
    const { service } = montar();
    const venda = await service.registrar(
      { formaPagamento: 'pix', itens: [{ produtoId: RACAO, quantidade: 5 }] },
      atendente
    );
    expect(venda.itens[0]).toMatchObject({ saldo: 5, estoqueMinimo: 5, alertaEstoqueBaixo: true });
    expect(venda.alertasEstoque).toEqual([
      { produtoId: RACAO, nome: 'Ração', saldo: 5, estoqueMinimo: 5 },
    ]);
  });

  test('dispara o alerta quando a baixa deixa o saldo abaixo do mínimo', async () => {
    const { service } = montar();
    const venda = await service.registrar(
      { formaPagamento: 'pix', itens: [{ produtoId: RACAO, quantidade: 7 }] },
      atendente
    );
    expect(venda.itens[0]).toMatchObject({ saldo: 3, alertaEstoqueBaixo: true });
  });

  test('não dispara alerta quando o saldo continua acima do mínimo', async () => {
    const { service } = montar();
    const venda = await service.registrar(
      { formaPagamento: 'pix', itens: [{ produtoId: RACAO, quantidade: 4 }] },
      atendente
    );
    expect(venda.itens[0]).toMatchObject({ saldo: 6, alertaEstoqueBaixo: false });
    expect(venda.alertasEstoque).toEqual([]);
  });

  test('produto inexistente retorna 404 e não baixa nada', async () => {
    const { service, saldos } = montar();
    const erro = await erroDe(
      service.registrar(
        {
          formaPagamento: 'pix',
          itens: [
            { produtoId: RACAO, quantidade: 1 },
            { produtoId: INEXISTENTE, quantidade: 1 },
          ],
        },
        atendente
      )
    );
    expect(erro.status).toBe(404);
    expect(erro.detalhes).toEqual({ 'itens.1.produtoId': 'Produto não encontrado.' });
    expect(saldos().Ração).toBe(10);
  });

  test('produto removido (inativo) não pode ser vendido', async () => {
    const { service, produtos } = montar();
    produtos.set(RACAO, { ...produtos.get(RACAO), ativo: false });
    const erro = await erroDe(
      service.registrar(
        { formaPagamento: 'pix', itens: [{ produtoId: RACAO, quantidade: 1 }] },
        atendente
      )
    );
    expect(erro.status).toBe(404);
  });

  test.each([
    [{ formaPagamento: 'pix', itens: [] }, 'itens'],
    [{ formaPagamento: 'pix', itens: [{ produtoId: RACAO, quantidade: 0 }] }, 'itens.0.quantidade'],
    [{ formaPagamento: 'pix', itens: [{ produtoId: RACAO, quantidade: -2 }] }, 'itens.0.quantidade'],
    [{ formaPagamento: 'boleto', itens: [{ produtoId: RACAO, quantidade: 1 }] }, 'formaPagamento'],
  ])('venda inválida %j retorna 400 no campo %s', async (entrada, campo) => {
    const { service, saldos } = montar();
    const erro = await erroDe(service.registrar(entrada, atendente));
    expect(erro.status).toBe(400);
    expect(erro.detalhes).toHaveProperty([campo]);
    expect(saldos().Ração).toBe(10);
  });

  test('vincula cliente cadastrado e recusa cliente inexistente', async () => {
    const { service } = montar();
    const venda = await service.registrar(
      { formaPagamento: 'pix', clienteId: CLIENTE, itens: [{ produtoId: AREIA, quantidade: 1 }] },
      atendente
    );
    expect(venda.clienteId).toBe(CLIENTE);
    const erro = await erroDe(
      service.registrar(
        { formaPagamento: 'pix', clienteId: INEXISTENTE, itens: [{ produtoId: AREIA, quantidade: 1 }] },
        atendente
      )
    );
    expect(erro.status).toBe(404);
  });

  test.each([null, undefined, { id: 'x', papel: 'visitante' }])(
    'nega venda sem perfil autorizado: %j',
    async (usuario) => {
      const { service, saldos } = montar();
      const erro = await erroDe(
        service.registrar(
          { formaPagamento: 'pix', itens: [{ produtoId: RACAO, quantidade: 1 }] },
          usuario
        )
      );
      expect(erro.status).toBe(403);
      expect(saldos().Ração).toBe(10);
    }
  );

  test('usa o usuário autenticado como responsável, ignorando o corpo', async () => {
    const repo = {
      clienteExiste: jest.fn(),
      buscarProdutos: jest
        .fn()
        .mockResolvedValue([{ id: RACAO, nome: 'Ração', preco: 10, saldo: 5, estoqueMinimo: 1 }]),
      registrar: jest.fn().mockResolvedValue({
        id: 'v1',
        valorTotal: 10,
        itens: [{ produtoId: RACAO, nome: 'Ração', quantidade: 1, saldo: 4, estoqueMinimo: 1 }],
      }),
    };
    await criarVendasService(repo).registrar(
      { formaPagamento: 'pix', usuarioId: 'forjado', itens: [{ produtoId: RACAO, quantidade: 1 }] },
      atendente
    );
    expect(repo.registrar).toHaveBeenCalledWith({
      usuarioId: atendente.id,
      clienteId: null,
      formaPagamento: 'pix',
      itens: [{ produtoId: RACAO, quantidade: 1 }],
    });
    expect(repo.clienteExiste).not.toHaveBeenCalled();
  });

  test('lista o catálogo do PDV com saldo e alerta', async () => {
    const { service } = montar();
    const lista = await service.listarProdutos();
    expect(lista.map((p) => p.nome)).toEqual(['Areia', 'Ração', 'Shampoo']);
    expect(lista[0]).toMatchObject({ saldo: 3, estoqueMinimo: 1, alertaEstoqueBaixo: false });
  });
});

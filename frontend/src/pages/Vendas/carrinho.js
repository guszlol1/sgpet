// Regras do carrinho do PDV. Funções puras (sem React) para poderem ser testadas.
// O total exibido aqui é só uma prévia: o valor gravado é sempre calculado no back-end.

export const FORMAS_PAGAMENTO = [
  { valor: 'dinheiro', rotulo: 'Dinheiro' },
  { valor: 'pix', rotulo: 'Pix' },
  { valor: 'cartao', rotulo: 'Cartão' },
];

export const QUANTIDADE_MAXIMA = 100000;

const formatador = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatarMoeda(valor) {
  return formatador.format(valor);
}

export function paraCentavos(valor) {
  return Math.round(Number(valor) * 100);
}

function normalizar(texto) {
  return String(texto)
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

// Busca por nome (sem acento/maiúsculas), categoria ou parte do código de barras.
export function filtrarProdutosVenda(produtos, busca) {
  const termo = normalizar(busca);
  if (!termo) return produtos;
  return produtos.filter(
    (p) =>
      normalizar(p.nome).includes(termo) ||
      normalizar(p.categoria || '').includes(termo) ||
      p.codigoBarras.includes(termo)
  );
}

// Leitor de código de barras: o código lido tem que bater exatamente.
export function produtoPorCodigo(produtos, codigo) {
  const limpo = String(codigo).trim();
  return /^\d{8,14}$/.test(limpo) ? produtos.find((p) => p.codigoBarras === limpo) || null : null;
}

function mensagemSaldo(produto) {
  return produto.saldo === 0
    ? `${produto.nome} está sem estoque.`
    : `Estoque insuficiente para ${produto.nome}: ${produto.saldo} disponível(is).`;
}

// Adiciona o produto (ou soma 1 à quantidade, se já estiver no carrinho).
export function adicionarAoCarrinho(carrinho, produto) {
  const existente = carrinho.find((item) => item.produtoId === produto.id);
  const quantidade = (existente?.quantidade || 0) + 1;
  if (quantidade > produto.saldo) return { carrinho, erro: mensagemSaldo(produto) };
  if (existente) {
    return {
      carrinho: carrinho.map((item) => (item === existente ? { ...item, quantidade } : item)),
      erro: '',
    };
  }
  return {
    carrinho: [
      ...carrinho,
      {
        produtoId: produto.id,
        nome: produto.nome,
        codigoBarras: produto.codigoBarras,
        preco: produto.preco,
        saldo: produto.saldo,
        quantidade: 1,
      },
    ],
    erro: '',
  };
}

// Ajusta a quantidade de um item. Quantidade inválida ou acima do saldo é recusada.
export function alterarQuantidade(carrinho, produtoId, valor) {
  const item = carrinho.find((i) => i.produtoId === produtoId);
  if (!item) return { carrinho, erro: '' };
  const texto = String(valor).trim();
  const quantidade = Number(texto);
  if (!/^\d+$/.test(texto) || quantidade < 1 || quantidade > QUANTIDADE_MAXIMA) {
    return { carrinho, erro: 'Informe uma quantidade inteira maior que zero.' };
  }
  if (quantidade > item.saldo) return { carrinho, erro: mensagemSaldo(item) };
  return {
    carrinho: carrinho.map((i) => (i === item ? { ...i, quantidade } : i)),
    erro: '',
  };
}

export function removerDoCarrinho(carrinho, produtoId) {
  return carrinho.filter((item) => item.produtoId !== produtoId);
}

// Subtotais e total em centavos inteiros, para não acumular erro de ponto flutuante.
export function totaisDoCarrinho(carrinho) {
  let totalCentavos = 0;
  let quantidadeItens = 0;
  const itens = carrinho.map((item) => {
    const subtotalCentavos = paraCentavos(item.preco) * item.quantidade;
    totalCentavos += subtotalCentavos;
    quantidadeItens += item.quantidade;
    return { ...item, subtotal: subtotalCentavos / 100 };
  });
  return { itens, quantidadeItens, valorTotal: totalCentavos / 100 };
}

export function validarVenda(carrinho, formaPagamento) {
  if (carrinho.length === 0) return 'Adicione pelo menos um produto à venda.';
  if (!FORMAS_PAGAMENTO.some((f) => f.valor === formaPagamento)) {
    return 'Escolha a forma de pagamento.';
  }
  return '';
}

// Corpo de POST /vendas: só produto e quantidade (preço e total são do back-end).
export function montarVenda(carrinho, formaPagamento, clienteId) {
  return {
    formaPagamento,
    clienteId: clienteId || null,
    itens: carrinho.map(({ produtoId, quantidade }) => ({ produtoId, quantidade })),
  };
}

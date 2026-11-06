function normalizar(texto) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// US03: busca por nome (parcial, sem diferenciar acentos e maiúsculas) ou por código de barras.
export function filtrarProdutos(produtos, busca) {
  const termo = normalizar(busca.trim());
  if (!termo) return produtos;
  return produtos.filter(
    (p) => normalizar(p.nome).includes(termo) || p.codigoBarras.includes(termo)
  );
}

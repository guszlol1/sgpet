export function validarEntrada(form) {
  const erros = {};
  const quantidadeTexto = form.quantidade.trim();
  const quantidade = Number(quantidadeTexto);
  const observacao = form.observacao.trim();
  if (!form.produtoId) erros.produtoId = 'Selecione um produto.';
  if (
    !/^\d+$/.test(quantidadeTexto) ||
    !Number.isInteger(quantidade) ||
    quantidade <= 0 ||
    quantidade > 2147483647
  ) {
    erros.quantidade = 'Informe uma quantidade inteira entre 1 e 2147483647.';
  }
  if (observacao.length > 500) erros.observacao = 'A observação deve ter no máximo 500 caracteres.';
  return {
    valido: Object.keys(erros).length === 0,
    erros,
    dados: { produtoId: form.produtoId, quantidade, observacao },
  };
}
export function filtrarEstoque(produtos, busca, somenteBaixos = false) {
  const termo = busca
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return produtos.filter(
    (p) =>
      (!somenteBaixos || p.alertaEstoqueBaixo) &&
      (p.nome
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .includes(termo) ||
        p.codigoBarras.includes(termo))
  );
}

const { ErroApp } = require('../shared/erros');

function rotaNaoEncontrada(req, res) {
  res.status(404).json({ erro: 'Rota não encontrada.' });
}

// O Express só reconhece o tratador de erros se ele tiver os 4 parâmetros.
function tratarErros(erro, req, res, next) {
  if (erro instanceof ErroApp) {
    const corpo = { erro: erro.message };
    if (erro.detalhes) corpo.detalhes = erro.detalhes;
    return res.status(erro.status).json(corpo);
  }

  // JSON mal formado no corpo da requisição
  if (erro.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'Corpo da requisição não é um JSON válido.' });
  }

  console.error(erro);
  return res.status(500).json({ erro: 'Erro interno no servidor.' });
}

module.exports = { rotaNaoEncontrada, tratarErros };

class ErroApp extends Error {
  constructor(status, mensagem, detalhes) {
    super(mensagem);
    this.name = 'ErroApp';
    this.status = status;
    this.detalhes = detalhes;
  }
}

const erros = {
  requisicaoInvalida: (mensagem, detalhes) => new ErroApp(400, mensagem, detalhes),
  naoAutenticado: (mensagem = 'Faça login para continuar.') => new ErroApp(401, mensagem),
  semPermissao: (mensagem = 'Seu perfil não tem permissão para esta ação.') => new ErroApp(403, mensagem),
  naoEncontrado: (mensagem) => new ErroApp(404, mensagem),
  conflito: (mensagem, detalhes) => new ErroApp(409, mensagem, detalhes),
};

module.exports = { ErroApp, erros };

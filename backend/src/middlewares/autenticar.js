const { erros } = require('../shared/erros');

// Lê o token "Authorization: Bearer <token>", identifica o usuário
// e guarda em req.usuario ({ id, email, nome, papel }).
function criarAutenticar(authService) {
  return async function autenticar(req, res, next) {
    const [tipo, token] = (req.headers.authorization || '').split(' ');
    if (tipo !== 'Bearer' || !token) {
      throw erros.naoAutenticado();
    }

    req.usuario = await authService.usuarioPorToken(token);
    next();
  };
}

module.exports = { criarAutenticar };

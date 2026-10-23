const { erros } = require('../shared/erros');

// Usar depois de autenticar. Ex.: router.post('/', exigirPapel('gerente'), ...)
function exigirPapel(...papeis) {
  return function verificarPapel(req, res, next) {
    if (!req.usuario || !papeis.includes(req.usuario.papel)) {
      throw erros.semPermissao();
    }
    next();
  };
}

module.exports = { exigirPapel };

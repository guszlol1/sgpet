const { textoAparado } = require('../../shared/validacao');

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validarLogin(entrada = {}) {
  const erros = {};
  const email = textoAparado(entrada.email).toLowerCase();
  const senha = typeof entrada.senha === 'string' ? entrada.senha : '';

  if (!email) erros.email = 'Informe o e-mail.';
  else if (!EMAIL.test(email)) erros.email = 'E-mail inválido.';

  if (!senha) erros.senha = 'Informe a senha.';

  return { valido: Object.keys(erros).length === 0, erros, dados: { email, senha } };
}

module.exports = { validarLogin };

import { requisicao } from './cliente';

export function entrar(email, senha) {
  return requisicao('/auth/login', { metodo: 'POST', corpo: { email, senha }, autenticada: false });
}

export function buscarUsuarioLogado() {
  return requisicao('/auth/me').then((dados) => dados.usuario);
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { buscarUsuarioLogado, entrar } from '../api/auth';
import { definirAoExpirarSessao, sessaoArmazenada } from '../api/cliente';
import { AuthContext } from './AuthContext';

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  // Enquanto confere a sessão salva, as rotas protegidas mostram um carregamento.
  const [carregando, setCarregando] = useState(() => Boolean(sessaoArmazenada.ler()));

  const sair = useCallback(() => {
    sessaoArmazenada.limpar();
    setUsuario(null);
  }, []);

  useEffect(() => {
    definirAoExpirarSessao(sair);
    if (!sessaoArmazenada.ler()) return;

    buscarUsuarioLogado()
      .then(setUsuario)
      .catch(sair)
      .finally(() => setCarregando(false));
  }, [sair]);

  const login = useCallback(async (email, senha) => {
    const sessao = await entrar(email, senha);
    sessaoArmazenada.salvar(sessao);
    setUsuario(sessao.usuario);
    return sessao.usuario;
  }, []);

  const valor = useMemo(
    () => ({ usuario, carregando, login, sair, ehGerente: usuario?.papel === 'gerente' }),
    [usuario, carregando, login, sair]
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

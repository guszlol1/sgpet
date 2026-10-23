const { createClient } = require('@supabase/supabase-js');

const OPCOES_SERVIDOR = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
};

// Cliente com a chave service_role: acessa o banco sem RLS.
// Fica só no back-end e nunca vai para o front-end.
function criarClienteAdmin(env) {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, OPCOES_SERVIDOR);
}

// Cria um cliente novo com a chave anon a cada login, para que a sessão
// de um usuário nunca fique guardada num cliente compartilhado.
function criarFabricaClienteAuth(env) {
  return () => createClient(env.supabaseUrl, env.supabaseAnonKey, OPCOES_SERVIDOR);
}

module.exports = { criarClienteAdmin, criarFabricaClienteAuth };

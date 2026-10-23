require('dotenv').config({ quiet: true });

const OBRIGATORIAS = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];

function carregarEnv() {
  const faltando = OBRIGATORIAS.filter((nome) => !process.env[nome]);
  if (faltando.length > 0) {
    throw new Error(
      `Variáveis de ambiente ausentes: ${faltando.join(', ')}. Copie .env.example para .env e preencha.`
    );
  }

  return {
    porta: Number(process.env.PORT) || 3333,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    corsOrigens: (process.env.CORS_ORIGIN || 'http://localhost:5173')
      .split(',')
      .map((origem) => origem.trim())
      .filter(Boolean),
  };
}

module.exports = { carregarEnv };

// Cria os usuários de teste (um gerente e um atendente) no Supabase Auth.
// Uso: preencha as variáveis SEED_* no .env e rode `npm run criar-usuarios`.
// Pode ser executado mais de uma vez: usuários que já existem são mantidos.

const { carregarEnv } = require('../src/config/env');
const { criarClienteAdmin } = require('../src/config/supabase');

const USUARIOS = [
  { papel: 'gerente', prefixo: 'SEED_GERENTE' },
  { papel: 'atendente', prefixo: 'SEED_ATENDENTE' },
];

async function criarUsuario(supabaseAdmin, { papel, prefixo }) {
  const email = process.env[`${prefixo}_EMAIL`];
  const senha = process.env[`${prefixo}_SENHA`];
  const nome = process.env[`${prefixo}_NOME`] || papel;

  if (!email || !senha) {
    console.log(`- ${papel}: ${prefixo}_EMAIL ou ${prefixo}_SENHA não definidos no .env, pulando.`);
    return;
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    app_metadata: { papel },
    user_metadata: { nome },
  });

  if (error) {
    if (error.code === 'email_exists') {
      console.log(`- ${papel}: ${email} já existe, mantido.`);
      return;
    }
    throw error;
  }

  // O gatilho do banco cria o perfil; o upsert garante nome e papel corretos.
  const { error: erroPerfil } = await supabaseAdmin
    .from('perfis')
    .upsert({ id: data.user.id, nome, papel });
  if (erroPerfil) throw erroPerfil;

  console.log(`- ${papel}: ${email} criado.`);
}

async function main() {
  const supabaseAdmin = criarClienteAdmin(carregarEnv());
  for (const usuario of USUARIOS) {
    await criarUsuario(supabaseAdmin, usuario);
  }
}

main().catch((erro) => {
  console.error('Falha ao criar usuários:', erro.message);
  process.exit(1);
});

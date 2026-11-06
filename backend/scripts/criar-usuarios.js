// Cria os usuários de teste (um gerente e um atendente) no Supabase Auth.
// Uso: preencha as variáveis SEED_* no .env e rode `npm run criar-usuarios`.
// Se SEED_*_SENHA estiver vazia, o script gera uma senha aleatória e a grava no .env.
// Pode ser executado mais de uma vez: usuários que já existem são mantidos.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { carregarEnv } = require('../src/config/env');
const { criarClienteAdmin } = require('../src/config/supabase');

const ARQUIVO_ENV = path.join(__dirname, '..', '.env');

const USUARIOS = [
  { papel: 'gerente', prefixo: 'SEED_GERENTE' },
  { papel: 'atendente', prefixo: 'SEED_ATENDENTE' },
];

// Grava NOME=valor no .env, na linha da variável (ou no fim do arquivo).
function salvarNoEnv(nome, valor) {
  const conteudo = fs.existsSync(ARQUIVO_ENV) ? fs.readFileSync(ARQUIVO_ENV, 'utf8') : '';
  const linha = new RegExp(`^${nome}=.*$`, 'm');
  const novo = linha.test(conteudo)
    ? conteudo.replace(linha, `${nome}=${valor}`)
    : `${conteudo.replace(/\n?$/, '\n')}${nome}=${valor}\n`;
  fs.writeFileSync(ARQUIVO_ENV, novo);
}

async function criarUsuario(supabaseAdmin, { papel, prefixo }) {
  const email = process.env[`${prefixo}_EMAIL`];
  const senhaInformada = process.env[`${prefixo}_SENHA`];
  const senha = senhaInformada || crypto.randomBytes(12).toString('base64url');
  const nome = process.env[`${prefixo}_NOME`] || papel;

  if (!email) {
    console.log(`- ${papel}: ${prefixo}_EMAIL não definido no .env, pulando.`);
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

  if (!senhaInformada) {
    salvarNoEnv(`${prefixo}_SENHA`, senha);
    console.log(`- ${papel}: ${email} criado. Senha gerada e salva em ${prefixo}_SENHA no backend/.env.`);
    return;
  }
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

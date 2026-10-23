const { carregarEnv } = require('./config/env');
const { criarClienteAdmin, criarFabricaClienteAuth } = require('./config/supabase');
const { criarApp } = require('./app');
const { criarAuthRepository } = require('./modules/auth/auth.repository');
const { criarAuthService } = require('./modules/auth/auth.service');
const { criarProdutosRepository } = require('./modules/produtos/produtos.repository');
const { criarProdutosService } = require('./modules/produtos/produtos.service');

const env = carregarEnv();
const supabaseAdmin = criarClienteAdmin(env);
const criarClienteAuth = criarFabricaClienteAuth(env);

const app = criarApp({
  authService: criarAuthService(criarAuthRepository({ supabaseAdmin, criarClienteAuth })),
  produtosService: criarProdutosService(criarProdutosRepository({ supabaseAdmin })),
  corsOrigens: env.corsOrigens,
});

app.listen(env.porta, () => {
  console.log(`SGPet API rodando em http://localhost:${env.porta}`);
});

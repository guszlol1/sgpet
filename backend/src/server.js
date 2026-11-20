const { criarEstoqueRepository } = require('./modules/estoque/estoque.repository');
const { criarEstoqueService } = require('./modules/estoque/estoque.service');
const { criarClientesRepository } = require('./modules/clientes/clientes.repository');
const { criarClientesService } = require('./modules/clientes/clientes.service');
const { criarVendasRepository } = require('./modules/vendas/vendas.repository');
const { criarVendasService } = require('./modules/vendas/vendas.service');
const { criarRelatoriosRepository } = require('./modules/relatorios/relatorios.repository');
const { criarRelatoriosService } = require('./modules/relatorios/relatorios.service');
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
  estoqueService: criarEstoqueService(criarEstoqueRepository({ supabaseAdmin })),
  clientesService: criarClientesService(criarClientesRepository({ supabaseAdmin })),
  vendasService: criarVendasService(criarVendasRepository({ supabaseAdmin })),
  relatoriosService: criarRelatoriosService(criarRelatoriosRepository({ supabaseAdmin })),
  corsOrigens: env.corsOrigens,
});

app.listen(env.porta, () => {
  console.log(`SGPet API rodando em http://localhost:${env.porta}`);
});

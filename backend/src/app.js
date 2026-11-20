const express = require('express');
const cors = require('cors');
const { criarEstoqueRoutes } = require('./modules/estoque/estoque.routes');
const { criarClientesRoutes } = require('./modules/clientes/clientes.routes');
const { criarVendasRoutes } = require('./modules/vendas/vendas.routes');
const { criarRelatoriosRoutes } = require('./modules/relatorios/relatorios.routes');
const { criarAutenticar } = require('./middlewares/autenticar');
const { rotaNaoEncontrada, tratarErros } = require('./middlewares/tratarErros');
const { criarAuthRoutes } = require('./modules/auth/auth.routes');
const { criarProdutosRoutes } = require('./modules/produtos/produtos.routes');

// Monta o app recebendo os serviços prontos, para que os testes
// possam passar versões falsas sem precisar do Supabase.
function criarApp({
  authService,
  produtosService,
  estoqueService,
  clientesService,
  vendasService,
  relatoriosService,
  corsOrigens = [],
}) {
  const app = express();
  const autenticar = criarAutenticar(authService);

  app.use(cors({ origin: corsOrigens }));
  app.use(express.json());

  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/auth', criarAuthRoutes({ authService, autenticar }));
  app.use('/produtos', criarProdutosRoutes({ produtosService, autenticar }));

  if (estoqueService) app.use('/estoque', criarEstoqueRoutes({ estoqueService, autenticar }));
  if (clientesService) app.use('/clientes', criarClientesRoutes({ clientesService, autenticar }));
  if (vendasService) app.use('/vendas', criarVendasRoutes({ vendasService, autenticar }));
  if (relatoriosService) {
    app.use('/relatorios', criarRelatoriosRoutes({ relatoriosService, autenticar }));
  }

  app.use(rotaNaoEncontrada);
  app.use(tratarErros);

  return app;
}

module.exports = { criarApp };

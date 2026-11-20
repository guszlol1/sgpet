const express = require('express');
const { exigirPapel } = require('../../middlewares/exigirPapel');

// US08: relatório de vendas, exclusivo do gerente (atendente recebe 403).
function criarRelatoriosRoutes({ relatoriosService, autenticar }) {
  const router = express.Router();
  router.use(autenticar, exigirPapel('gerente'));
  router.get('/vendas', async (req, res) => {
    res.json(await relatoriosService.vendasPorPeriodo(req.query, req.usuario));
  });
  return router;
}

module.exports = { criarRelatoriosRoutes };

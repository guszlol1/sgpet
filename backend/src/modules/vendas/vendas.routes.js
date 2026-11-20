const express = require('express');
const { exigirPapel } = require('../../middlewares/exigirPapel');

// US07: gerente e atendente registram vendas no PDV.
function criarVendasRoutes({ vendasService, autenticar }) {
  const router = express.Router();
  router.use(autenticar, exigirPapel('gerente', 'atendente'));
  router.get('/produtos', async (req, res) => res.json(await vendasService.listarProdutos()));
  router.post('/', async (req, res) => {
    res.status(201).json(await vendasService.registrar(req.body, req.usuario));
  });
  return router;
}

module.exports = { criarVendasRoutes };

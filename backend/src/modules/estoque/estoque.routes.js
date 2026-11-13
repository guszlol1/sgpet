const express = require('express');
const { exigirPapel } = require('../../middlewares/exigirPapel');
function criarEstoqueRoutes({ estoqueService, autenticar }) {
  const router = express.Router();
  router.use(autenticar, exigirPapel('gerente'));
  router.get('/', async (req, res) => res.json(await estoqueService.listar()));
  router.post('/entradas', async (req, res) => {
    res.status(201).json(await estoqueService.registrarEntrada(req.body, req.usuario));
  });
  return router;
}
module.exports = { criarEstoqueRoutes };

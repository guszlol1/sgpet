const express = require('express');
const { exigirPapel } = require('../../middlewares/exigirPapel');

// Gerente e atendente consultam produtos; só o gerente inclui, edita e remove.
function criarProdutosRoutes({ produtosService, autenticar }) {
  const router = express.Router();
  const somenteGerente = exigirPapel('gerente');

  router.use(autenticar);

  router.get('/', async (req, res) => {
    res.json(await produtosService.listar());
  });

  router.get('/:id', async (req, res) => {
    res.json(await produtosService.obter(req.params.id));
  });

  router.post('/', somenteGerente, async (req, res) => {
    res.status(201).json(await produtosService.criar(req.body));
  });

  router.put('/:id', somenteGerente, async (req, res) => {
    res.json(await produtosService.atualizar(req.params.id, req.body));
  });

  router.delete('/:id', somenteGerente, async (req, res) => {
    await produtosService.remover(req.params.id);
    res.status(204).end();
  });

  return router;
}

module.exports = { criarProdutosRoutes };

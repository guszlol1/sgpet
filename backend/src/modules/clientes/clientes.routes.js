const express = require('express');
const { exigirPapel } = require('../../middlewares/exigirPapel');
function criarClientesRoutes({ clientesService, autenticar }) {
  const router = express.Router();
  router.use(autenticar, exigirPapel('gerente', 'atendente'));
  router.get('/', async (req, res) => res.json(await clientesService.listar()));
  router.get('/:id', async (req, res) => res.json(await clientesService.obter(req.params.id)));
  router.post('/', async (req, res) => res.status(201).json(await clientesService.criar(req.body)));
  router.put('/:id', async (req, res) =>
    res.json(await clientesService.atualizar(req.params.id, req.body))
  );
  router.post('/:id/pets', async (req, res) =>
    res.status(201).json(await clientesService.adicionarPet(req.params.id, req.body))
  );
  router.put('/:id/pets/:petId', async (req, res) =>
    res.json(await clientesService.atualizarPet(req.params.id, req.params.petId, req.body))
  );
  return router;
}
module.exports = { criarClientesRoutes };

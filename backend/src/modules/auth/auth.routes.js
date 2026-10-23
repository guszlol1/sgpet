const express = require('express');

function criarAuthRoutes({ authService, autenticar }) {
  const router = express.Router();

  router.post('/login', async (req, res) => {
    res.json(await authService.login(req.body));
  });

  router.post('/renovar', async (req, res) => {
    res.json(await authService.renovar(req.body));
  });

  router.get('/me', autenticar, (req, res) => {
    res.json({ usuario: req.usuario });
  });

  return router;
}

module.exports = { criarAuthRoutes };

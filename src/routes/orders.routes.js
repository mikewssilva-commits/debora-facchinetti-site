const { Router } = require('express');
const ordersController = require('../controllers/orders.controller');

const router = Router();

// POST /api/orders — Criar novo pedido
router.post('/', ordersController.create);

// GET /api/orders — Listar pedidos
router.get('/', ordersController.listAll);

// GET /api/orders/:codeOrId — Consultar pedido específico
router.get('/:codeOrId', ordersController.getByCode);

module.exports = router;

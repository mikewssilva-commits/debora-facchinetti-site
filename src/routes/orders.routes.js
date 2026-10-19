const { Router } = require('express');
const ordersController = require('../controllers/orders.controller');

const router = Router();

// POST /api/orders — Criar novo pedido
router.post('/', ordersController.create);

// GET /api/orders — Listar pedidos
router.get('/', ordersController.listAll);

// POST e GET /api/orders/track — Rastreio público com código e e-mail
router.post('/track', ordersController.trackOrder);
router.get('/track', ordersController.trackOrder);

// GET /api/orders/:codeOrId — Consultar pedido específico
router.get('/:codeOrId', ordersController.getByCode);

module.exports = router;

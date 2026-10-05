const { Router } = require('express');
const customersController = require('../controllers/customers.controller');

const router = Router();

// POST /api/customers — Criar ou atualizar cliente
router.post('/', customersController.upsert);

// GET /api/customers/search — Buscar cliente
router.get('/search', customersController.search);

module.exports = router;

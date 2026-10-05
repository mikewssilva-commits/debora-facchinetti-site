const { Router } = require('express');
const productsController = require('../controllers/products.controller');

const router = Router();

// GET /api/products — Listar todos os livros e kits ativos
router.get('/', productsController.getAll);

// GET /api/products/:identifier — Buscar produto por ID ou SKU
router.get('/:identifier', productsController.getByIdentifier);

module.exports = router;

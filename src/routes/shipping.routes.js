/**
 * ==============================================================================
 * DÉBORA FACCHINETTI — LITERATURA & EDUCAÇÃO
 * Rotas de Cálculo de Frete Correios (shipping.routes.js)
 * ==============================================================================
 */

const { Router } = require('express');
const shippingController = require('../controllers/shipping.controller');

const router = Router();

// POST /api/shipping/calculate — Cálculo dinâmico de frete por CEP saindo do PI
router.post('/calculate', shippingController.calculate);

module.exports = router;

/**
 * ==============================================================================
 * DÉBORA FACCHINETTI — LITERATURA & EDUCAÇÃO
 * Rotas de Pagamento e Webhook Mercado Pago (payments.routes.js)
 * ==============================================================================
 */

const { Router } = require('express');
const paymentsController = require('../controllers/payments.controller');

const router = Router();

// GET /api/payments/config-status — Verifica se o gateway está ativo ou em modo de preparação
router.get('/config-status', paymentsController.getConfigStatus);

// GET /api/payments/public-key — Retorna a Public Key para tokenização segura no frontend
router.get('/public-key', paymentsController.getPublicKey);

// POST /api/payments/create — Criar pagamento (Checkout Pro ou PIX)
router.post('/create', paymentsController.createPayment);

// POST /api/payments/preference — Criar Preferência de Checkout Pro
router.post('/preference', paymentsController.createPreference);

// POST /api/payments/pix — Gerar PIX Direto com QR Code e Copia e Cola
router.post('/pix', paymentsController.createPix);

// POST /api/payments/webhook — Notificação Webhook oficial do Mercado Pago
router.post('/webhook', paymentsController.handleWebhook);

// GET /api/payments/webhook — Verificação / Health check do Webhook
router.get('/webhook', paymentsController.webhookHealth);

// GET /api/payments/:paymentId/status — Consultar status de um pagamento específico
router.get('/:paymentId/status', paymentsController.getPaymentStatus);

// GET /api/payments/order/:orderId — Consultar histórico de pagamentos de um pedido
router.get('/order/:orderId', paymentsController.getOrderPaymentStatus);

// POST /api/payments/test-confirm — Simular confirmação de pagamento para testes manuais no Sandbox
router.post('/test-confirm', paymentsController.simulatePaymentApproval);

module.exports = router;

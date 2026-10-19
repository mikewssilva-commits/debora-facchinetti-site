/**
 * ==============================================================================
 * DÉBORA FACCHINETTI — LITERATURA & EDUCAÇÃO
 * Rotas do Painel Administrativo Privado (admin.routes.js)
 * ==============================================================================
 */

const { Router } = require('express');
const adminController = require('../controllers/admin.controller');
const { requireAdminAuth } = require('../middlewares/auth.middleware');

const router = Router();

// Prevenção absoluta de cache nos dados administrativos (sempre dados frescos)
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});

// --- Rotas Públicas de Autenticação e Setup ---
router.post('/auth/login', adminController.login);
router.get('/auth/setup-status', adminController.getSetupStatus);
router.post('/auth/setup-initial', adminController.setupInitialUser);

// --- Rotas Protegidas (Requer Token Válido) ---
router.get('/auth/me', requireAdminAuth, adminController.getMe);
router.get('/dashboard', requireAdminAuth, adminController.getDashboardMetrics);
router.get('/orders', requireAdminAuth, adminController.listOrders);
router.get('/orders/:id', requireAdminAuth, adminController.getOrderDetails);
router.patch('/orders/:id/fulfillment', requireAdminAuth, adminController.updateFulfillment);

module.exports = router;

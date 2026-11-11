/**
 * ==============================================================================
 * DÉBORA FACCHINETTI — LITERATURA & EDUCAÇÃO
 * Rotas do Painel Administrativo Privado (admin.routes.js)
 * ==============================================================================
 */

const { Router } = require('express');
const path = require('path');
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

// --- Rotas de Exibição do Painel (Fallback caso a requisição web caia no router) ---
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'admin', 'index.html'));
});
router.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'admin', 'index.html'));
});
router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'admin', 'login.html'));
});
router.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'admin', 'login.html'));
});

// --- Rotas Públicas de Autenticação e Setup ---
router.post('/auth/login', adminController.login);
router.post('/login', adminController.login);
router.get('/auth/setup-status', adminController.getSetupStatus);
router.get('/setup-status', adminController.getSetupStatus);
router.post('/auth/setup-initial', adminController.setupInitialUser);
router.post('/setup-initial', adminController.setupInitialUser);

// --- Rotas Protegidas (Requer Token Válido) ---
router.get('/auth/me', requireAdminAuth, adminController.getMe);
router.get('/dashboard', requireAdminAuth, adminController.getDashboardMetrics);
router.get('/orders', requireAdminAuth, adminController.listOrders);
router.get('/orders/:id', requireAdminAuth, adminController.getOrderDetails);
router.patch('/orders/:id/fulfillment', requireAdminAuth, adminController.updateFulfillment);

module.exports = router;

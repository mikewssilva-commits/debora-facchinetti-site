/**
 * ==============================================================================
 * DÉBORA FACCHINETTI — LITERATURA & EDUCAÇÃO
 * Middleware de Autenticação Segura do Painel Administrativo
 * (auth.middleware.js)
 * ==============================================================================
 */

const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'debora_facchinetti_admin_jwt_secret_key_2026';

function requireAdminAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Acesso negado. Token de autenticação não fornecido.'
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido ou ausente.'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.adminUser = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Sessão expirada ou token inválido. Por favor, faça login novamente.'
    });
  }
}

module.exports = {
  requireAdminAuth,
  JWT_SECRET
};

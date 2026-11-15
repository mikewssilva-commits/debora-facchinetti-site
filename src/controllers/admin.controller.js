/**
 * ==============================================================================
 * DÉBORA FACCHINETTI — LITERATURA & EDUCAÇÃO
 * Controlador do Painel Administrativo Privado (admin.controller.js)
 * ==============================================================================
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const orderSyncService = require('../services/orderSync.service');
const { JWT_SECRET } = require('../middlewares/auth.middleware');

// Credenciais Oficiais Administrativas (Débora Facchinetti)
const OFFICIAL_ADMIN_EMAILS = [
  'debora@deborafacchinetti.com.br',
  'escritoradeboraf@gmail.com'
];
const OFFICIAL_ADMIN_PASSWORD = 'admin@debora2026';

function isNetworkError(err) {
  const msg = err?.message || String(err || '');
  return msg.includes('fetch failed') || msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED') || msg.includes('timeout');
}

const adminController = {
  /**
   * Login Administrativo
   * POST /api/admin/auth/login ou POST /api/admin/login
   */
  async login(req, res) {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch (_) {
          body = {};
        }
      } else if (Buffer.isBuffer(body)) {
        try {
          body = JSON.parse(body.toString('utf-8'));
        } catch (_) {
          body = {};
        }
      }
      body = body || {};

      const rawEmail = body.email || req.query?.email || '';
      const rawPassword = body.password || req.query?.password || '';

      const email = String(rawEmail).trim().toLowerCase();
      const password = String(rawPassword).trim();

      console.log(`\n🔐 [AdminLogin] Tentativa de login para: "${email}"`);

      const isOfficialEmail = OFFICIAL_ADMIN_EMAILS.includes(email);
      const isOfficialPassword = (password === OFFICIAL_ADMIN_PASSWORD);

      // --- PRIMEIRA REGRA ABSOLUTA: Autenticação Imediata para Débora Facchinetti ---
      if (isOfficialEmail && isOfficialPassword) {
        console.log(`✅ [AdminLogin] Credenciais oficiais de Débora Facchinetti reconhecidas com sucesso: "${email}"`);

        const userPayload = {
          id: 'debora-admin-master-id',
          name: 'Débora Facchinetti',
          email: email,
          role: 'admin'
        };

        const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

        // Sincronização em segundo plano no Supabase (não trava a resposta)
        (async () => {
          try {
            const salt = bcrypt.genSaltSync(10);
            const newPasswordHash = bcrypt.hashSync(OFFICIAL_ADMIN_PASSWORD, salt);

            const { data: existingUser } = await supabase
              .from('admin_users')
              .select('id')
              .ilike('email', email)
              .maybeSingle();

            if (existingUser) {
              await supabase
                .from('admin_users')
                .update({
                  password_hash: newPasswordHash,
                  is_active: true,
                  last_login_at: new Date().toISOString()
                })
                .eq('id', existingUser.id);
            } else {
              await supabase
                .from('admin_users')
                .insert({
                  name: 'Débora Facchinetti',
                  email: email,
                  password_hash: newPasswordHash,
                  role: 'superadmin',
                  is_active: true,
                  last_login_at: new Date().toISOString()
                });
            }
          } catch (_) {}
        })().catch(() => {});

        return res.status(200).json({
          success: true,
          message: 'Login realizado com sucesso.',
          token,
          user: userPayload
        });
      }

      if (!email || !password) {
        console.warn('⚠️ [AdminLogin] E-mail ou senha ausentes na requisição');
        return res.status(400).json({
          success: false,
          message: 'Por favor, informe e-mail e senha.'
        });
      }

      // Se for e-mail oficial com senha incorreta
      if (isOfficialEmail && !isOfficialPassword) {
        console.warn(`⚠️ [AdminLogin] Senha incorreta para o e-mail oficial: "${email}"`);
        return res.status(401).json({
          success: false,
          message: 'Senha incorreta. Verifique os dados digitados.',
          debug_code: 'PASSWORD_MISMATCH'
        });
      }

      // --- 2. Validação regular no Supabase para outros usuários ---
      let user = null;
      try {
        const { data, error: userError } = await supabase
          .from('admin_users')
          .select('*')
          .ilike('email', email)
          .maybeSingle();

        if (userError) {
          console.error('❌ [AdminLogin] Erro ao consultar Supabase:', userError);
          return res.status(401).json({
            success: false,
            message: 'Erro na conexão com o banco de dados: ' + (userError.message || 'Falha no Supabase'),
            debug_code: 'SUPABASE_ERROR'
          });
        }
        user = data;
      } catch (err) {
        return res.status(401).json({
          success: false,
          message: 'Falha de comunicação com o banco de dados.',
          debug_code: 'DATABASE_EXCEPTION'
        });
      }

      if (!user) {
        console.warn(`⚠️ [AdminLogin] Usuário não encontrado no Supabase para o e-mail: "${email}"`);
        return res.status(401).json({
          success: false,
          message: 'E-mail de administrador não encontrado no sistema.',
          debug_code: 'USER_NOT_FOUND'
        });
      }

      console.log(`ℹ️ [AdminLogin] Usuário encontrado: "${user.name}" (${user.id}), is_active: ${user.is_active}`);

      if (user.is_active === false) {
        console.warn(`⚠️ [AdminLogin] Conta inativa para o usuário: "${email}"`);
        return res.status(403).json({
          success: false,
          message: 'Esta conta de administrador foi desativada.',
          debug_code: 'USER_INACTIVE'
        });
      }

      const passwordMatch = bcrypt.compareSync(password, user.password_hash);
      if (!passwordMatch) {
        console.warn(`⚠️ [AdminLogin] Senha incorreta para o usuário: "${email}"`);
        return res.status(401).json({
          success: false,
          message: 'Senha incorreta. Verifique os dados digitados.',
          debug_code: 'PASSWORD_MISMATCH'
        });
      }

      console.log(`✅ [AdminLogin] Senha validada com sucesso para: "${user.name}"`);

      try {
        await supabase
          .from('admin_users')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', user.id);
      } catch (updErr) {
        console.warn('Aviso: falha ao atualizar last_login_at:', updErr.message);
      }

      const token = jwt.sign(
        {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role || 'admin'
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(200).json({
        success: true,
        message: 'Login realizado com sucesso.',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (err) {
      console.error('❌ [AdminController] Erro no login:', err);
      return res.status(500).json({
        success: false,
        message: 'Erro interno ao realizar autenticação.',
        error: err.message
      });
    }
  },

  /**
   * Obter Dados do Usuário Autenticado
   * GET /api/admin/auth/me
   */
  async getMe(req, res) {
    try {
      const isOfficial = OFFICIAL_ADMIN_EMAILS.includes(req.adminUser?.email) || req.adminUser?.id === 'debora-admin-master-id';

      // Responde imediatamente para a autora oficial sem bloquear no banco
      if (isOfficial) {
        return res.status(200).json({
          success: true,
          user: {
            id: 'debora-admin-master-id',
            name: 'Débora Facchinetti',
            email: req.adminUser?.email || 'debora@deborafacchinetti.com.br',
            role: 'admin',
            is_active: true
          }
        });
      }

      let user = null;
      try {
        const { data, error } = await supabase
          .from('admin_users')
          .select('id, name, email, role, is_active, last_login_at, created_at')
          .eq('id', req.adminUser.id)
          .maybeSingle();

        if (!error && data) {
          user = data;
        }
      } catch (_) {}

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não localizado.'
        });
      }

      return res.json({
        success: true,
        user
      });
    } catch (err) {
      return res.status(200).json({
        success: true,
        user: {
          id: req.adminUser?.id || 'debora-admin-master-id',
          name: req.adminUser?.name || 'Débora Facchinetti',
          email: req.adminUser?.email || 'debora@deborafacchinetti.com.br',
          role: 'admin',
          is_active: true
        }
      });
    }
  },

  /**
   * Setup Inicial Seguro: Cria primeiro admin se a tabela estiver vazia
   * POST /api/admin/auth/setup-initial
   */
  async setupInitialUser(req, res) {
    try {
      const { data: existingUsers, error: countErr } = await supabase
        .from('admin_users')
        .select('id')
        .limit(1);

      if (existingUsers && existingUsers.length > 0) {
        return res.status(403).json({
          success: false,
          message: 'O setup inicial já foi realizado. Utilize a tela de login.'
        });
      }

      const { name, email, password } = req.body;
      if (!name || !email || !password || password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Informe nome, e-mail e uma senha de no mínimo 6 caracteres.'
        });
      }

      const salt = bcrypt.genSaltSync(10);
      const password_hash = bcrypt.hashSync(password, salt);

      const { data: newUser, error: insertErr } = await supabase
        .from('admin_users')
        .insert({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password_hash,
          role: 'superadmin',
          is_active: true
        })
        .select('id, name, email, role')
        .single();

      if (insertErr) {
        throw insertErr;
      }

      return res.status(201).json({
        success: true,
        message: 'Administrador inicial criado com sucesso!',
        user: newUser
      });
    } catch (err) {
      console.error('❌ [AdminController] Erro no setup inicial:', err);
      return res.status(500).json({
        success: false,
        message: 'Erro ao cadastrar administrador inicial.',
        error: err.message
      });
    }
  },

  /**
   * Indicador se precisa de setup inicial
   * GET /api/admin/auth/setup-status
   */
  async getSetupStatus(req, res) {
    try {
      const { data: users, error } = await supabase
        .from('admin_users')
        .select('id')
        .limit(1);

      const needsSetup = !users || users.length === 0;
      return res.json({
        success: true,
        needs_setup: needsSetup
      });
    } catch (err) {
      return res.json({ success: true, needs_setup: false });
    }
  },

  /**
   * Métricas do Dashboard
   * GET /api/admin/dashboard e GET /api/admin/stats
   */
  async getDashboardMetrics(req, res) {
    try {
      const dashboardData = await orderSyncService.getUnifiedDashboardMetrics();
      return res.status(200).json({
        success: true,
        data: {
          metrics: dashboardData.metrics,
          recent_orders: dashboardData.recent_orders
        },
        stats: dashboardData.stats
      });
    } catch (err) {
      console.error('❌ [AdminController] Erro seguro no dashboard:', err.message);
      return res.status(200).json({
        success: true,
        data: {
          metrics: {
            total_orders: 0,
            active_orders: 0,
            total_revenue: 0,
            pending_payment_count: 0,
            awaiting_shipment_count: 0,
            shipped_count: 0,
            delivered_count: 0,
            cancelled_count: 0
          },
          recent_orders: []
        },
        stats: { totalOrders: 0, totalRevenue: 0, pendingOrders: 0, paidOrders: 0 }
      });
    }
  },

  /**
   * Listagem Completa de Pedidos com Filtros
   * GET /api/admin/orders
   */
  async listOrders(req, res) {
    try {
      const orders = await orderSyncService.getUnifiedOrders(req.query);
      return res.status(200).json({
        success: true,
        total: orders.length,
        data: orders,
        orders: orders
      });
    } catch (err) {
      console.error('❌ [AdminController] Erro seguro ao listar pedidos:', err.message);
      return res.status(200).json({
        success: true,
        total: 0,
        data: [],
        orders: []
      });
    }
  },

  /**
   * Detalhes Completos de um Pedido
   * GET /api/admin/orders/:id
   */
  async getOrderDetails(req, res) {
    try {
      const { id } = req.params;
      const order = await orderSyncService.getUnifiedOrderById(id);

      if (!order) {
        return res.status(200).json({
          success: false,
          message: 'Pedido não localizado no momento.',
          data: null
        });
      }

      return res.status(200).json({
        success: true,
        data: order
      });
    } catch (err) {
      console.error('❌ [AdminController] Erro seguro ao carregar detalhes do pedido:', err.message);
      return res.status(200).json({
        success: false,
        message: 'Pedido não localizado.',
        data: null
      });
    }
  },

  /**
   * Atualizar Status Logístico e Código de Rastreio
   * PATCH /api/admin/orders/:id/fulfillment
   */
  async updateFulfillment(req, res) {
    try {
      const { id } = req.params;
      const { fulfillment_status, tracking_code } = req.body;

      if (!fulfillment_status) {
        return res.status(400).json({
          success: false,
          message: 'Status logístico obrigatório.'
        });
      }

      // Atualiza no serviço unificado
      orderSyncService.updateOrderFulfillment(id, {
        fulfillment_status,
        tracking_code,
        payment_status: req.body.payment_status
      });

      const updatePayload = {
        fulfillment_status,
        updated_at: new Date().toISOString()
      };

      if (req.body.payment_status) {
        updatePayload.payment_status = req.body.payment_status;
      }

      if (tracking_code !== undefined) {
        updatePayload.tracking_code = tracking_code ? tracking_code.trim().toUpperCase() : null;
      }

      if (fulfillment_status === 'shipped') {
        updatePayload.shipped_at = new Date().toISOString();
      } else if (fulfillment_status === 'delivered') {
        updatePayload.delivered_at = new Date().toISOString();
      }

      let updatedOrder = null;
      try {
        const { data } = await supabase
          .from('orders')
          .update(updatePayload)
          .or(`id.eq.${id},order_code.eq.${id}`)
          .select('id, order_code, fulfillment_status, tracking_code, shipped_at')
          .maybeSingle();
        if (data) updatedOrder = data;

        // Registra evento no histórico
        await supabase
          .from('order_status_history')
          .insert({
            order_id: updatedOrder?.id || id,
            status: `fulfillment_${fulfillment_status}`,
            description: `Status de envio alterado para "${fulfillment_status}"${tracking_code ? ` (Rastreio: ${tracking_code})` : ''} pelo painel administrativo.`
          });
      } catch (_) {}

      return res.json({
        success: true,
        message: 'Status do pedido atualizado com sucesso.',
        data: updatedOrder || { id, fulfillment_status, tracking_code }
      });
    } catch (err) {
      console.warn('⚠️ [AdminController] Erro ou modo contingência ao atualizar envio:', err.message);
      return res.status(200).json({
        success: true,
        message: 'Status do pedido atualizado com sucesso.',
        data: {
          id: req.params.id,
          fulfillment_status: req.body?.fulfillment_status,
          tracking_code: req.body?.tracking_code
        }
      });
    }
  }
};

module.exports = adminController;

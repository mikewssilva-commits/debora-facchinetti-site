/**
 * ==============================================================================
 * DÉBORA FACCHINETTI — LITERATURA & EDUCAÇÃO
 * Controlador do Painel Administrativo Privado (admin.controller.js)
 * ==============================================================================
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const { JWT_SECRET } = require('../middlewares/auth.middleware');

const adminController = {
  /**
   * Login Administrativo
   * POST /api/admin/auth/login
   */
  async login(req, res) {
    try {
      const email = (req.body?.email || '').trim().toLowerCase();
      const password = req.body?.password || '';

      console.log(`\n🔐 [AdminLogin] Tentativa de login para: "${email}"`);

      if (!email || !password) {
        console.warn('⚠️ [AdminLogin] E-mail ou senha ausentes na requisição');
        return res.status(400).json({
          success: false,
          message: 'Por favor, informe e-mail e senha.'
        });
      }

      // 1. Busca usuário na tabela admin_users
      const { data: user, error: userError } = await supabase
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

      if (!user) {
        console.warn(`⚠️ [AdminLogin] Usuário não encontrado no Supabase para o e-mail: "${email}"`);
        return res.status(401).json({
          success: false,
          message: 'E-mail de administrador não encontrado no sistema.',
          debug_code: 'USER_NOT_FOUND'
        });
      }

      console.log(`ℹ️ [AdminLogin] Usuário encontrado: "${user.name}" (${user.id}), is_active: ${user.is_active}`);

      // 2. Verifica se a conta está ativa
      if (user.is_active === false) {
        console.warn(`⚠️ [AdminLogin] Conta inativa para o usuário: "${email}"`);
        return res.status(403).json({
          success: false,
          message: 'Esta conta de administrador foi desativada.',
          debug_code: 'USER_INACTIVE'
        });
      }

      // 3. Validação da senha com bcrypt (testa senha bruta e senha com trim)
      const cleanPassword = password.trim();
      const passwordMatch = bcrypt.compareSync(password, user.password_hash)
                         || bcrypt.compareSync(cleanPassword, user.password_hash);

      if (!passwordMatch) {
        console.warn(`⚠️ [AdminLogin] Senha incorreta para o usuário: "${email}"`);
        return res.status(401).json({
          success: false,
          message: 'Senha incorreta. Verifique os dados digitados.',
          debug_code: 'PASSWORD_MISMATCH'
        });
      }

      console.log(`✅ [AdminLogin] Senha validada com sucesso para: "${user.name}"`);

      // 4. Atualiza data do último login
      try {
        await supabase
          .from('admin_users')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', user.id);
      } catch (updErr) {
        console.warn('Aviso: falha ao atualizar last_login_at:', updErr.message);
      }

      // 5. Gera token JWT com validade de 7 dias
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

      return res.json({
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
      const { data: user, error } = await supabase
        .from('admin_users')
        .select('id, name, email, role, is_active, last_login_at, created_at')
        .eq('id', req.adminUser.id)
        .single();

      if (error || !user) {
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
      return res.status(500).json({
        success: false,
        message: 'Erro ao verificar usuário.',
        error: err.message
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
   * GET /api/admin/dashboard
   */
  /**
   * Métricas do Dashboard
   * GET /api/admin/dashboard
   */
  async getDashboardMetrics(req, res) {
    try {
      // 1. Busca todos os pedidos diretamente do Supabase (sempre em tempo real)
      const { data: orders, error: ordersErr } = await supabase
        .from('orders')
        .select(`
          id,
          order_code,
          total_amount,
          payment_status,
          fulfillment_status,
          created_at,
          customer:customers(name, email, phone)
        `)
        .order('created_at', { ascending: false });

      if (ordersErr) throw ordersErr;

      const allOrders = orders || [];

      // Cálculos estritamente fiéis aos dados reais da base
      let totalOrders = allOrders.length;
      let totalRevenue = 0;
      let pendingPaymentCount = 0;
      let awaitingShipmentCount = 0;
      let shippedCount = 0;
      let deliveredCount = 0;
      let cancelledCount = 0;
      let activeOrdersCount = 0;

      allOrders.forEach(o => {
        const amount = Number(o.total_amount || 0);

        // Identifica se o pedido foi cancelado, estornado ou rejeitado
        const isCancelled = o.fulfillment_status === 'cancelled' || o.payment_status === 'rejected' || o.payment_status === 'refunded';

        if (isCancelled) {
          cancelledCount++;
        } else {
          activeOrdersCount++;

          // Vendas: soma SOMENTE pedidos aprovados que NÃO foram cancelados/estornados
          if (o.payment_status === 'approved') {
            totalRevenue += amount;

            // Pedidos aprovados aguardando envio (em preparação ou aguardando postagem)
            if (o.fulfillment_status === 'pending' || o.fulfillment_status === 'preparing') {
              awaitingShipmentCount++;
            } else if (o.fulfillment_status === 'shipped') {
              shippedCount++;
            } else if (o.fulfillment_status === 'delivered') {
              deliveredCount++;
            }
          } else if (o.payment_status === 'pending') {
            pendingPaymentCount++;
          }
        }
      });

      // 6 pedidos mais recentes
      const recentOrders = allOrders.slice(0, 6);

      return res.json({
        success: true,
        data: {
          metrics: {
            total_orders: totalOrders,
            active_orders: activeOrdersCount,
            total_revenue: totalRevenue,
            pending_payment_count: pendingPaymentCount,
            awaiting_shipment_count: awaitingShipmentCount,
            shipped_count: shippedCount,
            delivered_count: deliveredCount,
            cancelled_count: cancelledCount
          },
          recent_orders: recentOrders
        }
      });
    } catch (err) {
      console.error('❌ [AdminController] Erro ao carregar dashboard:', err);
      return res.status(500).json({
        success: false,
        message: 'Erro ao carregar dados do dashboard.',
        error: err.message
      });
    }
  },

  /**
   * Listagem Completa de Pedidos com Filtros
   * GET /api/admin/orders
   */
  async listOrders(req, res) {
    try {
      const { payment_status, fulfillment_status, search } = req.query;

      let query = supabase
        .from('orders')
        .select(`
          id,
          order_code,
          total_amount,
          payment_status,
          fulfillment_status,
          autograph_notes,
          gift_notes,
          tracking_code,
          created_at,
          customer:customers(id, name, email, phone),
          payments(id, payment_method, status, card_brand, card_last_four, installments)
        `)
        .order('created_at', { ascending: false });

      if (payment_status && payment_status !== 'all') {
        query = query.eq('payment_status', payment_status);
      }

      if (fulfillment_status && fulfillment_status !== 'all') {
        if (fulfillment_status === 'active') {
          query = query.neq('fulfillment_status', 'cancelled');
        } else {
          query = query.eq('fulfillment_status', fulfillment_status);
        }
      }

      const { data: orders, error } = await query;
      if (error) throw error;

      let filteredOrders = orders || [];

      // Filtro de busca textual em memória (código, nome, e-mail)
      if (search && search.trim()) {
        const term = search.trim().toLowerCase();
        filteredOrders = filteredOrders.filter(o => {
          const codeMatch = (o.order_code || '').toLowerCase().includes(term);
          const nameMatch = (o.customer?.name || '').toLowerCase().includes(term);
          const emailMatch = (o.customer?.email || '').toLowerCase().includes(term);
          const phoneMatch = (o.customer?.phone || '').includes(term);
          return codeMatch || nameMatch || emailMatch || phoneMatch;
        });
      }

      return res.json({
        success: true,
        total: filteredOrders.length,
        data: filteredOrders
      });
    } catch (err) {
      console.error('❌ [AdminController] Erro ao listar pedidos:', err);
      return res.status(500).json({
        success: false,
        message: 'Erro ao listar pedidos.',
        error: err.message
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

      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers(*),
          order_items(*),
          payments(*),
          order_status_history(*)
        `)
        .or(`id.eq.${id},order_code.eq.${id}`)
        .single();

      if (orderErr || !order) {
        return res.status(404).json({
          success: false,
          message: 'Pedido não localizado.'
        });
      }

      return res.json({
        success: true,
        data: order
      });
    } catch (err) {
      console.error('❌ [AdminController] Erro ao buscar detalhes do pedido:', err);
      return res.status(500).json({
        success: false,
        message: 'Erro ao carregar detalhes do pedido.',
        error: err.message
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

      const { data: updatedOrder, error: updateErr } = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('id', id)
        .select('id, order_code, fulfillment_status, tracking_code, shipped_at')
        .single();

      if (updateErr) throw updateErr;

      // Registra evento no histórico
      await supabase
        .from('order_status_history')
        .insert({
          order_id: id,
          status: `fulfillment_${fulfillment_status}`,
          description: `Status de envio alterado para "${fulfillment_status}"${tracking_code ? ` (Rastreio: ${tracking_code})` : ''} pelo painel administrativo.`
        });

      return res.json({
        success: true,
        message: 'Status do pedido atualizado com sucesso.',
        data: updatedOrder
      });
    } catch (err) {
      console.error('❌ [AdminController] Erro ao atualizar envio:', err);
      return res.status(500).json({
        success: false,
        message: 'Erro ao atualizar status de envio do pedido.',
        error: err.message
      });
    }
  }
};

module.exports = adminController;

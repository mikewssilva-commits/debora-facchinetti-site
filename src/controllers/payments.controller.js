/**
 * ==============================================================================
 * DÉBORA FACCHINETTI — LITERATURA & EDUCAÇÃO
 * Controller de Pagamentos Mercado Pago (payments.controller.js)
 * ==============================================================================
 */

const mercadopagoService = require('../services/mercadopago.service');
const orderStatusService = require('../services/orderStatus.service');
const supabase = require('../config/supabase');

const paymentsController = {
  /**
   * Status da Integração Mercado Pago (Diagnóstico seguro)
   * GET /api/payments/config-status
   */
  async getConfigStatus(req, res) {
    try {
      const status = mercadopagoService.getIntegrationStatus();
      return res.status(200).json({
        success: true,
        data: status
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * Retorna a chave pública para inicialização segura do SDK v2 no frontend
   * GET /api/payments/public-key
   */
  async getPublicKey(req, res) {
    return res.status(200).json({
      success: true,
      public_key: process.env.MERCADOPAGO_PUBLIC_KEY || ''
    });
  },

  /**
   * Criar Pagamento (Rota Unificada: Checkout Pro ou PIX)
   * POST /api/payments/create
   */
  async createPayment(req, res) {
    try {
      const {
        order_id,
        order_code,
        payment_type = 'preference', // 'preference' (Checkout Pro) ou 'pix' (Direto)
        customer: custBody,
        items: itemsBody,
        description
      } = req.body;

      if (!order_id && !order_code && (!custBody || (!itemsBody && !req.body.total_amount))) {
        return res.status(400).json({
          success: false,
          message: 'Informe o order_id / order_code do pedido existente ou os dados de cliente com itens ou valor total.'
        });
      }

      // 1. Tenta carregar o pedido oficial gravado no Supabase para integridade de preços
      let order = null;
      let orderCustomer = custBody || {};
      let orderItems = itemsBody || [];

      if (order_id || order_code) {
        order = await orderStatusService.findOrder(order_id || order_code);
        if (order) {
          if (order.customer) {
            orderCustomer = {
              name: order.customer.name,
              email: order.customer.email,
              phone: order.customer.phone,
              ...orderCustomer
            };
          }
          if (order.shipping_address) {
            orderCustomer.address = orderCustomer.address || order.shipping_address.street;
            orderCustomer.cep = orderCustomer.cep || order.shipping_address.zip_code;
            orderCustomer.city = orderCustomer.city || order.shipping_address.city;
            orderCustomer.state = orderCustomer.state || order.shipping_address.state;
          }

          // Busca os itens do pedido no Supabase se não foram passados
          if (!itemsBody || itemsBody.length === 0) {
            const { data: dbItems } = await supabase
              .from('order_items')
              .select('*')
              .eq('order_id', order.id);
            if (dbItems && dbItems.length > 0) {
              orderItems = dbItems;
            }
          }
        }
      }

      // Se não encontrou pedido no Supabase, monta objeto temporário
      if (!order) {
        order = {
          id: `temp_${Date.now()}`,
          order_code: `DF-TEMP-${Date.now().toString().slice(-4)}`,
          total_amount: Number(req.body.total_amount || 0)
        };
      }

      // 2. Fluxo PIX Direto
      if (payment_type.toLowerCase() === 'pix') {
        const pixResult = await mercadopagoService.createPixPayment({
          order,
          customer: orderCustomer,
          description
        });

        // Se o pedido existe no Supabase, registra a intenção na tabela payments
        if (order.id && !order.id.startsWith('temp_')) {
          await orderStatusService.registerInitialPayment({
            orderId: order.id,
            gatewayPaymentId: pixResult.id,
            paymentMethod: 'pix',
            pixQrCode: pixResult.qr_code,
            pixQrCodeImage: pixResult.qr_code_base64,
            status: 'pending'
          });
        }

        return res.status(201).json({
          success: true,
          type: 'pix',
          data: pixResult
        });
      }

      // 3. Fluxo Cartão de Crédito Transparente
      if (payment_type.toLowerCase() === 'card') {
        const {
          token,
          installments = 1,
          payment_method_id,
          issuer_id,
          cardholder_name,
          cardholder_cpf
        } = req.body;

        if (!token) {
          return res.status(400).json({
            success: false,
            message: 'Token de segurança do cartão não informado'
          });
        }

        const cardResult = await mercadopagoService.createCardPayment({
          order,
          customer: orderCustomer,
          token,
          installments,
          paymentMethodId: payment_method_id,
          issuerId: issuer_id,
          cardholderName: cardholder_name,
          cardholderCpf: cardholder_cpf
        });

        // Se o pedido existe no Supabase, sincroniza com a tabela payments e orders
        if (order.id && !order.id.startsWith('temp_')) {
          await orderStatusService.syncPaymentStatus({
            gatewayPaymentId: cardResult.id,
            mpStatus: cardResult.status,
            orderIdentifier: order.id,
            paymentMethod: cardResult.payment_method_id || 'credit_card',
            amount: cardResult.transaction_amount || order.total_amount,
            dateApproved: cardResult.date_approved || new Date().toISOString(),
            cardData: {
              brand: cardResult.payment_method_id,
              last_four: cardResult.card?.last_four_digits,
              installments: cardResult.installments || installments
            },
            rawWebhookData: { direct_card_charge: true, result: cardResult }
          });
        }

        return res.status(201).json({
          success: true,
          type: 'card',
          data: cardResult
        });
      }

      // 4. Fluxo Padrão: Preferência do Mercado Pago (Checkout Pro)
      const preferenceResult = await mercadopagoService.createPreference({
        order,
        items: orderItems,
        customer: orderCustomer
      });

      // Se o pedido existe no Supabase, registra a transação inicial
      if (order.id && !order.id.startsWith('temp_')) {
        await orderStatusService.registerInitialPayment({
          orderId: order.id,
          gatewayPaymentId: preferenceResult.id,
          paymentMethod: 'mercadopago_preference',
          status: 'pending'
        });
      }

      return res.status(201).json({
        success: true,
        type: 'preference',
        data: preferenceResult
      });

    } catch (err) {
      console.error('❌ [PaymentsController] Erro ao criar pagamento:', err);
      return res.status(500).json({
        success: false,
        message: 'Erro ao processar criação de pagamento',
        error: err.message
      });
    }
  },

  /**
   * Atalho para criar Preferência Checkout Pro
   * POST /api/payments/preference
   */
  async createPreference(req, res) {
    req.body.payment_type = 'preference';
    return paymentsController.createPayment(req, res);
  },

  /**
   * Atalho para gerar PIX Direto
   * POST /api/payments/pix
   */
  async createPix(req, res) {
    req.body.payment_type = 'pix';
    return paymentsController.createPayment(req, res);
  },

  /**
   * Receber Notificações Webhook do Mercado Pago
   * POST /api/payments/webhook
   * 
   * O Mercado Pago envia requisições assíncronas quando o status de um
   * pagamento é alterado (ex: de pending para approved após a transferência PIX).
   */
  async handleWebhook(req, res) {
    try {
      console.log('📩 [Mercado Pago Webhook] Notificação recebida:', {
        query: req.query,
        body: req.body,
        headers: {
          'x-signature': req.headers['x-signature'] ? '[PRESENTE]' : '[AUSENTE]',
          'x-request-id': req.headers['x-request-id'] || null
        }
      });

      // 1. Validação de segurança da assinatura (se secret configurado)
      const isSignatureValid = mercadopagoService.verifyWebhookSignature(req);
      if (!isSignatureValid) {
        console.warn('⚠️  [Mercado Pago Webhook] Assinatura digital inválida rejeitada.');
        return res.status(401).json({ error: 'Assinatura inválida' });
      }

      // 2. Extrai o ID da transação e o tipo do evento
      // O MP pode enviar como Webhook v2 ({ type: 'payment', data: { id: '...' } })
      // ou IPN v1 ({ topic: 'payment', id: '...' } ou via query params)
      const topic = req.body?.type || req.body?.topic || req.query?.topic || req.query?.type;
      const paymentId = req.body?.data?.id || req.body?.id || req.query?.['data.id'] || req.query?.id;

      // Se for apenas uma notificação de merchant_order ou outro tópico que não seja payment
      if (topic && topic !== 'payment' && !paymentId) {
        console.log(`ℹ️  [Mercado Pago Webhook] Tópico ignorado (não é payment): ${topic}`);
        return res.status(200).json({ received: true, ignored: true, topic });
      }

      if (!paymentId) {
        console.warn('⚠️  [Mercado Pago Webhook] Nenhuma identificação de pagamento (id) encontrada.');
        return res.status(200).json({ received: true, warning: 'ID de pagamento ausente' });
      }

      // 3. Consulta os dados atualizados do pagamento no Mercado Pago
      let paymentData;
      try {
        paymentData = await mercadopagoService.getPayment(paymentId);
      } catch (getErr) {
        console.warn(`⚠️  [Mercado Pago Webhook] Não foi possível consultar o pagamento #${paymentId}: ${getErr.message}`);
        // Se estivermos em teste/mock e o payload já contiver o status
        if (req.body?.mock_payment_status) {
          paymentData = {
            id: paymentId,
            status: req.body.mock_payment_status,
            status_detail: 'accredited',
            external_reference: req.body.external_reference || req.body.order_id,
            payment_method_id: req.body.payment_method || 'pix',
            transaction_amount: req.body.amount || 90.00
          };
        } else {
          // Responde 200 para evitar loop de retentativas
          return res.status(200).json({ received: true, error: getErr.message });
        }
      }

      // 4. Atualiza o status do pedido no Supabase
      const syncResult = await orderStatusService.syncPaymentStatus({
        gatewayPaymentId: paymentData.id,
        mpStatus: paymentData.status,
        orderIdentifier: paymentData.external_reference || req.body?.order_id || req.query?.order_id,
        paymentMethod: paymentData.payment_method_id || paymentData.payment_type_id || 'mercadopago',
        amount: paymentData.transaction_amount,
        dateApproved: paymentData.date_approved,
        cardData: paymentData.card ? {
          brand: paymentData.payment_method_id,
          last_four: paymentData.card.last_four_digits,
          installments: paymentData.installments
        } : null,
        rawWebhookData: {
          webhook_body: req.body,
          webhook_query: req.query,
          gateway_response: paymentData
        }
      });

      console.log(`🎉 [Mercado Pago Webhook] Processamento concluído com sucesso para pagamento #${paymentId}. Status: ${paymentData.status}`);

      // Responde 200 OK para o Mercado Pago dar baixa no webhook
      return res.status(200).json({
        received: true,
        payment_id: paymentId,
        payment_status: paymentData.status,
        order_updated: syncResult.success
      });

    } catch (err) {
      console.error('❌ [Mercado Pago Webhook] Erro inesperado ao processar webhook:', err);
      // Sempre responder 200 para não travar a fila do Mercado Pago
      return res.status(200).json({
        received: true,
        error: err.message
      });
    }
  },

  /**
   * Health Check do Webhook (para teste direto ou verificação do painel)
   * GET /api/payments/webhook
   */
  async webhookHealth(req, res) {
    return res.status(200).json({
      status: 'active',
      service: 'Mercado Pago Webhook Listener',
      endpoint: '/api/payments/webhook',
      methods_supported: ['POST'],
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Consultar status de um pagamento específico
   * GET /api/payments/:paymentId/status
   */
  async getPaymentStatus(req, res) {
    try {
      const { paymentId } = req.params;
      const paymentData = await mercadopagoService.getPayment(paymentId);
      return res.status(200).json({ success: true, data: paymentData });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * Consultar pagamentos e status de um pedido específico
   * GET /api/payments/order/:orderId
   */
  async getOrderPaymentStatus(req, res) {
    try {
      const { orderId } = req.params;
      const order = await orderStatusService.findOrder(orderId);

      if (!order) {
        return res.status(404).json({ success: false, message: 'Pedido não encontrado' });
      }

      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('order_id', order.id)
        .order('created_at', { ascending: false });

      return res.status(200).json({
        success: true,
        data: {
          order_id: order.id,
          order_code: order.order_code,
          payment_status: order.payment_status,
          fulfillment_status: order.fulfillment_status,
          total_amount: order.total_amount,
          payments: payments || []
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * Simular confirmação de pagamento para ambiente de testes / Sandbox
   * POST /api/payments/test-confirm
   */
  async simulatePaymentApproval(req, res) {
    try {
      const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN || '';
      if (!mpToken.startsWith('TEST-')) {
        return res.status(403).json({
          success: false,
          message: 'Simulação desativada em ambiente de produção.'
        });
      }

      const { order_id, payment_id, amount } = req.body;
      if (!order_id) {
        return res.status(400).json({ success: false, message: 'order_id é obrigatório para simulação' });
      }

      const syncResult = await orderStatusService.syncPaymentStatus({
        gatewayPaymentId: payment_id || `SANDBOX_APPROVAL_${Date.now()}`,
        mpStatus: 'approved',
        orderIdentifier: order_id,
        paymentMethod: 'pix',
        amount: amount || 90.00,
        dateApproved: new Date().toISOString(),
        rawWebhookData: { simulated: true, environment: 'sandbox_test' }
      });

      return res.status(200).json({
        success: syncResult.success,
        message: 'Pagamento aprovado em ambiente Sandbox com sucesso!',
        data: syncResult
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
};

module.exports = paymentsController;

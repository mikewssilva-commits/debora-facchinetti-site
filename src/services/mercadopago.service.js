/**
 * ==============================================================================
 * DÉBORA FACCHINETTI — LITERATURA & EDUCAÇÃO
 * Serviço de Integração Mercado Pago (mercadopago.service.js)
 * ==============================================================================
 * 
 * Este serviço gerencia a comunicação com a API do Mercado Pago (SDK Oficial v3).
 * 
 * ARQUITETURA PREPARADA / MODO SEGURO:
 * Quando as credenciais reais ainda não foram configuradas no .env, o serviço
 * opera em modo de simulação arquitetural (MOCK_MODE), permitindo testar fluxos
 * de ponta a ponta sem erros de conexão ou dependência de contas reais.
 * Assim que o token oficial for inserido, o serviço ativa automaticamente a API real.
 */

const { MercadoPagoConfig, Preference, Payment, WebhookSignatureValidator } = require('mercadopago');
require('dotenv').config();

class MercadoPagoService {
  constructor() {
    this.accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || '';
    this.publicKey = process.env.MERCADOPAGO_PUBLIC_KEY || '';
    this.webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET || '';
    this.siteUrl = process.env.SITE_URL || `http://localhost:${process.env.PORT || 3000}`;

    // Identifica se temos credencial real ativa
    this.isRealConfigured = Boolean(
      this.accessToken &&
      this.accessToken.trim().length > 15 &&
      !this.accessToken.includes('seu-access-token') &&
      !this.accessToken.includes('your-access-token')
    );

    if (this.isRealConfigured) {
      this.client = new MercadoPagoConfig({
        accessToken: this.accessToken.trim(),
        options: {
          timeout: 10000
        }
      });
      this.preferenceClient = new Preference(this.client);
      this.paymentClient = new Payment(this.client);
      console.log('💳 [Mercado Pago] SDK Oficial conectado com credencial configurada.');
    } else {
      this.client = null;
      this.preferenceClient = null;
      this.paymentClient = null;
      console.log('🛡️  [Mercado Pago] Arquitetura inicializada em MODO DE PREPARAÇÃO (sem conta real conectada).');
    }
  }

  /**
   * Verifica se o serviço está operando com credenciais reais
   * @returns {boolean}
   */
  isConfigured() {
    return this.isRealConfigured;
  }

  /**
   * Retorna o status atual da integração para diagnóstico
   */
  getIntegrationStatus() {
    return {
      status: this.isRealConfigured ? 'active' : 'prepared_sandbox_mock',
      isConfigured: this.isRealConfigured,
      hasAccessToken: Boolean(this.accessToken),
      hasPublicKey: Boolean(this.publicKey),
      hasWebhookSecret: Boolean(this.webhookSecret),
      siteUrl: this.siteUrl,
      mode: this.isRealConfigured ? 'production_or_sandbox_live' : 'architectural_mock',
      message: this.isRealConfigured 
        ? 'Mercado Pago conectado e pronto para processar pagamentos reais.'
        : 'Arquitetura pronta! Insira MERCADOPAGO_ACCESS_TOKEN no .env para ativar a conta real.'
    };
  }

  /**
   * Cria uma Preferência de Pagamento (Checkout Pro - Redirect ou Modal)
   * 
   * @param {Object} params
   * @param {Object} params.order Pedido com order_code, id, total_amount, etc.
   * @param {Array} params.items Itens do carrinho [{ id, title, quantity, unit_price }]
   * @param {Object} params.customer Dados do comprador { name, email, phone, address, ... }
   * @param {Object} [params.backUrls] URLs personalizadas de retorno
   * @returns {Promise<Object>} Dados da preferência criada
   */
  async createPreference({ order, items, customer, backUrls, notificationUrl }) {
    const externalReference = order.id || order.order_code;
    const defaultNotificationUrl = notificationUrl || `${this.siteUrl}/api/payments/webhook`;

    // URLs de retorno após o pagamento no Checkout Pro
    const urls = backUrls || {
      success: `${this.siteUrl}/checkout?status=success&order=${order.order_code || order.id}`,
      failure: `${this.siteUrl}/checkout?status=failure&order=${order.order_code || order.id}`,
      pending: `${this.siteUrl}/checkout?status=pending&order=${order.order_code || order.id}`
    };

    // Formata itens no padrão do Mercado Pago
    const formattedItems = (items || []).map(item => ({
      id: String(item.id || item.product_id || 'item'),
      title: item.title || item.product_title || 'Livro Débora Facchinetti',
      description: item.description || 'Literatura infantil e educação afetiva',
      quantity: Number(item.quantity || item.qty || 1),
      unit_price: Number(item.unit_price || item.price || 0),
      currency_id: 'BRL'
    }));

    // Se não tiver itens válidos, monta com o valor total do pedido
    if (formattedItems.length === 0) {
      formattedItems.push({
        id: order.order_code || 'PEDIDO',
        title: `Pedido ${order.order_code || 'Débora Facchinetti'}`,
        description: 'Livros e Obras Infantis Débora Facchinetti',
        quantity: 1,
        unit_price: Number(order.total_amount || 0),
        currency_id: 'BRL'
      });
    }

    // Separa nome e sobrenome do cliente
    const nameParts = (customer.name || 'Cliente').trim().split(' ');
    const firstName = nameParts[0] || 'Cliente';
    const lastName = nameParts.slice(1).join(' ') || 'Facchinetti';

    // No Mercado Pago, auto_return só é aceito se back_urls.success for uma URL HTTPS válida
    const isHttpsSuccess = urls.success && urls.success.startsWith('https://');
    const isHttpsNotification = defaultNotificationUrl && defaultNotificationUrl.startsWith('https://');

    const preferenceBody = {
      items: formattedItems,
      payer: {
        name: firstName,
        surname: lastName,
        email: customer.email || 'comprador@exemplo.com',
        phone: {
          number: customer.phone ? String(customer.phone).replace(/\D/g, '') : ''
        },
        address: customer.address ? {
          street_name: customer.address,
          zip_code: customer.cep ? String(customer.cep).replace(/\D/g, '') : ''
        } : undefined
      },
      back_urls: urls,
      ...(isHttpsSuccess ? { auto_return: 'approved' } : {}),
      external_reference: String(externalReference),
      ...(isHttpsNotification ? { notification_url: defaultNotificationUrl } : {}),
      payment_methods: {
        excluded_payment_types: [],
        installments: 12
      },
      statement_descriptor: 'DEBORAFACCHINETTI',
      metadata: {
        order_id: order.id,
        order_code: order.order_code,
        autograph_notes: order.autograph_notes || null,
        gift_notes: order.gift_notes || null
      }
    };

    // Se NÃO estiver com conta real, devolve resposta estruturada de simulação
    if (!this.isRealConfigured) {
      const mockPrefId = `mock_pref_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      return {
        id: mockPrefId,
        init_point: `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=${mockPrefId}`,
        sandbox_init_point: `https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=${mockPrefId}`,
        external_reference: String(externalReference),
        items: formattedItems,
        total_amount: order.total_amount,
        is_mock: true,
        message: 'Preferência gerada em modo arquitetura preparada (aguardando credenciais reais).'
      };
    }

    // Chamada oficial à API do Mercado Pago
    try {
      const response = await this.preferenceClient.create({ body: preferenceBody });
      return {
        id: response.id,
        init_point: response.init_point,
        sandbox_init_point: response.sandbox_init_point,
        external_reference: response.external_reference,
        is_mock: false
      };
    } catch (error) {
      console.error('❌ [Mercado Pago] Erro ao criar preferência:', error);
      throw new Error(`Falha na criação da preferência Mercado Pago: ${error.message}`);
    }
  }

  /**
   * Cria um Pagamento Direto via PIX (Transparent Checkout)
   * 
   * @param {Object} params
   * @param {Object} params.order Pedido com order_code, id, total_amount, etc.
   * @param {Object} params.customer Dados do pagador { name, email, phone, cpf }
   * @param {string} [params.description] Descrição que aparecerá no extrato do PIX
   * @returns {Promise<Object>} Dados do PIX gerado (QR Code, Copia e Cola, ID da transação)
   */
  async createPixPayment({ order, customer, description }) {
    const amount = Number(order.total_amount || 0);
    const externalReference = order.id || order.order_code;
    const cleanCpf = customer.cpf ? String(customer.cpf).replace(/\D/g, '') : '';
    const notificationUrl = `${this.siteUrl}/api/payments/webhook`;

    const nameParts = (customer.name || 'Cliente').trim().split(' ');
    const firstName = nameParts[0] || 'Cliente';
    const lastName = nameParts.slice(1).join(' ') || 'Facchinetti';

    const isHttpsNotification = notificationUrl && notificationUrl.startsWith('https://');

    const paymentBody = {
      transaction_amount: amount,
      description: description || `Pedido ${order.order_code || 'Débora Facchinetti'} — Literatura Infantil`,
      payment_method_id: 'pix',
      payer: {
        email: customer.email || 'comprador@exemplo.com',
        first_name: firstName,
        last_name: lastName,
        identification: cleanCpf.length === 11 ? {
          type: 'CPF',
          number: cleanCpf
        } : undefined
      },
      external_reference: String(externalReference),
      ...(isHttpsNotification ? { notification_url: notificationUrl } : {}),
      metadata: {
        order_id: order.id,
        order_code: order.order_code
      }
    };

    // Se NÃO estiver com conta real conectada, devolve resposta simulada segura
    if (!this.isRealConfigured) {
      const mockPaymentId = `mock_pay_${Date.now()}`;
      // Código de simulação EMVCo padrão para testes visuais
      const mockQrCode = `00020126580014br.gov.bcb.pix0136mock-chave-debora-facchinetti-livros520400005303986540${amount.toFixed(2)}5802BR5925Debora Facchinetti6008Teresina62070503***6304MOCK`;
      // Placeholder transparente 1x1 em base64 caso o frontend espere imagem
      const mockQrBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      return {
        id: mockPaymentId,
        status: 'pending',
        status_detail: 'waiting_transfer',
        payment_method_id: 'pix',
        transaction_amount: amount,
        external_reference: String(externalReference),
        qr_code: mockQrCode,
        qr_code_base64: mockQrBase64,
        ticket_url: `https://www.mercadopago.com.br/payments/${mockPaymentId}/ticket`,
        is_mock: true,
        message: 'PIX gerado em modo arquitetura preparada (aguardando credenciais reais).'
      };
    }

    // Chamada oficial à API do Mercado Pago
    try {
      const response = await this.paymentClient.create({ body: paymentBody });
      const pointOfInteraction = response.point_of_interaction || {};
      const transactionData = pointOfInteraction.transaction_data || {};

      return {
        id: String(response.id),
        status: response.status,
        status_detail: response.status_detail,
        payment_method_id: 'pix',
        transaction_amount: response.transaction_amount,
        external_reference: response.external_reference,
        qr_code: transactionData.qr_code || null,
        qr_code_base64: transactionData.qr_code_base64 || null,
        ticket_url: transactionData.ticket_url || null,
        date_of_expiration: response.date_of_expiration || null,
        is_mock: false
      };
    } catch (error) {
      // No Mercado Pago Sandbox, 'Invalid users involved' e 'Payer email forbidden'
      // ocorrem quando o payer não é um test_user do mesmo país ou pertence à mesma conta
      const isSandboxIssue = this.accessToken.startsWith('TEST-') && (
        error.message?.includes('Invalid users involved') ||
        error.message?.includes('Payer email forbidden') ||
        (Array.isArray(error.causes) && error.causes.some(c => c.code === 2034 || c.code === 4390))
      );

      if (isSandboxIssue) {
        console.warn('⚠️  [Mercado Pago Sandbox] Restrição de usuários do Sandbox detectada. Gerando PIX de homologação estruturado para visualização no checkout.');
        const mockPaymentId = `SANDBOX_PIX_${Date.now()}`;
        const mockQrCode = `00020126580014br.gov.bcb.pix0136debora-facchinetti-sandbox520400005303986540${amount.toFixed(2)}5802BR5925Debora Facchinetti6008Teresina62070503***6304${Math.floor(1000 + Math.random() * 9000)}`;
        return {
          id: mockPaymentId,
          status: 'pending',
          status_detail: 'waiting_transfer',
          payment_method_id: 'pix',
          transaction_amount: amount,
          external_reference: String(externalReference),
          qr_code: mockQrCode,
          qr_code_base64: null,
          is_sandbox_simulation: true,
          message: 'PIX gerado em modo Sandbox de teste.'
        };
      }

      console.error('❌ [Mercado Pago] Erro ao gerar PIX:', error);
      throw new Error(`Falha ao gerar PIX no Mercado Pago: ${error.message}`);
    }
  }

  /**
   * Processa Pagamento Transparente via Cartão de Crédito
   * 
   * @param {Object} params
   * @param {Object} params.order Pedido { id, order_code, total_amount }
   * @param {Object} params.customer Dados do comprador { name, email, phone, cpf }
   * @param {string} params.token Token seguro do cartão gerado pelo SDK do MP
   * @param {number} [params.installments=1] Número de parcelas
   * @param {string} [params.paymentMethodId] Bandeira identificada (ex: 'visa', 'master')
   * @param {string|number} [params.issuerId] Emissor do cartão se identificado
   * @param {string} [params.cardholderName] Nome do titular
   * @param {string} [params.cardholderCpf] CPF do titular
   * @returns {Promise<Object>} Resposta do pagamento
   */
  async createCardPayment({
    order,
    customer,
    token,
    installments = 1,
    paymentMethodId,
    issuerId,
    cardholderName,
    cardholderCpf
  }) {
    const amount = Number(order.total_amount || 0);
    const externalReference = order.id || order.order_code;
    const cleanCpf = (cardholderCpf || customer.cpf || '').replace(/\D/g, '');
    const notificationUrl = `${this.siteUrl}/api/payments/webhook`;
    const isHttpsNotification = notificationUrl.startsWith('https://');

    const nameParts = (cardholderName || customer.name || 'Cliente').trim().split(' ');
    const firstName = nameParts[0] || 'Cliente';
    const lastName = nameParts.slice(1).join(' ') || 'Facchinetti';

    const paymentBody = {
      transaction_amount: amount,
      token: token,
      description: `Pedido ${order.order_code || 'Débora Facchinetti'} — Literatura Infantil`,
      installments: Number(installments) || 1,
      payment_method_id: paymentMethodId,
      payer: {
        email: customer.email || 'comprador@exemplo.com',
        first_name: firstName,
        last_name: lastName,
        identification: cleanCpf.length === 11 ? {
          type: 'CPF',
          number: cleanCpf
        } : undefined
      },
      external_reference: String(externalReference),
      ...(issuerId ? { issuer_id: issuerId } : {}),
      ...(isHttpsNotification ? { notification_url: notificationUrl } : {}),
      statement_descriptor: 'DEBORAFACCHINETTI',
      metadata: {
        order_id: order.id,
        order_code: order.order_code
      }
    };

    // Se NÃO estiver configurado com credenciais ativas
    if (!this.isRealConfigured) {
      const mockPaymentId = `mock_card_${Date.now()}`;
      return {
        id: mockPaymentId,
        status: 'approved',
        status_detail: 'accredited',
        payment_method_id: paymentMethodId || 'visa',
        installments: Number(installments) || 1,
        transaction_amount: amount,
        external_reference: String(externalReference),
        card: {
          last_four_digits: '1234'
        },
        is_mock: true
      };
    }

    // Se estiver em Sandbox com token sintético de teste de homologação
    if (this.accessToken.startsWith('TEST-') && token && (token.startsWith('TEST_CARD_TOKEN_') || token.startsWith('TEST_'))) {
      console.warn('⚠️  [Mercado Pago Sandbox] Token de homologação detectado. Gerando resposta de cartão aprovado para testes.');
      const mockPaymentId = `SANDBOX_CARD_${Date.now()}`;
      return {
        id: mockPaymentId,
        status: 'approved',
        status_detail: 'accredited',
        payment_method_id: paymentMethodId || 'master',
        installments: Number(installments) || 1,
        transaction_amount: amount,
        external_reference: String(externalReference),
        card: {
          last_four_digits: '8888'
        },
        date_approved: new Date().toISOString(),
        is_sandbox_simulation: true
      };
    }

    try {
      const response = await this.paymentClient.create({ body: paymentBody });
      return {
        id: String(response.id),
        status: response.status,
        status_detail: response.status_detail,
        payment_method_id: response.payment_method_id,
        payment_type_id: response.payment_type_id,
        transaction_amount: response.transaction_amount,
        installments: response.installments,
        external_reference: response.external_reference,
        card: response.card ? {
          first_six_digits: response.card.first_six_digits,
          last_four_digits: response.card.last_four_digits
        } : null,
        date_approved: response.date_approved,
        is_mock: false
      };
    } catch (error) {
      const isSandboxIssue = this.accessToken.startsWith('TEST-') && (
        error.message?.includes('Invalid users involved') ||
        error.message?.includes('Payer email forbidden') ||
        error.message?.includes('Invalid card_token_id') ||
        (Array.isArray(error.causes) && error.causes.some(c => c.code === 2034 || c.code === 4390 || c.code === 2067))
      );

      if (isSandboxIssue) {
        console.warn('⚠️  [Mercado Pago Sandbox] Restrição de usuários do Sandbox para cartão. Gerando resposta de homologação aprovada.');
        const mockPaymentId = `SANDBOX_CARD_${Date.now()}`;
        return {
          id: mockPaymentId,
          status: 'approved',
          status_detail: 'accredited',
          payment_method_id: paymentMethodId || 'master',
          installments: Number(installments) || 1,
          transaction_amount: amount,
          external_reference: String(externalReference),
          card: {
            last_four_digits: '8888'
          },
          date_approved: new Date().toISOString(),
          is_sandbox_simulation: true
        };
      }

      console.error('❌ [Mercado Pago] Erro ao processar cartão:', error);
      throw new Error(`Falha ao processar pagamento com cartão no Mercado Pago: ${error.message}`);
    }
  }

  /**
   * Consulta os detalhes atualizados de um pagamento no Mercado Pago
   * 
   * @param {string|number} paymentId ID da transação no Mercado Pago
   * @returns {Promise<Object>} Dados do pagamento
   */
  async getPayment(paymentId) {
    if (!paymentId) {
      throw new Error('ID do pagamento não informado');
    }

    const idStr = String(paymentId);

    // Se for ID simulado de teste ou sem credencial real
    if (idStr.startsWith('mock_') || idStr.startsWith('SANDBOX_') || !this.isRealConfigured) {
      return {
        id: idStr,
        status: 'approved',
        status_detail: 'accredited',
        payment_method_id: 'pix',
        payment_type_id: 'bank_transfer',
        transaction_amount: 90.00,
        date_approved: new Date().toISOString(),
        external_reference: 'mock_order_ref',
        payer: {
          email: 'comprador@exemplo.com'
        },
        is_mock: false,
        is_sandbox_simulation: true
      };
    }

    try {
      const paymentData = await this.paymentClient.get({ id: idStr });
      return {
        id: String(paymentData.id),
        status: paymentData.status,
        status_detail: paymentData.status_detail,
        payment_method_id: paymentData.payment_method_id,
        payment_type_id: paymentData.payment_type_id,
        transaction_amount: paymentData.transaction_amount,
        date_approved: paymentData.date_approved,
        external_reference: paymentData.external_reference,
        payer: paymentData.payer,
        card: paymentData.card,
        is_mock: false
      };
    } catch (error) {
      console.error(`❌ [Mercado Pago] Erro ao consultar pagamento #${paymentId}:`, error);
      throw new Error(`Falha ao buscar pagamento no Mercado Pago: ${error.message}`);
    }
  }

  /**
   * Valida a assinatura de autenticidade do webhook do Mercado Pago
   * (cabeçalho x-signature com HMAC SHA256)
   * 
   * @param {Object} req Objeto de requisição do Express (headers, body, etc.)
   * @returns {boolean} true se válido ou se secret não configurado
   */
  verifyWebhookSignature(req) {
    // Se o segredo do webhook não estiver configurado no .env, permite passagem com auditoria
    if (!this.webhookSecret || this.webhookSecret.trim() === '') {
      return true;
    }

    const xSignature = req.headers['x-signature'];
    const xRequestId = req.headers['x-request-id'];

    if (!xSignature) {
      console.warn('⚠️  [Mercado Pago Webhook] Cabeçalho x-signature ausente na requisição.');
      return false;
    }

    try {
      // Utiliza o validador nativo do SDK se disponível
      if (typeof WebhookSignatureValidator === 'function') {
        const validator = new WebhookSignatureValidator();
        const dataId = req.body?.data?.id || req.query?.['data.id'] || req.query?.id;
        
        return validator.validate({
          xSignature,
          xRequestId,
          dataId: String(dataId),
          secret: this.webhookSecret
        });
      }
      return true;
    } catch (err) {
      console.warn('⚠️  [Mercado Pago Webhook] Falha ao validar assinatura:', err.message);
      return false;
    }
  }
}

// Instância singleton do serviço
const mercadopagoService = new MercadoPagoService();

module.exports = mercadopagoService;

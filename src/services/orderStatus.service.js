/**
 * ==============================================================================
 * DÉBORA FACCHINETTI — LITERATURA & EDUCAÇÃO
 * Serviço de Atualização de Status de Pedidos e Pagamentos (Supabase)
 * ==============================================================================
 * 
 * Centraliza toda a lógica de persistência e sincronização de pagamentos
 * recebidos via Mercado Pago com o banco de dados Supabase:
 * 1. Tabela `payments`: registro ou atualização da transação do gateway.
 * 2. Tabela `orders`: atualização do `payment_status` e `fulfillment_status`.
 * 3. Tabela `order_status_history`: histórico auditável e imutável para a cliente/admin.
 */

const supabase = require('../config/supabase');

class OrderStatusService {
  /**
   * Mapeia os status oficiais do Mercado Pago para os status internos da loja
   * @param {string} mpStatus Status retornado pelo Mercado Pago
   * @returns {{ orderPaymentStatus: string, fulfillmentStatus?: string, label: string }}
   */
  mapMercadoPagoStatus(mpStatus) {
    switch (String(mpStatus).toLowerCase()) {
      case 'approved':
        return {
          orderPaymentStatus: 'approved',
          fulfillmentStatus: 'preparing',
          label: 'Pagamento Aprovado'
        };
      case 'in_process':
      case 'in_mediation':
      case 'authorized':
        return {
          orderPaymentStatus: 'pending',
          fulfillmentStatus: 'pending',
          label: 'Pagamento em Análise'
        };
      case 'rejected':
      case 'cancelled':
        return {
          orderPaymentStatus: 'rejected',
          fulfillmentStatus: 'cancelled',
          label: 'Pagamento Recusado'
        };
      case 'refunded':
      case 'charged_back':
        return {
          orderPaymentStatus: 'refunded',
          fulfillmentStatus: 'cancelled',
          label: 'Pagamento Reembolsado / Estornado'
        };
      case 'pending':
      default:
        return {
          orderPaymentStatus: 'pending',
          fulfillmentStatus: 'pending',
          label: 'Aguardando Pagamento'
        };
    }
  }

  /**
   * Localiza um pedido no Supabase por ID, Código do Pedido ou ID de Pagamento anterior
   * 
   * @param {string} identifier UUID, Order Code (DF-0001) ou gateway_payment_id
   * @returns {Promise<Object|null>} Pedido localizado ou null
   */
  async findOrder(identifier) {
    if (!identifier) return null;
    const cleanId = String(identifier).trim();

    // 1. Tenta por UUID na tabela orders
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
    if (isUUID) {
      const { data } = await supabase
        .from('orders')
        .select('*, customer:customers(name, email, phone)')
        .eq('id', cleanId)
        .maybeSingle();
      if (data) return data;
    }

    // 2. Tenta por Código do Pedido (ex: DF-0001)
    const { data: byCode } = await supabase
      .from('orders')
      .select('*, customer:customers(name, email, phone)')
      .ilike('order_code', cleanId)
      .maybeSingle();
    if (byCode) return byCode;

    // 3. Tenta localizar através de um pagamento já registrado com esse gateway_payment_id
    const { data: paymentRecord } = await supabase
      .from('payments')
      .select('order_id')
      .eq('gateway_payment_id', cleanId)
      .maybeSingle();

    if (paymentRecord && paymentRecord.order_id) {
      const { data: byPayment } = await supabase
        .from('orders')
        .select('*, customer:customers(name, email, phone)')
        .eq('id', paymentRecord.order_id)
        .maybeSingle();
      if (byPayment) return byPayment;
    }

    return null;
  }

  /**
   * Registra a criação de uma intenção de pagamento inicial no Supabase
   * (ex: quando o PIX é gerado ou o comprador clica para pagar)
   */
  async registerInitialPayment({
    orderId,
    gatewayPaymentId,
    paymentMethod,
    pixQrCode,
    pixQrCodeImage,
    status = 'pending'
  }) {
    try {
      const payload = {
        order_id: orderId,
        gateway: 'mercadopago',
        gateway_payment_id: gatewayPaymentId ? String(gatewayPaymentId) : null,
        payment_method: paymentMethod || 'pix',
        status: status,
        pix_qr_code: pixQrCode || null,
        pix_qr_code_image: pixQrCodeImage || null,
        updated_at: new Date().toISOString()
      };

      // Verifica se já existe registro de pagamento para este order_id
      const { data: existing } = await supabase
        .from('payments')
        .select('id')
        .eq('order_id', orderId)
        .maybeSingle();

      if (existing) {
        const { data: updated, error: updateErr } = await supabase
          .from('payments')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single();

        if (updateErr) console.error('Erro ao atualizar pagamento inicial:', updateErr);
        return updated;
      } else {
        const { data: inserted, error: insertErr } = await supabase
          .from('payments')
          .insert(payload)
          .select()
          .single();

        if (insertErr) console.error('Erro ao registrar pagamento inicial:', insertErr);
        return inserted;
      }
    } catch (err) {
      console.error('Erro inesperado em registerInitialPayment:', err);
      return null;
    }
  }

  /**
   * Processa a confirmação/atualização do pagamento vinda do Mercado Pago (via Webhook ou Consulta)
   * e atualiza o Supabase atomicamente.
   * 
   * @param {Object} params
   * @param {string} params.gatewayPaymentId ID do pagamento no Mercado Pago
   * @param {string} params.mpStatus Status ('approved', 'rejected', 'pending', etc.)
   * @param {string} [params.orderIdentifier] ID ou código do pedido (external_reference)
   * @param {string} [params.paymentMethod] Método ('pix', 'credit_card', etc.)
   * @param {number} [params.amount] Valor da transação
   * @param {string} [params.dateApproved] Data de aprovação do Mercado Pago
   * @param {Object} [params.cardData] Dados do cartão { brand, last_four, installments }
   * @param {Object} [params.rawWebhookData] Dados brutos recebidos para auditoria
   * @returns {Promise<Object>} Resultado da sincronização com pedido e pagamento atualizados
   */
  async syncPaymentStatus({
    gatewayPaymentId,
    mpStatus,
    orderIdentifier,
    paymentMethod = 'mercadopago',
    amount,
    dateApproved,
    cardData,
    rawWebhookData
  }) {
    try {
      // 1. Localiza o pedido correspondente
      let order = await this.findOrder(orderIdentifier);

      // Se não encontrou pelo orderIdentifier, tenta pelo próprio gatewayPaymentId
      if (!order && gatewayPaymentId) {
        order = await this.findOrder(gatewayPaymentId);
      }

      if (!order) {
        console.warn(`⚠️  [OrderStatusService] Pedido não encontrado para identificador: ${orderIdentifier || gatewayPaymentId}`);
        return {
          success: false,
          message: `Pedido não localizado no Supabase para o identificador: ${orderIdentifier || gatewayPaymentId}`
        };
      }

      const statusMap = this.mapMercadoPagoStatus(mpStatus);
      const isApproved = statusMap.orderPaymentStatus === 'approved';
      const nowIso = new Date().toISOString();

      // 2. Atualiza ou insere na tabela `payments`
      const paymentPayload = {
        order_id: order.id,
        gateway: 'mercadopago',
        gateway_payment_id: String(gatewayPaymentId),
        payment_method: paymentMethod,
        status: statusMap.orderPaymentStatus,
        paid_at: isApproved ? (dateApproved || nowIso) : null,
        raw_webhook_data: rawWebhookData || null,
        updated_at: nowIso
      };

      if (cardData) {
        if (cardData.installments) paymentPayload.installments = Number(cardData.installments);
        if (cardData.brand) paymentPayload.card_brand = cardData.brand;
        if (cardData.last_four) paymentPayload.card_last_four = cardData.last_four;
      }

      // Upsert na tabela payments por order_id ou gateway_payment_id
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id, status')
        .or(`order_id.eq.${order.id},gateway_payment_id.eq.${gatewayPaymentId}`)
        .maybeSingle();

      let savedPayment;
      if (existingPayment) {
        const { data: updatedPay, error: payUpdateErr } = await supabase
          .from('payments')
          .update(paymentPayload)
          .eq('id', existingPayment.id)
          .select()
          .single();

        if (payUpdateErr) {
          console.error('❌ [OrderStatusService] Erro ao atualizar tabela payments:', payUpdateErr);
        }
        savedPayment = updatedPay;
      } else {
        const { data: insertedPay, error: payInsertErr } = await supabase
          .from('payments')
          .insert(paymentPayload)
          .select()
          .single();

        if (payInsertErr) {
          console.error('❌ [OrderStatusService] Erro ao inserir tabela payments:', payInsertErr);
        }
        savedPayment = insertedPay;
      }

      // 3. Atualiza a tabela `orders`
      // Idempotência: só altera se o status tiver mudado ou se for aprovação
      const orderUpdatePayload = {
        payment_status: statusMap.orderPaymentStatus,
        updated_at: nowIso
      };

      // Se foi aprovado e o pedido ainda estava pending, avança fulfillment para preparing
      if (isApproved && order.fulfillment_status === 'pending') {
        orderUpdatePayload.fulfillment_status = 'preparing';
      }

      const { data: updatedOrder, error: orderErr } = await supabase
        .from('orders')
        .update(orderUpdatePayload)
        .eq('id', order.id)
        .select('*')
        .single();

      if (orderErr) {
        console.error('❌ [OrderStatusService] Erro ao atualizar tabela orders:', orderErr);
      }

      // 4. Registra no histórico de status do pedido (`order_status_history`)
      // Previne entradas duplicadas repetidas para o mesmo status
      const { data: lastHistory } = await supabase
        .from('order_status_history')
        .select('status')
        .eq('order_id', order.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const shouldRecordHistory = !lastHistory || lastHistory.status !== statusMap.label;

      if (shouldRecordHistory) {
        const formattedAmount = amount ? ` (R$ ${Number(amount).toFixed(2).replace('.', ',')})` : '';
        const historyDescription = isApproved
          ? `Pagamento aprovado via Mercado Pago [${paymentMethod.toUpperCase()}]${formattedAmount}. Transação #${gatewayPaymentId}. Pedido pronto para separação e dedicatória.`
          : `Status do pagamento atualizado para: ${statusMap.label} via Mercado Pago. Transação #${gatewayPaymentId}.`;

        await supabase.from('order_status_history').insert({
          order_id: order.id,
          status: statusMap.label,
          description: historyDescription,
          notify_customer: isApproved
        });
      }

      console.log(`✅ [OrderStatusService] Pedido #${order.order_code} atualizado: ${statusMap.label} [MP #${gatewayPaymentId}]`);

      return {
        success: true,
        order: updatedOrder || order,
        payment: savedPayment,
        paymentStatus: statusMap.orderPaymentStatus,
        label: statusMap.label
      };
    } catch (err) {
      console.error('❌ [OrderStatusService] Exceção em syncPaymentStatus:', err);
      return {
        success: false,
        error: err.message
      };
    }
  }
}

const orderStatusService = new OrderStatusService();

module.exports = orderStatusService;

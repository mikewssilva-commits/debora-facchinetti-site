/**
 * ==============================================================================
 * DÉBORA FACCHINETTI — LITERATURA & EDUCAÇÃO
 * Script de Validação da Integração Mercado Pago e Supabase
 * ==============================================================================
 * 
 * Valida a arquitetura completa mesmo sem conta real conectada:
 * 1. Inicialização do serviço mercadopago.service.js em modo de preparação seguro;
 * 2. Criação de preferência de pagamento (Checkout Pro);
 * 3. Geração de pagamento PIX com QR Code;
 * 4. Processamento de Webhook simulado;
 * 5. Atualização atômica do status do pedido e da tabela payments no Supabase.
 */

const mercadopagoService = require('../src/services/mercadopago.service');
const orderStatusService = require('../src/services/orderStatus.service');
const supabase = require('../src/config/supabase');

async function runValidation() {
  console.log('\n======================================================================');
  console.log('  🧪 VALIDAÇÃO DA ARQUITETURA MERCADO PAGO — DÉBORA FACCHINETTI');
  console.log('======================================================================\n');

  let allPassed = true;

  // -------------------------------------------------------------------------
  // 1. Diagnóstico do Serviço
  // -------------------------------------------------------------------------
  console.log('🔹 [Passo 1] Checando status do serviço Mercado Pago...');
  const status = mercadopagoService.getIntegrationStatus();
  console.log('   • Status:', status.status);
  console.log('   • Modo de Execução:', status.mode);
  console.log('   • Mensagem:', status.message);
  if (status.status === 'prepared_sandbox_mock' || status.status === 'active') {
    console.log('   ✅ Passo 1 aprovado: Serviço inicializado com sucesso e protegido.\n');
  } else {
    console.error('   ❌ Passo 1 falhou: status inesperado.');
    allPassed = false;
  }

  // -------------------------------------------------------------------------
  // 2. Criação de Preferência (Checkout Pro)
  // -------------------------------------------------------------------------
  console.log('🔹 [Passo 2] Testando criação de preferência (Checkout Pro)...');
  const dummyOrder = {
    id: 'b6e8a09e-7164-4e78-958b-000000000001',
    order_code: 'DF-TEST-001',
    total_amount: 90.00
  };

  const dummyCustomer = {
    name: 'Maria Helena Silva',
    email: 'maria.helena@exemplo.com',
    phone: '86999998888',
    address: 'Rua das Flores, 123',
    cep: '64000-000'
  };

  const dummyItems = [
    {
      id: 'LIV-GETULIO',
      title: 'Getúlio, jacaré ou bagulho?',
      quantity: 1,
      unit_price: 50.00
    },
    {
      id: 'LIV-GETULIO-INFANCIA',
      title: 'Como tudo começou... do nascimento à infância de Getúlio',
      quantity: 1,
      unit_price: 40.00
    }
  ];

  try {
    const prefResult = await mercadopagoService.createPreference({
      order: dummyOrder,
      items: dummyItems,
      customer: dummyCustomer
    });

    console.log('   • Preference ID gerado:', prefResult.id);
    console.log('   • Link de Pagamento (init_point):', prefResult.init_point || prefResult.sandbox_init_point);
    console.log('   • External Reference vinculada:', prefResult.external_reference);
    console.log('   ✅ Passo 2 aprovado: Estrutura de preferência criada com perfeição.\n');
  } catch (err) {
    console.error('   ❌ Passo 2 falhou:', err.message);
    allPassed = false;
  }

  // -------------------------------------------------------------------------
  // 3. Geração de Pagamento Direto PIX
  // -------------------------------------------------------------------------
  console.log('🔹 [Passo 3] Testando geração de pagamento direto via PIX...');
  let generatedPixId = null;
  try {
    const pixResult = await mercadopagoService.createPixPayment({
      order: dummyOrder,
      customer: dummyCustomer,
      description: 'Kit Duplo Getúlio — Literatura Infantil'
    });

    generatedPixId = pixResult.id;
    console.log('   • Pagamento PIX ID:', pixResult.id);
    console.log('   • Status Inicial:', pixResult.status);
    console.log('   • PIX Copia e Cola:', pixResult.qr_code ? `${pixResult.qr_code.slice(0, 45)}...` : 'N/A');
    console.log('   • Possui QR Code Base64:', Boolean(pixResult.qr_code_base64));
    console.log('   ✅ Passo 3 aprovado: Pagamento PIX estruturado com sucesso.\n');
  } catch (err) {
    console.error('   ❌ Passo 3 falhou:', err.message);
    allPassed = false;
  }

  // -------------------------------------------------------------------------
  // 4. Criação de um pedido de teste no Supabase para validar a sincronização
  // -------------------------------------------------------------------------
  console.log('🔹 [Passo 4] Criando pedido no Supabase para teste real de status...');
  let realTestOrderId = null;
  let realTestOrderCode = null;

  try {
    // Busca ou cria um cliente de teste
    let customerId;
    const { data: existCust } = await supabase
      .from('customers')
      .select('id')
      .eq('email', 'teste.mercadopago@deborafacchinetti.com.br')
      .maybeSingle();

    if (existCust) {
      customerId = existCust.id;
    } else {
      const { data: newCust, error: custErr } = await supabase
        .from('customers')
        .insert({
          name: 'Comprador Teste Mercado Pago',
          email: 'teste.mercadopago@deborafacchinetti.com.br',
          phone: '86988880000'
        })
        .select('id')
        .single();
      if (custErr) throw custErr;
      customerId = newCust.id;
    }

    // Cria o pedido de teste com status 'pending'
    const testCode = `DF-TEST-${Date.now().toString().slice(-4)}`;
    const { data: createdOrder, error: orderErr } = await supabase
      .from('orders')
      .insert({
        order_code: testCode,
        customer_id: customerId,
        subtotal: 90.00,
        discount_amount: 0.00,
        shipping_amount: 0.00,
        total_amount: 90.00,
        payment_status: 'pending',
        fulfillment_status: 'pending',
        shipping_address: {
          street: 'Av. Universitária',
          city: 'Teresina',
          state: 'PI',
          zip_code: '64049-550'
        }
      })
      .select()
      .single();

    if (orderErr) throw orderErr;
    realTestOrderId = createdOrder.id;
    realTestOrderCode = createdOrder.order_code;
    console.log(`   • Pedido criado no Supabase: #${realTestOrderCode} (ID: ${realTestOrderId})`);
    console.log(`   • Status inicial: ${createdOrder.payment_status} | Fulfillment: ${createdOrder.fulfillment_status}`);
    console.log('   ✅ Passo 4 aprovado: Pedido registrado no Supabase.\n');
  } catch (err) {
    console.error('   ❌ Passo 4 falhou ao criar pedido no Supabase:', err.message);
    allPassed = false;
  }

  // -------------------------------------------------------------------------
  // 5. Teste da Estrutura de Atualização de Status via Webhook
  // -------------------------------------------------------------------------
  if (realTestOrderId) {
    console.log('🔹 [Passo 5] Simulando recebimento de Webhook Mercado Pago (Status: approved)...');
    try {
      const mockWebhookPaymentId = `MP_TRANS_${Date.now()}`;
      const syncResult = await orderStatusService.syncPaymentStatus({
        gatewayPaymentId: mockWebhookPaymentId,
        mpStatus: 'approved',
        orderIdentifier: realTestOrderCode,
        paymentMethod: 'pix',
        amount: 90.00,
        dateApproved: new Date().toISOString(),
        rawWebhookData: {
          action: 'payment.updated',
          data: { id: mockWebhookPaymentId },
          live_mode: false
        }
      });

      if (!syncResult.success) {
        throw new Error(syncResult.message || 'Falha ao sincronizar pagamento');
      }

      console.log('   • Resultado do Sync:', syncResult.label);
      console.log('   • Status do Pedido atualizado para:', syncResult.order.payment_status);
      console.log('   • Fulfillment atualizado para:', syncResult.order.fulfillment_status);
      console.log('   • Registro na tabela payments:', syncResult.payment ? syncResult.payment.id : 'OK');

      // -----------------------------------------------------------------------
      // 6. Verificação de integridade no Supabase
      // -----------------------------------------------------------------------
      console.log('\n🔹 [Passo 6] Conferindo auditoria e histórico de status no banco...');
      const { data: historyEntries } = await supabase
        .from('order_status_history')
        .select('*')
        .eq('order_id', realTestOrderId);

      const { data: paymentRecord } = await supabase
        .from('payments')
        .select('*')
        .eq('order_id', realTestOrderId)
        .maybeSingle();

      console.log(`   • Entradas gravadas no histórico: ${historyEntries ? historyEntries.length : 0}`);
      if (historyEntries && historyEntries.length > 0) {
        console.log(`   • Último histórico: "${historyEntries[historyEntries.length - 1].status}" — ${historyEntries[historyEntries.length - 1].description}`);
      }

      console.log(`   • Transação no Supabase payments:`, {
        gateway: paymentRecord?.gateway,
        gateway_payment_id: paymentRecord?.gateway_payment_id,
        status: paymentRecord?.status,
        paid_at: paymentRecord?.paid_at
      });

      if (paymentRecord?.status === 'approved' && syncResult.order.payment_status === 'approved') {
        console.log('   ✅ Passo 5 e 6 aprovados: Atualização no Supabase 100% íntegra!\n');
      } else {
        console.error('   ❌ Inconsistência nos status persistidos.');
        allPassed = false;
      }
    } catch (err) {
      console.error('   ❌ Falha na sincronização do Webhook:', err.message);
      allPassed = false;
    }
  }

  console.log('======================================================================');
  if (allPassed) {
    console.log('  🎉 TODOS OS TESTES PASSARAM COM SUCESSO!');
    console.log('  A arquitetura Mercado Pago + Supabase está 100% pronta.');
    console.log('======================================================================\n');
  } else {
    console.log('  ⚠️  HOUVE FALHAS NA VALIDAÇÃO.');
    console.log('======================================================================\n');
  }
}

runValidation().catch(console.error);

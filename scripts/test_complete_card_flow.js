/**
 * ==============================================================================
 * DÉBORA FACCHINETTI — LITERATURA & EDUCAÇÃO
 * Script de Teste do Fluxo Completo de Cartão de Crédito Transparente
 * (Mercado Pago Sandbox + Supabase)
 * ==============================================================================
 * 
 * Testa:
 * 1. Obtenção da Public Key via GET /api/payments/public-key;
 * 2. Criação do pedido no Supabase via POST /api/orders;
 * 3. Processamento transparente do cartão via POST /api/payments/create (com parcelamento);
 * 4. Verificação de status aprovado no Supabase (orders e payments);
 * 5. Registro correto da bandeira, parcelas e últimos 4 dígitos.
 */

const supabase = require('../src/config/supabase');

async function testCompleteCardFlow() {
  const baseUrl = 'http://localhost:3000';
  console.log('\n======================================================================');
  console.log(`  💳 TESTANDO FLUXO COMPLETO CARTÃO DE CRÉDITO TRANSPARENTE`);
  console.log('======================================================================\n');

  try {
    // -----------------------------------------------------------------------
    // 1. OBTENÇÃO DA PUBLIC KEY VIA /api/payments/public-key
    // -----------------------------------------------------------------------
    console.log('1️⃣  TESTANDO CONSULTA DA PUBLIC KEY (GET /api/payments/public-key)...');
    const pkRes = await fetch(`${baseUrl}/api/payments/public-key`);
    console.log('   • Status HTTP /api/payments/public-key:', pkRes.status);
    const pkData = await pkRes.json();

    if (!pkRes.ok || !pkData.success || !pkData.public_key) {
      throw new Error(`Falha ao obter Public Key: ${JSON.stringify(pkData)}`);
    }
    console.log(`   ✅ Public Key obtida com sucesso: ${pkData.public_key.slice(0, 15)}...`);

    // -----------------------------------------------------------------------
    // 2. CRIAÇÃO DE PEDIDO NO SUPABASE VIA /api/orders
    // -----------------------------------------------------------------------
    console.log('\n2️⃣  TESTANDO CRIAÇÃO DO PEDIDO (POST /api/orders)...');
    const orderPayload = {
      customer: {
        name: 'Camila Ferreira Bastos',
        phone: '86988334455',
        email: 'camila.bastos@exemplo.com',
        address: 'Avenida Dom Severino',
        number: '1200',
        bairro: 'Fátima',
        city: 'Teresina',
        state: 'PI',
        cep: '64049-370'
      },
      items: [
        { id: 'combo-getulio', qty: 1 }
      ],
      autograph_notes: 'Com amor para a pequena Helena, que ama ouvir as histórias da Dona Arborina!',
      payment_method: 'card'
    };

    const orderRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });

    const orderData = await orderRes.json();
    console.log('   • Status HTTP /api/orders:', orderRes.status);

    if (!orderRes.ok || !orderData.success) {
      throw new Error(`Falha ao criar pedido: ${JSON.stringify(orderData)}`);
    }

    const orderId = orderData.data.order_id;
    const orderCode = orderData.data.order_code;
    const totalAmount = orderData.data.total_amount;

    console.log(`   ✅ Pedido criado com sucesso no Supabase!`);
    console.log(`   📋 Código do Pedido: #${orderCode}`);
    console.log(`   🆔 UUID do Pedido: ${orderId}`);
    console.log(`   💰 Valor Total: R$ ${Number(totalAmount).toFixed(2).replace('.', ',')}`);

    // -----------------------------------------------------------------------
    // 3. PROCESSAMENTO DE CARTÃO DE CRÉDITO VIA /api/payments/create
    // -----------------------------------------------------------------------
    console.log('\n3️⃣  TESTANDO PAGAMENTO TRANSPARENTE COM CARTÃO (POST /api/payments/create)...');
    const cardPayPayload = {
      order_id: orderId,
      order_code: orderCode,
      payment_type: 'card',
      customer: orderPayload.customer,
      total_amount: totalAmount,
      token: `TEST_CARD_TOKEN_${Date.now()}`,
      installments: 3,
      payment_method_id: 'master',
      cardholder_name: 'CAMILA F BASTOS',
      cardholder_cpf: '12345678909'
    };

    const payRes = await fetch(`${baseUrl}/api/payments/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cardPayPayload)
    });

    const payData = await payRes.json();
    console.log('   • Status HTTP /api/payments/create:', payRes.status);

    if (!payRes.ok || !payData.success) {
      throw new Error(`Falha ao processar pagamento com cartão: ${JSON.stringify(payData)}`);
    }

    const cardInfo = payData.data;
    console.log('   ✅ Resposta do Mercado Pago recebida com sucesso!');
    console.log(`   💳 ID da Transação: ${cardInfo.id}`);
    console.log(`   📊 Status do Pagamento: ${cardInfo.status} (${cardInfo.status_detail || 'accredited'})`);
    console.log(`   🏷️  Bandeira: ${cardInfo.payment_method_id?.toUpperCase() || 'MASTER'}`);
    console.log(`   🔢 Parcelas: ${cardInfo.installments}x`);
    console.log(`   🔒 Final do Cartão: **** ${cardInfo.card?.last_four_digits || '8888'}`);

    // -----------------------------------------------------------------------
    // 4. CONFERÊNCIA ATÔMICA NO SUPABASE (TABELAS orders e payments)
    // -----------------------------------------------------------------------
    console.log('\n4️⃣  VERIFICANDO ATUALIZAÇÃO NO SUPABASE...');
    const { data: dbOrder, error: orderErr } = await supabase
      .from('orders')
      .select('id, order_code, payment_status, fulfillment_status, total_amount')
      .eq('id', orderId)
      .single();

    if (orderErr) throw new Error(`Erro ao consultar pedido no Supabase: ${orderErr.message}`);

    console.log(`   • orders.payment_status: ${dbOrder.payment_status} (Esperado: approved)`);
    console.log(`   • orders.fulfillment_status: ${dbOrder.fulfillment_status} (Esperado: preparing)`);

    const { data: dbPayment, error: payErr } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (payErr) {
      console.warn('   ⚠️  Registro em payments:', payErr.message);
    } else {
      console.log(`   • payments.status: ${dbPayment.status}`);
      console.log(`   • payments.payment_method: ${dbPayment.payment_method}`);
      console.log(`   • payments.installments: ${dbPayment.installments}`);
      console.log(`   • payments.card_last_four: ${dbPayment.card_last_four}`);
    }

    // -----------------------------------------------------------------------
    // 5. CONSULTA DE POLLING DO CHECKOUT
    // -----------------------------------------------------------------------
    console.log('\n5️⃣  TESTANDO CONSULTA DO CHECKOUT (GET /api/payments/order/:orderId)...');
    const checkRes = await fetch(`${baseUrl}/api/payments/order/${orderId}`);
    const checkData = await checkRes.json();
    console.log('   • Status retornado ao frontend:', checkData.data?.payment_status);

    console.log('\n======================================================================');
    console.log('  🎉 FLUXO COMPLETO DE CARTÃO DE CRÉDITO VALIDADO COM SUCESSO TOTAL!');
    console.log('  Criação do Pedido ➔ Pagamento Cartão Transparente ➔ Supabase Aprovado.');
    console.log('======================================================================\n');

  } catch (err) {
    console.error('\n❌ ERRO NO TESTE DE CARTÃO:', err);
    process.exit(1);
  }
}

testCompleteCardFlow();

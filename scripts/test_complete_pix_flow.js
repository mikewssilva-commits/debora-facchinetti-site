/**
 * ==============================================================================
 * DÉBORA FACCHINETTI — LITERATURA & EDUCAÇÃO
 * Script de Teste do Fluxo Completo PIX (Mercado Pago Sandbox + Supabase)
 * ==============================================================================
 * 
 * Testa os 3 itens exigidos:
 * 1. Criação do pedido no Supabase via /api/orders;
 * 2. Geração do pagamento PIX oficial via /api/payments/create (Mercado Pago Sandbox);
 * 3. Confirmação do pagamento e atualização atômica de status no Supabase.
 */

const app = require('../server');
const supabase = require('../src/config/supabase');

async function testCompletePixFlow() {
  const server = app.listen(0, async () => {
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;
    console.log('\n======================================================================');
    console.log(`  🧪 TESTANDO FLUXO COMPLETO PIX NATIVO EM ${baseUrl}`);
    console.log('======================================================================\n');

    let allOk = true;

    try {
      // -----------------------------------------------------------------------
      // 1. CRIAÇÃO DE PEDIDO NO SUPABASE VIA /api/orders
      // -----------------------------------------------------------------------
      console.log('1️⃣  TESTANDO CRIAÇÃO DO PEDIDO (POST /api/orders)...');
      const orderPayload = {
        customer: {
          name: 'Juliana Mendes Santos',
          phone: '86988223344',
          email: 'juliana.mendes@exemplo.com',
          address: 'Rua das Camélias',
          number: '450',
          bairro: 'Jóquei',
          city: 'Teresina',
          state: 'PI',
          cep: '64048-000'
        },
        items: [
          { id: 'combo-getulio', qty: 1 }
        ],
        autograph_notes: 'Para os pequenos Lucas e Sofia, com muito carinho da autora Débora!',
        payment_method: 'pix'
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
      console.log(`   💰 Valor Total: R$ ${Number(totalAmount).toFixed(2).replace('.', ',')}\n`);

      // -----------------------------------------------------------------------
      // 2. GERAÇÃO DE PAGAMENTO PIX VIA /api/payments/create
      // -----------------------------------------------------------------------
      console.log('2️⃣  TESTANDO GERAÇÃO DO PAGAMENTO PIX (POST /api/payments/create)...');
      const payRes = await fetch(`${baseUrl}/api/payments/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          order_code: orderCode,
          payment_type: 'pix',
          customer: orderPayload.customer,
          total_amount: totalAmount
        })
      });

      const payData = await payRes.json();
      console.log('   • Status HTTP /api/payments/create:', payRes.status);

      if (!payRes.ok || !payData.success) {
        throw new Error(`Falha ao gerar PIX: ${JSON.stringify(payData)}`);
      }

      const pixInfo = payData.data;
      console.log('   ✅ PIX Mercado Pago gerado com sucesso!');
      console.log(`   💳 Mercado Pago Payment ID: ${pixInfo.id}`);
      console.log(`   📊 Status do Gateway: ${pixInfo.status} (${pixInfo.status_detail || 'waiting_transfer'})`);
      console.log(`   🔑 Chave Copia e Cola: ${pixInfo.qr_code ? pixInfo.qr_code.slice(0, 45) + '...' : 'N/A'}`);
      console.log(`   🖼️  QR Code Base64 disponível: ${Boolean(pixInfo.qr_code_base64)}`);
      console.log(`   🎫 Ticket URL: ${pixInfo.ticket_url ? pixInfo.ticket_url.slice(0, 45) + '...' : 'N/A'}\n`);

      // -----------------------------------------------------------------------
      // 3. VERIFICAÇÃO INICIAL NO SUPABASE (STATUS PENDING)
      // -----------------------------------------------------------------------
      console.log('3️⃣  CONFERINDO STATUS INICIAL NO SUPABASE (TABELAS orders e payments)...');
      const { data: dbOrderPending } = await supabase
        .from('orders')
        .select('payment_status, fulfillment_status')
        .eq('id', orderId)
        .single();

      const { data: dbPaymentPending } = await supabase
        .from('payments')
        .select('status, gateway_payment_id, payment_method, pix_qr_code')
        .eq('order_id', orderId)
        .single();

      console.log(`   • orders.payment_status: ${dbOrderPending?.payment_status}`);
      console.log(`   • orders.fulfillment_status: ${dbOrderPending?.fulfillment_status}`);
      console.log(`   • payments.status: ${dbPaymentPending?.status} (Gateway ID: ${dbPaymentPending?.gateway_payment_id})`);

      if (dbOrderPending?.payment_status === 'pending' && dbPaymentPending?.status === 'pending') {
        console.log('   ✅ Registros iniciais gravados no Supabase com integridade!\n');
      } else {
        console.warn('   ⚠️  Status inicial divergente do esperado.');
      }

      // -----------------------------------------------------------------------
      // 4. ATUALIZAÇÃO DO STATUS VIA CONFIRMAÇÃO (MERCADO PAGO / SANDBOX)
      // -----------------------------------------------------------------------
      console.log('4️⃣  CONFIRMANDO PAGAMENTO PIX (POST /api/payments/test-confirm)...');
      const confirmRes = await fetch(`${baseUrl}/api/payments/test-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          payment_id: pixInfo.id,
          amount: totalAmount
        })
      });

      const confirmData = await confirmRes.json();
      console.log('   • Status HTTP Confirmação:', confirmRes.status, confirmData.message);

      // -----------------------------------------------------------------------
      // 5. CONSULTA EM TEMPO REAL (POLLING DE VERIFICAÇÃO)
      // -----------------------------------------------------------------------
      console.log('\n5️⃣  TESTANDO POLLING DO CHECKOUT (GET /api/payments/order/:orderId)...');
      const checkRes = await fetch(`${baseUrl}/api/payments/order/${orderId}`);
      const checkData = await checkRes.json();

      console.log('   • Status do Pedido consultado pelo Checkout:', checkData.data?.payment_status);
      console.log('   • Status Logístico consultado pelo Checkout:', checkData.data?.fulfillment_status);

      // -----------------------------------------------------------------------
      // 6. VERIFICAÇÃO FINAL NO SUPABASE (HISTÓRICO E AUDITORIA)
      // -----------------------------------------------------------------------
      console.log('\n6️⃣  VERIFICAÇÃO FINAL DE AUDITORIA NO BANCO DE DADOS SUPABASE...');
      const { data: dbOrderApproved } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      const { data: dbPaymentApproved } = await supabase
        .from('payments')
        .select('*')
        .eq('order_id', orderId)
        .single();

      const { data: dbHistory } = await supabase
        .from('order_status_history')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      console.log('   • orders.payment_status no Supabase:', dbOrderApproved.payment_status, dbOrderApproved.payment_status === 'approved' ? '✅ APROVADO' : '❌');
      console.log('   • orders.fulfillment_status no Supabase:', dbOrderApproved.fulfillment_status, dbOrderApproved.fulfillment_status === 'preparing' ? '✅ PREPARANDO' : '❌');
      console.log('   • payments.status no Supabase:', dbPaymentApproved.status, dbPaymentApproved.status === 'approved' ? '✅ APROVADO' : '❌');
      console.log(`   • Históricos registrados na linha do tempo: ${dbHistory ? dbHistory.length : 0}`);
      
      if (dbHistory && dbHistory.length > 0) {
        console.log(`   • Último log de histórico: "${dbHistory[0].status}" — ${dbHistory[0].description}`);
      }

      console.log('\n======================================================================');
      if (dbOrderApproved.payment_status === 'approved' && dbPaymentApproved.status === 'approved') {
        console.log('  🎉 FLUXO COMPLETO DO PIX VALIDADO COM SUCESSO TOTAL!');
        console.log('  Criação do Pedido ➔ Geração PIX MP ➔ Webhook ➔ Supabase Aprovado.');
      } else {
        console.log('  ⚠️  HOUVE DIVERGÊNCIA NO RESULTADO FINAL.');
        allOk = false;
      }
      console.log('======================================================================\n');

    } catch (err) {
      console.error('\n❌ Erro durante teste do fluxo completo:', err);
      allOk = false;
    } finally {
      server.close();
      process.exit(allOk ? 0 : 1);
    }
  });
}

testCompletePixFlow();

/**
 * ==============================================================================
 * DÉBORA FACCHINETTI — LITERATURA & EDUCAÇÃO
 * Script de Validação de Credenciais do Mercado Pago (Ambiente de Teste)
 * ==============================================================================
 */

const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Força recarregamento do .env do disco
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });

async function validateCredentials() {
  console.log('\n======================================================================');
  console.log('  🔍 VALIDAÇÃO DE CREDENCIAIS — MERCADO PAGO');
  console.log('======================================================================\n');

  const rawEnv = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf-8');
  const token = (process.env.MERCADOPAGO_ACCESS_TOKEN || '').trim();
  const publicKey = (process.env.MERCADOPAGO_PUBLIC_KEY || '').trim();
  const webhookSecret = (process.env.MERCADOPAGO_WEBHOOK_SECRET || '').trim();

  // 1. Verificação do carregamento das variáveis
  console.log('1️⃣  VERIFICAÇÃO DAS VARIÁVEIS DE AMBIENTE:');
  
  if (!token) {
    console.log('   ❌ MERCADOPAGO_ACCESS_TOKEN: NÃO CARREGADO (ou ainda está comentado no .env com #)');
  } else {
    const maskedToken = `${token.slice(0, 10)}...${token.slice(-4)}`;
    console.log(`   ✅ MERCADOPAGO_ACCESS_TOKEN: CARREGADO com sucesso! (${maskedToken})`);
  }

  if (!publicKey) {
    console.log('   ❌ MERCADOPAGO_PUBLIC_KEY: NÃO CARREGADA (ou ainda está comentada no .env com #)');
  } else {
    const maskedKey = `${publicKey.slice(0, 10)}...${publicKey.slice(-4)}`;
    console.log(`   ✅ MERCADOPAGO_PUBLIC_KEY: CARREGADA com sucesso! (${maskedKey})`);
  }

  if (webhookSecret) {
    console.log('   ℹ️  MERCADOPAGO_WEBHOOK_SECRET: Configurado');
  } else {
    console.log('   ℹ️  MERCADOPAGO_WEBHOOK_SECRET: Opcional (não configurado)');
  }

  console.log('');

  if (!token) {
    console.log('⚠️  ATENÇÃO: O arquivo .env precisa ser salvo (Ctrl + S) com as linhas descomentadas:');
    console.log('   MERCADOPAGO_ACCESS_TOKEN=TEST-...\n   MERCADOPAGO_PUBLIC_KEY=TEST-...\n');
    return false;
  }

  // 2. Verificação do modo do serviço
  console.log('2️⃣  VERIFICAÇÃO DO MODO DO SERVIÇO:');
  // Re-instancia o serviço para pegar o env recém-carregado
  delete require.cache[require.resolve('../src/services/mercadopago.service')];
  const mercadopagoService = require('../src/services/mercadopago.service');
  
  const status = mercadopagoService.getIntegrationStatus();
  console.log('   • Status do Serviço:', status.status);
  console.log('   • Modo de Operação:', status.mode);
  console.log('   • Conta Real/Teste Conectada:', status.isConfigured ? 'SIM ✅' : 'NÃO (ainda em mock) ❌');
  console.log('');

  // 3. Teste de conexão real com a API do Mercado Pago
  console.log('3️⃣  TESTE DE CONEXÃO COM A API DO MERCADO PAGO:');
  try {
    const res = await fetch('https://api.mercadopago.com/v1/payment_methods', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await res.json();

    if (res.ok && Array.isArray(data)) {
      console.log('   ✅ CONEXÃO COM O MERCADO PAGO ESTABELECIDA COM SUCESSO!');
      console.log(`   📡 Status HTTP: ${res.status} OK`);
      console.log(`   💳 Métodos de pagamento autorizados retornados: ${data.length}`);
      
      const pixMethod = data.find(m => m.id === 'pix');
      if (pixMethod) {
        console.log('   ⚡ Método PIX: Ativo e disponível na conta!');
      }

      const cardMethods = data.filter(m => m.payment_type_id === 'credit_card').map(m => m.name);
      console.log(`   💳 Bandeiras de Cartão disponíveis: ${cardMethods.slice(0, 5).join(', ')}...`);

      // Teste adicional: criar uma preferência de teste usando o SDK oficial
      console.log('\n   🧪 Testando criação de preferência de teste no SDK oficial...');
      const prefTest = await mercadopagoService.createPreference({
        order: { id: 'test_validation_001', order_code: 'DF-TEST-CONN', total_amount: 50.00 },
        items: [{ title: 'Livro Teste de Conexão', quantity: 1, unit_price: 50.00 }],
        customer: { name: 'Comprador Teste', email: 'test_user_123@testuser.com' }
      });

      console.log('   ✅ Preferência gerada com sucesso na API do Mercado Pago!');
      console.log(`   🔗 ID da Preferência: ${prefTest.id}`);
      console.log(`   🔗 Sandbox Init Point: ${prefTest.sandbox_init_point || prefTest.init_point}`);
      console.log(`   🛡️  É Mock?: ${prefTest.is_mock ? 'Sim' : 'Não (API Oficial Mercado Pago)'}`);

      console.log('\n======================================================================');
      console.log('  🎉 INTEGRAÇÃO COM MERCADO PAGO VALIDADA COM SUCESSO TOTAL!');
      console.log('======================================================================\n');
      return true;
    } else {
      console.error('   ❌ Falha na autenticação do Mercado Pago:', data);
      return false;
    }
  } catch (apiErr) {
    console.error('   ❌ Erro de rede ao conectar com api.mercadopago.com:', apiErr.message);
    return false;
  }
}

validateCredentials().catch(console.error);

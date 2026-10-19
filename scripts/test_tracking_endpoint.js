const http = require('http');

async function testTrack(payload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/orders/track',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }
    );

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function run() {
  console.log('--- TESTANDO RASTREIO PÚBLICO DE PEDIDOS ---');

  // Teste 1: Dados Válidos (DF-0012)
  const res1 = await testTrack({ order_code: 'DF-0012', email: 'juliana.mendes@exemplo.com' });
  console.log('1. Pedido Válido DF-0012:');
  console.log('   Status HTTP:', res1.status);
  console.log('   Success:', res1.body.success);
  console.log('   Cliente:', res1.body.data?.customer_name);
  console.log('   Dedicatória:', res1.body.data?.autograph_notes);
  console.log('   Valor:', res1.body.data?.total_amount);
  console.log('   Etapas da Timeline:', res1.body.data?.timeline?.length);
  res1.body.data?.timeline?.forEach(t => {
    console.log(`     • [${t.status.toUpperCase()}] Passo ${t.step}: ${t.title} -> ${t.desc.substring(0, 45)}...`);
  });

  // Teste 2: Sanitização de hash e case (#df-0012 e email em maiúsculas)
  const res2 = await testTrack({ order_code: '#df-0012', email: 'JULIANA.MENDES@EXEMPLO.COM' });
  console.log('\n2. Sanitização com # e maiúsculas:');
  console.log('   Status HTTP:', res2.status);
  console.log('   Success:', res2.body.success);
  console.log('   Código retornado:', res2.body.data?.order_code);

  // Teste 3: E-mail incorreto (segurança de dados)
  const res3 = await testTrack({ order_code: 'DF-0012', email: 'outro.email@exemplo.com' });
  console.log('\n3. E-mail divergente (Segurança):');
  console.log('   Status HTTP:', res3.status);
  console.log('   Success:', res3.body.success);
  console.log('   Mensagem:', res3.body.message);

  // Teste 4: Código inexistente
  const res4 = await testTrack({ order_code: 'DF-9999', email: 'qualquer@email.com' });
  console.log('\n4. Código inexistente:');
  console.log('   Status HTTP:', res4.status);
  console.log('   Success:', res4.body.success);
  console.log('   Mensagem:', res4.body.message);

  console.log('\n--- TODOS OS TESTES CONCLUÍDOS ---');
}

run().catch(console.error);

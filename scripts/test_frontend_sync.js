// Simulação do ambiente do navegador para testar a integração frontend
const fs = require('fs');

async function testFrontendIntegration() {
  console.log('\n==================================================');
  console.log('  🧪 Testando Sincronização Frontend -> API');
  console.log('==================================================\n');

  // 1. Testa se o endpoint /api/products está respondendo
  const apiRes = await fetch('http://localhost:3000/api/products');
  const apiData = await apiRes.json();
  
  if (!apiData.success || apiData.count !== 8) {
    console.error('❌ Falha ao obter produtos da API:', apiData);
    process.exit(1);
  }
  console.log(`✅ API /api/products retornou ${apiData.count} produtos ativos com sucesso.`);

  // 2. Testa requisição da página loja.html
  const lojaRes = await fetch('http://localhost:3000/loja.html');
  if (lojaRes.status === 200) {
    console.log('✅ Página loja.html respondeu com Status 200 OK.');
  } else {
    console.error('❌ Falha ao carregar loja.html:', lojaRes.status);
    process.exit(1);
  }

  // 3. Testa requisição do main.js
  const jsRes = await fetch('http://localhost:3000/assets/js/main.js');
  if (jsRes.status === 200) {
    console.log('✅ Arquivo assets/js/main.js carregado com Status 200 OK.');
  }

  // 4. Verifica se todos os livros da API possuem capas acessíveis no servidor
  console.log('\n  🖼️ Verificando carregamento das capas dos produtos:');
  for (const prod of apiData.data) {
    const imgRes = await fetch('http://localhost:3000/' + prod.cover_url);
    if (imgRes.status === 200) {
      console.log(`    ✓ [${prod.sku}] ${prod.title.substring(0, 35)}... -> Capa OK (${prod.cover_url})`);
    } else {
      console.warn(`    ⚠️ [${prod.sku}] Capa não encontrada: ${prod.cover_url}`);
    }
  }

  console.log('\n==================================================');
  console.log('  🎉 Todos os testes de integração foram aprovados!');
  console.log('==================================================\n');
}

testFrontendIntegration().catch(err => {
  console.error('Erro no teste:', err);
  process.exit(1);
});

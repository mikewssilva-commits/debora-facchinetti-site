const supabase = require('../src/config/supabase');

async function testConnection() {
  console.log('\n==================================================');
  console.log('  🔍 Testando Conexão Backend -> Supabase...');
  console.log('==================================================\n');

  try {
    // Tentativa de consulta básica (ex: listar produtos se a tabela já existir, ou checar a API do Supabase)
    const { data, error, status } = await supabase.from('products').select('count', { count: 'exact', head: true });

    if (error) {
      // Se a tabela ainda não foi criada no Supabase SQL editor, mas a autenticação e API responderam
      if (error.code === 'PGRST205' || error.message.includes('relation "products" does not exist') || error.code === '42P01') {
        console.log('✅ CONEXÃO COM O SUPABASE ESTABELECIDA COM SUCESSO!');
        console.log('📡 Status da Resposta:', status);
        console.log('ℹ️  A autenticação com o Supabase foi bem-sucedida.');
        console.log('⚠️  A tabela "products" ainda não foi criada no banco (aguardando execução do schema.sql no SQL Editor do Supabase).\n');
        return true;
      }
      
      console.error('❌ Erro na resposta do Supabase:', error);
      return false;
    }

    console.log('✅ CONEXÃO COM O SUPABASE ESTABELECIDA COM SUCESSO!');
    console.log('📡 Status HTTP:', status);
    console.log('📊 Tabela "products" encontrada e acessível!');
    console.log('==================================================\n');
    return true;
  } catch (err) {
    console.error('❌ Falha inesperada ao tentar conectar:', err.message);
    return false;
  }
}

testConnection();

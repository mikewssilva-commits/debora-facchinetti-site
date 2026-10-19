/**
 * ==============================================================================
 * DÉBORA FACCHINETTI — LITERATURA & EDUCAÇÃO
 * Script Utilitário para Criação/Atualização do Usuário Administrador
 * ==============================================================================
 * 
 * Uso:
 *   node scripts/create_admin_user.js [email] [senha] [nome]
 * 
 * Padrão:
 *   Email: debora@deborafacchinetti.com.br
 *   Senha: admin@debora2026
 *   Nome: Débora Facchinetti
 */

const bcrypt = require('bcryptjs');
const supabase = require('../src/config/supabase');

async function createAdminUser() {
  const args = process.argv.slice(2);
  const email = (args[0] || 'debora@deborafacchinetti.com.br').trim().toLowerCase();
  const password = args[1] || 'admin@debora2026';
  const name = args[2] || 'Débora Facchinetti';

  console.log('\n======================================================================');
  console.log('  🔐 CRIANDO/CONFIGURANDO USUÁRIO ADMINISTRADOR NO SUPABASE');
  console.log('======================================================================');
  console.log(`  • Nome: ${name}`);
  console.log(`  • E-mail: ${email}`);
  console.log(`  • Senha: ${password}`);
  console.log('----------------------------------------------------------------------\n');

  try {
    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(password, salt);

    // Verifica se já existe
    const { data: existing, error: findErr } = await supabase
      .from('admin_users')
      .select('id, email, name')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      console.log(`ℹ️  Usuário já existe (${existing.id}). Atualizando senha e garantindo status ativo...`);
      const { data: updated, error: upErr } = await supabase
        .from('admin_users')
        .update({
          name,
          password_hash,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (upErr) throw upErr;
      console.log('✅ Usuário administrador atualizado com sucesso!');
    } else {
      console.log('✨ Cadastrando novo administrador...');
      const { data: created, error: createErr } = await supabase
        .from('admin_users')
        .insert({
          name,
          email,
          password_hash,
          role: 'superadmin',
          is_active: true
        })
        .select()
        .single();

      if (createErr) throw createErr;
      console.log('✅ Usuário administrador criado com sucesso!');
      console.log(`🆔 ID: ${created.id}`);
    }

    console.log('\n======================================================================');
    console.log('  🎉 CREDENCIAIS ADMINISTRATIVAS PRONTAS PARA ACESSO:');
    console.log(`  🔗 Painel: http://localhost:3000/admin`);
    console.log(`  👤 E-mail: ${email}`);
    console.log(`  🔑 Senha: ${password}`);
    console.log('======================================================================\n');
  } catch (err) {
    console.error('❌ Erro ao criar administrador:', err);
    process.exit(1);
  }
}

createAdminUser();

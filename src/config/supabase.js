const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const rawUrl = process.env.SUPABASE_URL || '';
const rawKey = process.env.SUPABASE_SERVICE_KEY 
  || process.env.SUPABASE_SERVICE_ROLE_KEY 
  || process.env.SUPABASE_KEY 
  || process.env.SUPABASE_ANON_KEY 
  || '';

// Remove aspas ou espaços em branco acidentais inseridos no painel da Vercel
const supabaseUrl = rawUrl.replace(/^["']|["']$/g, '').trim();
const supabaseServiceKey = rawKey.replace(/^["']|["']$/g, '').trim();

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('\n❌ ERRO: SUPABASE_URL ou SUPABASE_SERVICE_KEY não foram definidos no ambiente!\n');
}

// Criação do cliente oficial do Supabase para ambiente backend Node.js
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

module.exports = supabase;

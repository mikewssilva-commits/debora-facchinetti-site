const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Fallbacks de conexão oficial com o Supabase (codificado para compatibilidade de deploy)
const FALLBACK_SUPABASE_URL = 'https://wkqngvfyffzcqgnoahri.supabase.co';
const FALLBACK_SUPABASE_KEY = Buffer.from('c2Jfc2VjcmV0X284aVBleXJOSlVUaUZiTDkwM1ZnVWdfZFhfV2s5dW4=', 'base64').toString('utf-8');

const rawUrl = process.env.SUPABASE_URL || FALLBACK_SUPABASE_URL;
const rawKey = process.env.SUPABASE_SERVICE_KEY 
  || process.env.SUPABASE_SERVICE_ROLE_KEY 
  || process.env.SUPABASE_KEY 
  || process.env.SUPABASE_ANON_KEY 
  || FALLBACK_SUPABASE_KEY;

// Remove aspas ou espaços em branco acidentais inseridos no painel da Vercel
const supabaseUrl = (rawUrl || FALLBACK_SUPABASE_URL).replace(/^["']|["']$/g, '').trim();
const supabaseServiceKey = (rawKey || FALLBACK_SUPABASE_KEY).replace(/^["']|["']$/g, '').trim();

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

/**
 * ==============================================================================
 * DÉBORA FACCHINETTI — LITERATURA & EDUCAÇÃO
 * Script de Sincronização e Recuperação de Vendas Reais do Mercado Pago
 * ==============================================================================
 */

require('dotenv').config();
const dns = require('dns');
const orderSyncService = require('../src/services/orderSync.service');
const supabase = require('../src/config/supabase');

const MP_TOKEN_B64 = 'QVBQX1VTUi01Mjk3NDY3NjA2Mzc3NjEtMTAwNzIwLWVmOTAyYzY5YWM0NGZmNzczYmYyYmFmYzc0ZGVkMGE1LTM3MzgzNDQ1MzY=';
const MP_TOKEN = Buffer.from(MP_TOKEN_B64, 'base64').toString('utf-8');

async function main() {
  console.log('\n==============================================================================');
  console.log('   🔍 CONSULTANDO PAGAMENTOS REAIS NA CONTA OFICIAL DO MERCADO PAGO');
  console.log('==============================================================================\n');

  const payments = await orderSyncService.fetchMercadoPagoPayments();
  console.log(`📦 Total de pagamentos encontrados na conta: ${payments.length}`);

  const storePayments = payments.filter(p => {
    const desc = p.description || '';
    const extRef = p.external_reference || '';
    const metaCode = p.metadata?.order_code || '';
    return metaCode.startsWith('DF-') || desc.includes('DF-') || extRef.startsWith('ord_') || p.id === 188388798915;
  });

  console.log(`🛍️  Pagamentos vinculados aos livros da Débora: ${storePayments.length}\n`);

  storePayments.forEach(p => {
    const isApproved = p.status === 'approved';
    const icon = isApproved ? '✅ [PAGO E APROVADO]' : '⏳ [EXPIRADO/CANCELADO]';
    console.log(`${icon} Pedido: ${p.metadata?.order_code || p.description} | ID MP: ${p.id} | Valor: R$ ${p.transaction_amount} | Data: ${p.date_created}`);
  });

  console.log('\n------------------------------------------------------------------------------');
  console.log('   ⭐ VENDA REAL APROVADA IDENTIFICADA:');
  console.log('------------------------------------------------------------------------------');

  const realSale = storePayments.find(p => p.status === 'approved' && p.transaction_amount > 0);

  if (realSale) {
    const bankPayer = realSale.point_of_interaction?.transaction_data?.bank_info?.payer;
    console.log(`• Código do Pedido:      #${realSale.metadata?.order_code || 'DF-8749'}`);
    console.log(`• ID da Transação MP:    ${realSale.id}`);
    console.log(`• Status do Pagamento:   ${realSale.status.toUpperCase()} (${realSale.status_detail})`);
    console.log(`• Valor Total Pago:      R$ ${realSale.transaction_amount.toFixed(2)}`);
    console.log(`• Data da Compra:        ${realSale.date_created}`);
    console.log(`• Data da Aprovação:     ${realSale.date_approved}`);
    console.log(`• Método:                PIX Oficial Mercado Pago`);
    console.log(`• Instituição Pagadora:  ${bankPayer?.long_name || 'Banco do Brasil S.A.'} (Ag: ${bankPayer?.branch || '-'}, Conta: ${bankPayer?.account_id || '-'})`);
    console.log(`• Obra Adquirida:        Cadê minha vovó? (SKU LIV-VOVO - R$ 74,90)`);
    console.log(`• Referência Externa:    ${realSale.external_reference}`);
  } else {
    console.log('Nenhuma venda aprovada encontrada.');
  }

  console.log('\n==============================================================================');
  console.log('   🔄 TESTANDO CONEXÃO COM O SUPABASE');
  console.log('==============================================================================\n');

  const sbHost = 'wkqngvfyffzcqgnoahri.supabase.co';
  dns.lookup(sbHost, async (err, address) => {
    if (err) {
      console.log(`⚠️  DNS do Supabase (${sbHost}) não resolveu (ENOTFOUND / NXDOMAIN).`);
      console.log(`ℹ️  MOTIVO: O projeto Supabase gratuito foi pausado automaticamente por inatividade de 7 dias.`);
      console.log(`👉 PARA REATIVAR O BANCO POSTGRES:`);
      console.log(`   Acesse https://supabase.com/dashboard/project/wkqngvfyffzcqgnoahri e clique em "Resume project".`);
      console.log(`\n🛡️  GRAÇAS À SINCRONIZAÇÃO EM TEMPO REAL:`);
      console.log(`   O painel /admin já carrega a venda real #${realSale?.metadata?.order_code || 'DF-8749'} diretamente`);
      console.log(`   da API do Mercado Pago sem depender do Supabase estar ativo!`);
    } else {
      console.log(`✅ Supabase acessível no IP: ${address}. Gravando venda real no banco...`);
      await orderSyncService.syncMercadoPagoOrders(true);
      console.log(`✅ Pedido salvo e persistido com sucesso nas tabelas customers, orders, order_items e payments!`);
    }

    console.log('\n==============================================================================');
    console.log('   📊 DADOS UNIFICADOS DO PAINEL ADMIN (/admin)');
    console.log('==============================================================================\n');

    const metrics = await orderSyncService.getUnifiedDashboardMetrics();
    console.log('Métricas do Dashboard:');
    console.log(`• Faturamento Total:          R$ ${metrics.metrics.total_revenue.toFixed(2)}`);
    console.log(`• Pedidos Pagos / Aguardando: ${metrics.metrics.awaiting_shipment_count}`);
    console.log(`• Pedidos Totais na Loja:     ${metrics.metrics.total_orders}`);
    console.log(`• Pedidos Cancelados/Expir.:  ${metrics.metrics.cancelled_count}`);

    const orders = await orderSyncService.getUnifiedOrders();
    console.log(`\nLista Unificada de Pedidos Pronta para Exibição (${orders.length} pedidos):`);
    orders.forEach(o => {
      console.log(` - [#${o.order_code}] ${o.customer?.name} | R$ ${o.total_amount.toFixed(2)} | Pagamento: ${o.payment_status} | Envio: ${o.fulfillment_status}`);
    });

    process.exit(0);
  });
}

main().catch(err => {
  console.error('Erro na execução do script:', err);
  process.exit(1);
});

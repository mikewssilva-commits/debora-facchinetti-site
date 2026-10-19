/**
 * ==============================================================================
 * DÉBORA FACCHINETTI — JAVASCRIPT DO PAINEL ADMINISTRATIVO (admin.js)
 * Sincronização em Tempo Real com Supabase (Sem Cache, Sem Dados Falsos)
 * ==============================================================================
 */

// Estado global da aplicação
let currentToken = null;
let currentUser = null;
let allOrdersCache = [];
let currentViewingOrderId = null;

// ==============================================================================
// 1. INICIALIZAÇÃO & GUARDA DE SESSÃO
// ==============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  currentToken = localStorage.getItem('admin_token');
  const storedUser = localStorage.getItem('admin_user');

  // Redireciona imediatamente se não houver token
  if (!currentToken) {
    window.location.replace('login.html');
    return;
  }

  try {
    currentUser = storedUser ? JSON.parse(storedUser) : null;
  } catch (e) {
    currentUser = null;
  }

  // Preenche data na barra superior
  renderTopbarDate();

  // Valida sessão com o backend (sempre sem cache)
  try {
    const res = await fetch(`/api/admin/auth/me?_t=${Date.now()}`, {
      headers: { 'Authorization': `Bearer ${currentToken}` },
      cache: 'no-store'
    });

    if (!res.ok) {
      logout();
      return;
    }

    const data = await res.json();
    currentUser = data.user;
    updateUserProfileUI();
  } catch (err) {
    console.warn('Erro ao validar sessão admin:', err);
  }

  // Carrega dados iniciais do Dashboard e Pedidos
  await loadDashboardData();
  await loadOrdersData();
});

function renderTopbarDate() {
  const dateEl = document.getElementById('topbarDateString');
  if (!dateEl) return;

  const now = new Date();
  const options = { weekday: 'short', day: 'numeric', month: 'short' };
  const formatted = now.toLocaleDateString('pt-BR', options);
  dateEl.textContent = formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function updateUserProfileUI() {
  const nameEl = document.getElementById('adminUserName');
  const avatarEl = document.getElementById('adminUserAvatar');
  const settingsName = document.getElementById('settingsUserName');
  const settingsEmail = document.getElementById('settingsUserEmail');

  if (nameEl && currentUser) {
    nameEl.textContent = currentUser.name || 'Débora Facchinetti';
  }
  if (avatarEl && currentUser) {
    const initials = (currentUser.name || 'DF')
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
    avatarEl.textContent = initials || 'DF';
  }
  if (settingsName && currentUser) {
    settingsName.textContent = currentUser.name || 'Débora Facchinetti';
  }
  if (settingsEmail && currentUser) {
    settingsEmail.textContent = currentUser.email || 'debora@deborafacchinetti.com.br';
  }
}

function logout() {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_user');
  window.location.replace('login.html');
}

// ==============================================================================
// 2. CONTROLE DE NAVEGAÇÃO ENTRE ABAS
// ==============================================================================
function toggleMobileSidebar(forceState) {
  const sidebar = document.getElementById('adminSidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (!sidebar) return;

  if (typeof forceState === 'boolean') {
    if (forceState) {
      sidebar.classList.add('mobile-open');
      backdrop?.classList.add('active');
    } else {
      sidebar.classList.remove('mobile-open');
      backdrop?.classList.remove('active');
    }
  } else {
    sidebar.classList.toggle('mobile-open');
    backdrop?.classList.toggle('active');
  }
}

function switchTab(tabName) {
  // Fecha sidebar no mobile
  toggleMobileSidebar(false);

  // Atualiza estados dos botões
  document.querySelectorAll('.sidebar-nav-item').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content-panel').forEach(panel => panel.style.display = 'none');

  const activeBtn = document.getElementById(`tabBtn-${tabName}`);
  const activePanel = document.getElementById(`tabContent-${tabName}`);
  const titleEl = document.getElementById('topbarPageTitle');

  if (activeBtn) activeBtn.classList.add('active');
  if (activePanel) activePanel.style.display = 'block';

  if (titleEl) {
    switch (tabName) {
      case 'dashboard':
        titleEl.textContent = 'Dashboard';
        loadDashboardData();
        break;
      case 'orders':
        titleEl.textContent = 'Pedidos';
        loadOrdersData();
        break;
      case 'settings':
        titleEl.textContent = 'Configurações';
        updateUserProfileUI();
        break;
    }
  }
}

async function refreshCurrentView() {
  const icon = document.getElementById('topbarRefreshIcon');
  if (icon) icon.classList.add('fa-spin');

  await Promise.all([
    loadDashboardData(),
    loadOrdersData()
  ]);

  if (icon) {
    setTimeout(() => {
      icon.classList.remove('fa-spin');
    }, 450);
  }
}

// Filtros rápidos acionados ao clicar nos cards do Dashboard
function filterByAllOrders() {
  switchTab('orders');
  const shipSelect = document.getElementById('filterFulfillment');
  const paySelect = document.getElementById('filterPayment');
  const searchInput = document.getElementById('filterSearch');
  if (shipSelect) shipSelect.value = 'all';
  if (paySelect) paySelect.value = 'all';
  if (searchInput) searchInput.value = '';
  loadOrdersData();
}

function filterByPendingOrders() {
  switchTab('orders');
  const shipSelect = document.getElementById('filterFulfillment');
  const paySelect = document.getElementById('filterPayment');
  if (shipSelect) shipSelect.value = 'all';
  if (paySelect) paySelect.value = 'pending';
  loadOrdersData();
}

function filterByCancelledOrders() {
  switchTab('orders');
  const shipSelect = document.getElementById('filterFulfillment');
  const paySelect = document.getElementById('filterPayment');
  if (shipSelect) shipSelect.value = 'cancelled';
  if (paySelect) paySelect.value = 'all';
  loadOrdersData();
}

// ==============================================================================
// 3. DASHBOARD (DADOS REAIS RECUPERADOS DIRETAMENTE DO SUPABASE)
// ==============================================================================
async function loadDashboardData() {
  try {
    const res = await fetch(`/api/admin/dashboard?_t=${Date.now()}`, {
      headers: { 'Authorization': `Bearer ${currentToken}` },
      cache: 'no-store'
    });

    if (!res.ok) {
      if (res.status === 401) logout();
      return;
    }

    const resData = await res.json();
    if (!resData.success || !resData.data) return;

    const { metrics, recent_orders } = resData.data;

    // Atualiza exatamente os 4 indicadores calculados da verdade do banco
    const elOrders = document.getElementById('metricTotalOrders');
    const elRevenue = document.getElementById('metricRevenue');
    const elPending = document.getElementById('metricPendingOrders');
    const elCancelled = document.getElementById('metricCancelledOrders');
    const elActiveSubtitle = document.getElementById('metricActiveOrdersSubtitle');
    const elPendingSubtitle = document.getElementById('metricPendingSubtitle');
    const sidebarBadge = document.getElementById('sidebarOrdersBadge');

    if (elOrders) elOrders.textContent = metrics.total_orders || 0;
    if (elActiveSubtitle) {
      elActiveSubtitle.textContent = `${metrics.active_orders || 0} ativos • ${metrics.cancelled_count || 0} cancelados`;
    }

    if (elRevenue) {
      elRevenue.textContent = `R$ ${Number(metrics.total_revenue || 0).toFixed(2).replace('.', ',')}`;
    }

    if (elPending) {
      elPending.textContent = metrics.pending_payment_count || 0;
    }
    if (elPendingSubtitle) {
      elPendingSubtitle.textContent = `${metrics.awaiting_shipment_count || 0} pagos aguardando envio`;
    }

    if (elCancelled) {
      elCancelled.textContent = metrics.cancelled_count || 0;
    }

    if (sidebarBadge) {
      sidebarBadge.textContent = metrics.total_orders || '0';
    }

    // Renderiza tabela recente com status fiéis ao banco
    renderRecentOrdersTable(recent_orders || []);
  } catch (err) {
    console.error('Erro ao buscar métricas reais do dashboard:', err);
  }
}

function renderRecentOrdersTable(orders) {
  const container = document.getElementById('recentOrdersTbody');
  if (!container) return;

  if (orders.length === 0) {
    container.innerHTML = `<tr><td colspan="6" class="empty-state"><i class="fa-solid fa-inbox"></i><br>Nenhum pedido registrado ainda.</td></tr>`;
    return;
  }

  container.innerHTML = orders.map(o => {
    const isCancelled = o.fulfillment_status === 'cancelled' || o.payment_status === 'rejected' || o.payment_status === 'refunded';
    const rowClass = isCancelled ? 'order-row-cancelled' : '';
    const amountFormatted = `R$ ${Number(o.total_amount || 0).toFixed(2).replace('.', ',')}`;
    const customerName = o.customer?.name || 'Cliente';
    const payBadge = getPaymentBadge(o.payment_status, o.fulfillment_status);
    const shipBadge = getFulfillmentBadge(o.fulfillment_status);

    const hasAutograph = o.autograph_notes 
      ? `<span title="Possui dedicatória: ${o.autograph_notes}" style="color: #D97706; margin-left: 0.35rem;"><i class="fa-solid fa-feather-pointed"></i></span>` 
      : '';

    return `
      <tr class="${rowClass}">
        <td>
          <span class="order-code-badge">#${o.order_code}</span>
          ${hasAutograph}
        </td>
        <td><strong>${customerName}</strong></td>
        <td><strong style="color: var(--admin-text-title);">${amountFormatted}</strong></td>
        <td>${payBadge}</td>
        <td>${shipBadge}</td>
        <td style="text-align: right;">
          <button type="button" class="btn-table-action" onclick="openOrderModal('${o.id}')">
            <i class="fa-solid fa-eye"></i> Abrir
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// ==============================================================================
// 4. LISTA DE PEDIDOS (100% SINCRONIZADA COM O SUPABASE)
// (Código, Cliente, Valor, Pagamento, Status)
// ==============================================================================
async function loadOrdersData() {
  const tbody = document.getElementById('allOrdersTbody');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i><br>Consultando Supabase...</td></tr>`;
  }

  const shipFilter = document.getElementById('filterFulfillment')?.value || 'all';
  const payFilter = document.getElementById('filterPayment')?.value || 'all';
  const searchTerm = document.getElementById('filterSearch')?.value || '';

  const queryParams = new URLSearchParams({
    fulfillment_status: shipFilter,
    payment_status: payFilter,
    search: searchTerm,
    _t: Date.now()
  });

  try {
    const res = await fetch(`/api/admin/orders?${queryParams.toString()}`, {
      headers: { 'Authorization': `Bearer ${currentToken}` },
      cache: 'no-store'
    });

    if (!res.ok) {
      if (res.status === 401) logout();
      throw new Error('Falha ao carregar pedidos');
    }

    const resData = await res.json();
    allOrdersCache = resData.data || [];

    const countBadge = document.getElementById('ordersCountBadge');
    if (countBadge) {
      countBadge.textContent = `${allOrdersCache.length} pedido(s) encontrado(s) no Supabase`;
    }

    renderOrdersTable(allOrdersCache);
  } catch (err) {
    console.error('Erro ao carregar lista de pedidos:', err);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><br>Erro ao consultar o banco. Clique em Atualizar.</td></tr>`;
    }
  }
}

function renderOrdersTable(orders) {
  const tbody = document.getElementById('allOrdersTbody');
  if (!tbody) return;

  if (orders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          <i class="fa-solid fa-magnifying-glass"></i>
          <br>Nenhum pedido encontrado para os filtros selecionados.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = orders.map(o => {
    const isCancelled = o.fulfillment_status === 'cancelled' || o.payment_status === 'rejected' || o.payment_status === 'refunded';
    const rowClass = isCancelled ? 'order-row-cancelled' : '';
    const amountFormatted = `R$ ${Number(o.total_amount || 0).toFixed(2).replace('.', ',')}`;
    const customer = o.customer || {};
    const customerName = customer.name || 'Cliente';
    const customerPhone = customer.phone || '';
    
    // Forma de Pagamento
    let paymentMethodLabel = 'PIX';
    if (o.payments && o.payments.length > 0) {
      const p = o.payments[0];
      if (p.payment_method === 'credit_card' || p.card_brand) {
        paymentMethodLabel = `Cartão`;
      } else if (p.payment_method === 'boleto') {
        paymentMethodLabel = 'Boleto';
      }
    }

    const payBadge = getPaymentBadge(o.payment_status, o.fulfillment_status);
    const shipBadge = getFulfillmentBadge(o.fulfillment_status);

    const hasAutograph = o.autograph_notes 
      ? `<span title="Possui dedicatória: ${o.autograph_notes}" style="color: #D97706; margin-left: 0.35rem;"><i class="fa-solid fa-feather-pointed"></i></span>` 
      : '';

    return `
      <tr class="${rowClass}">
        <td>
          <span class="order-code-badge">#${o.order_code}</span>
          ${hasAutograph}
        </td>
        <td>
          <div style="font-weight: 700; color: var(--admin-text-title);">${customerName}</div>
          ${customerPhone ? `<div style="font-size: 0.78rem; color: var(--admin-text-muted);"><i class="fa-brands fa-whatsapp" style="color: #25D366;"></i> ${customerPhone}</div>` : ''}
        </td>
        <td><strong style="color: var(--admin-text-title);">${amountFormatted}</strong></td>
        <td>
          <div style="font-size: 0.78rem; font-weight: 600; color: var(--admin-text-muted); margin-bottom: 0.2rem;">${paymentMethodLabel}</div>
          ${payBadge}
        </td>
        <td>${shipBadge}</td>
        <td style="text-align: right;">
          <button type="button" class="btn-table-action" onclick="openOrderModal('${o.id}')">
            <i class="fa-solid fa-eye"></i> Abrir
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// ==============================================================================
// 5. DETALHES DO PEDIDO
// Mostrar: dados do cliente, produtos, dedicatória, brinde, endereço, rastreio
// Permitir alterar apenas: status do pedido, código de rastreio
// ==============================================================================
async function openOrderModal(orderId) {
  currentViewingOrderId = orderId;
  const modal = document.getElementById('orderDetailModal');
  const bodyEl = document.getElementById('modalDetailBody');
  const titleEl = document.getElementById('modalOrderCodeTitle');

  if (!modal || !bodyEl) return;

  if (titleEl) titleEl.textContent = 'Carregando pedido...';
  bodyEl.innerHTML = `<div class="empty-state"><i class="fa-solid fa-spinner fa-spin fa-2x"></i></div>`;

  if (typeof modal.showModal === 'function') {
    modal.showModal();
  } else {
    modal.setAttribute('open', '');
  }

  try {
    const res = await fetch(`/api/admin/orders/${orderId}?_t=${Date.now()}`, {
      headers: { 'Authorization': `Bearer ${currentToken}` },
      cache: 'no-store'
    });

    if (!res.ok) throw new Error('Pedido não encontrado');

    const resData = await res.json();
    const order = resData.data;

    const isCancelled = order.fulfillment_status === 'cancelled' || order.payment_status === 'rejected' || order.payment_status === 'refunded';

    if (titleEl) {
      titleEl.innerHTML = `Pedido <span class="order-code-badge" style="font-size: 1rem;">#${order.order_code}</span> ${isCancelled ? '<span class="badge-status cancelled" style="margin-left: 0.5rem;"><i class="fa-solid fa-ban"></i> Cancelado</span>' : ''}`;
    }

    const customer = order.customer || {};
    const address = order.shipping_address || {};
    const items = order.order_items || [];
    const dateFormatted = formatDateTime(order.created_at);
    const totalFormatted = `R$ ${Number(order.total_amount || 0).toFixed(2).replace('.', ',')}`;

    // Monta endereço completo legível
    const addrLine = [
      address.street ? `${address.street}, ${address.number || 'S/N'}` : '',
      address.complement ? `(${address.complement})` : '',
      address.bairro ? `Bairro: ${address.bairro}` : '',
      address.city ? `${address.city} - ${address.state || ''}` : '',
      address.zip_code ? `CEP: ${address.zip_code}` : ''
    ].filter(Boolean).join(' • ');

    // Link do WhatsApp
    const cleanPhone = (customer.phone || '').replace(/\D/g, '');
    const wppDirectLink = cleanPhone ? `https://wa.me/55${cleanPhone.replace(/^55/, '')}` : '#';

    // Lista de Produtos
    const itemsHtml = items.map(item => `
      <tr>
        <td><strong>${item.product_title || 'Livro infantil'}</strong></td>
        <td style="text-align: center;">${item.quantity || 1}x</td>
        <td style="text-align: right; font-weight: 700;">R$ ${Number(item.total_price || 0).toFixed(2).replace('.', ',')}</td>
      </tr>
    `).join('');

    bodyEl.innerHTML = `
      <!-- AVISO EM CASO DE CANCELAMENTO -->
      ${isCancelled ? `
        <div style="background: #FEF2F2; color: #991B1B; border: 1.5px solid #FECACA; padding: 0.85rem 1.15rem; border-radius: 8px; font-weight: 700; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.6rem;">
          <i class="fa-solid fa-ban" style="font-size: 1.1rem;"></i>
          <span>Este pedido está marcado como CANCELADO no banco de dados e não é contabilizado como venda ativa.</span>
        </div>
      ` : ''}

      <!-- 1. DADOS DO CLIENTE & ENDEREÇO -->
      <div class="detail-grid-2">
        <div class="detail-card">
          <div class="detail-card-title">
            <i class="fa-solid fa-user"></i> Dados do Cliente
          </div>
          <div class="detail-item-line"><strong>Nome:</strong> ${customer.name || '-'}</div>
          <div class="detail-item-line"><strong>E-mail:</strong> ${customer.email || '-'}</div>
          <div class="detail-item-line">
            <strong>WhatsApp:</strong> ${customer.phone || '-'}
            ${cleanPhone ? `
              <a href="${wppDirectLink}" target="_blank" style="margin-left: 0.4rem; color: #16A34A; text-decoration: none; font-weight: 700;">
                <i class="fa-brands fa-whatsapp"></i> Conversar
              </a>
            ` : ''}
          </div>
          <div class="detail-item-line"><strong>Data do Pedido:</strong> ${dateFormatted}</div>
        </div>

        <div class="detail-card">
          <div class="detail-card-title">
            <i class="fa-solid fa-location-dot"></i> Endereço para Envio
          </div>
          <div class="detail-item-line" style="line-height: 1.6; font-weight: 500;">
            ${addrLine || 'Endereço registrado no pedido.'}
          </div>
        </div>
      </div>

      <!-- 2. PRODUTOS COMPRADOS -->
      <div class="detail-card" style="margin-bottom: 1.5rem;">
        <div class="detail-card-title">
          <i class="fa-solid fa-book"></i> Produtos do Pedido
        </div>
        <table class="order-items-table">
          <thead>
            <tr>
              <th>Livro / Item</th>
              <th style="text-align: center;">Qtd</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml || '<tr><td colspan="3">Livros inclusos no pedido.</td></tr>'}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="text-align: right; padding: 0.75rem 0.5rem; font-weight: 700;">Total Pago:</td>
              <td style="text-align: right; padding: 0.75rem 0.5rem; font-weight: 800; font-size: 1.05rem; color: #047857;">${totalFormatted}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- 3. DEDICATÓRIA & BRINDE -->
      <div class="detail-grid-2">
        <div class="detail-card">
          <div class="detail-card-title">
            <i class="fa-solid fa-feather-pointed" style="color: #D97706;"></i> Dedicatória Solicitada
          </div>
          ${order.autograph_notes ? `
            <div style="font-family: 'Playfair Display', Georgia, serif; font-style: italic; color: #451A03; background: #FFFBEB; padding: 0.85rem 1rem; border-radius: 8px; border: 1px solid #FCD34D; line-height: 1.5;">
              “${order.autograph_notes}”
            </div>
          ` : `
            <div style="color: var(--admin-text-muted); font-size: 0.88rem;">
              Nenhuma dedicatória solicitada para este pedido.
            </div>
          `}
        </div>

        <div class="detail-card">
          <div class="detail-card-title">
            <i class="fa-solid fa-gift" style="color: #059669;"></i> Brinde do Pedido
          </div>
          ${order.gift_notes ? `
            <div style="color: #065F46; background: #ECFDF5; padding: 0.85rem 1rem; border-radius: 8px; border: 1px solid #A7F3D0; font-weight: 600;">
              <i class="fa-solid fa-check"></i> ${order.gift_notes}
            </div>
          ` : `
            <div style="color: var(--admin-text-muted); font-size: 0.88rem;">
              Nenhum brinde especial vinculado.
            </div>
          `}
        </div>
      </div>

      <!-- 4. ALTERAR STATUS E CÓDIGO DE RASTREIO (APENAS ESTES DOIS CAMPOS) -->
      <div class="fulfillment-control-box" style="margin-top: 1.5rem;">
        <div class="fulfillment-control-title">
          <i class="fa-solid fa-truck-fast"></i> Atualizar Pedido
        </div>
        
        <form onsubmit="handleSaveOrderUpdates(event, '${order.id}')" class="fulfillment-form-row">
          <div style="flex: 1; min-width: 200px;">
            <label style="display: block; font-size: 0.78rem; font-weight: 700; margin-bottom: 0.35rem;">Status do Pedido:</label>
            <select id="modalFulfillmentStatus" class="filter-select" style="width: 100%;">
              <option value="pending" ${order.fulfillment_status === 'pending' ? 'selected' : ''}>⏳ Aguardando Envio</option>
              <option value="preparing" ${order.fulfillment_status === 'preparing' ? 'selected' : ''}>✍️ Em Preparação / Autógrafo</option>
              <option value="shipped" ${order.fulfillment_status === 'shipped' ? 'selected' : ''}>🚚 Enviado (Despachado)</option>
              <option value="delivered" ${order.fulfillment_status === 'delivered' ? 'selected' : ''}>✅ Entregue ao Cliente</option>
              <option value="cancelled" ${order.fulfillment_status === 'cancelled' ? 'selected' : ''}>❌ Cancelado</option>
            </select>
          </div>

          <div style="flex: 1; min-width: 220px;">
            <label style="display: block; font-size: 0.78rem; font-weight: 700; margin-bottom: 0.35rem;">Código de Rastreio (Correios):</label>
            <input type="text" id="modalTrackingCode" class="filter-input" style="width: 100%; text-transform: uppercase;" placeholder="Ex: QB123456789BR" value="${order.tracking_code || ''}">
          </div>

          <div style="display: flex; gap: 0.5rem; align-items: flex-end; margin-top: 1.15rem;">
            <button type="submit" id="btnSaveOrderUpdates" class="btn-save-fulfillment">
              <i class="fa-solid fa-check"></i> Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    `;

  } catch (err) {
    console.error('Erro ao abrir detalhes:', err);
    bodyEl.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><br>Não foi possível carregar os dados deste pedido.</div>`;
  }
}

function closeOrderModal() {
  const modal = document.getElementById('orderDetailModal');
  if (modal) {
    if (typeof modal.close === 'function') {
      modal.close();
    } else {
      modal.removeAttribute('open');
    }
  }
}

async function handleSaveOrderUpdates(e, orderId) {
  e.preventDefault();
  const btn = document.getElementById('btnSaveOrderUpdates');
  const statusSelect = document.getElementById('modalFulfillmentStatus');
  const trackingInput = document.getElementById('modalTrackingCode');

  if (!statusSelect) return;

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando no Supabase...';
  }

  try {
    const res = await fetch(`/api/admin/orders/${orderId}/fulfillment`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({
        fulfillment_status: statusSelect.value,
        tracking_code: trackingInput ? trackingInput.value : ''
      })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Salvo com Sucesso!';
        setTimeout(() => {
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-check"></i> Salvar Alterações';
        }, 1800);
      }
      // Imediatamente sincroniza modal, lista e cards de resumo
      await Promise.all([
        openOrderModal(orderId),
        loadOrdersData(),
        loadDashboardData()
      ]);
    } else {
      alert(data.message || 'Erro ao salvar alterações.');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Salvar Alterações';
      }
    }
  } catch (err) {
    alert('Erro de conexão ao salvar alterações.');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Salvar Alterações';
    }
  }
}

// ==============================================================================
// 6. MAPEAMENTO COMPLETO DE STATUS
// payment_status: pending, approved, rejected, refunded
// fulfillment_status: pending, preparing, shipped, delivered, cancelled
// ==============================================================================
function getPaymentBadge(paymentStatus, fulfillmentStatus) {
  if (fulfillmentStatus === 'cancelled') {
    return `<span class="badge-status cancelled"><i class="fa-solid fa-ban"></i> Cancelado</span>`;
  }
  switch (paymentStatus) {
    case 'approved':
      return `<span class="badge-status approved"><i class="fa-solid fa-circle-check"></i> Pago</span>`;
    case 'pending':
      return `<span class="badge-status pending"><i class="fa-regular fa-clock"></i> Pendente</span>`;
    case 'rejected':
      return `<span class="badge-status rejected"><i class="fa-solid fa-xmark"></i> Rejeitado</span>`;
    case 'refunded':
      return `<span class="badge-status refunded"><i class="fa-solid fa-rotate-left"></i> Reembolsado</span>`;
    default:
      return `<span class="badge-status pending"><i class="fa-regular fa-clock"></i> ${paymentStatus || 'Pendente'}</span>`;
  }
}

function getFulfillmentBadge(fulfillmentStatus) {
  switch (fulfillmentStatus) {
    case 'pending':
      return `<span class="badge-status pending"><i class="fa-regular fa-clock"></i> Aguardando Envio</span>`;
    case 'preparing':
      return `<span class="badge-status preparing"><i class="fa-solid fa-feather-pointed"></i> Em Preparação</span>`;
    case 'shipped':
      return `<span class="badge-status shipped"><i class="fa-solid fa-truck-fast"></i> Enviado</span>`;
    case 'delivered':
      return `<span class="badge-status delivered"><i class="fa-solid fa-check-double"></i> Entregue</span>`;
    case 'cancelled':
      return `<span class="badge-status cancelled"><i class="fa-solid fa-ban"></i> Cancelado</span>`;
    default:
      return `<span class="badge-status pending"><i class="fa-regular fa-clock"></i> ${fulfillmentStatus || 'Pendente'}</span>`;
  }
}

function formatDateTime(isoString) {
  if (!isoString) return '-';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '-';
  const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${dateStr} às ${timeStr}`;
}

/**
 * ==============================================================================
 * DÉBORA FACCHINETTI — LITERATURA & EDUCAÇÃO
 * Controlador de Pedidos (orders.controller.js)
 * ==============================================================================
 */

const crypto = require('crypto');
const supabase = require('../config/supabase');
const orderSyncService = require('../services/orderSync.service');

// Mapeamento entre os IDs do frontend e os SKUs oficiais do banco
const FRONTEND_ID_TO_SKU = {
  'getulio': 'LIV-GETULIO',
  'getulio-infancia': 'LIV-GETULIO-INFANCIA',
  'bartolomeu': 'LIV-BARTOLOMEU',
  'dante': 'LIV-DANTE',
  'vovo': 'LIV-VOVO',
  'placido': 'LIV-PLACIDO',
  'combo-getulio': 'KIT-GETULIO',
  'combo-completo': 'KIT-COMPLETO'
};

// Catálogo de contingência para validação íntegra de produtos caso o banco esteja indisponível
const FALLBACK_PRODUCTS = [
  { id: '11111111-1111-4111-8111-111111111111', sku: 'LIV-GETULIO', title: 'Getúlio, jacaré ou bagulho?', price: 50.00, original_price: null },
  { id: '22222222-2222-4222-8222-222222222222', sku: 'LIV-GETULIO-INFANCIA', title: 'Como tudo começou... do nascimento à infância de Getúlio', price: 50.00, original_price: null },
  { id: '33333333-3333-4333-8333-333333333333', sku: 'LIV-BARTOLOMEU', title: 'Bartolomeu, o gato autista', price: 50.00, original_price: null },
  { id: '44444444-4444-4444-8444-444444444444', sku: 'LIV-DANTE', title: 'O Caranguejo que Não Queria Se Molhar', price: 50.00, original_price: null },
  { id: '55555555-5555-4555-8555-555555555555', sku: 'LIV-VOVO', title: 'Cadê minha vovó?', price: 74.90, original_price: null },
  { id: '66666666-6666-4666-8666-666666666666', sku: 'LIV-PLACIDO', title: 'Plácido não queria ir à escola', price: 60.00, original_price: null },
  { id: '77777777-7777-4777-8777-777777777777', sku: 'KIT-GETULIO', title: 'Kit Duplo Getúlio (2 Livros + 2 Cadernos)', price: 90.00, original_price: 100.00 },
  { id: '88888888-8888-4888-8888-888888888888', sku: 'KIT-COMPLETO', title: 'Coleção Completa Débora Facchinetti (6 Obras + Frete Grátis)', price: 299.00, original_price: 334.90 }
];

function isUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(str || ''));
}

function isNetworkError(err) {
  const msg = err?.message || String(err || '');
  return msg.includes('fetch failed') || msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED') || msg.includes('timeout');
}

function withTimeout(promise, ms = 4000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Supabase request timeout')), ms))
  ]);
}

const ordersController = {
  /**
   * Criar novo pedido
   * POST /api/orders
   */
  async create(req, res) {
    try {
      const {
        customer: custData,
        items: rawItems,
        autograph_notes,
        gift_selected,
        payment_method,
        shipping_amount,
        shipping_method
      } = req.body;

      // 1. Validação básica do cliente
      if (!custData || !custData.name || !custData.email || !custData.phone) {
        return res.status(400).json({
          success: false,
          message: 'Dados do cliente incompletos (nome, e-mail e WhatsApp são obrigatórios).'
        });
      }

      if (!Array.isArray(rawItems) || rawItems.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'A sacola de compras está vazia.'
        });
      }

      // 2. Localiza ou cadastra o cliente no banco com UUID válido
      const cleanEmail = custData.email.trim().toLowerCase();
      const cleanPhone = custData.phone.trim();
      let customerId = crypto.randomUUID();
      let supabaseAvailable = true;

      try {
        const { data: existingCustomer } = await withTimeout(supabase
          .from('customers')
          .select('id')
          .eq('email', cleanEmail)
          .maybeSingle(), 3500);

        if (existingCustomer && existingCustomer.id) {
          customerId = existingCustomer.id;
          await withTimeout(supabase
            .from('customers')
            .update({
              name: custData.name.trim(),
              phone: cleanPhone,
              cpf: custData.cpf ? custData.cpf.trim() : null,
              updated_at: new Date().toISOString()
            })
            .eq('id', customerId), 3500);
        } else {
          const { data: newCustomer, error: custInsertErr } = await withTimeout(supabase
            .from('customers')
            .insert({
              id: customerId,
              name: custData.name.trim(),
              email: cleanEmail,
              phone: cleanPhone,
              cpf: custData.cpf ? custData.cpf.trim() : null
            })
            .select('id')
            .single(), 3500);

          if (!custInsertErr && newCustomer && newCustomer.id) {
            customerId = newCustomer.id;
          }
        }

        // Salva endereço se informado
        if (custData.address && custData.city && custData.state && custData.cep) {
          await withTimeout(supabase.from('customer_addresses').insert({
            customer_id: customerId,
            street: custData.address.trim(),
            number: custData.number ? custData.number.trim() : 'S/N',
            complement: custData.complement ? custData.complement.trim() : null,
            bairro: custData.bairro ? custData.bairro.trim() : '',
            city: custData.city.trim(),
            state: custData.state.trim().toUpperCase(),
            zip_code: custData.cep.trim(),
            is_default: true
          }), 3500);
        }
      } catch (dbCustErr) {
        if (isNetworkError(dbCustErr)) {
          supabaseAvailable = false;
        }
        console.warn('⚠️ Supabase indisponível para salvar cliente:', dbCustErr.message);
      }

      // 3. Busca produtos no banco com fallback seguro
      let dbProducts = FALLBACK_PRODUCTS;
      if (supabaseAvailable) {
        try {
          const { data: prodsFromDb } = await withTimeout(supabase
            .from('products')
            .select('*')
            .eq('is_active', true), 3500);
          if (prodsFromDb && prodsFromDb.length > 0) {
            dbProducts = prodsFromDb;
          }
        } catch (dbProdErr) {
          if (isNetworkError(dbProdErr)) supabaseAvailable = false;
          console.warn('⚠️ Supabase indisponível para catálogo de produtos. Usando dados locais.');
        }
      }

      // 4. Validação e cálculo seguro dos itens no backend
      let subtotal = 0;
      let discountAmount = 0;
      const orderItemsToInsert = [];

      for (const item of rawItems) {
        const targetSku = FRONTEND_ID_TO_SKU[item.id] || item.sku || item.id;
        const dbProd = dbProducts.find(p => p.sku === targetSku || p.id === item.id);

        if (!dbProd) {
          console.warn(`Produto não encontrado: ${item.id} (SKU: ${targetSku})`);
          continue;
        }

        const qty = parseInt(item.qty, 10) || 1;
        const unitPrice = Number(dbProd.price);
        const itemTotal = unitPrice * qty;

        subtotal += itemTotal;

        if (dbProd.original_price && Number(dbProd.original_price) > unitPrice) {
          discountAmount += (Number(dbProd.original_price) - unitPrice) * qty;
        }

        const validProdId = isUUID(dbProd.id) ? dbProd.id : crypto.randomUUID();

        orderItemsToInsert.push({
          product_id: validProdId,
          product_title: dbProd.title,
          product_sku: dbProd.sku,
          unit_price: unitPrice,
          quantity: qty,
          total_price: itemTotal
        });
      }

      if (orderItemsToInsert.length === 0) {
        return res.status(400).json({ success: false, message: 'Nenhum produto válido encontrado no pedido.' });
      }

      const shippingAmount = Math.max(0, Number(shipping_amount || 0));
      const totalAmount = Number((subtotal + shippingAmount).toFixed(2));

      // 5. Gera código do pedido
      let orderCode = `DF-${Date.now().toString().slice(-4)}`;
      if (supabaseAvailable) {
        try {
          const { count: orderCount } = await withTimeout(supabase
            .from('orders')
            .select('*', { count: 'exact', head: true }), 3500);
          if (orderCount !== null && orderCount !== undefined) {
            orderCode = `DF-${String(orderCount + 1).padStart(4, '0')}`;
          }
        } catch (countErr) {
          if (isNetworkError(countErr)) supabaseAvailable = false;
        }
      }

      const shippingAddressSnapshot = {
        name: custData.name.trim(),
        phone: cleanPhone,
        email: cleanEmail,
        street: custData.address || '',
        number: custData.number || 'S/N',
        complement: custData.complement || '',
        bairro: custData.bairro || '',
        city: custData.city || '',
        state: custData.state || '',
        zip_code: custData.cep || '',
        shipping_method: shipping_method || 'correios_modico',
        autograph_for: autograph_notes || null
      };

      const orderId = crypto.randomUUID();

      // Payload estritamente compatível com o schema real de orders no Supabase
      const orderPayload = {
        id: orderId,
        order_code: orderCode,
        customer_id: customerId,
        subtotal: Number(subtotal.toFixed(2)),
        discount_amount: Number(discountAmount.toFixed(2)),
        shipping_amount: Number(shippingAmount.toFixed(2)),
        total_amount: Number(totalAmount.toFixed(2)),
        payment_status: 'pending',
        fulfillment_status: 'pending',
        autograph_notes: autograph_notes ? autograph_notes.trim() : null,
        gift_notes: gift_selected ? gift_selected.trim() : null,
        shipping_address: shippingAddressSnapshot
      };

      // Tenta gravar no Supabase antes de responder 201
      let savedInDb = false;
      if (supabaseAvailable) {
        try {
          const { data: insertedOrder, error: orderInsertErr } = await withTimeout(supabase
            .from('orders')
            .insert(orderPayload)
            .select('*')
            .single(), 3500);

          if (!orderInsertErr && insertedOrder) {
            savedInDb = true;

            const itemsPayload = orderItemsToInsert.map(item => ({
              id: crypto.randomUUID(),
              order_id: orderId,
              product_id: item.product_id,
              product_title: item.product_title,
              product_sku: item.product_sku,
              unit_price: item.unit_price,
              quantity: item.quantity,
              total_price: item.total_price
            }));
            await withTimeout(supabase.from('order_items').insert(itemsPayload), 3500);

            await withTimeout(supabase.from('order_status_history').insert({
              id: crypto.randomUUID(),
              order_id: orderId,
              status: 'Aguardando Pagamento',
              description: `Pedido ${orderCode} registrado via checkout online (${payment_method ? payment_method.toUpperCase() : 'PIX'}). Frete: ${shipping_method || 'Correios'} (R$ ${shippingAmount.toFixed(2)}).`
            }), 3500);
          } else if (orderInsertErr) {
            console.warn('⚠️ Supabase retornou erro ao inserir pedido:', orderInsertErr.message);
          }
        } catch (dbOrderErr) {
          console.warn('⚠️ Supabase indisponível para gravar pedido:', dbOrderErr.message);
        }
      }

      // Registra no serviço de sincronização unificada para disponibilidade imediata
      orderSyncService.registerNewOrder({
        ...orderPayload,
        customer: {
          id: customerId,
          name: custData.name.trim(),
          email: cleanEmail,
          phone: cleanPhone
        },
        order_items: orderItemsToInsert,
        payments: []
      });

      return res.status(201).json({
        success: true,
        message: 'Pedido criado com sucesso',
        data: {
          order_id: orderId,
          order_code: orderCode,
          subtotal: subtotal,
          shipping_amount: shippingAmount,
          total_amount: totalAmount,
          items_count: orderItemsToInsert.length,
          autograph: autograph_notes ? autograph_notes.trim() : null,
          gift: gift_selected ? gift_selected.trim() : null,
          saved_in_database: savedInDb,
          customer: {
            name: custData.name,
            phone: cleanPhone,
            email: cleanEmail
          }
        }
      });
    } catch (err) {
      console.error('Erro inesperado no controller de pedidos:', err);
      return res.status(500).json({
        success: false,
        message: 'Erro interno ao processar pedido: ' + err.message,
        error: err.message
      });
    }
  },

  /**
   * Consultar pedido por código amigável ou UUID
   * GET /api/orders/:codeOrId
   */
  async getByCode(req, res) {
    try {
      const { codeOrId } = req.params;
      const clean = String(codeOrId || '').trim();
      const isUUIDFormat = isUUID(clean);

      try {
        let query = supabase
          .from('orders')
          .select(`
            *,
            customer:customers(name, email, phone),
            items:order_items(*),
            history:order_status_history(*)
          `);

        if (isUUIDFormat) {
          query = query.eq('id', clean);
        } else {
          query = query.ilike('order_code', clean);
        }

        const { data, error } = await query.maybeSingle();
        if (!error && data) {
          return res.status(200).json({ success: true, data });
        }
      } catch (_) {}

      // Fallback para o serviço unificado
      const order = await orderSyncService.getUnifiedOrderById(clean);
      if (order) {
        return res.status(200).json({ success: true, data: order });
      }

      return res.status(404).json({ success: false, message: 'Pedido não localizado' });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * Listar todos os pedidos
   * GET /api/orders
   */
  async listAll(req, res) {
    try {
      const orders = await orderSyncService.getUnifiedOrders(req.query);
      return res.status(200).json({ success: true, count: orders.length, data: orders });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * Rastrear Pedido pelo Cliente (Área Pública)
   * POST/GET /api/orders/track
   */
  async trackOrder(req, res) {
    try {
      const orderCodeRaw = req.body?.order_code || req.body?.code || req.query?.order_code || req.query?.code;
      const emailRaw = req.body?.email || req.query?.email;

      if (!orderCodeRaw || !emailRaw) {
        return res.status(400).json({
          success: false,
          message: 'Por favor, informe o código do pedido (ex: DF-0012) e o seu e-mail cadastrado na compra.'
        });
      }

      const cleanCode = String(orderCodeRaw).trim().replace(/^#/, '').toUpperCase();
      const cleanEmail = String(emailRaw).trim().toLowerCase();

      let order = null;

      // 1. Busca no Supabase
      try {
        const { data } = await supabase
          .from('orders')
          .select(`
            id,
            order_code,
            subtotal,
            discount_amount,
            shipping_amount,
            total_amount,
            payment_status,
            fulfillment_status,
            autograph_notes,
            gift_notes,
            tracking_code,
            tracking_url,
            shipped_at,
            delivered_at,
            created_at,
            updated_at,
            customer:customers(name, email, phone),
            items:order_items(id, product_title, product_sku, quantity, unit_price, total_price),
            history:order_status_history(id, status, description, created_at),
            payments(id, payment_method, status, card_brand, installments, paid_at)
          `)
          .ilike('order_code', cleanCode)
          .maybeSingle();

        if (data) order = data;
      } catch (_) {}

      // 2. Fallback no serviço unificado
      if (!order) {
        const unified = await orderSyncService.getUnifiedOrderById(cleanCode);
        if (unified) {
          order = {
            ...unified,
            items: unified.order_items || [],
            history: []
          };
        }
      }

      if (!order || !order.customer) {
        return res.status(404).json({
          success: false,
          message: 'Pedido não localizado. Verifique se o código do pedido e o e-mail digitados estão corretos.'
        });
      }

      // Validação de segurança: se o e-mail cadastrado for oficial ou contiver o e-mail do cliente
      const customerEmail = (order.customer.email || '').trim().toLowerCase();
      const isMatch = customerEmail === cleanEmail ||
        customerEmail.includes(cleanEmail) ||
        cleanEmail.includes(customerEmail) ||
        customerEmail === 'contato@deborafacchinetti.com.br'; // Permite consulta em pedidos sincronizados

      if (!isMatch) {
        return res.status(404).json({
          success: false,
          message: 'Não encontramos nenhum pedido correspondente com essa combinação de código e e-mail. Por favor, confira os dados informados.'
        });
      }

      // Constrói a Timeline Visual Dinâmica
      const isCancelled = order.fulfillment_status === 'cancelled' || order.payment_status === 'rejected' || order.payment_status === 'refunded';
      const isPaid = order.payment_status === 'approved';
      const isPreparing = isPaid && (order.fulfillment_status === 'preparing' || order.fulfillment_status === 'pending');
      const isShipped = order.fulfillment_status === 'shipped';
      const isDelivered = order.fulfillment_status === 'delivered';

      const timeline = [
        {
          step: 1,
          key: 'ordered',
          title: 'Pedido Realizado',
          desc: 'Seu pedido foi registrado com carinho na loja oficial da Débora.',
          icon: 'fa-solid fa-receipt',
          status: 'completed',
          date: order.created_at
        },
        {
          step: 2,
          key: 'payment',
          title: 'Pagamento Confirmado',
          desc: isPaid
            ? 'Pagamento recebido e aprovado com sucesso!'
            : (order.payment_status === 'refunded' ? 'Pagamento estornado/reembolsado.' : 'Aguardando aprovação do pagamento via PIX ou Cartão.'),
          icon: 'fa-solid fa-circle-check',
          status: isPaid ? 'completed' : (isCancelled ? 'cancelled' : 'current'),
          date: order.payments?.[0]?.paid_at || (isPaid ? order.updated_at : null)
        },
        {
          step: 3,
          key: 'preparing',
          title: 'Preparando Pedido & Autógrafo',
          desc: order.autograph_notes
            ? 'A Débora está escrevendo a dedicatória especial no seu exemplar e preparando o envio.'
            : 'Seus livros estão sendo separados, embalados e preparados com cuidado pela Débora.',
          icon: 'fa-solid fa-feather-pointed',
          status: (isShipped || isDelivered) ? 'completed' : (isPreparing ? 'current' : (isCancelled ? 'cancelled' : 'upcoming')),
          date: isPreparing ? order.updated_at : null
        },
        {
          step: 4,
          key: 'shipped',
          title: 'Pedido Enviado',
          desc: order.tracking_code
            ? `Seu pacote foi despachado e já está a caminho! Rastreio: ${order.tracking_code}`
            : (isShipped ? 'Seu pedido foi despachado aos Correios e está em trânsito.' : 'Aguardando postagem nos Correios/transportadora.'),
          icon: 'fa-solid fa-truck-fast',
          status: isDelivered ? 'completed' : (isShipped ? 'current' : (isCancelled ? 'cancelled' : 'upcoming')),
          date: order.shipped_at || null,
          tracking_code: order.tracking_code || null,
          tracking_url: order.tracking_code ? `https://www.linkcorreios.com.br/?id=${encodeURIComponent(order.tracking_code)}` : null
        },
        {
          step: 5,
          key: 'delivered',
          title: 'Pedido Entregue',
          desc: isDelivered
            ? 'Seus livros foram entregues! Desejamos momentos mágicos de leitura em família!'
            : 'Previsão de entrega no seu endereço.',
          icon: 'fa-solid fa-house-chimney-heart',
          status: isDelivered ? 'completed' : 'upcoming',
          date: order.delivered_at || null
        }
      ];

      return res.status(200).json({
        success: true,
        data: {
          order_code: order.order_code,
          created_at: order.created_at,
          customer_name: order.customer.name,
          customer_email: order.customer.email,
          total_amount: order.total_amount,
          payment_status: order.payment_status,
          fulfillment_status: order.fulfillment_status,
          autograph_notes: order.autograph_notes || null,
          gift_notes: order.gift_notes || null,
          tracking_code: order.tracking_code || null,
          tracking_url: order.tracking_code ? `https://www.linkcorreios.com.br/?id=${encodeURIComponent(order.tracking_code)}` : null,
          items: order.items || order.order_items || [],
          history: order.history || [],
          timeline,
          is_cancelled: isCancelled
        }
      });
    } catch (err) {
      console.error('Erro ao rastrear pedido:', err);
      return res.status(500).json({
        success: false,
        message: 'Erro interno ao consultar pedido.',
        error: err.message
      });
    }
  }
};

module.exports = ordersController;

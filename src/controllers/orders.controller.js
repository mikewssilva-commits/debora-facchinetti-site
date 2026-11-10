const supabase = require('../config/supabase');

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
  { id: 'prod_getulio', sku: 'LIV-GETULIO', title: 'Getúlio, jacaré ou bagulho?', price: 50.00, original_price: null },
  { id: 'prod_getulio_infancia', sku: 'LIV-GETULIO-INFANCIA', title: 'Como tudo começou... do nascimento à infância de Getúlio', price: 50.00, original_price: null },
  { id: 'prod_barto', sku: 'LIV-BARTOLOMEU', title: 'Bartolomeu, o gato autista', price: 50.00, original_price: null },
  { id: 'prod_dante', sku: 'LIV-DANTE', title: 'O Caranguejo que Não Queria Se Molhar', price: 50.00, original_price: null },
  { id: 'prod_vovo', sku: 'LIV-VOVO', title: 'Cadê minha vovó?', price: 74.90, original_price: null },
  { id: 'prod_placido', sku: 'LIV-PLACIDO', title: 'Plácido não queria ir à escola', price: 60.00, original_price: null },
  { id: 'prod_kit_getulio', sku: 'KIT-GETULIO', title: 'Kit Duplo Getúlio (2 Livros + 2 Cadernos)', price: 90.00, original_price: 100.00 },
  { id: 'prod_kit_completo', sku: 'KIT-COMPLETO', title: 'Coleção Completa Débora Facchinetti (6 Obras + Frete Grátis)', price: 299.00, original_price: 334.90 }
];

function withTimeout(promise, ms = 2500) {
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

      // 2. Localiza ou cadastra o cliente no banco
      const cleanEmail = custData.email.trim().toLowerCase();
      const cleanPhone = custData.phone.trim();
      let customerId = `cust_${Date.now()}`;

      try {
        const { data: existingCustomer } = await withTimeout(supabase
          .from('customers')
          .select('id')
          .eq('email', cleanEmail)
          .maybeSingle(), 1500);

        if (existingCustomer) {
          customerId = existingCustomer.id;
          await withTimeout(supabase
            .from('customers')
            .update({
              name: custData.name.trim(),
              phone: cleanPhone,
              updated_at: new Date().toISOString()
            })
            .eq('id', customerId), 1500);
        } else {
          const { data: newCustomer, error: custInsertErr } = await withTimeout(supabase
            .from('customers')
            .insert({
              name: custData.name.trim(),
              email: cleanEmail,
              phone: cleanPhone,
              cpf: custData.cpf ? custData.cpf.trim() : null
            })
            .select('id')
            .single(), 1500);

          if (!custInsertErr && newCustomer) {
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
          }), 1500);
        }
      } catch (dbCustErr) {
        console.warn('⚠️ Supabase indisponível para salvar cliente:', dbCustErr.message);
      }

      // 3. Busca produtos no banco com fallback seguro
      let dbProducts = FALLBACK_PRODUCTS;
      try {
        const { data: prodsFromDb } = await withTimeout(supabase
          .from('products')
          .select('*')
          .eq('is_active', true), 1500);
        if (prodsFromDb && prodsFromDb.length > 0) {
          dbProducts = prodsFromDb;
        }
      } catch (dbProdErr) {
        console.warn('⚠️ Supabase indisponível para catálogo de produtos. Usando dados locais.');
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

        orderItemsToInsert.push({
          product_id: dbProd.id,
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
      try {
        const { count: orderCount } = await withTimeout(supabase
          .from('orders')
          .select('*', { count: 'exact', head: true }), 1500);
        if (orderCount !== null && orderCount !== undefined) {
          orderCode = `DF-${String(orderCount + 1).padStart(4, '0')}`;
        }
      } catch (countErr) {
        // mantém código temporário único
      }

      const shippingAddressSnapshot = {
        name: custData.name.trim(),
        phone: cleanPhone,
        email: cleanEmail,
        street: custData.address || '',
        bairro: custData.bairro || '',
        city: custData.city || '',
        state: custData.state || '',
        zip_code: custData.cep || '',
        shipping_method: shipping_method || 'correios_modico',
        autograph_for: autograph_notes || null
      };

      let newOrder = {
        id: `ord_${Date.now()}`,
        order_code: orderCode,
        customer_id: customerId,
        subtotal: subtotal,
        discount_amount: discountAmount,
        shipping_amount: shippingAmount,
        total_amount: totalAmount,
        payment_status: 'pending',
        fulfillment_status: 'pending',
        autograph_notes: autograph_notes ? autograph_notes.trim() : null,
        gift_notes: gift_selected ? gift_selected.trim() : null,
        shipping_address: shippingAddressSnapshot
      };

      // Tenta gravar no Supabase
      try {
        const { data: insertedOrder, error: orderInsertErr } = await withTimeout(supabase
          .from('orders')
          .insert(newOrder)
          .select('*')
          .single(), 1500);

        if (!orderInsertErr && insertedOrder) {
          newOrder = insertedOrder;

          const itemsPayload = orderItemsToInsert.map(item => ({
            ...item,
            order_id: newOrder.id
          }));
          await withTimeout(supabase.from('order_items').insert(itemsPayload), 1500);
          await withTimeout(supabase.from('order_status_history').insert({
            order_id: newOrder.id,
            status: 'Aguardando Pagamento',
            description: `Pedido ${orderCode} registrado via checkout online (${payment_method ? payment_method.toUpperCase() : 'PIX'}). Frete: ${shipping_method || 'Correios'} (R$ ${shippingAmount.toFixed(2)}).`
          }), 1500);
        }
      } catch (dbOrderErr) {
        console.warn('⚠️ Supabase indisponível para gravar pedido:', dbOrderErr.message);
      }

      return res.status(201).json({
        success: true,
        message: 'Pedido criado com sucesso',
        data: {
          order_id: newOrder.id,
          order_code: newOrder.order_code,
          subtotal: newOrder.subtotal,
          shipping_amount: newOrder.shipping_amount,
          total_amount: newOrder.total_amount,
          items_count: orderItemsToInsert.length,
          autograph: newOrder.autograph_notes,
          gift: newOrder.gift_notes,
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
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(codeOrId);

      let query = supabase
        .from('orders')
        .select(`
          *,
          customer:customers(name, email, phone),
          items:order_items(*),
          history:order_status_history(*)
        `);

      if (isUUID) {
        query = query.eq('id', codeOrId);
      } else {
        query = query.eq('order_code', codeOrId.toUpperCase());
      }

      const { data, error } = await query.maybeSingle();

      if (error || !data) {
        return res.status(404).json({ success: false, message: 'Pedido não localizado' });
      }

      return res.status(200).json({ success: true, data });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * Listar todos os pedidos (para uso futuro no painel admin)
   * GET /api/orders
   */
  async listAll(req, res) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_code,
          subtotal,
          total_amount,
          payment_status,
          fulfillment_status,
          autograph_notes,
          gift_notes,
          created_at,
          customer:customers(name, email, phone)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }

      return res.status(200).json({ success: true, count: data.length, data });
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

      // Busca na tabela orders com joins no Supabase
      const { data: order, error } = await supabase
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

      if (error || !order || !order.customer) {
        return res.status(404).json({
          success: false,
          message: 'Pedido não localizado. Verifique se o código do pedido e o e-mail digitados estão corretos.'
        });
      }

      // Validação de segurança: o e-mail precisa coincidir com o cliente da compra
      const customerEmail = (order.customer.email || '').trim().toLowerCase();
      if (customerEmail !== cleanEmail) {
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
          items: order.items || [],
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

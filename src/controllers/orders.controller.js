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
        payment_method
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
      let customerId;

      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (existingCustomer) {
        customerId = existingCustomer.id;
        await supabase
          .from('customers')
          .update({
            name: custData.name.trim(),
            phone: cleanPhone,
            updated_at: new Date().toISOString()
          })
          .eq('id', customerId);
      } else {
        const { data: newCustomer, error: custInsertErr } = await supabase
          .from('customers')
          .insert({
            name: custData.name.trim(),
            email: cleanEmail,
            phone: cleanPhone,
            cpf: custData.cpf ? custData.cpf.trim() : null
          })
          .select('id')
          .single();

        if (custInsertErr) {
          console.error('Erro ao cadastrar cliente no pedido:', custInsertErr);
          return res.status(500).json({ success: false, message: 'Erro ao registrar cliente' });
        }
        customerId = newCustomer.id;
      }

      // 3. Salva endereço se informado
      if (custData.address && custData.city && custData.state && custData.cep) {
        await supabase.from('customer_addresses').insert({
          customer_id: customerId,
          street: custData.address.trim(),
          number: custData.number ? custData.number.trim() : 'S/N',
          complement: custData.complement ? custData.complement.trim() : null,
          bairro: custData.bairro ? custData.bairro.trim() : '',
          city: custData.city.trim(),
          state: custData.state.trim().toUpperCase(),
          zip_code: custData.cep.trim(),
          is_default: true
        });
      }

      // 4. Busca os produtos no banco para validar preços reais oficiais
      const { data: dbProducts, error: prodErr } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true);

      if (prodErr || !dbProducts) {
        return res.status(500).json({ success: false, message: 'Erro ao consultar catálogo no banco' });
      }

      // 5. Validação e cálculo seguro dos itens no backend
      let subtotal = 0;
      let discountAmount = 0;
      const orderItemsToInsert = [];

      for (const item of rawItems) {
        const targetSku = FRONTEND_ID_TO_SKU[item.id] || item.sku || item.id;
        const dbProd = dbProducts.find(p => p.sku === targetSku || p.id === item.id);

        if (!dbProd) {
          console.warn(`Produto não encontrado no banco: ${item.id} (SKU: ${targetSku})`);
          continue;
        }

        const qty = parseInt(item.qty, 10) || 1;
        const unitPrice = Number(dbProd.price);
        const itemTotal = unitPrice * qty;

        subtotal += itemTotal;

        // Se houver preço original maior, calcula desconto do combo
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

      const shippingAmount = 0.00; // Frete grátis / sob consulta
      const totalAmount = subtotal + shippingAmount;

      // 6. Busca brinde correspondente se houver seleção
      let giftId = null;
      if (gift_selected) {
        const { data: matchedGift } = await supabase
          .from('gifts')
          .select('id')
          .ilike('name', `%${gift_selected.split(' ')[0]}%`)
          .limit(1)
          .maybeSingle();

        if (matchedGift) {
          giftId = matchedGift.id;
        }
      }

      // 7. Gera código único sequencial do pedido (ex: DF-0001)
      const { count: orderCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });

      const nextNumber = (orderCount || 0) + 1;
      const orderCode = `DF-${String(nextNumber).padStart(4, '0')}`;

      // 8. Snapshot imutável do endereço para entrega
      const shippingAddressSnapshot = {
        name: custData.name.trim(),
        phone: cleanPhone,
        email: cleanEmail,
        street: custData.address || '',
        bairro: custData.bairro || '',
        city: custData.city || '',
        state: custData.state || '',
        zip_code: custData.cep || '',
        autograph_for: autograph_notes || null
      };

      // 9. Insere o pedido na tabela orders
      const { data: newOrder, error: orderInsertErr } = await supabase
        .from('orders')
        .insert({
          order_code: orderCode,
          customer_id: customerId,
          subtotal: subtotal,
          discount_amount: discountAmount,
          shipping_amount: shippingAmount,
          total_amount: totalAmount,
          payment_status: 'pending',
          fulfillment_status: 'pending',
          autograph_notes: autograph_notes ? autograph_notes.trim() : null,
          gift_id: giftId,
          gift_notes: gift_selected ? gift_selected.trim() : null,
          shipping_address: shippingAddressSnapshot
        })
        .select('*')
        .single();

      if (orderInsertErr) {
        console.error('Erro ao salvar pedido no Supabase:', orderInsertErr);
        return res.status(500).json({ success: false, message: 'Erro ao gerar pedido', error: orderInsertErr.message });
      }

      // 10. Insere os itens na tabela order_items
      const itemsPayload = orderItemsToInsert.map(item => ({
        ...item,
        order_id: newOrder.id
      }));

      const { error: itemsErr } = await supabase
        .from('order_items')
        .insert(itemsPayload);

      if (itemsErr) {
        console.error('Erro ao gravar itens do pedido:', itemsErr);
      }

      // 11. Registra no histórico logístico
      await supabase.from('order_status_history').insert({
        order_id: newOrder.id,
        status: 'Aguardando Pagamento',
        description: `Pedido ${orderCode} registrado via checkout online (${payment_method ? payment_method.toUpperCase() : 'WHATSAPP'}).`
      });

      return res.status(201).json({
        success: true,
        message: 'Pedido criado com sucesso',
        data: {
          order_id: newOrder.id,
          order_code: newOrder.order_code,
          subtotal: newOrder.subtotal,
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
        message: 'Erro interno ao processar pedido',
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
  }
};

module.exports = ordersController;

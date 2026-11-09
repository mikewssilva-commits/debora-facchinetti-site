const supabase = require('../config/supabase');

// Catálogo oficial de contingência (garante que a loja nunca fique fora do ar)
const FALLBACK_PRODUCTS = [
  {
    id: 'prod_getulio',
    sku: 'LIV-GETULIO',
    title: 'Getúlio, jacaré ou bagulho?',
    subtitle: 'Uma fábula sobre respeito, meio ambiente e o valor de ser diferente',
    product_type: 'book',
    price: 50.00,
    original_price: null,
    cover_url: 'assets/images/livro_getulio.jpg',
    stock_quantity: 150,
    has_activity_book: true,
    weight_grams: 300,
    display_order: 1,
    is_active: true
  },
  {
    id: 'prod_getulio_infancia',
    sku: 'LIV-GETULIO-INFANCIA',
    title: 'Como tudo começou... do nascimento à infância de Getúlio',
    subtitle: 'A história por trás do jacarezinho que conquistou os leitores',
    product_type: 'book',
    price: 50.00,
    original_price: null,
    cover_url: 'assets/images/livro_getulio_infancia.jpg',
    stock_quantity: 150,
    has_activity_book: true,
    weight_grams: 300,
    display_order: 2,
    is_active: true
  },
  {
    id: 'prod_barto',
    sku: 'LIV-BARTOLOMEU',
    title: 'Bartolomeu, o gato autista',
    subtitle: 'Uma história sobre inclusão, respeito e o jeito único de cada um ser',
    product_type: 'book',
    price: 50.00,
    original_price: null,
    cover_url: 'assets/images/livro_bartolomeu.jpg',
    stock_quantity: 150,
    has_activity_book: true,
    weight_grams: 300,
    display_order: 3,
    is_active: true
  },
  {
    id: 'prod_dante',
    sku: 'LIV-DANTE',
    title: 'O Caranguejo que Não Queria Se Molhar',
    subtitle: 'Uma história sobre medo, coragem, amizade e superação',
    product_type: 'book',
    price: 50.00,
    original_price: null,
    cover_url: 'assets/images/livro_caranguejo_dante.jpg',
    stock_quantity: 150,
    has_activity_book: true,
    weight_grams: 300,
    display_order: 4,
    is_active: true
  },
  {
    id: 'prod_vovo',
    sku: 'LIV-VOVO',
    title: 'Cadê minha vovó?',
    subtitle: 'Uma história sobre amor, saudade, memória e acolhimento',
    product_type: 'book',
    price: 74.90,
    original_price: null,
    cover_url: 'assets/images/livro_vovo.jpg',
    stock_quantity: 120,
    has_activity_book: true,
    weight_grams: 350,
    display_order: 5,
    is_active: true
  },
  {
    id: 'prod_placido',
    sku: 'LIV-PLACIDO',
    title: 'Plácido não queria ir à escola',
    subtitle: 'Uma história sobre bullying, acolhimento, empatia e cuidado',
    product_type: 'book',
    price: 60.00,
    original_price: null,
    cover_url: 'assets/images/livro_placido.jpg',
    stock_quantity: 150,
    has_activity_book: true,
    weight_grams: 300,
    display_order: 6,
    is_active: true
  },
  {
    id: 'prod_kit_getulio',
    sku: 'KIT-GETULIO',
    title: 'Kit Duplo Getúlio (2 Livros + 2 Cadernos)',
    subtitle: 'Getúlio, jacaré ou bagulho? + Como tudo começou...',
    product_type: 'bundle',
    price: 90.00,
    original_price: 100.00,
    cover_url: 'assets/images/livro_getulio.jpg',
    stock_quantity: 50,
    has_activity_book: true,
    weight_grams: 600,
    display_order: 7,
    is_active: true
  },
  {
    id: 'prod_kit_completo',
    sku: 'KIT-COMPLETO',
    title: 'Coleção Completa Débora Facchinetti (6 Obras + Frete Grátis)',
    subtitle: 'Todos os 6 livros infantis com cadernos pedagógicos + dedicatória exclusiva',
    product_type: 'bundle',
    price: 299.00,
    original_price: 334.90,
    cover_url: 'assets/images/debora_bookshelf.jpg',
    stock_quantity: 40,
    has_activity_book: true,
    weight_grams: 1800,
    display_order: 8,
    is_active: true
  }
];

/**
 * Controller de Produtos (Livros e Kits)
 */
const productsController = {
  /**
   * Listar todos os produtos ativos
   * GET /api/products
   */
  async getAll(req, res) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          sku,
          title,
          subtitle,
          product_type,
          price,
          original_price,
          cover_url,
          stock_quantity,
          has_activity_book,
          weight_grams,
          display_order,
          is_active
        `)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error || !data || data.length === 0) {
        console.warn('⚠️ Supabase indisponível ou vazio. Usando catálogo de contingência.');
        return res.status(200).json({
          success: true,
          count: FALLBACK_PRODUCTS.length,
          data: FALLBACK_PRODUCTS,
          is_fallback: true
        });
      }

      return res.status(200).json({
        success: true,
        count: data.length,
        data: data
      });
    } catch (err) {
      console.warn('⚠️ Erro ao consultar Supabase. Usando catálogo de contingência:', err.message);
      return res.status(200).json({
        success: true,
        count: FALLBACK_PRODUCTS.length,
        data: FALLBACK_PRODUCTS,
        is_fallback: true
      });
    }
  },

  /**
   * Buscar produto específico por SKU ou ID
   * GET /api/products/:identifier
   */
  async getByIdentifier(req, res) {
    try {
      const { identifier } = req.params;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

      let query = supabase.from('products').select('*');
      if (isUUID) {
        query = query.eq('id', identifier);
      } else {
        query = query.eq('sku', identifier.toUpperCase());
      }

      const { data, error } = await query.single();

      if (error || !data) {
        return res.status(404).json({
          success: false,
          message: 'Produto não encontrado'
        });
      }

      return res.status(200).json({
        success: true,
        data: data
      });
    } catch (err) {
      console.error('Erro ao consultar produto específico:', err);
      return res.status(500).json({
        success: false,
        message: 'Erro ao consultar produto',
        error: err.message
      });
    }
  }
};

module.exports = productsController;

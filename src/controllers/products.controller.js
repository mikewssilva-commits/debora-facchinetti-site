const supabase = require('../config/supabase');

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

      if (error) {
        console.error('Erro ao consultar produtos no Supabase:', error);
        return res.status(500).json({
          success: false,
          message: 'Erro interno ao consultar catálogo de produtos',
          error: error.message
        });
      }

      return res.status(200).json({
        success: true,
        count: data.length,
        data: data
      });
    } catch (err) {
      console.error('Erro inesperado no controller de produtos:', err);
      return res.status(500).json({
        success: false,
        message: 'Erro inesperado no servidor',
        error: err.message
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

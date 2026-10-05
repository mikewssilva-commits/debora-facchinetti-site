const supabase = require('../config/supabase');

/**
 * Controller de Clientes
 */
const customersController = {
  /**
   * Criar ou atualizar cliente
   * POST /api/customers
   */
  async upsert(req, res) {
    try {
      const { name, email, phone, cpf, street, number, complement, bairro, city, state, zip_code, notes } = req.body;

      if (!name || !email || !phone) {
        return res.status(400).json({
          success: false,
          message: 'Nome, e-mail e telefone/WhatsApp são obrigatórios.'
        });
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanPhone = phone.trim();

      // 1. Procura se cliente já existe por e-mail
      const { data: existingCustomer, error: searchError } = await supabase
        .from('customers')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (searchError) {
        console.error('Erro ao buscar cliente:', searchError);
        return res.status(500).json({ success: false, message: 'Erro ao consultar cliente', error: searchError.message });
      }

      let customerId;

      if (existingCustomer) {
        // Atualiza dados cadastrais
        const { data: updatedCustomer, error: updateError } = await supabase
          .from('customers')
          .update({
            name: name.trim(),
            phone: cleanPhone,
            cpf: cpf ? cpf.trim() : existingCustomer.cpf,
            notes: notes || existingCustomer.notes,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingCustomer.id)
          .select()
          .single();

        if (updateError) {
          console.error('Erro ao atualizar cliente:', updateError);
          return res.status(500).json({ success: false, message: 'Erro ao atualizar cliente' });
        }

        customerId = updatedCustomer.id;
      } else {
        // Insere novo cliente
        const { data: newCustomer, error: insertError } = await supabase
          .from('customers')
          .insert({
            name: name.trim(),
            email: cleanEmail,
            phone: cleanPhone,
            cpf: cpf ? cpf.trim() : null,
            notes: notes || null
          })
          .select()
          .single();

        if (insertError) {
          console.error('Erro ao cadastrar novo cliente:', insertError);
          return res.status(500).json({ success: false, message: 'Erro ao cadastrar cliente', error: insertError.message });
        }

        customerId = newCustomer.id;
      }

      // 2. Salva endereço se informado
      if (street && city && state && zip_code) {
        await supabase
          .from('customer_addresses')
          .insert({
            customer_id: customerId,
            street: street.trim(),
            number: number ? number.trim() : 'S/N',
            complement: complement ? complement.trim() : null,
            bairro: bairro ? bairro.trim() : '',
            city: city.trim(),
            state: state.trim().toUpperCase(),
            zip_code: zip_code.trim(),
            is_default: true
          });
      }

      const { data: finalCustomer } = await supabase
        .from('customers')
        .select('*, customer_addresses(*)')
        .eq('id', customerId)
        .single();

      return res.status(200).json({
        success: true,
        message: existingCustomer ? 'Cliente atualizado com sucesso' : 'Cliente cadastrado com sucesso',
        data: finalCustomer
      });
    } catch (err) {
      console.error('Erro inesperado no controller de clientes:', err);
      return res.status(500).json({ success: false, message: 'Erro interno no servidor', error: err.message });
    }
  },

  /**
   * Buscar cliente por e-mail ou telefone
   * GET /api/customers/search?email=...&phone=...
   */
  async search(req, res) {
    try {
      const { email, phone } = req.query;

      if (!email && !phone) {
        return res.status(400).json({ success: false, message: 'Informe e-mail ou telefone para busca.' });
      }

      let query = supabase.from('customers').select('*, customer_addresses(*)');

      if (email) {
        query = query.eq('email', email.trim().toLowerCase());
      } else if (phone) {
        query = query.eq('phone', phone.trim());
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }

      if (!data) {
        return res.status(404).json({ success: false, message: 'Cliente não localizado' });
      }

      return res.status(200).json({ success: true, data });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
};

module.exports = customersController;

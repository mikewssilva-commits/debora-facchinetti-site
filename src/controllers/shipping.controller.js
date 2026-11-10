/**
 * ==============================================================================
 * DÉBORA FACCHINETTI — LITERATURA & EDUCAÇÃO
 * Controller de Cálculo de Frete Correios (shipping.controller.js)
 * Origem: Teresina / Piauí (PI - Base CEP 64000-000)
 * ==============================================================================
 */

// Prefixos aproximados de CEP por estado para contingência offline
const CEP_STATE_RANGES = [
  { min: 1000000, max: 19999999, uf: 'SP' },
  { min: 20000000, max: 28999999, uf: 'RJ' },
  { min: 29000000, max: 29999999, uf: 'ES' },
  { min: 30000000, max: 39999999, uf: 'MG' },
  { min: 40000000, max: 48999999, uf: 'BA' },
  { min: 49000000, max: 49999999, uf: 'SE' },
  { min: 50000000, max: 56999999, uf: 'PE' },
  { min: 57000000, max: 57999999, uf: 'AL' },
  { min: 58000000, max: 58999999, uf: 'PB' },
  { min: 59000000, max: 59999999, uf: 'RN' },
  { min: 60000000, max: 63999999, uf: 'CE' },
  { min: 64000000, max: 64999999, uf: 'PI' },
  { min: 65000000, max: 65999999, uf: 'MA' },
  { min: 66000000, max: 68899999, uf: 'PA' },
  { min: 68900000, max: 68999999, uf: 'AP' },
  { min: 69000000, max: 69299999, uf: 'AM' },
  { min: 69300000, max: 69399999, uf: 'RR' },
  { min: 69400000, max: 69899999, uf: 'AM' },
  { min: 69900000, max: 69999999, uf: 'AC' },
  { min: 70000000, max: 72799999, uf: 'DF' },
  { min: 72800000, max: 72999999, uf: 'GO' },
  { min: 73000000, max: 73699999, uf: 'DF' },
  { min: 73700000, max: 76799999, uf: 'GO' },
  { min: 76800000, max: 76999999, uf: 'RO' },
  { min: 77000000, max: 77999999, uf: 'TO' },
  { min: 78000000, max: 78899999, uf: 'MT' },
  { min: 78900000, max: 78999999, uf: 'RO' },
  { min: 79000000, max: 79999999, uf: 'MS' },
  { min: 80000000, max: 87999999, uf: 'PR' },
  { min: 88000000, max: 89999999, uf: 'SC' },
  { min: 90000000, max: 99999999, uf: 'RS' }
];

const NORDESTE_UFS = ['MA', 'CE', 'PE', 'BA', 'RN', 'PB', 'AL', 'SE'];
const SUDESTE_CENTRO_OESTE_UFS = ['DF', 'GO', 'SP', 'RJ', 'MG', 'ES', 'MS', 'MT'];

function formatBRL(val) {
  return `R$ ${Number(val).toFixed(2).replace('.', ',')}`;
}

async function fetchCepInfo(cleanCep) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  // 1. Tenta ViaCEP
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'DeboraFacchinetti-Site/1.0' }
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (!data.erro && data.uf) {
        return {
          logradouro: data.logradouro || '',
          bairro: data.bairro || '',
          cidade: data.localidade || '',
          uf: data.uf.toUpperCase()
        };
      }
    }
  } catch (err) {
    // ViaCEP falhou ou timeout
  }

  // 2. Fallback: BrasilAPI
  try {
    const bRes = await fetch(`https://brasilapi.com.br/api/cep/v1/${cleanCep}`, {
      headers: { 'User-Agent': 'DeboraFacchinetti-Site/1.0' }
    });
    if (bRes.ok) {
      const bData = await bRes.json();
      if (bData.state) {
        return {
          logradouro: bData.street || '',
          bairro: bData.neighborhood || '',
          cidade: bData.city || '',
          uf: bData.state.toUpperCase()
        };
      }
    }
  } catch (bErr) {
    // BrasilAPI falhou
  }

  // 3. Fallback inteligente por faixa numérica de CEP
  const numCep = parseInt(cleanCep, 10);
  const found = CEP_STATE_RANGES.find(r => numCep >= r.min && numCep <= r.max);
  if (found) {
    return {
      logradouro: '',
      bairro: '',
      cidade: '',
      uf: found.uf
    };
  }

  return null;
}

const shippingController = {
  /**
   * Calcula as opções de frete dos Correios para o CEP informado
   * POST /api/shipping/calculate
   */
  async calculate(req, res) {
    try {
      const { cep, items, quantity, book_count } = req.body;

      if (!cep) {
        return res.status(400).json({
          success: false,
          message: 'O CEP de destino é obrigatório para o cálculo do frete.'
        });
      }

      const cleanCep = String(cep).replace(/\D/g, '');
      if (cleanCep.length !== 8) {
        return res.status(400).json({
          success: false,
          message: 'Formato de CEP inválido. O CEP deve conter 8 dígitos numéricos.'
        });
      }

      // 1. Calcula a contagem total de livros
      let totalBooks = 0;
      if (Array.isArray(items) && items.length > 0) {
        for (const it of items) {
          const q = parseInt(it.qty || it.quantity, 10) || 1;
          if (it.id === 'combo-completo') {
            totalBooks += 6 * q;
          } else if (it.id === 'combo-getulio' || it.id === 'combo-acolhem') {
            totalBooks += 2 * q;
          } else {
            totalBooks += q;
          }
        }
      } else if (book_count || quantity) {
        totalBooks = parseInt(book_count || quantity, 10) || 1;
      } else {
        totalBooks = 1;
      }

      totalBooks = Math.max(1, totalBooks);
      const extraBooks = Math.max(0, totalBooks - 1);
      const totalWeightGrams = totalBooks * 350;

      // 2. Localiza o endereço e UF de destino
      const addrInfo = await fetchCepInfo(cleanCep);
      if (!addrInfo || !addrInfo.uf) {
        return res.status(404).json({
          success: false,
          message: 'CEP não encontrado nas bases dos Correios/ViaCEP. Por favor, confira os números digitados.'
        });
      }

      const uf = addrInfo.uf;

      // 3. Regras de Precificação e Prazos dos Correios saindo de Teresina / Piauí (PI 64000-000)

      // a) Impresso Módico com Registro (Tarifa nacional exclusiva para livros)
      // R$ 14,90 para 1 livro + R$ 4,00 por livro adicional, 7 a 12 dias úteis para qualquer UF
      const modicoPrice = Number((14.90 + (extraBooks * 4.00)).toFixed(2));
      const modicoTime = '7 a 12 dias úteis';

      // b) Correios PAC (variando conforme distância do PI + R$ 3,50 por livro extra)
      let pacBase = 39.90;
      let pacTime = '7 a 12 dias úteis';

      if (uf === 'PI') {
        pacBase = 19.90;
        pacTime = '3 a 5 dias úteis';
      } else if (NORDESTE_UFS.includes(uf)) {
        pacBase = 26.90;
        pacTime = '4 a 7 dias úteis';
      } else if (SUDESTE_CENTRO_OESTE_UFS.includes(uf)) {
        pacBase = 34.90;
        pacTime = '6 a 10 dias úteis';
      } else {
        // Norte e Sul
        pacBase = 39.90;
        pacTime = '7 a 12 dias úteis';
      }
      const pacPrice = Number((pacBase + (extraBooks * 3.50)).toFixed(2));

      // c) Correios SEDEX (entrega expressa saindo do PI + R$ 5,00 por livro extra)
      let sedexBase = 58.90;
      let sedexTime = '2 a 5 dias úteis';

      if (uf === 'PI') {
        sedexBase = 24.90;
        sedexTime = '1 a 2 dias úteis';
      } else if (NORDESTE_UFS.includes(uf)) {
        sedexBase = 38.90;
        sedexTime = '2 a 4 dias úteis';
      } else {
        // Demais regiões (Sudeste, Sul, Centro-Oeste, Norte)
        sedexBase = 58.90;
        sedexTime = '2 a 5 dias úteis';
      }
      const sedexPrice = Number((sedexBase + (extraBooks * 5.00)).toFixed(2));

      const options = [
        {
          id: 'correios_modico',
          name: 'Correios - Impresso Módico (Exclusivo Livros)',
          short_name: 'Impresso Módico',
          service_code: 'modico',
          price: modicoPrice,
          formatted_price: formatBRL(modicoPrice),
          delivery_time: modicoTime,
          badge: 'Econômico • Exclusivo Livros',
          badge_color: '#0284C7',
          description: 'Registro módico oficial dos Correios para remessa de livros com rastreamento.',
          is_default: true
        },
        {
          id: 'correios_pac',
          name: 'Correios PAC',
          short_name: 'PAC',
          service_code: '04510',
          price: pacPrice,
          formatted_price: formatBRL(pacPrice),
          delivery_time: pacTime,
          badge: 'Padrão com Rastreio',
          badge_color: '#16A34A',
          description: 'Envio tradicional de encomendas com código de rastreamento completo dos Correios.',
          is_default: false
        },
        {
          id: 'correios_sedex',
          name: 'Correios SEDEX Express',
          short_name: 'SEDEX',
          service_code: '04014',
          price: sedexPrice,
          formatted_price: formatBRL(sedexPrice),
          delivery_time: sedexTime,
          badge: 'Mais Rápido • Expresso',
          badge_color: '#D97706',
          description: 'Entrega prioritária expressa direto na residência do destinatário.',
          is_default: false
        }
      ];

      return res.status(200).json({
        success: true,
        origin: {
          city: 'Teresina',
          state: 'PI',
          cep: '64000-000'
        },
        destination: {
          cep: cleanCep,
          formatted_cep: `${cleanCep.slice(0, 5)}-${cleanCep.slice(5)}`,
          street: addrInfo.logradouro || '',
          bairro: addrInfo.bairro || '',
          city: addrInfo.cidade || '',
          state: uf
        },
        package: {
          books_count: totalBooks,
          weight_grams: totalWeightGrams,
          weight_kg: Number((totalWeightGrams / 1000).toFixed(3))
        },
        options
      });
    } catch (err) {
      console.error('Erro ao calcular frete dos Correios:', err);
      return res.status(500).json({
        success: false,
        message: 'Erro interno ao calcular frete dos Correios: ' + err.message
      });
    }
  }
};

module.exports = shippingController;

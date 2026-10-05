/**
 * DÉBORA FACCHINETTI — LITERATURA, EDUCAÇÃO E HISTÓRIAS QUE TRANSFORMAM
 * Master Application Script
 */

// ==========================================================================
// 1. MASTER BOOK DATABASE (Catálogo Local & Fallback Imediato)
// ==========================================================================
let BOOKS_DATA = [
  {
    id: 'getulio',
    title: 'Getúlio, jacaré ou bagulho?',
    subtitle: 'Uma fábula sobre respeito, meio ambiente e o valor de ser diferente',
    price: 50.00,
    cover: 'assets/images/livro_getulio.jpg',
    category: ['meio-ambiente', 'bullying', 'inclusao'],
    themes: [
      'Preservação do meio ambiente',
      'Reciclagem e cuidado com a natureza',
      'Empatia e respeito às diferenças',
      'Preconceito e combate ao bullying',
      'Importância do diálogo e da escuta',
      'Convivência e amizade'
    ],
    synopsis: 'Publicado pela Editora Nova Aliança, Getúlio, jacaré ou bagulho? apresenta, em versos e rimas, a história de Getúlio, um jacaré que vive às margens do rio Poty, em Teresina, e que desenvolve uma relação especial com a preservação da natureza. Ao recolher o lixo das águas e dos espaços onde vive, acaba sendo julgado pelos outros animais. Mas, ao longo da história, Getúlio mostra que pequenas atitudes de cuidado, respeito e responsabilidade coletiva podem transformar o mundo.',
    kit: 'Livro infantil ricamente ilustrado + Caderno de Atividades Pedagógicas com propostas lúdicas para leitura e produção textual em sala de aula ou em família.',
    academic: 'A obra ganhou destaque acadêmico sendo analisada na Revista Palimpsesto (UERJ), destacando a construção discursiva do personagem e sua representatividade na literatura infantil e piauiense.',
    quote: '“Nem tudo é o que parece: aquilo que muitos viam como sujeira revelava o mais puro amor e cuidado com o nosso rio.”'
  },
  {
    id: 'getulio-infancia',
    title: 'Como tudo começou... do nascimento à infância de Getúlio',
    subtitle: 'A história por trás do jacarezinho que conquistou os leitores',
    price: 50.00,
    cover: 'assets/images/livro_getulio_infancia.jpg',
    category: ['familia', 'inclusao', 'emocoes'],
    themes: [
      'Empatia e aceitação das diferenças',
      'Diversidade desde a primeira infância',
      'Amor e apoio familiar',
      'Construção da identidade e autoestima',
      'Respeito ao outro e pertencimento',
      'Desenvolvimento emocional infantil'
    ],
    synopsis: 'Em Como Tudo Começou, o leitor volta no tempo para conhecer a chegada de Getúlio ao mundo com uma coloração vermelha inusitada, despertando olhares curiosos e questionamentos. Desde cedo, ele aprende com o acolhimento carinhoso de sua família que ser diferente faz parte da riqueza humana e que o amor constrói a autoestima e a segurança para toda a vida.',
    kit: 'Livro infantil + Caderno de Atividades Lúdicas voltado ao desenvolvimento emocional e identificação de sentimentos.',
    academic: 'Valoriza elementos da cultura e linguagem nordestina, proporcionando representatividade afetiva e identidade regional para as crianças.',
    quote: '“Ser diferente não é um defeito, é o que torna cada coraçãozinho único no mundo.”'
  },
  {
    id: 'bartolomeu',
    title: 'Bartolomeu, o gato autista',
    subtitle: 'Uma história sobre inclusão, respeito e o jeito único de cada um ser',
    price: 50.00,
    cover: 'assets/images/livro_bartolomeu.jpg',
    category: ['inclusao', 'emocoes', 'meio-ambiente'],
    themes: [
      'Transtorno do Espectro Autista (TEA)',
      'Inclusão escolar e social',
      'Empatia e respeito à neurodiversidade',
      'Diversidade de comportamentos e habilidades',
      'Convivência familiar e escuta atenta',
      'Educação ambiental e reciclagem'
    ],
    synopsis: 'Narrado pelo próprio Bartolomeu — um gato curioso, sensível e atento —, o livro convida os leitores a conhecerem sua maneira singular de perceber, sentir e interagir com o mundo. Ao lado de seus cinco irmãos (cada qual com particularidades próprias), Bartô também ama transformar materiais descartados em brincadeiras sensoriais, unindo inclusão e preservação ecológica de forma terna e inspiradora.',
    kit: 'Livro infantil + Caderno de Atividades Pedagógicas com dinâmicas sobre neurodiversidade, empatia e experiências sensoriais.',
    academic: 'Excelente ferramenta adotada por escolas para projetos de Educação Inclusiva e Ciências Sociais, auxiliando educadores e famílias.',
    quote: '“Inclusão não é tratar todo mundo igualzinho, é abraçar com carinho o jeito que cada um tem de sentir.”'
  },
  {
    id: 'dante',
    title: 'O Caranguejo que Não Queria Se Molhar',
    subtitle: 'Uma história sobre medo, coragem, amizade e superação',
    price: 50.00,
    cover: 'assets/images/livro_caranguejo_dante.jpg',
    category: ['emocoes', 'amizade'],
    themes: [
      'Medos e inseguranças infantis',
      'Coragem e superação pessoal',
      'Autoconhecimento e paciência',
      'Amizade verdadeira e acolhimento',
      'Confiança em si mesmo',
      'Enfrentar desafios e novas fases'
    ],
    synopsis: 'Em um vibrante mundo marinho, vive Dante, um caranguejinho que evita a água a todo custo por medo de se molhar. Enquanto os outros animais brincam nas ondas, Dante se isola na areia. Tudo se transforma quando ele encontra um sábio polvo que, sem pressioná-lo, oferece escuta, respeito ao seu tempo e companhia. Uma metáfora acolhedora sobre como enfrentar os receios infantis no ritmo de cada um.',
    kit: 'Livro infantil + Caderno de Atividades Pedagógicas com exercícios para expressão emocional e superação de medos cotidianos.',
    academic: 'Amplamente indicado por psicólogos e psicopedagogos para o trabalho com ansiedade, transição escolar e medos infantis.',
    quote: '“Você não precisa vencer o mar inteiro de uma vez; cada passinho dado com amor já é uma vitória imensa.”'
  },
  {
    id: 'vovo',
    title: 'Cadê minha vovó?',
    subtitle: 'Uma história sobre amor, saudade, memória e acolhimento',
    price: 74.90,
    cover: 'assets/images/livro_vovo.jpg',
    category: ['familia', 'emocoes'],
    themes: [
      'Luto infantil e acolhimento da perda',
      'Expressão sadia dos sentimentos',
      'Saudade e memórias afetivas',
      'Amor familiar intergeracional',
      'Vínculos que permanecem no coração',
      'Diálogo sensível entre família e escola'
    ],
    synopsis: 'Jussara, uma doce porquinha, vivencia a dolorosa ausência de sua avó querida, Dona Arborina, que se transformou em uma estrelinha no céu. Sem compreender o silêncio da casa, Jussara busca respostas para a sua saudade e aprende que o amor verdadeiro não desaparece com a distância física. As histórias contadas, os abraços e os ensinamentos continuam brilhando para sempre.',
    kit: 'Livro em edição especial + Caderno de Atividades Afetivas para elaboração do luto e valorização da memória familiar.',
    academic: 'Uma das obras mais sensíveis sobre perdas e luto na primeira infância, adotada em clínicas de psicologia infantil e projetos escolares de inteligência socioemocional.',
    quote: '“Quem a gente ama com todo o coração nunca parte de verdade: vira luz, carinho e estrelinha que guia os nossos passos.”'
  },
  {
    id: 'placido',
    title: 'Plácido não queria ir à escola',
    subtitle: 'Uma história sobre bullying, acolhimento, empatia e cuidado',
    price: 60.00,
    cover: 'assets/images/livro_placido.jpg',
    category: ['bullying', 'emocoes', 'inclusao'],
    themes: [
      'Combate e prevenção ao bullying',
      'Saúde mental e emocional na infância',
      'Acolhimento escolar multidisciplinar',
      'Apoio da psicologia e coordenação',
      'Fortalecimento da autoimagem e valor próprio',
      'Rede de cuidado entre família e colégio'
    ],
    synopsis: 'Plácido é um sapinho sensível que, magoado pelas brincadeiras cruéis de colegas sobre sua aparência, perde a vontade de brincar, se alimentar e ir para a escola. Sua mãe percebe a tristeza profunda do filho e busca auxílio. No colégio, através do olhar atencioso da psicóloga, da professora e do diretor, Plácido é escutado e acolhido, descobrindo o valor precioso de sua existência e a força da empatia coletiva.',
    kit: 'Livro infantil + Caderno Pedagógico de Atividades com dinâmicas antibullying, fortalecimento de laços de amizade e valorização das singularidades.',
    academic: 'Fundamental para a implantação de programas socioemocionais e cumprimento das diretrizes de combate à intimidação sistemática nas escolas.',
    quote: '“Na escola dos nossos sonhos, nenhuma criança chora em silêncio. Toda história é acolhida com amor e respeito.”'
  }
];

// Combos Promocionais na Loja
let KITS_PROMO = [
  {
    id: 'combo-getulio',
    title: 'Kit Duplo Getúlio (2 Livros + 2 Cadernos)',
    desc: 'Getúlio, jacaré ou bagulho? + Como tudo começou... do nascimento à infância de Getúlio.',
    price: 90.00,
    originalPrice: 100.00,
    badge: 'Mais Vendido',
    cover: 'assets/images/livro_getulio.jpg'
  },
  {
    id: 'combo-completo',
    title: 'Coleção Completa Débora Facchinetti (6 Obras + Frete Grátis)',
    desc: 'Todos os 6 livros infantis com seus cadernos de atividades pedagógicas + dedicatória exclusiva e autógrafo da autora Débora Facchinetti.',
    price: 299.00,
    originalPrice: 334.90,
    badge: 'Edição de Colecionador',
    cover: 'assets/images/debora_bookshelf.jpg'
  },
  {
    id: 'combo-acolhem',
    title: 'Kit Histórias que Acolhem (2 Livros + 1 Bolsa)',
    desc: 'O caranguejo que não queria se molhar + Cadê minha vovó? + Bolsa exclusiva com os personagens.',
    price: 124.90,
    originalPrice: 124.90,
    badge: '2 Livros + 1 Bolsa',
    cover: 'assets/images/livro_caranguejo_dante.jpg'
  }
];

// ==========================================================================
// 1.1 CHARACTERS DATABASE (Personagens Oficiais Ilustrados)
// ==========================================================================
const CHARACTERS_DATA = [
  {
    id: 'getulio',
    name: 'Getúlio',
    role: 'O Jacarezinho do Rio Poty',
    image: 'assets/images/char_getulio.jpg',
    bookId: 'getulio',
    bookTitle: 'Getúlio, jacaré ou bagulho?',
    themeColor: '#25A244',
    textColor: '#1A7531',
    bgBadge: '#EBF8EE',
    tag: 'Meio Ambiente & Superação',
    story: 'Getúlio é um jacarezinho de cor avermelhada que vive nas margens do Rio Poty, em Teresina. Enquanto outros o julgavam por sua cor e por recolher objetos das águas, ele estava, na verdade, cuidando do rio e protegendo a natureza.',
    teaching: 'Mostra às crianças que pequenas atitudes de amor ao meio ambiente transformam a comunidade, e que ser diferente é o que nos torna especiais e corajosos.',
    values: ['Preservação das Águas', 'Combate ao Bullying', 'Empatia e Respeito', 'Autoestima'],
    quote: '“Nem tudo é o que parece: aquilo que muitos viam como sujeira revelava o mais puro amor e cuidado com o nosso rio.”'
  },
  {
    id: 'barto',
    name: 'Bartolomeu (Bartô)',
    role: 'O Gatinho do Acolhimento e Amor',
    image: 'assets/images/char_bartolomeu.jpg',
    bookId: 'bartolomeu',
    bookTitle: 'Bartolomeu, o gato autista',
    themeColor: '#3A86FF',
    textColor: '#1E60CC',
    bgBadge: '#EEF4FF',
    tag: 'Autismo (TEA) & Neurodiversidade',
    story: 'Narrado pelo próprio Bartô, um gatinho sensível que percebe o mundo de maneira única. Ele adora a tranquilidade, tem sensibilidade aos sons e expressa seu amor com calma e doçura.',
    teaching: 'Aproxima crianças, pais e educadores da realidade do Transtorno do Espectro Autista (TEA), ensinando a respeitar os limites, as formas de afeto e os ritmos de cada pessoa.',
    values: ['Inclusão Escolar & Social', 'Compreensão da Neurodiversidade', 'Sensibilidade e Paciência', 'Amor Incondicional'],
    quote: '“Cada coraçãozinho tem sua própria música. Quando a gente aprende a ouvir, o mundo fica mais bonito.”'
  },
  {
    id: 'dante',
    name: 'Dante',
    role: 'O Caranguejinho Curioso',
    image: 'assets/images/char_dante.jpg',
    bookId: 'dante',
    bookTitle: 'O Caranguejo que Não Queria Se Molhar',
    themeColor: '#FF5A5F',
    textColor: '#DE3E43',
    bgBadge: '#FFF0F1',
    tag: 'Coragem & Superação do Medo',
    story: 'Dante é um caranguejo alegre que adorava a areia da praia, mas morria de medo de entrar nas ondas do mar. Com a paciência de um sábio polvo e a amizade dos bichinhos marinhos, ele descobre que ter medo é normal, e que a coragem é dar um passinho de cada vez.',
    teaching: 'Ajuda as crianças a lidarem com suas inseguranças, o medo do desconhecido e a importância de pedir ajuda e acolher quem sente medo.',
    values: ['Gestão Emocional do Medo', 'Paciência e Acolhimento', 'Amizade Sincera', 'Passo a Passo da Coragem'],
    quote: '“A coragem não é nunca sentir medo, mas sim dar a mão para um amigo e dar o primeiro passo.”'
  },
  {
    id: 'placido',
    name: 'Plácido',
    role: 'O Sapinho Estudante',
    image: 'assets/images/char_placido.jpg',
    bookId: 'placido',
    bookTitle: 'Plácido não queria ir à escola',
    themeColor: '#FFB703',
    textColor: '#B26A00',
    bgBadge: '#FFF8DB',
    tag: 'Saúde Emocional & Antibullying',
    story: 'Plácido é um sapinho cheio de sonhos que, ao sofrer brincadeiras maldosas sobre sua aparência, perdeu a alegria de ir à aula. Com o carinho de sua família e o apoio atento da psicóloga e professores do colégio, ele recuperou seu brilho e seu valor.',
    teaching: 'Sensibiliza a comunidade escolar sobre os impactos do bullying e a importância de uma rede de acolhimento ativa onde nenhuma criança chore em silêncio.',
    values: ['Combate Ativo ao Bullying', 'Autoimagem Positiva', 'Acolhimento Psicoemocional', 'Escuta Atenta na Escola'],
    quote: '“Na escola dos nossos sonhos, nenhuma criança chora em silêncio. Toda história é acolhida com amor.”'
  },
  {
    id: 'vovo',
    name: 'Dona Arborina & Jussara',
    role: 'A Vovó Estrelinha e a Menina',
    image: 'assets/images/char_vovo.jpg',
    bookId: 'vovo',
    bookTitle: 'Cadê minha vovó?',
    themeColor: '#8338EC',
    textColor: '#6520C2',
    bgBadge: '#F4ECFD',
    tag: 'Saudade & Memória Afetiva',
    story: 'A pequena Jussara sente muita saudade de sua amada avó, Dona Arborina. Ao olhar para o céu noturno, descobre que os momentos vividos, as cantigas e os abraços ficam guardados para sempre como uma estrelinha que brilha dentro do peito.',
    teaching: 'Oferece colo e palavras doces para conversar com crianças sobre luto, perda e separação, transformando a dor da ausência em eterna gratidão e afeto.',
    values: ['Acolhimento do Luto Infantil', 'Memória Afetiva Familiar', 'Afeto Intergeracional', 'Consolo e Esperança'],
    quote: '“Quem a gente ama com todo o coração nunca vai embora de verdade: mora para sempre nas histórias que contamos.”'
  }
];

// ==========================================================================
// 1.2 SINCRONIZAÇÃO DINÂMICA DO CATÁLOGO VIA API (/api/products)
// Carrega livros e kits do Supabase mantendo o fallback local imediato
// ==========================================================================
const SKU_TO_FRONTEND_ID = {
  'LIV-GETULIO': 'getulio',
  'LIV-GETULIO-INFANCIA': 'getulio-infancia',
  'LIV-BARTOLOMEU': 'bartolomeu',
  'LIV-DANTE': 'dante',
  'LIV-VOVO': 'vovo',
  'LIV-PLACIDO': 'placido',
  'KIT-GETULIO': 'combo-getulio',
  'KIT-COMPLETO': 'combo-completo'
};

async function syncCatalogWithAPI() {
  try {
    const response = await fetch('/api/products');
    if (!response.ok) {
      console.warn(`[Catálogo] API /api/products retornou status ${response.status}. Mantendo dados locais em cache.`);
      return;
    }
    const result = await response.json();
    if (!result.success || !Array.isArray(result.data)) {
      console.warn('[Catálogo] Resposta inválida da API. Mantendo dados locais em cache.');
      return;
    }

    result.data.forEach(prod => {
      const frontendId = SKU_TO_FRONTEND_ID[prod.sku] || prod.sku.toLowerCase();

      if (prod.product_type === 'book') {
        const localBook = BOOKS_DATA.find(b => b.id === frontendId || b.id === prod.sku);
        if (localBook) {
          localBook.dbId = prod.id;
          localBook.sku = prod.sku;
          localBook.price = Number(prod.price);
          localBook.stock = prod.stock_quantity;
          if (prod.title) localBook.title = prod.title;
          if (prod.subtitle) localBook.subtitle = prod.subtitle;
          if (prod.cover_url) localBook.cover = prod.cover_url;
        }
      } else if (prod.product_type === 'bundle') {
        const localKit = KITS_PROMO.find(k => k.id === frontendId || k.id === prod.sku);
        if (localKit) {
          localKit.dbId = prod.id;
          localKit.sku = prod.sku;
          localKit.price = Number(prod.price);
          if (prod.original_price) localKit.originalPrice = Number(prod.original_price);
          localKit.stock = prod.stock_quantity;
          if (prod.title) localKit.title = prod.title;
          if (prod.subtitle) localKit.desc = prod.subtitle;
          if (prod.cover_url) localKit.cover = prod.cover_url;
        }
      }

      updateDOMProductPrices(frontendId, prod);
    });

    if (window.cart && typeof window.cart.syncWithUpdatedCatalog === 'function') {
      window.cart.syncWithUpdatedCatalog();
    }

    window.dispatchEvent(new CustomEvent('catalogLoaded', { detail: result.data }));
  } catch (err) {
    console.warn('[Catálogo] Falha ao consultar /api/products. Operando com fallback local seguro:', err.message);
  }
}

function updateDOMProductPrices(frontendId, prod) {
  const formattedPrice = `R$ ${Number(prod.price).toFixed(2).replace('.', ',')}`;

  // 1. Atualiza card de livro individual
  const bookCard = document.getElementById(`card-${frontendId}`);
  if (bookCard) {
    const priceEl = bookCard.querySelector('.book-price');
    if (priceEl) priceEl.textContent = formattedPrice;
  }

  // 2. Atualiza cards de combo ou kit buscando pelo botão de ação
  const triggerBtn = document.querySelector(`[onclick*="'${frontendId}'"]`);
  if (triggerBtn) {
    const comboCard = triggerBtn.closest('.combo-card, .book-card');
    if (comboCard) {
      const priceCurrent = comboCard.querySelector('.combo-price-current');
      if (priceCurrent) priceCurrent.textContent = formattedPrice;
      if (prod.original_price) {
        const priceOld = comboCard.querySelector('.combo-price-old');
        if (priceOld) priceOld.textContent = `De R$ ${Number(prod.original_price).toFixed(2).replace('.', ',')}`;
      }
    }
  }
}

// ==========================================================================
// 2. SHOPPING CART SYSTEM (Persistência no localStorage & Carrinho Inteligente)
// ==========================================================================
class CartManager {
  constructor() {
    this.storageKey = 'debora_facchinetti_cart_v1';
    this.giftCharKey = 'debora_facchinetti_gift_char';
    this.items = this.load();
    this.giftCharacter = this.loadGiftCharacter();
    this.initListeners();
    this.updateBadges();
    this.renderDrawer();
  }

  loadGiftCharacter() {
    try {
      return localStorage.getItem(this.giftCharKey) || 'Getúlio (Jacarezinho)';
    } catch (e) {
      return 'Getúlio (Jacarezinho)';
    }
  }

  setGiftCharacter(charName) {
    this.giftCharacter = charName;
    try {
      localStorage.setItem(this.giftCharKey, charName);
    } catch (e) {
      console.error('Error saving gift character:', e);
    }
    this.save();
  }

  load() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (!data) return [];
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map(item => ({
          id: item.id || '',
          title: item.title || 'Livro Débora Facchinetti',
          price: Number(item.price) || 0,
          cover: item.cover || 'assets/images/livro_getulio.jpg',
          qty: parseInt(item.qty, 10) || 1,
          isKit: Boolean(item.isKit)
        }))
        .filter(item => item.id && item.price > 0);
    } catch (e) {
      console.error('Error loading cart:', e);
      return [];
    }
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.items));
      this.updateBadges();
      this.renderDrawer();
      // Dispatch custom event for cross-component sync
      window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { items: this.items, total: this.getTotal() } }));
    } catch (e) {
      console.error('Error saving cart:', e);
    }
  }

  syncWithUpdatedCatalog() {
    let hasChanges = false;
    this.items.forEach(item => {
      const book = BOOKS_DATA.find(b => b.id === item.id) || KITS_PROMO.find(k => k.id === item.id);
      if (book) {
        if (Number(book.price) > 0 && item.price !== Number(book.price)) {
          item.price = Number(book.price);
          hasChanges = true;
        }
        if (book.title && item.title !== book.title) {
          item.title = book.title;
          hasChanges = true;
        }
        if (book.cover && item.cover !== book.cover) {
          item.cover = book.cover;
          hasChanges = true;
        }
      }
    });
    if (hasChanges) {
      this.save();
      this.renderDrawer();
      window.dispatchEvent(new CustomEvent('cartUpdated'));
    }
  }

  /**
   * Smart Cart Evaluator:
   * Identifica automaticamente combos promocionais, calcula o melhor preço,
   * exibe brindes correspondentes e sugere compras inteligentes.
   */
  getSmartEvaluation() {
    const counts = {
      'getulio': 0,
      'getulio-infancia': 0,
      'bartolomeu': 0,
      'dante': 0,
      'vovo': 0,
      'placido': 0
    };

    // Expand items into book counts
    this.items.forEach(item => {
      const q = parseInt(item.qty, 10) || 1;
      if (item.id === 'combo-getulio') {
        counts['getulio'] += q;
        counts['getulio-infancia'] += q;
      } else if (item.id === 'combo-completo') {
        Object.keys(counts).forEach(k => counts[k] += q);
      } else if (item.id === 'combo-acolhem') {
        counts['dante'] += q;
        counts['vovo'] += q;
      } else if (counts[item.id] !== undefined) {
        counts[item.id] += q;
      }
    });

    const available = { ...counts };
    const evaluatedCombos = [];
    const evaluatedSingles = [];
    const smartSuggestions = [];

    const getBook = (id) => BOOKS_DATA.find(b => b.id === id) || { id, title: id, price: 50, cover: 'assets/images/livro_getulio.jpg' };

    // Regra 1: Coleção Literatura que Abraça (todas as 6 obras)
    const completeSets = Math.min(...Object.values(available));
    if (completeSets > 0) {
      evaluatedCombos.push({
        type: 'combo-completo',
        title: 'Coleção Literatura que Abraça',
        qty: completeSets,
        regularPrice: 334.90 * completeSets,
        promoPrice: 299.00 * completeSets,
        savings: Math.round((334.90 - 299.00) * completeSets * 100) / 100,
        badge: '👑 Coleção Completa Aplicada',
        benefit: 'Bolsa ou mochila dos personagens + Frete Grátis Brasil',
        notice: 'Você desbloqueou o presente da coleção completa.',
        itemsList: [
          '📗 Getúlio, jacaré ou bagulho?',
          '📘 Como tudo começou... do nascimento à infância',
          '🐱 Bartolomeu, o gato autista',
          '🦀 O Caranguejo que Não Queria Se Molhar',
          '📕 Cadê minha vovó?',
          '🐸 Plácido não queria ir à escola'
        ],
        covers: [
          'assets/images/livro_getulio.jpg',
          'assets/images/livro_getulio_infancia.jpg',
          'assets/images/livro_bartolomeu.jpg',
          'assets/images/livro_caranguejo_dante.jpg',
          'assets/images/livro_vovo.jpg',
          'assets/images/livro_placido.jpg'
        ]
      });
      Object.keys(available).forEach(k => available[k] -= completeSets);
    }

    // Regra 2: Kit Duplo Getúlio (getulio + getulio-infancia)
    const getulioSets = Math.min(available['getulio'], available['getulio-infancia']);
    if (getulioSets > 0) {
      evaluatedCombos.push({
        type: 'combo-getulio',
        title: 'Kit Duplo Getúlio',
        qty: getulioSets,
        regularPrice: 100.00 * getulioSets,
        promoPrice: 90.00 * getulioSets,
        savings: 10.00 * getulioSets,
        badge: '🐊 Kit Duplo Getúlio Aplicado',
        benefit: '2 livros + 1 camiseta personalizada do Getúlio',
        notice: 'Você economizou usando o Kit Duplo Getúlio.',
        itemsList: [
          '📗 Getúlio, jacaré ou bagulho?',
          '📘 Como tudo começou... do nascimento à infância'
        ],
        covers: [
          'assets/images/livro_getulio.jpg',
          'assets/images/livro_getulio_infancia.jpg'
        ]
      });
      available['getulio'] -= getulioSets;
      available['getulio-infancia'] -= getulioSets;
    }

    // Regra 3: Kit Histórias que Acolhem (dante + vovo)
    const acolhemSets = Math.min(available['dante'], available['vovo']);
    if (acolhemSets > 0) {
      evaluatedCombos.push({
        type: 'combo-acolhem',
        title: 'Kit Histórias que Acolhem',
        qty: acolhemSets,
        regularPrice: 124.90 * acolhemSets,
        promoPrice: 124.90 * acolhemSets,
        savings: 0,
        badge: '🦀 Kit Histórias que Acolhem Aplicado',
        benefit: '2 livros + 1 bolsa exclusiva com personagens',
        notice: 'Kit Histórias que Acolhem aplicado com brinde exclusivo.',
        itemsList: [
          '🦀 O caranguejo que não queria se molhar',
          '🐷 Cadê minha vovó?'
        ],
        covers: [
          'assets/images/livro_caranguejo_dante.jpg',
          'assets/images/livro_vovo.jpg'
        ]
      });
      available['dante'] -= acolhemSets;
      available['vovo'] -= acolhemSets;
    }

    // Regra 4: Livros avulsos restantes
    Object.keys(available).forEach(bookId => {
      const q = available[bookId];
      if (q > 0) {
        const book = getBook(bookId);
        evaluatedSingles.push({
          id: book.id,
          title: book.title,
          price: Number(book.price),
          cover: book.cover,
          qty: q,
          subtotal: Math.round(Number(book.price) * q * 100) / 100
        });
      }
    });

    // Totais e economia
    const combosTotal = evaluatedCombos.reduce((acc, c) => acc + c.promoPrice, 0);
    const singlesTotal = evaluatedSingles.reduce((acc, s) => acc + s.subtotal, 0);
    const finalTotal = Math.round((combosTotal + singlesTotal) * 100) / 100;

    const totalRegular = Math.round((evaluatedCombos.reduce((acc, c) => acc + c.regularPrice, 0) + singlesTotal) * 100) / 100;
    const totalSavings = Math.round(Math.max(0, totalRegular - finalTotal) * 100) / 100;

    // Regra 5: Compras acima de R$ 299
    const qualifiesFor299Gift = finalTotal >= 299.00;

    // Avisos Inteligentes (Upsells e Oportunidades)
    // A. Falta 1 livro para o Kit Getúlio
    if (available['getulio'] > 0 && available['getulio-infancia'] === 0) {
      smartSuggestions.push({
        text: 'Falta apenas 1 livro para desbloquear o <strong>Kit Duplo Getúlio</strong> com R$ 10 de desconto e camiseta personalizada de brinde!',
        actionBookId: 'getulio-infancia',
        actionBookTitle: 'Como tudo começou... do nascimento à infância'
      });
    } else if (available['getulio-infancia'] > 0 && available['getulio'] === 0) {
      smartSuggestions.push({
        text: 'Falta apenas 1 livro para desbloquear o <strong>Kit Duplo Getúlio</strong> com R$ 10 de desconto e camiseta personalizada de brinde!',
        actionBookId: 'getulio',
        actionBookTitle: 'Getúlio, jacaré ou bagulho?'
      });
    }

    // B. Falta 1 livro para o Kit Histórias que Acolhem
    if (available['dante'] > 0 && available['vovo'] === 0) {
      smartSuggestions.push({
        text: 'Adicione <strong>Cadê minha vovó?</strong> para desbloquear o <strong>Kit Histórias que Acolhem</strong> e ganhe uma Bolsa Exclusiva dos Personagens!',
        actionBookId: 'vovo',
        actionBookTitle: 'Cadê minha vovó?'
      });
    } else if (available['vovo'] > 0 && available['dante'] === 0) {
      smartSuggestions.push({
        text: 'Adicione <strong>O Caranguejo que Não Queria Se Molhar</strong> para desbloquear o <strong>Kit Histórias que Acolhem</strong> e ganhe uma Bolsa Exclusiva!',
        actionBookId: 'dante',
        actionBookTitle: 'O Caranguejo que Não Queria Se Molhar'
      });
    }

    // C. Quase completando a coleção (3 a 5 livros distintos)
    const distinctBooksInCart = Object.keys(counts).filter(k => counts[k] > 0).length;
    if (distinctBooksInCart >= 3 && distinctBooksInCart < 6 && completeSets === 0) {
      const missingKeys = Object.keys(counts).filter(k => counts[k] === 0);
      if (missingKeys.length > 0) {
        const nextMissing = getBook(missingKeys[0]);
        smartSuggestions.push({
          text: `Faltam apenas ${missingKeys.length} obra(s) para desbloquear a <strong>Coleção Completa por R$ 299</strong> com Frete Grátis e Mochila exclusiva!`,
          actionBookId: nextMissing.id,
          actionBookTitle: nextMissing.title
        });
      }
    }

    // D. Próximo de R$ 299
    if (finalTotal >= 200 && finalTotal < 299) {
      const diff = (299.00 - finalTotal).toFixed(2).replace('.', ',');
      smartSuggestions.push({
        text: `Faltam apenas <strong>R$ ${diff}</strong> em livros para ganhar uma <strong>Camiseta Personalizada exclusiva</strong> da Literatura que Abraça!`
      });
    }

    return {
      combos: evaluatedCombos,
      singles: evaluatedSingles,
      finalTotal,
      totalRegular,
      totalSavings,
      qualifiesFor299Gift,
      suggestions: smartSuggestions
    };
  }

  addItem(bookId, qty = 1, isKitPromo = false) {
    qty = parseInt(qty, 10);
    if (isNaN(qty) || qty < 1) qty = 1;

    // Se o cliente clicar diretamente em um combo, adicionamos os livros correspondentes
    if (bookId === 'combo-getulio') {
      this.updateBookQtyDirect('getulio', qty);
      this.updateBookQtyDirect('getulio-infancia', qty);
      this.save();
      showToast('🐊 Kit Duplo Getúlio adicionado à sacola!');
      this.openDrawer();
      return;
    }

    if (bookId === 'combo-completo') {
      ['getulio', 'getulio-infancia', 'bartolomeu', 'dante', 'vovo', 'placido'].forEach(id => {
        this.updateBookQtyDirect(id, qty);
      });
      this.save();
      showToast('👑 Coleção Completa adicionada à sacola!');
      this.openDrawer();
      return;
    }

    if (bookId === 'combo-acolhem') {
      this.updateBookQtyDirect('dante', qty);
      this.updateBookQtyDirect('vovo', qty);
      this.save();
      showToast('🦀 Kit Histórias que Acolhem adicionado à sacola!');
      this.openDrawer();
      return;
    }

    let product = BOOKS_DATA.find(b => b.id === bookId) ||
                  KITS_PROMO.find(k => k.id === bookId);

    if (!product) {
      console.warn('Produto não encontrado:', bookId);
      return;
    }

    this.updateBookQtyDirect(product.id, qty);
    this.save();
    showToast(`"${product.title}" adicionado à sacola!`);
    this.openDrawer();
  }

  updateBookQtyDirect(bookId, delta) {
    const book = BOOKS_DATA.find(b => b.id === bookId) || KITS_PROMO.find(k => k.id === bookId);
    if (!book) return;

    const existingIndex = this.items.findIndex(item => item.id === bookId);
    if (existingIndex > -1) {
      this.items[existingIndex].qty += delta;
      if (this.items[existingIndex].qty <= 0) {
        this.items.splice(existingIndex, 1);
      }
    } else if (delta > 0) {
      this.items.push({
        id: book.id,
        title: book.title,
        price: Number(book.price),
        cover: book.cover,
        qty: delta,
        isKit: Boolean(book.kit)
      });
    }
  }

  updateBookQty(bookId, delta) {
    this.updateBookQtyDirect(bookId, delta);
    this.save();
  }

  removeBook(bookId) {
    const idx = this.items.findIndex(item => item.id === bookId);
    if (idx > -1) {
      const removed = this.items.splice(idx, 1)[0];
      this.save();
      if (removed) {
        showToast(`"${removed.title}" removido da sacola.`);
      }
    }
  }

  updateComboQty(comboType, delta) {
    if (comboType === 'combo-getulio') {
      this.updateBookQtyDirect('getulio', delta);
      this.updateBookQtyDirect('getulio-infancia', delta);
    } else if (comboType === 'combo-completo') {
      ['getulio', 'getulio-infancia', 'bartolomeu', 'dante', 'vovo', 'placido'].forEach(id => {
        this.updateBookQtyDirect(id, delta);
      });
    } else if (comboType === 'combo-acolhem') {
      this.updateBookQtyDirect('dante', delta);
      this.updateBookQtyDirect('vovo', delta);
    }
    this.save();
  }

  removeCombo(comboType) {
    this.updateComboQty(comboType, -1);
  }

  removeItem(index) {
    index = parseInt(index, 10);
    if (index >= 0 && index < this.items.length) {
      const removed = this.items.splice(index, 1)[0];
      this.save();
      if (removed) {
        showToast(`"${removed.title}" removido da sacola.`);
      }
    }
  }

  updateQty(index, delta) {
    index = parseInt(index, 10);
    if (index >= 0 && index < this.items.length) {
      const newQty = (parseInt(this.items[index].qty, 10) || 1) + delta;
      if (newQty <= 0) {
        this.removeItem(index);
      } else {
        this.items[index].qty = newQty;
        this.save();
      }
    }
  }

  clear() {
    this.items = [];
    this.save();
  }

  getCount() {
    return this.items.reduce((sum, item) => sum + (parseInt(item.qty, 10) || 0), 0);
  }

  getTotal() {
    return this.getSmartEvaluation().finalTotal;
  }

  getSavings() {
    return this.getSmartEvaluation().totalSavings;
  }

  updateBadges() {
    const badges = document.querySelectorAll('.cart-count-badge');
    const count = this.getCount();
    badges.forEach(badge => {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    });
  }

  openDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartOverlay');
    if (drawer && overlay) {
      this.renderDrawer();
      drawer.classList.add('open', 'active');
      overlay.classList.add('open', 'active');
      document.body.style.overflow = 'hidden';
    }
  }

  closeDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartOverlay');
    if (drawer) {
      drawer.classList.remove('open', 'active');
    }
    if (overlay) {
      overlay.classList.remove('open', 'active');
    }
    document.body.style.overflow = '';
  }

  renderDrawer() {
    const body = document.getElementById('cartDrawerBody');
    const footer = document.getElementById('cartDrawerFooter');
    const countText = document.getElementById('cartDrawerCountText');

    if (!body) return;

    const totalCount = this.getCount();
    if (countText) {
      countText.textContent = `${totalCount} ${totalCount === 1 ? 'item' : 'itens'}`;
    }

    const evalResult = this.getSmartEvaluation();

    if (this.items.length === 0) {
      body.innerHTML = `
        <div class="cart-empty-state" style="text-align: center; padding: 3rem 1.5rem; display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <div style="width: 72px; height: 72px; border-radius: 50%; background: #FAF7F2; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin-bottom: 1.25rem; border: 2px dashed #E6DEC9;">
            📖
          </div>
          <h4 style="font-family: var(--font-display, inherit); font-size: 1.25rem; font-weight: 800; color: #2D4030; margin-bottom: 0.5rem;">Sua sacola está vazia</h4>
          <p style="font-size: 0.92rem; color: #666; line-height: 1.6; margin-bottom: 1.5rem; max-width: 280px;">Escolha suas histórias favoritas na nossa Loja &amp; Kits para começar sua coleção.</p>
          <a href="loja.html" class="btn btn-primary" onclick="cart.closeDrawer()" style="display: inline-flex; align-items: center; gap: 0.5rem; text-decoration: none;">
            <i class="fa-solid fa-bag-shopping"></i> Explorar Livros e Kits
          </a>
        </div>
      `;
      if (footer) footer.style.display = 'none';
      return;
    }

    if (footer) {
      footer.style.display = 'block';
      const savingsHtml = evalResult.totalSavings > 0 
        ? `<div style="font-size: 0.8rem; color: #15803D; font-weight: 700; margin-top: 0.2rem;"><i class="fa-solid fa-tag"></i> Economia no pedido: R$ ${evalResult.totalSavings.toFixed(2).replace('.', ',')}</div>` 
        : '';

      footer.innerHTML = `
        <div class="cart-subtotal-row">
          <div>
            <span>Total a Pagar:</span>
            ${savingsHtml}
          </div>
          <span class="cart-subtotal-val" id="cartDrawerTotal">R$ ${evalResult.finalTotal.toFixed(2).replace('.', ',')}</span>
        </div>
        <div class="cart-footer-actions">
          <a href="checkout.html" class="btn btn-primary" style="width: 100%; justify-content: center; font-size: 1rem; padding: 0.85rem;">
            <i class="fa-solid fa-lock"></i> Finalizar Compra
          </a>
          <button type="button" class="btn btn-outline" onclick="cart.closeDrawer()" style="width: 100%; justify-content: center; font-size: 0.95rem; padding: 0.75rem;">
            <i class="fa-solid fa-arrow-left"></i> Continuar Comprando
          </button>
        </div>
      `;
    }

    let html = '';

    // 1. Avisos Inteligentes / Sugestões
    if (evalResult.suggestions && evalResult.suggestions.length > 0) {
      evalResult.suggestions.forEach(s => {
        const btnHtml = s.actionBookId 
          ? `<button type="button" class="cart-suggestion-btn" onclick="cart.addItem('${s.actionBookId}', 1)">+ Adicionar "${s.actionBookTitle.split('...')[0].trim()}"</button>` 
          : '';
        html += `
          <div class="cart-smart-suggestion">
            <div class="cart-suggestion-icon">💡</div>
            <div class="cart-suggestion-content">
              <p class="cart-suggestion-text">${s.text}</p>
              ${btnHtml}
            </div>
          </div>
        `;
      });
    }

    // 2. Banner Bônus R$ 299 + Seletor do Personagem
    if (evalResult.qualifiesFor299Gift) {
      html += `
        <div class="cart-bonus-299-box">
          <div class="cart-bonus-header">
            <span class="bonus-trophy">🎉</span>
            <div>
              <h5>Parabéns! Sua compra ganhou uma Camiseta Personalizada</h5>
              <p>Escolha o personagem da sua camiseta da Literatura que Abraça:</p>
            </div>
          </div>
          <select class="bonus-select" onchange="cart.setGiftCharacter(this.value)">
            <option value="Getúlio (Jacarezinho)" ${this.giftCharacter === 'Getúlio (Jacarezinho)' ? 'selected' : ''}>🐊 Camiseta Getúlio (Jacarezinho)</option>
            <option value="Bartô (Gatinho)" ${this.giftCharacter === 'Bartô (Gatinho)' ? 'selected' : ''}>🐱 Camiseta Bartô (Gatinho)</option>
            <option value="Caranguejo Dante" ${this.giftCharacter === 'Caranguejo Dante' ? 'selected' : ''}>🦀 Camiseta Caranguejo Dante</option>
            <option value="Dona Arborina & Jussara" ${this.giftCharacter === 'Dona Arborina & Jussara' ? 'selected' : ''}>🐷 Camiseta Dona Arborina &amp; Jussara</option>
            <option value="Plácido (Sapinho)" ${this.giftCharacter === 'Plácido (Sapinho)' ? 'selected' : ''}>🐸 Camiseta Plácido (Sapinho)</option>
          </select>
        </div>
      `;
    }

    // 3. Renderização de Combos Inteligentes
    if (evalResult.combos && evalResult.combos.length > 0) {
      evalResult.combos.forEach(c => {
        const savingsTag = c.savings > 0 
          ? `<span class="cart-combo-savings-tag">Economia de R$ ${c.savings.toFixed(2).replace('.', ',')}</span>` 
          : '';
        
        const thumbsHtml = c.covers.slice(0, 3).map(img => `<img src="${img}" alt="${c.title}" loading="lazy">`).join('');
        const itemsListHtml = c.itemsList.map(t => `<li>${t}</li>`).join('');

        html += `
          <div class="cart-combo-card">
            <div class="cart-combo-header">
              <span class="cart-combo-badge">${c.badge}</span>
              ${savingsTag}
            </div>
            <div class="cart-combo-body">
              <div class="cart-combo-thumbs">
                ${thumbsHtml}
              </div>
              <div class="cart-combo-details">
                <h4 class="cart-combo-title">${c.qty > 1 ? `${c.qty}x ` : ''}${c.title}</h4>
                <ul class="cart-combo-items-list">
                  ${itemsListHtml}
                </ul>
                <div class="cart-combo-gift-pill">
                  🎁 <strong>Brinde incluso:</strong> ${c.benefit}
                </div>
                <div class="cart-combo-pricing-row">
                  <div class="cart-combo-prices">
                    ${c.savings > 0 ? `<span class="cart-combo-old-price">De R$ ${c.regularPrice.toFixed(2).replace('.', ',')}</span>` : ''}
                    <strong class="cart-combo-price">R$ ${c.promoPrice.toFixed(2).replace('.', ',')}</strong>
                  </div>
                  <div class="cart-qty-control">
                    <button type="button" class="cart-qty-btn" onclick="cart.updateComboQty('${c.type}', -1)" aria-label="Diminuir">-</button>
                    <span class="cart-qty-val">${c.qty}</span>
                    <button type="button" class="cart-qty-btn" onclick="cart.updateComboQty('${c.type}', 1)" aria-label="Aumentar">+</button>
                  </div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.4rem;">
                  <button type="button" class="cart-combo-remove-btn" onclick="cart.removeCombo('${c.type}')">
                    <i class="fa-solid fa-trash-can"></i> Remover combo
                  </button>
                </div>
              </div>
            </div>
            <div class="cart-combo-notice">
              <i class="fa-solid fa-circle-check"></i> ${c.notice}
            </div>
          </div>
        `;
      });
    }

    // 4. Renderização de Livros Avulsos
    if (evalResult.singles && evalResult.singles.length > 0) {
      evalResult.singles.forEach(item => {
        const unitPriceFormatted = Number(item.price).toFixed(2).replace('.', ',');
        const itemSubtotal = item.subtotal.toFixed(2).replace('.', ',');
        html += `
          <div class="cart-item-card">
            <img src="${item.cover}" alt="${item.title}" class="cart-item-thumb">
            <div class="cart-item-details">
              <h4 class="cart-item-title">${item.title}</h4>
              <div class="cart-item-unit-price">
                <span class="cart-item-unit-label">Preço unitário:</span>
                <span class="cart-item-unit-val">R$ ${unitPriceFormatted}</span>
              </div>
              
              <div class="cart-item-actions-row">
                <div class="cart-qty-control">
                  <button type="button" class="cart-qty-btn" onclick="cart.updateBookQty('${item.id}', -1)" aria-label="Diminuir">−</button>
                  <span class="cart-qty-val">${item.qty}</span>
                  <button type="button" class="cart-qty-btn" onclick="cart.updateBookQty('${item.id}', 1)" aria-label="Aumentar">+</button>
                </div>

                <div class="cart-item-subtotal-wrap">
                  <span class="cart-item-subtotal-label">Subtotal</span>
                  <strong class="cart-item-subtotal-val">R$ ${itemSubtotal}</strong>
                </div>
              </div>

              <button type="button" class="cart-item-remove-btn" onclick="cart.removeBook('${item.id}')" aria-label="Remover ${item.title}">
                <i class="fa-solid fa-trash-can"></i> Remover produto
              </button>
            </div>
          </div>
        `;
      });
    }

    // 5. Aviso de Não Cumulatividade
    html += `
      <p class="cart-promos-disclaimer">
        <i class="fa-solid fa-circle-info" style="color: #A8A29E; margin-top: 2px;"></i>
        <span>Os brindes não são cumulativos. Em compras que se enquadrem em mais de uma promoção, será considerado o benefício correspondente à promoção específica de maior valor.</span>
      </p>
    `;

    body.innerHTML = html;
  }

  initListeners() {
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('.cart-trigger-btn, #cartTrigger');
      if (trigger) {
        e.preventDefault();
        e.stopPropagation();
        this.openDrawer();
        return;
      }
      const closeBtn = e.target.closest('#cartCloseBtn, .cart-close-btn, #cartOverlay');
      if (closeBtn) {
        e.preventDefault();
        this.closeDrawer();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeDrawer();
      }
    });
  }
}

const cart = new CartManager();

// ==========================================================================
// 3. BOOK DETAIL MODAL (<dialog>)
// ==========================================================================
function openBookModal(bookId) {
  const book = BOOKS_DATA.find(b => b.id === bookId);
  if (!book) return;

  const modal = document.getElementById('bookDetailModal');
  if (!modal) return;

  document.getElementById('modalBookCover').src = book.cover;
  document.getElementById('modalBookCover').alt = book.title;
  document.getElementById('modalBookTitle').textContent = book.title;
  document.getElementById('modalBookSubtitle').textContent = book.subtitle;
  document.getElementById('modalBookPrice').textContent = `R$ ${book.price.toFixed(2).replace('.', ',')}`;
  document.getElementById('modalBookSynopsis').textContent = book.synopsis;
  document.getElementById('modalBookKit').textContent = book.kit;
  document.getElementById('modalBookAcademic').textContent = book.academic;
  document.getElementById('modalBookQuote').textContent = book.quote;

  const themesContainer = document.getElementById('modalBookThemes');
  if (themesContainer) {
    themesContainer.innerHTML = book.themes.map(t => `<span class="theme-tag">✓ ${t}</span>`).join('');
  }

  // Personagem associado à obra
  const charBox = document.getElementById('modalBookCharacterBox');
  if (charBox) {
    const charMap = {
      'getulio': { name: 'Getúlio', role: 'O Jacarezinho do Rio Poty • Mascote Ecológico', img: 'assets/images/char_getulio.jpg' },
      'getulio-infancia': { name: 'Getúlio (Filhote)', role: 'O Jacarezinho Vermelho • Diversidade e Autoestima', img: 'assets/images/char_getulio.jpg' },
      'bartolomeu': { name: 'Bartolomeu', role: 'O Gatinho do Amor • Inclusão & Neurodiversidade (TEA)', img: 'assets/images/char_bartolomeu.jpg' },
      'dante': { name: 'Dante', role: 'O Caranguejinho Curioso • Coragem & Superação de Medos', img: 'assets/images/char_dante.jpg' },
      'vovo': { name: 'Dona Arborina & Jussara', role: 'A Vovó Estrelinha e a Menina • Saudade e Memória Afetiva', img: 'assets/images/char_vovo.jpg' },
      'placido': { name: 'Plácido', role: 'O Sapinho Estudante • Antibullying & Acolhimento', img: 'assets/images/char_placido.jpg' }
    };
    const charInfo = charMap[book.id];
    if (charInfo) {
      const avatarEl = document.getElementById('modalBookCharAvatar');
      if (avatarEl) {
        avatarEl.src = charInfo.img;
        avatarEl.alt = charInfo.name;
      }
      const nameEl = document.getElementById('modalBookCharName');
      if (nameEl) nameEl.textContent = charInfo.name;
      const roleEl = document.getElementById('modalBookCharRole');
      if (roleEl) roleEl.textContent = charInfo.role;
      charBox.style.display = 'flex';
    } else {
      charBox.style.display = 'none';
    }
  }

  const buyBtn = document.getElementById('modalBuyBtn');
  if (buyBtn) {
    buyBtn.onclick = () => {
      cart.addItem(book.id, 1);
      modal.close();
    };
  }

  const directWppBtn = document.getElementById('modalDirectWppBtn');
  if (directWppBtn) {
    const text = encodeURIComponent(`Olá Débora! Gostaria de adquirir o livro "${book.title}" (R$ ${book.price.toFixed(2).replace('.', ',')}). Poderia me informar como prosseguir?`);
    directWppBtn.href = `https://wa.me/5586988891466?text=${text}`;
  }

  if (typeof modal.showModal === 'function') {
    modal.showModal();
  } else {
    modal.setAttribute('open', '');
  }
  document.body.style.overflow = 'hidden';
}

function closeBookModal() {
  const modal = document.getElementById('bookDetailModal');
  if (modal) {
    if (typeof modal.close === 'function') {
      modal.close();
    } else {
      modal.removeAttribute('open');
    }
    document.body.style.overflow = '';
  }
}

// ==========================================================================
// 3.1 CHARACTER DETAIL MODAL (<dialog>)
// ==========================================================================
function openCharacterModal(charId) {
  const char = CHARACTERS_DATA.find(c => c.id === charId);
  if (!char) return;

  const modal = document.getElementById('characterDetailModal');
  if (!modal) return;

  const imgEl = document.getElementById('modalCharImg');
  if (imgEl) {
    imgEl.src = char.image;
    imgEl.alt = char.name;
  }

  const nameEl = document.getElementById('modalCharName');
  if (nameEl) nameEl.textContent = char.name;

  const roleEl = document.getElementById('modalCharRole');
  if (roleEl) roleEl.textContent = char.role;

  const storyEl = document.getElementById('modalCharStory');
  if (storyEl) storyEl.textContent = char.story;

  const teachingEl = document.getElementById('modalCharTeaching');
  if (teachingEl) teachingEl.textContent = char.teaching;

  const quoteEl = document.getElementById('modalCharQuote');
  if (quoteEl) quoteEl.textContent = char.quote;

  const bookTitleEl = document.getElementById('modalCharBookTitle');
  if (bookTitleEl) bookTitleEl.textContent = char.bookTitle;

  const valuesContainer = document.getElementById('modalCharValues');
  if (valuesContainer) {
    valuesContainer.innerHTML = char.values.map(v => `
      <span class="theme-tag" style="background: ${char.bgBadge}; color: ${char.textColor}; border-color: ${char.themeColor}; font-weight: 700;">
        ✨ ${v}
      </span>
    `).join('');
  }

  const seeBookBtn = document.getElementById('modalCharSeeBookBtn');
  if (seeBookBtn) {
    seeBookBtn.onclick = () => {
      closeCharacterModal();
      openBookModal(char.bookId);
    };
  }

  if (typeof modal.showModal === 'function') {
    modal.showModal();
  } else {
    modal.setAttribute('open', '');
  }
  document.body.style.overflow = 'hidden';
}

function closeCharacterModal() {
  const modal = document.getElementById('characterDetailModal');
  if (modal) {
    if (typeof modal.close === 'function') {
      modal.close();
    } else {
      modal.removeAttribute('open');
    }
    document.body.style.overflow = '';
  }
}

// ==========================================================================
// 3.2 COMBO DETAIL MODAL (<dialog>)
// ==========================================================================
const COMBOS_DATA = {
  'getulio': {
    title: 'Kit Duplo Getúlio',
    badge: '2 Livros + 1 Camiseta',
    img: 'assets/images/livro_getulio.jpg',
    price: 'R$ 90,00',
    oldPrice: 'De R$ 100,00',
    desc: 'Compre os dois livros do Getúlio e ganhe uma camiseta personalizada do Jacarezinho Getúlio.',
    benefit: '2 livros + 1 camiseta personalizada do Getúlio',
    items: [
      '📗 Getúlio, jacaré ou bagulho? (Livro físico + Caderno Pedagógico)',
      '📘 Como tudo começou… do nascimento à infância de Getúlio (Livro físico + Caderno Pedagógico)',
      '👕 Camiseta personalizada exclusiva do Mascote Getúlio'
    ],
    buyAction: 'cart.addItem("combo-getulio", 1, true); closeComboModal();'
  },
  'completo': {
    title: 'Coleção Literatura que Abraça',
    badge: 'Coleção Completa 6 Obras',
    img: 'assets/images/debora_bookshelf.jpg',
    price: 'R$ 299,00',
    oldPrice: 'De R$ 334,90 • Frete Grátis',
    desc: 'Leve a coleção completa e ganhe um presente especial. Você escolhe o seu presente.',
    benefit: 'Coleção completa + bolsa ou mochila dos personagens',
    items: [
      '6 Livros físicos em alta qualidade gráfica',
      '6 Cadernos de atividades pedagógicas inclusos',
      'Dedicatória nominal feita à mão pela autora',
      '🎒 Bolsa ou Mochila exclusiva dos personagens (você escolhe o seu presente)',
      '★ Frete Grátis para qualquer cidade do Brasil'
    ],
    buyAction: 'cart.addItem("combo-completo", 1, true); closeComboModal();'
  },
  'acolhem': {
    title: 'Kit Histórias que Acolhem',
    badge: '2 Livros + 1 Bolsa',
    img: 'assets/images/livro_caranguejo_dante.jpg',
    price: 'R$ 124,90',
    oldPrice: '',
    desc: 'Compre os dois livros e ganhe uma bolsa exclusiva com os personagens.',
    benefit: '2 livros + 1 bolsa exclusiva',
    items: [
      '📘 O caranguejo que não queria se molhar (Livro + Caderno)',
      '📕 Cadê minha vovó? (Livro + Caderno)',
      '👜 Bolsa exclusiva ilustrada com os personagens'
    ],
    buyAction: 'window.open("https://wa.me/5586988891466?text=Ol%C3%A1%20D%C3%A9bora,%20quero%20o%20Kit%20Hist%C3%B3rias%20que%20Acolhem%20(Dante%20+%20Cad%C3%AA%20Minha%20Vov%C3%B3)%20com%20a%20bolsa%20exclusiva!", "_blank"); closeComboModal();'
  },
  'barto': {
    title: 'Kit Turma do Bartô',
    badge: '10 Livros = 1 Malinha',
    img: 'assets/images/livro_bartolomeu.jpg',
    price: 'Lote Especial para Escolas e Famílias',
    oldPrice: '',
    desc: 'Comprando 10 livros da Turma do Bartô, você ganha uma malinha exclusiva. Uma opção especial para famílias, escolas, professores e grupos.',
    benefit: '10 livros = 1 malinha exclusiva',
    items: [
      '🐱 10 Exemplares de "Bartolomeu, o gato autista"',
      '📚 10 Cadernos Pedagógicos sobre TEA, empatia e inclusão',
      '🧳 1 Malinha exclusiva da Turma do Bartô'
    ],
    buyAction: 'window.open("https://wa.me/5586988891466?text=Ol%C3%A1%20D%C3%A9bora,%20gostaria%20de%20pedir%20o%20Kit%20Turma%20do%20Bart%C3%B4%20(10%20livros%20+%20malinha%20exclusiva)!", "_blank"); closeComboModal();'
  },
  '299': {
    title: 'Comprou R$ 299, Ganhou!',
    badge: 'Brinde em Pedidos ≥ R$ 299',
    img: 'assets/images/char_getulio.jpg',
    price: 'Válido para compras a partir de R$ 299',
    oldPrice: '',
    desc: 'Nas compras a partir de R$ 299, ganhe uma camiseta personalizada da Literatura que Abraça. Escolha seu personagem favorito.',
    benefit: 'Escolha seu personagem favorito.',
    items: [
      '🐊 Camiseta Jacaré Getúlio',
      '🐱 Camiseta Bartô',
      '🦀 Camiseta Caranguejo Dante',
      '🐷 Camiseta Personagens das histórias'
    ],
    buyAction: 'document.getElementById("livros-catalogo")?.scrollIntoView({ behavior: "smooth" }); closeComboModal();'
  }
};

function openComboModal(comboId) {
  const combo = COMBOS_DATA[comboId];
  if (!combo) return;

  const modal = document.getElementById('comboDetailModal');
  if (!modal) return;

  const imgEl = document.getElementById('modalComboImg');
  if (imgEl) {
    imgEl.src = combo.img;
    imgEl.alt = combo.title;
  }
  const titleEl = document.getElementById('modalComboTitle');
  if (titleEl) titleEl.textContent = combo.title;

  const badgeEl = document.getElementById('modalComboBadge');
  if (badgeEl) badgeEl.textContent = combo.badge;

  const descEl = document.getElementById('modalComboDesc');
  if (descEl) descEl.textContent = combo.desc;

  const benefitEl = document.getElementById('modalComboBenefit');
  if (benefitEl) benefitEl.textContent = combo.benefit;

  const priceEl = document.getElementById('modalComboPrice');
  if (priceEl) priceEl.textContent = combo.price;

  const oldPriceEl = document.getElementById('modalComboOldPrice');
  if (oldPriceEl) oldPriceEl.textContent = combo.oldPrice || '';

  const listEl = document.getElementById('modalComboItems');
  if (listEl) {
    listEl.innerHTML = combo.items.map(item => `<li><i class="fa-solid fa-check" style="color: var(--primary-green); margin-right: 6px;"></i> ${item}</li>`).join('');
  }

  const buyBtn = document.getElementById('modalComboBuyBtn');
  if (buyBtn) {
    buyBtn.setAttribute('onclick', combo.buyAction);
  }

  if (typeof modal.showModal === 'function') {
    modal.showModal();
  } else {
    modal.setAttribute('open', '');
  }
  document.body.style.overflow = 'hidden';
}

function closeComboModal() {
  const modal = document.getElementById('comboDetailModal');
  if (modal) {
    if (typeof modal.close === 'function') {
      modal.close();
    } else {
      modal.removeAttribute('open');
    }
    document.body.style.overflow = '';
  }
}

// Light dismiss for dialogs
document.addEventListener('click', (e) => {
  const modal = document.getElementById('bookDetailModal');
  if (modal && e.target === modal) {
    closeBookModal();
  }
  const charModal = document.getElementById('characterDetailModal');
  if (charModal && e.target === charModal) {
    closeCharacterModal();
  }
  const comboModal = document.getElementById('comboDetailModal');
  if (comboModal && e.target === comboModal) {
    closeComboModal();
  }
});

// ==========================================================================
// 4. TOAST NOTIFICATIONS
// ==========================================================================
function showToast(message, type = 'info') {
  // Se a sacola estiver aberta, não sobrepor os cards dos produtos
  const drawer = document.getElementById('cartDrawer');
  if (drawer && (drawer.classList.contains('open') || drawer.classList.contains('active'))) {
    return;
  }

  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.style.cssText = `
      position: fixed;
      bottom: 25px;
      left: 25px;
      z-index: 1040;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    `;
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.style.cssText = `
    background: #183828;
    color: #FFFFFF;
    border-left: 4px solid #C29637;
    padding: 0.85rem 1.25rem;
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.18);
    font-size: 0.9rem;
    font-weight: 600;
    max-width: 340px;
    transform: translateY(20px);
    opacity: 0;
    transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    display: flex;
    align-items: center;
    gap: 0.6rem;
    pointer-events: auto;
  `;
  toast.innerHTML = `<span>✨</span><span>${message}</span>`;
  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
  });

  setTimeout(() => {
    toast.style.transform = 'translateY(20px)';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

// ==========================================================================
// 5. MOBILE NAVIGATION TOGGLE
// ==========================================================================
function initMobileNav() {
  const toggle = document.querySelector('.mobile-nav-toggle');
  const overlay = document.querySelector('.mobile-nav-overlay');
  const drawer = document.querySelector('.mobile-nav-drawer');
  const closeBtn = document.querySelector('.drawer-close-btn');

  if (!toggle || !drawer) return;

  const open = () => {
    drawer.classList.add('open', 'active');
    if (overlay) overlay.classList.add('open', 'active');
    document.body.style.overflow = 'hidden';
  };

  const close = () => {
    drawer.classList.remove('open', 'active');
    if (overlay) overlay.classList.remove('open', 'active');
    document.body.style.overflow = '';
  };

  toggle.addEventListener('click', open);
  if (closeBtn) closeBtn.addEventListener('click', close);
  if (overlay) overlay.addEventListener('click', close);
}

// ==========================================================================
// 6. SCROLL REVEAL & HEADER ELEVATION
// ==========================================================================
function initScrollEffects() {
  const header = document.querySelector('.site-header');
  window.addEventListener('scroll', () => {
    if (header) {
      if (window.scrollY > 30) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }
  }, { passive: true });

  // IntersectionObserver for elements
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    document.querySelectorAll('.reveal-on-scroll').forEach(el => observer.observe(el));
  }
}

// ==========================================================================
// 7. PARTICLES EFFECT FOR HERO CANVAS
// ==========================================================================
function initHeroParticles() {
  const canvas = document.getElementById('heroParticlesCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = canvas.parentElement.offsetWidth);
  let height = (canvas.height = canvas.parentElement.offsetHeight);

  window.addEventListener('resize', () => {
    if (!canvas.parentElement) return;
    width = canvas.width = canvas.parentElement.offsetWidth;
    height = canvas.height = canvas.parentElement.offsetHeight;
  });

  const particles = [];
  const particleCount = 38;
  const colors = ['#FFCC00', '#FFB703', '#25A244', '#3A86FF', '#FF5A5F'];

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 4 + 2,
      type: Math.random() > 0.4 ? 'star' : 'circle',
      speedY: Math.random() * 0.4 + 0.12,
      speedX: (Math.random() - 0.5) * 0.35,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.025,
      opacity: Math.random() * 0.65 + 0.25,
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  }

  function drawStar(cx, cy, spikes, outerRadius, innerRadius, color, alpha, rot) {
    let rotAngle = (Math.PI / 2) * 3 + rot;
    let x = cx;
    let y = cy;
    let step = Math.PI / spikes;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rotAngle) * outerRadius;
      y = cy + Math.sin(rotAngle) * outerRadius;
      ctx.lineTo(x, y);
      rotAngle += step;

      x = cx + Math.cos(rotAngle) * innerRadius;
      y = cy + Math.sin(rotAngle) * innerRadius;
      ctx.lineTo(x, y);
      rotAngle += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.fill();
    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, width, height);

    particles.forEach(p => {
      p.y -= p.speedY;
      p.x += p.speedX;
      p.rotation += p.rotationSpeed;

      if (p.y < -15) {
        p.y = height + 15;
        p.x = Math.random() * width;
      }
      if (p.x < -15) p.x = width + 15;
      if (p.x > width + 15) p.x = -15;

      if (p.type === 'star') {
        drawStar(p.x, p.y, 4, p.size * 2, p.size * 0.8, p.color, p.opacity, p.rotation);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
      }
    });

    requestAnimationFrame(render);
  }

  render();
}

// ==========================================================================
// 8. 3D TILT EFFECT ON CARDS
// ==========================================================================
function init3DTilt() {
  const cards = document.querySelectorAll('.tilt-card');
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -7;
      const rotateY = ((x - centerX) / centerX) * 7;
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
    });
  });
}

// ==========================================================================
// 9. LINHA DA TRAJETÓRIA INTERATIVA (SOBRE A DÉBORA)
// ==========================================================================
function initAuthorTrajectory() {
  const steps = document.querySelectorAll('.trajectory-step');
  const panels = document.querySelectorAll('.trajectory-content-panel');
  const connectors = document.querySelectorAll('.trajectory-line-connector');
  const track = document.querySelector('.trajectory-track');

  if (!steps.length || !panels.length) return;

  function setActiveStep(stepNum, shouldCenter = true) {
    steps.forEach(step => {
      const num = parseInt(step.getAttribute('data-step'), 10);
      const isActive = num === stepNum;
      const isCompleted = num < stepNum;
      step.classList.toggle('active', isActive);
      step.classList.toggle('completed', isCompleted);
      step.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    connectors.forEach((connector, idx) => {
      // O conector idx (0-indexado) liga o step idx+1 ao step idx+2
      connector.classList.toggle('active', stepNum >= idx + 2);
    });

    panels.forEach(panel => {
      const num = parseInt(panel.getAttribute('data-content'), 10);
      panel.classList.toggle('active', num === stepNum);
    });

    // Centralizar etapa selecionada na visão horizontal em dispositivos mobile
    if (shouldCenter && window.innerWidth <= 768) {
      const targetStep = document.querySelector(`.trajectory-step[data-step="${stepNum}"]`);
      if (targetStep && typeof targetStep.scrollIntoView === 'function') {
        targetStep.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }

  const canHover = window.matchMedia('(hover: hover)').matches;

  steps.forEach(step => {
    const num = parseInt(step.getAttribute('data-step'), 10);
    // Clique para ativar
    step.addEventListener('click', () => {
      setActiveStep(num, true);
    });
    // Hover apenas em dispositivos desktop com ponteiro preciso
    if (canHover) {
      step.addEventListener('mouseenter', () => {
        setActiveStep(num, false);
      });
    }
    // Acessibilidade de Teclado (Setas Esquerda e Direita)
    step.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' && num < steps.length) {
        setActiveStep(num + 1, true);
        steps[num].focus();
      } else if (e.key === 'ArrowLeft' && num > 1) {
        setActiveStep(num - 1, true);
        steps[num - 2].focus();
      }
    });
  });

  // Arraste suave com mouse/trackpad para testes em emulação desktop
  if (track) {
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    track.addEventListener('mousedown', (e) => {
      isDown = true;
      track.classList.add('is-dragging');
      startX = e.pageX - track.offsetLeft;
      scrollLeft = track.scrollLeft;
    });

    window.addEventListener('mouseup', () => {
      if (isDown) {
        isDown = false;
        track.classList.remove('is-dragging');
      }
    });

    track.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - track.offsetLeft;
      const walk = (x - startX) * 1.4;
      track.scrollLeft = scrollLeft - walk;
    });
  }
}

// ==========================================================================
// 10. MODAL DE BIOGRAFIA COMPLETA & PESQUISAS (SOBRE.HTML)
// ==========================================================================
function initAuthorPageModal() {
  const openBtn = document.getElementById('btnOpenFullBioModal');
  const modal = document.getElementById('fullBioModal');
  const closeBtn = document.getElementById('btnCloseFullBioModal');

  if (!openBtn || !modal) return;

  openBtn.addEventListener('click', () => {
    if (typeof modal.showModal === 'function') {
      modal.showModal();
    } else {
      modal.setAttribute('open', '');
    }
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (typeof modal.close === 'function') {
        modal.close();
      } else {
        modal.removeAttribute('open');
      }
    });
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      if (typeof modal.close === 'function') {
        modal.close();
      } else {
        modal.removeAttribute('open');
      }
    }
  });
}

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initScrollEffects();
  initHeroParticles();
  init3DTilt();
  initAuthorTrajectory();
  initAuthorPageModal();
  cart.updateBadges();
  syncCatalogWithAPI();
});

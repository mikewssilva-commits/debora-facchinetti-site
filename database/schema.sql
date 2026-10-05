-- ==============================================================================
-- DÉBORA FACCHINETTI — LITERATURA, EDUCAÇÃO E HISTÓRIAS QUE TRANSFORMAM
-- Script Oficial de Criação do Banco de Dados (Supabase / PostgreSQL)
-- ==============================================================================

-- Habilita extensão para geração de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. AUTENTICAÇÃO DO ADMINISTRADOR DO PAINEL
-- ==============================================================================
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'admin', -- 'superadmin', 'admin', 'assistant'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 2. CLIENTES E ENDEREÇOS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(30) NOT NULL,
    cpf VARCHAR(14),
    customer_type VARCHAR(20) DEFAULT 'individual', -- 'individual' (família) ou 'school' (escola)
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    zip_code VARCHAR(10) NOT NULL,
    street VARCHAR(255) NOT NULL,
    number VARCHAR(30) NOT NULL,
    complement VARCHAR(100),
    bairro VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(2) NOT NULL,
    is_default BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 3. PRODUTOS (LIVROS E COMBOS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL,
    subtitle VARCHAR(255),
    product_type VARCHAR(20) NOT NULL DEFAULT 'book', -- 'book' ou 'bundle'
    price NUMERIC(10, 2) NOT NULL,
    original_price NUMERIC(10, 2),
    cover_url VARCHAR(255),
    stock_quantity INT NOT NULL DEFAULT 100,
    has_activity_book BOOLEAN DEFAULT TRUE,
    
    -- Campos para cálculo de Frete
    weight_grams INT DEFAULT 250,        -- Peso médio em gramas
    length_cm INT DEFAULT 25,             -- Comprimento da embalagem
    width_cm INT DEFAULT 20,              -- Largura
    height_cm INT DEFAULT 2,              -- Altura / Lombada
    
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 4. COMPOSIÇÃO DOS COMBOS (Baixa automática de estoque por livro)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS bundle_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bundle_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 5. TABELA DE BRINDES (Controle Físico e Estoque)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS gifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    character_name VARCHAR(100), -- Ex: 'Getúlio', 'Bartô', 'Dante', 'Dona Arborina', 'Plácido'
    image_url VARCHAR(255),
    stock_quantity INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 6. MÉTODOS E REGRAS DE FRETE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS shipping_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,            -- Ex: 'Correios - PAC', 'Correios - SEDEX', 'Impresso Módico'
    carrier VARCHAR(50) NOT NULL,          -- 'correios', 'jadlog', 'local_pickup'
    service_code VARCHAR(30),              -- Código de serviço dos Correios (ex: '04510')
    min_days INT DEFAULT 3,
    max_days INT DEFAULT 12,
    fixed_price NUMERIC(10, 2) DEFAULT 0.00,
    free_shipping_threshold NUMERIC(10, 2), -- Valor mínimo para frete grátis (ex: 299.00)
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 7. REGRAS DE PROMOÇÕES E BRINDES INTELIGENTES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(150) NOT NULL,
    trigger_type VARCHAR(30) NOT NULL,     -- 'min_subtotal', 'buy_combo', 'coupon'
    min_subtotal NUMERIC(10, 2),           -- Ex: 299.00
    reward_type VARCHAR(30) NOT NULL,      -- 'gift_choice', 'free_shipping', 'discount'
    discount_percentage NUMERIC(5, 2),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 8. PEDIDOS (ORDEM DE COMPRA, DEDICATÓRIA E LOGÍSTICA)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code VARCHAR(20) UNIQUE NOT NULL, -- Ex: 'DF-2026-0001'
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    
    -- Valores
    subtotal NUMERIC(10, 2) NOT NULL,
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    shipping_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(10, 2) NOT NULL,
    
    -- Status
    payment_status VARCHAR(30) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'refunded'
    fulfillment_status VARCHAR(30) NOT NULL DEFAULT 'pending', -- 'pending', 'preparing', 'shipped', 'delivered', 'cancelled'
    
    -- Aspecto Afetivo & Brindes
    autograph_notes TEXT,                   -- Nome da criança e mensagem para a Débora autografar
    gift_id UUID REFERENCES gifts(id),     -- Brinde físico associado
    gift_notes VARCHAR(150),                -- Ex: 'Camiseta Bartô - Tam 6 Infantil'
    
    -- Dados de Frete e Rastreio
    shipping_method_id UUID REFERENCES shipping_methods(id),
    shipping_address JSONB NOT NULL,        -- Snapshot imutável do endereço de entrega
    tracking_code VARCHAR(50),              -- Código de rastreio dos Correios
    tracking_url VARCHAR(255),
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 9. ITENS DO PEDIDO
-- ==============================================================================
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_title VARCHAR(200) NOT NULL,
    product_sku VARCHAR(50) NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    total_price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 10. PAGAMENTOS (PREPARADO PARA MERCADO PAGO E WEBHOOKS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    gateway VARCHAR(30) NOT NULL DEFAULT 'mercadopago',
    gateway_payment_id VARCHAR(100),       -- ID da transação no Mercado Pago
    payment_method VARCHAR(30) NOT NULL,   -- 'pix', 'credit_card', 'boleto'
    status VARCHAR(30) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'in_process', 'rejected'
    
    -- Dados específicos do PIX
    pix_qr_code TEXT,                      -- Chave Copia e Cola
    pix_qr_code_image TEXT,                -- Imagem Base64 do QR Code
    
    -- Dados de Cartão
    installments INT DEFAULT 1,
    card_brand VARCHAR(30),
    card_last_four VARCHAR(4),
    
    paid_at TIMESTAMPTZ,
    raw_webhook_data JSONB,                -- Registro do webhook para auditoria
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 11. HISTÓRICO DE STATUS (Linha do Tempo de Logística)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    description TEXT,
    notify_customer BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 12. ÍNDICES DE PERFORMANCE E INTEGRIDADE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_code ON orders(order_code);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_status ON orders(fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_id ON payments(gateway_payment_id);
CREATE INDEX IF NOT EXISTS idx_bundle_items_bundle_id ON bundle_items(bundle_id);

-- ==============================================================================
-- 13. DADOS INICIAIS (SEED DAS 6 OBRAS E KITS ATUAIS DA DÉBORA)
-- ==============================================================================
INSERT INTO products (sku, title, subtitle, product_type, price, original_price, cover_url, stock_quantity, display_order)
VALUES 
('LIV-GETULIO', 'Getúlio, jacaré ou bagulho?', 'Uma fábula sobre respeito, meio ambiente e o valor de ser diferente', 'book', 50.00, NULL, 'assets/images/livro_getulio.jpg', 150, 1),
('LIV-GETULIO-INFANCIA', 'Como tudo começou... do nascimento à infância de Getúlio', 'A história por trás do jacarezinho que conquistou os leitores', 'book', 50.00, NULL, 'assets/images/livro_getulio_infancia.jpg', 150, 2),
('LIV-BARTOLOMEU', 'Bartolomeu, o gato autista', 'Uma história sobre inclusão, respeito e o jeito único de cada um ser', 'book', 50.00, NULL, 'assets/images/livro_bartolomeu.jpg', 150, 3),
('LIV-DANTE', 'O Caranguejo que Não Queria Se Molhar', 'Uma história sobre medo, coragem, amizade e superação', 'book', 50.00, NULL, 'assets/images/livro_caranguejo_dante.jpg', 150, 4),
('LIV-VOVO', 'Cadê minha vovó?', 'Uma história sobre amor, saudade, memória e acolhimento', 'book', 74.90, NULL, 'assets/images/livro_vovo.jpg', 120, 5),
('LIV-PLACIDO', 'Plácido não queria ir à escola', 'Uma história sobre bullying, acolhimento, empatia e cuidado', 'book', 60.00, NULL, 'assets/images/livro_placido.jpg', 150, 6),
('KIT-GETULIO', 'Kit Duplo Getúlio (2 Livros + 2 Cadernos)', 'Getúlio, jacaré ou bagulho? + Como tudo começou...', 'bundle', 90.00, 100.00, 'assets/images/livro_getulio.jpg', 50, 7),
('KIT-COMPLETO', 'Coleção Completa Débora Facchinetti (6 Obras + Frete Grátis)', 'Todos os 6 livros infantis com cadernos pedagógicos + dedicatória exclusiva', 'bundle', 299.00, 334.90, 'assets/images/debora_bookshelf.jpg', 40, 8)
ON CONFLICT (sku) DO NOTHING;

-- Seed inicial de Brindes Oficiais
INSERT INTO gifts (sku, name, description, character_name, stock_quantity, is_active)
VALUES
('GIFT-CAM-GETULIO', 'Camiseta Infantil - Getúlio (Jacarezinho)', 'Camiseta 100% algodão com estampa exclusiva do Getúlio', 'Getúlio', 50, TRUE),
('GIFT-CAM-BARTO', 'Camiseta Infantil - Bartô (Gatinho)', 'Camiseta 100% algodão com estampa inclusiva do Bartolomeu', 'Bartô', 50, TRUE),
('GIFT-CAM-DANTE', 'Camiseta Infantil - Caranguejo Dante', 'Camiseta 100% algodão com estampa do Caranguejo Dante', 'Caranguejo Dante', 50, TRUE),
('GIFT-CAM-VOVO', 'Camiseta Infantil - Dona Arborina & Jussara', 'Camiseta 100% algodão com estampa afetuosa', 'Dona Arborina & Jussara', 50, TRUE),
('GIFT-CAM-PLACIDO', 'Camiseta Infantil - Plácido (Sapinho)', 'Camiseta 100% algodão com estampa do Sapinho Plácido', 'Plácido', 50, TRUE)
ON CONFLICT (sku) DO NOTHING;

-- Seed inicial de Métodos de Frete
INSERT INTO shipping_methods (name, carrier, min_days, max_days, fixed_price, free_shipping_threshold, is_active)
VALUES
('Envio Econômico (Impresso Módico)', 'correios', 5, 12, 15.00, 299.00, TRUE),
('Sedex Expresso', 'correios', 2, 4, 35.00, NULL, TRUE),
('Retirada Presencial em Teresina', 'local_pickup', 1, 1, 0.00, 0.00, TRUE)
ON CONFLICT DO NOTHING;

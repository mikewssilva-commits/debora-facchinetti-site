const express = require('express');
const cors = require('cors');
const path = require('path');
const { exec } = require('child_process');
require('dotenv').config();

const app = express();
let currentPort = parseInt(process.env.PORT, 10) || 3000;

// 1. Middlewares globais essenciais
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Rota de Health Check / Status da API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    project: 'Débora Facchinetti — Literatura & Educação',
    architecture: 'Express.js Backend',
    timestamp: new Date().toISOString()
  });
});

// 3. Rotas da API
const productsRoutes = require('./src/routes/products.routes');
const customersRoutes = require('./src/routes/customers.routes');
const ordersRoutes = require('./src/routes/orders.routes');
const paymentsRoutes = require('./src/routes/payments.routes');
const adminRoutes = require('./src/routes/admin.routes');

app.use('/api/products', productsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/admin', adminRoutes);

// 4. Arquivos Estáticos e Assets (Assets, Admin e Raiz)
const baseDir = __dirname || process.cwd();

// Servir a pasta /assets explicitamente (CSS, JS, Imagens, Fontes)
app.use('/assets', express.static(path.join(baseDir, 'assets'), {
  maxAge: '1d'
}));

// Servir arquivos do painel /admin (CSS, JS, etc.)
app.use('/admin', express.static(path.join(baseDir, 'admin'), {
  maxAge: '1d'
}));

// Servir arquivos da raiz (HTMLs, mídias, imagens soltas)
app.use(express.static(path.join(baseDir), {
  extensions: ['html'],
  index: 'index.html',
  maxAge: '0'
}));

// 5. Rotas explícitas para as páginas HTML (com e sem .html)
const pages = [
  'index',
  'loja',
  'checkout',
  'sobre',
  'livros',
  'palestras',
  'depoimentos',
  'contato',
  'rastreio'
];

// Rota raiz
app.get('/', (req, res) => {
  res.sendFile(path.join(baseDir, 'index.html'));
});

// Rotas de cada página
pages.forEach(page => {
  const file = path.join(baseDir, `${page}.html`);
  app.get(`/${page}`, (req, res) => res.sendFile(file));
  app.get(`/${page}.html`, (req, res) => res.sendFile(file));
});

// Rotas do painel Admin
app.get('/admin', (req, res) => {
  res.sendFile(path.join(baseDir, 'admin', 'index.html'));
});
app.get('/admin/index.html', (req, res) => {
  res.sendFile(path.join(baseDir, 'admin', 'index.html'));
});
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(baseDir, 'admin', 'login.html'));
});
app.get('/admin/login.html', (req, res) => {
  res.sendFile(path.join(baseDir, 'admin', 'login.html'));
});

// 6. Fallback 404 amigável
app.use((req, res) => {
  res.status(404).send('<h1>404 - Página Não Encontrada</h1><p><a href="/">Voltar ao início</a></p>');
});

// 5. Inicialização do servidor com tratamento de porta ocupada (EADDRINUSE)
function startServer(port) {
  const server = app.listen(port, () => {
    const localUrl = `http://localhost:${port}`;
    console.log(`\n==================================================`);
    console.log(`  ✨ Débora Facchinetti — Literatura & Educação`);
    console.log(`  🚀 Backend Express ativo: ${localUrl}`);
    console.log(`  ⚡ Monitoramento em tempo real ativo`);
    console.log(`  🛑 Pressione Ctrl + C para encerrar o servidor`);
    console.log(`==================================================\n`);

    if (process.argv.includes('--open')) {
      const startCmd = process.platform === 'darwin' ? 'open' :
                       process.platform === 'win32' ? 'start ""' : 'xdg-open';
      exec(`${startCmd} "${localUrl}"`);
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`\n⚠️  Porta ${port} já está ocupada. Tentando automaticamente a porta ${port + 1}...`);
      setTimeout(() => {
        startServer(port + 1);
      }, 250);
    } else {
      console.error('Erro no servidor:', err);
    }
  });
}

if (!process.env.VERCEL) {
  startServer(currentPort);
}

module.exports = app;

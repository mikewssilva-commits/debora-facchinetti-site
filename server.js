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

app.use('/api/products', productsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/orders', ordersRoutes);

// 4. Servir arquivos estáticos (páginas HTML, CSS, JS, imagens, mídias)
// Suporta URLs com .html e URLs amigáveis sem extensão
app.use(express.static(__dirname, {
  extensions: ['html'],
  index: 'index.html',
  maxAge: '0'
}));

// 4. Fallback 404 amigável
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

startServer(currentPort);

module.exports = app;

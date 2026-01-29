const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');

// ============================================
// 📦 IMPORT MODULES
// ============================================
const config = require('./config');
const logger = require('./utils/logger');
const scanController = require('./controllers/scan.controller');
const scannerService = require('./services/scanner.service');
const apiRoutes = require('./routes/api.routes');

// ============================================
// 🚀 EXPRESS APP
// ============================================
const app = express();

// Middleware
app.use(express.json());
app.use(express.text({ type: '*/*' }));
app.use(express.urlencoded({ extended: true }));
app.use('/assets', express.static(config.paths.assets));

// API Routes
app.use('/api', apiRoutes);

// ============================================
// 🌐 WEB ROUTES
// ============================================

/**
 * Render view template
 */
function renderView(filename, data = {}) {
  let html = fs.readFileSync(
    path.join(config.paths.views, filename), 
    'utf8'
  );
  
  Object.keys(data).forEach(key => {
    const value = typeof data[key] === 'string' 
      ? data[key] 
      : JSON.stringify(data[key]);
    html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });
  
  return html;
}

/**
 * Login page
 */
app.get('/', (req, res) => {
  res.send(renderView('login.html'));
});

/**
 * Dashboard - requires login
 */
app.get('/dashboard', (req, res) => {
  if (!scanController.isLoggedIn()) {
    return res.redirect('/');
  }
  res.send(renderView('dashboard.html'));
});

/**
 * QR Code Generator
 */
app.get('/generate-qr', (req, res) => {
  const storageService = require('./services/storage.service');
  const STAFF_LIST = storageService.loadStaffList();
  
  res.send(renderView('generate-qr.html', { STAFF_LIST }));
});

// ============================================
// 🔌 SCANNER INITIALIZATION
// ============================================

/**
 * Initialize scanners with callback
 */
scannerService.initialize(
  config.gates,
  (scanData) => scanController.handleScan(scanData)
);

// ============================================
// 🖥️ SYSTEM UTILITIES
// ============================================

/**
 * Get local IP address
 */
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (let iface of Object.values(interfaces)) {
    for (let alias of iface) {
      if (alias.family === 'IPv4' && !alias.internal) {
        return alias.address;
      }
    }
  }
  return 'localhost';
}

/**
 * Create desktop shortcut
 */
function createDesktopShortcut() {
  try {
    const desktopPath = path.join(os.homedir(), 'Desktop');
    const shortcutPath = path.join(desktopPath, '🎫 QR Kiểm Soát.url');
    
    if (fs.existsSync(shortcutPath)) {
      fs.unlinkSync(shortcutPath);
    }
    
    const iconPath = path.join(config.paths.assets, 'images', 'logo.ico')
      .replace(/\\/g, '\\\\');
    
    const shortcutContent = `[InternetShortcut]
URL=http://localhost:${config.server.port}
IconIndex=0
IconFile=${iconPath}
`;
    
    fs.writeFileSync(shortcutPath, shortcutContent);
    logger.success('Desktop shortcut created');
  } catch (err) {
    logger.warn('Could not create desktop shortcut', { error: err.message });
  }
}

/**
 * Display startup banner
 */
function displayStartupBanner() {
  const localIP = getLocalIP();
  
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║  🚀 QR Access Control System (ME31)           ║');
  console.log(`║  📡 Port: ${config.server.port}                                 ║`);
  console.log(`║  🔌 Controller: ME31 Modbus TCP               ║`);
  console.log('╚════════════════════════════════════════════════╝');
  console.log('\n📍 Access URLs:');
  console.log(`   🏠 Local:   http://localhost:${config.server.port}`);
  console.log(`   🌐 Network: http://${localIP}:${config.server.port}`);
  console.log('\n🔌 ME31 Devices:');
  
  Object.entries(config.gates).forEach(([key, gate]) => {
    console.log(
      `   ${gate.name}: ${gate.me31.ip}:${gate.me31.port} ` +
      `(Relay ${gate.me31.relayChannel + 1})`
    );
  });
  console.log('');
}

// ============================================
// 🚀 START SERVER
// ============================================

app.listen(config.server.port, config.server.host, () => {
  displayStartupBanner();
  createDesktopShortcut();
  
  // Auto-open browser
  exec(`start http://localhost:${config.server.port}`);
  
  logger.success('Server started successfully');
});

// ============================================
// 🛑 GRACEFUL SHUTDOWN
// ============================================

process.on('SIGINT', () => {
  logger.info('Shutting down gracefully...');
  
  // Disconnect scanners
  scannerService.disconnectAll();
  
  // Clear SSE clients
  scanController.sseClients.clear();
  
  logger.success('Service stopped');
  process.exit(0);
});
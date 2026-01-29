const express = require('express');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');
const fs = require('fs');

// ============================================
// 📦 IMPORT CONFIGS
// ============================================
const { PORT } = require('./config/server.config');
const { GATES } = require('./config/gates.config');

// ============================================
// 📦 IMPORT SERVICES
// ============================================
const { ensureSoundFolder, playSoundSuccess, playSoundDenied, playSoundCCCDRequest } = require('./services/audio.service');
const { findStaffById, saveStaffScan } = require('./services/staff.service');
const { openDoorInBio, getNextCommand, hasCommands, addKeepAliveCommand } = require('./services/inbio.service');
const { verifyWithMainServer, extractCitizenInfo } = require('./services/api.service');
const { initScanners } = require('./scanner.service');

// ============================================
// 📦 IMPORT ROUTES
// ============================================
const { router: webRouter, getCurrentLoginSession, setCurrentLoginSession } = require('./routes/web.routes');
const { router: apiRouter, setLatestScan } = require('./routes/api.routes');

// ============================================
// 🚀 EXPRESS APP
// ============================================
const app = express();

app.use(express.json());
app.use(express.text({ type: '*/*' }));
app.use(express.urlencoded({ extended: true }));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// ============================================
// 🎯 PROCESSING STATE
// ============================================
let isProcessing = false;
let lastPollTime = 0;
let warmupTimer = null;

// ============================================
// 🔧 CORE PROCESSING FUNCTIONS
// ============================================
async function processStaffScan(qrData, inbioConfig) {
  const staffId = qrData.replace('STAFF:', '');
  const staff = findStaffById(staffId);
  
  if (!staff) {
    console.log('❌ Invalid staff QR code');
    return;
  }

  console.log(`✅ Staff: ${staff.name} (${staff.position})`);
  
  const doorOpened = await openDoorInBio(inbioConfig);
  console.log(doorOpened ? '   🚪 Door OPENED' : '   ❌ Door failed');
  
  const scanType = !getCurrentLoginSession() ? 'Đăng nhập' : 'Chưa rõ lý do';
  
  const scanRecord = {
    staffId: staff.id,
    staffName: staff.name,
    position: staff.position,
    dob: staff.dob,
    scanType: scanType,
    timestamp: new Date().toISOString(),
    note: ''
  };
  
  saveStaffScan(scanRecord);
  
  if (!getCurrentLoginSession()) {
    setCurrentLoginSession({
      staffId: staff.id,
      staffName: staff.name,
      position: staff.position,
      loginTime: new Date().toISOString()
    });
    console.log(`   🔓 Dashboard access granted`);
  }
}

async function processGuestScan(qrData, gateName, gateKey, apikey, inbio) {
  const guestInfo = extractCitizenInfo(qrData);
  console.log(`   📋 ${guestInfo.fullName} | 🆔 ${guestInfo.citizenId}`);
  
  const serverResponse = await verifyWithMainServer(guestInfo.citizenId, apikey, 1500);
  
  const isCCCD = /^\d{12}$/.test(guestInfo.citizenId);
  const isVietnamese = isCCCD || (serverResponse?.quoctichvn === 1);
  
  const scanData = {
    type: 'GUEST',
    citizenId: guestInfo.citizenId,
    idNumber: guestInfo.idNumber,
    fullName: guestInfo.fullName,
    dob: guestInfo.dob,
    gender: guestInfo.gender,
    timestamp: new Date().toISOString(),
    serverResponse,
    processedBy: gateName,
    gateKey: gateKey
  };
  
  setLatestScan(scanData);
  
  if (serverResponse?.alert === 'thanhcong') {
    console.log(`✅ GRANTED`);
    
    if (serverResponse.yeucaucccd === 1) {
      console.log(`   🪪 CCCD verification required`);
      playSoundCCCDRequest(true);
    } else {
      openDoorInBio(inbio);
      console.log(`   🚪 Door command sent`);
    }
  } else {
    console.log(`❌ DENIED`);
    playSoundDenied(isVietnamese);
  }
}

// ============================================
// 🔌 ZEBRA SCANNER CALLBACK
// ============================================
initScanners(GATES, async ({ gateKey, gateName, qrData, apikey, inbio }) => {
  if (isProcessing) {
    console.log('⏳ Already processing, skipping...');
    return;
  }
  
  isProcessing = true;
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📋 QR Scanned from: ${gateName}`);
  console.log(`📄 Raw Data: ${qrData.substring(0, 50)}...`);
  console.log(`🕐 Time: ${new Date().toLocaleString()}`);
  
  try {
    if (qrData.startsWith('STAFF:')) {
      await processStaffScan(qrData, inbio);
    } 
    else {
      if (!getCurrentLoginSession()) {
        console.log(`❌ [${gateName}] Chưa đăng nhập - bỏ qua`);
        return;
      }
      
      await processGuestScan(qrData, gateName, gateKey, apikey, inbio);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    isProcessing = false;
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
});

// ============================================
// 🌐 MOUNT ROUTES
// ============================================
app.use('/', webRouter);
app.use('/api', apiRouter);

// ============================================
// 🎯 INBIO API ENDPOINTS
// ============================================
app.get('/iclock/cdata', (req, res) => res.send('OK'));
app.post('/iclock/registry', (req, res) => res.send('RegistryCode=ABC123DEF456'));

app.get('/iclock/push', (req, res) => {
  console.log('📥 InBio đang lấy config mới');
  res.send(`ServerVersion=3.0.1
ServerName=CANG_SA_KY_GATE
PushVersion=3.0.1
Realtime=1
RequestDelay=0.05000000

TimeoutSec=5`);
});

app.get('/iclock/ping', (req, res) => res.send('OK'));

app.get('/iclock/getrequest', (req, res) => {
  const now = Date.now();
  const interval = lastPollTime ? now - lastPollTime : 0;
  lastPollTime = now;
  
  if (interval > 0) {
    console.log(`📊 InBio poll sau ${Math.round(interval/1000)}s`);
  }

  if (!hasCommands()) {
    return res.send('OK');
  }
  
  const cmd = getNextCommand();
  console.log(`📤 Command: ${cmd.command}`);
  res.send(cmd.command);
});

app.post('/iclock/devicecmd', (req, res) => res.send('OK'));

// ============================================
// 🛠️ HELPER FUNCTIONS
// ============================================
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

function createDesktopShortcut() {
  try {
    const desktopPath = path.join(os.homedir(), 'Desktop');
    const shortcutPath = path.join(desktopPath, '🎫 QR Kiểm Soát.url');
    
    if (fs.existsSync(shortcutPath)) {
      fs.unlinkSync(shortcutPath);
    }
    
    const iconPath = path.join(__dirname, 'assets', 'images', 'logo.ico').replace(/\\/g, '\\\\');
    
    const shortcutContent = `[InternetShortcut]
      URL=http://localhost:${PORT}
      IconIndex=0
      IconFile=${iconPath}
    `;
    fs.writeFileSync(shortcutPath, shortcutContent);
    console.log('   ✅ Desktop shortcut created with custom icon!');
  } catch (err) {
    console.log('   ⚠️  Could not create shortcut:', err.message);
  }
}

// ============================================
// 🚀 START SERVER
// ============================================
app.listen(PORT, '0.0.0.0', () => {
  ensureSoundFolder();
  
  const localIP = getLocalIP();
  
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║  🚀 QR Access Control System Running          ║');
  console.log(`║  📡 Port: ${PORT}                                 ║`);
  console.log(`║  🌐 Server: noibo.cangsaky.com.vn              ║`);
  console.log('╚════════════════════════════════════════════════╝');
  console.log('\n📍 Access from:');
  console.log(`   🏠 This computer:  http://localhost:${PORT}`);
  console.log(`   🌐 Other devices:  http://${localIP}:${PORT}`);
  
  createDesktopShortcut();
  exec(`start http://localhost:${PORT}`);

  // ⭐ KEEP INBIO ALIVE
  warmupTimer = setInterval(() => {
    if (hasCommands()) return;
    addKeepAliveCommand();
    console.log('🔥 Keep-alive queued (idle)');
  }, 20000);
});

process.on('SIGINT', () => {
  console.log('\n\n👋 Service stopped');
  if (warmupTimer) clearInterval(warmupTimer);
  const { clearAllSSEClients } = require('./utils/sse.util');
  clearAllSSEClients();
  process.exit(0);
});
const express = require('express');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const player = require('play-sound')(opts = {});
const { execFile } = require('child_process');
const app = express();

const { initScanners } = require('./scanner.service');

// ============================================
// 🔧 CẤU HÌNH
// ============================================
const PORT = 8080;
// const CURRENT_GATE = 'GATE_A';

const GATES = {
  GATE_A: {
    name: 'Cổng A',
    com: 'COM4',
    apikey: 'n6NIHw6B69iXFIXrve05hC49v8hclIn2',
    inbio: { ip: '192.168.2.35', port: 8080, doorId: 1 }
  },
  GATE_B: {
    name: 'Cổng B',
    com: 'COM3',
    apikey: 'd16Y43G0y2bO592qdxqwYk2d1PLFBqW8',
    inbio: { ip: '192.168.2.35', port: 8080, doorId: 2 }
  }
};

// const GATE_CONFIG = GATES[CURRENT_GATE];
const LOGIN_HISTORY_FILE = path.join(__dirname, 'staff-scan-history.json');

const SOUND_FILES = {
  SUCCESS_VN: path.join(__dirname, 'sounds', 'moi-quy-khach-qua.mp3'),
  SUCCESS_FOREIGN: path.join(__dirname, 'sounds', 'moi-quy-khach-qua-v2.mp3'),
  DENIED_VN: path.join(__dirname, 'sounds', 've-khong-hop-le.mp3'),
  DENIED_FOREIGN: path.join(__dirname, 'sounds', 've-khong-hop-le-v2.mp3'),
  ERROR: path.join(__dirname, 'sounds', 'loi-he-thong.mp3'),
};

 const MAIN_SERVER = {
  url: 'https://noibo.cangsaky.com.vn/api.php',
  module: 'phongve',
  action: 'KiemSoat',
  payload: '0'
};

// DANH SÁCH NHÂN VIÊN
const STAFF_LIST = [
  { id: 'NV001', name: 'Nguyễn Hữu Đoan', position: 'Giám đốc', dob: '23/6/1971' },
  { id: 'NV002', name: 'Phạm Tấn Duy', position: 'Phó Giám đốc', dob: '24/9/1988' },
  { id: 'NV003', name: 'Trần Bút', position: 'Phó Giám đốc', dob: '10/3/1966' },
  { id: 'NV004', name: 'Đoàn Khắc A Duyệt', position: 'Trưởng phòng', dob: '03/01/1985' },
  { id: 'NV005', name: 'Lê Văn Sanh', position: 'Tổ trưởng', dob: '26/7/1988' },
  { id: 'NV006', name: 'Nguyễn T Sơn Thủy', position: 'Nhân viên', dob: '08/3/1983' },
  { id: 'NV007', name: 'Lê Văn Tiên', position: 'Nhân viên', dob: '08/11/1992' },
  { id: 'NV008', name: 'Trương Đình Hòa', position: 'Nhân viên', dob: '18/10/1988' },
  { id: 'NV009', name: 'Lê Văn Quang', position: 'Nhân viên', dob: '18/4/1984' },
  { id: 'NV010', name: 'Phan Văn Hùng', position: 'Nhân viên', dob: '22/9/1997' },
  { id: 'NV011', name: 'Nguyễn Quang Lam', position: 'Nhân viên', dob: '01/3/1995' },
  { id: 'NV012', name: 'Dương T Kim Phượng', position: 'Nhân viên', dob: '11/10/1988' },
  { id: 'NV013', name: 'Mai Văn Tồn', position: 'Nhân viên', dob: '20/10/1984' },
  { id: 'NV014', name: 'Nguyễn Thị Thảo', position: 'Nhân viên', dob: '04/6/1991' },
  { id: 'NV015', name: 'Lê Thùy Mỹ Dung', position: 'Nhân viên', dob: '20/11/2000' },
  { id: 'NV016', name: 'Trần Thị Đạt', position: 'Nhân viên', dob: '10/9/1980' },
  { id: 'NV017', name: 'Phạm Nguyễn Anh Hoàng', position: 'Lái xe', dob: '16/6/1980' },
  { id: 'NV018', name: 'Trần Văn Dũng', position: 'Lái xe', dob: '20/3/2002' },
  { id: 'NV019', name: 'Nguyễn Chí Thiết', position: 'Bảo vệ', dob: '17/10/1983' },
  { id: 'NV020', name: 'Võ Trí Danh', position: 'Bảo vệ', dob: '10/7/1993' },
  { id: 'NV021', name: 'Lê Thị Thu', position: 'Tạp vụ', dob: '09/02/1979' },
  { id: 'NV022', name: 'Lê Văn Thanh', position: 'Nhân viên', dob: '02/3/1982' }
];

let currentLoginSession = null;
let latestScan = null;
let isProcessing = false;
let commandIdCounter = 0;
let commandQueue = [];

// ============================================
// 📡 SSE - Server-Sent Events
// ============================================
const sseClients = new Set();

function sendSSEToAllClients(data) {
  sseClients.forEach(client => {
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  });
  console.log(`   📤 SSE pushed to ${sseClients.size} client(s)`);
}

// ============================================
// 🔊 AUDIO PLAYER FUNCTIONS
// ============================================
function playSound(soundFile, description = '') {
  if (!fs.existsSync(soundFile)) {
    console.error(`   ❌ Sound file not found: ${soundFile}`);
    console.error(`   💡 Please create this file with recorded voice`);
    return;
  }

  console.log(`   🔊 Playing: ${description || path.basename(soundFile)}`);
  
  player.play(soundFile, (err) => {
    if (err) {
      console.error(`   ❌ Audio Error: ${err.message}`);
    }
  });
}

let isPlayingSound = false;

function playSoundSilent(soundFile) {
  if (!fs.existsSync(soundFile)) {
    console.error('❌ Sound file not found:', soundFile);
    return;
  }

  if (isPlayingSound) return;
  isPlayingSound = true;

  execFile(
    'ffplay',
    [
      '-nodisp',
      '-autoexit',
      '-loglevel', 'error',
      soundFile
    ],
    {
      windowsHide: true
    },
    () => {
      isPlayingSound = false;
    }
  );
}

function playSoundSuccess(isVietnamese = true) {
  const soundFile = isVietnamese ? SOUND_FILES.SUCCESS_VN : SOUND_FILES.SUCCESS_FOREIGN;
  playSoundSilent(soundFile);
}

function playSoundDenied(isVietnamese = true) {
  const soundFile = isVietnamese ? SOUND_FILES.DENIED_VN : SOUND_FILES.DENIED_FOREIGN;
  playSoundSilent(soundFile);
}

function playSoundStaffWelcome() {
  playSoundSilent(SOUND_FILES.STAFF_WELCOME);
}

function ensureSoundFolder() {
  const soundsDir = path.join(__dirname, 'sounds');
  if (!fs.existsSync(soundsDir)) {
    fs.mkdirSync(soundsDir);
    console.log('📁 Created sounds folder');
  }
  
  console.log('\n🔊 Checking sound files:');
  Object.entries(SOUND_FILES).forEach(([key, filePath]) => {
    if (fs.existsSync(filePath)) {
      console.log(`   ✅ ${key}: ${path.basename(filePath)}`);
    } else {
      console.log(`   ⚠️  ${key}: ${path.basename(filePath)} - MISSING`);
    }
  });
  console.log('');
}

function loadStaffScanHistory() {
  try {
    if (fs.existsSync(LOGIN_HISTORY_FILE)) {
      const data = fs.readFileSync(LOGIN_HISTORY_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading staff scan history:', error.message);
  }
  return [];
}

function saveStaffScan(record) {
  try {
    const history = loadStaffScanHistory();
    
    record.id = `SCAN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    history.unshift(record);
    
    if (history.length > 1000) {
      history.splice(1000);
    }
    
    fs.writeFileSync(LOGIN_HISTORY_FILE, JSON.stringify(history, null, 2));
    console.log('   💾 Saved staff scan to history');
  } catch (error) {
    console.error('   ❌ Error saving staff scan:', error.message);
  }
}

function updateStaffScanReason(scanId, reason) {
  try {
    const history = loadStaffScanHistory();
    const record = history.find(r => r.id === scanId);
    
    if (record) {
      record.note = reason;
      record.updatedAt = new Date().toISOString();
      fs.writeFileSync(LOGIN_HISTORY_FILE, JSON.stringify(history, null, 2));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error updating scan reason:', error.message);
    return false;
  }
}

function getView(filename, data = {}) {
  let html = fs.readFileSync(path.join(__dirname, 'views', filename), 'utf8');
  Object.keys(data).forEach(key => {
    const value = typeof data[key] === 'string' ? data[key] : JSON.stringify(data[key]);
    html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });
  return html;
}

// ============================================
// 🎯 CORE PROCESSING FUNCTIONS
// ============================================
async function processStaffScan(qrData, inbioConfig) {
  const staffId = qrData.replace('STAFF:', '');
  const staff = STAFF_LIST.find(s => s.id === staffId);
  
  if (!staff) {
    console.log('❌ Invalid staff QR code');
    playSoundDenied();
    return;
  }

  console.log(`✅ Access GRANTED for ${staff.name}`);
  const doorOpened = await openDoorInBio(inbioConfig); // ← Truyền config
  console.log(doorOpened ? '🚪 Door OPENED' : '❌ Door open failed');
  
  playSoundStaffWelcome();
  
  const scanType = !currentLoginSession ? 'Đăng nhập' : 'Chưa rõ lý do';
  console.log(`✅ Staff: ${staff.name} (${staff.position}) - ${scanType}`);
  
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
  
  if (!currentLoginSession) {
    currentLoginSession = {
      staffId: staff.id,
      staffName: staff.name,
      position: staff.position,
      loginTime: new Date().toISOString()
    };
    console.log(`🔓 Access granted to dashboard`);
  } else {
    console.log(`📝 Scan recorded for later explanation`);
  }
}

async function processGuestScan(qrData) {
  let citizenId, fullName;
  
  const parts = qrData.split('|');
  
  if (parts.length >= 2) {
    citizenId = parts[0];
    fullName = parts[2] || 'Unknown';
  } else {
    citizenId = qrData;
    fullName = 'Unknown';
  }
  
  const serverResponse = await verifyWithMainServer(citizenId);
  
  latestScan = {
    type: 'GUEST',
    citizenId,
    fullName,
    timestamp: new Date().toISOString(),
    serverResponse,
    processedBy: currentLoginSession?.staffName || 'System'
  };
  
  sendSSEToAllClients({
    event: 'newScan',
    data: latestScan
  });
  
  if (serverResponse && serverResponse.alert === 'thanhcong') {
    console.log(`✅ Access GRANTED`);
    
    // Phát âm thanh dựa vào quốc tịch
    const isVietnamese = serverResponse.quoctichvn === 1;
    console.log(`   🌍 Nationality: ${isVietnamese ? 'Vietnam' : 'Foreign'}`);
    playSoundSuccess(isVietnamese);
    
    const doorOpened = await openDoorInBio();
    console.log(doorOpened ? '🚪 Door OPENED' : '❌ Door open failed');
  } else {
    console.log(`❌ Access DENIED`);
    
    const isVietnamese = serverResponse?.quoctichvn === 1;
    console.log(`   🌍 Nationality: ${isVietnamese ? 'Vietnam' : 'Foreign'}`);
    playSoundDenied(isVietnamese);
  }
}

// ============================================
// 🔌 ZEBRA SCANNER INTEGRATION
// ============================================
initScanners(GATES, async ({ gateKey, gateName, qrData, apikey, inbio }) => {
  if (isProcessing) {
    console.log('⏳ Already processing, skipping...');
    return;
  }
  
  isProcessing = true;
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📋 QR Scanned from: ${gateName}`);
  console.log(`📄 Data: ${qrData}`);
  console.log(`🕐 Time: ${new Date().toLocaleString()}`);
  
  try {
    if (qrData.startsWith('STAFF:')) {
      await processStaffScan(qrData, inbio); // ← Truyền inbio config
    } 
    else {
      const serverResponse = await verifyWithMainServer(qrData, apikey); // ← Truyền apikey

      latestScan = {
        type: 'GUEST',
        citizenId: qrData,
        fullName: serverResponse?.text_1 || 'Unknown',
        timestamp: new Date().toISOString(),
        serverResponse,
        processedBy: gateName,
        gateKey: gateKey // ← Thêm để biết cổng nào
      };

      sendSSEToAllClients({
        event: 'newScan',
        data: latestScan
      });

      if (serverResponse?.alert === 'thanhcong') {
        console.log(`✅ [${gateName}] Access granted`);
        
        const isVietnamese = serverResponse.quoctichvn === 1;
        console.log(`   🌍 Nationality: ${isVietnamese ? 'Vietnam' : 'Foreign'}`);
        playSoundSuccess(isVietnamese);
        
        await openDoorInBio(inbio); // ← Truyền inbio config
      } else {
        console.log(`❌ [${gateName}] Access denied`);
        
        const isVietnamese = serverResponse?.quoctichvn === 1;
        console.log(`   🌍 Nationality: ${isVietnamese ? 'Vietnam' : 'Foreign'}`);
        playSoundDenied(isVietnamese);
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    isProcessing = false;
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
});

// initScanners(GATES, async ({ gateKey, gateName, qrData, apikey, doorId }) => {
//   if (isProcessing) {
//     console.log('⏳ Already processing, skipping...');
//     return;
//   }
  
//   isProcessing = true;
//   console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
//   console.log(`📋 QR Scanned from: ${gateName}`);
//   console.log(`📄 Data: ${qrData}`);
//   console.log(`🕐 Time: ${new Date().toLocaleString()}`);
  
//   try {
//     if (qrData.startsWith('STAFF:')) {
//       await processStaffScan(qrData);
//     } 
//     else {
//       // ===== FAKE DATA: Vé THÀNH CÔNG =====
//       const serverResponse = {
//         "makiemsoat": "530435258258460014",
//         "status": 1,
//         "background": "green",
//         "alert": "thanhcong",
//         "total": 2,
//         "text_1": "Nguyễn Thị Nhung 16/09/1993",
//         "text_2": "Đặc Khu Lý Sơn",
//         "text_3": "Người Lý Sơn",
//         "text_4": "Super Biển Đông 08:00 01/10",
//         "quoctichvn": 1
//       };
      
//       // ===== FAKE DATA: Vé THẤT BẠI =====
//       // const serverResponse = {
//       //   "makiemsoat": "830821359701940207",
//       //   "status": 0,
//       //   "background": "red",
//       //   "alert": "error",
//       //   "total": 1,
//       //   "text_1": "Tàu đã xuất cảng.",
//       //   "text_2": "Tàu An Vinh Express xuất cảng lúc 13:00 17/12",
//       //   "quoctichvn": 1
//       // };
      
//       // ===== CODE GỐC - Bỏ comment khi test xong =====
//       // const serverResponse = await verifyWithMainServer(qrData, apikey);

//       latestScan = {
//         type: 'GUEST',
//         citizenId: qrData,
//         fullName: serverResponse?.text_1 || 'Unknown',
//         timestamp: new Date().toISOString(),
//         serverResponse,
//         processedBy: gateName
//       };

//       // 📡 Push real-time qua SSE
//       sendSSEToAllClients({
//         event: 'newScan',
//         data: latestScan
//       });

//       if (serverResponse?.alert === 'thanhcong') {
//         console.log(`✅ [${gateName}] Access granted`);
        
//         const isVietnamese = serverResponse.quoctichvn === 1;
//         console.log(`   🌍 Nationality: ${isVietnamese ? 'Vietnam' : 'Foreign'}`);
//         playSoundSuccess(isVietnamese);
        
//         await openDoorInBio(doorId);
//       } else {
//         console.log(`❌ [${gateName}] Access denied`);
        
//         const isVietnamese = serverResponse?.quoctichvn === 1;
//         console.log(`   🌍 Nationality: ${isVietnamese ? 'Vietnam' : 'Foreign'}`);
//         playSoundDenied(isVietnamese);
//       }
//     }
//   } catch (error) {
//     console.error('❌ Error:', error.message);
//   } finally {
//     isProcessing = false;
//     console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
//   }
// });

async function verifyWithMainServer(citizenId, apikey) {
  console.log(`   📡 Verifying: ${citizenId}`);
  
  if (!apikey) {
    throw new Error('API key is required');
  }
  
  try {
    const formData = new FormData();
    formData.append('apikey', apikey); // ← Bắt buộc phải truyền vào
    formData.append('module', MAIN_SERVER.module);
    formData.append('action', MAIN_SERVER.action);
    formData.append('makiemsoat', citizenId);
    formData.append('payload', MAIN_SERVER.payload);
    
    const response = await axios.post(MAIN_SERVER.url, formData, {
      headers: formData.getHeaders(),
      timeout: 5000
    });
    
    console.log(`   📥 Response:`, response.data);
    return response.data;
    
  } catch (error) {
    console.error('   ❌ Server error:', error.message);
    return null;
  }
}

async function openDoorInBio(inbioConfig, seconds = 5) {
  if (!inbioConfig) {
    console.error('   ❌ InBio config is required');
    return false;
  }
  
  const cmdId = ++commandIdCounter;
  const door = inbioConfig.doorId;
  
  const doorHex = door.toString(16).padStart(2, '0');
  const secHex = seconds.toString(16).padStart(2, '0');

  const command = `C:${cmdId}:CONTROL DEVICE 01${doorHex}01${secHex}`;

  commandQueue.push({
    id: cmdId,
    command,
    timestamp: new Date(),
    door,
    ip: inbioConfig.ip
  });

  console.log(`   🔓 Command queued: ${command} (Door ${door} at ${inbioConfig.ip})`);
  return true;
}

// ============================================
// 🌐 WEB & API SERVER
// ============================================
app.use(express.json());
app.use(express.text({ type: '*/*' }));
app.use(express.urlencoded({ extended: true }));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// ============================================
// 📡 SSE ENDPOINT
// ============================================
app.get('/api/scan-stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (latestScan) {
    res.write(`data: ${JSON.stringify({
      event: 'newScan',
      data: latestScan
    })}\n\n`);
  }
  
  sseClients.add(res);
  console.log(`✅ SSE Client connected (Total: ${sseClients.size})`);
  
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 30000);
  
  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
    console.log(`❌ SSE Client disconnected (Total: ${sseClients.size})`);
  });
});

// ============================================
// 🎯 INBIO API ENDPOINTS
// ============================================
app.get('/iclock/cdata', (req, res) => res.send('OK'));
app.post('/iclock/registry', (req, res) => res.send('RegistryCode=ABC123DEF456'));
app.get('/iclock/push', (req, res) => {
  res.send(`ServerVersion=3.0.1
    ServerName=NODE_AC
    PushVersion=3.0.1
    Realtime=1
    RequestDelay=2
    TimeoutSec=10`);
});

app.get('/iclock/ping', (req, res) => res.send('OK'));

app.get('/iclock/getrequest', (req, res) => {
  if (commandQueue.length === 0) {
    return res.send('OK');
  }
  const cmd = commandQueue.shift();
  console.log(`📤 Sending command to InBio: ${cmd.command}`);
  res.send(cmd.command);
});

app.post('/iclock/devicecmd', (req, res) => res.send('OK'));

// ============================================
// 🌐 WEB INTERFACE
// ============================================
app.get('/', (req, res) => {
  res.send(getView('login.html'));
});

app.get('/dashboard', (req, res) => {
  if (!currentLoginSession) {
    res.redirect('/');
    return;
  }
  res.send(getView('dashboard.html'));
});

app.get('/generate-qr', (req, res) => {
  res.send(getView('generate-qr.html', { STAFF_LIST }));
});

// ============================================
// 🧪 TEST ENDPOINTS (Development only)
// ============================================
// app.post('/api/test-scan', async (req, res) => {
//   const { scenario } = req.body;
  
//   let mockResponse;
  
//   switch(scenario) {
//     case 'vn-success':
//       mockResponse = {
//         alert: 'thanhcong',
//         background: 'green',
//         quoctichvn: 1,
//         text_1: 'NGUYỄN VĂN A',
//         text_2: 'Hà Nội, Việt Nam',
//         text_3: 'Vé tháng',
//         text_4: 'Hết hạn: 31/12/2024',
//         total: 15
//       };
//       break;
      
//     case 'foreign-success':
//       mockResponse = {
//         alert: 'thanhcong',
//         background: 'blue',
//         quoctichvn: 0,
//         text_1: 'JOHN SMITH',
//         text_2: 'New York, USA',
//         text_3: 'Tourist Visa',
//         text_4: 'Valid until: 31/12/2024',
//         total: 3
//       };
//       break;
      
//     case 'vn-denied':
//       mockResponse = {
//         alert: 'thatbai',
//         background: 'red',
//         quoctichvn: 1,
//         text_1: 'VÉ KHÔNG HỢP LỆ',
//         text_2: 'Vui lòng liên hệ quầy vé'
//       };
//       break;
      
//     case 'foreign-denied':
//       mockResponse = {
//         alert: 'thatbai',
//         background: 'red',
//         quoctichvn: 0,
//         text_1: 'INVALID TICKET',
//         text_2: 'Please contact ticket office'
//       };
//       break;
      
//     default:
//       return res.status(400).json({ error: 'Invalid scenario' });
//   }
  
//   // Tạo latestScan giống như quét thật
//   latestScan = {
//     type: 'GUEST',
//     citizenId: `TEST_${Date.now()}`,
//     fullName: mockResponse.text_1,
//     timestamp: new Date().toISOString(),
//     serverResponse: mockResponse,
//     processedBy: 'TEST_API'
//   };
  
//   // Push qua SSE
//   sendSSEToAllClients({
//     event: 'newScan',
//     data: latestScan
//   });
  
//   // Phát âm thanh
//   if (mockResponse.alert === 'thanhcong') {
//     const isVietnamese = mockResponse.quoctichvn === 1;
//     console.log(`🧪 TEST: ${scenario} - ${isVietnamese ? 'Vietnamese' : 'Foreign'}`);
//     playSoundSuccess(isVietnamese);
//   } else {
//     const isVietnamese = mockResponse.quoctichvn === 1;
//     console.log(`🧪 TEST: ${scenario} - DENIED (${isVietnamese ? 'Vietnamese' : 'Foreign'})`);
//     playSoundDenied(isVietnamese);
//   }
  
//   res.json({ success: true, scenario, mockResponse });
// });

// ============================================
// 🔌 API ENDPOINTS
// ============================================
app.get('/api/check-login', (req, res) => {
  res.json({ isLoggedIn: currentLoginSession !== null });
});

app.get('/api/current-user', (req, res) => {
  res.json({ user: currentLoginSession });
});

app.post('/api/logout', (req, res) => {
  currentLoginSession = null;
  res.json({ success: true });
});

app.get('/api/latest-scan', (req, res) => {
  const staffHistory = loadStaffScanHistory();
  res.json({
    latestScan,
    history: staffHistory.slice(0, 50)
  });
});

app.get('/api/staff-history', (req, res) => {
  const { startDate, endDate } = req.query;
  let history = loadStaffScanHistory();
  
  if (startDate || endDate) {
    history = history.filter(record => {
      const recordDate = new Date(record.timestamp);
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      end.setHours(23, 59, 59, 999);
      
      return recordDate >= start && recordDate <= end;
    });
  }
  
  res.json({ history });
});

app.post('/api/update-scan-reason', (req, res) => {
  const { scanId, reason } = req.body;
  
  if (!scanId || !reason) {
    return res.status(400).json({ success: false, message: 'Missing scanId or reason' });
  }
  
  const success = updateStaffScanReason(scanId, reason);
  
  if (success) {
    res.json({ success: true, message: 'Cập nhật lý do thành công' });
  } else {
    res.status(404).json({ success: false, message: 'Không tìm thấy bản ghi' });
  }
});

// ============================================
// 🚀 START SERVER
// ============================================
const os = require('os');

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

// 🔥 TỰ ĐỘNG TẠO SHORTCUT KHI CHẠY LẦN ĐẦU
function createDesktopShortcut() {
  try {
    const desktopPath = path.join(os.homedir(), 'Desktop');
    const shortcutPath = path.join(desktopPath, '🎫 QR Kiểm Soát.url');
    
    if (!fs.existsSync(shortcutPath)) {
      const shortcutContent = `[InternetShortcut]
URL=http://localhost:${PORT}
IconIndex=0
IconFile=C:\\Windows\\System32\\imageres.dll
`;
      fs.writeFileSync(shortcutPath, shortcutContent);
      console.log('   ✅ Desktop shortcut created!');
    }
  } catch (err) {
    console.log('   ⚠️  Could not create shortcut:', err.message);
  }
}
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
  
  // Tạo shortcut tự động
  createDesktopShortcut();
  
  // Tự động mở browser lần đầu
  const { exec } = require('child_process');
  exec(`start http://localhost:${PORT}`);
});

process.on('SIGINT', () => {
  console.log('\n\n👋 Service stopped');
  sseClients.clear();
  process.exit(0);
});
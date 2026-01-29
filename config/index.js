const path = require('path');

// ============================================
// 🔧 CENTRALIZED CONFIGURATION
// ============================================

const config = {
  // Server Configuration
  server: {
    port: process.env.PORT || 8080,
    host: '0.0.0.0',
    env: process.env.NODE_ENV || 'development'
  },

  // Gate Configuration
  gates: {
    GATE_A: {
      name: 'Cổng A',
      locationId: 'Port_#0005.Hub_#0001',
      apikey: 'n6NIHw6B69iXFIXrve05hC49v8hclIn2',
      me31: {
        ip: '192.168.1.9',
        port: 502,
        relayChannel: 0,
        pulseDuration: 300
      }
    },
    GATE_B: {
      name: 'Cổng B',
      locationId: 'Port_#0003.Hub_#0001',
      apikey: 'd16Y43G0y2bO592qdxqwYk2d1PLFBqW8',
      me31: {
        ip: '192.168.1.9',
        port: 502,
        relayChannel: 1,
        pulseDuration: 300
      }
    }
  },

  // Main Server Configuration
  mainServer: {
    url: 'https://noibo.cangsaky.com.vn/api.php',
    module: 'phongve',
    action: 'KiemSoat',
    payload: '0',
    timeout: 2000
  },

  // File Paths
  paths: {
    root: __dirname,
    sounds: path.join(__dirname, '..', 'sounds'),
    views: path.join(__dirname, '..', 'views'),
    assets: path.join(__dirname, '..', 'assets'),
    data: path.join(__dirname, '..', 'data'),
    logs: path.join(__dirname, '..', 'logs')
  },

  // Sound Files
  sounds: {
    SUCCESS_VN: 'moi-quy-khach-qua.mp3',
    SUCCESS_FOREIGN: 'moi-quy-khach-qua-v2.mp3',
    DENIED_VN: 've-khong-hop-le.mp3',
    DENIED_FOREIGN: 've-khong-hop-le-v2.mp3',
    ERROR: 'loi-he-thong.mp3',
    CCCD_REQUEST_VN: 'vui-long-xuat-trinh-cccd.mp3',
    CCCD_REQUEST_FOREIGN: 'please-show-your-id.mp3'
  },

  // Business Rules
  business: {
    maxHistoryRecords: 1000,
    scanHistoryLimit: 50,
    sseHeartbeatInterval: 30000,
    processingLockTimeout: 5000
  }
};

module.exports = config;
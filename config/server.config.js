const path = require('path');

// ============================================
// 📡 SERVER CONFIGURATION
// ============================================

const PORT = 8080;

const MAIN_SERVER = {
  url: 'https://noibo.cangsaky.com.vn/api.php',
  module: 'phongve',
  action: 'KiemSoat',
  payload: '0'
};

const LOGIN_HISTORY_FILE = path.join(__dirname, '..', 'staff-scan-history.json');

module.exports = {
  PORT,
  MAIN_SERVER,
  LOGIN_HISTORY_FILE
};
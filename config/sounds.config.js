const path = require('path');

// ============================================
// 🔊 SOUND FILES CONFIGURATION
// ============================================

const SOUND_FILES = {
  SUCCESS_VN: path.join(__dirname, '..', 'sounds', 'moi-quy-khach-qua.mp3'),
  SUCCESS_FOREIGN: path.join(__dirname, '..', 'sounds', 'moi-quy-khach-qua-v2.mp3'),
  DENIED_VN: path.join(__dirname, '..', 'sounds', 've-khong-hop-le.mp3'),
  DENIED_FOREIGN: path.join(__dirname, '..', 'sounds', 've-khong-hop-le-v2.mp3'),
  ERROR: path.join(__dirname, '..', 'sounds', 'loi-he-thong.mp3'),
  CCCD_REQUEST_VN: path.join(__dirname, '..', 'sounds', 'vui-long-xuat-trinh-cccd.mp3'),
  CCCD_REQUEST_FOREIGN: path.join(__dirname, '..', 'sounds', 'please-show-your-id.mp3'),
};

module.exports = { SOUND_FILES };
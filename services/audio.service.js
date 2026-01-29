const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { SOUND_FILES } = require('../config/sounds.config');

// ============================================
// 🔊 AUDIO SERVICE
// ============================================

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
    ['-nodisp', '-autoexit', '-loglevel', 'error', soundFile],
    { windowsHide: true },
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

function playSoundCCCDRequest(isVietnamese = true) {
  const soundFile = isVietnamese ? SOUND_FILES.CCCD_REQUEST_VN : SOUND_FILES.CCCD_REQUEST_FOREIGN;
  playSoundSilent(soundFile);
}

function ensureSoundFolder() {
  const soundsDir = path.join(__dirname, '..', 'sounds');
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

module.exports = {
  playSoundSuccess,
  playSoundDenied,
  playSoundCCCDRequest,
  ensureSoundFolder
};
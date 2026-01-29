const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const config = require('../config');
const logger = require('../utils/logger');

// ============================================
// 🔊 AUDIO SERVICE
// ============================================

class AudioService {
  constructor() {
    this.isPlaying = false;
    this.soundsPath = config.paths.sounds;
    this.sounds = config.sounds;
    this.ensureSoundFolder();
  }

  ensureSoundFolder() {
    if (!fs.existsSync(this.soundsPath)) {
      fs.mkdirSync(this.soundsPath, { recursive: true });
      logger.info('Created sounds folder');
    }
    
    this.checkSoundFiles();
  }

  checkSoundFiles() {
    logger.info('Checking sound files:');
    Object.entries(this.sounds).forEach(([key, filename]) => {
      const filePath = path.join(this.soundsPath, filename);
      if (fs.existsSync(filePath)) {
        logger.success(`${key}: ${filename}`);
      } else {
        logger.warn(`${key}: ${filename} - MISSING`);
      }
    });
  }

  /**
   * Play sound file silently (no console output)
   */
  play(filename) {
    const soundFile = path.join(this.soundsPath, filename);

    if (!fs.existsSync(soundFile)) {
      logger.error('Sound file not found', null, { file: soundFile });
      return;
    }

    if (this.isPlaying) {
      logger.debug('Already playing sound, skipping');
      return;
    }

    this.isPlaying = true;

    execFile(
      'ffplay',
      ['-nodisp', '-autoexit', '-loglevel', 'error', soundFile],
      { windowsHide: true },
      (error) => {
        this.isPlaying = false;
        if (error) {
          logger.error('Error playing sound', error);
        }
      }
    );
  }

  /**
   * Play success sound based on nationality
   */
  playSuccess(isVietnamese = true) {
    const sound = isVietnamese 
      ? this.sounds.SUCCESS_VN 
      : this.sounds.SUCCESS_FOREIGN;
    this.play(sound);
  }

  /**
   * Play denied sound based on nationality
   */
  playDenied(isVietnamese = true) {
    const sound = isVietnamese 
      ? this.sounds.DENIED_VN 
      : this.sounds.DENIED_FOREIGN;
    this.play(sound);
  }

  /**
   * Play CCCD verification request
   */
  playCCCDRequest(isVietnamese = true) {
    const sound = isVietnamese 
      ? this.sounds.CCCD_REQUEST_VN 
      : this.sounds.CCCD_REQUEST_FOREIGN;
    this.play(sound);
  }

  /**
   * Play error sound
   */
  playError() {
    this.play(this.sounds.ERROR);
  }
}

// Singleton instance
const audioService = new AudioService();

module.exports = audioService;
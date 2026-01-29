const fs = require('fs');
const path = require('path');
const config = require('../config');

// ============================================
// 📝 PROFESSIONAL LOGGER
// ============================================

class Logger {
  constructor() {
    this.logDir = config.paths.logs;
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  getTimestamp() {
    return new Date().toISOString();
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = this.getTimestamp();
    const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';
    return `[${timestamp}] [${level}] ${message} ${metaStr}`;
  }

  writeToFile(level, message, meta) {
    const logFile = path.join(this.logDir, `${level.toLowerCase()}.log`);
    const formattedMsg = this.formatMessage(level, message, meta);
    
    fs.appendFile(logFile, formattedMsg + '\n', (err) => {
      if (err) console.error('Failed to write log:', err);
    });
  }

  info(message, meta = {}) {
    console.log(`ℹ️  ${message}`, meta);
    this.writeToFile('INFO', message, meta);
  }

  success(message, meta = {}) {
    console.log(`✅ ${message}`, meta);
    this.writeToFile('SUCCESS', message, meta);
  }

  warn(message, meta = {}) {
    console.warn(`⚠️  ${message}`, meta);
    this.writeToFile('WARN', message, meta);
  }

  error(message, error = null, meta = {}) {
    const errorMeta = error ? { 
      ...meta, 
      error: error.message, 
      stack: error.stack 
    } : meta;
    
    console.error(`❌ ${message}`, errorMeta);
    this.writeToFile('ERROR', message, errorMeta);
  }

  debug(message, meta = {}) {
    if (config.server.env === 'development') {
      console.log(`🔍 ${message}`, meta);
    }
  }

  separator() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

  scanHeader(gateName, qrData) {
    this.separator();
    console.log(`📋 QR Scanned from: ${gateName}`);
    console.log(`📄 Raw Data: ${qrData.substring(0, 50)}...`);
    console.log(`🕐 Time: ${new Date().toLocaleString()}`);
  }

  scanFooter() {
    this.separator();
    console.log('');
  }
}

// Singleton instance
const logger = new Logger();

module.exports = logger;
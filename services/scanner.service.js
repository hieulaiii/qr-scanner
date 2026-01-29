const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const logger = require('../utils/logger');

// ============================================
// 🔍 SCANNER SERVICE
// ============================================

class ScannerService {
  constructor() {
    this.connectedScanners = new Map();
    this.zebraVendorId = '05e0';
  }

  /**
   * Initialize all scanners for configured gates
   * @param {Object} gates - Gates configuration
   * @param {Function} onScan - Callback when QR is scanned
   */
  async initialize(gates, onScan) {
    logger.info('Scanning for Zebra devices...');
    
    try {
      const ports = await SerialPort.list();
      const zebraPorts = this.findZebraPorts(ports);
      
      if (zebraPorts.length === 0) {
        logger.error('No Zebra Scanner found!');
        return;
      }
      
      logger.success(`Found ${zebraPorts.length} Zebra Scanner(s)`);
      zebraPorts.forEach((p, i) => {
        logger.info(`${i + 1}. ${p.path} - locationId: ${p.locationId}`);
      });
      
      await this.connectGateScanners(gates, zebraPorts, onScan);
      
      this.logConnectionSummary(Object.keys(gates).length);
      
    } catch (error) {
      logger.error('Failed to initialize scanners', error);
    }
  }

  /**
   * Find all Zebra scanner ports
   */
  findZebraPorts(ports) {
    return ports.filter(p => 
      p.vendorId?.toLowerCase() === this.zebraVendorId
    );
  }

  /**
   * Connect scanners for all gates
   */
  async connectGateScanners(gates, zebraPorts, onScan) {
    for (const [gateKey, gate] of Object.entries(gates)) {
      const portInfo = zebraPorts.find(p => 
        p.locationId === gate.locationId
      );
      
      if (!portInfo) {
        this.logMissingScanner(gate, zebraPorts);
        continue;
      }
      
      await this.connectScanner(gateKey, gate, portInfo, onScan);
    }
  }

  /**
   * Connect individual scanner
   */
  async connectScanner(gateKey, gate, portInfo, onScan) {
    const port = new SerialPort({
      path: portInfo.path,
      baudRate: 9600,
      autoOpen: true
    });
    
    const parser = port.pipe(
      new ReadlineParser({ delimiter: '\r\n' })
    );
    
    parser.on('data', data => {
      const qrData = data.trim();
      if (!qrData) return;
      
      onScan({
        gateKey,
        gateName: gate.name,
        qrData,
        apikey: gate.apikey,
        me31: gate.me31
      });
    });
    
    port.on('open', () => {
      this.connectedScanners.set(gateKey, port);
      this.logScannerConnected(gate, portInfo);
    });
    
    port.on('error', err => {
      logger.error(`Scanner error at ${gate.name}`, err);
    });
  }

  /**
   * Log successful scanner connection
   */
  logScannerConnected(gate, portInfo) {
    logger.success(`${gate.name} connected`);
    logger.info(`└─ COM: ${portInfo.path} (auto-detected)`);
    logger.info(`└─ Location: ${gate.locationId}`);
    
    if (gate.me31) {
      logger.info(
        `└─ ME31: ${gate.me31.ip}:${gate.me31.port} (Relay ${gate.me31.relayChannel + 1})`
      );
    }
  }

  /**
   * Log missing scanner
   */
  logMissingScanner(gate, zebraPorts) {
    logger.error(`Scanner not found for ${gate.name}`);
    logger.warn(`Required locationId: ${gate.locationId}`);
    logger.info('Available scanners:');
    
    zebraPorts.forEach(p => {
      logger.info(`   - ${p.path}: ${p.locationId}`);
    });
  }

  /**
   * Log connection summary
   */
  logConnectionSummary(totalGates) {
    setTimeout(() => {
      logger.separator();
      logger.info(`${this.connectedScanners.size}/${totalGates} scanners connected`);
      
      if (this.connectedScanners.size === totalGates) {
        logger.success('All scanners ready!');
      } else {
        logger.warn('Check locationId configuration!');
      }
      
      logger.separator();
    }, 1000);
  }

  /**
   * Disconnect all scanners
   */
  disconnectAll() {
    this.connectedScanners.forEach((port, gateKey) => {
      port.close();
      logger.info(`Disconnected scanner: ${gateKey}`);
    });
    
    this.connectedScanners.clear();
  }
}

// Singleton instance
const scannerService = new ScannerService();

module.exports = scannerService;
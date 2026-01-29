const modbusService = require('../services/modbus.service');
const audioService = require('../services/audio.service');
const storageService = require('../services/storage.service');
const verificationService = require('../services/verification.service');
const logger = require('../utils/logger');

// ============================================
// 🎯 SCAN CONTROLLER - Business Logic
// ============================================

class ScanController {
  constructor() {
    this.isProcessing = false;
    this.currentLoginSession = null;
    this.latestScan = null;
    this.sseClients = new Set();
  }

  /**
   * Main scan handler - routes to staff or guest processing
   */
  async handleScan(scanData) {
    const { gateKey, gateName, qrData, apikey, me31 } = scanData;

    if (this.isProcessing) {
      logger.warn('Already processing, skipping...');
      return;
    }
    
    this.isProcessing = true;
    logger.scanHeader(gateName, qrData);
    
    try {
      if (qrData.startsWith('STAFF:')) {
        await this.processStaffScan(qrData, gateName, me31);
      } else {
        await this.processGuestScan(qrData, gateName, gateKey, apikey, me31);
      }
    } catch (error) {
      logger.error('Scan processing error', error);
    } finally {
      this.isProcessing = false;
      logger.scanFooter();
    }
  }

  /**
   * Process staff QR scan
   */
  async processStaffScan(qrData, gateName, me31Config) {
    const staffId = qrData.replace('STAFF:', '');
    const staff = storageService.findStaff(staffId);
    
    if (!staff) {
      logger.error('Invalid staff QR code');
      return;
    }

    logger.success(`Staff: ${staff.name} (${staff.position})`);
    
    // Open door
    const doorOpened = await modbusService.openDoor(me31Config);
    logger.info(doorOpened ? 'Door control sent' : 'Door control failed');
    
    // Determine scan type
    const scanType = !this.currentLoginSession ? 'Đăng nhập' : 'Chưa rõ lý do';
    
    // Save to history
    const scanRecord = {
      staffId: staff.id,
      staffName: staff.name,
      position: staff.position,
      dob: staff.dob,
      scanType: scanType,
      timestamp: new Date().toISOString(),
      note: ''
    };
    
    storageService.saveRecord(scanRecord);
    
    // Grant dashboard access on first scan
    if (!this.currentLoginSession) {
      this.currentLoginSession = {
        staffId: staff.id,
        staffName: staff.name,
        position: staff.position,
        loginTime: new Date().toISOString()
      };
      logger.success('Dashboard access granted');
    }
  }

  /**
   * Process guest QR scan
   */
  async processGuestScan(qrData, gateName, gateKey, apikey, me31) {
    // Check login requirement
    if (!this.currentLoginSession) {
      logger.warn(`[${gateName}] Not logged in - scan skipped`);
      return;
    }

    // Extract citizen info
    const guestInfo = verificationService.extractCitizenInfo(qrData);
    logger.info(`${guestInfo.fullName} | ID: ${guestInfo.citizenId}`);
    
    // Verify with server
    const serverResponse = await verificationService.verifyCitizen(
      guestInfo.citizenId, 
      apikey
    );
    
    // Determine nationality
    const isVietnamese = verificationService.isVietnamese(
      guestInfo.citizenId, 
      serverResponse
    );
    
    // Store scan data
    this.latestScan = {
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
    
    // Notify SSE clients
    this.broadcastSSE({ event: 'newScan', data: this.latestScan });
    
    // Process access decision
    if (verificationService.isAccessGranted(serverResponse)) {
      logger.success('ACCESS GRANTED');
      
      if (verificationService.requiresCCCDVerification(serverResponse)) {
        logger.warn('CCCD verification required');
        audioService.playCCCDRequest(isVietnamese);
      } else {
        await modbusService.openDoor(me31);
        audioService.playSuccess(isVietnamese);
      }
    } else {
      logger.error('ACCESS DENIED');
      audioService.playDenied(isVietnamese);
    }
  }

  /**
   * SSE Client Management
   */
  addSSEClient(res) {
    this.sseClients.add(res);
    logger.info(`SSE Client connected (Total: ${this.sseClients.size})`);
    
    // Send latest scan if exists
    if (this.latestScan) {
      res.write(`data: ${JSON.stringify({ event: 'newScan', data: this.latestScan })}\n\n`);
    }
  }

  removeSSEClient(res) {
    this.sseClients.delete(res);
    logger.info(`SSE Client disconnected (Total: ${this.sseClients.size})`);
  }

  broadcastSSE(data) {
    this.sseClients.forEach(client => {
      client.write(`data: ${JSON.stringify(data)}\n\n`);
    });
    logger.debug(`SSE pushed to ${this.sseClients.size} client(s)`);
  }

  /**
   * Login/Logout Management
   */
  isLoggedIn() {
    return this.currentLoginSession !== null;
  }

  getCurrentUser() {
    return this.currentLoginSession;
  }

  logout() {
    this.currentLoginSession = null;
    logger.info('User logged out');
  }

  /**
   * Get latest scan data
   */
  getLatestScan() {
    return this.latestScan;
  }
}

// Singleton instance
const scanController = new ScanController();

module.exports = scanController;
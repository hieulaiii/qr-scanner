const axios = require('axios');
const FormData = require('form-data');
const config = require('../config');
const logger = require('../utils/logger');

// ============================================
// 🔐 VERIFICATION SERVICE
// ============================================

class VerificationService {
  constructor() {
    this.serverConfig = config.mainServer;
  }

  /**
   * Verify citizen ID with main server
   * @param {string} citizenId - Citizen ID to verify
   * @param {string} apikey - Gate API key
   * @returns {Promise<Object|null>}
   */
  async verifyCitizen(citizenId, apikey) {
    logger.info('Verifying citizen', { citizenId });
    
    if (!apikey) {
      throw new Error('API key is required');
    }
    
    try {
      const formData = new FormData();
      formData.append('apikey', apikey);
      formData.append('module', this.serverConfig.module);
      formData.append('action', this.serverConfig.action);
      formData.append('makiemsoat', citizenId);
      formData.append('payload', this.serverConfig.payload);
      
      const response = await axios.post(this.serverConfig.url, formData, {
        headers: formData.getHeaders(),
        timeout: this.serverConfig.timeout
      });
      
      logger.success('Server response received');
      return response.data;
      
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        logger.error(`Server timeout after ${this.serverConfig.timeout}ms`);
      } else {
        logger.error('Server verification error', error);
      }
      return null;
    }
  }

  /**
   * Extract citizen information from QR code
   * @param {string} qrData - Raw QR data
   * @returns {Object}
   */
  extractCitizenInfo(qrData) {
    const parts = qrData.split('|');
    
    if (parts.length >= 3) {
      return {
        citizenId: parts[0],
        idNumber: parts[1],
        fullName: parts[2],
        dob: parts[3] || null,
        gender: parts[4] || null
      };
    }
    
    // Fallback for simple ID format
    return {
      citizenId: qrData,
      idNumber: qrData,
      fullName: 'Unknown',
      dob: null,
      gender: null
    };
  }

  /**
   * Check if citizen is Vietnamese
   * @param {string} citizenId - Citizen ID
   * @param {Object} serverResponse - Server response data
   * @returns {boolean}
   */
  isVietnamese(citizenId, serverResponse) {
    // Check if CCCD format (12 digits)
    const isCCCD = /^\d{12}$/.test(citizenId);
    
    // Check server response
    const isVnByServer = serverResponse?.quoctichvn === 1;
    
    return isCCCD || isVnByServer;
  }

  /**
   * Check if access should be granted
   * @param {Object} serverResponse - Server response
   * @returns {boolean}
   */
  isAccessGranted(serverResponse) {
    return serverResponse?.alert === 'thanhcong';
  }

  /**
   * Check if CCCD verification is required
   * @param {Object} serverResponse - Server response
   * @returns {boolean}
   */
  requiresCCCDVerification(serverResponse) {
    return serverResponse?.yeucaucccd === 1;
  }
}

// Singleton instance
const verificationService = new VerificationService();

module.exports = verificationService;
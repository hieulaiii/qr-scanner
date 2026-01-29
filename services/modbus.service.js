const net = require('net');
const logger = require('../utils/logger');

// ============================================
// 🔌 MODBUS TCP SERVICE (ME31 Controller)
// ============================================

class ModbusService {
  constructor() {
    this.transactionId = 0;
    this.connectionTimeout = 3000;
  }

  /**
   * Send Modbus TCP command to ME31 relay controller
   * @param {Object} config - ME31 configuration {ip, port, relayChannel, state}
   * @returns {Promise<boolean>}
   */
  async sendCommand(ip, port, relayAddress, state) {
    return new Promise((resolve, reject) => {
      const client = net.createConnection({ host: ip, port });
      
      const timeoutHandler = setTimeout(() => {
        client.destroy();
        reject(new Error(`ME31 timeout (${ip}:${port})`));
      }, this.connectionTimeout);

      client.on('connect', () => {
        this.transactionId = (this.transactionId + 1) % 65536;
        
        const command = this.buildModbusFrame(relayAddress, state);
        client.write(command);
      });

      client.on('data', (data) => {
        clearTimeout(timeoutHandler);
        
        if (this.isValidResponse(data)) {
          resolve(true);
        } else {
          logger.warn('ME31 unexpected response', { response: data.toString('hex') });
          resolve(false);
        }
        
        client.end();
      });

      client.on('error', (err) => {
        clearTimeout(timeoutHandler);
        reject(err);
      });
    });
  }

  /**
   * Build Modbus TCP frame
   */
  buildModbusFrame(relayAddress, state) {
    return Buffer.from([
      (this.transactionId >> 8) & 0xFF,
      this.transactionId & 0xFF,
      0x00, 0x00,                    // Protocol ID
      0x00, 0x06,                    // Length
      0x01,                          // Unit ID
      0x05,                          // Function Code: Write Single Coil
      0x00, relayAddress,            // Coil Address
      state ? 0xFF : 0x00, 0x00     // Value
    ]);
  }

  /**
   * Validate Modbus response
   */
  isValidResponse(data) {
    return data.length >= 8 && data[7] === 0x05;
  }

  /**
   * Open door with pulse control
   * @param {Object} me31Config - {ip, port, relayChannel, pulseDuration}
   * @returns {Promise<boolean>}
   */
  async openDoor(me31Config) {
    const { ip, port, relayChannel, pulseDuration } = me31Config;
    
    try {
      logger.info(`Opening Relay ${relayChannel + 1}`, { ip, port });
      
      const opened = await this.sendCommand(ip, port, relayChannel, true);
      
      if (!opened) {
        logger.error('ME31 did not confirm door open');
        return false;
      }

      logger.success(`Door OPENED (Relay ${relayChannel + 1})`);
      
      // Auto-close after pulse duration
      setTimeout(async () => {
        try {
          await this.sendCommand(ip, port, relayChannel, false);
          logger.info(`Door CLOSED after ${pulseDuration / 1000}s`);
        } catch (err) {
          logger.error('Failed to close door', err);
        }
      }, pulseDuration);
      
      return true;
      
    } catch (error) {
      logger.error('ME31 Error', error, { ip, port, relayChannel });
      return false;
    }
  }

  /**
   * Test ME31 connection
   */
  async testConnection(ip, port, relayChannel) {
    try {
      await this.sendCommand(ip, port, relayChannel, false);
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Singleton instance
const modbusService = new ModbusService();

module.exports = modbusService;
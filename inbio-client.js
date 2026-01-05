const net = require('net');

class InBioClient {
  constructor(ip, port) {
    this.ip = ip;
    this.port = port;
  }
  
  // Mở cửa qua Wiegand Output
  async openDoor(doorId, duration) {
    return new Promise((resolve, reject) => {
      const client = new net.Socket();
      
      // Command mở cửa InBio (theo tài liệu ZKTeco)
      // Format: STX + CMD + Data + ETX + Checksum
      const command = this.buildOpenDoorCommand(doorId, duration);
      
      client.connect(this.port, this.ip, () => {
        console.log(`📡 Connected to InBio at ${this.ip}:${this.port}`);
        client.write(command);
      });
      
      client.on('data', (data) => {
        console.log('📥 InBio response:', data.toString('hex'));
        client.destroy();
        resolve();
      });
      
      client.on('error', (err) => {
        console.error('❌ InBio connection error:', err.message);
        reject(err);
      });
      
      client.on('close', () => {
        console.log('🔌 Connection closed');
      });
      
      // Timeout 5s
      setTimeout(() => {
        client.destroy();
        reject(new Error('InBio connection timeout'));
      }, 5000);
    });
  }
  
  // Tạo lệnh mở cửa (cần tham khảo tài liệu InBio SDK)
  buildOpenDoorCommand(doorId, duration) {
    // Ví dụ command theo protocol ZKTeco
    // Bạn cần xem tài liệu InBio260 Pro Plus để biết chính xác
    const STX = 0x02;
    const CMD_OPEN_DOOR = 0x40;
    const ETX = 0x03;
    
    const buffer = Buffer.alloc(8);
    buffer[0] = STX;
    buffer[1] = CMD_OPEN_DOOR;
    buffer[2] = doorId;
    buffer[3] = duration;
    buffer[4] = ETX;
    
    // Checksum (XOR các byte)
    let checksum = 0;
    for (let i = 1; i < 4; i++) {
      checksum ^= buffer[i];
    }
    buffer[5] = checksum;
    
    return buffer.slice(0, 6);
  }
}

module.exports = InBioClient;
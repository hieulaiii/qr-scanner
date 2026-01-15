
const net = require('net');
const readline = require('readline');

// ============================================
// 🔧 CẤU HÌNH ME31
// ============================================
const ME31_CONFIG = {
  ip: '192.168.1.9', 
  port: 502, 
  timeout: 3000 
};

const RELAY = {
  RELAY_1: 0,  // Cổng A
  RELAY_2: 1   // Cổng B
};

// ============================================
// 📡 HÀM GỬI LỆNH MODBUS TCP
// ============================================
let transactionId = 0;

function sendModbusCommand(relayAddress, state) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔄 Connecting to ME31 at ${ME31_CONFIG.ip}:${ME31_CONFIG.port}...`);
    
    const client = net.createConnection({
      host: ME31_CONFIG.ip,
      port: ME31_CONFIG.port
    });

    // Timeout handler
    const timeoutHandler = setTimeout(() => {
      client.destroy();
      reject(new Error(`⏱️ Timeout after ${ME31_CONFIG.timeout}ms`));
    }, ME31_CONFIG.timeout);

    client.on('connect', () => {
      console.log('✅ Connected to ME31');
      
      // Tạo lệnh Modbus: Write Single Coil (Function Code 0x05)
      transactionId = (transactionId + 1) % 65536;
      
      const command = Buffer.from([
        // Modbus TCP Header
        (transactionId >> 8) & 0xFF,  // Transaction ID (high byte)
        transactionId & 0xFF,          // Transaction ID (low byte)
        0x00, 0x00,                    // Protocol ID (always 0)
        0x00, 0x06,                    // Length (6 bytes following)
        
        // Modbus PDU
        0x01,                          // Unit ID (slave address)
        0x05,                          // Function Code: Write Single Coil
        0x00, relayAddress,            // Coil Address (0=Relay1, 1=Relay2)
        state ? 0xFF : 0x00, 0x00     // Value (0xFF00=ON, 0x0000=OFF)
      ]);
      
      console.log(`📤 Sending command: Relay ${relayAddress + 1} → ${state ? 'ON' : 'OFF'}`);
      console.log(`   Raw: ${command.toString('hex')}`);
      
      client.write(command);
    });

    client.on('data', (data) => {
      clearTimeout(timeoutHandler);
      
      console.log(`📥 Response received:`, data.toString('hex'));
      
      // Kiểm tra response hợp lệ
      if (data.length >= 8 && data[7] === 0x05) {
        const responseRelay = data[9];
        const responseState = data[10] === 0xFF;
        console.log(`✅ Success: Relay ${responseRelay + 1} is now ${responseState ? 'ON' : 'OFF'}`);
        resolve(true);
      } else {
        console.log('⚠️ Unexpected response format');
        resolve(false);
      }
      
      client.end();
    });

    client.on('error', (err) => {
      clearTimeout(timeoutHandler);
      console.error('❌ Connection error:', err.message);
      reject(err);
    });

    client.on('close', () => {
      console.log('🔌 Connection closed');
    });
  });
}

async function testRelay(relayNum, durationMs = 5000) {
  const relayAddress = relayNum === 1 ? RELAY.RELAY_1 : RELAY.RELAY_2;
  
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🧪 TEST: Relay ${relayNum} (${relayNum === 1 ? 'Cổng A' : 'Cổng B'})`);
  console.log(`⏱️ Duration: ${durationMs/1000} seconds`);
  
  try {
    // Bật relay
    console.log('\n1️⃣ Turning relay ON...');
    await sendModbusCommand(relayAddress, true);
    console.log('   👂 Listen for "CLICK" sound from ME31');
    
    // Đợi
    console.log(`\n⏳ Waiting ${durationMs/1000} seconds...`);
    await new Promise(resolve => setTimeout(resolve, durationMs));
    
    // Tắt relay
    console.log('\n2️⃣ Turning relay OFF...');
    await sendModbusCommand(relayAddress, false);
    console.log('   👂 Listen for "CLICK" sound again');
    
    console.log('\n✅ Test completed successfully!');
    return true;
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    return false;
  }
}

// ============================================
// 🎮 INTERACTIVE MENU
// ============================================
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function showMenu() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   🧪 ME31 MODBUS TCP TEST MENU            ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('');
  console.log('  1. Test Relay 1 (Cổng A) - 5 giây');
  console.log('  2. Test Relay 2 (Cổng B) - 5 giây');
  console.log('  3. Relay 1 ON (thủ công)');
  console.log('  4. Relay 1 OFF (thủ công)');
  console.log('  5. Relay 2 ON (thủ công)');
  console.log('  6. Relay 2 OFF (thủ công)');
  console.log('  7. Test cả 2 relay (tuần tự)');
  console.log('  8. Ping test (kiểm tra kết nối)');
  console.log('  0. Exit');
  console.log('');
}

async function handleChoice(choice) {
  switch(choice) {
    case '1':
      await testRelay(1, 5000);
      break;
    case '2':
      await testRelay(2, 5000);
      break;
    case '3':
      await sendModbusCommand(RELAY.RELAY_1, true);
      break;
    case '4':
      await sendModbusCommand(RELAY.RELAY_1, false);
      break;
    case '5':
      await sendModbusCommand(RELAY.RELAY_2, true);
      break;
    case '6':
      await sendModbusCommand(RELAY.RELAY_2, false);
      break;
    case '7':
      console.log('\n🔄 Testing both relays...');
      await testRelay(1, 3000);
      await new Promise(r => setTimeout(r, 1000));
      await testRelay(2, 3000);
      break;
    case '8':
      await pingTest();
      break;
    case '0':
      console.log('\n👋 Goodbye!');
      rl.close();
      process.exit(0);
      return;
    default:
      console.log('❌ Invalid choice');
  }
  
  promptMenu();
}

function promptMenu() {
  showMenu();
  rl.question('Select option: ', handleChoice);
}

// ============================================
// 🏓 PING TEST
// ============================================
async function pingTest() {
  console.log(`\n🏓 Testing connection to ${ME31_CONFIG.ip}:${ME31_CONFIG.port}...`);
  
  return new Promise((resolve) => {
    const startTime = Date.now();
    const client = net.createConnection({
      host: ME31_CONFIG.ip,
      port: ME31_CONFIG.port
    });
    
    client.on('connect', () => {
      const latency = Date.now() - startTime;
      console.log(`✅ Connection successful!`);
      console.log(`   Latency: ${latency}ms`);
      client.end();
      resolve(true);
    });
    
    client.on('error', (err) => {
      console.error('❌ Connection failed:', err.message);
      console.log('\n💡 Troubleshooting:');
      console.log('   1. Check ME31 IP address is correct');
      console.log('   2. Check ME31 is powered on');
      console.log('   3. Check network cable is connected');
      console.log('   4. Ping ME31: ping', ME31_CONFIG.ip);
      resolve(false);
    });
    
    setTimeout(() => {
      client.destroy();
      console.error('❌ Connection timeout');
      resolve(false);
    }, 5000);
  });
}

// ============================================
// 🚀 START
// ============================================
console.clear();
console.log('╔════════════════════════════════════════════╗');
console.log('║  🧪 ME31 Modbus TCP Test Tool             ║');
console.log('║  Version 1.0                              ║');
console.log('╚════════════════════════════════════════════╝');
console.log('');
console.log('📋 Configuration:');
console.log(`   IP:   ${ME31_CONFIG.ip}`);
console.log(`   Port: ${ME31_CONFIG.port}`);
console.log('');

(async () => {
  await pingTest();
  promptMenu();
})();

process.on('SIGINT', () => {
  console.log('\n\n👋 Interrupted. Goodbye!');
  rl.close();
  process.exit(0);
});
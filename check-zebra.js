const { SerialPort } = require('serialport');

async function checkZebraInfo() {
  console.log('🔍 Đang quét tất cả Zebra Scanner...\n');
  
  const ports = await SerialPort.list();
  const zebraPorts = ports.filter(p => 
    p.vendorId?.toLowerCase() === '05e0'
  );
  
  if (zebraPorts.length === 0) {
    console.log('❌ Không tìm thấy Zebra Scanner!');
    return;
  }
  
  console.log(`✅ Tìm thấy ${zebraPorts.length} Zebra Scanner:\n`);
  
  zebraPorts.forEach((p, i) => {
    console.log(`📱 Scanner #${i + 1}:`);
    console.log(`   Path:       ${p.path}`);
    console.log(`   LocationID: ${p.locationId}`);
    console.log(`   Serial:     ${p.serialNumber}`);
    console.log(`   VendorID:   ${p.vendorId}`);
    console.log(`   ProductID:  ${p.productId}`);
    console.log('');
  });
  
  // Copy config này vào GATES
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('const GATES = {');
  zebraPorts.forEach((p, i) => {
    const gateName = String.fromCharCode(65 + i); // A, B, C...
    console.log(`  GATE_${gateName}: {`);
    console.log(`    name: 'Cổng ${gateName}',`);
    console.log(`    locationId: '${p.locationId}',`);
    console.log(`    apikey: 'YOUR_API_KEY_HERE',`);
    console.log(`    inbio: { ip: '192.168.2.35', port: 8080, doorId: ${i + 1} }`);
    console.log(`  }${i < zebraPorts.length - 1 ? ',' : ''}`);
  });
  console.log('};');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

checkZebraInfo().catch(console.error);
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

function initScanners(gates, onScan) {
  Object.entries(gates).forEach(([gateKey, gate]) => {
    const port = new SerialPort({
      path: gate.com,
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
        inbio: gate.inbio
      });
    });

    port.on('open', () => {
      console.log(`✅ ${gate.name} connected on ${gate.com}`);
    });

    port.on('error', err => {
      console.error(`❌ ${gate.name} (${gate.com}):`, err.message);
    });
  });
}

module.exports = { initScanners };
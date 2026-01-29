// ============================================
// 🚪 GATES CONFIGURATION
// ============================================

const GATES = {
  GATE_A: {
    name: 'Cổng A',
    locationId: 'Port_#0005.Hub_#0001',
    apikey: 'n6NIHw6B69iXFIXrve05hC49v8hclIn2',
    inbio: { ip: '192.168.2.35', port: 8080, doorId: 1 }
  },
  GATE_B: {
    name: 'Cổng B',
    locationId: 'Port_#0003.Hub_#0001',
    apikey: 'd16Y43G0y2bO592qdxqwYk2d1PLFBqW8',
    inbio: { ip: '192.168.2.35', port: 8080, doorId: 2 }
  }
};

module.exports = { GATES };
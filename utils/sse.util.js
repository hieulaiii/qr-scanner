// ============================================
// 📡 SSE UTILITY
// ============================================

const sseClients = new Set();

function sendSSEToAllClients(data) {
  sseClients.forEach(client => {
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  });
  console.log(`   📤 SSE pushed to ${sseClients.size} client(s)`);
}

function addSSEClient(res) {
  sseClients.add(res);
  console.log(`✅ SSE Client connected (Total: ${sseClients.size})`);
}

function removeSSEClient(res) {
  sseClients.delete(res);
  console.log(`❌ SSE Client disconnected (Total: ${sseClients.size})`);
}

function clearAllSSEClients() {
  sseClients.clear();
}

module.exports = {
  sendSSEToAllClients,
  addSSEClient,
  removeSSEClient,
  clearAllSSEClients
};
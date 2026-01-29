const axios = require('axios');

// ============================================
// 🚪 INBIO SERVICE
// ============================================

let commandIdCounter = 0;
let commandQueue = [];

async function openDoorInBio(inbioConfig, seconds = 5) {
  if (!inbioConfig) {
    console.error('   ❌ InBio config is required');
    return false;
  }
  
  const cmdId = ++commandIdCounter;
  const door = inbioConfig.doorId;
  
  const doorHex = door.toString(16).padStart(2, '0');
  const secHex = seconds.toString(16).padStart(2, '0');
  const command = `C:${cmdId}:CONTROL DEVICE 01${doorHex}01${secHex}`;

  commandQueue.unshift({
    id: cmdId,
    command,
    timestamp: new Date(),
    door,
    ip: inbioConfig.ip,
    type: 'OPEN_DOOR'
  });

  axios.get(`http://${inbioConfig.ip}:${inbioConfig.port || 80}/iclock/getrequest`)
    .catch(() => {});

  console.log(`   🚪 Door ${door} opening (${inbioConfig.ip})`);
  return true;
}

function getNextCommand() {
  return commandQueue.shift();
}

function hasCommands() {
  return commandQueue.length > 0;
}

function addKeepAliveCommand() {
  const nextId = ++commandIdCounter;
  commandQueue.push({
    id: nextId,
    command: `C:${nextId}:NOP`,
    timestamp: Date.now(),
    type: 'keepalive'
  });
}

module.exports = {
  openDoorInBio,
  getNextCommand,
  hasCommands,
  addKeepAliveCommand
};
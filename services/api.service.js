const axios = require('axios');
const FormData = require('form-data');
const { MAIN_SERVER } = require('../config/server.config');

// ============================================
// 📡 MAIN SERVER API SERVICE
// ============================================

async function verifyWithMainServer(citizenId, apikey, timeout = 2000) {
  console.log(`   📡 Verifying: ${citizenId}`);
  
  if (!apikey) {
    throw new Error('API key is required');
  }
  
  try {
    const formData = new FormData();
    formData.append('apikey', apikey);
    formData.append('module', MAIN_SERVER.module);
    formData.append('action', MAIN_SERVER.action);
    formData.append('makiemsoat', citizenId);
    formData.append('payload', MAIN_SERVER.payload);
    
    const response = await axios.post(MAIN_SERVER.url, formData, {
      headers: formData.getHeaders(),
      timeout
    });
    
    console.log(`   📥 Response received in ${response.duration || 'N/A'}ms`);
    return response.data;
    
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.error(`   ⏱️ Server timeout after ${timeout}ms`);
    } else if (error.code === 'ETIMEDOUT') {
      console.error(`   ⏱️ Connection timeout`);
    } else {
      console.error('   ❌ Server error:', error.message);
    }
    return null;
  }
}

function extractCitizenInfo(qrData) {
  const parts = qrData.split('|');
  
  if (parts.length >= 3) {
    return {
      citizenId: parts[0],      
      idNumber: parts[1],         
      fullName: parts[2],           
      dob: parts[3],               
      gender: parts[4]        
    };
  } else {
    return {
      citizenId: qrData,
      idNumber: qrData,
      fullName: 'Unknown',
      dob: null,
      gender: null
    };
  }
}

module.exports = {
  verifyWithMainServer,
  extractCitizenInfo
};
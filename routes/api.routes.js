const express = require('express');
const router = express.Router();
const { loadStaffScanHistory, updateStaffScanReason } = require('../services/staff.service');
const { addSSEClient, removeSSEClient, sendSSEToAllClients } = require('../utils/sse.util');

// ============================================
// 🔌 API ROUTES
// ============================================

let latestScan = null;

// SSE endpoint
router.get('/scan-stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (latestScan) {
    res.write(`data: ${JSON.stringify({
      event: 'newScan',
      data: latestScan
    })}\n\n`);
  }
  
  addSSEClient(res);
  
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 30000);
  
  req.on('close', () => {
    clearInterval(heartbeat);
    removeSSEClient(res);
  });
});

router.get('/check-login', (req, res) => {
  const { getCurrentLoginSession } = require('./web.routes');
  res.json({ isLoggedIn: getCurrentLoginSession() !== null });
});

router.get('/current-user', (req, res) => {
  const { getCurrentLoginSession } = require('./web.routes');
  res.json({ user: getCurrentLoginSession() });
});

router.post('/logout', (req, res) => {
  const { setCurrentLoginSession } = require('./web.routes');
  setCurrentLoginSession(null);
  res.json({ success: true });
});

router.get('/latest-scan', (req, res) => {
  const staffHistory = loadStaffScanHistory();
  res.json({
    latestScan,
    history: staffHistory.slice(0, 50)
  });
});

router.get('/staff-history', (req, res) => {
  const { startDate, endDate } = req.query;
  let history = loadStaffScanHistory();
  
  if (startDate || endDate) {
    history = history.filter(record => {
      const recordDate = new Date(record.timestamp);
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      end.setHours(23, 59, 59, 999);
      
      return recordDate >= start && recordDate <= end;
    });
  }
  
  res.json({ history });
});

router.post('/update-scan-reason', (req, res) => {
  const { scanId, reason } = req.body;
  
  if (!scanId || !reason) {
    return res.status(400).json({ success: false, message: 'Missing scanId or reason' });
  }
  
  const success = updateStaffScanReason(scanId, reason);
  
  if (success) {
    res.json({ success: true, message: 'Cập nhật lý do thành công' });
  } else {
    res.status(404).json({ success: false, message: 'Không tìm thấy bản ghi' });
  }
});

function getLatestScan() {
  return latestScan;
}

function setLatestScan(scan) {
  latestScan = scan;
  sendSSEToAllClients({ event: 'newScan', data: latestScan });
}

module.exports = {
  router,
  getLatestScan,
  setLatestScan
};
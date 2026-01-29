const express = require('express');
const router = express.Router();
const scanController = require('../controllers/scan.controller');
const storageService = require('../services/storage.service');
const config = require('../config');

// ============================================
// 📡 API ROUTES
// ============================================

/**
 * SSE - Server-Sent Events Stream
 */
router.get('/scan-stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  scanController.addSSEClient(res);
  
  // Heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, config.business.sseHeartbeatInterval);
  
  req.on('close', () => {
    clearInterval(heartbeat);
    scanController.removeSSEClient(res);
  });
});

/**
 * Check login status
 */
router.get('/check-login', (req, res) => {
  res.json({ 
    isLoggedIn: scanController.isLoggedIn() 
  });
});

/**
 * Get current logged-in user
 */
router.get('/current-user', (req, res) => {
  res.json({ 
    user: scanController.getCurrentUser() 
  });
});

/**
 * Logout
 */
router.post('/logout', (req, res) => {
  scanController.logout();
  res.json({ success: true });
});

/**
 * Get latest scan data
 */
router.get('/latest-scan', (req, res) => {
  const latestScan = scanController.getLatestScan();
  const history = storageService.getHistory({ 
    limit: config.business.scanHistoryLimit 
  });
  
  res.json({ latestScan, history });
});

/**
 * Get staff scan history with filters
 */
router.get('/staff-history', (req, res) => {
  const { startDate, endDate, staffId } = req.query;
  
  const history = storageService.getHistory({
    startDate,
    endDate,
    staffId
  });
  
  res.json({ history });
});

/**
 * Update scan reason/note
 */
router.post('/update-scan-reason', (req, res) => {
  const { scanId, reason } = req.body;
  
  if (!scanId || !reason) {
    return res.status(400).json({ 
      success: false, 
      message: 'Missing scanId or reason' 
    });
  }
  
  const success = storageService.updateRecord(scanId, { note: reason });
  
  if (success) {
    res.json({ 
      success: true, 
      message: 'Cập nhật lý do thành công' 
    });
  } else {
    res.status(404).json({ 
      success: false, 
      message: 'Không tìm thấy bản ghi' 
    });
  }
});

/**
 * Get staff list
 */
router.get('/staff-list', (req, res) => {
  const staffList = storageService.loadStaffList();
  res.json({ staffList });
});

module.exports = router;
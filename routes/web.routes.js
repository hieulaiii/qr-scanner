const express = require('express');
const router = express.Router();
const { getView } = require('../utils/view.util');
const { STAFF_LIST } = require('../services/staff.service');

// ============================================
// 🌐 WEB ROUTES
// ============================================

let currentLoginSession = null;

router.get('/', (req, res) => {
  res.send(getView('login.html'));
});

router.get('/dashboard', (req, res) => {
  if (!currentLoginSession) {
    res.redirect('/');
    return;
  }
  res.send(getView('dashboard.html'));
});

router.get('/generate-qr', (req, res) => {
  res.send(getView('generate-qr.html', { STAFF_LIST }));
});

function getCurrentLoginSession() {
  return currentLoginSession;
}

function setCurrentLoginSession(session) {
  currentLoginSession = session;
}

module.exports = {
  router,
  getCurrentLoginSession,
  setCurrentLoginSession
};
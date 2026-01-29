const fs = require('fs');
const path = require('path');

// ============================================
// 📄 VIEW UTILITY
// ============================================

function getView(filename, data = {}) {
  let html = fs.readFileSync(path.join(__dirname, '..', 'views', filename), 'utf8');
  Object.keys(data).forEach(key => {
    const value = typeof data[key] === 'string' ? data[key] : JSON.stringify(data[key]);
    html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });
  return html;
}

module.exports = { getView };
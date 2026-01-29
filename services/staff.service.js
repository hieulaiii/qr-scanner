const fs = require('fs');
const { LOGIN_HISTORY_FILE } = require('../config/server.config');

// ============================================
// 👥 STAFF SERVICE
// ============================================

const STAFF_LIST = [
  { id: 'NV001', name: 'Nguyễn Hữu Đoan', position: 'Giám đốc', dob: '23/6/1971' },
  { id: 'NV002', name: 'Phạm Tấn Duy', position: 'Phó Giám đốc', dob: '24/9/1988' },
  { id: 'NV003', name: 'Trần Bút', position: 'Phó Giám đốc', dob: '10/3/1966' },
  { id: 'NV004', name: 'Đoàn Khắc A Duyệt', position: 'Trưởng phòng', dob: '03/01/1985' },
  { id: 'NV005', name: 'Lê Văn Sanh', position: 'Tổ trưởng', dob: '26/7/1988' },
  { id: 'NV006', name: 'Nguyễn T Sơn Thủy', position: 'Nhân viên', dob: '08/3/1983' },
  { id: 'NV007', name: 'Lê Văn Tiên', position: 'Nhân viên', dob: '08/11/1992' },
  { id: 'NV008', name: 'Trương Đình Hòa', position: 'Nhân viên', dob: '18/10/1988' },
  { id: 'NV009', name: 'Lê Văn Quang', position: 'Nhân viên', dob: '18/4/1984' },
  { id: 'NV010', name: 'Phan Văn Hùng', position: 'Nhân viên', dob: '22/9/1997' },
  { id: 'NV011', name: 'Nguyễn Quang Lam', position: 'Nhân viên', dob: '01/3/1995' },
  { id: 'NV012', name: 'Dương T Kim Phượng', position: 'Nhân viên', dob: '11/10/1988' },
  { id: 'NV013', name: 'Mai Văn Tồn', position: 'Nhân viên', dob: '20/10/1984' },
  { id: 'NV014', name: 'Nguyễn Thị Thảo', position: 'Nhân viên', dob: '04/6/1991' },
  { id: 'NV015', name: 'Lê Thùy Mỹ Dung', position: 'Nhân viên', dob: '20/11/2000' },
  { id: 'NV016', name: 'Trần Thị Đạt', position: 'Nhân viên', dob: '10/9/1980' },
  { id: 'NV017', name: 'Phạm Nguyễn Anh Hoàng', position: 'Lái xe', dob: '16/6/1980' },
  { id: 'NV018', name: 'Trần Văn Dũng', position: 'Lái xe', dob: '20/3/2002' },
  { id: 'NV019', name: 'Nguyễn Chí Thiết', position: 'Bảo vệ', dob: '17/10/1983' },
  { id: 'NV020', name: 'Võ Trí Danh', position: 'Bảo vệ', dob: '10/7/1993' },
  { id: 'NV021', name: 'Lê Thị Thu', position: 'Tạp vụ', dob: '09/02/1979' },
  { id: 'NV022', name: 'Lê Văn Thanh', position: 'Nhân viên', dob: '02/3/1982' }
];

function loadStaffScanHistory() {
  try {
    if (fs.existsSync(LOGIN_HISTORY_FILE)) {
      const data = fs.readFileSync(LOGIN_HISTORY_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading staff scan history:', error.message);
  }
  return [];
}

function saveStaffScan(record) {
  try {
    const history = loadStaffScanHistory();
    
    record.id = `SCAN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    history.unshift(record);
    
    if (history.length > 1000) {
      history.splice(1000);
    }
    
    fs.writeFileSync(LOGIN_HISTORY_FILE, JSON.stringify(history, null, 2));
    console.log('   💾 Saved staff scan to history');
  } catch (error) {
    console.error('   ❌ Error saving staff scan:', error.message);
  }
}

function updateStaffScanReason(scanId, reason) {
  try {
    const history = loadStaffScanHistory();
    const record = history.find(r => r.id === scanId);
    
    if (record) {
      record.note = reason;
      record.updatedAt = new Date().toISOString();
      fs.writeFileSync(LOGIN_HISTORY_FILE, JSON.stringify(history, null, 2));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error updating scan reason:', error.message);
    return false;
  }
}

function findStaffById(staffId) {
  return STAFF_LIST.find(s => s.id === staffId);
}

module.exports = {
  STAFF_LIST,
  loadStaffScanHistory,
  saveStaffScan,
  updateStaffScanReason,
  findStaffById
};
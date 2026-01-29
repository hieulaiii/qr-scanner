const fs = require('fs');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');

// ============================================
// 💾 STORAGE SERVICE
// ============================================

class StorageService {
  constructor() {
    this.dataPath = config.paths.data;
    this.historyFile = path.join(this.dataPath, 'staff-scan-history.json');
    this.staffFile = path.join(this.dataPath, 'staff-list.json');
    this.maxRecords = config.business.maxHistoryRecords;
    
    this.ensureDataDirectory();
  }

  ensureDataDirectory() {
    if (!fs.existsSync(this.dataPath)) {
      fs.mkdirSync(this.dataPath, { recursive: true });
      logger.info('Created data directory');
    }
  }

  /**
   * Load staff scan history
   */
  loadHistory() {
    try {
      if (fs.existsSync(this.historyFile)) {
        const data = fs.readFileSync(this.historyFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      logger.error('Error loading staff scan history', error);
    }
    return [];
  }

  /**
   * Save staff scan record
   */
  saveRecord(record) {
    try {
      const history = this.loadHistory();
      
      // Generate unique ID
      record.id = `SCAN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Add to beginning
      history.unshift(record);
      
      // Trim to max records
      if (history.length > this.maxRecords) {
        history.splice(this.maxRecords);
      }
      
      fs.writeFileSync(this.historyFile, JSON.stringify(history, null, 2));
      logger.success('Saved staff scan to history');
      
      return record.id;
      
    } catch (error) {
      logger.error('Error saving staff scan', error);
      return null;
    }
  }

  /**
   * Update scan record with additional info
   */
  updateRecord(scanId, updates) {
    try {
      const history = this.loadHistory();
      const record = history.find(r => r.id === scanId);
      
      if (!record) {
        logger.warn('Scan record not found', { scanId });
        return false;
      }
      
      Object.assign(record, updates, { updatedAt: new Date().toISOString() });
      
      fs.writeFileSync(this.historyFile, JSON.stringify(history, null, 2));
      logger.success('Updated scan record', { scanId });
      
      return true;
      
    } catch (error) {
      logger.error('Error updating scan record', error);
      return false;
    }
  }

  /**
   * Get filtered history
   */
  getHistory(filters = {}) {
    let history = this.loadHistory();
    
    if (filters.startDate || filters.endDate) {
      history = history.filter(record => {
        const recordDate = new Date(record.timestamp);
        const start = filters.startDate ? new Date(filters.startDate) : new Date(0);
        const end = filters.endDate ? new Date(filters.endDate) : new Date();
        end.setHours(23, 59, 59, 999);
        
        return recordDate >= start && recordDate <= end;
      });
    }
    
    if (filters.staffId) {
      history = history.filter(r => r.staffId === filters.staffId);
    }
    
    if (filters.limit) {
      history = history.slice(0, filters.limit);
    }
    
    return history;
  }

  /**
   * Load staff list
   */
  loadStaffList() {
    try {
      if (fs.existsSync(this.staffFile)) {
        const data = fs.readFileSync(this.staffFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      logger.error('Error loading staff list', error);
    }
    
    // Return default staff list if file doesn't exist
    return this.getDefaultStaffList();
  }

  /**
   * Default staff list (fallback)
   */
  getDefaultStaffList() {
    return [
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
  }

  /**
   * Find staff by ID
   */
  findStaff(staffId) {
    const staffList = this.loadStaffList();
    return staffList.find(s => s.id === staffId);
  }
}

// Singleton instance
const storageService = new StorageService();

module.exports = storageService;
🎫 QR ACCESS CONTROL SYSTEM
========================================
- Luồng hoạt động**: Scanner → Node.js (localhost:8080) → Server chính → InBio260 (TCP PUSH/HTTP) → Mở khóa

![Schema: Scanner USB → PC Node.js → LAN InBio260 → Relay cửa]

CÀI ĐẶT LẦN ĐẦU (Chỉ làm 1 lần)
   1. Cắm Zebra DS9308 vào USB PC (tự nhận HID Keyboard, quét QR gửi trực tiếp) [web:11][web:14]
   2. Cắm InBio260 Pro Plus vào LAN (default IP: 192.168.1.201, set PUSH Server = IP PC:80) [web:12]
   3. Nhấp đúp: `setup.bat` (cài Node.js, PM2, dependencies)
   4. Đợi 1-2 phút → Xong!

🚀 SỬ DỤNG HÀNG NGÀY:
   - Mở máy tính → Hệ thống tự chạy ngầm
   - Nhấp đúp shortcut "🎫 QR Kiểm Soát" trên Desktop
   - Hoặc mở trình duyệt gõ: localhost:8080

🛠️ QUẢN LÝ:
   - Xem logs: pm2 logs
   - Khởi động lại: pm2 restart QR-Access-Control
   - Dừng: pm2 stop QR-Access-Control

📞 HỖ TRỢ: 0328093701(Hiếu)

## 📋 TECH STACK
- Node.js + Express
- PM2 process manager
- Zebra DS9308 (USB HID)
- ZKTeco InBio260 Pro Plus (TCP/IP)
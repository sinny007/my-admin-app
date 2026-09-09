/**
 * ============================================================
 *  IT Equipment Borrow System — Google Apps Script Backend
 *  Version: 2.1 (Profile & Password Update + Thai IT Categories)
 *  เชื่อมต่อกับ React Frontend ผ่าน Fetch API
 * ============================================================
 *
 *  📋 โครงสร้าง Google Sheets ที่รองรับ:
 *  ┌─────────────────┬──────────────────────────────────────────────────────────────────┐
 *  │ Sheet Name      │ Columns (Header Row 1)                                           │
 *  ├─────────────────┼──────────────────────────────────────────────────────────────────┤
 *  │ Users           │ username | password | name | role | createdAt |                  │
 *  │                 │ department | phone | email | avatarUrl                           │
 *  │ Devices         │ id | name | category | status | imageUrl | createdAt             │
 *  │ Transactions    │ id | deviceId | deviceName | username | name | borrowDate |       │
 *  │                 │ expectedReturnDate | returnDate | status | condition | note       │
 *  │ BorrowRecords   │ id | borrowerName | itemName | borrowDate | returnDate | status  │
 *  └─────────────────┴──────────────────────────────────────────────────────────────────┘
 *
 *  🔧 วิธีติดตั้ง / อัปเดต:
 *  1. เปิด Google Sheets → Extensions → Apps Script
 *  2. วางโค้ดนี้ทั้งหมดทับโค้ดเดิม → Save (Ctrl+S)
 *  3. แก้ไข SPREADSHEET_ID และ ADMIN_SECRET_KEY ด้านล่าง
 *  4. Deploy → Manage deployments → แก้ไข (Edit) → เลือก New version → Deploy
 *     (หรือ Deploy → New deployment → Web app → Anyone)
 * ============================================================
 */

// ─── ⚙️ Configuration — แก้ไขตรงนี้ ──────────────────────────────────────
const SPREADSHEET_ID   = 'YOUR_SPREADSHEET_ID_HERE'; // แก้เป็น ID ของ Google Sheets คุณ
const ADMIN_SECRET_KEY = 'ADMIN2024SECRET';           // รหัสลับสำหรับสมัครเป็น Admin
// ──────────────────────────────────────────────────────────────────────────

// ─── Sheet Names ───────────────────────────────────────────────────────────
const SHEET_USERS        = 'Users';
const SHEET_DEVICES      = 'Devices';
const SHEET_TRANSACTIONS = 'Transactions';
const SHEET_BORROW       = 'BorrowRecords';

// ─── Helper: เปิด Sheet (สร้างใหม่พร้อม Header ถ้ายังไม่มี) ───────────────
function getSheet(name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    const headers = {
      [SHEET_USERS]:        ['username', 'password', 'name', 'role', 'createdAt', 'department', 'phone', 'email', 'avatarUrl'],
      [SHEET_DEVICES]:      ['id', 'name', 'category', 'status', 'imageUrl', 'createdAt'],
      [SHEET_TRANSACTIONS]: ['id', 'deviceId', 'deviceName', 'username', 'name', 'borrowDate',
                             'expectedReturnDate', 'returnDate', 'status', 'condition', 'note'],
      [SHEET_BORROW]:       ['id', 'borrowerName', 'itemName', 'borrowDate', 'returnDate', 'status'],
    };
    if (headers[name]) {
      sheet.appendRow(headers[name]);
      sheet.getRange(1, 1, 1, headers[name].length)
        .setFontWeight('bold')
        .setBackground('#1e293b')
        .setFontColor('#ffffff');
    }
  }
  return sheet;
}

// ─── Helper: แปลง Sheet Data เป็น Array of Objects ────────────────────────
function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0].map(h => String(h).trim());
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      const val = row[i];
      obj[h] = val instanceof Date
        ? Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss')
        : val;
    });
    return obj;
  });
}

// ─── Helper: สร้าง ID แบบ UUID สั้น ───────────────────────────────────────
function generateId(prefix) {
  const ts  = new Date().getTime().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).substring(2, 6).toUpperCase();
  return prefix + '-' + ts + '-' + rnd;
}

// ─── Helper: วันเวลาปัจจุบัน ──────────────────────────────────────────────
function nowDateTime() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
}
function todayDate() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

// ─── Helper: ส่ง JSON Response ────────────────────────────────────────────
function jsonOk(data) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: true, status: 'success', ...data }))
    .setMimeType(ContentService.MimeType.JSON);
}
function jsonErr(message, code) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: false, status: 'error', message: message, code: code || 400 }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ═══════════════════════════════════════════════════════════════════════════
//  🌐 Entry Points
// ═══════════════════════════════════════════════════════════════════════════

/** GET Request */
function doGet(e) {
  try {
    const action = (e.parameter.action || '').trim();
    const role   = (e.parameter.role   || 'user').trim();
    switch (action) {
      case 'getData':          return handleGetData(role);
      case 'getBorrowRecords': return handleGetBorrowRecords();
      default:
        return jsonErr('Unknown GET action: ' + action);
    }
  } catch (err) {
    console.error('doGet Error:', err);
    return jsonErr('Server Error: ' + err.message, 500);
  }
}

/** POST Request */
function doPost(e) {
  try {
    let payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch {
      return jsonErr('Request body ไม่ใช่ JSON ที่ถูกต้อง');
    }

    const action = (payload.action || '').trim();
    console.log('[doPost] action=' + action + ' user=' + (payload.username || '-'));

    switch (action) {
      // ── Auth & Profile ───────────────────────────────────────────────────
      case 'login':              return handleLogin(payload);
      case 'register':           return handleRegister(payload);
      case 'updateProfile':      return handleUpdateProfile(payload);
      case 'changePassword':     return handleChangePassword(payload);

      // ── Admin: Devices ──────────────────────────────────────────────────
      case 'add_device':         return handleAddDevice(payload);
      case 'delete_device':      return handleDeleteDevice(payload);

      // ── User/Admin: Transactions ─────────────────────────────────────────
      case 'borrowDevice':       return handleBorrowDevice(payload);
      case 'returnDevice':       return handleReturnDevice(payload);

      // ── EquipmentBorrowDashboard: BorrowRecords ──────────────────────────
      case 'addBorrowRecord':    return handleAddBorrowRecord(payload);
      case 'returnBorrowRecord': return handleReturnBorrowRecord(payload);

      default:
        return jsonErr('Unknown POST action: ' + action);
    }
  } catch (err) {
    console.error('doPost Error:', err);
    return jsonErr('Server Error: ' + err.message, 500);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  👤 Auth & Profile: Login / Register / Update Profile / Change Password
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST { action:'login', username, password }
 * ← { success, user:{ username, name, role, department, phone, email, avatarUrl } }
 */
function handleLogin(p) {
  const username = String(p.username || '').trim().toLowerCase();
  const password = String(p.password || '').trim();

  if (!username || !password)
    return jsonErr('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');

  const users = sheetToObjects(getSheet(SHEET_USERS));
  const found = users.find(u =>
    String(u.username || '').trim().toLowerCase() === username &&
    String(u.password || '').trim() === password
  );

  if (!found) return jsonErr('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');

  return jsonOk({
    user: {
      username:   found.username,
      name:       found.name,
      role:       String(found.role || 'user').toLowerCase().trim(),
      department: found.department || '',
      phone:      found.phone || '',
      email:      found.email || '',
      avatarUrl:  found.avatarUrl || ''
    }
  });
}

/**
 * POST { action:'register', username, password, name, role, adminKey }
 * ← { success, message }
 */
function handleRegister(p) {
  const username = String(p.username || '').trim().toLowerCase();
  const password = String(p.password || '').trim();
  const name     = String(p.name     || '').trim();
  const role     = String(p.role     || 'user').toLowerCase().trim();
  const adminKey = String(p.adminKey || '').trim();

  if (!username || !password || !name)
    return jsonErr('กรุณากรอกข้อมูลให้ครบถ้วน');
  if (username.length < 4)
    return jsonErr('Username ต้องมีความยาวอย่างน้อย 4 ตัวอักษร');
  if (password.length < 6)
    return jsonErr('Password ต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
  if (role === 'admin' && adminKey !== ADMIN_SECRET_KEY)
    return jsonErr('รหัสลับผู้ดูแลระบบไม่ถูกต้อง');

  const sheet = getSheet(SHEET_USERS);
  const users = sheetToObjects(sheet);
  if (users.find(u => String(u.username || '').toLowerCase() === username))
    return jsonErr('ชื่อผู้ใช้นี้ถูกใช้งานแล้ว กรุณาเลือก Username อื่น');

  sheet.appendRow([username, password, name, role, nowDateTime(), '', '', '', '']);
  return jsonOk({ message: 'สมัครสมาชิกสำเร็จ ยินดีต้อนรับคุณ ' + name });
}

/**
 * POST { action:'updateProfile', username, name, department, phone, email, avatarUrl }
 * ← { success, message, user }
 */
function handleUpdateProfile(p) {
  const username  = String(p.username  || '').trim().toLowerCase();
  const name      = String(p.name      || '').trim();
  const dept      = String(p.department|| '').trim();
  const phone     = String(p.phone     || '').trim();
  const email     = String(p.email     || '').trim();
  const avatarUrl = String(p.avatarUrl || '').trim();

  if (!username) return jsonErr('ไม่พบชื่อผู้ใช้');
  if (!name) return jsonErr('กรุณากรอกชื่อ-นามสกุล');

  const sheet = getSheet(SHEET_USERS);
  const data  = sheet.getDataRange().getValues();
  let headers = data[0].map(h => String(h).trim());

  // ตรวจสอบและเพิ่มคอลัมน์ใหม่หากยังไม่มีในชีทเดิม
  const requiredCols = ['department', 'phone', 'email', 'avatarUrl'];
  requiredCols.forEach(col => {
    if (headers.indexOf(col) === -1) {
      headers.push(col);
      sheet.getRange(1, headers.length).setValue(col);
    }
  });

  const uIdx      = headers.indexOf('username');
  const nameIdx   = headers.indexOf('name');
  const roleIdx   = headers.indexOf('role');
  const deptIdx   = headers.indexOf('department');
  const phoneIdx  = headers.indexOf('phone');
  const emailIdx  = headers.indexOf('email');
  const avatarIdx = headers.indexOf('avatarUrl');

  let foundRow = -1;
  let userRole = 'user';

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][uIdx]).trim().toLowerCase() === username) {
      foundRow = i + 1;
      userRole = roleIdx !== -1 ? String(data[i][roleIdx] || 'user') : 'user';
      break;
    }
  }

  if (foundRow === -1) return jsonErr('ไม่พบผู้ใช้ในระบบ: ' + username);

  sheet.getRange(foundRow, nameIdx + 1).setValue(name);
  if (deptIdx !== -1)   sheet.getRange(foundRow, deptIdx + 1).setValue(dept);
  if (phoneIdx !== -1)  sheet.getRange(foundRow, phoneIdx + 1).setValue(phone);
  if (emailIdx !== -1)  sheet.getRange(foundRow, emailIdx + 1).setValue(email);
  if (avatarIdx !== -1) sheet.getRange(foundRow, avatarIdx + 1).setValue(avatarUrl);

  return jsonOk({
    message: 'อัปเดตข้อมูลโปรไฟล์เรียบร้อยแล้ว',
    user: {
      username: username,
      name: name,
      role: userRole,
      department: dept,
      phone: phone,
      email: email,
      avatarUrl: avatarUrl
    }
  });
}

/**
 * POST { action:'changePassword', username, currentPassword, newPassword }
 * ← { success, message }
 */
function handleChangePassword(p) {
  const username        = String(p.username        || '').trim().toLowerCase();
  const currentPassword = String(p.currentPassword || '').trim();
  const newPassword     = String(p.newPassword     || '').trim();

  if (!username) return jsonErr('ไม่พบชื่อผู้ใช้');
  if (!currentPassword) return jsonErr('กรุณากรอกรหัสผ่านปัจจุบัน');
  if (!newPassword) return jsonErr('กรุณากรอกรหัสผ่านใหม่');
  if (newPassword.length < 6) return jsonErr('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร');

  const sheet = getSheet(SHEET_USERS);
  const data  = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  const uIdx = headers.indexOf('username');
  const pIdx = headers.indexOf('password');

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][uIdx]).trim().toLowerCase() === username) {
      const dbPassword = String(data[i][pIdx]).trim();
      if (dbPassword !== currentPassword) {
        return jsonErr('รหัสผ่านเดิมไม่ถูกต้อง');
      }
      sheet.getRange(i + 1, pIdx + 1).setValue(newPassword);
      return jsonOk({ message: 'เปลี่ยนรหัสผ่านสำเร็จเรียบร้อย' });
    }
  }

  return jsonErr('ไม่พบผู้ใช้ในระบบ: ' + username);
}

// ═══════════════════════════════════════════════════════════════════════════
//  📦 Admin: Devices
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET ?action=getData&role=admin|user
 * ← { success, devices:[...], transactions:[...] }
 */
function handleGetData() {
  const devices      = sheetToObjects(getSheet(SHEET_DEVICES));
  const transactions = sheetToObjects(getSheet(SHEET_TRANSACTIONS));
  return jsonOk({ devices: devices, transactions: transactions });
}

/**
 * POST { action:'add_device', name, category, status, imageUrl, userRole }
 * ← { success, message, deviceId }
 */
function handleAddDevice(p) {
  if (p.userRole !== 'admin') return jsonErr('ไม่มีสิทธิ์ (ต้องเป็น Admin)');

  const name     = String(p.name     || '').trim();
  const category = String(p.category || 'อุปกรณ์ต่อพ่วงและไอทีอื่นๆ (Other IT Accessories)').trim();
  const status   = String(p.status   || 'พร้อมใช้งาน').trim();
  const imageUrl = String(p.imageUrl || '').trim() || 'https://placehold.co/150x150?text=No+Image';

  if (!name) return jsonErr('กรุณากรอกชื่ออุปกรณ์');

  const deviceId = generateId('DEV');
  getSheet(SHEET_DEVICES).appendRow([deviceId, name, category, status, imageUrl, nowDateTime()]);
  return jsonOk({ message: 'เพิ่มอุปกรณ์ "' + name + '" เรียบร้อยแล้ว', deviceId: deviceId });
}

/**
 * POST { action:'delete_device', deviceId, userRole }
 * ← { success, message }
 */
function handleDeleteDevice(p) {
  if (p.userRole !== 'admin') return jsonErr('ไม่มีสิทธิ์ (ต้องเป็น Admin)');

  const deviceId = String(p.deviceId || '').trim();
  if (!deviceId) return jsonErr('ไม่พบ deviceId');

  const sheet   = getSheet(SHEET_DEVICES);
  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  const idIdx   = headers.indexOf('id');

  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][idIdx]).trim() === deviceId) {
      sheet.deleteRow(i + 1);
      return jsonOk({ message: 'ลบอุปกรณ์ "' + deviceId + '" เรียบร้อยแล้ว' });
    }
  }
  return jsonErr('ไม่พบอุปกรณ์รหัส: ' + deviceId);
}

// ═══════════════════════════════════════════════════════════════════════════
//  🔄 User/Admin: Borrow & Return Device (Transactions)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST { action:'borrowDevice', deviceId, deviceName, username, name, expectedReturnDate }
 * ← { success, message, transId }
 */
function handleBorrowDevice(p) {
  const deviceId           = String(p.deviceId           || '').trim();
  const deviceName         = String(p.deviceName         || '').trim();
  const username           = String(p.username           || '').trim();
  const name               = String(p.name               || username).trim();
  const expectedReturnDate = String(p.expectedReturnDate || '').trim();

  if (!deviceId || !username || !expectedReturnDate)
    return jsonErr('ข้อมูลไม่ครบถ้วน: deviceId, username, expectedReturnDate');

  // ตรวจสถานะอุปกรณ์
  const devSheet = getSheet(SHEET_DEVICES);
  const devData  = devSheet.getDataRange().getValues();
  const devHead  = devData[0].map(h => String(h).trim());
  const dIdIdx   = devHead.indexOf('id');
  const dStIdx   = devHead.indexOf('status');
  let devRowIdx  = -1;

  for (let i = 1; i < devData.length; i++) {
    if (String(devData[i][dIdIdx]).trim() === deviceId) {
      const currentStatus = String(devData[i][dStIdx]);
      if (currentStatus !== 'พร้อมใช้งาน')
        return jsonErr('อุปกรณ์ไม่พร้อมใช้งาน (สถานะ: ' + currentStatus + ')');
      devRowIdx = i + 1;
      break;
    }
  }

  if (devRowIdx === -1) return jsonErr('ไม่พบอุปกรณ์รหัส: ' + deviceId);

  // อัปเดตสถานะอุปกรณ์
  devSheet.getRange(devRowIdx, dStIdx + 1).setValue('ถูกยืม');

  // บันทึก Transaction
  const transId = generateId('TXN');
  getSheet(SHEET_TRANSACTIONS).appendRow([
    transId, deviceId, deviceName, username, name,
    todayDate(), expectedReturnDate, '', 'borrowed', '', ''
  ]);

  return jsonOk({ message: 'ยืม "' + deviceName + '" เรียบร้อยแล้ว', transId: transId });
}

/**
 * POST { action:'returnDevice', transId, deviceId, username, condition, note }
 * ← { success, message }
 */
function handleReturnDevice(p) {
  const transId   = String(p.transId   || '').trim();
  const deviceId  = String(p.deviceId  || '').trim();
  const condition = String(p.condition || 'ปกติ').trim();
  const note      = String(p.note      || '').trim();

  if (!transId || !deviceId)
    return jsonErr('ข้อมูลไม่ครบถ้วน: transId, deviceId');

  // อัปเดต Transaction
  const txSheet = getSheet(SHEET_TRANSACTIONS);
  const txData  = txSheet.getDataRange().getValues();
  const txHead  = txData[0].map(h => String(h).trim());
  const txIdIdx = txHead.indexOf('id');
  const retIdx  = txHead.indexOf('returnDate');
  const stIdx   = txHead.indexOf('status');
  const coIdx   = txHead.indexOf('condition');
  const noIdx   = txHead.indexOf('note');
  let found     = false;

  for (let i = 1; i < txData.length; i++) {
    if (String(txData[i][txIdIdx]).trim() === transId) {
      txSheet.getRange(i + 1, retIdx + 1).setValue(todayDate());
      txSheet.getRange(i + 1, stIdx  + 1).setValue('returned');
      txSheet.getRange(i + 1, coIdx  + 1).setValue(condition);
      txSheet.getRange(i + 1, noIdx  + 1).setValue(note);
      found = true;
      break;
    }
  }

  if (!found) return jsonErr('ไม่พบ Transaction รหัส: ' + transId);

  // อัปเดตสถานะอุปกรณ์กลับเป็น "พร้อมใช้งาน"
  const devSheet = getSheet(SHEET_DEVICES);
  const devData  = devSheet.getDataRange().getValues();
  const devHead  = devData[0].map(h => String(h).trim());
  const dIdIdx   = devHead.indexOf('id');
  const dStIdx   = devHead.indexOf('status');

  for (let i = 1; i < devData.length; i++) {
    if (String(devData[i][dIdIdx]).trim() === deviceId) {
      devSheet.getRange(i + 1, dStIdx + 1).setValue('พร้อมใช้งาน');
      break;
    }
  }

  return jsonOk({ message: 'คืนอุปกรณ์เรียบร้อยแล้ว' });
}

// ═══════════════════════════════════════════════════════════════════════════
//  📋 EquipmentBorrowDashboard: BorrowRecords
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET ?action=getBorrowRecords
 * ← { success, records:[...] }
 */
function handleGetBorrowRecords() {
  const records = sheetToObjects(getSheet(SHEET_BORROW));
  return jsonOk({ records: records });
}

/**
 * POST { action:'addBorrowRecord', borrowerName, itemName, borrowDate, returnDate }
 * ← { success, message, recordId }
 */
function handleAddBorrowRecord(p) {
  const borrowerName = String(p.borrowerName || '').trim();
  const itemName     = String(p.itemName     || '').trim();
  const borrowDate   = String(p.borrowDate   || todayDate()).trim();
  const returnDate   = String(p.returnDate   || '').trim();

  if (!borrowerName || !itemName || !returnDate)
    return jsonErr('ข้อมูลไม่ครบถ้วน: borrowerName, itemName, returnDate');

  const recordId = generateId('BR');
  getSheet(SHEET_BORROW).appendRow([recordId, borrowerName, itemName, borrowDate, returnDate, 'BORROWED']);
  return jsonOk({ message: 'บันทึกการยืม "' + itemName + '" เรียบร้อยแล้ว', recordId: recordId });
}

/**
 * POST { action:'returnBorrowRecord', recordId }
 * ← { success, message }
 */
function handleReturnBorrowRecord(p) {
  const recordId = String(p.recordId || '').trim();
  if (!recordId) return jsonErr('ไม่พบ recordId');

  const sheet   = getSheet(SHEET_BORROW);
  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  const idIdx   = headers.indexOf('id');
  const stIdx   = headers.indexOf('status');

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idIdx]).trim() === recordId) {
      if (String(data[i][stIdx]) === 'RETURNED')
        return jsonErr('รายการนี้ส่งคืนไปแล้ว');
      sheet.getRange(i + 1, stIdx + 1).setValue('RETURNED');
      return jsonOk({ message: 'บันทึกการส่งคืนเรียบร้อยแล้ว' });
    }
  }
  return jsonErr('ไม่พบรายการรหัส: ' + recordId);
}

// ═══════════════════════════════════════════════════════════════════════════
//  🧪 ฟังก์ชัน Test — รันใน Apps Script Editor เพื่อตรวจสอบ
// ═══════════════════════════════════════════════════════════════════════════

function testSetup() {
  Logger.log('=== IT Equipment Borrow System — Setup Test ===');

  [SHEET_USERS, SHEET_DEVICES, SHEET_TRANSACTIONS, SHEET_BORROW].forEach(function(name) {
    const sheet = getSheet(name);
    Logger.log('✅ Sheet "' + name + '" OK — last row: ' + sheet.getLastRow());
  });

  const users = sheetToObjects(getSheet(SHEET_USERS));
  if (!users.find(function(u) { return u.username === 'admin'; })) {
    getSheet(SHEET_USERS).appendRow(['admin', 'admin1234', 'ผู้ดูแลระบบ', 'admin', nowDateTime(), 'ไอที', '', '', '']);
    Logger.log('✅ สร้าง default admin user แล้ว: admin / admin1234');
  } else {
    Logger.log('ℹ️  admin user มีอยู่แล้ว');
  }

  Logger.log('=== Setup สำเร็จ! ===');
}

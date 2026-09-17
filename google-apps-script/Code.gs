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

// ─── Helper: แคชและเปิด Spreadsheet (เร่งความเร็วประมวลผล) ──────────────
let _cachedSS = null;
function getSpreadsheet() {
  if (!_cachedSS) {
    _cachedSS = (SPREADSHEET_ID && SPREADSHEET_ID !== 'YOUR_SPREADSHEET_ID_HERE')
      ? SpreadsheetApp.openById(SPREADSHEET_ID)
      : SpreadsheetApp.getActiveSpreadsheet();
  }
  return _cachedSS;
}

// ─── Helper: เปิด Sheet (สร้างใหม่พร้อม Header ถ้ายังไม่มี) ───────────────
function getSheet(name) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    const headers = {
      [SHEET_USERS]:        ['id', 'username', 'password', 'name', 'role', 'createdAt', 'department', 'phone', 'email', 'avatarUrl'],
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

// ─── Helper: แปลง Sheet Data เป็น Array of Objects พร้อม Key Aliases ─────
function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0].map(h => String(h).trim());
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      const val = row[i];
      const formattedVal = val instanceof Date
        ? Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss')
        : (val !== undefined && val !== null ? val : '');
      obj[h] = formattedVal;

      // สร้าง alias keys แบบ normalized lowercase เพื่อให้ Frontend ดึงได้เสมอ
      const normKey = h.toLowerCase().replace(/[\s_-]/g, '');
      if (normKey && obj[normKey] === undefined) {
        obj[normKey] = formattedVal;
      }
      // Alias สำหรับฟิลด์สำคัญใน React frontend
      if (normKey === 'imageurl' || normKey === 'image') obj.imageUrl = formattedVal;
      if (normKey === 'deviceid') obj.deviceId = formattedVal;
      if (normKey === 'devicename') obj.deviceName = formattedVal;
      if (normKey === 'expectedreturndate') obj.expectedReturnDate = formattedVal;
      if (normKey === 'returndate') obj.returnDate = formattedVal;
      if (normKey === 'borrowdate') obj.borrowDate = formattedVal;
    });
    return obj;
  });
}

// ─── Helper: ค้นหา Header Index แบบยืดหยุ่น (ไม่สนตัวพิมพ์เล็ก-ใหญ่/อักขระพิเศษ) ─
function findColIndex(headers, candidates) {
  if (!headers || !headers.length) return -1;
  const list = Array.isArray(candidates) ? candidates : [candidates];
  const cleanCandidates = list.map(function(c) {
    return String(c).toLowerCase().replace(/[\s_\-]/g, '');
  });
  for (let i = 0; i < headers.length; i++) {
    const norm = String(headers[i] || '').toLowerCase().replace(/[\s_\-]/g, '');
    if (cleanCandidates.indexOf(norm) !== -1) {
      return i;
    }
  }
  return -1;
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
      case 'login':            return handleLogin(e.parameter || {});
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
      const contents = (e && e.postData && e.postData.contents)
        ? e.postData.contents
        : (e && e.parameter ? JSON.stringify(e.parameter) : '{}');
      payload = JSON.parse(contents);
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
      case 'returnDevice':
      case 'return_device':      return handleReturnDevice(payload);

      // ── EquipmentBorrowDashboard: BorrowRecords ──────────────────────────
      case 'addBorrowRecord':    return handleAddBorrowRecord(payload);
      case 'returnBorrowRecord': return handleReturnBorrowRecord(payload);

      // ── Debug (ลบออกหลังแก้ปัญหาเสร็จ) ────────────────────────────────
      case 'debugLogin':         return handleDebugLogin(payload);

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
 * POST/GET { action:'login', username, password }
 * ← { success, user:{ id, username, name, role, department, phone, email, avatarUrl } }
 */
function handleLogin(p) {
  const usernameOrId = String(p.username || '').trim().toLowerCase();
  const password = String(p.password !== undefined && p.password !== null ? p.password : '').trim();

  if (!usernameOrId || !password)
    return jsonErr('กรุณากรอกชื่อผู้ใช้/รหัสประจำตัว และรหัสผ่าน');

  const sheet = getSheet(SHEET_USERS);
  // ใช้ getDisplayValues เพื่อป้องกันตัวเลข เช่น ID หรือรหัสผ่าน กลายเป็น exponential หรือหลุดศูนย์หน้า
  const displayData = sheet.getDataRange().getDisplayValues();

  // Auto-seed default admin user ถ้าชีท Users ยังไม่มีข้อมูลผู้ใช้
  if (displayData.length < 2) {
    const defaultHeaders = ['id', 'username', 'password', 'name', 'role', 'createdAt', 'department', 'phone', 'email', 'avatarUrl'];
    const defaultAdmin   = ['1787631546020', 'Admin', 'admin2412', 'แอดมิน', 'admin', nowDateTime(), 'ไอที', '', '', ''];
    sheet.clear();
    sheet.getRange(1, 1, 2, defaultHeaders.length).setValues([defaultHeaders, defaultAdmin]);
    sheet.getRange(1, 1, 1, defaultHeaders.length)
      .setFontWeight('bold')
      .setBackground('#1e293b')
      .setFontColor('#ffffff');
    // อ่านข้อมูลใหม่หลัง seed
    return handleLogin(p);
  }

  const headers = displayData[0].map(h => String(h).trim());

  // ค้นหา column สำหรับ username — ค้นหา 'username' exact match ก่อน ไม่รวม 'user'
  // เพราะ col ที่มี header 'user' มักเป็น student ID ไม่ใช่ login name
  let uIdx = findColIndex(headers, ['username', 'user_name', 'loginname', 'login', 'ชื่อผู้ใช้งาน']);
  // ถ้าไม่มี 'username' column เลย ค่อย fallback หา 'user' column (กรณีชีทเก่าที่ไม่แยก ID)
  if (uIdx === -1) uIdx = findColIndex(headers, ['user', 'ชื่อผู้ใช้']);

  // ID column — รวม 'user' เพราะ header อาจตั้งเป็น 'user' แทน 'id' (student ID column)
  const idIdx    = findColIndex(headers, ['id', 'userid', 'user_id', 'studentid', 'student_id', 'user', 'รหัสประจำตัว', 'รหัส']);
  const pIdx     = findColIndex(headers, ['password', 'pass', 'pwd', 'รหัสผ่าน']);
  const nameIdx  = findColIndex(headers, ['name', 'fullname', 'full_name', 'ชื่อ', 'ชื่อ-นามสกุล']);
  const roleIdx  = findColIndex(headers, ['role', 'userrole', 'สิทธิ์', 'บทบาท']);
  const emailIdx = findColIndex(headers, ['email', 'mail', 'อีเมล', 'อีเมล์']);
  const phoneIdx = findColIndex(headers, ['phone', 'tel', 'เบอร์โทร', 'เบอร์โทรศัพท์']);
  const deptIdx  = findColIndex(headers, ['department', 'dept', 'แผนก', 'ฝ่าย']);
  const avIdx    = findColIndex(headers, ['avatarurl', 'avatar', 'รูปโปรไฟล์']);

  // safeUIdx: ถ้าไม่มี username column จริงๆ ใช้ col index 2 เป็น fallback (ตามโครงสร้าง user|password|username)
  const safeUIdx = uIdx !== -1 ? uIdx : 2;
  const safePIdx = pIdx !== -1 ? pIdx : 1;

  let foundRow = null;
  const cleanInput = usernameOrId.replace(/[-\s]/g, '');

  for (let i = 1; i < displayData.length; i++) {
    const row = displayData[i];
    // ค้นหา username จาก username column ก่อน
    const uName  = safeUIdx !== -1 ? String(row[safeUIdx] || '').trim().toLowerCase() : '';
    // ค้นหา ID: ถ้า idIdx ชนกับ uIdx ให้ skip (เพราะนั่นคือ column เดียวกัน)
    const uId    = (idIdx !== -1 && idIdx !== safeUIdx) ? String(row[idIdx] || '').trim().toLowerCase() : '';
    const uEmail = emailIdx !== -1 ? String(row[emailIdx] || '').trim().toLowerCase() : '';
    const uPhone = phoneIdx !== -1 ? String(row[phoneIdx] || '').trim().replace(/[-\s]/g, '') : '';
    const uPass  = safePIdx !== -1 ? String(row[safePIdx] || '').trim() : '';

    const isMatchUser = (
      uName === usernameOrId ||
      (uId && uId === usernameOrId) ||
      (uEmail && uEmail === usernameOrId) ||
      (uPhone && uPhone === cleanInput)
    );

    // รองรับทั้งรหัสผ่านตรงทั้งหมด — case-sensitive ตาม spec จริง
    const isMatchPass = (uPass === password);

    if (isMatchUser && isMatchPass) {
      foundRow = row;
      break;
    }
  }

  if (!foundRow) return jsonErr('ชื่อผู้ใช้/รหัสประจำตัว หรือรหัสผ่านไม่ถูกต้อง');

  const rawRole = (roleIdx !== -1 ? String(foundRow[roleIdx] || '') : '').toLowerCase().trim();
  // รองรับโรลทั้งหมด: admin, student, staff, user (legacy)
  const validRoles = ['admin', 'student', 'staff', 'user'];
  const userRole = validRoles.includes(rawRole) ? rawRole : 'student';

  const userObj = {
    id:         idIdx !== -1 ? String(foundRow[idIdx] || '') : '',
    username:   safeUIdx !== -1 ? String(foundRow[safeUIdx] || '') : usernameOrId,
    name:       (nameIdx !== -1 && foundRow[nameIdx]) ? String(foundRow[nameIdx]) : (safeUIdx !== -1 ? String(foundRow[safeUIdx]) : usernameOrId),
    role:       userRole,
    department: deptIdx !== -1 ? String(foundRow[deptIdx] || '') : '',
    phone:      phoneIdx !== -1 ? String(foundRow[phoneIdx] || '') : '',
    email:      emailIdx !== -1 ? String(foundRow[emailIdx] || '') : '',
    avatarUrl:  avIdx !== -1 ? String(foundRow[avIdx] || '') : ''
  };

  return jsonOk({ user: userObj });
}

/**
 * POST { action:'register', id, username, password, name, role, adminKey }
 * ← { success, message }
 */
function handleRegister(p) {
  const username = String(p.username || '').trim();
  const password = String(p.password || '').trim();
  const name     = String(p.name     || '').trim();
  const rawRole  = String(p.role     || 'student').toLowerCase().trim();
  // รองรับโรลใหม่: student, staff (และ admin สำหรับ seed/legacy)
  const validRoles = ['student', 'staff', 'admin', 'user'];
  const role     = validRoles.includes(rawRole) ? rawRole : 'student';
  const adminKey = String(p.adminKey || '').trim();
  const id       = String(p.id || 'USR-' + new Date().getTime()).trim();

  if (!username || !password || !name)
    return jsonErr('กรุณากรอกข้อมูลให้ครบถ้วน');
  if (username.length < 3)
    return jsonErr('Username ต้องมีความยาวอย่างน้อย 3 ตัวอักษร');
  if (password.length < 6)
    return jsonErr('Password ต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
  // ตรวจสอบ Admin Key เฉพาะเมื่อสมัครเป็น admin (ช่องทาง legacy)
  if (role === 'admin' && adminKey && adminKey.toUpperCase() !== ADMIN_SECRET_KEY.toUpperCase())
    return jsonErr('รหัสลับผู้ดูแลระบบไม่ถูกต้อง');

  const sheet = getSheet(SHEET_USERS);
  const displayData = sheet.getDataRange().getDisplayValues();
  let headers = displayData.length > 0 ? displayData[0].map(h => String(h).trim()) : [];

  // ถ้ายังไม่มี header หรือตารางว่าง → สร้าง header ครบ 10 คอลัมน์
  if (headers.length === 0) {
    headers = ['id', 'username', 'password', 'name', 'role', 'createdAt', 'department', 'phone', 'email', 'avatarUrl'];
    sheet.appendRow(headers);
  }

  // ตรวจสอบ username ซ้ำ — ค้นหา username column แบบเดียวกับ login (ไม่รวม 'user' เพราะเป็น ID)
  let uColIdx = findColIndex(headers, ['username', 'user_name', 'loginname', 'ชื่อผู้ใช้งาน']);
  if (uColIdx === -1) uColIdx = findColIndex(headers, ['user', 'ชื่อผู้ใช้']);
  if (uColIdx !== -1) {
    for (let i = 1; i < displayData.length; i++) {
      if (String(displayData[i][uColIdx] || '').trim().toLowerCase() === username.toLowerCase()) {
        return jsonErr('ชื่อผู้ใช้ (Username) นี้ถูกใช้งานแล้ว กรุณาเลือกชื่ออื่น');
      }
    }
  }

  // จัดเรียงแถวข้อมูลตามตำแหน่ง Headers ในชีทจริง
  // idIdx รวม 'user' เพราะ header ชีทอาจตั้งเป็น 'user' สำหรับ student ID
  const idIdx   = findColIndex(headers, ['id', 'userid', 'user_id', 'studentid', 'student_id', 'user', 'รหัส']);
  // uIdx ค้นหา username column โดยไม่รวม 'user' (เป็น ID ไม่ใช่ username)
  let uIdx    = findColIndex(headers, ['username', 'user_name', 'loginname', 'ชื่อผู้ใช้งาน']);
  if (uIdx === -1) uIdx = findColIndex(headers, ['user', 'ชื่อผู้ใช้']);
  const pIdx    = findColIndex(headers, ['password', 'pass', 'pwd']);
  const nIdx    = findColIndex(headers, ['name', 'fullname', 'full_name']);
  const rIdx    = findColIndex(headers, ['role', 'userrole']);
  const cIdx    = findColIndex(headers, ['createdat', 'created_at']);

  const newRow = new Array(headers.length).fill('');
  if (idIdx !== -1) newRow[idIdx] = id;
  if (uIdx  !== -1) newRow[uIdx]  = username;
  if (pIdx  !== -1) newRow[pIdx]  = password;
  if (nIdx  !== -1) newRow[nIdx]  = name;
  if (rIdx  !== -1) newRow[rIdx]  = role;
  if (cIdx  !== -1) newRow[cIdx]  = nowDateTime();

  // หากไม่พบคอลัมน์ username และ password จาก header ให้บันทึกตามลำดับมาตรฐาน 10 คอลัมน์
  if (uIdx === -1 && pIdx === -1) {
    sheet.appendRow([id, username, password, name, role, nowDateTime(), '', '', '', '']);
  } else {
    sheet.appendRow(newRow);
  }

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
    if (findColIndex(headers, col) === -1) {
      headers.push(col);
      sheet.getRange(1, headers.length).setValue(col);
    }
  });

  const uIdx      = findColIndex(headers, ['username', 'user', 'user_name']);
  const nameIdx   = findColIndex(headers, ['name', 'fullname', 'full_name']);
  const roleIdx   = findColIndex(headers, ['role', 'userrole']);
  const deptIdx   = findColIndex(headers, ['department', 'dept']);
  const phoneIdx  = findColIndex(headers, ['phone', 'tel']);
  const emailIdx  = findColIndex(headers, ['email', 'mail']);
  const avatarIdx = findColIndex(headers, ['avatarurl', 'avatar']);

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

  if (nameIdx !== -1)   sheet.getRange(foundRow, nameIdx + 1).setValue(name);
  if (deptIdx !== -1)   sheet.getRange(foundRow, deptIdx + 1).setValue(dept);
  if (phoneIdx !== -1)  sheet.getRange(foundRow, phoneIdx + 1).setValue(phone);
  if (emailIdx !== -1)  sheet.getRange(foundRow, emailIdx + 1).setValue(email);
  if (avatarIdx !== -1) sheet.getRange(foundRow, avatarIdx + 1).setValue(avatarUrl);

  return jsonOk({
    message: 'อัปเดตข้อมูลโปรไฟล์เรียบร้อยแล้ว',
    user: {
      username: username,
      name: name,
      role: userRole.toLowerCase().trim() === 'admin' ? 'admin' : 'user',
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
  const displayData = sheet.getDataRange().getDisplayValues();
  const headers = displayData[0].map(h => String(h).trim());
  const uIdx = findColIndex(headers, ['username', 'user', 'user_name']);
  const pIdx = findColIndex(headers, ['password', 'pass', 'pwd']);

  if (uIdx === -1 || pIdx === -1) return jsonErr('ไม่พบคอลัมน์ username หรือ password ในชีท');

  for (let i = 1; i < displayData.length; i++) {
    if (String(displayData[i][uIdx]).trim().toLowerCase() === username) {
      const dbPassword = String(displayData[i][pIdx]).trim();
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
  const role = String(p.userRole || '').toLowerCase().trim();
  if (role !== 'admin') return jsonErr('ไม่มีสิทธิ์ (ต้องเป็น Admin)');

  const deviceId = String(p.deviceId || '').trim();
  if (!deviceId) return jsonErr('ไม่พบ deviceId');

  const sheet   = getSheet(SHEET_DEVICES);
  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  const idIdx   = findColIndex(headers, ['id', 'deviceid', 'รหัส', 'รหัสอุปกรณ์']);

  if (idIdx === -1) return jsonErr('ไม่พบคอลัมน์ id ในชีท Devices');

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
  const dIdIdx   = findColIndex(devHead, ['id', 'deviceid', 'รหัส', 'รหัสอุปกรณ์']);
  const dStIdx   = findColIndex(devHead, ['status', 'สถานะ']);
  let devRowIdx  = -1;

  if (dIdIdx === -1 || dStIdx === -1)
    return jsonErr('โครงสร้างคอลัมน์ชีท Devices ไม่ถูกต้อง (ไม่พบ id หรือ status)');

  for (let i = 1; i < devData.length; i++) {
    if (String(devData[i][dIdIdx]).trim() === deviceId) {
      const currentStatus = String(devData[i][dStIdx]).trim();
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
  const txIdIdx = findColIndex(txHead, ['id', 'transid']);
  const retIdx  = findColIndex(txHead, ['returndate']);
  const stIdx   = findColIndex(txHead, ['status']);
  const coIdx   = findColIndex(txHead, ['condition']);
  const noIdx   = findColIndex(txHead, ['note']);
  let found     = false;

  for (let i = 1; i < txData.length; i++) {
    if (String(txData[i][txIdIdx]).trim() === transId) {
      if (retIdx !== -1) txSheet.getRange(i + 1, retIdx + 1).setValue(todayDate());
      if (stIdx !== -1)  txSheet.getRange(i + 1, stIdx  + 1).setValue('returned');
      if (coIdx !== -1)  txSheet.getRange(i + 1, coIdx  + 1).setValue(condition);
      if (noIdx !== -1)  txSheet.getRange(i + 1, noIdx  + 1).setValue(note);
      found = true;
      break;
    }
  }

  if (!found) return jsonErr('ไม่พบ Transaction รหัส: ' + transId);

  // อัปเดตสถานะอุปกรณ์กลับเป็น "พร้อมใช้งาน"
  const devSheet = getSheet(SHEET_DEVICES);
  const devData  = devSheet.getDataRange().getValues();
  const devHead  = devData[0].map(h => String(h).trim());
  const dIdIdx   = findColIndex(devHead, ['id', 'deviceid', 'รหัส']);
  const dStIdx   = findColIndex(devHead, ['status', 'สถานะ']);

  if (dIdIdx !== -1 && dStIdx !== -1) {
    for (let i = 1; i < devData.length; i++) {
      if (String(devData[i][dIdIdx]).trim() === deviceId) {
        devSheet.getRange(i + 1, dStIdx + 1).setValue('พร้อมใช้งาน');
        break;
      }
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

  const sheet = getSheet(SHEET_USERS);
  const users = sheetToObjects(sheet);
  if (!users.find(function(u) { return String(u.username || '').toLowerCase() === 'admin'; })) {
    // ใช้ index-based insertion เพื่อรองรับลำดับ header ที่อาจแตกต่างกัน
    const data    = sheet.getDataRange().getValues();
    const headers = data[0].map(function(h) { return String(h).trim(); });
    const newRow  = new Array(headers.length).fill('');

    var idIdx   = findColIndex(headers, ['id', 'userid']);
    var uIdx    = findColIndex(headers, ['username', 'user']);
    var pIdx    = findColIndex(headers, ['password', 'pass']);
    var nIdx    = findColIndex(headers, ['name', 'fullname']);
    var rIdx    = findColIndex(headers, ['role', 'userrole']);
    var cIdx    = findColIndex(headers, ['createdat', 'created_at']);
    var dIdx    = findColIndex(headers, ['department', 'dept']);

    if (idIdx !== -1) newRow[idIdx] = '1787631546020';
    if (uIdx  !== -1) newRow[uIdx]  = 'admin';
    if (pIdx  !== -1) newRow[pIdx]  = 'admin2412';
    if (nIdx  !== -1) newRow[nIdx]  = 'ผู้ดูแลระบบ';
    if (rIdx  !== -1) newRow[rIdx]  = 'admin';
    if (cIdx  !== -1) newRow[cIdx]  = nowDateTime();
    if (dIdx  !== -1) newRow[dIdx]  = 'ไอที';

    sheet.appendRow(newRow);
    Logger.log('✅ สร้าง default admin user แล้ว: admin / admin2412');
  } else {
    Logger.log('ℹ️  admin user มีอยู่แล้ว');
  }

  Logger.log('=== Setup สำเร็จ! ===');
}

// ═══════════════════════════════════════════════════════════════════════════
//  🔍 Debug Login — POST { action:'debugLogin', username, password }
//  ← ส่งคืน raw headers + preview rows + match details เพื่อ diagnose login
//  ⚠️ ลบออกหลังแก้ปัญหาเสร็จสิ้น
// ═══════════════════════════════════════════════════════════════════════════
function handleDebugLogin(p) {
  try {
    const sheet = getSheet(SHEET_USERS);
    const displayData = sheet.getDataRange().getDisplayValues();

    if (displayData.length < 1) {
      return jsonOk({ debug: 'Sheet is EMPTY (no rows at all)', totalRows: 0 });
    }

    const headers = displayData[0];
    const totalRows = displayData.length - 1;

    // ส่งกลับ header + 3 แถวแรก (ปิด password)
    const previewRows = displayData.slice(1, 4).map(function(row) {
      return row.map(function(cell, idx) {
        var h = String(headers[idx] || '').toLowerCase();
        if (h === 'password' || h === 'pass' || h === 'pwd') return '***masked***';
        return cell;
      });
    });

    // ตรวจสอบว่า username ที่ส่งมาตรงกับอะไรใน Sheet
    var inputUser = String(p.username || '').trim().toLowerCase();
    var inputPass = String(p.password || '').trim();

    var uIdx = findColIndex(headers, ['username', 'user', 'user_name', 'ชื่อผู้ใช้']);
    var pIdx = findColIndex(headers, ['password', 'pass', 'pwd', 'รหัสผ่าน']);
    var idIdx = findColIndex(headers, ['id', 'userid', 'studentid']);

    var matchDetails = [];
    for (var i = 1; i < displayData.length; i++) {
      var row = displayData[i];
      var uName = uIdx !== -1 ? String(row[uIdx] || '').trim() : '(col not found)';
      var uId   = idIdx !== -1 ? String(row[idIdx] || '').trim() : '';
      var uPass = pIdx !== -1 ? String(row[pIdx] || '').trim() : '(col not found)';
      var userMatch = uName.toLowerCase() === inputUser || uId.toLowerCase() === inputUser;
      var passMatch = uPass === inputPass;
      matchDetails.push({
        row: i,
        username: uName,
        id: uId,
        usernameMatch: userMatch,
        passwordMatch: passMatch,
        passwordLengthInSheet: uPass.length,
        passwordLengthInput: inputPass.length
      });
    }

    return jsonOk({
      totalRows: totalRows,
      headers: headers,
      colIndices: { username: uIdx, password: pIdx, id: idIdx },
      previewRows: previewRows,
      matchDetails: matchDetails
    });
  } catch(err) {
    return jsonErr('Debug error: ' + err.message, 500);
  }
}

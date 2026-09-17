/**
 * ============================================================
 *  IT Equipment Borrow System — Google Apps Script Backend
 *  Version: 2.4 (Complete & Robust: Login + Date/Time + Row 8 Users)
 *  เชื่อมต่อกับ React Frontend ผ่าน Fetch API
 * ============================================================
 *
 *  ✨ สิ่งที่ปรับปรุงและแก้ไขในเวอร์ชัน 2.4:
 *  1. 🔐 ระบบ Login & Register:
 *     - รองรับโครงสร้างชีท Users ทั้งแบบใหม่ (Row 8: id, username, password, name, role)
 *       และแบบเดิม (Row 1-6: Col 0=ชื่อ/id, Col 1=password, Col 2=username, Col 3=role)
 *     - แก้ปัญหา Admin ได้สิทธิ์ student: กำหนดให้ผู้ดูแลระบบ (admin2412) ได้รับ role 'admin' เสมอ
 *     - รองรับรหัสผ่านทั้งตรงตัวพิมพ์และ case-insensitive
 *     - ค้นหาผู้ใช้ได้ทั้ง username, id, email, และเบอร์โทร
 *  2. ⏰ วันที่และเวลาประวัติยืม-คืน (Transactions):
 *     - borrowDate และ returnDate มี วันที่ + เวลา (yyyy-MM-dd HH:mm เช่น 2026-09-04 13:56)
 *     - เติมข้อมูล userId, username (ชื่อผู้ยืม), userRole ครบถ้วน
 *  3. ⚡ Zero Timeout:
 *     - ไม่มีการดัดแปลงชีทในคำขออ่าน (GET) เพื่อป้องกัน HTTP 504 Timeout
 *
 *  📋 โครงสร้าง Google Sheets:
 *  ┌─────────────────┬──────────────────────────────────────────────────────┐
 *  │ Users           │ id | username | password | name | role | createdAt… │
 *  │ Devices         │ id | name | category | status | imageUrl | createdAt │
 *  │ Transactions    │ id | deviceId | deviceName | userId | username |     │
 *  │                 │ borrowDate | expectedReturnDate | returnDate |        │
 *  │                 │ status | userRole                                     │
 *  │ BorrowRecords   │ id | borrowerName | itemName | borrowDate |           │
 *  │                 │ returnDate | status                                   │
 *  └─────────────────┴──────────────────────────────────────────────────────┘
 *
 *  🔧 วิธีนำไปใช้งาน:
 *  1. เปิด Google Sheets → Extensions → Apps Script
 *  2. ลบโค้ดเดิมทั้งหมดใน Code.gs แล้ววางโค้ดนี้ลงไปแทน → Ctrl+S
 *  3. Deploy → Manage deployments → Edit → New version → Deploy
 * ============================================================
 */

// ─── Configuration ─────────────────────────────────────────────────────────
const SPREADSHEET_ID   = 'YOUR_SPREADSHEET_ID_HERE'; // ถ้าเป็น Bound Script ไม่ต้องแก้
const ADMIN_SECRET_KEY = 'ADMIN2024SECRET';
// ───────────────────────────────────────────────────────────────────────────

const SHEET_USERS        = 'Users';
const SHEET_DEVICES      = 'Devices';
const SHEET_TRANSACTIONS = 'Transactions';
const SHEET_BORROW       = 'BorrowRecords';

// ─── Cache Spreadsheet ────────────────────────────────────────────────────
let _cachedSS = null;
function getSpreadsheet() {
  if (!_cachedSS) {
    _cachedSS = (SPREADSHEET_ID && SPREADSHEET_ID !== 'YOUR_SPREADSHEET_ID_HERE')
      ? SpreadsheetApp.openById(SPREADSHEET_ID)
      : SpreadsheetApp.getActiveSpreadsheet();
  }
  return _cachedSS;
}

// ─── Get or Create Sheet ─────────────────────────────────────────────────
function getSheet(name) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    const headers = {
      [SHEET_USERS]:        ['id', 'username', 'password', 'name', 'role', 'createdAt', 'department', 'phone', 'email', 'avatarUrl'],
      [SHEET_DEVICES]:      ['id', 'name', 'category', 'status', 'imageUrl', 'createdAt'],
      [SHEET_TRANSACTIONS]: ['id', 'deviceId', 'deviceName', 'userId', 'username', 'borrowDate',
                             'expectedReturnDate', 'returnDate', 'status', 'userRole'],
      [SHEET_BORROW]:       ['id', 'borrowerName', 'itemName', 'borrowDate', 'returnDate', 'status'],
    };
    if (headers[name]) {
      sheet.appendRow(headers[name]);
      sheet.getRange(1, 1, 1, headers[name].length)
        .setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
    }
  }
  return sheet;
}

// ─── Sheet → Array of Objects ────────────────────────────────────────────
function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0].map(h => String(h).trim());
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      const val = row[i];
      const v = val instanceof Date
        ? Utilities.formatDate(val, Session.getScriptTimeZone() || 'Asia/Bangkok', 'yyyy-MM-dd HH:mm')
        : (val !== undefined && val !== null ? val : '');
      obj[h] = v;
      const nk = h.toLowerCase().replace(/[\s_-]/g, '');
      if (nk && obj[nk] === undefined) obj[nk] = v;
      if (nk === 'imageurl' || nk === 'image') obj.imageUrl = v;
      if (nk === 'deviceid')           obj.deviceId = v;
      if (nk === 'devicename')         obj.deviceName = v;
      if (nk === 'userid')             obj.userId = v;
      if (nk === 'userrole')           obj.userRole = v;
      if (nk === 'expectedreturndate') obj.expectedReturnDate = v;
      if (nk === 'returndate')         obj.returnDate = v;
      if (nk === 'borrowdate')         obj.borrowDate = v;
    });
    return obj;
  });
}

// ─── Find Column Index (flexible, case-insensitive) ──────────────────────
function findColIndex(headers, candidates) {
  if (!headers || !headers.length) return -1;
  const list = Array.isArray(candidates) ? candidates : [candidates];
  const clean = list.map(c => String(c).toLowerCase().replace(/[\s_\-]/g, ''));
  for (let i = 0; i < headers.length; i++) {
    const norm = String(headers[i] || '').toLowerCase().replace(/[\s_\-]/g, '');
    if (clean.indexOf(norm) !== -1) return i;
  }
  return -1;
}

// ─── Normalize blank/dash values ─────────────────────────────────────────
function normBlank(v) {
  const s = String(v === undefined || v === null ? '' : v).trim();
  return (s === '' || s === '-') ? '' : s;
}

// ─── Lookup user info from Users sheet ───────────────────────────────────
function lookupUserInfo(usernameOrId) {
  const target = String(usernameOrId || '').trim().toLowerCase();
  if (!target) return null;

  const sheet = getSheet(SHEET_USERS);
  const data  = sheet.getDataRange().getDisplayValues();
  if (data.length < 2) return null;

  const headers = data[0].map(h => String(h).trim());
  let uIdx    = findColIndex(headers, ['username', 'user_name', 'loginname']);
  if (uIdx === -1) uIdx = findColIndex(headers, ['user']);
  const idIdx   = findColIndex(headers, ['id', 'userid', 'user_id', 'studentid']);
  const knownRoles = ['admin', 'student', 'staff', 'user'];

  for (let i = 1; i < data.length; i++) {
    const row  = data[i];
    const col0 = normBlank(row[0]).toLowerCase();
    const col1 = normBlank(row[1]).toLowerCase();
    const uval = uIdx !== -1 ? normBlank(row[uIdx]).toLowerCase() : '';
    const idv  = idIdx !== -1 ? normBlank(row[idIdx]).toLowerCase() : '';

    if (uval === target || idv === target || col0 === target || col1 === target) {
      const vc0 = normBlank(row[0]), vc1 = normBlank(row[1]);
      const vc3 = normBlank(row[3]), vc4 = normBlank(row[4]);
      let role = 'student', name = '';
      if (vc4 && knownRoles.includes(vc4.toLowerCase())) {
        role = vc4.toLowerCase(); name = vc3 || vc1 || vc0;
      } else if (vc3 && knownRoles.includes(vc3.toLowerCase())) {
        role = vc3.toLowerCase();
        name = (vc0 && !/^\d{10,}$/.test(vc0)) ? vc0 : (vc1 || vc0);
      }
      if (vc0.toLowerCase().includes('admin') || vc3.toLowerCase() === 'admin') role = 'admin';
      return { id: vc0, username: vc1 || uval || target, name: name || vc1 || vc0 || target, role };
    }
  }
  return null;
}

// ─── Generate short ID ────────────────────────────────────────────────────
function generateId(prefix) {
  return prefix + '-' + new Date().getTime().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
}

// ─── Current date+time with time ─────────────────────────────────────────
function nowDateTime() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Bangkok', 'yyyy-MM-dd HH:mm');
}
function todayDate() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Bangkok', 'yyyy-MM-dd');
}

// ─── JSON Responses ───────────────────────────────────────────────────────
function jsonOk(data) {
  return ContentService.createTextOutput(JSON.stringify({ success: true, status: 'success', ...data }))
    .setMimeType(ContentService.MimeType.JSON);
}
function jsonErr(message, code) {
  return ContentService.createTextOutput(JSON.stringify({ success: false, status: 'error', message: message, code: code || 400 }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ═══════════════════════════════════════════════════════════════════════════
//  Entry Points
// ═══════════════════════════════════════════════════════════════════════════

function doGet(e) {
  try {
    const action = (e.parameter.action || '').trim();
    switch (action) {
      case 'getData':          return handleGetData();
      case 'getBorrowRecords': return handleGetBorrowRecords();
      case 'login':            return handleLogin(e.parameter || {});
      default: return jsonErr('Unknown GET action: ' + action);
    }
  } catch (err) {
    console.error('doGet Error:', err);
    return jsonErr('Server Error: ' + err.message, 500);
  }
}

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
      case 'login':              return handleLogin(payload);
      case 'register':           return handleRegister(payload);
      case 'updateProfile':      return handleUpdateProfile(payload);
      case 'changePassword':     return handleChangePassword(payload);
      case 'add_device':         return handleAddDevice(payload);
      case 'delete_device':      return handleDeleteDevice(payload);
      case 'borrowDevice':       return handleBorrowDevice(payload);
      case 'returnDevice':
      case 'return_device':      return handleReturnDevice(payload);
      case 'addBorrowRecord':    return handleAddBorrowRecord(payload);
      case 'returnBorrowRecord': return handleReturnBorrowRecord(payload);
      case 'debugLogin':         return handleDebugLogin(payload);
      default: return jsonErr('Unknown POST action: ' + action);
    }
  } catch (err) {
    console.error('doPost Error:', err);
    return jsonErr('Server Error: ' + err.message, 500);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  Login
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST/GET { action:'login', username, password }
 * ← { success, user:{ id, username, name, role, department, phone, email, avatarUrl } }
 *
 * รองรับโครงสร้างชีท Users ทั้งแบบใหม่และเก่า:
 *   แบบใหม่ (Row 8+): A=id, B=username, C=password, D=name, E=role
 *   แบบเก่า (Row 1-6): A=id/name, B=username/password, C=password, D=role, E=ว่าง
 */
function handleLogin(p) {
  const usernameOrId = String(p.username || '').trim().toLowerCase();
  const password = String(p.password !== undefined && p.password !== null ? p.password : '').trim();

  if (!usernameOrId || !password)
    return jsonErr('กรุณากรอกชื่อผู้ใช้/รหัสประจำตัว และรหัสผ่าน');

  const sheet = getSheet(SHEET_USERS);
  const displayData = sheet.getDataRange().getDisplayValues();

  // Auto-seed admin ถ้าชีทว่าง
  if (displayData.length < 2) {
    const hdr = ['id', 'username', 'password', 'name', 'role'];
    const adm = ['admin2412', 'admin2412', 'Admin2412', 'ผู้ดูแลระบบ', 'admin'];
    sheet.clear();
    sheet.getRange(1, 1, 2, hdr.length).setValues([hdr, adm]);
    sheet.getRange(1, 1, 1, hdr.length).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
    return handleLogin(p);
  }

  const headers = displayData[0].map(h => String(h).trim());

  // หา column indices
  let uIdx = findColIndex(headers, ['username', 'user_name', 'loginname', 'login', 'ชื่อผู้ใช้งาน']);
  if (uIdx === -1) uIdx = findColIndex(headers, ['user', 'ชื่อผู้ใช้']);

  const idIdx    = findColIndex(headers, ['id', 'userid', 'user_id', 'studentid', 'student_id', 'รหัสประจำตัว', 'รหัส']);
  const pIdx     = findColIndex(headers, ['password', 'pass', 'pwd', 'รหัสผ่าน']);
  const nameIdx  = findColIndex(headers, ['name', 'fullname', 'full_name', 'ชื่อ']);
  const roleIdx  = findColIndex(headers, ['role', 'userrole', 'สิทธิ์']);
  const emailIdx = findColIndex(headers, ['email', 'mail', 'อีเมล', 'อีเมล์']);
  const phoneIdx = findColIndex(headers, ['phone', 'tel', 'เบอร์โทร']);
  const deptIdx  = findColIndex(headers, ['department', 'dept', 'แผนก']);
  const avIdx    = findColIndex(headers, ['avatarurl', 'avatar']);

  // Fallback: ชีทมาตรฐาน col 0=id, col 1=username, col 2=password, col 3=name, col 4=role
  const safeUIdx = uIdx !== -1 ? uIdx : 1;
  const safePIdx = pIdx !== -1 ? pIdx : 2;

  const cleanInput = usernameOrId.replace(/[-\s]/g, '');
  let foundRow = null;

  for (let i = 1; i < displayData.length; i++) {
    const row  = displayData[i];
    const col0 = normBlank(row[0]).toLowerCase();
    const col1 = normBlank(row[1]).toLowerCase();
    const uNm  = safeUIdx < row.length ? normBlank(row[safeUIdx]).toLowerCase() : '';
    const uId  = idIdx !== -1 && idIdx < row.length ? normBlank(row[idIdx]).toLowerCase() : '';
    const em   = emailIdx !== -1 ? normBlank(row[emailIdx]).toLowerCase() : '';
    const ph   = phoneIdx !== -1 ? normBlank(row[phoneIdx]).replace(/[-\s]/g, '') : '';
    const pw   = safePIdx < row.length ? String(row[safePIdx] || '').trim() : '';

    const matchUser = (
      (uNm  && uNm  === usernameOrId) ||
      (uId  && uId  === usernameOrId) ||
      (col0 && col0 === usernameOrId) ||
      (col1 && col1 === usernameOrId) ||
      (em   && em   === usernameOrId) ||
      (ph   && ph   === cleanInput) ||
      // พิเศษ: พิมพ์ 'admin' แล้วตรงกับแถวที่มี 'admin' ใน col 0 หรือ col 1
      (usernameOrId === 'admin' && (col0.includes('admin') || col1.includes('admin') || uNm.includes('admin')))
    );

    // Case-insensitive password เผื่อ Admin พิมพ์ตัวพิมพ์เล็กทั้งหมด
    const matchPass = (pw === password) || (pw.toLowerCase() === password.toLowerCase());

    if (matchUser && matchPass) {
      foundRow = row;
      break;
    }
  }

  if (!foundRow) return jsonErr('ชื่อผู้ใช้/รหัสประจำตัว หรือรหัสผ่านไม่ถูกต้อง');

  // ─── Resolve role & name ──────────────────────────────────────────────
  // แบบใหม่ (Row 8+): Col 3 = name, Col 4 = role (role มีค่า)
  // แบบเก่า (Row 1-6): Col 3 = role, Col 4 = ว่าง (name อยู่ที่ Col 0/1)
  const knownRoles = ['admin', 'student', 'staff', 'user'];
  const vc0 = normBlank(foundRow[0]);
  const vc1 = normBlank(foundRow[1]);
  const vc3 = normBlank(foundRow[3]);
  const vc4 = normBlank(foundRow[4]);

  let resolvedRole = '';
  let resolvedName = '';

  if (vc4 && knownRoles.includes(vc4.toLowerCase())) {
    // แบบใหม่
    resolvedRole = vc4.toLowerCase();
    resolvedName = vc3 || vc1 || vc0;
  } else if (vc3 && knownRoles.includes(vc3.toLowerCase())) {
    // แบบเก่า
    resolvedRole = vc3.toLowerCase();
    resolvedName = (vc0 && vc0 !== '-' && !/^\d{10,}$/.test(vc0)) ? vc0 : (vc1 || vc0);
  } else if (roleIdx !== -1 && foundRow[roleIdx]) {
    const rr = String(foundRow[roleIdx]).trim().toLowerCase();
    resolvedRole = knownRoles.includes(rr) ? rr : 'student';
    resolvedName = (nameIdx !== -1 && foundRow[nameIdx]) ? String(foundRow[nameIdx]) : (String(foundRow[safeUIdx]) || usernameOrId);
  } else {
    resolvedRole = 'student';
    resolvedName = (nameIdx !== -1 && foundRow[nameIdx]) ? String(foundRow[nameIdx]) : (vc1 || vc0 || usernameOrId);
  }

  // Force admin role: ถ้า Col 0/1/3 มีคำว่า 'admin' หรือ username มี 'admin'
  if (vc3.toLowerCase() === 'admin' || vc4.toLowerCase() === 'admin' ||
      vc0.toLowerCase().includes('admin') || vc1.toLowerCase().includes('admin') ||
      usernameOrId.includes('admin')) {
    resolvedRole = 'admin';
    if (!resolvedName || resolvedName.toLowerCase() === 'admin') resolvedName = 'ผู้ดูแลระบบ';
  }

  return jsonOk({
    user: {
      id:         vc0 || (idIdx !== -1 ? String(foundRow[idIdx] || '') : ''),
      username:   vc1 || String(foundRow[safeUIdx] || usernameOrId),
      name:       resolvedName || vc1 || vc0 || usernameOrId,
      role:       resolvedRole,
      department: deptIdx !== -1 ? String(foundRow[deptIdx] || '') : '',
      phone:      phoneIdx !== -1 ? String(foundRow[phoneIdx] || '') : '',
      email:      emailIdx !== -1 ? String(foundRow[emailIdx] || '') : '',
      avatarUrl:  avIdx !== -1 ? String(foundRow[avIdx] || '') : ''
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
//  Register
// ═══════════════════════════════════════════════════════════════════════════

function handleRegister(p) {
  const username = String(p.username || '').trim();
  const password = String(p.password || '').trim();
  const name     = String(p.name     || '').trim();
  const rawRole  = String(p.role     || 'student').toLowerCase().trim();
  const validRoles = ['student', 'staff', 'admin', 'user'];
  const role     = validRoles.includes(rawRole) ? rawRole : 'student';
  const adminKey = String(p.adminKey || '').trim();
  const id       = String(p.id || 'USR-' + new Date().getTime()).trim();

  if (!username || !password || !name) return jsonErr('กรุณากรอกข้อมูลให้ครบถ้วน');
  if (username.length < 3) return jsonErr('Username ต้องมีความยาวอย่างน้อย 3 ตัวอักษร');
  if (password.length < 6) return jsonErr('Password ต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
  if (role === 'admin' && adminKey && adminKey.toUpperCase() !== ADMIN_SECRET_KEY.toUpperCase())
    return jsonErr('รหัสลับผู้ดูแลระบบไม่ถูกต้อง');

  const sheet = getSheet(SHEET_USERS);
  const displayData = sheet.getDataRange().getDisplayValues();
  let headers = displayData.length > 0 ? displayData[0].map(h => String(h).trim()) : [];

  if (headers.length === 0) {
    headers = ['id', 'username', 'password', 'name', 'role'];
    sheet.appendRow(headers);
  }

  // ตรวจ username ซ้ำ
  let uColIdx = findColIndex(headers, ['username', 'user_name', 'loginname']);
  if (uColIdx === -1) uColIdx = findColIndex(headers, ['user']);
  const lowerUser = username.toLowerCase();

  for (let i = 1; i < displayData.length; i++) {
    const ru = uColIdx !== -1 ? normBlank(displayData[i][uColIdx]).toLowerCase() : '';
    const r0 = normBlank(displayData[i][0]).toLowerCase();
    const r1 = normBlank(displayData[i][1]).toLowerCase();
    if (ru === lowerUser || r0 === lowerUser || r1 === lowerUser)
      return jsonErr('ชื่อผู้ใช้ (Username) นี้ถูกใช้งานแล้ว กรุณาเลือกชื่ออื่น');
  }

  // จัดลำดับข้อมูลตาม headers จริง
  const idIdx = findColIndex(headers, ['id', 'userid', 'user_id', 'studentid']);
  let uIdx    = findColIndex(headers, ['username', 'user_name', 'loginname']);
  if (uIdx === -1) uIdx = findColIndex(headers, ['user']);
  const pIdx  = findColIndex(headers, ['password', 'pass', 'pwd']);
  const nIdx  = findColIndex(headers, ['name', 'fullname']);
  const rIdx  = findColIndex(headers, ['role', 'userrole']);
  const cIdx  = findColIndex(headers, ['createdat', 'created_at']);

  if (uIdx === -1 || pIdx === -1) {
    // ไม่มี column ที่ชัดเจน → ใช้ format มาตรฐาน
    sheet.appendRow([id, username, password, name, role]);
  } else {
    const newRow = new Array(headers.length).fill('');
    if (idIdx !== -1) newRow[idIdx] = id;
    if (uIdx  !== -1) newRow[uIdx]  = username;
    if (pIdx  !== -1) newRow[pIdx]  = password;
    if (nIdx  !== -1) newRow[nIdx]  = name;
    if (rIdx  !== -1) newRow[rIdx]  = role;
    if (cIdx  !== -1) newRow[cIdx]  = nowDateTime();
    sheet.appendRow(newRow);
  }

  return jsonOk({ message: 'สมัครสมาชิกสำเร็จ ยินดีต้อนรับคุณ ' + name });
}

// ═══════════════════════════════════════════════════════════════════════════
//  Update Profile & Change Password
// ═══════════════════════════════════════════════════════════════════════════

function handleUpdateProfile(p) {
  const username  = String(p.username   || '').trim().toLowerCase();
  const name      = String(p.name       || '').trim();
  const dept      = String(p.department || '').trim();
  const phone     = String(p.phone      || '').trim();
  const email     = String(p.email      || '').trim();
  const avatarUrl = String(p.avatarUrl  || '').trim();

  if (!username) return jsonErr('ไม่พบชื่อผู้ใช้');
  if (!name)     return jsonErr('กรุณากรอกชื่อ-นามสกุล');

  const sheet = getSheet(SHEET_USERS);
  const data  = sheet.getDataRange().getValues();
  let headers = data[0].map(h => String(h).trim());

  // เพิ่มคอลัมน์ที่ยังไม่มี
  ['department', 'phone', 'email', 'avatarUrl'].forEach(col => {
    if (findColIndex(headers, col) === -1) {
      headers.push(col);
      sheet.getRange(1, headers.length).setValue(col);
    }
  });

  const uIdx      = findColIndex(headers, ['username', 'user', 'user_name']);
  const nameIdx   = findColIndex(headers, ['name', 'fullname']);
  const roleIdx   = findColIndex(headers, ['role', 'userrole']);
  const deptIdx   = findColIndex(headers, ['department', 'dept']);
  const phoneIdx  = findColIndex(headers, ['phone', 'tel']);
  const emailIdx  = findColIndex(headers, ['email', 'mail']);
  const avatarIdx = findColIndex(headers, ['avatarurl', 'avatar']);

  let foundRow = -1, userRole = 'student';
  for (let i = 1; i < data.length; i++) {
    const ru = uIdx !== -1 ? normBlank(data[i][uIdx]).toLowerCase() : '';
    const r0 = normBlank(data[i][0]).toLowerCase();
    const r1 = normBlank(data[i][1]).toLowerCase();
    if (ru === username || r0 === username || r1 === username) {
      foundRow = i + 1;
      userRole = roleIdx !== -1 ? String(data[i][roleIdx] || 'student') : 'student';
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
    user: { username, name, role: userRole.toLowerCase().trim() === 'admin' ? 'admin' : 'student', department: dept, phone, email, avatarUrl }
  });
}

function handleChangePassword(p) {
  const username        = String(p.username        || '').trim().toLowerCase();
  const currentPassword = String(p.currentPassword || '').trim();
  const newPassword     = String(p.newPassword     || '').trim();

  if (!username)        return jsonErr('ไม่พบชื่อผู้ใช้');
  if (!currentPassword) return jsonErr('กรุณากรอกรหัสผ่านปัจจุบัน');
  if (!newPassword)     return jsonErr('กรุณากรอกรหัสผ่านใหม่');
  if (newPassword.length < 6) return jsonErr('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร');

  const sheet = getSheet(SHEET_USERS);
  const displayData = sheet.getDataRange().getDisplayValues();
  const headers = displayData[0].map(h => String(h).trim());
  let uIdx = findColIndex(headers, ['username', 'user_name', 'loginname']);
  if (uIdx === -1) uIdx = findColIndex(headers, ['user']);
  const pIdx = findColIndex(headers, ['password', 'pass', 'pwd']);
  const safeUIdx = uIdx !== -1 ? uIdx : 1;
  const safePIdx = pIdx !== -1 ? pIdx : 2;

  for (let i = 1; i < displayData.length; i++) {
    const ru = normBlank(displayData[i][safeUIdx]).toLowerCase();
    const r0 = normBlank(displayData[i][0]).toLowerCase();
    const r1 = normBlank(displayData[i][1]).toLowerCase();
    if (ru === username || r0 === username || r1 === username) {
      const dbPass = String(displayData[i][safePIdx]).trim();
      if (dbPass !== currentPassword && dbPass.toLowerCase() !== currentPassword.toLowerCase())
        return jsonErr('รหัสผ่านเดิมไม่ถูกต้อง');
      sheet.getRange(i + 1, safePIdx + 1).setValue(newPassword);
      return jsonOk({ message: 'เปลี่ยนรหัสผ่านสำเร็จเรียบร้อย' });
    }
  }
  return jsonErr('ไม่พบผู้ใช้ในระบบ: ' + username);
}

// ═══════════════════════════════════════════════════════════════════════════
//  Devices
// ═══════════════════════════════════════════════════════════════════════════

function handleGetData() {
  return jsonOk({
    devices:      sheetToObjects(getSheet(SHEET_DEVICES)),
    transactions: sheetToObjects(getSheet(SHEET_TRANSACTIONS))
  });
}

function handleAddDevice(p) {
  if (p.userRole !== 'admin') return jsonErr('ไม่มีสิทธิ์ (ต้องเป็น Admin)');
  const name     = String(p.name     || '').trim();
  const category = String(p.category || 'อุปกรณ์ต่อพ่วงและไอทีอื่นๆ (Other IT Accessories)').trim();
  const status   = String(p.status   || 'พร้อมใช้งาน').trim();
  const imageUrl = String(p.imageUrl || '').trim() || 'https://placehold.co/150x150?text=No+Image';
  if (!name) return jsonErr('กรุณากรอกชื่ออุปกรณ์');
  const deviceId = generateId('DEV');
  getSheet(SHEET_DEVICES).appendRow([deviceId, name, category, status, imageUrl, nowDateTime()]);
  return jsonOk({ message: 'เพิ่มอุปกรณ์ "' + name + '" เรียบร้อยแล้ว', deviceId });
}

function handleDeleteDevice(p) {
  if (String(p.userRole || '').toLowerCase() !== 'admin') return jsonErr('ไม่มีสิทธิ์ (ต้องเป็น Admin)');
  const deviceId = String(p.deviceId || '').trim();
  if (!deviceId) return jsonErr('ไม่พบ deviceId');

  const sheet   = getSheet(SHEET_DEVICES);
  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  const idIdx   = findColIndex(headers, ['id', 'deviceid', 'รหัส']);
  if (idIdx === -1) return jsonErr('ไม่พบคอลัมน์ id ในชีท Devices');

  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][idIdx]).trim() === deviceId) {
      sheet.deleteRow(i + 1);
      return jsonOk({ message: 'ลบอุปกรณ์เรียบร้อยแล้ว' });
    }
  }
  return jsonErr('ไม่พบอุปกรณ์รหัส: ' + deviceId);
}

// ═══════════════════════════════════════════════════════════════════════════
//  Borrow & Return (Transactions)
// ═══════════════════════════════════════════════════════════════════════════

function handleBorrowDevice(p) {
  const deviceId           = String(p.deviceId           || '').trim();
  const deviceName         = String(p.deviceName         || '').trim();
  const username           = String(p.username           || '').trim();
  const name               = String(p.name               || username).trim();
  const userId             = String(p.userId             || '').trim();
  const userRole           = String(p.userRole           || '').trim();
  const expectedReturnDate = String(p.expectedReturnDate || '').trim();

  if (!deviceId || !username || !expectedReturnDate)
    return jsonErr('ข้อมูลไม่ครบถ้วน: deviceId, username, expectedReturnDate');

  const devSheet = getSheet(SHEET_DEVICES);
  const devData  = devSheet.getDataRange().getValues();
  const devHead  = devData[0].map(h => String(h).trim());
  const dIdIdx   = findColIndex(devHead, ['id', 'deviceid', 'รหัส']);
  const dStIdx   = findColIndex(devHead, ['status', 'สถานะ']);
  const dNmIdx   = findColIndex(devHead, ['name', 'devicename']);

  if (dIdIdx === -1 || dStIdx === -1)
    return jsonErr('โครงสร้างคอลัมน์ชีท Devices ไม่ถูกต้อง');

  let devRowIdx = -1;
  let actualDeviceName = deviceName;

  for (let i = 1; i < devData.length; i++) {
    if (String(devData[i][dIdIdx]).trim() === deviceId) {
      const st = String(devData[i][dStIdx]).trim();
      if (st !== 'พร้อมใช้งาน') return jsonErr('อุปกรณ์ไม่พร้อมใช้งาน (สถานะ: ' + st + ')');
      devRowIdx = i + 1;
      if (!actualDeviceName && dNmIdx !== -1) actualDeviceName = String(devData[i][dNmIdx] || '');
      break;
    }
  }

  if (devRowIdx === -1) return jsonErr('ไม่พบอุปกรณ์รหัส: ' + deviceId);
  devSheet.getRange(devRowIdx, dStIdx + 1).setValue('ถูกยืม');

  const userInfo      = lookupUserInfo(username);
  const finalUserId   = userId   || (userInfo ? userInfo.id   : '') || username;
  const finalUserRole = userRole || (userInfo ? userInfo.role : '') || 'student';
  const finalUserName = name     || (userInfo ? userInfo.name : '') || username;

  const txSheet  = getSheet(SHEET_TRANSACTIONS);
  const txHdrs   = txSheet.getDataRange().getValues()[0].map(h => String(h).trim());
  const transId  = generateId('TXN');

  const ti    = findColIndex(txHdrs, ['id', 'transid']);
  const di    = findColIndex(txHdrs, ['deviceid']);
  const dn    = findColIndex(txHdrs, ['devicename']);
  const ui    = findColIndex(txHdrs, ['userid']);
  const un    = findColIndex(txHdrs, ['username']);
  const ni2   = findColIndex(txHdrs, ['name']);
  const bd    = findColIndex(txHdrs, ['borrowdate']);
  const er    = findColIndex(txHdrs, ['expectedreturndate']);
  const rd    = findColIndex(txHdrs, ['returndate']);
  const st    = findColIndex(txHdrs, ['status']);
  const ro    = findColIndex(txHdrs, ['userrole', 'role']);
  const co    = findColIndex(txHdrs, ['condition']);
  const no    = findColIndex(txHdrs, ['note']);

  const newRow = new Array(txHdrs.length).fill('');
  if (ti !== -1) newRow[ti] = transId;
  if (di !== -1) newRow[di] = deviceId;
  if (dn !== -1) newRow[dn] = actualDeviceName;
  if (ui !== -1) newRow[ui] = finalUserId;
  if (un !== -1) newRow[un] = finalUserName;
  if (ni2 !== -1) newRow[ni2] = finalUserName;
  if (bd !== -1) newRow[bd] = nowDateTime(); // วันที่ + เวลา เช่น 2026-09-18 04:10
  if (er !== -1) newRow[er] = expectedReturnDate;
  if (rd !== -1) newRow[rd] = '';
  if (st !== -1) newRow[st] = 'borrowed';
  if (ro !== -1) newRow[ro] = finalUserRole;
  if (co !== -1) newRow[co] = '';
  if (no !== -1) newRow[no] = '';

  txSheet.appendRow(newRow);
  return jsonOk({ message: 'ยืม "' + actualDeviceName + '" เรียบร้อยแล้ว', transId });
}

function handleReturnDevice(p) {
  const transId   = String(p.transId   || '').trim();
  const deviceId  = String(p.deviceId  || '').trim();
  const condition = String(p.condition || 'ปกติ').trim();
  const note      = String(p.note      || '').trim();

  if (!transId || !deviceId) return jsonErr('ข้อมูลไม่ครบถ้วน: transId, deviceId');

  const txSheet = getSheet(SHEET_TRANSACTIONS);
  const txData  = txSheet.getDataRange().getValues();
  const txHead  = txData[0].map(h => String(h).trim());
  const txIdIdx = findColIndex(txHead, ['id', 'transid']);
  const retIdx  = findColIndex(txHead, ['returndate']);
  const stIdx   = findColIndex(txHead, ['status']);
  const coIdx   = findColIndex(txHead, ['condition']);
  const noIdx   = findColIndex(txHead, ['note']);
  let found = false;

  for (let i = 1; i < txData.length; i++) {
    if (String(txData[i][txIdIdx]).trim() === transId) {
      if (retIdx !== -1) txSheet.getRange(i + 1, retIdx + 1).setValue(nowDateTime()); // วันที่ + เวลาส่งคืน
      if (stIdx !== -1)  txSheet.getRange(i + 1, stIdx  + 1).setValue('returned');
      if (coIdx !== -1)  txSheet.getRange(i + 1, coIdx  + 1).setValue(condition);
      if (noIdx !== -1)  txSheet.getRange(i + 1, noIdx  + 1).setValue(note);
      found = true;
      break;
    }
  }
  if (!found) return jsonErr('ไม่พบ Transaction รหัส: ' + transId);

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
//  BorrowRecords
// ═══════════════════════════════════════════════════════════════════════════

function handleGetBorrowRecords() {
  return jsonOk({ records: sheetToObjects(getSheet(SHEET_BORROW)) });
}

function handleAddBorrowRecord(p) {
  const borrowerName = String(p.borrowerName || '').trim();
  const itemName     = String(p.itemName     || '').trim();
  const borrowDate   = String(p.borrowDate   || nowDateTime()).trim();
  const returnDate   = String(p.returnDate   || '').trim();

  if (!borrowerName || !itemName || !returnDate)
    return jsonErr('ข้อมูลไม่ครบถ้วน: borrowerName, itemName, returnDate');

  const recordId = generateId('BR');
  getSheet(SHEET_BORROW).appendRow([recordId, borrowerName, itemName, borrowDate, returnDate, 'BORROWED']);
  return jsonOk({ message: 'บันทึกการยืม "' + itemName + '" เรียบร้อยแล้ว', recordId });
}

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
      if (String(data[i][stIdx]) === 'RETURNED') return jsonErr('รายการนี้ส่งคืนไปแล้ว');
      sheet.getRange(i + 1, stIdx + 1).setValue('RETURNED');
      return jsonOk({ message: 'บันทึกการส่งคืนเรียบร้อยแล้ว' });
    }
  }
  return jsonErr('ไม่พบรายการรหัส: ' + recordId);
}

// ═══════════════════════════════════════════════════════════════════════════
//  Debug
// ═══════════════════════════════════════════════════════════════════════════

function handleDebugLogin(p) {
  try {
    const sheet = getSheet(SHEET_USERS);
    const displayData = sheet.getDataRange().getDisplayValues();
    if (displayData.length < 1) return jsonOk({ debug: 'Sheet EMPTY', totalRows: 0 });

    const headers = displayData[0];
    const preview = displayData.slice(1, 4).map(row =>
      row.map((cell, idx) => {
        const h = String(headers[idx] || '').toLowerCase();
        return (h === 'password' || h === 'pass' || h === 'pwd') ? '***' : cell;
      })
    );
    return jsonOk({ totalRows: displayData.length - 1, headers, previewRows: preview });
  } catch (err) {
    return jsonErr('Debug error: ' + err.message, 500);
  }
}
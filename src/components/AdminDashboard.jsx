import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Laptop,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Undo2,
  FileSpreadsheet,
  FileText,
  ImageOff,
  Boxes,
  PackageCheck,
  History,
  Loader2,
  User,
  Sun,
  Moon
} from 'lucide-react';
import { toast } from 'sonner';
import ConfirmModal from './ConfirmModal';
import ProfileModal from './ProfileModal';
import BorrowStatsChart from './BorrowStatsChart';
import { IT_CATEGORIES, DEFAULT_CATEGORY } from '../constants/itCategories';

const DEFAULT_APPS_SCRIPT_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_APPS_SCRIPT_URL) ||
  (typeof process !== 'undefined' && process.env && process.env.REACT_APP_APPS_SCRIPT_URL) ||
  "https://script.google.com/macros/s/AKfycbyd44rKRB_60-hW-4Cmne9bH52L7FYmlz7XkZDhml7qEb9k7ZVjOQal0-ihKUHWx08dbg/exec";
const formatDate = (dateStr) => {
  if (!dateStr || dateStr === '-') return '-';
  const parsedDate = new Date(dateStr);
  return isNaN(parsedDate.getTime()) ? dateStr : parsedDate.toLocaleDateString('th-TH');
};

let sarabunBase64 = null;
const loadSarabunFont = async () => {
  if (sarabunBase64) return sarabunBase64;
  try {
    const res = await fetch('/fonts/Sarabun-Regular.ttf');
    if (!res.ok) throw new Error('Font file not found');
    const buffer = await res.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) { binary += String.fromCharCode(bytes[i]); }
    sarabunBase64 = window.btoa(binary);
    return sarabunBase64;
  } catch (err) {
    console.warn('Cannot load Thai font:', err);
    return null;
  }
};

export default function AdminDashboard({ user, onLogout, apiUrl, onUpdateUser }) {
  const APPS_SCRIPT_URL = apiUrl || DEFAULT_APPS_SCRIPT_URL;
  const currentRole = user?.role || 'admin';

  // Theme State
  const [isDark, setIsDark] = useState(() => localStorage.getItem('app_theme') === 'dark');

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('app_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => setIsDark(prev => !prev);

  const [devices, setDevices] = useState(() => {
    try { const c = localStorage.getItem('app_admin_devices'); return c ? JSON.parse(c) : []; } catch { return []; }
  });
  const [transactions, setTransactions] = useState(() => {
    try { const c = localStorage.getItem('app_admin_transactions'); return c ? JSON.parse(c) : []; } catch { return []; }
  });
  const [loading, setLoading] = useState(() => {
    try { return !localStorage.getItem('app_admin_devices'); } catch { return true; }
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('devices');
  const [newDevice, setNewDevice] = useState({ 
    name: '', 
    category: DEFAULT_CATEGORY, 
    status: 'พร้อมใช้งาน', 
    imageUrl: '' 
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ทั้งหมด');
  const [statusFilter, setStatusFilter] = useState('ทั้งหมด');
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const allAvailableCategories = Array.from(new Set([...IT_CATEGORIES, ...devices.map(d => d.category).filter(Boolean)]));

  const [confirmState, setConfirmState] = useState({
    isOpen: false, title: '', message: '', confirmText: 'ยืนยัน', variant: 'danger', onConfirm: () => {}
  });

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?action=getData&role=${currentRole}`, { redirect: 'follow' });
      const data = await res.json();
      if (data.status === 'success' || data.success) {
        setDevices(data.devices || []);
        setTransactions(data.transactions || []);
        try {
          localStorage.setItem('app_admin_devices', JSON.stringify(data.devices || []));
          localStorage.setItem('app_admin_transactions', JSON.stringify(data.transactions || []));
        } catch { /* ignore */ }
        if (isSilent) toast.success('อัปเดตข้อมูลล่าสุดเรียบร้อยแล้ว');
      } else {
        toast.error(`ข้อผิดพลาดจากเซิร์ฟเวอร์: ${data.message || 'ไม่ทราบสาเหตุ'}`);
      }
    } catch (err) {
      console.error(err);
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [currentRole, APPS_SCRIPT_URL]);

  const hasInitialCache = useRef(devices.length > 0);
  useEffect(() => { fetchData(hasInitialCache.current); }, [fetchData]);

  const postToAppsScript = async (payload) => {
    const fullPayload = { ...payload, userRole: currentRole, username: user?.username || user?.name || 'admin' };
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(fullPayload),
      redirect: 'follow'
    });
    return res.json();
  };

  const handleAddDevice = async (e) => {
    e.preventDefault();
    if (!newDevice.name.trim()) { toast.error('กรุณากรอกชื่ออุปกรณ์'); return; }
    setActionLoading(true);
    try {
      const data = await postToAppsScript({
        action: 'add_device', 
        name: newDevice.name.trim(),
        category: newDevice.category, 
        status: newDevice.status,
        imageUrl: newDevice.imageUrl.trim() || 'https://placehold.co/150x150?text=IT+Device'
      });
      if (data.status === 'success' || data.success) {
        toast.success(`เพิ่มอุปกรณ์ "${newDevice.name}" เข้าสู่ระบบสำเร็จ`);
        setNewDevice({ 
          name: '', 
          category: DEFAULT_CATEGORY, 
          status: 'พร้อมใช้งาน', 
          imageUrl: '' 
        });
        fetchData(true);
      } else { toast.error(data.message || 'เกิดข้อผิดพลาดในการบันทึก'); }
    } catch (err) { console.error(err); toast.error('เกิดข้อผิดพลาดในการส่งข้อมูล'); }
    finally { setActionLoading(false); }
  };

  const promptReturnDevice = (transaction) => {
    setConfirmState({
      isOpen: true, title: 'ยืนยันการรับคืนอุปกรณ์',
      message: `ยืนยันรับคืนอุปกรณ์ "${transaction.deviceName}" จากคุณ ${transaction.username}?`,
      confirmText: 'รับคืนอุปกรณ์', variant: 'primary',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const data = await postToAppsScript({ action: 'returnDevice', transId: transaction.id, deviceId: transaction.deviceId });
          if (data.status === 'success' || data.success) {
            toast.success(`รับคืนอุปกรณ์ "${transaction.deviceName}" สำเร็จแล้ว`);
            setConfirmState(prev => ({ ...prev, isOpen: false }));
            fetchData(true);
          } else { toast.error(data.message || 'เกิดข้อผิดพลาดในการคืนอุปกรณ์'); }
        } catch (err) { console.error(err); toast.error('เกิดข้อผิดพลาดในการส่งข้อมูลคืนอุปกรณ์'); }
        finally { setActionLoading(false); }
      }
    });
  };

  const promptDeleteDevice = (deviceId, deviceName) => {
    setConfirmState({
      isOpen: true, title: 'ยืนยันการลบอุปกรณ์',
      message: `แน่ใจหรือไม่ที่จะลบอุปกรณ์ "${deviceName}" ออกจากระบบอย่างถาวร?`,
      confirmText: 'ลบอุปกรณ์', variant: 'danger',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const data = await postToAppsScript({ action: 'delete_device', deviceId });
          if (data.status === 'success' || data.success) {
            toast.success(`ลบอุปกรณ์ "${deviceName}" เรียบร้อยแล้ว`);
            setConfirmState(prev => ({ ...prev, isOpen: false }));
            fetchData(true);
          } else { toast.error(data.message || 'ไม่สามารถลบอุปกรณ์ได้'); }
        } catch (err) { console.error(err); toast.error('เกิดข้อผิดพลาดในการส่งข้อมูลลบอุปกรณ์'); }
        finally { setActionLoading(false); }
      }
    });
  };

  const resetFilters = () => {
    setSearchTerm('');
    setCategoryFilter('ทั้งหมด');
    setStatusFilter('ทั้งหมด');
    toast.info('ล้างตัวกรองและคำค้นหาเรียบร้อยแล้ว');
  };

  const filteredDevices = devices.filter((d) => {
    const deviceName = d.name ? String(d.name).toLowerCase() : '';
    const deviceId = d.id ? String(d.id).toLowerCase() : '';

    const matchSearch = deviceName.includes(searchTerm.toLowerCase()) || deviceId.includes(searchTerm.toLowerCase());
    const matchCategory = categoryFilter === 'ทั้งหมด' || d.category === categoryFilter;
    const matchStatus = statusFilter === 'ทั้งหมด' || d.status === statusFilter;
    return matchSearch && matchCategory && matchStatus;
  });

  const checkIsOverdue = (t) => {
    if (!t || !t.expectedReturnDate) return false;
    if (['returned', 'คืนแล้ว'].includes(t.status)) return false;
    const expDate = new Date(t.expectedReturnDate);
    if (isNaN(expDate.getTime())) return false;
    const today = new Date(); today.setHours(0, 0, 0, 0); expDate.setHours(0, 0, 0, 0);
    return expDate < today;
  };

  const borrowedTransactions = transactions.filter(t => ['borrowed', 'ถูกยืม', 'กำลังยืม'].includes(t.status));
  const overdueCount = borrowedTransactions.filter(t => checkIsOverdue(t)).length;

  // ─── Export helpers ───────────────────────────────────────────────
  const exportDevicesToExcel = async () => {
    try {
      toast.info('กำลังเตรียมส่งออกไฟล์ Excel...');
      const XLSX = await import('xlsx');
      const formattedData = filteredDevices.map((item) => ({
        "รหัสอุปกรณ์ (ID)": item.id || '-', 
        "ชื่ออุปกรณ์": item.name || '-',
        "หมวดหมู่": item.category || '-', 
        "สถานะ": item.status || '-', 
        "รูปภาพ URL": item.imageUrl || '-'
      }));
      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Devices");
      XLSX.writeFile(workbook, `รายงานอุปกรณ์_IT_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('ส่งออกไฟล์ Excel เรียบร้อยแล้ว');
    } catch (err) { console.error(err); toast.error('เกิดข้อผิดพลาดในการส่งออก Excel'); }
  };

  const exportDevicesToPDF = async () => {
    try {
      toast.info('กำลังประมวลผลเอกสาร PDF...');
      const [{ default: jsPDF }, { default: autoTable }, font] = await Promise.all([import('jspdf'), import('jspdf-autotable'), loadSarabunFont()]);
      const doc = new jsPDF();
      if (font) { doc.addFileToVFS('Sarabun-Regular.ttf', font); doc.addFont('Sarabun-Regular.ttf', 'Sarabun', 'normal'); doc.setFont('Sarabun'); }
      doc.setFontSize(16); doc.text("รายงานทะเบียนอุปกรณ์ IT ทั้งหมด", 14, 15);
      doc.setFontSize(10); doc.text(`ข้อมูล ณ วันที่: ${new Date().toLocaleDateString('th-TH')}`, 14, 22);
      autoTable(doc, {
        styles: { font: font ? 'Sarabun' : 'helvetica', fontSize: 10 },
        headStyles: { fillColor: [79, 70, 229], font: font ? 'Sarabun' : 'helvetica', fontStyle: 'bold' },
        bodyStyles: { font: font ? 'Sarabun' : 'helvetica' },
        head: [["รหัสอุปกรณ์", "ชื่ออุปกรณ์", "หมวดหมู่", "สถานะ"]],
        body: filteredDevices.map((item) => [
          String(item.id || '-'), 
          String(item.name || '-'), 
          String(item.category || '-'), 
          String(item.status || '-')
        ]),
        startY: 28, theme: 'grid'
      });
      doc.save(`รายงานอุปกรณ์_IT_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('ส่งออกไฟล์ PDF เรียบร้อยแล้ว');
    } catch (err) { console.error('PDF Export Error:', err); toast.error('เกิดข้อผิดพลาดในการส่งออก PDF'); }
  };

  const exportTransactionsToExcel = async () => {
    try {
      toast.info('กำลังเตรียมส่งออกไฟล์ Excel...');
      const XLSX = await import('xlsx');
      const formattedData = transactions.map(item => ({
        "รหัสธุรกรรม": item.id || '-', "รหัสอุปกรณ์": item.deviceId || '-',
        "ชื่ออุปกรณ์": item.deviceName || '-', "ผู้ยืม": item.username || '-',
        "วันที่ยืม": formatDate(item.borrowDate), "กำหนดคืน": formatDate(item.expectedReturnDate),
        "วันที่คืนจริง": formatDate(item.returnDate),
        "สถานะ": ['returned', 'คืนแล้ว'].includes(item.status) ? 'คืนแล้ว' : (checkIsOverdue(item) ? 'เกินกำหนดคืน' : 'กำลังยืม')
      }));
      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
      XLSX.writeFile(workbook, `รายงานการยืมคืน_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('ส่งออกไฟล์ Excel ประวัติการยืม-คืนเรียบร้อยแล้ว');
    } catch (err) { console.error(err); toast.error('เกิดข้อผิดพลาดในการส่งออก Excel'); }
  };

  const exportTransactionsToPDF = async () => {
    try {
      toast.info('กำลังประมวลผลเอกสาร PDF...');
      const [{ default: jsPDF }, { default: autoTable }, font] = await Promise.all([import('jspdf'), import('jspdf-autotable'), loadSarabunFont()]);
      const doc = new jsPDF();
      if (font) { doc.addFileToVFS('Sarabun-Regular.ttf', font); doc.addFont('Sarabun-Regular.ttf', 'Sarabun', 'normal'); doc.setFont('Sarabun'); }
      doc.setFontSize(16); doc.text("รายงานประวัติการยืม-คืน อุปกรณ์ IT", 14, 15);
      doc.setFontSize(10); doc.text(`ข้อมูล ณ วันที่: ${new Date().toLocaleDateString('th-TH')}`, 14, 22);
      autoTable(doc, {
        styles: { font: font ? 'Sarabun' : 'helvetica', fontSize: 9 },
        headStyles: { fillColor: [79, 70, 229], font: font ? 'Sarabun' : 'helvetica', fontStyle: 'bold' },
        bodyStyles: { font: font ? 'Sarabun' : 'helvetica' },
        head: [["รหัสธุรกรรม", "ชื่ออุปกรณ์", "ผู้ยืม", "วันที่ยืม", "กำหนดคืน", "สถานะ"]],
        body: transactions.map(item => [
          String(item.id || '-'), String(item.deviceName || '-'), String(item.username || '-'),
          formatDate(item.borrowDate), formatDate(item.expectedReturnDate),
          ['returned', 'คืนแล้ว'].includes(item.status) ? 'คืนแล้ว' : (checkIsOverdue(item) ? 'เกินกำหนดคืน' : 'กำลังยืม')
        ]),
        startY: 28, theme: 'grid'
      });
      doc.save(`รายงานประวัติการยืมคืน_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('ส่งออกไฟล์ PDF ประวัติการยืม-คืนเรียบร้อยแล้ว');
    } catch (err) { console.error('PDF Export Error:', err); toast.error('เกิดข้อผิดพลาดในการส่งออก PDF'); }
  };

  // ─── Tab definitions ─────────────────────────────────────────────
  const tabs = [
    { key: 'devices', label: 'ทะเบียนอุปกรณ์', count: devices.length, icon: Laptop, color: 'text-indigo-600 dark:text-indigo-400', badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' },
    { key: 'borrowed', label: 'อยู่ระหว่างยืม', count: borrowedTransactions.length, icon: Clock, color: 'text-amber-600 dark:text-amber-400', badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
    { key: 'transactions', label: 'ประวัติการยืม-คืน', count: transactions.length, icon: History, color: 'text-slate-600 dark:text-slate-400', badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' }
  ];

  const inputCls = "light-input w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium";

  return (
    <div className={`min-h-screen bg-canvas font-sans selection:bg-indigo-500 selection:text-white pb-24 transition-colors duration-200 ${
      isDark ? 'text-slate-100' : 'text-slate-800'
    }`}>

      {/* ─── Header ───────────────────────────────────────────────── */}
      <header className={`sticky top-0 z-30 backdrop-blur-xl border-b shadow-xs transition-colors ${
        isDark ? 'bg-slate-900/90 border-orange-500/20' : 'bg-white/90 border-orange-200/80'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">

          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl overflow-hidden shrink-0 border p-1 shadow-xs ${
              isDark ? 'bg-slate-800 border-orange-500/30' : 'bg-white border-orange-200'
            }`}>
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight gradient-text">IT Asset Console</h1>
                <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-bold">
                  ผู้ดูแลระบบ (Admin)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">ระบบควบคุมทะเบียนอุปกรณ์ไอทีและเทคโนโลยีสำหรับผู้ดูแล</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-0 pt-3 sm:pt-0 border-orange-100 dark:border-slate-800">

            {loading && (
              <div className="flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:inline">กำลังซิงค์...</span>
              </div>
            )}

            {/* ☀️/🌙 Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`p-2 rounded-xl border transition-all cursor-pointer shadow-xs ${
                isDark
                  ? 'bg-slate-800 border-orange-500/30 text-amber-300 hover:bg-slate-700 hover:border-orange-400'
                  : 'bg-white border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700'
              }`}
              title={isDark ? "สลับเป็นโหมดสว่าง" : "สลับเป็นโหมดมืด"}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Profile */}
            <button
              type="button"
              onClick={() => setIsProfileOpen(true)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer group shadow-xs ${
                isDark
                  ? 'bg-slate-800 border-slate-700 hover:border-amber-500'
                  : 'bg-amber-50/80 hover:bg-amber-100/80 border-amber-200'
              }`}
              title="แก้ไขข้อมูลโปรไฟล์ผู้ดูแล"
            >
              <div className="w-7 h-7 rounded-full overflow-hidden border border-amber-300 dark:border-amber-700 shrink-0 flex items-center justify-center bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-300">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Admin" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4" />
                )}
              </div>
              <div className="text-xs text-left hidden sm:block">
                <div className={`font-bold transition-colors group-hover:text-amber-600 dark:group-hover:text-amber-400 ${
                  isDark ? 'text-slate-100' : 'text-slate-900'
                }`}>
                  {user?.name || user?.username || 'ผู้ดูแลระบบ'}
                </div>
                <div className="text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider">Administrator</div>
              </div>
            </button>

            {/* Logout */}
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900 shadow-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ออกจากระบบ</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">

        {/* ─── Stat Cards ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'อุปกรณ์ทั้งหมด', value: devices.length, sub: 'ลงทะเบียนในคลัง', icon: Boxes, bg: 'bg-indigo-50 dark:bg-indigo-950/50', border: 'border-indigo-100 dark:border-indigo-800', color: 'text-indigo-600 dark:text-indigo-400' },
            { label: 'พร้อมใช้งาน', value: devices.filter(d => d.status === 'พร้อมใช้งาน').length, sub: 'ยืมได้ทันที', icon: PackageCheck, bg: 'bg-emerald-50 dark:bg-emerald-950/50', border: 'border-emerald-100 dark:border-emerald-800', color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'กำลังถูกยืม', value: borrowedTransactions.length, sub: 'อยู่ระหว่างใช้งาน', icon: Clock, bg: 'bg-amber-50 dark:bg-amber-950/50', border: 'border-amber-100 dark:border-amber-800', color: 'text-amber-600 dark:text-amber-400' },
            { label: 'เกินกำหนดคืน', value: overdueCount, sub: 'ต้องติดตามเร่งด่วน', icon: AlertTriangle, bg: 'bg-rose-50 dark:bg-rose-950/50', border: 'border-rose-100 dark:border-rose-800', color: 'text-rose-600 dark:text-rose-400' }
          ].map((card, i) => {
            const Icon = card.icon;
            return (
              <div
                key={i}
                className={`rounded-2xl p-5 border shadow-sm hover:shadow-md transition-all animate-fade-up ${
                  isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200/90'
                }`}
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                <div className="flex items-start justify-between">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{card.label}</span>
                  <div className={`p-2 rounded-xl ${card.bg} border ${card.border}`}>
                    <Icon className={`w-4 h-4 ${card.color}`} />
                  </div>
                </div>
                <p className={`text-3xl font-black mt-2 tracking-tight ${card.color}`}>{card.value}</p>
                <span className="text-[11px] text-slate-400 mt-0.5 block">{card.sub}</span>
              </div>
            );
          })}
        </div>

        {/* ─── 📊 RECHARTS DASHBOARD ANALYTICS CHART ────────────────── */}
        <BorrowStatsChart transactions={transactions} devices={devices} isDark={isDark} />

        {/* ─── Tabs (Segmented Switcher) ───────────────────────────── */}
        <div className={`flex gap-2 p-1.5 rounded-2xl border overflow-x-auto ${
          isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-100/90 border-slate-200'
        }`}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : tab.color}`} />
                <span>{tab.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-white/20 text-white' : tab.badgeColor
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ─── TAB 1: DEVICES ──────────────────────────────────────── */}
        {activeTab === 'devices' && (
          <div className="space-y-6 animate-fade-up">

            {/* Add Device Form Card */}
            <div className={`rounded-3xl p-6 border shadow-sm ${
              isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200/90'
            }`}>
              <div className="flex items-center justify-between mb-5">
                <h2 className={`text-base font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <div className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800">
                    <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  เพิ่มอุปกรณ์ใหม่เข้าสู่คลัง
                </h2>
                <span className="text-xs text-slate-500">บันทึกเข้า Google Sheets อัตโนมัติ</span>
              </div>

              <form onSubmit={handleAddDevice} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5">
                <div className="lg:col-span-3">
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5">ชื่ออุปกรณ์</label>
                  <input
                    type="text"
                    placeholder="เช่น DJI Mini 4 Pro, Meta Quest 3"
                    value={newDevice.name}
                    onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                    className={inputCls}
                    required
                  />
                </div>

                <div className="lg:col-span-3">
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5">หมวดหมู่</label>
                  <select
                    value={newDevice.category}
                    onChange={(e) => setNewDevice({ ...newDevice, category: e.target.value })}
                    className={`${inputCls} cursor-pointer appearance-none`}
                  >
                    {IT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>

                <div className="lg:col-span-3">
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5">สถานะเริ่มต้น</label>
                  <select
                    value={newDevice.status}
                    onChange={(e) => setNewDevice({ ...newDevice, status: e.target.value })}
                    className={`${inputCls} cursor-pointer appearance-none`}
                  >
                    <option value="พร้อมใช้งาน">พร้อมใช้งาน</option>
                    <option value="ส่งซ่อม/ชำรุด">ส่งซ่อม/ชำรุด</option>
                  </select>
                </div>

                <div className="lg:col-span-3">
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5">URL รูปภาพ</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={newDevice.imageUrl}
                    onChange={(e) => setNewDevice({ ...newDevice, imageUrl: e.target.value })}
                    className={inputCls}
                  />
                </div>

                <div className="lg:col-span-12 flex justify-end">
                  <button
                    type="submit"
                    disabled={actionLoading || loading}
                    className="px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 btn-gradient-primary shadow-indigo-500/20"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    <span>บันทึกอุปกรณ์ใหม่</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Devices Table Card */}
            <div className={`rounded-3xl p-6 border shadow-sm ${
              isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200/90'
            }`}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                <h2 className={`text-base sm:text-lg font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <Boxes className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  ทะเบียนอุปกรณ์ทั้งหมด
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                    {filteredDevices.length} ชิ้น
                  </span>
                </h2>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={exportDevicesToExcel}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 shadow-xs"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" /><span>Excel</span>
                  </button>
                  <button
                    onClick={exportDevicesToPDF}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 border border-rose-200 dark:border-rose-800 shadow-xs"
                  >
                    <FileText className="w-3.5 h-3.5" /><span>PDF</span>
                  </button>
                  <button
                    onClick={() => fetchData(true)}
                    disabled={loading}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 shadow-xs disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
                    <span>รีเฟรช</span>
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อหรือรหัส..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="light-input w-full pl-9 pr-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium"
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="light-input w-full pl-9 pr-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium cursor-pointer appearance-none"
                  >
                    <option value="ทั้งหมด">หมวดหมู่ทั้งหมด</option>
                    {allAvailableCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="light-input w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium cursor-pointer appearance-none"
                >
                  <option value="ทั้งหมด">สถานะทั้งหมด</option>
                  <option value="พร้อมใช้งาน">พร้อมใช้งาน</option>
                  <option value="ถูกยืม">ถูกยืม</option>
                  <option value="ชำรุด">ส่งซ่อม/ชำรุด</option>
                </select>
              </div>

              {/* Table */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full text-xs sm:text-sm light-table">
                  <thead>
                    <tr>
                      {['รูปภาพ','รหัส (ID)','ชื่ออุปกรณ์','หมวดหมู่','สถานะ','การจัดการ'].map((h, i) => (
                        <th key={i} className={`p-3.5 text-left text-[11px] font-bold uppercase tracking-wider ${i === 5 ? 'text-right' : ''}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading && filteredDevices.length === 0 ? (
                      [...Array(4)].map((_, i) => (
                        <tr key={i}>
                          <td colSpan="6" className="p-4">
                            <div className="h-10 skeleton w-full" />
                          </td>
                        </tr>
                      ))
                    ) : filteredDevices.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-12">
                          <div className="flex flex-col items-center gap-2">
                            <Boxes className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">ไม่พบข้อมูลอุปกรณ์ที่ตรงกับเงื่อนไข</p>
                            <button
                              type="button"
                              onClick={resetFilters}
                              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                            >
                              ล้างตัวกรองและคำค้นหา
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredDevices.map((d) => {
                        return (
                          <tr key={d.id}>
                            <td className="p-3.5">
                              <div className="w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                                {d.imageUrl ? (
                                  <img
                                    src={d.imageUrl}
                                    alt={d.name}
                                    className="w-full h-full object-contain p-1"
                                    onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/50x50?text=IT"; }}
                                  />
                                ) : (<ImageOff className="w-4 h-4 text-slate-400" />)}
                              </div>
                            </td>
                            <td className="p-3.5 font-mono text-xs text-slate-500 dark:text-slate-400 font-semibold">{d.id}</td>
                            <td className="p-3.5 font-bold">{d.name}</td>
                            <td className="p-3.5">
                              <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                                {d.category}
                              </span>
                            </td>
                            <td className="p-3.5">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                                d.status === 'พร้อมใช้งาน' ? 'status-available' :
                                d.status === 'ถูกยืม' ? 'status-borrowed' : 'status-broken'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  d.status === 'พร้อมใช้งาน' ? 'bg-emerald-500' :
                                  d.status === 'ถูกยืม' ? 'bg-amber-500' : 'bg-rose-500'
                                }`} />
                                {d.status}
                              </span>
                            </td>
                            <td className="p-3.5 text-right">
                              <button
                                type="button"
                                onClick={() => promptDeleteDevice(d.id, d.name)}
                                disabled={actionLoading}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200 dark:border-rose-800 shadow-xs"
                              >
                                <Trash2 className="w-3.5 h-3.5" /><span>ลบ</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: BORROWED ─────────────────────────────────────── */}
        {activeTab === 'borrowed' && (
          <div className={`rounded-3xl p-6 border shadow-sm animate-fade-up ${
            isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200/90'
          }`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
              <h2 className={`text-base sm:text-lg font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                รายการอุปกรณ์ที่อยู่ระหว่างการยืม
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold">
                  {borrowedTransactions.length} รายการ
                </span>
              </h2>
              <button
                onClick={() => fetchData(true)}
                disabled={loading}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-600' : ''}`} />
                <span>รีเฟรช</span>
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <table className="w-full text-xs sm:text-sm light-table">
                <thead>
                  <tr>
                    {['ชื่ออุปกรณ์','ผู้ยืม','วันที่ยืม','กำหนดคืน','สถานะ','การจัดการ'].map((h, i) => (
                      <th key={i} className={`p-3.5 text-left text-[11px] font-bold uppercase tracking-wider ${i === 5 ? 'text-right' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {borrowedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-12">
                        <div className="flex flex-col items-center gap-2">
                          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">ไม่มีรายการอุปกรณ์ที่ค้างยืมในขณะนี้</p>
                          <span className="text-xs text-slate-500">อุปกรณ์ทั้งหมดถูกส่งคืนครบถ้วนสมบูรณ์</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    borrowedTransactions.map(t => {
                      const isOverdue = checkIsOverdue(t);
                      return (
                        <tr key={t.id} className={isOverdue ? "bg-rose-50/40 dark:bg-rose-950/30" : ""}>
                          <td className="p-3.5 font-bold">{t.deviceName}</td>
                          <td className="p-3.5 font-medium">{t.username}</td>
                          <td className="p-3.5 text-slate-500 font-mono text-xs">{formatDate(t.borrowDate)}</td>
                          <td className="p-3.5 font-mono text-xs">
                            <span className={isOverdue ? 'text-rose-600 font-bold' : 'text-slate-700 dark:text-slate-300'}>{formatDate(t.expectedReturnDate)}</span>
                          </td>
                          <td className="p-3.5">
                            {isOverdue ? (
                              <span className="status-overdue inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold">
                                <AlertTriangle className="w-3.5 h-3.5" />เกินกำหนดคืน
                              </span>
                            ) : (
                              <span className="status-borrowed inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold">
                                <Clock className="w-3.5 h-3.5" />กำลังยืม
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => promptReturnDevice(t)}
                              disabled={actionLoading}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 btn-gradient-emerald shadow-emerald-500/20"
                            >
                              <Undo2 className="w-3.5 h-3.5" /><span>รับคืนอุปกรณ์</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB 3: TRANSACTIONS ─────────────────────────────────── */}
        {activeTab === 'transactions' && (
          <div className={`rounded-3xl p-6 border shadow-sm animate-fade-up ${
            isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200/90'
          }`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
              <h2 className={`text-base sm:text-lg font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <History className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                ประวัติการยืม-คืน ทั้งหมด
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-bold">
                  {transactions.length} รายการ
                </span>
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={exportTransactionsToExcel}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 shadow-xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /><span>Excel</span>
                </button>
                <button
                  onClick={exportTransactionsToPDF}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 border border-rose-200 dark:border-rose-800 shadow-xs"
                >
                  <FileText className="w-3.5 h-3.5" /><span>PDF</span>
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <table className="w-full text-xs sm:text-sm light-table">
                <thead>
                  <tr>
                    {['ชื่ออุปกรณ์','ผู้ยืม','วันที่ยืม','กำหนดคืน','สถานะ'].map((h, i) => (
                      <th key={i} className="p-3.5 text-left text-[11px] font-bold uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-12">
                        <div className="flex flex-col items-center gap-2">
                          <History className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">ยังไม่พบประวัติการทำรายการยืม-คืน</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    transactions.map(t => {
                      const isOverdue = checkIsOverdue(t);
                      const isReturned = ['returned', 'คืนแล้ว'].includes(t.status);
                      return (
                        <tr key={t.id}>
                          <td className="p-3.5 font-bold">{t.deviceName}</td>
                          <td className="p-3.5 font-medium">{t.username}</td>
                          <td className="p-3.5 text-slate-500 font-mono text-xs">{formatDate(t.borrowDate)}</td>
                          <td className="p-3.5 text-slate-500 font-mono text-xs">{formatDate(t.expectedReturnDate)}</td>
                          <td className="p-3.5">
                            {isReturned ? (
                              <span className="status-available inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5" />คืนแล้ว
                              </span>
                            ) : isOverdue ? (
                              <span className="status-overdue inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-bold">
                                <AlertTriangle className="w-3.5 h-3.5" />เกินกำหนดคืน
                              </span>
                            ) : (
                              <span className="status-borrowed inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-bold">
                                <Clock className="w-3.5 h-3.5" />กำลังยืม
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="pt-4 pb-2 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-xl overflow-hidden border p-1 ${
              isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
            }`}>
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold">IT Asset Console — ผู้ดูแลระบบ</span>
          </div>
          <span className="text-[11px]">© 2026 IT Equipment Management System</span>
        </footer>
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        variant={confirmState.variant}
        loading={actionLoading}
        onConfirm={confirmState.onConfirm}
        onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
        onUpdateUser={onUpdateUser}
        apiUrl={APPS_SCRIPT_URL}
      />
    </div>
  );
}
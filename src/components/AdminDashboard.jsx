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
  ShieldAlert,
  User,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import ConfirmModal from './ConfirmModal';
import ProfileModal from './ProfileModal';
import { IT_CATEGORIES, DEFAULT_CATEGORY } from '../constants/itCategories';

const DEFAULT_APPS_SCRIPT_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_APPS_SCRIPT_URL) ||
  (typeof process !== 'undefined' && process.env && process.env.REACT_APP_APPS_SCRIPT_URL) ||
  "https://script.google.com/macros/s/AKfycbxG9jHtv4457GsbJ0w0xG4_ILq09s_fzMYGB5diMracMOq_abJsW27n2CvXCdVVPngpXw/exec";

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
  const [newDevice, setNewDevice] = useState({ name: '', category: DEFAULT_CATEGORY, status: 'พร้อมใช้งาน', imageUrl: '' });
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
        action: 'add_device', name: newDevice.name.trim(),
        category: newDevice.category, status: newDevice.status,
        imageUrl: newDevice.imageUrl.trim() || 'https://via.placeholder.com/150?text=No+Image'
      });
      if (data.status === 'success' || data.success) {
        toast.success(`เพิ่มอุปกรณ์ "${newDevice.name}" เข้าสู่ระบบสำเร็จ`);
        setNewDevice({ name: '', category: DEFAULT_CATEGORY, status: 'พร้อมใช้งาน', imageUrl: '' });
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

  const filteredDevices = devices.filter(d => {
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
      const formattedData = filteredDevices.map(item => ({
        "รหัสอุปกรณ์ (ID)": item.id || '-', "ชื่ออุปกรณ์": item.name || '-',
        "หมวดหมู่": item.category || '-', "สถานะ": item.status || '-', "รูปภาพ URL": item.imageUrl || '-'
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
        headStyles: { fillColor: [15, 23, 42], font: font ? 'Sarabun' : 'helvetica', fontStyle: 'bold' },
        bodyStyles: { font: font ? 'Sarabun' : 'helvetica' },
        head: [["รหัสอุปกรณ์", "ชื่ออุปกรณ์", "หมวดหมู่", "สถานะ"]],
        body: filteredDevices.map(item => [String(item.id || '-'), String(item.name || '-'), String(item.category || '-'), String(item.status || '-')]),
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
        headStyles: { fillColor: [15, 23, 42], font: font ? 'Sarabun' : 'helvetica', fontStyle: 'bold' },
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
    { key: 'devices', label: 'ทะเบียนอุปกรณ์', count: devices.length, icon: Laptop, color: 'text-indigo-400' },
    { key: 'borrowed', label: 'อยู่ระหว่างยืม', count: borrowedTransactions.length, icon: Clock, color: 'text-amber-400' },
    { key: 'transactions', label: 'ประวัติการยืม-คืน', count: transactions.length, icon: History, color: 'text-slate-400' }
  ];

  // ─── Shared input class ──────────────────────────────────────────
  const inputCls = "dark-input w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium";

  return (
    <div className="min-h-screen bg-animated text-slate-200 font-sans selection:bg-indigo-500 selection:text-white">

      {/* Ambient background orbs */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-5%] right-[-5%] w-[500px] h-[500px] rounded-full opacity-8 animate-orb-1"
          style={{ background: 'radial-gradient(circle, #4f46e5 0%, transparent 70%)' }} />
        <div className="absolute bottom-[5%] left-[-5%] w-[400px] h-[400px] rounded-full opacity-6 animate-orb-2"
          style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)' }} />
      </div>

      {/* ─── Header ───────────────────────────────────────────────── */}
      <header className="relative z-20 sticky top-0"
        style={{ background: 'rgba(11, 15, 25, 0.90)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(99,102,241,0.18)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">

          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-indigo-500/30 shadow-lg shadow-indigo-500/20">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover object-top" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight gradient-text">IT Asset Console</h1>
              <p className="text-[11px] text-slate-500">ระบบจัดการอุปกรณ์ไอทีสำหรับผู้ดูแลระบบ</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-0 pt-3 sm:pt-0"
            style={{ borderColor: 'rgba(255,255,255,0.05)' }}>

            {loading && (
              <div className="flex items-center gap-2 text-xs text-indigo-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:inline">กำลังโหลด...</span>
              </div>
            )}

            {/* Profile */}
            <button type="button" onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 cursor-pointer group"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <div className="w-7 h-7 rounded-full overflow-hidden border-2 border-amber-500/40 shrink-0 flex items-center justify-center bg-amber-900/30">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Admin" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-amber-300" />
                )}
              </div>
              <div className="text-xs text-left hidden sm:block">
                <div className="font-bold text-slate-200 group-hover:text-amber-300 transition-colors">
                  {user?.name || user?.username || 'ผู้ดูแลระบบ'}
                </div>
                <div className="text-amber-600 text-[10px] font-bold uppercase tracking-wider">Administrator</div>
              </div>
              <span className="hidden sm:inline text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider"
                style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' }}>
                Admin
              </span>
            </button>

            <button type="button" onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-slate-400 hover:text-rose-300"
              style={{ background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.15)' }}>
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ออกจากระบบ</span>
            </button>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">

        {/* ─── Stat Cards ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[
            { label: 'อุปกรณ์ทั้งหมด', value: devices.length, sub: 'ลงทะเบียนในคลัง', icon: Boxes, bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.2)', color: 'text-indigo-400', glow: 'animate-glow' },
            { label: 'พร้อมใช้งาน', value: devices.filter(d => d.status === 'พร้อมใช้งาน').length, sub: 'ยืมได้ทันที', icon: PackageCheck, bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', color: 'text-emerald-400', glow: 'animate-glow-emerald' },
            { label: 'กำลังถูกยืม', value: borrowedTransactions.length, sub: 'อยู่ระหว่างใช้งาน', icon: Clock, bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', color: 'text-amber-400', glow: 'animate-glow-amber' },
            { label: 'เกินกำหนดคืน', value: overdueCount, sub: 'ต้องติดตาม', icon: AlertTriangle, bg: 'rgba(244,63,94,0.1)', border: 'rgba(244,63,94,0.2)', color: 'text-rose-400', glow: overdueCount > 0 ? 'animate-glow-rose' : '' }
          ].map((card, i) => {
            const Icon = card.icon;
            return (
              <div key={i} className="glass-card rounded-2xl p-5 animate-fade-up"
                style={{ animationDelay: `${i * 0.08}s`, borderColor: card.border }}>
                <div className="flex items-start justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{card.label}</span>
                  <div className={`p-2 rounded-xl ${card.glow}`} style={{ background: card.bg, border: `1px solid ${card.border}` }}>
                    <Icon className={`w-4 h-4 ${card.color}`} />
                  </div>
                </div>
                <p className={`text-3xl font-black mt-2 tracking-tight ${card.color}`}>{card.value}</p>
                <span className="text-[11px] text-slate-600 mt-1 block">{card.sub}</span>
              </div>
            );
          })}
        </div>

        {/* ─── Tabs ────────────────────────────────────────────────── */}
        <div className="flex gap-1.5 p-1.5 rounded-2xl overflow-x-auto animate-fade-up"
          style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  isActive ? 'text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                }`}
                style={isActive
                  ? { background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.2))', border: '1px solid rgba(99,102,241,0.3)' }
                  : {}}>
                <Icon className={`w-4 h-4 ${isActive ? tab.color : 'text-slate-600'}`} />
                <span>{tab.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive ? 'text-slate-200' : 'text-slate-600'
                }`} style={isActive ? { background: 'rgba(255,255,255,0.1)' } : { background: 'rgba(255,255,255,0.04)' }}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ─── TAB 1: DEVICES ──────────────────────────────────────── */}
        {activeTab === 'devices' && (
          <div className="space-y-5 animate-fade-up">

            {/* Add Device Form */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2.5">
                  <div className="p-1.5 rounded-xl" style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}>
                    <Plus className="w-4 h-4 text-indigo-400" />
                  </div>
                  เพิ่มอุปกรณ์ใหม่เข้าสู่ระบบ
                </h2>
                <span className="text-[11px] text-slate-600">บันทึกเข้า Google Sheets อัตโนมัติ</span>
              </div>

              <form onSubmit={handleAddDevice} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5">
                <div className="lg:col-span-4">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">ชื่ออุปกรณ์</label>
                  <input type="text" placeholder="เช่น MacBook Pro 14, iPad Air 5" value={newDevice.name}
                    onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })} className={inputCls} required />
                </div>
                <div className="lg:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">หมวดหมู่</label>
                  <select value={newDevice.category} onChange={(e) => setNewDevice({ ...newDevice, category: e.target.value })}
                    className={`${inputCls} cursor-pointer appearance-none`}>
                    {IT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">สถานะแรกเริ่ม</label>
                  <select value={newDevice.status} onChange={(e) => setNewDevice({ ...newDevice, status: e.target.value })}
                    className={`${inputCls} cursor-pointer appearance-none`}>
                    <option value="พร้อมใช้งาน">พร้อมใช้งาน</option>
                    <option value="ชำรุด">ชำรุด</option>
                  </select>
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">URL รูปภาพ</label>
                  <input type="url" placeholder="https://..." value={newDevice.imageUrl}
                    onChange={(e) => setNewDevice({ ...newDevice, imageUrl: e.target.value })} className={inputCls} />
                </div>
                <div className="lg:col-span-1 flex items-end">
                  <button type="submit" disabled={actionLoading || loading}
                    className="w-full h-[42px] rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 btn-gradient-primary">
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    <span>เพิ่ม</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Devices Table */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2.5">
                  <Boxes className="w-5 h-5 text-indigo-400" />
                  ทะเบียนอุปกรณ์ทั้งหมด
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-normal text-slate-400"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {filteredDevices.length} ชิ้น
                  </span>
                </h2>
                <div className="flex flex-wrap gap-2">
                  <button onClick={exportDevicesToExcel}
                    className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer text-emerald-400 hover:text-emerald-200"
                    style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <FileSpreadsheet className="w-3.5 h-3.5" /><span>Excel</span>
                  </button>
                  <button onClick={exportDevicesToPDF}
                    className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer text-rose-400 hover:text-rose-200"
                    style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)' }}>
                    <FileText className="w-3.5 h-3.5" /><span>PDF</span>
                  </button>
                  <button onClick={() => fetchData(true)} disabled={loading}
                    className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer text-slate-400 hover:text-slate-200 disabled:opacity-50"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
                    <span>รีเฟรช</span>
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input type="text" placeholder="ค้นหาชื่อหรือรหัสอุปกรณ์..." value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)} className={`dark-input w-full pl-9 pr-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium`} />
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
                    className="dark-input w-full pl-9 pr-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium cursor-pointer appearance-none">
                    <option value="ทั้งหมด">หมวดหมู่ทั้งหมด</option>
                    {allAvailableCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                  className="dark-input w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium cursor-pointer appearance-none">
                  <option value="ทั้งหมด">สถานะทั้งหมด</option>
                  <option value="พร้อมใช้งาน">พร้อมใช้งาน</option>
                  <option value="ถูกยืม">ถูกยืม</option>
                  <option value="ชำรุด">ชำรุด</option>
                </select>
              </div>

              {/* Table */}
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                <table className="w-full text-xs sm:text-sm dark-table">
                  <thead>
                    <tr>
                      {['รูปภาพ','รหัส (ID)','ชื่ออุปกรณ์','หมวดหมู่','สถานะ','การจัดการ'].map((h, i) => (
                        <th key={i} className={`p-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest ${i === 5 ? 'text-right' : ''}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading && filteredDevices.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-12">
                          <div className="flex flex-col items-center gap-2 text-slate-600">
                            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                            <span className="text-xs font-medium">กำลังโหลดข้อมูลอุปกรณ์...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredDevices.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-12">
                          <div className="flex flex-col items-center gap-2">
                            <Boxes className="w-8 h-8 text-slate-700" />
                            <p className="text-sm font-semibold text-slate-500">ไม่พบข้อมูลอุปกรณ์ที่ตรงกับเงื่อนไข</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredDevices.map(d => (
                        <tr key={d.id}>
                          <td className="p-4">
                            <div className="w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center"
                              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                              {d.imageUrl ? (
                                <img src={d.imageUrl} alt={d.name} className="w-full h-full object-cover"
                                  onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/50?text=IT"; }} />
                              ) : (<ImageOff className="w-4 h-4 text-slate-600" />)}
                            </div>
                          </td>
                          <td className="p-4 font-mono text-xs text-slate-600 font-semibold">{d.id}</td>
                          <td className="p-4 font-bold text-slate-200">{d.name}</td>
                          <td className="p-4">
                            <span className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-400"
                              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                              {d.category}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                              d.status === 'พร้อมใช้งาน' ? 'status-available' :
                              d.status === 'ถูกยืม' ? 'status-borrowed' : 'status-broken'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                d.status === 'พร้อมใช้งาน' ? 'bg-emerald-400' :
                                d.status === 'ถูกยืม' ? 'bg-amber-400' : 'bg-rose-400'
                              }`} />
                              {d.status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button type="button" onClick={() => promptDeleteDevice(d.id, d.name)} disabled={actionLoading}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 text-rose-400 hover:text-rose-200"
                              style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)' }}>
                              <Trash2 className="w-3.5 h-3.5" /><span>ลบ</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: BORROWED ─────────────────────────────────────── */}
        {activeTab === 'borrowed' && (
          <div className="glass-card rounded-2xl p-6 animate-fade-up">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
              <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-amber-400" />
                รายการอุปกรณ์ที่อยู่ระหว่างการยืม
                <span className="text-xs px-2.5 py-0.5 rounded-full text-slate-400 font-normal"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {borrowedTransactions.length} รายการ
                </span>
              </h2>
              <button onClick={() => fetchData(true)} disabled={loading}
                className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer text-slate-400 hover:text-slate-200 disabled:opacity-50"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
                <span>รีเฟรช</span>
              </button>
            </div>

            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              <table className="w-full text-xs sm:text-sm dark-table">
                <thead>
                  <tr>
                    {['ชื่ออุปกรณ์','ผู้ยืม','วันที่ยืม','กำหนดคืน','สถานะ','การจัดการ'].map((h, i) => (
                      <th key={i} className={`p-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest ${i === 5 ? 'text-right' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {borrowedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-12">
                        <div className="flex flex-col items-center gap-2">
                          <CheckCircle2 className="w-8 h-8 text-emerald-500/40" />
                          <p className="text-sm font-semibold text-slate-500">ไม่มีรายการอุปกรณ์ที่ค้างยืมในขณะนี้</p>
                          <span className="text-xs text-slate-600">อุปกรณ์ทั้งหมดถูกส่งคืนครบถ้วน</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    borrowedTransactions.map(t => {
                      const isOverdue = checkIsOverdue(t);
                      return (
                        <tr key={t.id} style={isOverdue ? { background: 'rgba(244,63,94,0.04)' } : {}}>
                          <td className="p-4 font-bold text-slate-200">{t.deviceName}</td>
                          <td className="p-4 text-slate-400 font-medium">{t.username}</td>
                          <td className="p-4 text-slate-600 font-mono text-xs">{formatDate(t.borrowDate)}</td>
                          <td className="p-4 font-mono text-xs">
                            <span className={isOverdue ? 'text-rose-400 font-bold' : 'text-slate-400'}>{formatDate(t.expectedReturnDate)}</span>
                          </td>
                          <td className="p-4">
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
                          <td className="p-4 text-right">
                            <button type="button" onClick={() => promptReturnDevice(t)} disabled={actionLoading}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 btn-gradient-emerald">
                              <Undo2 className="w-3.5 h-3.5" /><span>บันทึกรับคืน</span>
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
          <div className="glass-card rounded-2xl p-6 animate-fade-up">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
              <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2.5">
                <History className="w-5 h-5 text-indigo-400" />
                ประวัติการยืม-คืน ทั้งหมด
                <span className="text-xs px-2.5 py-0.5 rounded-full text-slate-400 font-normal"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {transactions.length} รายการ
                </span>
              </h2>
              <div className="flex gap-2">
                <button onClick={exportTransactionsToExcel}
                  className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer text-emerald-400 hover:text-emerald-200"
                  style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <FileSpreadsheet className="w-3.5 h-3.5" /><span>Excel</span>
                </button>
                <button onClick={exportTransactionsToPDF}
                  className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer text-rose-400 hover:text-rose-200"
                  style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)' }}>
                  <FileText className="w-3.5 h-3.5" /><span>PDF</span>
                </button>
              </div>
            </div>

            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              <table className="w-full text-xs sm:text-sm dark-table">
                <thead>
                  <tr>
                    {['ชื่ออุปกรณ์','ผู้ยืม','วันที่ยืม','กำหนดคืน','สถานะ'].map((h, i) => (
                      <th key={i} className="p-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-12">
                        <div className="flex flex-col items-center gap-2">
                          <History className="w-8 h-8 text-slate-700" />
                          <p className="text-sm font-semibold text-slate-500">ยังไม่พบประวัติการทำรายการยืม-คืน</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    transactions.map(t => {
                      const isOverdue = checkIsOverdue(t);
                      const isReturned = ['returned', 'คืนแล้ว'].includes(t.status);
                      return (
                        <tr key={t.id}>
                          <td className="p-4 font-bold text-slate-200">{t.deviceName}</td>
                          <td className="p-4 text-slate-400 font-medium">{t.username}</td>
                          <td className="p-4 text-slate-600 font-mono text-xs">{formatDate(t.borrowDate)}</td>
                          <td className="p-4 text-slate-600 font-mono text-xs">{formatDate(t.expectedReturnDate)}</td>
                          <td className="p-4">
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
        <footer className="pt-4 pb-2 flex items-center justify-between gap-4 text-xs text-slate-600"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl overflow-hidden border border-indigo-500/20">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover object-top" />
            </div>
            <span className="gradient-text-gold font-bold text-sm">IT Asset Console — Administrator</span>
          </div>
          <span className="text-[11px]">© 2026 IT Asset System</span>
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
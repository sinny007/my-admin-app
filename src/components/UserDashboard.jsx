import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Laptop,
  LogOut,
  Search,
  Filter,
  Clock,
  History,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Loader2,
  PackageCheck,
  X,
  FileText,
  Boxes,
  ImageOff,
  User,
  Zap,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import ProfileModal from './ProfileModal';

const DEFAULT_API_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_APPS_SCRIPT_URL) ||
  (typeof process !== 'undefined' && process.env && process.env.REACT_APP_APPS_SCRIPT_URL) ||
  "https://script.google.com/macros/s/AKfycbxG9jHtv4457GsbJ0w0xG4_ILq09s_fzMYGB5diMracMOq_abJsW27n2CvXCdVVPngpXw/exec";

const formatDisplayDate = (dateStr) => {
  if (!dateStr || dateStr === '-') return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('th-TH', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
};

export default function UserDashboard({ user, onLogout, apiUrl, onUpdateUser }) {
  const API_URL = apiUrl || DEFAULT_API_URL;

  const [devices, setDevices] = useState(() => {
    try {
      const cached = localStorage.getItem('app_user_devices');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });

  const [transactions, setTransactions] = useState(() => {
    try {
      const cached = localStorage.getItem('app_user_transactions');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });

  const [loading, setLoading] = useState(() => {
    try { return !localStorage.getItem('app_user_devices'); }
    catch { return true; }
  });

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [selectedTransToReturn, setSelectedTransToReturn] = useState(null);
  const [returnCondition, setReturnCondition] = useState('ปกติ');
  const [returnNote, setReturnNote] = useState('');
  const [failedImages, setFailedImages] = useState({});

  const isMounted = useRef(true);

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const response = await fetch(`${API_URL}?action=getData`);
      const rawText = await response.text();
      let data;
      try { data = JSON.parse(rawText); }
      catch { throw new Error("ตอบกลับจากเซิร์ฟเวอร์ไม่ถูกต้อง (ไม่ใช่ JSON)"); }

      if (!isMounted.current) return;

      if (data.success || data.status === 'success') {
        setDevices(data.devices || []);
        setTransactions(data.transactions || []);
        try {
          localStorage.setItem('app_user_devices', JSON.stringify(data.devices || []));
          localStorage.setItem('app_user_transactions', JSON.stringify(data.transactions || []));
        } catch { /* ignore */ }
        if (isSilent) toast.success('ข้อมูลอัปเดตเป็นปัจจุบันเรียบร้อยแล้ว');
      } else {
        toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล: " + (data.message || "ไม่ทราบสาเหตุ"));
      }
    } catch (error) {
      console.error("Fetch Data Error:", error);
      if (isMounted.current) toast.error("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
    } finally {
      if (isMounted.current && !isSilent) setLoading(false);
    }
  }, [API_URL]);

  const hasInitialCache = useRef(devices.length > 0);

  useEffect(() => {
    isMounted.current = true;
    fetchData(hasInitialCache.current);
    return () => { isMounted.current = false; };
  }, [fetchData]);

  const setQuickReturnDays = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setExpectedReturnDate(d.toISOString().split('T')[0]);
  };

  const handleBorrow = async (e) => {
    e.preventDefault();
    if (!selectedDevice || !expectedReturnDate) {
      toast.error("กรุณาระบุวันที่กำหนดคืน");
      return;
    }
    setSubmitting(true);
    const deviceIdentifier = selectedDevice.id || selectedDevice.code || selectedDevice.deviceId;
    const payload = {
      action: 'borrowDevice',
      deviceId: deviceIdentifier,
      deviceName: selectedDevice.name,
      username: user?.username,
      name: user?.name,
      userRole: user?.role || 'user',
      expectedReturnDate
    };
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        redirect: 'follow'
      });
      const rawText = await response.text();
      let resData;
      try { resData = JSON.parse(rawText); }
      catch { throw new Error("เกิดข้อผิดพลาดในการอ่านข้อมูลตอบกลับ"); }

      if (!isMounted.current) return;

      if (resData.success || resData.status === 'success') {
        toast.success(`ทำรายการยืม "${selectedDevice.name}" สำเร็จเรียบร้อย!`);
        try { confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } }); } catch { /* ignore */ }
        closeBorrowModal();
        fetchData(true);
      } else {
        toast.error("ยืมอุปกรณ์ไม่สำเร็จ: " + (resData.message || 'เกิดข้อผิดพลาด'));
      }
    } catch (error) {
      console.error("Borrow Error:", error);
      if (isMounted.current) toast.error("เกิดข้อผิดพลาดขณะส่งคำขอยืมอุปกรณ์");
    } finally {
      if (isMounted.current) setSubmitting(false);
    }
  };

  const handleReturnDevice = async (e) => {
    e.preventDefault();
    if (!selectedTransToReturn) return;
    setSubmitting(true);
    const payload = {
      action: 'returnDevice',
      transId: selectedTransToReturn.id,
      deviceId: selectedTransToReturn.deviceId,
      username: user?.username,
      userRole: user?.role || 'user',
      condition: returnCondition,
      note: returnNote
    };
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        redirect: 'follow'
      });
      const rawText = await response.text();
      let resData;
      try { resData = JSON.parse(rawText); }
      catch { throw new Error("เกิดข้อผิดพลาดในการอ่านข้อมูลตอบกลับ"); }

      if (!isMounted.current) return;

      if (resData.success || resData.status === 'success') {
        toast.success(`คืนอุปกรณ์ "${selectedTransToReturn.deviceName}" เรียบร้อยแล้ว ขอบคุณครับ`);
        closeReturnModal();
        fetchData(true);
      } else {
        toast.error("คืนอุปกรณ์ไม่สำเร็จ: " + (resData.message || 'เกิดข้อผิดพลาด'));
      }
    } catch (error) {
      console.error("Return Error:", error);
      if (isMounted.current) toast.error("เกิดข้อผิดพลาดขณะส่งคำขอคืนอุปกรณ์");
    } finally {
      if (isMounted.current) setSubmitting(false);
    }
  };

  const closeBorrowModal = () => { setSelectedDevice(null); setExpectedReturnDate(''); };
  const closeReturnModal = () => { setSelectedTransToReturn(null); setReturnNote(''); setReturnCondition('ปกติ'); };
  const handleImageError = (id) => { setFailedImages(prev => ({ ...prev, [id]: true })); };

  const currentUsername = String(user?.username || '').toLowerCase().trim();
  const currentName = String(user?.name || '').toLowerCase().trim();

  const isMyTransaction = (t) => {
    const tUsername = String(t.username || '').toLowerCase().trim();
    const tUserId = String(t.userId || '').toLowerCase().trim();
    return (
      (currentUsername && (tUsername === currentUsername || tUserId === currentUsername)) ||
      (currentName && (tUsername === currentName || tUserId === currentName))
    );
  };

  const myActiveBorrows = transactions.filter(t => {
    const isNotReturned = !t.returnDate || t.returnDate === '-' || t.returnDate === '';
    const isStatusBorrow = !['returned', 'คืนแล้ว'].includes(t.status);
    return isMyTransaction(t) && isNotReturned && isStatusBorrow;
  });

  const myHistory = transactions.filter(t => isMyTransaction(t));

  const filteredDevices = devices.filter(d => {
    const dName = String(d.name || '').toLowerCase();
    const dCode = String(d.id || d.code || '').toLowerCase();
    const matchesSearch = dName.includes(searchTerm.toLowerCase()) || dCode.includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'ทั้งหมด' || d.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['ทั้งหมด', ...new Set(devices.map(d => d.category).filter(Boolean))];

  const checkIsOverdue = (trans) => {
    if (!trans || !trans.expectedReturnDate) return false;
    if (['returned', 'คืนแล้ว'].includes(trans.status)) return false;
    const expDate = new Date(trans.expectedReturnDate);
    if (isNaN(expDate.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expDate.setHours(0, 0, 0, 0);
    return expDate < today;
  };

  const todayString = new Date().toISOString().split('T')[0];
  const availableCount = devices.filter(d => d.status === 'พร้อมใช้งาน').length;

  // ─── Helper Components ────────────────────────────────────────────
  const StatCard = ({ label, value, unit, icon: Icon, colorClass, glowClass, delay = '' }) => (
    <div className={`glass-card rounded-2xl p-5 flex items-center justify-between animate-fade-up ${delay}`}>
      <div>
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
        <div className="flex items-end gap-1.5">
          <span className={`text-3xl font-black tracking-tight ${colorClass}`}>{value}</span>
          <span className="text-xs text-slate-500 mb-1">{unit}</span>
        </div>
      </div>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${glowClass}`}
        style={{ background: 'rgba(99,102,241,0.1)' }}>
        <Icon className={`w-6 h-6 ${colorClass}`} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-animated text-slate-200 font-sans pb-24 selection:bg-indigo-500 selection:text-white">

      {/* ─── Floating Background Orbs ─────────────────────────────── */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full opacity-10 animate-orb-1"
          style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }} />
        <div className="absolute bottom-[10%] left-[-5%] w-[350px] h-[350px] rounded-full opacity-8 animate-orb-2"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
      </div>

      {/* ─── Header ───────────────────────────────────────────────── */}
      <header className="relative z-20 sticky top-0"
        style={{ background: 'rgba(11, 15, 25, 0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(99,102,241,0.15)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">

          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-indigo-500/30 shadow-lg shadow-indigo-500/20">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover object-top" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight gradient-text">
                ระบบยืม-คืนอุปกรณ์ไอที
              </h1>
              <p className="text-[11px] text-slate-500">บริการยืม-คืนอุปกรณ์ออนไลน์</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-0 pt-3 sm:pt-0"
            style={{ borderColor: 'rgba(255,255,255,0.05)' }}>

            {/* Loading indicator */}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-indigo-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:inline">กำลังโหลด...</span>
              </div>
            )}

            {/* Profile Button */}
            <button
              type="button"
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 cursor-pointer group"
              style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}
              title="แก้ไขข้อมูลโปรไฟล์"
            >
              <div className="w-7 h-7 rounded-full overflow-hidden border-2 border-indigo-500/40 shrink-0 flex items-center justify-center bg-indigo-900/50">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="User" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-indigo-300" />
                )}
              </div>
              <div className="text-xs text-left hidden sm:block">
                <div className="font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                  {user?.name || user?.username || 'ผู้ใช้งาน'}
                </div>
                <div className="text-slate-500 text-[10px]">ผู้ใช้งานทั่วไป</div>
              </div>
            </button>

            {/* Logout */}
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer text-slate-400 hover:text-rose-300"
              style={{ background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.15)' }}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ออกจากระบบ</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-8">

        {/* ─── Welcome Banner ──────────────────────────────────────── */}
        <div className="glass-card rounded-2xl px-6 py-5 flex items-center justify-between animate-fade-up"
          style={{ borderColor: 'rgba(99,102,241,0.2)', background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.05) 100%)' }}>
          <div>
            <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-0.5">ยินดีต้อนรับกลับ 👋</p>
            <h2 className="text-lg sm:text-xl font-black text-slate-100">
              {user?.name || user?.username || 'ผู้ใช้งาน'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">คุณมีอุปกรณ์ที่กำลังยืมอยู่ <span className="text-amber-400 font-bold">{myActiveBorrows.length} รายการ</span></p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-slate-600">
            <Zap className="w-8 h-8 text-indigo-500/40 animate-pulse-subtle" />
          </div>
        </div>

        {/* ─── Stat Cards ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="กำลังยืมอยู่" value={myActiveBorrows.length} unit="รายการ"
            icon={Clock} colorClass="text-amber-400" glowClass="animate-glow-amber" delay="delay-100" />
          <StatCard label="ประวัติการยืมทั้งหมด" value={myHistory.length} unit="ครั้ง"
            icon={TrendingUp} colorClass="text-indigo-400" glowClass="animate-glow" delay="delay-200" />
          <StatCard label="อุปกรณ์พร้อมยืม" value={availableCount} unit="ชิ้น"
            icon={PackageCheck} colorClass="text-emerald-400" glowClass="animate-glow-emerald" delay="delay-300" />
        </div>

        {/* ─── Section 1: My Active Borrows ────────────────────────── */}
        <section className="space-y-4 animate-fade-up delay-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-100 tracking-tight">
              อุปกรณ์ที่ฉันกำลังยืมอยู่
              <span className="ml-2 text-sm font-medium text-slate-500">({myActiveBorrows.length})</span>
            </h2>
          </div>

          {myActiveBorrows.length === 0 ? (
            <div className="glass-card rounded-2xl p-10 text-center">
              <Boxes className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-400">ไม่มีรายการยืมที่ค้างอยู่</p>
              <p className="text-xs text-slate-600 mt-1">เลือกอุปกรณ์จากรายการด้านล่างเพื่อทำรายการยืม</p>
            </div>
          ) : (
            <div className="glass-card rounded-2xl overflow-hidden" style={{ padding: 0 }}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm dark-table">
                  <thead>
                    <tr>
                      <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">รหัสรายการ</th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">ชื่ออุปกรณ์</th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">วันที่ยืม</th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">กำหนดคืน</th>
                      <th className="px-5 py-3.5 text-center text-[11px] font-bold text-slate-500 uppercase tracking-widest">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myActiveBorrows.map((t, idx) => {
                      const isOverdue = checkIsOverdue(t);
                      return (
                        <tr key={t.id || `${t.deviceId}-${idx}`}
                          style={isOverdue ? { background: 'rgba(244,63,94,0.05)' } : {}}>
                          <td className="px-5 py-4 font-mono text-xs text-slate-600">{t.id || '-'}</td>
                          <td className="px-5 py-4 font-bold text-slate-200">{t.deviceName}</td>
                          <td className="px-5 py-4 text-slate-500 font-mono text-xs">{formatDisplayDate(t.borrowDate)}</td>
                          <td className="px-5 py-4">
                            {isOverdue ? (
                              <span className="status-overdue inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold">
                                <AlertTriangle className="w-3 h-3" /> เกินกำหนด
                              </span>
                            ) : (
                              <span className="font-mono text-xs text-slate-400">{formatDisplayDate(t.expectedReturnDate)}</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedTransToReturn(t)}
                              className="btn-gradient-emerald inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>คืนอุปกรณ์</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* ─── Section 2: Equipment Catalog ────────────────────────── */}
        <section className="space-y-5 animate-fade-up delay-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <Laptop className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-100 tracking-tight">แคตตาล็อกอุปกรณ์ทั้งหมด</h2>
                <p className="text-xs text-slate-500">เลือกอุปกรณ์ที่ต้องการเพื่อทำรายการยืม</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อหรือรหัสอุปกรณ์..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="dark-input w-full pl-9 pr-4 py-2.5 rounded-xl text-xs sm:text-sm"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="dark-input pl-9 pr-8 py-2.5 rounded-xl text-xs sm:text-sm cursor-pointer appearance-none"
                >
                  {categories.map((cat, idx) => (
                    <option key={idx} value={cat}>{cat === 'ทั้งหมด' ? 'ทุกหมวดหมู่' : cat}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {filteredDevices.length === 0 ? (
            <div className="glass-card rounded-2xl p-10 text-center">
              <Boxes className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-400">ไม่พบอุปกรณ์ที่ตรงกับเงื่อนไข</p>
              <p className="text-xs text-slate-600 mt-1">ลองเปลี่ยนคำค้นหาหรือหมวดหมู่ใหม่อีกครั้ง</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDevices.map((device, index) => {
                const deviceKey = device.id || device.code || device.deviceId || index;
                const isAvailable = device.status === 'พร้อมใช้งาน';
                const isImgFailed = failedImages[deviceKey];

                return (
                  <div
                    key={deviceKey}
                    className="glass-card rounded-2xl overflow-hidden flex flex-col group animate-fade-up"
                    style={{ animationDelay: `${index * 0.05}s`, padding: 0 }}
                  >
                    {/* Image */}
                    <div className="h-44 relative overflow-hidden bg-slate-900/50">
                      {device.imageUrl && !isImgFailed ? (
                        <img
                          src={device.imageUrl}
                          alt={device.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={() => handleImageError(deviceKey)}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-slate-700">
                          <ImageOff className="w-9 h-9 opacity-40" />
                          <span className="text-[11px] font-medium text-slate-600">ไม่มีภาพประกอบ</span>
                        </div>
                      )}
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent pointer-events-none" />
                      {/* Status badge */}
                      <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        isAvailable ? 'status-available' : 'status-borrowed'
                      }`}>
                        {device.status}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="p-4 flex flex-col flex-1 justify-between">
                      <div className="space-y-1.5 mb-4">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase text-slate-400"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            {device.category || 'IT Equipment'}
                          </span>
                          <span className="text-slate-600 font-mono">#{device.id || '-'}</span>
                        </div>
                        <h3 className="font-bold text-base text-slate-100 leading-snug group-hover:text-indigo-300 transition-colors">
                          {device.name}
                        </h3>
                      </div>

                      {isAvailable ? (
                        <button
                          type="button"
                          onClick={() => setSelectedDevice(device)}
                          className="w-full py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer btn-gradient-primary"
                        >
                          <Laptop className="w-4 h-4" />
                          <span>ยืมอุปกรณ์นี้</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="w-full py-2.5 rounded-xl text-xs font-bold text-slate-600 cursor-not-allowed text-center"
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                        >
                          ไม่พร้อมใช้งาน
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ─── Section 3: My Borrow History ────────────────────────── */}
        <section className="space-y-4 animate-fade-up delay-400">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <History className="w-4 h-4 text-slate-400" />
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-100 tracking-tight">
              ประวัติการยืม-คืนของฉัน
              <span className="ml-2 text-sm font-medium text-slate-500">({myHistory.length})</span>
            </h2>
          </div>

          {myHistory.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center text-slate-600 text-xs sm:text-sm">
              ยังไม่มีประวัติการทำรายการยืม-คืนในบัญชีนี้
            </div>
          ) : (
            <div className="glass-card rounded-2xl overflow-hidden" style={{ padding: 0 }}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm dark-table">
                  <thead>
                    <tr>
                      <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">อุปกรณ์</th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">วันที่ยืม</th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">วันที่คืนจริง</th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myHistory.map((h, index) => (
                      <tr key={h.id || index}>
                        <td className="px-5 py-4 font-bold text-slate-200">{h.deviceName}</td>
                        <td className="px-5 py-4 text-slate-500 font-mono text-xs">{formatDisplayDate(h.borrowDate)}</td>
                        <td className="px-5 py-4 text-slate-500 font-mono text-xs">{formatDisplayDate(h.returnDate)}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                            ['returned', 'คืนแล้ว'].includes(h.status) || h.condition === 'ปกติ'
                              ? 'status-available'
                              : h.condition
                                ? 'status-borrowed'
                                : 'text-indigo-300 border border-indigo-500/30'
                          }`}
                          style={(!['returned','คืนแล้ว'].includes(h.status) && !h.condition) ? { background: 'rgba(99,102,241,0.1)' } : {}}>
                            {['returned', 'คืนแล้ว'].includes(h.status) || h.condition === 'ปกติ' ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <Clock className="w-3.5 h-3.5" />
                            )}
                            {h.condition ? `คืนแล้ว (${h.condition})` : (['returned', 'คืนแล้ว'].includes(h.status) ? 'คืนแล้ว' : 'กำลังยืม')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="pt-6 pb-4 flex items-center justify-between gap-4 text-xs text-slate-600"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl overflow-hidden border border-indigo-500/20">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover object-top" />
            </div>
            <span className="gradient-text font-bold text-sm">ระบบยืม-คืนอุปกรณ์ไอที</span>
          </div>
          <span className="text-[11px]">© 2026 IT Asset System</span>
        </footer>
      </main>

      {/* ─── Modal: ยืมอุปกรณ์ ─────────────────────────────────────── */}
      {selectedDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" onClick={closeBorrowModal} />
          <div className="relative w-full max-w-md z-10 animate-scale-in">
            {/* Glow */}
            <div className="absolute inset-0 rounded-3xl blur-xl opacity-30 pointer-events-none"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }} />
            <div className="relative glass-darker rounded-3xl p-6 sm:p-8 neon-border-indigo shadow-2xl">
              <button type="button" onClick={closeBorrowModal}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-all cursor-pointer">
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3.5 mb-6">
                <div className="p-3 rounded-2xl" style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>
                  <Laptop className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-100">ทำรายการยืมอุปกรณ์</h3>
                  <p className="text-xs text-slate-500">กรุณากำหนดวันส่งคืนเพื่อจองใช้งาน</p>
                </div>
              </div>

              {/* Selected Device Banner */}
              <div className="p-4 rounded-2xl mb-5" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <span className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider">อุปกรณ์ที่เลือก</span>
                <p className="text-sm font-black text-slate-100 mt-0.5">{selectedDevice.name}</p>
                <span className="text-xs text-slate-500 font-mono">ID: {selectedDevice.id || selectedDevice.code || '-'}</span>
              </div>

              <form onSubmit={handleBorrow} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest mb-2 text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    กำหนดวันที่ส่งคืน <span className="text-rose-400">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[{ label: '+3 วัน', days: 3 }, { label: '+7 วัน', days: 7 }, { label: '+14 วัน', days: 14 }].map((btn, idx) => (
                      <button key={idx} type="button" onClick={() => setQuickReturnDays(btn.days)}
                        className="py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer text-indigo-300 hover:text-white"
                        style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)' }}>
                        {btn.label}
                      </button>
                    ))}
                  </div>
                  <input type="date" required min={todayString}
                    value={expectedReturnDate} onChange={(e) => setExpectedReturnDate(e.target.value)}
                    className="dark-input w-full p-3 rounded-xl text-sm font-semibold cursor-pointer" />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-1">
                  <button type="button" onClick={closeBorrowModal} disabled={submitting}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                    style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                    ยกเลิก
                  </button>
                  <button type="submit" disabled={submitting}
                    className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 btn-gradient-primary">
                    {submitting ? (<><Loader2 className="w-4 h-4 animate-spin" /><span>กำลังบันทึก...</span></>) : (<><CheckCircle2 className="w-4 h-4" /><span>ยืนยันการยืม</span></>)}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: คืนอุปกรณ์ ─────────────────────────────────────── */}
      {selectedTransToReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" onClick={closeReturnModal} />
          <div className="relative w-full max-w-md z-10 animate-scale-in">
            <div className="absolute inset-0 rounded-3xl blur-xl opacity-25 pointer-events-none"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }} />
            <div className="relative glass-darker rounded-3xl p-6 sm:p-8 neon-border-emerald shadow-2xl">
              <button type="button" onClick={closeReturnModal}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-all cursor-pointer">
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3.5 mb-6">
                <div className="p-3 rounded-2xl" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)' }}>
                  <RotateCcw className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-100">ทำรายการคืนอุปกรณ์</h3>
                  <p className="text-xs text-slate-500">ระบุสภาพอุปกรณ์เมื่อทำการส่งคืน</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl mb-5" style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider">อุปกรณ์ที่ส่งคืน</span>
                <p className="text-sm font-black text-slate-100 mt-0.5">{selectedTransToReturn.deviceName}</p>
                <span className="text-xs text-slate-500 font-mono">รหัสรายการ: {selectedTransToReturn.id || '-'}</span>
              </div>

              <form onSubmit={handleReturnDevice} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest mb-2 text-slate-400">สภาพอุปกรณ์ตอนส่งคืน</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { value: 'ปกติ', label: 'ปกติ (สมบูรณ์)', icon: CheckCircle2, activeClass: 'neon-border-emerald', activeBg: 'rgba(16,185,129,0.1)', activeText: 'text-emerald-300' },
                      { value: 'ชำรุด/ส่งซ่อม', label: 'ชำรุด / มีปัญหา', icon: AlertTriangle, activeClass: 'neon-border-amber', activeBg: 'rgba(245,158,11,0.1)', activeText: 'text-amber-300' }
                    ].map((opt) => {
                      const Icon = opt.icon;
                      const isSelected = returnCondition === opt.value;
                      return (
                        <button key={opt.value} type="button" onClick={() => setReturnCondition(opt.value)}
                          className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${isSelected ? opt.activeText : 'text-slate-500 hover:text-slate-300'}`}
                          style={isSelected
                            ? { background: opt.activeBg, border: `1px solid ${opt.value === 'ปกติ' ? 'rgba(16,185,129,0.4)' : 'rgba(245,158,11,0.4)'}` }
                            : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <Icon className="w-4 h-4" />
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest mb-1.5 text-slate-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> หมายเหตุเพิ่มเติม (ถ้ามี)
                  </label>
                  <textarea rows="3" value={returnNote} onChange={(e) => setReturnNote(e.target.value)}
                    placeholder="ระบุเพิ่มเติม เช่น สายชาร์จมีรอยถลอก..."
                    className="dark-input w-full p-3 rounded-xl text-xs sm:text-sm font-medium resize-none" />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-1">
                  <button type="button" onClick={closeReturnModal} disabled={submitting}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                    style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                    ยกเลิก
                  </button>
                  <button type="submit" disabled={submitting}
                    className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 btn-gradient-emerald">
                    {submitting ? (<><Loader2 className="w-4 h-4 animate-spin" /><span>กำลังส่งข้อมูล...</span></>) : (<><CheckCircle2 className="w-4 h-4" /><span>ยืนยันการคืน</span></>)}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
        onUpdateUser={onUpdateUser}
        apiUrl={API_URL}
      />
    </div>
  );
}
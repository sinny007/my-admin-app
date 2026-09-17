import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Laptop,
  LogOut,
  Search,
  Filter,
  Clock,
  History,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Loader2,
  PackageCheck,
  X,
  Boxes,
  ImageOff,
  User,
  Sparkles,
  TrendingUp,
  Sun,
  Moon,
  CheckSquare,
  Square,
  Layers,
  ShoppingBag
} from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import ProfileModal from './ProfileModal';
import { IT_CATEGORIES } from '../constants/itCategories';

const DEFAULT_API_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_APPS_SCRIPT_URL) ||
  (typeof process !== 'undefined' && process.env && process.env.REACT_APP_APPS_SCRIPT_URL) ||
  "https://script.google.com/macros/s/AKfycbxjMy2NzVzuWIBlobYAeyBD92PYUQUoxu6n0oF4ReWN91zE9FM7BwrsKuEzWM2ubALIQA/exec";

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

function StatCard({ label, value, unit, icon: Icon, colorClass, bgClass, delay = '' }) {
  return (
    <div className={`glass-card rounded-2xl p-5 flex items-center justify-between border border-slate-200/80 dark:border-slate-800 animate-fade-up ${delay}`}>
      <div>
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{label}</p>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-3xl font-black tracking-tight ${colorClass}`}>{value}</span>
          <span className="text-xs text-slate-400 font-medium">{unit}</span>
        </div>
      </div>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${bgClass}`}>
        <Icon className={`w-6 h-6 ${colorClass}`} />
      </div>
    </div>
  );
}

export default function UserDashboard({ user, onLogout, apiUrl, onUpdateUser }) {
  const API_URL = apiUrl || DEFAULT_API_URL;

  // Theme state
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

  // Bulk Borrow state
  const [selectedBulkIds, setSelectedBulkIds] = useState([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkReturnDate, setBulkReturnDate] = useState('');

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

  const setQuickReturnDays = (days, isBulk = false) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const dateStr = d.toISOString().split('T')[0];
    if (isBulk) {
      setBulkReturnDate(dateStr);
    } else {
      setExpectedReturnDate(dateStr);
    }
  };

  // Single Borrow
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

  // Bulk Borrow
  const toggleBulkSelect = (id) => {
    setSelectedBulkIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllAvailable = () => {
    const availableIds = filteredDevices
      .filter(d => d.status === 'พร้อมใช้งาน')
      .map(d => d.id || d.code || d.deviceId);
    
    if (selectedBulkIds.length === availableIds.length) {
      setSelectedBulkIds([]);
    } else {
      setSelectedBulkIds(availableIds);
    }
  };

  const selectedBulkDevices = devices.filter(d => 
    selectedBulkIds.includes(d.id || d.code || d.deviceId)
  );

  const handleBulkBorrowSubmit = async (e) => {
    e.preventDefault();
    if (selectedBulkDevices.length === 0 || !bulkReturnDate) {
      toast.error('กรุณาระบุวันที่กำหนดคืนสำหรับทุกรายการ');
      return;
    }

    setSubmitting(true);
    let successCount = 0;
    let failCount = 0;

    for (const dev of selectedBulkDevices) {
      const devId = dev.id || dev.code || dev.deviceId;
      const payload = {
        action: 'borrowDevice',
        deviceId: devId,
        deviceName: dev.name,
        username: user?.username,
        name: user?.name,
        userRole: user?.role || 'user',
        expectedReturnDate: bulkReturnDate
      };

      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
          redirect: 'follow'
        });
        const rawText = await response.text();
        const resData = JSON.parse(rawText);
        if (resData.success || resData.status === 'success') {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    if (!isMounted.current) return;
    setSubmitting(false);

    if (successCount > 0) {
      toast.success(`ยืมอุปกรณ์สำเร็จทั้งหมด ${successCount} รายการเรียบร้อยแล้ว!`);
      try { confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } }); } catch { /* ignore */ }
      setSelectedBulkIds([]);
      setIsBulkModalOpen(false);
      setBulkReturnDate('');
      fetchData(true);
    }

    if (failCount > 0) {
      toast.error(`มีบางรายการ (${failCount} ชิ้น) ไม่สามารถทำรายการได้`);
    }
  };

  // Return Device
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

  // Category list
  const allCategories = ['ทั้งหมด', ...new Set([...IT_CATEGORIES, ...devices.map(d => d.category).filter(Boolean)])];

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('ทั้งหมด');
    toast.info('ล้างตัวกรองและคำค้นหาเรียบร้อยแล้ว');
  };

  const filteredDevices = devices.filter((d) => {
    const dName = String(d.name || '').toLowerCase();
    const dCode = String(d.id || d.code || '').toLowerCase();
    const dCategory = d.category || '';

    const matchesSearch = dName.includes(searchTerm.toLowerCase()) || dCode.includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'ทั้งหมด' || dCategory.includes(selectedCategory) || selectedCategory.includes(dCategory);

    return matchesSearch && matchesCategory;
  });

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

  return (
    <div className={`min-h-screen bg-canvas font-sans pb-32 transition-colors duration-200 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>

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
                <h1 className="text-base sm:text-lg font-black tracking-tight gradient-text">
                  ระบบยืม-คืนอุปกรณ์ไอที
                </h1>
                <span className="px-2 py-0.5 rounded-md bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300 text-[10px] font-bold">
                  ผู้ใช้งาน
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">บริการยืม-คืนอุปกรณ์ไอทีและเทคโนโลยีออนไลน์</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-0 pt-3 sm:pt-0 border-orange-100 dark:border-slate-800">

            {/* Loading indicator */}
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
              title={isDark ? "สลับเป็นโหมดสว่าง (Light Mode)" : "สลับเป็นโหมดมืด (Dark Mode)"}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Profile Button */}
            <button
              type="button"
              onClick={() => setIsProfileOpen(true)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer group shadow-xs ${
                isDark
                  ? 'bg-slate-800 border-slate-700 hover:border-orange-500'
                  : 'bg-orange-50/60 hover:bg-orange-100/60 border-orange-200 hover:border-orange-300'
              }`}
              title="แก้ไขข้อมูลโปรไฟล์"
            >
              <div className="w-7 h-7 rounded-full overflow-hidden border border-orange-200 dark:border-orange-700 shrink-0 flex items-center justify-center bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="User" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4" />
                )}
              </div>
              <div className="text-xs text-left hidden sm:block">
                <div className={`font-bold transition-colors group-hover:text-orange-600 dark:group-hover:text-orange-400 ${
                  isDark ? 'text-slate-200' : 'text-slate-800'
                }`}>
                  {user?.name || user?.username || 'ผู้ใช้งาน'}
                </div>
                <div className="text-slate-500 text-[10px]">{user?.department || 'ผู้ใช้งานทั่วไป'}</div>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-8">

        {/* ─── Welcome Banner ──────────────────────────────────────── */}
        <div className={`relative rounded-3xl p-6 sm:p-7 border shadow-sm overflow-hidden animate-fade-up ${
          isDark 
            ? 'bg-gradient-to-r from-orange-950/40 via-slate-900 to-slate-900 border-orange-900/50' 
            : 'bg-gradient-to-r from-orange-50/90 via-amber-50/80 to-yellow-50/80 border-orange-200/80'
        }`}>
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full border text-xs font-bold mb-2 shadow-xs ${
                isDark ? 'bg-orange-900/40 border-orange-700 text-orange-300' : 'bg-white/80 border-orange-200 text-orange-700'
              }`}>
                <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                <span>ยินดีต้อนรับสู่ระบบยืม-คืน</span>
              </div>
              <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                สวัสดีคุณ {user?.name || user?.username || 'ผู้ใช้งาน'} 👋
              </h2>
              <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                คุณมีอุปกรณ์ที่กำลังยืมอยู่ ณ ตอนนี้ <span className="inline-block px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800">{myActiveBorrows.length} รายการ</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fetchData(false)}
                className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <RotateCcw className={`w-3.5 h-3.5 text-indigo-500 ${loading ? 'animate-spin' : ''}`} />
                <span>รีเฟรชข้อมูล</span>
              </button>
            </div>
          </div>
        </div>

        {/* ─── Stat Cards ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="กำลังยืมอยู่"
            value={myActiveBorrows.length}
            unit="รายการ"
            icon={Clock}
            colorClass="text-amber-600 dark:text-amber-400"
            bgClass="bg-amber-50 dark:bg-amber-950/50"
            delay="delay-100"
          />
          <StatCard
            label="ประวัติการยืมทั้งหมด"
            value={myHistory.length}
            unit="ครั้ง"
            icon={TrendingUp}
            colorClass="text-indigo-600 dark:text-indigo-400"
            bgClass="bg-indigo-50 dark:bg-indigo-950/50"
            delay="delay-200"
          />
          <StatCard
            label="อุปกรณ์พร้อมให้ยืม"
            value={availableCount}
            unit="ชิ้น"
            icon={PackageCheck}
            colorClass="text-emerald-600 dark:text-emerald-400"
            bgClass="bg-emerald-50 dark:bg-emerald-950/50"
            delay="delay-300"
          />
        </div>

        {/* ─── Section 1: My Active Borrows ────────────────────────── */}
        <section className="space-y-4 animate-fade-up delay-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className={`text-base sm:text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                อุปกรณ์ที่ฉันกำลังยืมอยู่
                <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 text-xs font-bold border border-amber-200 dark:border-amber-800">
                  {myActiveBorrows.length}
                </span>
              </h2>
            </div>
          </div>

          {myActiveBorrows.length === 0 ? (
            <div className={`glass-card rounded-2xl p-8 text-center border border-dashed ${
              isDark ? 'border-slate-800' : 'border-slate-300'
            }`}>
              <Boxes className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-bold">ไม่มีรายการยืมที่ค้างอยู่</p>
              <p className="text-xs text-slate-500 mt-0.5">เลือกดูอุปกรณ์ที่พร้อมใช้งานด้านล่าง แล้วกดทำรายการยืมได้ทันที</p>
            </div>
          ) : (
            <div className={`rounded-2xl border shadow-sm overflow-hidden ${
              isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-white border-slate-200/90'
            }`}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm light-table">
                  <thead>
                    <tr>
                      <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider">รหัสรายการ</th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider">ชื่ออุปกรณ์</th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider">วันที่ยืม</th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider">กำหนดคืน</th>
                      <th className="px-5 py-3.5 text-center text-[11px] font-bold uppercase tracking-wider">การกระทำ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myActiveBorrows.map((t, idx) => {
                      const isOverdue = checkIsOverdue(t);
                      return (
                        <tr key={t.id || `${t.deviceId}-${idx}`}
                          className={isOverdue ? "bg-rose-50/40 dark:bg-rose-950/30" : ""}>
                          <td className="px-5 py-4 font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">{t.id || '-'}</td>
                          <td className="px-5 py-4 font-bold">{t.deviceName}</td>
                          <td className="px-5 py-4 text-slate-500 font-mono text-xs">{formatDisplayDate(t.borrowDate)}</td>
                          <td className="px-5 py-4">
                            {isOverdue ? (
                              <span className="status-overdue inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold">
                                <AlertTriangle className="w-3 h-3" /> เกินกำหนดคืน
                              </span>
                            ) : (
                              <span className="font-mono text-xs font-medium text-slate-700 dark:text-slate-300">{formatDisplayDate(t.expectedReturnDate)}</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedTransToReturn(t)}
                              className="btn-gradient-emerald inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>ส่งคืนอุปกรณ์</span>
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
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800">
                <Laptop className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className={`text-base sm:text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  แคตตาล็อกอุปกรณ์และเทคโนโลยี
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">เลือกอุปกรณ์ที่ต้องการ หรือติ๊กเช็คบ็อกซ์เพื่อยืมพร้อมกันหลายชิ้น (Bulk Borrow)</p>
              </div>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search */}
              <div className="relative flex-1 sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อหรือรหัส..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="light-input w-full pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm"
                />
              </div>

              {/* Category Dropdown */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="light-input pl-9 pr-7 py-2 rounded-xl text-xs sm:text-sm cursor-pointer appearance-none font-medium"
                >
                  {allCategories.map((cat, idx) => (
                    <option key={idx} value={cat}>{cat === 'ทั้งหมด' ? 'ทุกหมวดหมู่' : cat.split('(')[0]}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Quick Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={handleSelectAllAvailable}
              className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedBulkIds.length > 0
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : isDark ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>เลือกทั้งหมดที่พร้อมยืม ({availableCount})</span>
            </button>

            {allCategories.slice(0, 7).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {cat.split('(')[0].trim()}
              </button>
            ))}
          </div>

          {/* ⚡ SKELETON LOADING ⚡ */}
          {loading && devices.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className={`rounded-3xl p-5 border space-y-3 ${
                  isDark ? 'bg-slate-800/60 border-slate-800' : 'bg-white border-slate-200/90'
                }`}>
                  <div className="h-40 w-full skeleton rounded-2xl" />
                  <div className="h-4 w-1/3 skeleton rounded-md" />
                  <div className="h-6 w-3/4 skeleton rounded-md" />
                  <div className="h-10 w-full skeleton rounded-xl mt-4" />
                </div>
              ))}
            </div>
          ) : filteredDevices.length === 0 ? (
            /* 🔍 INTERACTIVE EMPTY STATE 🔍 */
            <div className={`rounded-3xl p-10 text-center border border-dashed transition-all ${
              isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-300'
            }`}>
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center mx-auto mb-3 text-indigo-600 dark:text-indigo-400">
                <Boxes className="w-8 h-8 opacity-80" />
              </div>
              <h3 className={`text-base font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                ไม่พบอุปกรณ์ที่ตรงกับการค้นหา
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                ลองเปลี่ยนคำค้นหา หรือเลือกหมวดหมู่อุปกรณ์ใหม่อีกครั้ง
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 py-2 rounded-xl text-xs font-bold btn-gradient-primary shadow-indigo-500/20 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>ล้างคำค้นหาและตัวกรองทั้งหมด</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDevices.map((device, index) => {
                const deviceKey = device.id || device.code || device.deviceId || index;
                const isAvailable = device.status === 'พร้อมใช้งาน';
                const isImgFailed = failedImages[deviceKey];
                const isSelected = selectedBulkIds.includes(deviceKey);

                return (
                  <div
                    key={deviceKey}
                    className={`rounded-3xl overflow-hidden flex flex-col group border shadow-sm hover:shadow-xl transition-all duration-300 animate-fade-up ${
                      isSelected 
                        ? 'ring-2 ring-indigo-500 border-indigo-400 bg-indigo-50/20' 
                        : isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-white border-slate-200/90'
                    }`}
                    style={{ animationDelay: `${index * 0.03}s` }}
                  >
                    {/* Image & Top Badges */}
                    <div className={`h-44 relative overflow-hidden flex items-center justify-center p-2 ${
                      isDark ? 'bg-slate-900/60' : 'bg-slate-50'
                    }`}>
                      {/* Checkbox for Bulk Borrow */}
                      {isAvailable && (
                        <div className="absolute top-3 left-3 z-10">
                          <button
                            type="button"
                            onClick={() => toggleBulkSelect(deviceKey)}
                            className="p-1 rounded-lg bg-white/90 dark:bg-slate-800/90 shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer"
                            title="เลือกเพื่อยืมหลายชิ้น"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5 text-indigo-600" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-400" />
                            )}
                          </button>
                        </div>
                      )}

                      {device.imageUrl && !isImgFailed ? (
                        <img
                          src={device.imageUrl}
                          alt={device.name}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                          onError={() => handleImageError(deviceKey)}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-slate-400">
                          <ImageOff className="w-8 h-8 opacity-50" />
                          <span className="text-[11px] font-medium">ไม่มีรูปภาพ</span>
                        </div>
                      )}

                      {/* Status badge */}
                      <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[11px] shadow-xs ${
                        isAvailable ? 'status-available' : device.status === 'ถูกยืม' ? 'status-borrowed' : 'status-broken'
                      }`}>
                        {device.status}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="p-5 flex flex-col flex-1 justify-between">
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 truncate">
                            {device.category || 'อุปกรณ์ IT'}
                          </span>
                        </div>

                        <h3 className={`font-bold text-base leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors ${
                          isDark ? 'text-white' : 'text-slate-900'
                        }`}>
                          {device.name}
                        </h3>
                        <p className="text-slate-400 font-mono text-[11px]">#{device.id || '-'}</p>
                      </div>

                      {/* Actions */}
                      {isAvailable ? (
                        <button
                          type="button"
                          onClick={() => setSelectedDevice(device)}
                          className="w-full py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer btn-gradient-primary shadow-indigo-500/20"
                        >
                          <Laptop className="w-4 h-4" />
                          <span>ยืมอุปกรณ์ชิ้นนี้</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className={`w-full py-2.5 rounded-xl text-xs font-bold cursor-not-allowed text-center border ${
                            isDark ? 'bg-slate-900/50 border-slate-700 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400'
                          }`}
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
            <div className={`p-2 rounded-xl border ${
              isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'
            }`}>
              <History className="w-4 h-4 text-slate-500" />
            </div>
            <h2 className={`text-base sm:text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              ประวัติการยืม-คืนของฉัน
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
              }`}>
                {myHistory.length}
              </span>
            </h2>
          </div>

          {myHistory.length === 0 ? (
            <div className={`rounded-2xl p-6 text-center text-slate-500 text-xs sm:text-sm border border-dashed ${
              isDark ? 'border-slate-800' : 'border-slate-300'
            }`}>
              ยังไม่มีประวัติการทำรายการยืม-คืนในบัญชีนี้
            </div>
          ) : (
            <div className={`rounded-2xl border shadow-sm overflow-hidden ${
              isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-white border-slate-200/90'
            }`}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm light-table">
                  <thead>
                    <tr>
                      <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider">อุปกรณ์</th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider">วันที่ยืม</th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider">วันที่คืนจริง</th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myHistory.map((h, index) => (
                      <tr key={h.id || index}>
                        <td className="px-5 py-4 font-bold">{h.deviceName}</td>
                        <td className="px-5 py-4 text-slate-500 font-mono text-xs">{formatDisplayDate(h.borrowDate)}</td>
                        <td className="px-5 py-4 text-slate-500 font-mono text-xs">{formatDisplayDate(h.returnDate)}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                            ['returned', 'คืนแล้ว'].includes(h.status) || h.condition === 'ปกติ'
                              ? 'status-available'
                              : h.condition
                                ? 'status-borrowed'
                                : 'status-bay'
                          }`}>
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
        <footer className="pt-6 pb-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-xl overflow-hidden border p-1 ${
              isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
            }`}>
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold">ระบบยืม-คืนอุปกรณ์ไอที</span>
          </div>
          <span className="text-[11px]">© 2026 IT Equipment Management System</span>
        </footer>
      </main>

      {/* ─── FLOATING BULK BORROW ACTION BAR ────────────────────────── */}
      {selectedBulkIds.length > 0 && (
        <div className="fixed bottom-6 inset-x-0 z-40 flex justify-center px-4 animate-scale-in">
          <div className={`px-6 py-4 rounded-3xl border shadow-2xl flex items-center gap-4 flex-wrap justify-between max-w-xl w-full backdrop-blur-2xl ${
            isDark 
              ? 'bg-slate-900/95 border-indigo-700 text-white shadow-indigo-950/50' 
              : 'bg-white/95 border-indigo-300 text-slate-900 shadow-indigo-200/50'
          }`}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-2xl bg-indigo-600 text-white font-bold flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  ยืมหลายชิ้นพร้อมกัน (Bulk Borrow)
                </p>
                <p className="text-sm font-black">
                  เลือกอุปกรณ์แล้ว <span className="text-indigo-600 dark:text-indigo-400 text-base">{selectedBulkIds.length}</span> ชิ้น
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedBulkIds([])}
                className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                ล้างที่เลือก
              </button>
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(true)}
                className="px-5 py-2 rounded-xl text-xs font-bold btn-gradient-primary shadow-indigo-500/25 flex items-center gap-1.5 cursor-pointer"
              >
                <span>ดำเนินการยืม ({selectedBulkIds.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: ยืมหลายชิ้นพร้อมกัน (Bulk Borrow Modal) ─────────── */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={() => !submitting && setIsBulkModalOpen(false)} />
          <div className="relative w-full max-w-lg z-10 animate-scale-in">
            <div className={`rounded-3xl p-6 sm:p-8 border shadow-2xl ${
              isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                disabled={submitting}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3.5 mb-5">
                <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">ยืมอุปกรณ์หลายชิ้นพร้อมกัน</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">ระบุกำหนดส่งคืนครั้งเดียวสำหรับ {selectedBulkDevices.length} รายการที่เลือก</p>
                </div>
              </div>

              {/* Items List */}
              <div className={`p-4 rounded-2xl mb-5 max-h-48 overflow-y-auto border space-y-2 ${
                isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}>
                {selectedBulkDevices.map((dev, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-slate-200/50 dark:border-slate-700/50 last:border-0">
                    <span className="font-bold truncate max-w-[280px]">{dev.name}</span>
                    <span className="font-mono text-slate-400 text-[11px]">#{dev.id || '-'}</span>
                  </div>
                ))}
              </div>

              <form onSubmit={handleBulkBorrowSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5">
                    กำหนดวันที่คืน (Expected Return Date)
                  </label>
                  <input
                    type="date"
                    min={todayString}
                    value={bulkReturnDate}
                    onChange={(e) => setBulkReturnDate(e.target.value)}
                    required
                    className="light-input w-full px-4 py-2.5 rounded-xl text-sm font-medium"
                  />

                  {/* Quick date pills */}
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setQuickReturnDays(1, true)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      1 วัน
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickReturnDays(3, true)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      3 วัน
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickReturnDays(7, true)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      7 วัน (1 สัปดาห์)
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsBulkModalOpen(false)}
                    disabled={submitting}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold btn-gradient-primary shadow-indigo-500/25 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>กำลังบันทึก {selectedBulkDevices.length} รายการ...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>ยืนยันยืมทั้งหมด ({selectedBulkDevices.length})</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: ยืมอุปกรณ์ชิ้นเดียว ─────────────────────────────── */}
      {selectedDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={closeBorrowModal} />
          <div className="relative w-full max-w-md z-10 animate-scale-in">
            <div className={`rounded-3xl p-6 sm:p-8 border shadow-2xl ${
              isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <button
                type="button"
                onClick={closeBorrowModal}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3.5 mb-5">
                <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">ทำรายการยืมอุปกรณ์</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">กำหนดวันส่งคืนเพื่อยืนยันการจองใช้งาน</p>
                </div>
              </div>

              {/* Selected Device Banner */}
              <div className={`p-4 rounded-2xl mb-5 border ${
                isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">อุปกรณ์ที่เลือก</span>
                <p className="text-sm font-black mt-0.5">{selectedDevice.name}</p>
                <span className="text-xs text-slate-500 font-mono">ID: {selectedDevice.id || selectedDevice.code || '-'}</span>
              </div>

              <form onSubmit={handleBorrow} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5">
                    กำหนดวันที่คืน (Expected Return Date)
                  </label>
                  <input
                    type="date"
                    min={todayString}
                    value={expectedReturnDate}
                    onChange={(e) => setExpectedReturnDate(e.target.value)}
                    required
                    className="light-input w-full px-4 py-2.5 rounded-xl text-sm font-medium"
                  />

                  {/* Quick date pills */}
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setQuickReturnDays(1)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      1 วัน
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickReturnDays(3)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      3 วัน
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickReturnDays(7)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      7 วัน (1 สัปดาห์)
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={closeBorrowModal}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold btn-gradient-primary shadow-indigo-500/25 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>กำลังบันทึก...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>ยืนยันการยืม</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: ส่งคืนอุปกรณ์ ───────────────────────────────────── */}
      {selectedTransToReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={closeReturnModal} />
          <div className="relative w-full max-w-md z-10 animate-scale-in">
            <div className={`rounded-3xl p-6 sm:p-8 border shadow-2xl ${
              isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <button
                type="button"
                onClick={closeReturnModal}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3.5 mb-5">
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">ส่งคืนอุปกรณ์</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">ระบุสภาพอุปกรณ์และหมายเหตุเพื่อบันทึกการส่งคืน</p>
                </div>
              </div>

              <div className={`p-4 rounded-2xl mb-5 border ${
                isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">อุปกรณ์ที่ส่งคืน</span>
                <p className="text-sm font-black mt-0.5">{selectedTransToReturn.deviceName}</p>
                <span className="text-xs text-slate-500 font-mono">รหัสรายการ: {selectedTransToReturn.id}</span>
              </div>

              <form onSubmit={handleReturnDevice} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5">
                    สภาพอุปกรณ์ ณ ตอนส่งคืน
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setReturnCondition('ปกติ')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        returnCondition === 'ปกติ'
                          ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-600 text-emerald-800 dark:text-emerald-300 shadow-xs'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      ✓ ใช้งานได้ปกติ สมบูรณ์
                    </button>
                    <button
                      type="button"
                      onClick={() => setReturnCondition('ชำรุด/มีปัญหา')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        returnCondition === 'ชำรุด/มีปัญหา'
                          ? 'bg-rose-50 dark:bg-rose-950/70 border-rose-300 dark:border-rose-600 text-rose-800 dark:text-rose-300 shadow-xs'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      ⚠ ชำรุด / มีปัญหา
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5">
                    หมายเหตุเพิ่มเติม (ถ้ามี)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="เช่น ส่งคืนพร้อมกระเป๋า หรือแจ้งจุดที่มีตำหนิ..."
                    value={returnNote}
                    onChange={(e) => setReturnNote(e.target.value)}
                    className="light-input w-full p-3 rounded-xl text-sm font-medium resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeReturnModal}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold btn-gradient-emerald shadow-emerald-500/25 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>กำลังบันทึก...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>ยืนยันการคืน</span>
                      </>
                    )}
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
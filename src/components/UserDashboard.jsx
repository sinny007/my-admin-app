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
  ImageOff
} from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import ProfileModal from './ProfileModal';

const DEFAULT_API_URL = 
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_APPS_SCRIPT_URL) ||
  (typeof process !== 'undefined' && process.env && process.env.REACT_APP_APPS_SCRIPT_URL) ||
  "https://script.google.com/macros/s/AKfycbz1cDl0Je-RjFxboeoTY2NRLL3B71q0Tzl7JEpasaArwhhIzShHPPakZagGHft6p4x3rQ/exec";

// Helper: จัดรูปแบบวันที่ให้อ่านง่าย
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
  const [devices, setDevices] = useState([]);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // State สำหรับค้นหาและกรองอุปกรณ์
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');

  // State สำหรับ Modal การยืม
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [expectedReturnDate, setExpectedReturnDate] = useState('');

  // State สำหรับ Modal การคืน
  const [selectedTransToReturn, setSelectedTransToReturn] = useState(null);
  const [returnCondition, setReturnCondition] = useState('ปกติ');
  const [returnNote, setReturnNote] = useState('');

  // State สำหรับเช็คภาพเสีย
  const [failedImages, setFailedImages] = useState({});

  const isMounted = useRef(true);

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const response = await fetch(`${API_URL}?action=getData`);
      const rawText = await response.text();
      
      let data;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error("ตอบกลับจากเซิร์ฟเวอร์ไม่ถูกต้อง (ไม่ใช่ JSON)");
      }

      if (!isMounted.current) return;

      if (data.success || data.status === 'success') {
        setDevices(data.devices || []);
        setTransactions(data.transactions || []);
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

  useEffect(() => {
    isMounted.current = true;
    fetchData();
    return () => {
      isMounted.current = false;
    };
  }, [fetchData]);

  // Helper คำนวณวันล่วงหน้าสำหรับปุ่มด่วน
  const setQuickReturnDays = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setExpectedReturnDate(d.toISOString().split('T')[0]);
  };

  // ฟังก์ชันยืมอุปกรณ์
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
      expectedReturnDate: expectedReturnDate
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
      try {
        resData = JSON.parse(rawText);
      } catch {
        throw new Error("เกิดข้อผิดพลาดในการอ่านข้อมูลตอบกลับ");
      }

      if (!isMounted.current) return;

      if (resData.success || resData.status === 'success') {
        toast.success(`ทำรายการยืม "${selectedDevice.name}" สำเร็จเรียบร้อย!`);
        
        // ลูกเล่นพลุเฉลิมฉลอง
        try {
          confetti({
            particleCount: 90,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch {
          // ignore
        }

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

  // ฟังก์ชันคืนอุปกรณ์
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
      try {
        resData = JSON.parse(rawText);
      } catch {
        throw new Error("เกิดข้อผิดพลาดในการอ่านข้อมูลตอบกลับ");
      }

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

  const closeBorrowModal = () => {
    setSelectedDevice(null);
    setExpectedReturnDate('');
  };

  const closeReturnModal = () => {
    setSelectedTransToReturn(null);
    setReturnNote('');
    setReturnCondition('ปกติ');
  };

  const handleImageError = (id) => {
    setFailedImages(prev => ({ ...prev, [id]: true }));
  };

  // Safe Check สำหรับ Username Matching (เปรียบเทียบทั้ง username และ ชื่อ-นามสกุล)
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

  // Filter อุปกรณ์ตามการค้นหาและหมวดหมู่
  const filteredDevices = devices.filter(d => {
    const dName = String(d.name || '').toLowerCase();
    const dCode = String(d.id || d.code || '').toLowerCase();
    const matchesSearch = dName.includes(searchTerm.toLowerCase()) || dCode.includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'ทั้งหมด' || d.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // รวบรวมหมวดหมู่ที่มีทั้งหมด
  const categories = ['ทั้งหมด', ...new Set(devices.map(d => d.category).filter(Boolean))];

  // Helper สำหรับเช็ค Overdue
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20 selection:bg-indigo-500 selection:text-white">
      
      {/* Top Clean Navbar Header */}
      <header className="bg-white/95 text-slate-900 shadow-xs border-b border-slate-200/80 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl overflow-hidden border border-slate-200/90 shadow-xs bg-slate-50 shrink-0 ring-2 ring-indigo-50">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover object-top" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                  ระบบยืม-คืนอุปกรณ์ไอที
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">บริการยืม-คืนอุปกรณ์ออนไลน์สำหรับบุคลากรและเจ้าหน้าที่</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-0 pt-3 sm:pt-0 border-slate-100">
            <button
              type="button"
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/80 transition-all cursor-pointer group shadow-2xs active:scale-98"
              title="คลิกเพื่อแก้ไขข้อมูลโปรไฟล์และเปลี่ยนรหัสผ่าน"
            >
              <div className="w-6 h-6 rounded-full overflow-hidden border border-slate-200 shrink-0 ring-1 ring-indigo-400/20 bg-indigo-50 flex items-center justify-center">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="User" className="w-full h-full object-cover" />
                ) : (
                  <img src="/logo.png" alt="User" className="w-full h-full object-cover object-top" />
                )}
              </div>
              <div className="text-xs text-left">
                <span className="text-slate-500">ผู้ใช้งาน: </span>
                <strong className="text-slate-800 font-bold group-hover:text-indigo-600 transition-colors">
                  {user?.name || user?.username || 'ผู้ใช้งาน'}
                </strong>
                {user?.username && <span className="text-indigo-600 ml-1 font-mono">(@{user.username})</span>}
                <span className="text-[10px] text-slate-400 ml-1.5 group-hover:text-indigo-600">⚙️ โปรไฟล์</span>
              </div>
            </button>

            <button 
              type="button"
              onClick={onLogout} 
              className="bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 px-3 py-1.5 rounded-xl transition-all duration-150 text-xs font-semibold border border-slate-200 hover:border-rose-200 flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>ออกจากระบบ</span>
            </button>
          </div>

        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-8">
        
        {/* Loading Banner */}
        {loading && (
          <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 px-4 py-3 rounded-2xl flex items-center justify-center gap-2.5 text-xs sm:text-sm font-semibold animate-pulse shadow-sm">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            <span>กำลังดึงข้อมูลอุปกรณ์และประวัติล่าสุดจากเซิร์ฟเวอร์...</span>
          </div>
        )}

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between group">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">กำลังยืมอยู่</p>
              <h3 className="text-2xl sm:text-3xl font-black text-amber-600 mt-1 tracking-tight">
                {myActiveBorrows.length} 
                <span className="text-xs font-medium text-slate-500 ml-1.5">รายการ</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">อุปกรณ์ที่ยังไม่ได้ส่งคืน</p>
            </div>
            <div className="w-13 h-13 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center border border-amber-100 group-hover:scale-105 transition-transform">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between group">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">ประวัติการยืมทั้งหมด</p>
              <h3 className="text-2xl sm:text-3xl font-black text-indigo-600 mt-1 tracking-tight">
                {myHistory.length} 
                <span className="text-xs font-medium text-slate-500 ml-1.5">ครั้ง</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">รวมประวัติการใช้งานของคุณ</p>
            </div>
            <div className="w-13 h-13 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100 group-hover:scale-105 transition-transform">
              <History className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between group">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">อุปกรณ์พร้อมยืม</p>
              <h3 className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1 tracking-tight">
                {devices.filter(d => d.status === 'พร้อมใช้งาน').length} 
                <span className="text-xs font-medium text-slate-500 ml-1.5">ชิ้น</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">พร้อมให้เบิกยืมใช้งาน</p>
            </div>
            <div className="w-13 h-13 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100 group-hover:scale-105 transition-transform">
              <PackageCheck className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Section 1: รายการอุปกรณ์ที่กำลังยืมอยู่ */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl border border-amber-500/20">
                <Clock className="w-5 h-5" />
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                อุปกรณ์ที่ฉันกำลังยืมอยู่ ({myActiveBorrows.length})
              </h2>
            </div>
          </div>

          {myActiveBorrows.length === 0 ? (
            <div className="bg-white p-8 sm:p-10 text-center rounded-3xl border border-dashed border-slate-300 shadow-sm">
              <Boxes className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
              <p className="text-sm font-bold text-slate-700">ไม่มีรายการยืมที่ค้างอยู่</p>
              <p className="text-xs text-slate-400 mt-1">คุณสามารถเลือกดูและยืมอุปกรณ์ที่พร้อมใช้งานได้จากรายการด้านล่าง</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="px-5 py-4">รหัสรายการ</th>
                      <th className="px-5 py-4">ชื่ออุปกรณ์</th>
                      <th className="px-5 py-4">วันที่ยืม</th>
                      <th className="px-5 py-4">กำหนดคืน</th>
                      <th className="px-5 py-4 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {myActiveBorrows.map((t, idx) => {
                      const isOverdue = checkIsOverdue(t);
                      return (
                        <tr key={t.id || `${t.deviceId}-${idx}`} className={`hover:bg-slate-50/70 transition-colors ${isOverdue ? 'bg-rose-50/40' : ''}`}>
                          <td className="px-5 py-4 font-mono text-xs text-slate-400">{t.id || '-'}</td>
                          <td className="px-5 py-4 font-bold text-slate-900">{t.deviceName}</td>
                          <td className="px-5 py-4 text-slate-500 font-mono text-xs">{formatDisplayDate(t.borrowDate)}</td>
                          <td className="px-5 py-4">
                            <span className={isOverdue ? 'text-rose-600 font-bold flex items-center gap-1.5' : 'text-slate-700 font-mono text-xs'}>
                              {formatDisplayDate(t.expectedReturnDate)}
                              {isOverdue && (
                                <span className="inline-flex items-center gap-1 text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-extrabold uppercase">
                                  <AlertTriangle className="w-3 h-3" /> เกินกำหนด
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <button 
                              type="button"
                              onClick={() => setSelectedTransToReturn(t)}
                              className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 shadow-sm shadow-emerald-600/20 inline-flex items-center gap-1.5 cursor-pointer"
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

        {/* Section 2: รายการอุปกรณ์ทั้งหมดสำหรับยืม */}
        <section className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-xl border border-indigo-500/20">
                <Laptop className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  แคตตาล็อกอุปกรณ์ทั้งหมด
                </h2>
                <p className="text-xs text-slate-500">เลือกอุปกรณ์ที่ต้องการเพื่อทำรายการยืม</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative flex-1 sm:w-72">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="ค้นหาชื่อหรือรหัสอุปกรณ์..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all duration-200 font-medium"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Filter className="w-4 h-4" />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="pl-9 pr-8 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all duration-200 text-slate-700 font-medium cursor-pointer"
                >
                  {categories.map((cat, idx) => (
                    <option key={idx} value={cat}>{cat === 'ทั้งหมด' ? 'ทุกหมวดหมู่' : cat}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {filteredDevices.length === 0 ? (
            <div className="bg-white p-10 text-center rounded-3xl border border-slate-200 shadow-sm">
              <Boxes className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">ไม่พบอุปกรณ์ที่ตรงกับเงื่อนไข</p>
              <p className="text-xs text-slate-400 mt-1">ลองเปลี่ยนคำค้นหาหรือตัวกรองหมวดหมู่ใหม่อีกครั้ง</p>
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
                    className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm hover:shadow-xl hover:border-indigo-500/30 transition-all duration-300 flex flex-col justify-between group"
                  >
                    <div>
                      {/* Image Thumbnail with zoom effect */}
                      <div className="overflow-hidden rounded-2xl mb-4 bg-slate-100 h-44 flex items-center justify-center relative">
                        {device.imageUrl && !isImgFailed ? (
                          <img 
                            src={device.imageUrl} 
                            alt={device.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={() => handleImageError(deviceKey)}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-1.5 text-slate-400">
                            <ImageOff className="w-8 h-8 opacity-40" />
                            <span className="text-[11px] font-medium">ไม่มีภาพประกอบ</span>
                          </div>
                        )}

                        <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-sm backdrop-blur-md ${
                          isAvailable 
                            ? 'bg-emerald-500/90 text-white' 
                            : 'bg-rose-500/90 text-white'
                        }`}>
                          {device.status}
                        </span>
                      </div>

                      <div className="space-y-1 mb-3">
                        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold text-[10px] uppercase">
                            {device.category || 'IT Equipment'}
                          </span>
                          <span>•</span>
                          <span className="font-mono text-slate-500">{device.id || '-'}</span>
                        </div>
                        <h3 className="font-bold text-base text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors">
                          {device.name}
                        </h3>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-3.5 border-t border-slate-100">
                      {isAvailable ? (
                        <button 
                          type="button"
                          onClick={() => setSelectedDevice(device)}
                          className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 shadow-md shadow-indigo-500/20 flex items-center justify-center gap-1.5 active:scale-[0.98] cursor-pointer"
                        >
                          <Laptop className="w-4 h-4" />
                          <span>ทำรายการยืมอุปกรณ์นี้</span>
                        </button>
                      ) : (
                        <button 
                          type="button"
                          disabled 
                          className="w-full bg-slate-100 text-slate-400 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold cursor-not-allowed text-center"
                        >
                          อุปกรณ์ไม่พร้อมใช้งาน
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Section 3: ประวัติการยืม-คืนของฉัน */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-200 text-slate-700 rounded-xl">
              <History className="w-5 h-5" />
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              ประวัติการยืม-คืนของฉัน ({myHistory.length})
            </h2>
          </div>

          {myHistory.length === 0 ? (
            <div className="bg-white p-8 text-center rounded-3xl border border-slate-200 text-slate-400 text-xs sm:text-sm">
              ยังไม่มีประวัติการทำรายการยืม-คืนในบัญชีนี้
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="px-5 py-4">อุปกรณ์</th>
                      <th className="px-5 py-4">วันที่ยืม</th>
                      <th className="px-5 py-4">วันที่คืนจริง</th>
                      <th className="px-5 py-4">สถานะ / สภาพอุปกรณ์</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {myHistory.map((h, index) => (
                      <tr key={h.id || index} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-4 font-bold text-slate-900">{h.deviceName}</td>
                        <td className="px-5 py-4 text-slate-500 font-mono text-xs">{formatDisplayDate(h.borrowDate)}</td>
                        <td className="px-5 py-4 text-slate-500 font-mono text-xs">{formatDisplayDate(h.returnDate)}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                            ['returned', 'คืนแล้ว'].includes(h.status) || h.condition === 'ปกติ' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : h.condition 
                                ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                                : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}>
                            {['returned', 'คืนแล้ว'].includes(h.status) || h.condition === 'ปกติ' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
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

        {/* Branded Footer */}
        <footer className="pt-8 pb-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-sm border border-slate-200 shrink-0">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover object-top" />
            </div>
            <div>
              <p className="font-bold text-slate-700">ระบบยืม-คืนอุปกรณ์ไอที (IT Asset Management)</p>
              <p className="text-[11px] text-slate-400">ให้บริการและอำนวยความสะดวกแก่นักศึกษาและบุคลากร</p>
            </div>
          </div>
          <div className="text-center sm:text-right text-[11px] text-slate-400">
            © 2026 All Rights Reserved • IT Asset System
          </div>
        </footer>

      </main>

      {/* Modal 1: ฟอร์มยืมอุปกรณ์ (พร้อม Quick Date Picker) */}
      {selectedDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
            onClick={closeBorrowModal}
          />

          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-slate-100 z-10 animate-in fade-in zoom-in-95 duration-200">
            <button 
              type="button" 
              onClick={closeBorrowModal} 
              className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5 mb-5">
              <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-sm border border-indigo-100 shrink-0 ring-2 ring-indigo-500/10">
                <img src="/logo.png" alt="Logo" className="w-full h-full object-cover object-top" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">ทำรายการยืมอุปกรณ์</h3>
                <p className="text-xs text-slate-500">กรุณากำหนดวันส่งคืนเพื่อจองใช้งาน</p>
              </div>
            </div>

            {/* Selected Device Banner */}
            <div className="p-4 bg-slate-50 rounded-2xl mb-5 border border-slate-200/80">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">อุปกรณ์ที่เลือก</span>
              <p className="text-sm font-black text-indigo-600 mt-0.5">{selectedDevice.name}</p>
              <span className="text-xs text-slate-500">รหัส: {selectedDevice.id || selectedDevice.code || '-'}</span>
            </div>
            
            <form onSubmit={handleBorrow} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  <span>กำหนดวันที่ส่งคืน</span>
                  <span className="text-rose-500">*</span>
                </label>
                
                {/* Quick Date Select Buttons */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { label: '+3 วัน', days: 3 },
                    { label: '+7 วัน (1 สัปดาห์)', days: 7 },
                    { label: '+14 วัน (2 สัปดาห์)', days: 14 }
                  ].map((btn, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setQuickReturnDays(btn.days)}
                      className="py-1.5 px-2 bg-indigo-50/70 hover:bg-indigo-100 border border-indigo-200/70 text-indigo-700 rounded-xl text-[11px] font-bold transition cursor-pointer"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                <input 
                  type="date" 
                  required 
                  min={todayString} 
                  className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none text-slate-800 text-sm font-semibold transition duration-200 cursor-pointer" 
                  value={expectedReturnDate}
                  onChange={(e) => setExpectedReturnDate(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button 
                  type="button" 
                  onClick={closeBorrowModal} 
                  className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
                  disabled={submitting}
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-lg shadow-indigo-500/25 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>ยืนยันการยืม</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: ฟอร์มคืนอุปกรณ์ */}
      {selectedTransToReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
            onClick={closeReturnModal}
          />

          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-slate-100 z-10 animate-in fade-in zoom-in-95 duration-200">
            <button 
              type="button" 
              onClick={closeReturnModal} 
              className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5 mb-5">
              <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-sm border border-emerald-100 shrink-0 ring-2 ring-emerald-500/10">
                <img src="/logo.png" alt="Logo" className="w-full h-full object-cover object-top" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">ทำรายการคืนอุปกรณ์</h3>
                <p className="text-xs text-slate-500">ระบุสภาพอุปกรณ์เมื่อทำการส่งคืน</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl mb-5 border border-slate-200/80">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">อุปกรณ์ที่ส่งคืน</span>
              <p className="text-sm font-black text-emerald-600 mt-0.5">{selectedTransToReturn.deviceName}</p>
              <span className="text-xs text-slate-500">รหัสรายการ: {selectedTransToReturn.id || '-'}</span>
            </div>
            
            <form onSubmit={handleReturnDevice} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  สภาพอุปกรณ์ตอนส่งคืน
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setReturnCondition('ปกติ')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                      returnCondition === 'ปกติ'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>ปกติ (สมบูรณ์)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReturnCondition('ชำรุด/ส่งซ่อม')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                      returnCondition === 'ชำรุด/ส่งซ่อม'
                        ? 'bg-amber-50 border-amber-500 text-amber-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>ชำรุด / มีปัญหา</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span>หมายเหตุเพิ่มเติม (ถ้ามี)</span>
                </label>
                <textarea 
                  rows="3"
                  placeholder="ระบุเพิ่มเติม เช่น สายชาร์จมีรอยถลอก, หน้าจอมีรอยขีดข่วน..."
                  className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none text-slate-800 text-xs sm:text-sm font-medium transition duration-200"
                  value={returnNote}
                  onChange={(e) => setReturnNote(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button 
                  type="button" 
                  onClick={closeReturnModal} 
                  className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
                  disabled={submitting}
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-lg shadow-emerald-500/25 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>กำลังส่งข้อมูล...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>ยืนยันการคืน</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profile & Security Modal สำหรับ User */}
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
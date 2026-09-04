import React, { useState, useEffect, useRef } from 'react';
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
  User as UserIcon,
  X,
  FileText,
  Boxes,
  ImageOff
} from 'lucide-react';

const API_URL = 
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_APPS_SCRIPT_URL) ||
  (typeof process !== 'undefined' && process.env && process.env.REACT_APP_APPS_SCRIPT_URL) ||
  "https://script.google.com/macros/s/AKfycbwvgOZbVC1hLEoSpT0lzfsP3F98gWDed2xUXVHvIDVZ6q6YU_uqZfQPoCR7ooXoiaZufA/exec ";

export default function UserDashboard({ user, onLogout }) {
  const [devices, setDevices] = useState([]);
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

  useEffect(() => {
    isMounted.current = true;
    fetchData();
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?action=getData`);
      const rawText = await response.text();
      
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (e) {
        throw new Error("ตอบกลับจากเซิร์ฟเวอร์ไม่ถูกต้อง (ไม่ใช่ JSON)");
      }

      if (!isMounted.current) return;

      if (data.success || data.status === 'success') {
        setDevices(data.devices || []);
        setTransactions(data.transactions || []);
      } else {
        alert("เกิดข้อผิดพลาดในการโหลดข้อมูล: " + (data.message || "ไม่ทราบสาเหตุ"));
      }
    } catch (error) {
      console.error("Fetch Data Error:", error);
      if (isMounted.current) alert("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
    } fontFinally: {
      if (isMounted.current) setLoading(false);
    }
  };

  // ฟังก์ชันยืมอุปกรณ์
  const handleBorrow = async (e) => {
    e.preventDefault();
    if (!selectedDevice || !expectedReturnDate) {
      alert("กรุณาระบุวันที่กำหนดคืน");
      return;
    }

    setSubmitting(true);
    const deviceIdentifier = selectedDevice.code || selectedDevice.id || selectedDevice.deviceId;

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
      } catch (e) {
        throw new Error("เกิดข้อผิดพลาดในการอ่านข้อมูลตอบกลับ");
      }

      if (!isMounted.current) return;

      if (resData.success || resData.status === 'success') {
        alert("ทำรายการยืมสำเร็จ!");
        closeBorrowModal();
        fetchData();
      } else {
        alert("ยืมอุปกรณ์ไม่สำเร็จ: " + (resData.message || 'เกิดข้อผิดพลาด'));
      }
    } catch (error) {
      console.error("Borrow Error:", error);
      if (isMounted.current) alert("เกิดข้อผิดพลาดขณะยืมอุปกรณ์");
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
      } catch (e) {
        throw new Error("เกิดข้อผิดพลาดในการอ่านข้อมูลตอบกลับ");
      }

      if (!isMounted.current) return;

      if (resData.success || resData.status === 'success') {
        alert("คืนอุปกรณ์เรียบร้อยแล้ว!");
        closeReturnModal();
        fetchData();
      } else {
        alert("คืนอุปกรณ์ไม่สำเร็จ: " + (resData.message || 'เกิดข้อผิดพลาด'));
      }
    } catch (error) {
      console.error("Return Error:", error);
      if (isMounted.current) alert("เกิดข้อผิดพลาดขณะคืนอุปกรณ์");
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

  // Safe Check สำหรับ Username Matching
  const currentUsername = String(user?.username || '').toLowerCase();

  const myActiveBorrows = transactions.filter(t => {
    const itemUsername = String(t.username || '').toLowerCase();
    const isNotReturned = !t.returnDate || t.returnDate === '-' || t.returnDate === '';
    const isStatusBorrow = !['returned', 'คืนแล้ว'].includes(t.status);
    return itemUsername === currentUsername && isNotReturned && isStatusBorrow;
  });

  const myHistory = transactions.filter(t => {
    const itemUsername = String(t.username || '').toLowerCase();
    return itemUsername === currentUsername;
  });

  // Filter อุปกรณ์ตามการค้นหาและหมวดหมู่
  const filteredDevices = devices.filter(d => {
    const dName = String(d.name || '').toLowerCase();
    const dCode = String(d.code || d.id || '').toLowerCase();
    const matchesSearch = dName.includes(searchTerm.toLowerCase()) || dCode.includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'ทั้งหมด' || d.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // รวบรวมหมวดหมู่ที่มีทั้งหมด
  const categories = ['ทั้งหมด', ...new Set(devices.map(d => d.category).filter(Boolean))];

  // Helper สำหรับเช็ค Overdue อย่างแม่นยำ
  const checkIsOverdue = (trans) => {
    if (trans.isOverdue) return true;
    if (!trans.expectedReturnDate) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expDate = new Date(trans.expectedReturnDate);
    expDate.setHours(0, 0, 0, 0);

    return expDate < today;
  };

  // วันที่ปัจจุบันสำหรับ Limit การเลือกวันที่ยืม
  const todayString = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-slate-50/60 font-sans text-slate-800 pb-16">
      
      {/* Top Navbar Header */}
      <header className="bg-slate-900 text-white shadow-xl border-b border-indigo-900/50 sticky top-0 z-30 backdrop-blur-lg bg-slate-900/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/30 border border-indigo-500/30 rounded-2xl text-indigo-400">
              <Laptop className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
                ระบบยืม-คืนอุปกรณ์ IT
              </h1>
              <p className="text-xs text-slate-400">บริการยืมคืนอุปกรณ์ออนไลน์สำหรับบุคลากรและผู้ใช้งาน</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-0 pt-3 sm:pt-0 border-slate-800">
            <div className="flex items-center gap-2.5 bg-slate-800/80 px-3.5 py-1.5 rounded-full border border-slate-700/60">
              <div className="w-7 h-7 bg-indigo-500/20 text-indigo-300 rounded-full flex items-center justify-center font-bold text-xs border border-indigo-500/30">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="text-slate-400 block sm:inline">สวัสดี, </span>
                <strong className="text-white font-semibold">{user?.name || 'ผู้ใช้งาน'}</strong>
                {user?.username && <span className="text-indigo-300 ml-1">({user.username})</span>}
              </div>
            </div>

            <button 
              onClick={onLogout} 
              className="bg-rose-500/10 hover:bg-rose-600 text-rose-300 hover:text-white px-3.5 py-2 rounded-xl transition-all duration-200 text-xs font-semibold border border-rose-500/20 hover:border-rose-600 flex items-center gap-1.5 shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>ออกจากระบบ</span>
            </button>
          </div>

        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* Loading Banner */}
        {loading && (
          <div className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-3 rounded-2xl mb-6 flex items-center justify-center gap-2 text-sm font-medium animate-pulse shadow-sm">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            <span>กำลังดึงข้อมูลล่าสุดจากระบบ...</span>
          </div>
        )}

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">กำลังยืมอยู่</p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">{myActiveBorrows.length} <span className="text-xs font-normal text-slate-500">รายการ</span></h3>
            </div>
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">ประวัติการยืมทั้งหมด</p>
              <h3 className="text-2xl font-bold text-indigo-600 mt-1">{myHistory.length} <span className="text-xs font-normal text-slate-500">ครั้ง</span></h3>
            </div>
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
              <History className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">อุปกรณ์พร้อมยืม</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                {devices.filter(d => d.status === 'พร้อมใช้งาน').length} <span className="text-xs font-normal text-slate-500">ชิ้น</span>
              </h3>
            </div>
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
              <PackageCheck className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Section 1: รายการอุปกรณ์ที่กำลังยืมอยู่ */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              อุปกรณ์ที่ฉันกำลังยืมอยู่ ({myActiveBorrows.length})
            </h2>
          </div>

          {myActiveBorrows.length === 0 ? (
            <div className="bg-white p-8 text-center text-slate-500 rounded-2xl border border-dashed border-slate-300 shadow-sm">
              <Boxes className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm">ไม่มีรายการยืมที่ค้างอยู่ สามารถเลือกยืมอุปกรณ์จากรายการด้านล่างได้ทันที</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50/80">
                    <tr>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">รหัสรายการ</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">ชื่ออุปกรณ์</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">วันที่ยืม</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">กำหนดคืน</th>
                      <th className="px-5 py-3.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {myActiveBorrows.map((t, idx) => {
                      const isOverdue = checkIsOverdue(t);
                      return (
                        <tr key={t.id || `${t.deviceId}-${idx}`} className={`hover:bg-slate-50/80 transition-colors ${isOverdue ? 'bg-rose-50/30' : ''}`}>
                          <td className="px-5 py-4 font-mono text-xs text-slate-500">{t.id || '-'}</td>
                          <td className="px-5 py-4 font-semibold text-slate-900">{t.deviceName}</td>
                          <td className="px-5 py-4 text-slate-600">{t.borrowDate}</td>
                          <td className="px-5 py-4 font-semibold">
                            <span className={isOverdue ? 'text-rose-600 flex items-center gap-1.5' : 'text-slate-700'}>
                              {t.expectedReturnDate || '-'}
                              {isOverdue && (
                                <span className="inline-flex items-center gap-1 text-[11px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-md font-medium">
                                  <AlertTriangle className="w-3 h-3" /> เกินกำหนด
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <button 
                              onClick={() => setSelectedTransToReturn(t)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 shadow-sm shadow-emerald-600/20 inline-flex items-center gap-1.5"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>กดคืนอุปกรณ์</span>
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

        {/* Section 2: รายการอุปกรณ์ทั้งหมดที่พร้อมให้ยืม */}
        <section className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-xl">
                <Laptop className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">
                รายการอุปกรณ์ในระบบ
              </h2>
            </div>

            {/* Search & Filter Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative flex-1 sm:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="ค้นหาชื่อหรือรหัส..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all duration-200"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Filter className="w-4 h-4" />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="pl-9 pr-8 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all duration-200 appearance-none text-slate-700"
                >
                  {categories.map((cat, idx) => (
                    <option key={idx} value={cat}>{cat === 'ทั้งหมด' ? 'ทุกหมวดหมู่' : cat}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {filteredDevices.length === 0 ? (
            <div className="bg-white p-8 text-center text-slate-500 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-sm">ไม่พบอุปกรณ์ที่ตรงกับเงื่อนไขการค้นหา</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDevices.map((device, index) => {
                const deviceKey = device.code || device.id || device.deviceId || index;
                const isAvailable = device.status === 'พร้อมใช้งาน';
                const isImgFailed = failedImages[deviceKey];

                return (
                  <div key={deviceKey} className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
                    <div>
                      {/* จัดการแสดงผล Image Fallback */}
                      <div className="overflow-hidden rounded-xl mb-3.5 bg-slate-100 h-40 flex items-center justify-center text-slate-400">
                        {device.imageUrl && !isImgFailed ? (
                          <img 
                            src={device.imageUrl} 
                            alt={device.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={() => handleImageError(deviceKey)}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-1.5 text-slate-400">
                            <ImageOff className="w-8 h-8 opacity-50" />
                            <span className="text-[11px]">ไม่มีรูปภาพ</span>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-between items-start gap-2 mb-2">
                        <h3 className="font-bold text-base text-slate-800 leading-snug">{device.name}</h3>
                        <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold whitespace-nowrap ${
                          isAvailable ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                        }`}>
                          {device.status}
                        </span>
                      </div>
                      <div className="space-y-1 text-xs text-slate-500">
                        <p>รหัส: <span className="font-mono text-slate-700">{device.code || device.id || '-'}</span></p>
                        <p>หมวดหมู่: <span className="text-slate-700">{device.category || '-'}</span></p>
                      </div>
                    </div>
                    
                    <div className="mt-5 pt-3.5 border-t border-slate-100 flex justify-end">
                      {isAvailable ? (
                        <button 
                          onClick={() => setSelectedDevice(device)}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 shadow-md shadow-indigo-500/20 flex items-center justify-center gap-1.5 active:scale-[0.98]"
                        >
                          <Laptop className="w-4 h-4" />
                          <span>ยืมอุปกรณ์นี้</span>
                        </button>
                      ) : (
                        <button 
                          disabled 
                          className="w-full bg-slate-100 text-slate-400 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-medium cursor-not-allowed text-center"
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

        {/* Section 3: ประวัติการยืม-คืนทั้งหมดของผู้ใช้ */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-slate-500/10 text-slate-600 rounded-xl">
              <History className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              ประวัติการยืม-คืนของฉัน ({myHistory.length})
            </h2>
          </div>

          {myHistory.length === 0 ? (
            <p className="text-slate-400 text-sm italic">ยังไม่มีประวัติการทำรายการ</p>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50/80">
                    <tr>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">อุปกรณ์</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">วันที่ยืม</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">วันที่คืนจริง</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">สภาพหลังคืน / สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {myHistory.map((h, index) => (
                      <tr key={h.id || index} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-4 font-semibold text-slate-800">{h.deviceName}</td>
                        <td className="px-5 py-4 text-slate-600">{h.borrowDate}</td>
                        <td className="px-5 py-4 text-slate-600">{h.returnDate || '-'}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold ${
                            ['returned', 'คืนแล้ว'].includes(h.status) || h.condition === 'ปกติ' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' 
                              : h.condition 
                                ? 'bg-amber-50 text-amber-700 border border-amber-200/60' 
                                : 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                          }`}>
                            {['returned', 'คืนแล้ว'].includes(h.status) || h.condition === 'ปกติ' ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : null}
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

      </main>

      {/* Modal 1: ฟอร์มยืมอุปกรณ์ */}
      {selectedDevice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 max-w-md w-full border border-slate-100 relative">
            <button 
              type="button" 
              onClick={closeBorrowModal} 
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Laptop className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">ทำรายการยืมอุปกรณ์</h3>
                <p className="text-xs text-slate-500">กรุณาระบุวันที่ต้องการส่งคืน</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl mb-5 border border-slate-100">
              <p className="text-xs text-slate-500">อุปกรณ์ที่เลือก</p>
              <p className="text-sm font-bold text-indigo-600 mt-0.5">{selectedDevice.name}</p>
            </div>
            
            <form onSubmit={handleBorrow}>
              <div className="mb-6">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>ระบุวันที่กำหนดคืน</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="date" 
                  required 
                  min={todayString} 
                  className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none text-slate-800 text-sm transition duration-200" 
                  value={expectedReturnDate}
                  onChange={(e) => setExpectedReturnDate(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2.5">
                <button 
                  type="button" 
                  onClick={closeBorrowModal} 
                  className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-xs font-semibold transition"
                  disabled={submitting}
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-indigo-500/25 disabled:bg-indigo-300 flex items-center gap-1.5"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <span>ยืนยันการยืม</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: ฟอร์มคืนอุปกรณ์ */}
      {selectedTransToReturn && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 max-w-md w-full border border-slate-100 relative">
            <button 
              type="button" 
              onClick={closeReturnModal} 
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">ทำรายการคืนอุปกรณ์</h3>
                <p className="text-xs text-slate-500">ระบุรายละเอียดสภาพอุปกรณ์เมื่อส่งคืน</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl mb-5 border border-slate-100">
              <p className="text-xs text-slate-500">อุปกรณ์ที่ส่งคืน</p>
              <p className="text-sm font-bold text-emerald-600 mt-0.5">{selectedTransToReturn.deviceName}</p>
            </div>
            
            <form onSubmit={handleReturnDevice}>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">สภาพอุปกรณ์ตอนส่งคืน</label>
                <select 
                  className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none bg-white text-slate-800 text-sm transition duration-200"
                  value={returnCondition}
                  onChange={(e) => setReturnCondition(e.target.value)}
                >
                  <option value="ปกติ">ปกติ (ใช้งานได้ดี)</option>
                  <option value="ชำรุด/ส่งซ่อม">ชำรุด / มีปัญหา</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span>หมายเหตุเพิ่มเติม (ถ้ามี)</span>
                </label>
                <textarea 
                  rows="3"
                  className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none text-slate-800 text-sm transition duration-200"
                  placeholder="เช่น สายชาร์จหลวม, มีรอยขีดข่วน"
                  value={returnNote}
                  onChange={(e) => setReturnNote(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2.5">
                <button 
                  type="button" 
                  onClick={closeReturnModal} 
                  className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-xs font-semibold transition"
                  disabled={submitting}
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-emerald-500/25 disabled:bg-emerald-300 flex items-center gap-1.5"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <span>ยืนยันการคืน</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
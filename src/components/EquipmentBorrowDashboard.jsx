import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, RefreshCw, Layers, Clock,
  CheckCircle2, XCircle, Search, Filter,
  ChevronDown, X, FilePlus2, Inbox, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import ConfirmModal from './ConfirmModal';

/**
 * EquipmentBorrowDashboard — ระบบจัดการยืม-คืนอุปกรณ์แบบ Real-time
 * เชื่อมต่อ Google Apps Script API จริง (ไม่ใช้ Mock Data)
 *
 * Props:
 *   user    — ข้อมูล user ที่ login อยู่ (จาก App.jsx)
 *   apiUrl  — URL ของ Google Apps Script
 */
export default function EquipmentBorrowDashboard({ user, apiUrl }) {
  // ─── State ─────────────────────────────────────────────────────────────
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);       // loading ครั้งแรก
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [formData, setFormData] = useState({ name: '', item: '', returnDate: '' });

  // state สำหรับ ConfirmModal คืนอุปกรณ์
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'ยืนยัน',
    variant: 'primary',
    onConfirm: () => {},
  });
  const [confirmLoading, setConfirmLoading] = useState(false);

  // ─── API Helpers ────────────────────────────────────────────────────────
  const getApi = useCallback(async (params = {}) => {
    const url = new URL(apiUrl);
    Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
    const res = await fetch(url.toString(), { redirect: 'follow' });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('รูปแบบข้อมูลจากเซิร์ฟเวอร์ไม่ถูกต้อง');
    }
  }, [apiUrl]);

  const postApi = useCallback(async (payload) => {
    const fullPayload = {
      ...payload,
      userRole: user?.role || 'user',
      username: user?.username || user?.name || '',
    };
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(fullPayload),
      redirect: 'follow',
    });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('รูปแบบข้อมูลจากเซิร์ฟเวอร์ไม่ถูกต้อง');
    }
  }, [apiUrl, user]);

  // ─── Fetch Data ─────────────────────────────────────────────────────────
  const fetchRecords = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setIsRefreshing(true);
    try {
      const data = await getApi({ action: 'getBorrowRecords' });
      if (data.success || data.status === 'success') {
        setRecords(data.records || data.borrowRecords || []);
        if (isSilent) toast.success('อัปเดตข้อมูลล่าสุดเรียบร้อยแล้ว');
      } else {
        toast.error(data.message || 'ไม่สามารถโหลดข้อมูลได้');
      }
    } catch (err) {
      console.error('[EquipmentBorrowDashboard] fetchRecords:', err);
      toast.error('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [getApi]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // ─── Stats ──────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: records.length,
    borrowed: records.filter(r => r.status === 'BORROWED').length,
    returned: records.filter(r => r.status === 'RETURNED').length,
    canceled: records.filter(r => r.status === 'CANCELED').length,
  }), [records]);

  // ─── Filtered Data ──────────────────────────────────────────────────────
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchesSearch =
        String(r.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(r.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(r.item || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [records, searchTerm, statusFilter]);

  // ─── Handlers ───────────────────────────────────────────────────────────

  // เพิ่มรายการยืมใหม่ → POST ไป API
  const handleAddBorrow = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.item.trim() || !formData.returnDate) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    setIsSubmitting(true);
    try {
      const data = await postApi({
        action: 'addBorrowRecord',
        borrowerName: formData.name.trim(),
        itemName: formData.item.trim(),
        returnDate: formData.returnDate,
        borrowDate: new Date().toISOString().split('T')[0],
      });

      if (data.success || data.status === 'success') {
        toast.success(`บันทึกการยืม "${formData.item}" เรียบร้อยแล้ว`);
        setFormData({ name: '', item: '', returnDate: '' });
        setIsModalOpen(false);
        fetchRecords(true);
      } else {
        toast.error(data.message || 'เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch (err) {
      console.error('[EquipmentBorrowDashboard] handleAddBorrow:', err);
      toast.error('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  // กดปุ่มส่งคืน → เปิด ConfirmModal ก่อน
  const promptReturn = (record) => {
    setConfirmState({
      isOpen: true,
      title: 'ยืนยันการส่งคืนอุปกรณ์',
      message: `คุณต้องการบันทึกการส่งคืน "${record.item}" ของ ${record.name} หรือไม่?`,
      confirmText: 'ยืนยันส่งคืน',
      variant: 'primary',
      onConfirm: () => handleConfirmReturn(record.id),
    });
  };

  // ยืนยันส่งคืน → POST ไป API
  const handleConfirmReturn = async (id) => {
    setConfirmLoading(true);
    try {
      const data = await postApi({
        action: 'returnBorrowRecord',
        recordId: id,
      });

      if (data.success || data.status === 'success') {
        toast.success('บันทึกการส่งคืนอุปกรณ์เรียบร้อยแล้ว');
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        fetchRecords(true);
      } else {
        toast.error(data.message || 'เกิดข้อผิดพลาดในการส่งคืน');
      }
    } catch (err) {
      console.error('[EquipmentBorrowDashboard] handleConfirmReturn:', err);
      toast.error('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    } finally {
      setConfirmLoading(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="bg-slate-50 text-slate-800 min-h-screen pb-12 antialiased font-sans">

      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-6 px-4 mb-8 shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden shadow-md shadow-indigo-100 border border-slate-200 shrink-0">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover object-top" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">ระบบจัดการยืม-คืนอุปกรณ์</h1>
              <p className="text-xs text-slate-500">เชื่อมต่อ Google Sheets API แบบ Real-time</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => fetchRecords(true)}
              disabled={isRefreshing}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-4 py-2.5 rounded-xl transition text-sm disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>รีเฟรชข้อมูล</span>
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2.5 rounded-xl shadow-sm shadow-indigo-200 transition text-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>ยืมอุปกรณ์</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 space-y-6">

        {/* Stats Grid — Skeleton or Real */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
              <StatCard title="รายการทั้งหมด" value={stats.total} icon={Layers} color="slate" />
              <StatCard title="กำลังยืมอยู่" value={stats.borrowed} icon={Clock} color="amber" />
              <StatCard title="คืนแล้ว" value={stats.returned} icon={CheckCircle2} color="emerald" />
              <StatCard title="ยกเลิก" value={stats.canceled} icon={XCircle} color="rose" />
            </>
          )}
        </div>

        {/* Controls */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหารหัส, ชื่อผู้ยืม, อุปกรณ์..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition"
            />
          </div>

          <div className="relative w-full sm:w-48">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none appearance-none transition text-slate-700"
            >
              <option value="ALL">สถานะทั้งหมด</option>
              <option value="BORROWED">กำลังยืมอยู่</option>
              <option value="RETURNED">คืนแล้ว</option>
              <option value="CANCELED">ยกเลิก</option>
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-4 px-6">รหัสรายการ</th>
                  <th className="py-4 px-6">ผู้ยืม</th>
                  <th className="py-4 px-6">อุปกรณ์</th>
                  <th className="py-4 px-6">วันที่ยืม</th>
                  <th className="py-4 px-6">กำหนดคืน</th>
                  <th className="py-4 px-6 text-center">สถานะ</th>
                  <th className="py-4 px-6 text-center">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {loading ? (
                  // Skeleton rows
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <td key={j} className="py-4 px-6">
                          <div className="h-4 bg-slate-100 rounded-full animate-pulse" style={{ width: j === 6 ? '60px' : '100%' }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-16 text-center text-slate-400">
                      <Inbox className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                      <p className="font-medium">ไม่พบรายการข้อมูลที่ค้นหา</p>
                      <p className="text-xs mt-1 text-slate-300">ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะ</p>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-4 px-6 font-semibold text-slate-900">{item.id}</td>
                      <td className="py-4 px-6">{item.name}</td>
                      <td className="py-4 px-6 font-medium text-slate-800">{item.item}</td>
                      <td className="py-4 px-6 text-slate-500 text-xs">{item.borrowDate}</td>
                      <td className="py-4 px-6 text-slate-500 text-xs">{item.returnDate}</td>
                      <td className="py-4 px-6 text-center">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="py-4 px-6 text-center">
                        {item.status === 'BORROWED' ? (
                          <button
                            onClick={() => promptReturn(item)}
                            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-medium shadow-sm transition cursor-pointer"
                          >
                            ส่งคืน
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add Borrow Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <FilePlus2 className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">บันทึกการยืมอุปกรณ์</h3>
              </div>
              <button
                onClick={() => { setIsModalOpen(false); setFormData({ name: '', item: '', returnDate: '' }); }}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBorrow} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">ชื่อ-นามสกุล ผู้ยืม</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="เช่น นายสมชาย ใจดี"
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">ชื่ออุปกรณ์ / รหัสครุภัณฑ์</label>
                <input
                  type="text"
                  required
                  value={formData.item}
                  onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                  placeholder="เช่น โน๊ตบุ๊ค Dell, กล้อง Canon"
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">กำหนดคืน</label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={formData.returnDate}
                  onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setFormData({ name: '', item: '', returnDate: '' }); }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-xl shadow-sm shadow-indigo-100 transition flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : 'บันทึกข้อมูล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Return Modal */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={() => !confirmLoading && setConfirmState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        variant={confirmState.variant}
        loading={confirmLoading}
      />
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function StatCard({ title, value, icon: Icon, color }) {
  const colorClasses = {
    slate: 'bg-slate-100 text-slate-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
  };
  const textClasses = {
    slate: 'text-slate-900',
    amber: 'text-amber-600',
    emerald: 'text-emerald-600',
    rose: 'text-rose-600',
  };
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
      <div className="space-y-1">
        <span className={`text-xs font-medium ${textClasses[color]}`}>{title}</span>
        <h3 className={`text-2xl font-bold ${textClasses[color]}`}>{value}</h3>
      </div>
      <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between animate-pulse">
      <div className="space-y-2">
        <div className="h-3 w-20 bg-slate-100 rounded-full" />
        <div className="h-7 w-12 bg-slate-100 rounded-full" />
      </div>
      <div className="p-3 rounded-xl bg-slate-100 w-11 h-11" />
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === 'BORROWED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/60">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />กำลังยืมอยู่
      </span>
    );
  }
  if (status === 'RETURNED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />คืนแล้ว
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200/60">
      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />ยกเลิก
    </span>
  );
}

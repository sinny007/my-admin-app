import React, { useState, useMemo } from 'react';
import { 
  Box, Plus, RefreshCw, Layers, Clock, 
  CheckCircle2, XCircle, Search, Filter, 
  ChevronDown, X, FilePlus2, Inbox 
} from 'lucide-react';

export default function EquipmentBorrowDashboard() {
  // Mock Data
  const [records, setRecords] = useState([
    { id: "BR-001", name: "สมชาย ใจดี", item: "Arduino Uno R3 Kit", borrowDate: "2026-08-20", returnDate: "2026-08-27", status: "BORROWED" },
    { id: "BR-002", name: "วิภาดา รักเรียน", item: "Multimeter Digital", borrowDate: "2026-08-18", returnDate: "2026-08-25", status: "RETURNED" },
    { id: "BR-003", name: "กิตติพงษ์ มั่นคง", item: "ESP8266 NodeMCU", borrowDate: "2026-08-15", returnDate: "2026-08-22", status: "CANCELED" },
    { id: "BR-004", name: "ณิชา พัฒนากุล", item: "Oscilloscope 50MHz", borrowDate: "2026-08-21", returnDate: "2026-08-28", status: "BORROWED" }
  ]);

  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [formData, setFormData] = useState({ name: '', item: '', returnDate: '' });

  // Calculations (Stats)
  const stats = useMemo(() => ({
    total: records.length,
    borrowed: records.filter(r => r.status === 'BORROWED').length,
    returned: records.filter(r => r.status === 'RETURNED').length,
    canceled: records.filter(r => r.status === 'CANCELED').length,
  }), [records]);

  // Filtered Data
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchesSearch = r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            r.item.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [records, searchTerm, statusFilter]);

  // Handlers
  const handleReturn = (id) => {
    setRecords(prev => prev.map(item => item.id === id ? { ...item, status: 'RETURNED' } : item));
  };

  const handleAddBorrow = (e) => {
    e.preventDefault();
    const newRecord = {
      id: `BR-00${records.length + 1}`,
      name: formData.name,
      item: formData.item,
      borrowDate: new Date().toISOString().split('T')[0],
      returnDate: formData.returnDate,
      status: 'BORROWED'
    };
    setRecords([newRecord, ...records]);
    setFormData({ name: '', item: '', returnDate: '' });
    setIsModalOpen(false);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className="bg-slate-50 text-slate-800 min-h-screen pb-12 antialiased font-sans">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-6 px-4 mb-8 shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-100">
              <Box className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">ระบบจัดการยืม-คืนอุปกรณ์</h1>
              <p className="text-xs text-slate-500">React UI Component</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button 
              onClick={handleRefresh}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-4 py-2.5 rounded-xl transition text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>รีเฟรช UI</span>
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2.5 rounded-xl shadow-sm shadow-indigo-200 transition text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>ยืมอุปกรณ์</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 space-y-6">

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="รายการทั้งหมด" value={stats.total} icon={Layers} color="slate" />
          <StatCard title="กำลังยืมอยู่" value={stats.borrowed} icon={Clock} color="amber" />
          <StatCard title="คืนแล้ว" value={stats.returned} icon={CheckCircle2} color="emerald" />
          <StatCard title="ยกเลิก" value={stats.canceled} icon={XCircle} color="rose" />
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
                <tr class="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
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
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400">
                      <Inbox className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p>ไม่พบรายการข้อมูลที่ค้นหา</p>
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
                            onClick={() => handleReturn(item.id)}
                            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-medium shadow-sm transition"
                          >
                            ส่งคืน
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
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

      {/* Modal */}
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
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition">
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
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
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
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">กำหนดคืน</label>
                <input 
                  type="date" 
                  required 
                  value={formData.returnDate}
                  onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition">ยกเลิก</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-100 transition">บันทึกข้อมูล</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-components
function StatCard({ title, value, icon: Icon, color }) {
  const colorClasses = {
    slate: 'bg-slate-100 text-slate-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600'
  };

  const textClasses = {
    slate: 'text-slate-900',
    amber: 'text-amber-600',
    emerald: 'text-emerald-600',
    rose: 'text-rose-600'
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

function StatusBadge({ status }) {
  if (status === 'BORROWED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/60">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>กำลังยืมอยู่
      </span>
    );
  }
  if (status === 'RETURNED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>คืนแล้ว
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200/60">
      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>ยกเลิก
    </span>
  );
}
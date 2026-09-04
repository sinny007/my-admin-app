import React, { useState, useEffect, useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// ตั้งค่า URL ของ Apps Script
const APPS_SCRIPT_URL = 
  import.meta.env.VITE_APPS_SCRIPT_URL || 
  "https://script.google.com/macros/s/AKfycbwvgOZbVC1hLEoSpT0lzfsP3F98gWDed2xUXVHvIDVZ6q6YU_uqZfQPoCR7ooXoiaZufA/exec";

// Utility แปลงวันที่
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const parsedDate = new Date(dateStr);
  return isNaN(parsedDate.getTime()) ? dateStr : parsedDate.toLocaleDateString('th-TH');
};

export default function AdminDashboard({ user, onLogout }) {
  const [devices, setDevices] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('devices');

  const [newDevice, setNewDevice] = useState({
    name: '',
    category: 'Laptop',
    status: 'พร้อมใช้งาน',
    imageUrl: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ทั้งหมด');
  const [statusFilter, setStatusFilter] = useState('ทั้งหมด');

  // ดึงสิทธิ์ User Role จาก Props (Default เป็น 'admin')
  const currentRole = user?.role || 'admin';

  // ดึงข้อมูลทั้งหมดจาก Google Apps Script
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?action=getData&role=${currentRole}`, { 
        redirect: 'follow' 
      });
      const data = await res.json();
      if (data.status === 'success' || data.success) {
        setDevices(data.devices || []);
        setTransactions(data.transactions || []);
      } else {
        alert(`ข้อผิดพลาดจากเซิร์ฟเวอร์: ${data.message || 'ไม่ทราบสาเหตุ'}`);
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย');
    } finally {
      setLoading(false);
    }
  }, [currentRole]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Helper สำหรับทำ POST request โดยแนบ userRole ไปด้วยเสมอ
  const postToAppsScript = async (payload) => {
    const fullPayload = {
      ...payload,
      userRole: currentRole, // แนบสิทธิ์ admin ไปให้ Apps Script ตรวจสอบ
      username: user?.username || user?.name || 'admin'
    };

    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(fullPayload),
      redirect: 'follow'
    });
    return res.json();
  };

  // เพิ่มอุปกรณ์ใหม่
  const handleAddDevice = async (e) => {
    e.preventDefault();
    if (!newDevice.name.trim()) return alert('กรุณากรอกชื่ออุปกรณ์');

    setLoading(true);
    try {
      const data = await postToAppsScript({
        action: 'add_device',
        name: newDevice.name.trim(),
        category: newDevice.category,
        status: newDevice.status,
        imageUrl: newDevice.imageUrl.trim() || 'https://via.placeholder.com/150?text=No+Image'
      });

      if (data.status === 'success' || data.success) {
        alert('เพิ่มอุปกรณ์สำเร็จ!');
        setNewDevice({ name: '', category: 'Laptop', status: 'พร้อมใช้งาน', imageUrl: '' });
        fetchData();
      } else {
        alert(data.message || 'เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการส่งข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  // รับคืนอุปกรณ์
  const handleReturnDevice = async (transaction) => {
    if (!window.confirm(`ยืนยันการรับคืนอุปกรณ์ "${transaction.deviceName}" จากคุณ ${transaction.username} ?`)) {
      return;
    }

    setLoading(true);
    try {
      const data = await postToAppsScript({
        action: 'return_device',
        transId: transaction.id,
        deviceId: transaction.deviceId
      });

      if (data.status === 'success' || data.success) {
        alert('รับคืนอุปกรณ์สำเร็จ!');
        fetchData();
      } else {
        alert(data.message || 'เกิดข้อผิดพลาดในการคืนอุปกรณ์');
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการส่งข้อมูลคืนอุปกรณ์');
    } finally {
      setLoading(false);
    }
  };

  // ลบอุปกรณ์
  const handleDeleteDevice = async (deviceId, deviceName) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ที่จะลบอุปกรณ์ "${deviceName}" (ID: ${deviceId}) ?`)) {
      return;
    }

    setLoading(true);
    try {
      const data = await postToAppsScript({
        action: 'delete_device',
        deviceId: deviceId
      });

      if (data.status === 'success' || data.success) {
        alert('ลบอุปกรณ์เรียบร้อยแล้ว');
        fetchData();
      } else {
        alert(data.message || 'ไม่สามารถลบอุปกรณ์ได้');
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการส่งข้อมูลลบอุปกรณ์');
    } finally {
      setLoading(false);
    }
  };

  // Filter อุปกรณ์
  const filteredDevices = devices.filter(d => {
    const deviceName = d.name ? String(d.name).toLowerCase() : '';
    const deviceId = d.id ? String(d.id).toLowerCase() : '';
    const matchSearch = deviceName.includes(searchTerm.toLowerCase()) || deviceId.includes(searchTerm.toLowerCase());
    const matchCategory = categoryFilter === 'ทั้งหมด' || d.category === categoryFilter;
    const matchStatus = statusFilter === 'ทั้งหมด' || d.status === statusFilter;
    return matchSearch && matchCategory && matchStatus;
  });

  const borrowedTransactions = transactions.filter(t => 
    ['borrowed', 'ถูกยืม', 'กำลังยืม'].includes(t.status)
  );

  const overdueCount = borrowedTransactions.filter(t => t.isOverdue).length;

  // Export ทะเบียนอุปกรณ์เป็น Excel
  const exportDevicesToExcel = () => {
    const formattedData = filteredDevices.map(item => ({
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
  };

  // Export ทะเบียนอุปกรณ์เป็น PDF
  const exportDevicesToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("IT Devices Master List Report", 14, 15);

    const tableColumn = ["Device ID", "Device Name", "Category", "Status"];
    const tableRows = filteredDevices.map(item => [
      String(item.id || '-'),
      String(item.name || '-'),
      String(item.category || '-'),
      String(item.status || '-')
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 25,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] }
    });

    doc.save(`IT_Devices_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Export ประวัติการยืมคืนเป็น Excel
  const exportTransactionsToExcel = () => {
    const formattedData = transactions.map(item => ({
      "รหัสธุรกรรม": item.id || '-',
      "รหัสอุปกรณ์": item.deviceId || '-',
      "ชื่ออุปกรณ์": item.deviceName || '-',
      "ผู้ยืม": item.username || '-',
      "วันที่ยืม": formatDate(item.borrowDate),
      "กำหนดคืน": formatDate(item.expectedReturnDate),
      "วันที่คืนจริง": formatDate(item.returnDate),
      "สถานะ": ['returned', 'คืนแล้ว'].includes(item.status) ? 'คืนแล้ว' : (item.isOverdue ? 'เกินกำหนดคืน' : 'กำลังยืม')
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
    XLSX.writeFile(workbook, `รายงานการยืมคืน_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export ประวัติการยืมคืนเป็น PDF
  const exportTransactionsToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("IT Equipment Borrowing & Returning Report", 14, 15);

    const tableColumn = ["ID", "Device Name", "User", "Borrow Date", "Expected Return", "Status"];
    const tableRows = transactions.map(item => [
      String(item.id || '-'),
      String(item.deviceName || '-'),
      String(item.username || '-'),
      formatDate(item.borrowDate),
      formatDate(item.expectedReturnDate),
      ['returned', 'คืนแล้ว'].includes(item.status) ? 'Returned' : (item.isOverdue ? 'Overdue' : 'Borrowed')
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 25,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] }
    });

    doc.save(`Borrow_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 md:p-8 font-sans selection:bg-sky-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Bar */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-md shadow-xl">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span className="p-2 bg-sky-500/10 rounded-xl border border-sky-500/20 text-sky-400">💻</span>
              IT Equipment System
            </h1>
            <p className="text-xs md:text-sm text-slate-400">ระบบจัดการและติดตามอุปกรณ์ไอทีสำหรับผู้ดูแลระบบ</p>
          </div>
          
          <div className="flex items-center gap-3 self-end md:self-auto">
            <div className="bg-slate-800/80 border border-slate-700/60 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2.5 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-200">{user?.name || 'แอดมิน'}</span>
              <span className="bg-sky-500/15 text-sky-400 border border-sky-500/30 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold">Admin</span>
            </div>
            <button
              onClick={onLogout}
              className="bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20 hover:border-red-600 px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-95 shadow-lg shadow-red-950/20"
            >
              🚪 ออกจากระบบ
            </button>
          </div>
        </header>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 shadow-lg relative overflow-hidden group hover:border-sky-500/30 transition-all duration-300">
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">อุปกรณ์ทั้งหมด</p>
            <p className="text-3xl font-black text-sky-400 mt-2">{devices.length}</p>
          </div>

          <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 shadow-lg relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-300">
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">พร้อมใช้งาน</p>
            <p className="text-3xl font-black text-emerald-400 mt-2">
              {devices.filter(d => d.status === 'พร้อมใช้งาน').length}
            </p>
          </div>

          <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 shadow-lg relative overflow-hidden group hover:border-amber-500/30 transition-all duration-300">
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">กำลังถูกยืม</p>
            <p className="text-3xl font-black text-amber-400 mt-2">{borrowedTransactions.length}</p>
          </div>

          <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 shadow-lg relative overflow-hidden group hover:border-rose-500/30 transition-all duration-300">
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">เกินกำหนดคืน</p>
            <p className="text-3xl font-black text-rose-400 mt-2">{overdueCount}</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 p-1.5 bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-x-auto">
          {[
            { key: 'devices', label: `📱 รายการอุปกรณ์ (${devices.length})` },
            { key: 'borrowed', label: `⏳ อยู่ระหว่างการยืม (${borrowedTransactions.length})` },
            { key: 'transactions', label: '📜 ประวัติการยืม-คืนทั้งหมด' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 ${
                activeTab === tab.key
                  ? 'bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/20 scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: ALL DEVICES */}
        {activeTab === 'devices' && (
          <div className="space-y-6">
            {/* Form Add Device */}
            <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 shadow-xl backdrop-blur-md">
              <h2 className="text-base font-bold text-sky-400 mb-4 flex items-center gap-2">
                <span>➕</span> เพิ่มอุปกรณ์ใหม่เข้าสู่ระบบ
              </h2>
              <form onSubmit={handleAddDevice} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-4">
                  <input
                    type="text"
                    placeholder="ชื่ออุปกรณ์ (เช่น Dell Latitude 5420)"
                    value={newDevice.name}
                    onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-all"
                    required
                  />
                </div>

                <div className="lg:col-span-2">
                  <select
                    value={newDevice.category}
                    onChange={(e) => setNewDevice({ ...newDevice, category: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500 transition-all"
                  >
                    <option value="Laptop">Laptop</option>
                    <option value="Tablet">Tablet</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Monitor">Monitor</option>
                    <option value="Other">อื่นๆ</option>
                  </select>
                </div>

                <div className="lg:col-span-2">
                  <select
                    value={newDevice.status}
                    onChange={(e) => setNewDevice({ ...newDevice, status: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500 transition-all"
                  >
                    <option value="พร้อมใช้งาน">พร้อมใช้งาน</option>
                    <option value="ชำรุด">ชำรุด</option>
                  </select>
                </div>

                <div className="lg:col-span-3">
                  <input
                    type="url"
                    placeholder="URL รูปภาพ (https://...)"
                    value={newDevice.imageUrl}
                    onChange={(e) => setNewDevice({ ...newDevice, imageUrl: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-all"
                  />
                </div>

                <div className="lg:col-span-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-full min-h-[42px] bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl transition duration-150 disabled:bg-slate-800 disabled:text-slate-500 shadow-lg shadow-sky-500/10 active:scale-95"
                  >
                    {loading ? '...' : 'บันทึก'}
                  </button>
                </div>
              </form>
            </div>

            {/* Table Container */}
            <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 shadow-xl backdrop-blur-md">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>📋</span> รายการอุปกรณ์ ({filteredDevices.length})
                </h2>
                
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={exportDevicesToExcel}
                    className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/20 text-xs font-bold px-3.5 py-2 rounded-xl transition-all duration-150"
                  >
                    📊 Excel
                  </button>
                  <button
                    onClick={exportDevicesToPDF}
                    className="bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 text-xs font-bold px-3.5 py-2 rounded-xl transition-all duration-150"
                  >
                    📄 PDF
                  </button>
                  <button
                    onClick={fetchData}
                    disabled={loading}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 text-xs font-bold px-3.5 py-2 rounded-xl transition-all duration-150"
                  >
                    🔄 รีเฟรช
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                <input
                  type="text"
                  placeholder="ค้นหาชื่ออุปกรณ์หรือไอดี..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500 transition-all"
                />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500 transition-all"
                >
                  <option value="ทั้งหมด">หมวดหมู่ทั้งหมด</option>
                  <option value="Laptop">Laptop</option>
                  <option value="Tablet">Tablet</option>
                  <option value="Accessories">Accessories</option>
                  <option value="Monitor">Monitor</option>
                  <option value="Other">อื่นๆ</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500 transition-all"
                >
                  <option value="ทั้งหมด">สถานะทั้งหมด</option>
                  <option value="พร้อมใช้งาน">พร้อมใช้งาน</option>
                  <option value="ถูกยืม">ถูกยืม</option>
                  <option value="ชำรุด">ชำรุด</option>
                </select>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-800/80">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase text-[11px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">รูปภาพ</th>
                      <th className="p-3.5">ID</th>
                      <th className="p-3.5">ชื่ออุปกรณ์</th>
                      <th className="p-3.5">หมวดหมู่</th>
                      <th className="p-3.5">สถานะ</th>
                      <th className="p-3.5 text-right">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                    {filteredDevices.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-10 text-slate-500">
                          {loading ? 'กำลังโหลดข้อมูล...' : 'ไม่พบข้อมูลอุปกรณ์'}
                        </td>
                      </tr>
                    ) : (
                      filteredDevices.map(d => (
                        <tr key={d.id} className="hover:bg-slate-800/40 transition duration-150">
                          <td className="p-3.5">
                            <img
                              src={d.imageUrl || "https://via.placeholder.com/50?text=No+Img"}
                              alt={d.name}
                              className="w-10 h-10 object-cover rounded-lg bg-slate-950 border border-slate-800"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "https://via.placeholder.com/50?text=No+Img";
                              }}
                            />
                          </td>
                          <td className="p-3.5 text-slate-400 font-mono text-xs">{d.id}</td>
                          <td className="p-3.5 font-semibold text-white">{d.name}</td>
                          <td className="p-3.5 text-slate-400">{d.category}</td>
                          <td className="p-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              d.status === 'พร้อมใช้งาน' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              d.status === 'ถูกยืม' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                              'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                d.status === 'พร้อมใช้งาน' ? 'bg-emerald-400' :
                                d.status === 'ถูกยืม' ? 'bg-amber-400' : 'bg-rose-400'
                              }`}></span>
                              {d.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => handleDeleteDevice(d.id, d.name)}
                              disabled={loading}
                              className="bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white px-3 py-1.5 rounded-lg transition duration-150 text-xs font-semibold border border-rose-500/20"
                            >
                              🗑️ ลบ
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

        {/* TAB 2: BORROWED DEVICES */}
        {activeTab === 'borrowed' && (
          <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 shadow-xl backdrop-blur-md">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span>📦</span> รายการอุปกรณ์ที่อยู่ระหว่างการยืม ({borrowedTransactions.length})
            </h2>
            
            <div className="overflow-x-auto rounded-xl border border-slate-800/80">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase text-[11px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">ชื่ออุปกรณ์</th>
                    <th className="p-3.5">ผู้ยืม</th>
                    <th className="p-3.5">วันที่ยืม</th>
                    <th className="p-3.5">กำหนดคืน</th>
                    <th className="p-3.5">สถานะ</th>
                    <th className="p-3.5 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                  {borrowedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-10 text-slate-500">
                        ไม่มีรายการอุปกรณ์ที่ถูกยืมในขณะนี้
                      </td>
                    </tr>
                  ) : (
                    borrowedTransactions.map(t => (
                      <tr key={t.id} className={`hover:bg-slate-800/40 transition duration-150 ${t.isOverdue ? 'bg-rose-950/10' : ''}`}>
                        <td className="p-3.5 font-semibold text-white">{t.deviceName}</td>
                        <td className="p-3.5 text-slate-300">{t.username}</td>
                        <td className="p-3.5 text-slate-400">{formatDate(t.borrowDate)}</td>
                        <td className="p-3.5 text-slate-400">{formatDate(t.expectedReturnDate)}</td>
                        <td className="p-3.5">
                          {t.isOverdue ? (
                            <span className="inline-flex items-center gap-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-1 rounded-full text-xs font-bold">
                              ⚠️ เกินกำหนดคืน
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full text-xs font-bold">
                              กำลังยืม
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => handleReturnDevice(t)}
                            disabled={loading}
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3.5 py-1.5 rounded-lg text-xs font-bold transition duration-150 shadow-md shadow-emerald-500/10 active:scale-95 disabled:opacity-50"
                          >
                            ↩️ รับคืนอุปกรณ์
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: ALL TRANSACTIONS */}
        {activeTab === 'transactions' && (
          <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 shadow-xl backdrop-blur-md">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>📜</span> ประวัติการยืม-คืน ทั้งหมด
              </h2>
              
              <div className="flex gap-2">
                <button
                  onClick={exportTransactionsToExcel}
                  className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/20 text-xs font-bold px-3.5 py-2 rounded-xl transition-all duration-150"
                >
                  📊 Excel
                </button>
                <button
                  onClick={exportTransactionsToPDF}
                  className="bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 text-xs font-bold px-3.5 py-2 rounded-xl transition-all duration-150"
                >
                  📄 PDF
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800/80">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase text-[11px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">ชื่ออุปกรณ์</th>
                    <th className="p-3.5">ผู้ยืม</th>
                    <th className="p-3.5">กำหนดคืน</th>
                    <th className="p-3.5">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center py-10 text-slate-500">
                        {loading ? 'กำลังโหลดข้อมูล...' : 'ไม่พบประวัติการยืม-คืน'}
                      </td>
                    </tr>
                  ) : (
                    transactions.map(t => (
                      <tr key={t.id} className="hover:bg-slate-800/40 transition duration-150">
                        <td className="p-3.5 font-semibold text-white">{t.deviceName}</td>
                        <td className="p-3.5 text-slate-300">{t.username}</td>
                        <td className="p-3.5 text-slate-400">{formatDate(t.expectedReturnDate)}</td>
                        <td className="p-3.5">
                          {['returned', 'คืนแล้ว'].includes(t.status) ? (
                            <span className="text-emerald-400 font-medium inline-flex items-center gap-1">
                              ✓ คืนแล้ว
                            </span>
                          ) : t.isOverdue ? (
                            <span className="text-rose-400 font-bold inline-flex items-center gap-1">
                              ⚠️ เกินกำหนดคืน
                            </span>
                          ) : (
                            <span className="text-amber-400 font-medium inline-flex items-center gap-1">
                              กำลังยืม
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
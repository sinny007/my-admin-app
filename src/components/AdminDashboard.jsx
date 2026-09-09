import React, { useState, useEffect, useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
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
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import ConfirmModal from './ConfirmModal';
import ProfileModal from './ProfileModal';
import { IT_CATEGORIES, DEFAULT_CATEGORY } from '../constants/itCategories';

// ตั้งค่า URL ของ Apps Script
const DEFAULT_APPS_SCRIPT_URL = 
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_APPS_SCRIPT_URL) || 
  (typeof process !== 'undefined' && process.env && process.env.REACT_APP_APPS_SCRIPT_URL) ||
  "https://script.google.com/macros/s/AKfycbz1cDl0Je-RjFxboeoTY2NRLL3B71q0Tzl7JEpasaArwhhIzShHPPakZagGHft6p4x3rQ/exec";

// Utility แปลงวันที่
const formatDate = (dateStr) => {
  if (!dateStr || dateStr === '-') return '-';
  const parsedDate = new Date(dateStr);
  return isNaN(parsedDate.getTime()) ? dateStr : parsedDate.toLocaleDateString('th-TH');
};

// Helper โหลดฟอนต์ Sarabun สำหรับ export PDF ให้รองรับภาษาไทย
let sarabunBase64 = null;
const loadSarabunFont = async () => {
  if (sarabunBase64) return sarabunBase64;
  try {
    const res = await fetch('/fonts/Sarabun-Regular.ttf');
    if (!res.ok) throw new Error('Font file not found');
    const buffer = await res.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    sarabunBase64 = window.btoa(binary);
    return sarabunBase64;
  } catch (err) {
    console.warn('Cannot load Thai font, fallback to default:', err);
    return null;
  }
};

export default function AdminDashboard({ user, onLogout, apiUrl, onUpdateUser }) {
  const APPS_SCRIPT_URL = apiUrl || DEFAULT_APPS_SCRIPT_URL;
  const [devices, setDevices] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
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

  // รวบรวมหมวดหมู่ทั้งหมดที่มีในอุปกรณ์ + หมวดหมู่มาตรฐานทั้งหมด
  const allAvailableCategories = Array.from(
    new Set([...IT_CATEGORIES, ...devices.map(d => d.category).filter(Boolean)])
  );

  // State สำหรับ Confirm Modal
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'ยืนยัน',
    variant: 'danger',
    onConfirm: () => {}
  });

  // ดึงสิทธิ์ User Role จาก Props (Default เป็น 'admin')
  const currentRole = user?.role || 'admin';

  // ดึงข้อมูลทั้งหมดจาก Google Apps Script
  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?action=getData&role=${currentRole}`, { 
        redirect: 'follow' 
      });
      const data = await res.json();
      if (data.status === 'success' || data.success) {
        setDevices(data.devices || []);
        setTransactions(data.transactions || []);
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Helper สำหรับทำ POST request โดยแนบ userRole ไปด้วยเสมอ
  const postToAppsScript = async (payload) => {
    const fullPayload = {
      ...payload,
      userRole: currentRole,
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
    if (!newDevice.name.trim()) {
      toast.error('กรุณากรอกชื่ออุปกรณ์');
      return;
    }

    setActionLoading(true);
    try {
      const data = await postToAppsScript({
        action: 'add_device',
        name: newDevice.name.trim(),
        category: newDevice.category,
        status: newDevice.status,
        imageUrl: newDevice.imageUrl.trim() || 'https://via.placeholder.com/150?text=No+Image'
      });

      if (data.status === 'success' || data.success) {
        toast.success(`เพิ่มอุปกรณ์ "${newDevice.name}" เข้าสู่ระบบสำเร็จ`);
        setNewDevice({ name: '', category: DEFAULT_CATEGORY, status: 'พร้อมใช้งาน', imageUrl: '' });
        fetchData(true);
      } else {
        toast.error(data.message || 'เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch (err) {
      console.error(err);
      toast.error('เกิดข้อผิดพลาดในการส่งข้อมูล');
    } finally {
      setActionLoading(false);
    }
  };

  // เปิด Modal รับคืนอุปกรณ์
  const promptReturnDevice = (transaction) => {
    setConfirmState({
      isOpen: true,
      title: 'ยืนยันการรับคืนอุปกรณ์',
      message: `คุณต้องการบันทึกรับคืนอุปกรณ์ "${transaction.deviceName}" จากคุณ ${transaction.username} หรือไม่?`,
      confirmText: 'รับคืนอุปกรณ์',
      variant: 'primary',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const data = await postToAppsScript({
            action: 'return_device',
            transId: transaction.id,
            deviceId: transaction.deviceId
          });

          if (data.status === 'success' || data.success) {
            toast.success(`รับคืนอุปกรณ์ "${transaction.deviceName}" สำเร็จแล้ว`);
            setConfirmState((prev) => ({ ...prev, isOpen: false }));
            fetchData(true);
          } else {
            toast.error(data.message || 'เกิดข้อผิดพลาดในการคืนอุปกรณ์');
          }
        } catch (err) {
          console.error(err);
          toast.error('เกิดข้อผิดพลาดในการส่งข้อมูลคืนอุปกรณ์');
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  // เปิด Modal ลบอุปกรณ์
  const promptDeleteDevice = (deviceId, deviceName) => {
    setConfirmState({
      isOpen: true,
      title: 'ยืนยันการลบอุปกรณ์',
      message: `คุณแน่ใจหรือไม่ที่จะลบอุปกรณ์ "${deviceName}" (รหัส: ${deviceId}) ออกจากระบบอย่างถาวร?`,
      confirmText: 'ลบอุปกรณ์',
      variant: 'danger',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const data = await postToAppsScript({
            action: 'delete_device',
            deviceId: deviceId
          });

          if (data.status === 'success' || data.success) {
            toast.success(`ลบอุปกรณ์ "${deviceName}" เรียบร้อยแล้ว`);
            setConfirmState((prev) => ({ ...prev, isOpen: false }));
            fetchData(true);
          } else {
            toast.error(data.message || 'ไม่สามารถลบอุปกรณ์ได้');
          }
        } catch (err) {
          console.error(err);
          toast.error('เกิดข้อผิดพลาดในการส่งข้อมูลลบอุปกรณ์');
        } finally {
          setActionLoading(false);
        }
      }
    });
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

  // คำนวณสถานะเกินกำหนดคืน (Overdue) ฝั่ง Client
  const checkIsOverdue = (t) => {
    if (!t || !t.expectedReturnDate) return false;
    if (['returned', 'คืนแล้ว'].includes(t.status)) return false;
    const expDate = new Date(t.expectedReturnDate);
    if (isNaN(expDate.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expDate.setHours(0, 0, 0, 0);
    return expDate < today;
  };

  const borrowedTransactions = transactions.filter(t => 
    ['borrowed', 'ถูกยืม', 'กำลังยืม'].includes(t.status)
  );

  const overdueCount = borrowedTransactions.filter(t => checkIsOverdue(t)).length;

  // Export ทะเบียนอุปกรณ์เป็น Excel
  const exportDevicesToExcel = () => {
    try {
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
      toast.success('ส่งออกไฟล์ Excel เรียบร้อยแล้ว');
    } catch {
      toast.error('เกิดข้อผิดพลาดในการส่งออก Excel');
    }
  };

  // Export ทะเบียนอุปกรณ์เป็น PDF (รองรับภาษาไทย)
  const exportDevicesToPDF = async () => {
    try {
      const doc = new jsPDF();
      const font = await loadSarabunFont();
      if (font) {
        doc.addFileToVFS('Sarabun-Regular.ttf', font);
        doc.addFont('Sarabun-Regular.ttf', 'Sarabun', 'normal');
        doc.setFont('Sarabun');
      }

      doc.setFontSize(16);
      doc.text("รายงานทะเบียนอุปกรณ์ IT ทั้งหมด", 14, 15);
      doc.setFontSize(10);
      doc.text(`ข้อมูล ณ วันที่: ${new Date().toLocaleDateString('th-TH')}`, 14, 22);

      const tableColumn = ["รหัสอุปกรณ์", "ชื่ออุปกรณ์", "หมวดหมู่", "สถานะ"];
      const tableRows = filteredDevices.map(item => [
        String(item.id || '-'),
        String(item.name || '-'),
        String(item.category || '-'),
        String(item.status || '-')
      ]);

      autoTable(doc, {
        styles: { font: font ? 'Sarabun' : 'helvetica', fontSize: 10 },
        headStyles: { 
          fillColor: [15, 23, 42],
          font: font ? 'Sarabun' : 'helvetica',
          fontStyle: 'bold'
        },
        bodyStyles: {
          font: font ? 'Sarabun' : 'helvetica'
        },
        head: [tableColumn],
        body: tableRows,
        startY: 28,
        theme: 'grid'
      });

      doc.save(`รายงานอุปกรณ์_IT_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('ส่งออกไฟล์ PDF เรียบร้อยแล้ว');
    } catch (err) {
      console.error('PDF Export Error:', err);
      toast.error('เกิดข้อผิดพลาดในการส่งออก PDF');
    }
  };

  // Export ประวัติการยืมคืนเป็น Excel
  const exportTransactionsToExcel = () => {
    try {
      const formattedData = transactions.map(item => ({
        "รหัสธุรกรรม": item.id || '-',
        "รหัสอุปกรณ์": item.deviceId || '-',
        "ชื่ออุปกรณ์": item.deviceName || '-',
        "ผู้ยืม": item.username || '-',
        "วันที่ยืม": formatDate(item.borrowDate),
        "กำหนดคืน": formatDate(item.expectedReturnDate),
        "วันที่คืนจริง": formatDate(item.returnDate),
        "สถานะ": ['returned', 'คืนแล้ว'].includes(item.status) ? 'คืนแล้ว' : (checkIsOverdue(item) ? 'เกินกำหนดคืน' : 'กำลังยืม')
      }));

      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
      XLSX.writeFile(workbook, `รายงานการยืมคืน_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('ส่งออกไฟล์ Excel ประวัติการยืม-คืนเรียบร้อยแล้ว');
    } catch {
      toast.error('เกิดข้อผิดพลาดในการส่งออก Excel');
    }
  };

  // Export ประวัติการยืมคืนเป็น PDF (รองรับภาษาไทย)
  const exportTransactionsToPDF = async () => {
    try {
      const doc = new jsPDF();
      const font = await loadSarabunFont();
      if (font) {
        doc.addFileToVFS('Sarabun-Regular.ttf', font);
        doc.addFont('Sarabun-Regular.ttf', 'Sarabun', 'normal');
        doc.setFont('Sarabun');
      }

      doc.setFontSize(16);
      doc.text("รายงานประวัติการยืม-คืน อุปกรณ์ IT", 14, 15);
      doc.setFontSize(10);
      doc.text(`ข้อมูล ณ วันที่: ${new Date().toLocaleDateString('th-TH')}`, 14, 22);

      const tableColumn = ["รหัสธุรกรรม", "ชื่ออุปกรณ์", "ผู้ยืม", "วันที่ยืม", "กำหนดคืน", "สถานะ"];
      const tableRows = transactions.map(item => [
        String(item.id || '-'),
        String(item.deviceName || '-'),
        String(item.username || '-'),
        formatDate(item.borrowDate),
        formatDate(item.expectedReturnDate),
        ['returned', 'คืนแล้ว'].includes(item.status) ? 'คืนแล้ว' : (checkIsOverdue(item) ? 'เกินกำหนดคืน' : 'กำลังยืม')
      ]);

      autoTable(doc, {
        styles: { font: font ? 'Sarabun' : 'helvetica', fontSize: 9 },
        headStyles: { 
          fillColor: [15, 23, 42],
          font: font ? 'Sarabun' : 'helvetica',
          fontStyle: 'bold'
        },
        bodyStyles: {
          font: font ? 'Sarabun' : 'helvetica'
        },
        head: [tableColumn],
        body: tableRows,
        startY: 28,
        theme: 'grid'
      });

      doc.save(`รายงานประวัติการยืมคืน_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('ส่งออกไฟล์ PDF ประวัติการยืม-คืนเรียบร้อยแล้ว');
    } catch (err) {
      console.error('PDF Export Error:', err);
      toast.error('เกิดข้อผิดพลาดในการส่งออก PDF');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 p-4 sm:p-6 lg:p-8 font-sans selection:bg-indigo-500 selection:text-white">
      
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Clean Header Bar */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs bg-slate-50 shrink-0 ring-2 ring-indigo-50">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover object-top" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  IT Asset Console
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">ระบบจัดการและติดตามอุปกรณ์ไอทีสำหรับผู้ดูแลระบบ</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-end">
            <button
              type="button"
              onClick={() => setIsProfileOpen(true)}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200/80 px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all duration-150 cursor-pointer group shadow-2xs active:scale-98"
              title="คลิกเพื่อแก้ไขข้อมูลโปรไฟล์และเปลี่ยนรหัสผ่าน"
            >
              <div className="w-6 h-6 rounded-full overflow-hidden border border-slate-200 shrink-0 ring-1 ring-indigo-400/20 bg-indigo-50 flex items-center justify-center">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Admin" className="w-full h-full object-cover" />
                ) : (
                  <img src="/logo.png" alt="Admin" className="w-full h-full object-cover object-top" />
                )}
              </div>
              <span className="text-slate-800 group-hover:text-indigo-600 transition-colors">
                {user?.name || user?.username || 'ผู้ดูแลระบบ'}
              </span>
              <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] uppercase px-2 py-0.5 rounded-full font-bold">
                Admin
              </span>
              <span className="text-[11px] text-slate-400 group-hover:text-indigo-600 transition-colors">
                ⚙️ โปรไฟล์
              </span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 px-3.5 py-2 rounded-xl font-bold text-xs transition-all duration-150 shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </header>

        {/* Top Summary Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          
          {/* Card 1: Total */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs text-slate-500 uppercase font-bold tracking-wider">อุปกรณ์ทั้งหมด</span>
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <Boxes className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 tracking-tight">{devices.length}</p>
            <span className="text-[11px] text-slate-400 mt-1 block">ลงทะเบียนในคลัง IT</span>
          </div>

          {/* Card 2: Ready */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs text-slate-500 uppercase font-bold tracking-wider">พร้อมใช้งาน</span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <PackageCheck className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-emerald-600 mt-2 tracking-tight">
              {devices.filter(d => d.status === 'พร้อมใช้งาน').length}
            </p>
            <span className="text-[11px] text-slate-400 mt-1 block">สามารถยืมได้ทันที</span>
          </div>

          {/* Card 3: Borrowed */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs text-slate-500 uppercase font-bold tracking-wider">กำลังถูกยืม</span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-amber-600 mt-2 tracking-tight">{borrowedTransactions.length}</p>
            <span className="text-[11px] text-slate-400 mt-1 block">อยู่ระหว่างการใช้งาน</span>
          </div>

          {/* Card 4: Overdue */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs text-slate-500 uppercase font-bold tracking-wider">เกินกำหนดคืน</span>
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-rose-600 mt-2 tracking-tight">{overdueCount}</p>
            <span className="text-[11px] text-slate-400 mt-1 block">ต้องติดตามการส่งคืน</span>
          </div>
        </div>

        {/* Navigation Tabs (Modern Segmented Bar) */}
        <div className="flex gap-1.5 p-1.5 bg-slate-200/70 border border-slate-200/80 rounded-2xl overflow-x-auto">
          {[
            { key: 'devices', label: 'ทะเบียนอุปกรณ์', count: devices.length, icon: Laptop },
            { key: 'borrowed', label: 'อยู่ระหว่างการยืม', count: borrowedTransactions.length, icon: Clock },
            { key: 'transactions', label: 'ประวัติการยืม-คืน', count: transactions.length, icon: History }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-slate-100 text-slate-800' : 'bg-slate-200/80 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: ALL DEVICES */}
        {activeTab === 'devices' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* Form Add Device Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
                    <Plus className="w-4 h-4" />
                  </div>
                  <span>เพิ่มอุปกรณ์ใหม่เข้าสู่ระบบ</span>
                </h2>
                <span className="text-[11px] text-slate-400">บันทึกเข้า Google Sheets อัตโนมัติ</span>
              </div>

              <form onSubmit={handleAddDevice} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5">
                <div className="lg:col-span-4">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    ชื่ออุปกรณ์
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น MacBook Pro 14 M3, iPad Air 5"
                    value={newDevice.name}
                    onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-600 transition-all font-medium"
                    required
                  />
                </div>

                <div className="lg:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    หมวดหมู่อุปกรณ์ (IT / Computer)
                  </label>
                  <select
                    value={newDevice.category}
                    onChange={(e) => setNewDevice({ ...newDevice, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-600 transition-all font-medium cursor-pointer"
                  >
                    {IT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    สถานะแรกเริ่ม
                  </label>
                  <select
                    value={newDevice.status}
                    onChange={(e) => setNewDevice({ ...newDevice, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-600 transition-all font-medium cursor-pointer"
                  >
                    <option value="พร้อมใช้งาน">พร้อมใช้งาน</option>
                    <option value="ชำรุด">ชำรุด</option>
                  </select>
                </div>

                <div className="lg:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    URL รูปภาพ (ถ้ามี)
                  </label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={newDevice.imageUrl}
                    onChange={(e) => setNewDevice({ ...newDevice, imageUrl: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-600 transition-all font-medium"
                  />
                </div>

                <div className="lg:col-span-1 flex items-end">
                  <button
                    type="submit"
                    disabled={actionLoading || loading}
                    className="w-full h-[42px] bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-xl transition duration-150 disabled:opacity-50 shadow-sm shadow-indigo-600/20 flex items-center justify-center gap-1 text-xs sm:text-sm cursor-pointer"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    <span>บันทึก</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Devices Table Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              
              {/* Header Actions */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Boxes className="w-5 h-5 text-indigo-600" />
                    <span>ทะเบียนอุปกรณ์ทั้งหมด</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-normal">
                      {filteredDevices.length} ชิ้น
                    </span>
                  </h2>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={exportDevicesToExcel}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 text-xs font-bold px-3.5 py-2 rounded-xl transition-all duration-150 cursor-pointer shadow-xs"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Excel</span>
                  </button>
                  <button
                    type="button"
                    onClick={exportDevicesToPDF}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 text-xs font-bold px-3.5 py-2 rounded-xl transition-all duration-150 cursor-pointer shadow-xs"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fetchData(true)}
                    disabled={loading}
                    className="flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 text-xs font-bold px-3.5 py-2 rounded-xl transition-all duration-150 cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
                    <span>รีเฟรช</span>
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="ค้นหาชื่ออุปกรณ์หรือรหัสไอดี..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-600 transition-all font-medium"
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Filter className="w-4 h-4" />
                  </div>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-600 transition-all font-medium cursor-pointer"
                  >
                    <option value="ทั้งหมด">หมวดหมู่ทั้งหมด</option>
                    {allAvailableCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-600 transition-all font-medium cursor-pointer"
                  >
                    <option value="ทั้งหมด">สถานะทั้งหมด</option>
                    <option value="พร้อมใช้งาน">พร้อมใช้งาน</option>
                    <option value="ถูกยืม">ถูกยืม</option>
                    <option value="ชำรุด">ชำรุด</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                <table className="w-full text-left text-xs sm:text-sm text-slate-600">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-4">รูปภาพ</th>
                      <th className="p-4">รหัส (ID)</th>
                      <th className="p-4">ชื่ออุปกรณ์</th>
                      <th className="p-4">หมวดหมู่</th>
                      <th className="p-4">สถานะ</th>
                      <th className="p-4 text-right">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {loading && filteredDevices.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-12 text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                            <span className="text-xs font-medium">กำลังโหลดข้อมูลอุปกรณ์...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredDevices.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-12 text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Boxes className="w-8 h-8 text-slate-300" />
                            <p className="text-sm font-semibold text-slate-700">ไม่พบข้อมูลอุปกรณ์ที่ตรงกับเงื่อนไข</p>
                            <span className="text-xs text-slate-400">ลองปรับเปลี่ยนคำค้นหาหรือตัวกรองด้านบน</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredDevices.map(d => (
                        <tr key={d.id} className="hover:bg-slate-50/70 transition duration-150">
                          <td className="p-4">
                            <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden">
                              {d.imageUrl ? (
                                <img
                                  src={d.imageUrl}
                                  alt={d.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = "https://via.placeholder.com/50?text=IT";
                                  }}
                                />
                              ) : (
                                <ImageOff className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                          </td>
                          <td className="p-4 font-mono text-xs text-slate-500 font-semibold">{d.id}</td>
                          <td className="p-4 font-bold text-slate-900 leading-snug">{d.name}</td>
                          <td className="p-4">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium">
                              {d.category}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                              d.status === 'พร้อมใช้งาน' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80' :
                              d.status === 'ถูกยืม' ? 'bg-amber-50 text-amber-700 border border-amber-200/80' :
                              'bg-rose-50 text-rose-700 border border-rose-200/80'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                d.status === 'พร้อมใช้งาน' ? 'bg-emerald-500' :
                                d.status === 'ถูกยืม' ? 'bg-amber-500' : 'bg-rose-500'
                              }`}></span>
                              {d.status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              type="button"
                              onClick={() => promptDeleteDevice(d.id, d.name)}
                              disabled={actionLoading}
                              className="inline-flex items-center gap-1 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white px-3 py-1.5 rounded-xl transition duration-150 text-xs font-semibold border border-rose-200 active:scale-95 cursor-pointer disabled:opacity-50"
                              title="ลบอุปกรณ์ออกจากระบบ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>ลบ</span>
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
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <span>รายการอุปกรณ์ที่อยู่ระหว่างการยืม</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-normal">
                    {borrowedTransactions.length} รายการ
                  </span>
                </h2>
              </div>

              <button
                type="button"
                onClick={() => fetchData(true)}
                disabled={loading}
                className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-600' : ''}`} />
                <span>รีเฟรช</span>
              </button>
            </div>
            
            <div className="overflow-x-auto rounded-xl border border-slate-200/80">
              <table className="w-full text-left text-xs sm:text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4">ชื่ออุปกรณ์</th>
                    <th className="p-4">ผู้ยืม</th>
                    <th className="p-4">วันที่ยืม</th>
                    <th className="p-4">กำหนดคืน</th>
                    <th className="p-4">สถานะ</th>
                    <th className="p-4 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {borrowedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-12 text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                          <p className="text-sm font-semibold text-slate-700">ไม่มีรายการอุปกรณ์ที่ค้างยืมในขณะนี้</p>
                          <span className="text-xs text-slate-400">อุปกรณ์ทั้งหมดถูกส่งคืนครบถ้วน</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    borrowedTransactions.map(t => {
                      const isOverdue = checkIsOverdue(t);
                      return (
                        <tr key={t.id} className={`hover:bg-slate-50/70 transition duration-150 ${isOverdue ? 'bg-rose-50/30' : ''}`}>
                          <td className="p-4 font-bold text-slate-900">{t.deviceName}</td>
                          <td className="p-4 text-slate-700 font-medium">{t.username}</td>
                          <td className="p-4 text-slate-500 font-mono text-xs">{formatDate(t.borrowDate)}</td>
                          <td className="p-4 font-mono text-xs font-semibold">
                            <span className={isOverdue ? 'text-rose-600' : 'text-slate-700'}>
                              {formatDate(t.expectedReturnDate)}
                            </span>
                          </td>
                          <td className="p-4">
                            {isOverdue ? (
                              <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200/80 px-3 py-1 rounded-full text-xs font-semibold">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                เกินกำหนดคืน
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200/80 px-3 py-1 rounded-full text-xs font-semibold">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                กำลังยืม
                              </span>
                            )}
                          </td>
                        <td className="p-4 text-right">
                          <button
                            type="button"
                            onClick={() => promptReturnDevice(t)}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold transition duration-150 shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
                          >
                            <Undo2 className="w-3.5 h-3.5" />
                            <span>บันทึกรับคืน</span>
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

        {/* TAB 3: ALL TRANSACTIONS */}
        {activeTab === 'transactions' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-600" />
                  <span>ประวัติการยืม-คืน ทั้งหมด</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-normal">
                    {transactions.length} รายการ
                  </span>
                </h2>
              </div>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={exportTransactionsToExcel}
                  className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 text-xs font-bold px-3.5 py-2 rounded-xl transition-all duration-150 cursor-pointer shadow-xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel</span>
                </button>
                <button
                  type="button"
                  onClick={exportTransactionsToPDF}
                  className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 text-xs font-bold px-3.5 py-2 rounded-xl transition-all duration-150 cursor-pointer shadow-xs"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>PDF</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200/80">
              <table className="w-full text-left text-xs sm:text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4">ชื่ออุปกรณ์</th>
                    <th className="p-4">ผู้ยืม</th>
                    <th className="p-4">วันที่ยืม</th>
                    <th className="p-4">กำหนดคืน</th>
                    <th className="p-4">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-12 text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <History className="w-8 h-8 text-slate-300" />
                          <p className="text-sm font-semibold text-slate-700">ยังไม่พบประวัติการทำรายการยืม-คืน</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    transactions.map(t => {
                      const isOverdue = checkIsOverdue(t);
                      return (
                        <tr key={t.id} className="hover:bg-slate-50/70 transition duration-150">
                          <td className="p-4 font-bold text-slate-900">{t.deviceName}</td>
                          <td className="p-4 text-slate-700 font-medium">{t.username}</td>
                          <td className="p-4 text-slate-500 font-mono text-xs">{formatDate(t.borrowDate)}</td>
                          <td className="p-4 text-slate-500 font-mono text-xs">{formatDate(t.expectedReturnDate)}</td>
                          <td className="p-4">
                            {['returned', 'คืนแล้ว'].includes(t.status) ? (
                              <span className="text-emerald-700 bg-emerald-50 border border-emerald-200/80 font-semibold inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                คืนแล้ว
                              </span>
                            ) : isOverdue ? (
                              <span className="text-rose-700 bg-rose-50 border border-rose-200/80 font-semibold inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                เกินกำหนดคืน
                              </span>
                            ) : (
                              <span className="text-amber-700 bg-amber-50 border border-amber-200/80 font-semibold inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                กำลังยืม
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

        {/* Branded Footer */}
        <footer className="pt-8 pb-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-xs border border-slate-200 shrink-0">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover object-top" />
            </div>
            <div>
              <p className="font-bold text-slate-700">IT Asset Console (Administrator System)</p>
              <p className="text-[11px] text-slate-400">ระบบติดตามและบริหารจัดการครุภัณฑ์ไอที</p>
            </div>
          </div>
          <div className="text-center sm:text-right text-[11px] text-slate-400">
            © 2026 All Rights Reserved • IT Asset System
          </div>
        </footer>

        {/* Confirm Modal Dialog สำหรับยืนยันการลบและรับคืนอุปกรณ์ */}
        <ConfirmModal
          isOpen={confirmState.isOpen}
          title={confirmState.title}
          message={confirmState.message}
          confirmText={confirmState.confirmText}
          variant={confirmState.variant}
          loading={actionLoading}
          onConfirm={confirmState.onConfirm}
          onClose={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
        />

        {/* Profile & Security Modal สำหรับ Admin */}
        <ProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          user={user}
          onUpdateUser={onUpdateUser}
          apiUrl={APPS_SCRIPT_URL}
        />

      </div>
    </div>
  );
}
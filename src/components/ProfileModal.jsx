import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  Building2,
  Camera,
  X,
  Loader2,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';

export default function ProfileModal({ isOpen, onClose, user, onUpdateUser, apiUrl }) {
  const [profileData, setProfileData] = useState({
    name: '', department: '', phone: '', email: '', avatarUrl: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      setProfileData({
        name: user.name || '',
        department: user.department || '',
        phone: user.phone || '',
        email: user.email || '',
        avatarUrl: user.avatarUrl || ''
      });
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const sendPostRequest = async (payload) => {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    const text = await res.text();
    try { return JSON.parse(text); }
    catch { throw new Error('ตอบกลับจากเซิร์ฟเวอร์ไม่ใช่รูปแบบ JSON'); }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profileData.name.trim()) { toast.error('กรุณากรอกชื่อ-นามสกุล'); return; }
    setLoading(true);
    try {
      const payload = {
        action: 'updateProfile',
        username: user?.username,
        name: profileData.name.trim(),
        department: profileData.department.trim(),
        phone: profileData.phone.trim(),
        email: profileData.email.trim(),
        avatarUrl: profileData.avatarUrl.trim()
      };
      const result = await sendPostRequest(payload);
      if (result.success || result.status === 'success') {
        if (onUpdateUser) onUpdateUser({ ...user, ...payload, role: user?.role });
        toast.success(result.message || 'บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว');
        onClose();
      } else {
        toast.error(result.message || 'ไม่สามารถบันทึกข้อมูลได้');
      }
    } catch (err) {
      console.error('Update Profile Error:', err);
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = user?.role === 'admin';
  const displayChar = (user?.name || user?.username || 'U').charAt(0).toUpperCase();

  const inputCls = "light-input w-full px-4 py-2.5 rounded-xl text-sm font-medium";
  const disabledCls = "w-full px-4 py-2.5 rounded-xl text-sm font-mono cursor-not-allowed bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={() => !loading && onClose()}
      />

      <div className="relative w-full max-w-lg z-10 animate-scale-in">
        <div
          className="relative bg-white dark:bg-slate-900 rounded-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl border border-slate-200 dark:border-slate-800"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative p-6 shrink-0 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4">
              {/* Avatar Preview */}
              <div className="relative shrink-0">
                <div className={`w-16 h-16 rounded-2xl overflow-hidden border-2 shadow-sm flex items-center justify-center ${
                  isAdmin ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40' : 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/40'
                }`}>
                  {profileData.avatarUrl ? (
                    <img
                      src={profileData.avatarUrl}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.onerror = null; e.target.src = '/logo.png'; }}
                    />
                  ) : (
                    <span className={`text-2xl font-black ${isAdmin ? 'text-amber-700 dark:text-amber-400' : 'text-indigo-700 dark:text-indigo-400'}`}>
                      {displayChar}
                    </span>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 p-1 rounded-md bg-white dark:bg-slate-800 shadow border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                  <Camera className="w-3 h-3" />
                </div>
              </div>

              {/* User Info */}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    {user?.name || user?.username}
                  </h3>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    isAdmin
                      ? 'text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 bg-amber-100 dark:bg-amber-950/60'
                      : 'text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60'
                  }`}>
                    {isAdmin ? 'Admin' : 'User'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">@{user?.username}</p>
                {user?.department && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">{user.department}</p>
                )}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto">
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  ชื่อ-นามสกุล <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น สมชาย ใจดี"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className={inputCls}
                />
              </div>

              {/* Username & Role (Read-only) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Username</label>
                  <input type="text" disabled value={user?.username || ''} className={disabledCls} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">สิทธิ์การใช้งาน</label>
                  <input type="text" disabled value={isAdmin ? 'ผู้ดูแลระบบ (Admin)' : 'ผู้ใช้งานทั่วไป (User)'} className={disabledCls} />
                </div>
              </div>

              {/* Department */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  แผนก / ฝ่าย / สังกัด
                </label>
                <input
                  type="text"
                  placeholder="เช่น แผนกเทคโนโลยีสารสนเทศ (IT)"
                  value={profileData.department}
                  onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                  className={inputCls}
                />
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    <Phone className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    เบอร์โทรศัพท์
                  </label>
                  <input
                    type="tel"
                    placeholder="081-234-5678"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    <Mail className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    อีเมล
                  </label>
                  <input
                    type="email"
                    placeholder="example@domain.com"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Avatar URL */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  <Camera className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  ลิงก์รูปภาพโปรไฟล์ (Avatar URL)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={profileData.avatarUrl}
                  onChange={(e) => setProfileData({ ...profileData, avatarUrl: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>ข้อมูลจัดเก็บปลอดภัยบนระบบ Google Sheets</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 text-white btn-gradient-primary shadow-indigo-500/20"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>บันทึกข้อมูลโปรไฟล์</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

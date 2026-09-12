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

  const inputCls = "dark-input w-full px-4 py-2.5 rounded-xl text-sm font-medium";
  const disabledCls = "w-full px-4 py-2.5 rounded-xl text-sm font-mono cursor-not-allowed text-slate-600";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(4, 6, 14, 0.85)', backdropFilter: 'blur(12px)' }}>

      <div className="relative w-full max-w-lg animate-scale-in">
        {/* Glow behind modal */}
        <div className="absolute inset-0 rounded-3xl blur-2xl opacity-20 pointer-events-none"
          style={{ background: isAdmin
            ? 'linear-gradient(135deg, #f59e0b, #d97706)'
            : 'linear-gradient(135deg, #6366f1, #8b5cf6)' }} />

        <div className="relative glass-darker rounded-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl"
          style={{ border: `1px solid ${isAdmin ? 'rgba(245,158,11,0.25)' : 'rgba(99,102,241,0.25)'}` }}
          onClick={(e) => e.stopPropagation()}>

          {/* Header */}
          <div className="relative p-6 shrink-0"
            style={{
              background: isAdmin
                ? 'linear-gradient(135deg, rgba(120,53,15,0.4) 0%, rgba(30,27,75,0.6) 100%)'
                : 'linear-gradient(135deg, rgba(30,27,75,0.6) 0%, rgba(49,10,66,0.4) 100%)',
              borderBottom: `1px solid ${isAdmin ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.15)'}`
            }}>
            <button type="button" onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-all cursor-pointer">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className={`w-16 h-16 rounded-2xl overflow-hidden border-2 shadow-lg ${
                  isAdmin ? 'border-amber-500/40 shadow-amber-500/20' : 'border-indigo-500/40 shadow-indigo-500/20'
                } flex items-center justify-center`}
                  style={{ background: isAdmin ? 'rgba(120,53,15,0.3)' : 'rgba(67,56,202,0.3)' }}>
                  {profileData.avatarUrl ? (
                    <img src={profileData.avatarUrl} alt="Avatar" className="w-full h-full object-cover"
                      onError={(e) => { e.target.onerror = null; e.target.src = '/logo.png'; }} />
                  ) : (
                    <span className={`text-2xl font-black ${isAdmin ? 'text-amber-300' : 'text-indigo-300'}`}>
                      {displayChar}
                    </span>
                  )}
                </div>
                <span className="absolute -bottom-1.5 -right-1.5 p-1.5 rounded-lg shadow-lg cursor-pointer"
                  style={{ background: isAdmin ? 'rgba(245,158,11,0.8)' : 'rgba(99,102,241,0.8)' }}>
                  <Camera className="w-3 h-3 text-white" />
                </span>
              </div>

              {/* User Info */}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-black text-white tracking-tight">
                    {user?.name || user?.username}
                  </h3>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-widest ${
                    isAdmin
                      ? 'text-amber-300 border border-amber-400/30 bg-amber-400/10'
                      : 'text-indigo-300 border border-indigo-400/30 bg-indigo-400/10'
                  }`}>
                    {isAdmin ? 'Admin' : 'User'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">@{user?.username}</p>
                {user?.department && (
                  <p className="text-[11px] text-slate-500 mt-0.5">{user.department}</p>
                )}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-4">
            <form onSubmit={handleSaveProfile} className="space-y-4">

              {/* ชื่อ-นามสกุล */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  ชื่อ-นามสกุล <span className="text-rose-400">*</span>
                </label>
                <input type="text" required placeholder="เช่น สมชาย ใจดี"
                  value={profileData.name} onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className={inputCls} />
              </div>

              {/* Username & Role (Read-only) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">Username</label>
                  <input type="text" disabled value={user?.username || ''}
                    className={disabledCls} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">สิทธิ์การใช้งาน</label>
                  <input type="text" disabled value={isAdmin ? 'Administrator' : 'User'}
                    className={disabledCls}
                    style={{
                      background: isAdmin ? 'rgba(245,158,11,0.05)' : 'rgba(99,102,241,0.05)',
                      border: `1px solid ${isAdmin ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.15)'}`,
                      color: isAdmin ? '#fbbf24' : '#818cf8'
                    }} />
                </div>
              </div>

              {/* แผนก */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                  แผนก / ฝ่าย / สำนัก
                </label>
                <input type="text" placeholder="เช่น แผนกเทคโนโลยีสารสนเทศ (IT)"
                  value={profileData.department} onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                  className={inputCls} />
              </div>

              {/* เบอร์ & อีเมล */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    <Phone className="w-3.5 h-3.5 text-indigo-400" />
                    เบอร์โทรศัพท์
                  </label>
                  <input type="tel" placeholder="081-234-5678"
                    value={profileData.phone} onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    className={inputCls} />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    <Mail className="w-3.5 h-3.5 text-indigo-400" />
                    อีเมล
                  </label>
                  <input type="email" placeholder="example@domain.com"
                    value={profileData.email} onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    className={inputCls} />
                </div>
              </div>

              {/* Avatar URL */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  <Camera className="w-3.5 h-3.5 text-indigo-400" />
                  ลิงก์รูปภาพโปรไฟล์ (URL)
                </label>
                <input type="url" placeholder="https://images.unsplash.com/..."
                  value={profileData.avatarUrl} onChange={(e) => setProfileData({ ...profileData, avatarUrl: e.target.value })}
                  className={inputCls} />
              </div>

              {/* Divider */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />

              {/* Security Note */}
              <div className="flex items-center gap-2 text-[11px] text-slate-600">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>ข้อมูลของคุณถูกจัดเก็บอย่างปลอดภัยและเข้ารหัสบนเซิร์ฟเวอร์</span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button type="button" onClick={onClose} disabled={loading}
                  className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-200 rounded-xl transition-all cursor-pointer"
                  style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                  ยกเลิก
                </button>
                <button type="submit" disabled={loading}
                  className={`px-5 py-2.5 font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 text-white ${
                    isAdmin ? '' : ''
                  } btn-gradient-primary`}>
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /><span>กำลังบันทึก...</span></>
                  ) : (
                    <><CheckCircle2 className="w-4 h-4" /><span>บันทึกข้อมูลโปรไฟล์</span></>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

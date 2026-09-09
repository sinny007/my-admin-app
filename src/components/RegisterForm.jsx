import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  IdCard, 
  Lock, 
  Shield, 
  KeyRound, 
  Eye, 
  EyeOff, 
  UserPlus, 
  ArrowLeft, 
  Loader2, 
  CheckCircle2, 
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

const DEFAULT_APPS_SCRIPT_URL = 
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_APPS_SCRIPT_URL) ||
  (typeof process !== 'undefined' && process.env && process.env.REACT_APP_APPS_SCRIPT_URL) ||
  "https://script.google.com/macros/s/AKfycbz1cDl0Je-RjFxboeoTY2NRLL3B71q0Tzl7JEpasaArwhhIzShHPPakZagGHft6p4x3rQ/exec";

export default function RegisterForm({ onSwitchToLogin, onRegisterSuccess, apiUrl }) {
  const APPS_SCRIPT_URL = apiUrl || DEFAULT_APPS_SCRIPT_URL;
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    role: 'user',
    adminKey: ''
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showAdminKey, setShowAdminKey] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'role' && value === 'user') {
        updated.adminKey = '';
      }
      return updated;
    });
  };

  const setRole = (role) => {
    setFormData((prev) => ({
      ...prev,
      role,
      adminKey: role === 'user' ? '' : prev.adminKey
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    const trimmedUsername = formData.username.trim();
    const trimmedPassword = formData.password.trim();
    const trimmedName = formData.name.trim();
    const trimmedAdminKey = formData.adminKey.trim();

    if (!trimmedUsername || !trimmedPassword || !trimmedName) {
      const err = 'กรุณากรอกข้อมูลให้ครบถ้วน';
      setMessage({ type: 'error', text: err });
      toast.error(err);
      setLoading(false);
      return;
    }

    if (trimmedPassword.length < 6) {
      const err = 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร';
      setMessage({ type: 'error', text: err });
      toast.error(err);
      setLoading(false);
      return;
    }

    if (formData.role === 'admin' && !trimmedAdminKey) {
      const err = 'กรุณากรอกรหัสลับผู้ดูแลระบบ (Admin Key)';
      setMessage({ type: 'error', text: err });
      toast.error(err);
      setLoading(false);
      return;
    }

    try {
      const payload = {
        action: 'register',
        username: trimmedUsername,
        password: trimmedPassword,
        name: trimmedName,
        role: formData.role,
        adminKey: formData.role === 'admin' ? trimmedAdminKey : ''
      };

      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload),
        redirect: 'follow'
      });

      const rawText = await response.text();
      let result;

      try {
        result = JSON.parse(rawText);
      } catch {
        console.error("Response Parse Error:", rawText);
        throw new Error("ตอบกลับจากเซิร์ฟเวอร์ไม่ถูกต้อง (ข้อมูลไม่ใช่ JSON)");
      }

      if (!isMounted.current) return;

      if (result.success || result.status === 'success') {
        const successMsg = result.message || 'สมัครสมาชิกสำเร็จเรียบร้อยแล้ว!';
        setMessage({ type: 'success', text: successMsg });
        toast.success(successMsg);

        // ยิง Confetti เฉลิมฉลอง
        try {
          confetti({
            particleCount: 90,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch {
          // ignore
        }
        
        // รีเซ็ตฟอร์ม
        setFormData({
          username: '',
          password: '',
          name: '',
          role: 'user',
          adminKey: ''
        });

        if (onRegisterSuccess) {
          setTimeout(() => {
            if (isMounted.current) {
              onRegisterSuccess();
            }
          }, 1200);
        }
      } else {
        const err = result.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก';
        setMessage({ type: 'error', text: err });
        toast.error(err);
      }
    } catch (err) {
      console.error("Register Error:", err);
      if (isMounted.current) {
        const errText = err.message || 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
        setMessage({ type: 'error', text: errText });
        toast.error(errText);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-slate-100/70 to-indigo-50/40 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans select-none">
      {/* Subtle Ambient Highlights */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-indigo-50/50 to-transparent pointer-events-none" />
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-sky-200/30 rounded-full blur-3xl pointer-events-none" />

      {/* Main Clean Card */}
      <div className="max-w-lg w-full bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-7 sm:p-9 relative z-10 my-8 transition-all duration-300">
        
        {/* Logo & Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="w-24 h-24 sm:w-28 sm:h-28 object-contain select-none transition-transform hover:scale-105 duration-200" 
            />
          </div>
          
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            สมัครสมาชิกเข้าสู่ระบบ
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            สร้างบัญชีเพื่อเริ่มต้นใช้งานระบบยืม-คืนอุปกรณ์
          </p>
        </div>

        {/* Message Alert Banner */}
        {message.text && (
          <div className={`mb-5 p-3.5 text-xs sm:text-sm rounded-2xl border flex items-start justify-between gap-3 animate-in fade-in duration-200 ${
            message.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}>
            <div className="flex items-start gap-2.5">
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed font-medium">{message.text}</span>
            </div>
            
            {message.type === 'success' && onSwitchToLogin && (
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="shrink-0 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl shadow-sm transition duration-150 cursor-pointer"
              >
                เข้าสู่ระบบทันที
              </button>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              ชื่อ-นามสกุล
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <IdCard className="w-4 h-4" />
              </div>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="เช่น นายสมชาย ใจดี"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/90 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition duration-200 text-sm font-medium"
                required
              />
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              ชื่อผู้ใช้งาน (Username)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="เช่น somchai.j"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/90 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition duration-200 text-sm font-medium"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              รหัสผ่าน (Password)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="อย่างน้อย 6 ตัวอักษร"
                className="w-full pl-10 pr-11 py-2.5 bg-slate-50/90 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition duration-200 text-sm font-medium"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-indigo-600 transition-colors focus:outline-none cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Role Selection (Segmented Control) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              ประเภทบัญชีผู้ใช้ (Role)
            </label>
            <div className="grid grid-cols-2 gap-2.5 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setRole('user')}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer ${
                  formData.role === 'user'
                    ? 'bg-white text-indigo-600 shadow-sm shadow-slate-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <User className="w-4 h-4" />
                <span>ผู้ใช้ทั่วไป / บุคลากร</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer ${
                  formData.role === 'admin'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm shadow-amber-500/20'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>ผู้ดูแลระบบ (Admin)</span>
              </button>
            </div>
          </div>

          {/* Admin Secret Key (if role is admin) */}
          {formData.role === 'admin' && (
            <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-1.5 animate-in fade-in zoom-in-95 duration-200">
              <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider">
                รหัสลับสำหรับผู้ดูแลระบบ (Admin Secret Key)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-500">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type={showAdminKey ? "text" : "password"}
                  name="adminKey"
                  value={formData.adminKey}
                  onChange={handleChange}
                  placeholder="กรอกรหัสยืนยันสิทธิ์ Admin"
                  className="w-full pl-10 pr-11 py-2 bg-white border border-amber-300 rounded-xl text-slate-800 placeholder-amber-400/70 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition duration-200 text-sm font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowAdminKey(!showAdminKey)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-amber-500 hover:text-amber-700 transition-colors focus:outline-none cursor-pointer"
                  tabIndex={-1}
                >
                  {showAdminKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-amber-700">
                * ต้องระบุรหัสลับที่ถูกต้องเพื่ออนุมัติสิทธิ์เข้าถึงระบบผู้ดูแล
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-indigo-600/20 transition duration-150 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed text-sm cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังบันทึกข้อมูล...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>ยืนยันการสมัครสมาชิก</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Link to Login */}
        {onSwitchToLogin && (
          <div className="mt-6 pt-5 border-t border-slate-100 text-center flex items-center justify-center gap-1.5 text-xs sm:text-sm">
            <span className="text-slate-500">มีบัญชีผู้ใช้งานอยู่แล้ว?</span>
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline focus:outline-none transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>กลับสู่หน้าเข้าสู่ระบบ</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

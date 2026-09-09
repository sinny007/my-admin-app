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
  AlertCircle,
  ChevronDown
} from 'lucide-react';

// รองรับทั้ง Vite (import.meta.env) และ Create React App (process.env)
const APPS_SCRIPT_URL = 
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_APPS_SCRIPT_URL) ||
  (typeof process !== 'undefined' && process.env && process.env.REACT_APP_APPS_SCRIPT_URL) ||
  "https://script.google.com/macros/s/AKfycbwm5p5wNDrOKljk058t6KkQK7bn35LgmkyW5TxB_X_mN98x4Ib13nmy-ArTIfWwJT7hvQ/exec";

export default function RegisterForm({ onSwitchToLogin }) {
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

  // ป้องกัน State update เมื่อ Component ถูก unmount
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    // Client-side Validation
    const trimmedUsername = formData.username.trim();
    const trimmedPassword = formData.password.trim();
    const trimmedName = formData.name.trim();
    const trimmedAdminKey = formData.adminKey.trim();

    if (!trimmedUsername || !trimmedPassword || !trimmedName) {
      setMessage({ type: 'error', text: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
      setLoading(false);
      return;
    }

    if (trimmedPassword.length < 6) {
      setMessage({ type: 'error', text: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' });
      setLoading(false);
      return;
    }

    if (formData.role === 'admin' && !trimmedAdminKey) {
      setMessage({ type: 'error', text: 'กรุณากรอกรหัสลับผู้ดูแลระบบ (Admin Key)' });
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
      } catch (parseError) {
        console.error("Response Parse Error:", rawText);
        throw new Error("ตอบกลับจากเซิร์ฟเวอร์ไม่ถูกต้อง (ข้อมูลไม่ใช่ JSON)");
      }

      if (!isMounted.current) return;

      if (result.success || result.status === 'success') {
        setMessage({ type: 'success', text: result.message || 'สมัครสมาชิกสำเร็จ!' });
        
        // รีเซ็ตฟอร์ม
        setFormData({
          username: '',
          password: '',
          name: '',
          role: 'user',
          adminKey: ''
        });
      } else {
        setMessage({ type: 'error', text: result.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก' });
      }
    } catch (err) {
      console.error("Register Error:", err);
      if (isMounted.current) {
        setMessage({ 
          type: 'error', 
          text: err.message || 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต' 
        });
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Decorative Elements */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Card */}
      <div className="max-w-md w-full bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 p-6 sm:p-10 relative z-10 my-8 transition-all duration-300">
        
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600/10 text-indigo-600 rounded-2xl mb-4 shadow-inner">
            <UserPlus className="w-8 h-8" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
            สมัครสมาชิก
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            กรอกข้อมูลเพื่อสร้างบัญชีเข้าใช้งานระบบยืม-คืน
          </p>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div className={`mb-6 p-4 text-sm rounded-2xl border flex items-start justify-between gap-3 animate-fade-in ${
            message.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}>
            <div className="flex items-start gap-2.5">
              {message.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{message.text}</span>
            </div>
            
            {message.type === 'success' && onSwitchToLogin && (
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="shrink-0 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-xl shadow-sm transition duration-150"
              >
                เข้าสู่ระบบ
              </button>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Full Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              ชื่อ-นามสกุล
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <IdCard className="w-5 h-5" />
              </div>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="นายสมชาย ใจดี"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition duration-200 text-sm"
                required
              />
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              ชื่อผู้ใช้งาน (Username)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-5 h-5" />
              </div>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="ระบุ Username"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition duration-200 text-sm"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              รหัสผ่าน (Password)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="อย่างน้อย 6 ตัวอักษร"
                className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition duration-200 text-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-indigo-600 transition-colors focus:outline-none"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              บทบาท (Role)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Shield className="w-5 h-5" />
              </div>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition duration-200 text-sm appearance-none cursor-pointer"
              >
                <option value="user">ผู้ใช้งานทั่วไป / บุคลากร</option>
                <option value="admin">ผู้ดูแลระบบ (Admin)</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Admin Secret Key */}
          {formData.role === 'admin' && (
            <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-1.5 animate-fade-in">
              <label className="block text-sm font-semibold text-amber-800">
                Admin Secret Key
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-500">
                  <KeyRound className="w-5 h-5" />
                </div>
                <input
                  type={showAdminKey ? "text" : "password"}
                  name="adminKey"
                  value={formData.adminKey}
                  onChange={handleChange}
                  placeholder="กรอกรหัสลับสำหรับ Admin"
                  className="w-full pl-11 pr-12 py-2.5 bg-white border border-amber-300 rounded-xl text-slate-800 placeholder-amber-400/70 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition duration-200 text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowAdminKey(!showAdminKey)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-amber-500 hover:text-amber-700 transition-colors focus:outline-none"
                  tabIndex={-1}
                >
                  {showAdminKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-indigo-500/25 transition duration-200 flex items-center justify-center gap-2 disabled:bg-indigo-300 disabled:shadow-none disabled:cursor-not-allowed text-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>กำลังบันทึกข้อมูล...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                <span>สมัครสมาชิก</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Link */}
        {onSwitchToLogin && (
          <div className="mt-8 pt-6 border-t border-slate-100 text-center flex items-center justify-center gap-1.5 text-sm">
            <span className="text-slate-500">มีบัญชีอยู่แล้ว?</span>
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline focus:outline-none transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>เข้าสู่ระบบ</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
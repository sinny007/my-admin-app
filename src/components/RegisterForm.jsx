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
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

const DEFAULT_APPS_SCRIPT_URL = 
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_APPS_SCRIPT_URL) ||
  (typeof process !== 'undefined' && process.env && process.env.REACT_APP_APPS_SCRIPT_URL) ||
  "https://script.google.com/macros/s/AKfycbxG9jHtv4457GsbJ0w0xG4_ILq09s_fzMYGB5diMracMOq_abJsW27n2CvXCdVVPngpXw/exec";

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

  // Password strength calculation
  const getPasswordStrength = () => {
    const pwd = formData.password;
    if (!pwd) return { score: 0, text: '', color: 'bg-slate-200' };
    if (pwd.length < 6) return { score: 1, text: 'สั้นเกินไป (ต้อง 6+ ตัว)', color: 'bg-rose-500', textColor: 'text-rose-600' };
    
    let score = 2;
    if (pwd.length >= 8) score++;
    if (/[0-9]/.test(pwd) && /[a-zA-Z]/.test(pwd)) score++;

    if (score <= 2) return { score: 2, text: 'ความปลอดภัยระดับ: ปานกลาง', color: 'bg-amber-500', textColor: 'text-amber-600' };
    return { score: 3, text: 'ความปลอดภัยระดับ: แข็งแรงมาก 👍', color: 'bg-emerald-500', textColor: 'text-emerald-600' };
  };

  const strength = getPasswordStrength();

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

        // Confetti explosion
        try {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch {
          // ignore
        }
        
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
    <div className="min-h-screen w-full bg-animated flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans select-none">
      {/* Floating Pastel Ambient Orbs */}
      <div className="absolute top-[-10%] left-[-5%] w-[450px] h-[450px] rounded-full opacity-60 pointer-events-none animate-orb-1"
        style={{ background: 'radial-gradient(circle, rgba(199, 210, 254, 0.7) 0%, transparent 70%)' }} />
      <div className="absolute bottom-[-10%] right-[-5%] w-[450px] h-[450px] rounded-full opacity-50 pointer-events-none animate-orb-2"
        style={{ background: 'radial-gradient(circle, rgba(254, 215, 170, 0.6) 0%, transparent 70%)' }} />

      {/* Main Modern Card */}
      <div className="max-w-lg w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-slate-300/40 dark:shadow-none border border-slate-200/90 dark:border-slate-800 p-7 sm:p-9 relative z-10 my-8 animate-scale-in">
        
        {/* Logo & Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl overflow-hidden border-2 border-indigo-100 dark:border-slate-700 shadow-md shadow-indigo-100 dark:shadow-none bg-white dark:bg-slate-800 p-2 animate-float">
              <img 
                src="/logo.png" 
                alt="Logo" 
                className="w-full h-full object-contain select-none" 
              />
            </div>
          </div>
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100/80 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-2 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>สร้างบัญชีผู้ใช้งานใหม่</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            สมัครสมาชิก
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            กรอกข้อมูลเพื่อเริ่มต้นการใช้งานระบบยืม-คืนอุปกรณ์ไอที
          </p>
        </div>

        {/* Message Alert Banner */}
        {message.text && (
          <div className={`mb-5 p-3.5 text-xs sm:text-sm rounded-2xl border flex items-start justify-between gap-3 animate-fade-up ${
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
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              ชื่อ-นามสกุล
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <IdCard className="w-4 h-4" />
              </div>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="เช่น นายสมชาย ใจดี"
                className="light-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-medium"
                required
              />
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              ชื่อผู้ใช้งาน (Username)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="เช่น somchai.j (ภาษาอังกฤษ)"
                className="light-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-medium"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              รหัสผ่าน (Password)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="อย่างน้อย 6 ตัวอักษร"
                className="light-input w-full pl-10 pr-11 py-2.5 rounded-xl text-sm font-medium"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus:outline-none cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Interactive Password Strength Indicator */}
            {formData.password && (
              <div className="mt-2 space-y-1 animate-fade-up">
                <div className="flex gap-1.5 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-300 ${strength.score >= 1 ? strength.color : 'bg-transparent'} w-1/3`} />
                  <div className={`h-full transition-all duration-300 ${strength.score >= 2 ? strength.color : 'bg-transparent'} w-1/3`} />
                  <div className={`h-full transition-all duration-300 ${strength.score >= 3 ? strength.color : 'bg-transparent'} w-1/3`} />
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className={`font-semibold ${strength.textColor}`}>{strength.text}</span>
                  <span className="text-slate-400 dark:text-slate-500 font-mono">{formData.password.length} ตัวอักษร</span>
                </div>
              </div>
            )}
          </div>

          {/* Role Selection (Segmented Control) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              ประเภทบัญชีผู้ใช้ (Role)
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100/90 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setRole('user')}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer ${
                  formData.role === 'user'
                    ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm border border-slate-200/60 dark:border-slate-600'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <User className="w-4 h-4" />
                <span>ผู้ใช้ทั่วไป (User)</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer ${
                  formData.role === 'admin'
                    ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/25'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>ผู้ดูแลระบบ (Admin)</span>
              </button>
            </div>
          </div>

          {/* Admin Secret Key (if role is admin) */}
          {formData.role === 'admin' && (
            <div className="p-4 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl space-y-2 animate-scale-in">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>รหัสลับสำหรับผู้ดูแลระบบ (Admin Secret Key)</span>
              </div>
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
                  className="w-full pl-10 pr-11 py-2 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-xl text-slate-800 dark:text-slate-200 placeholder-amber-400/70 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition duration-200 text-sm font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowAdminKey(!showAdminKey)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-amber-600 dark:text-amber-400 hover:text-amber-800 transition-colors focus:outline-none cursor-pointer"
                  tabIndex={-1}
                >
                  {showAdminKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-snug">
                * ต้องระบุรหัสผ่านลับของผู้ดูแลระบบที่ได้รับอนุญาตเท่านั้น
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98] btn-gradient-primary shadow-indigo-500/25"
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
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center flex items-center justify-center gap-1.5 text-xs sm:text-sm">
            <span className="text-slate-500 dark:text-slate-400">มีบัญชีผู้ใช้งานอยู่แล้ว?</span>
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline focus:outline-none transition-colors inline-flex items-center gap-1 cursor-pointer"
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

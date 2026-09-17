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
  ArrowRight, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ShieldCheck, 
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

const DEFAULT_APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxjMy2NzVzuWIBlobYAeyBD92PYUQUoxu6n0oF4ReWN91zE9FM7BwrsKuEzWM2ubALIQA/exec";
export default function RegisterForm({ onSwitchToLogin, onRegisterSuccess, apiUrl }) {
  const APPS_SCRIPT_URL = apiUrl || DEFAULT_APPS_SCRIPT_URL;

  // Step 1: 'role-select', Step 2: 'form-details'
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    role: 'student', // 'student' หรือ 'staff'
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
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectRole = (selectedRole) => {
    setFormData((prev) => ({
      ...prev,
      role: selectedRole,
      adminKey: ''
    }));
  };

  const handleNextStep = () => {
    setMessage({ type: '', text: '' });
    setCurrentStep(2);
  };

  const handlePrevStep = () => {
    setMessage({ type: '', text: '' });
    setCurrentStep(1);
  };

  // คำนวณความแข็งแกร่งของรหัสผ่าน
  const getPasswordStrength = () => {
    const pwd = formData.password;
    if (!pwd) return { score: 0, text: '', color: 'bg-slate-200 dark:bg-slate-700' };
    if (pwd.length < 6) return { score: 1, text: 'สั้นเกินไป (ต้อง 6 ตัวขึ้นไป)', color: 'bg-rose-500', textColor: 'text-rose-600 dark:text-rose-400' };
    
    let score = 2;
    if (pwd.length >= 8) score++;
    if (/[0-9]/.test(pwd) && /[a-zA-Z]/.test(pwd)) score++;

    if (score <= 2) return { score: 2, text: 'ความปลอดภัยระดับ: ปานกลาง', color: 'bg-amber-500', textColor: 'text-amber-600 dark:text-amber-400' };
    return { score: 3, text: 'ความปลอดภัยระดับ: แข็งแรงมาก 👍', color: 'bg-emerald-500', textColor: 'text-emerald-600 dark:text-emerald-400' };
  };

  const strength = getPasswordStrength();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setMessage({ type: '', text: '' });

    const trimmedUsername = formData.username.trim();
    const trimmedPassword = formData.password.trim();
    const trimmedName = formData.name.trim();
    const trimmedAdminKey = formData.adminKey.trim();

    // Validation เช็กความถูกต้องของข้อมูล
    if (!trimmedUsername || !trimmedPassword || !trimmedName) {
      const err = 'กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง';
      setMessage({ type: 'error', text: err });
      toast.error(err);
      return;
    }

    if (!/^[A-Za-z0-9._-]{3,50}$/.test(trimmedUsername)) {
      const err = 'Username ใช้ได้เฉพาะ A-Z, a-z, 0-9, จุด (.), ขีด (-) และขีดล่าง (_) ความยาว 3-50 ตัว';
      setMessage({ type: 'error', text: err });
      toast.error(err);
      return;
    }

    if (trimmedPassword.length < 6) {
      const err = 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร';
      setMessage({ type: 'error', text: err });
      toast.error(err);
      return;
    }

    // ไม่มีการตรวจสอบ Admin Key แล้ว (ไม่มีโรล admin ในการสมัคร)

    setLoading(true);

    try {
      const payload = {
        action: 'register',
        username: trimmedUsername,
        password: trimmedPassword,
        name: trimmedName,
        role: formData.role,
        adminKey: ''
      };

      // ยิง API ไปยัง Google Apps Script (ส่งแบบ text/plain เพื่อเลี่ยงการติด Preflight CORS)
      const cleanUrl = String(APPS_SCRIPT_URL || '').trim();
      if (!cleanUrl || !cleanUrl.startsWith('http')) {
        throw new Error('ไม่พบ URL ของ Google Apps Script Web App ที่ถูกต้อง');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      let response;
      try {
        response = await fetch(cleanUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8'
          },
          body: JSON.stringify(payload),
          redirect: 'follow',
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeoutId);
      }

      const rawText = await response.text();
      let result;

      try {
        result = JSON.parse(rawText);
      } catch {
        console.error('Register API raw response:', rawText);
        throw new Error(
          response.ok
            ? 'ระบบตอบกลับไม่ใช่ JSON กรุณาตรวจสอบ Web App URL/Deployment ของ Google Apps Script'
            : `เซิร์ฟเวอร์ตอบกลับ HTTP ${response.status}`
        );
      }

      if (!isMounted.current) return;

      if (result.success || result.status === 'success') {
        const successMsg = result.message || 'สมัครสมาชิกสำเร็จเรียบร้อยแล้ว!';
        setMessage({ type: 'success', text: successMsg });
        toast.success(successMsg);

        // จุดพลุฉลองเมื่อสมัครสำเร็จ
        try {
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#ea580c', '#f97316', '#fb923c', '#f59e0b', '#10b981', '#ffffff']
          });
        } catch {
          // ignore confetti error
        }
        
        // ล้างฟอร์ม
        setFormData({
          username: '',
          password: '',
          name: '',
          role: 'student',
          adminKey: ''
        });

        // นำทางกลับหน้า Login
        setTimeout(() => {
          if (isMounted.current) {
            if (onRegisterSuccess) {
              onRegisterSuccess();
            } else if (onSwitchToLogin) {
              onSwitchToLogin();
            }
          }
        }, 1500);

      } else {
        const err = result.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก';
        setMessage({ type: 'error', text: err });
        toast.error(err);
      }
    } catch (err) {
      console.error("Register Error:", err);
      if (isMounted.current) {
        const errText = err.message || 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบอินเทอร์เน็ต';
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
      {/* Dynamic Background Elements */}
      <div 
        className="absolute top-[-10%] left-[-5%] w-[460px] h-[460px] rounded-full opacity-70 dark:opacity-25 pointer-events-none animate-orb-1"
        style={{ background: 'radial-gradient(circle, rgba(254, 215, 170, 0.8) 0%, transparent 70%)' }} 
      />
      <div 
        className="absolute bottom-[-10%] right-[-5%] w-[460px] h-[460px] rounded-full opacity-60 dark:opacity-20 pointer-events-none animate-orb-2"
        style={{ background: 'radial-gradient(circle, rgba(253, 186, 116, 0.7) 0%, transparent 70%)' }} 
      />
      <div 
        className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full opacity-45 dark:opacity-15 pointer-events-none animate-orb-3"
        style={{ background: 'radial-gradient(circle, rgba(254, 240, 138, 0.6) 0%, transparent 70%)' }} 
      />

      {/* Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.045] dark:opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, #ea580c 1.5px, transparent 1.5px)`,
          backgroundSize: '28px 28px'
        }} 
      />

      {/* Main Card */}
      <div className="max-w-xl w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-orange-500/10 dark:shadow-none border border-orange-200/90 dark:border-orange-950/70 p-6 sm:p-9 relative z-10 my-8 animate-scale-in">
        
        {/* Header Section */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-orange-200 dark:border-slate-700 shadow-md shadow-orange-200/50 dark:shadow-none bg-white dark:bg-slate-800 p-2 animate-float">
              <img 
                src="/logo.png" 
                alt="Logo" 
                className="w-full h-full object-contain select-none" 
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          </div>
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-950/60 border border-orange-200/80 dark:border-orange-900 text-orange-700 dark:text-orange-300 text-xs font-semibold mb-2 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
            <span>สร้างบัญชีผู้ใช้งานใหม่</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            สมัครสมาชิก
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {currentStep === 1 
              ? 'ขั้นตอนที่ 1: เลือกประเภทบัญชีที่ต้องการสมัคร' 
              : `ขั้นตอนที่ 2: กรอกข้อมูลส่วนตัวสำหรับ (${formData.role === 'staff' ? 'บุคลากร' : 'นักศึกษา'})`}
          </p>

          {/* Stepper Bar */}
          <div className="flex items-center justify-center gap-3 mt-4">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
              currentStep === 1 
                ? 'bg-orange-600 text-white shadow-sm shadow-orange-500/30' 
                : 'bg-orange-100 text-orange-800 dark:bg-slate-800 dark:text-slate-300'
            }`}>
              <span className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center text-[10px]">1</span>
              <span>เลือกประเภทบัญชี</span>
            </div>
            <div className="w-8 h-0.5 bg-orange-200 dark:bg-slate-700" />
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
              currentStep === 2 
                ? 'bg-orange-600 text-white shadow-sm shadow-orange-500/30' 
                : 'bg-slate-100 text-slate-400 dark:bg-slate-800/60 dark:text-slate-500'
            }`}>
              <span className="w-4 h-4 rounded-full bg-current/20 flex items-center justify-center text-[10px]">2</span>
              <span>กรอกข้อมูล</span>
            </div>
          </div>
        </div>

        {/* Alert Notification */}
        {message.text && (
          <div className={`mb-5 p-3.5 text-xs sm:text-sm rounded-2xl border flex items-start justify-between gap-3 animate-fade-up ${
            message.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300' 
              : 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300'
          }`}>
            <div className="flex items-start gap-2.5">
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed font-medium">{message.text}</span>
            </div>
            
            {message.type === 'success' && (onSwitchToLogin || onRegisterSuccess) && (
              <button
                type="button"
                onClick={onRegisterSuccess || onSwitchToLogin}
                className="shrink-0 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl shadow-sm transition duration-150 cursor-pointer"
              >
                เข้าสู่ระบบทันที
              </button>
            )}
          </div>
        )}

        {/* ─── STEP 1: ROLE SELECTION ───────────────────────────── */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-scale-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              
              {/* Card นักศึกษา */}
              <div 
                onClick={() => handleSelectRole('student')}
                className={`relative p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer text-left flex flex-col justify-between ${
                  formData.role === 'student'
                    ? 'bg-orange-50/90 dark:bg-orange-950/30 border-orange-500 ring-2 ring-orange-500/20 shadow-md shadow-orange-500/10'
                    : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:border-orange-300 hover:bg-orange-50/30 dark:hover:bg-slate-800'
                }`}
              >
                {formData.role === 'student' && (
                  <div className="absolute top-3.5 right-3.5 w-6 h-6 rounded-full bg-orange-600 text-white flex items-center justify-center shadow-xs animate-scale-in">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-3">
                    <User className="w-6 h-6" />
                  </div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    นักศึกษา
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    สำหรับนักศึกษา ขอยืมอุปกรณ์ไอที ตรวจสอบสถานะการยืม และดูประวัติการใช้งาน
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-orange-100 dark:border-slate-700/60 flex items-center gap-1.5 text-[11px] font-semibold text-orange-700 dark:text-orange-300">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>สมัครง่าย ไม่ต้องใช้รหัสลับ</span>
                </div>
              </div>

              {/* Card บุคลากร */}
              <div 
                onClick={() => handleSelectRole('staff')}
                className={`relative p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer text-left flex flex-col justify-between ${
                  formData.role === 'staff'
                    ? 'bg-amber-50/90 dark:bg-amber-950/30 border-amber-500 ring-2 ring-amber-500/20 shadow-md shadow-amber-500/10'
                    : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:border-amber-300 hover:bg-amber-50/30 dark:hover:bg-slate-800'
                }`}
              >
                {formData.role === 'staff' && (
                  <div className="absolute top-3.5 right-3.5 w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center shadow-xs animate-scale-in">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
                    <Shield className="w-6 h-6" />
                  </div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    บุคลากร
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    สำหรับอาจารย์ เจ้าหน้าที่ และบุคลากรของสถาบัน ยืม-คืนอุปกรณ์ไอทีและติดตามสถานะ
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-amber-100 dark:border-slate-700/60 flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>สมัครง่าย ไม่ต้องใช้รหัสลับ</span>
                </div>
              </div>

            </div>

            {/* Next Button */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleNextStep}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer active:scale-[0.98] bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/25"
              >
                <span>ไปกรอกข้อมูลต่อ ({formData.role === 'staff' ? 'บุคลากร' : 'นักศึกษา'})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 2: FORM DETAILS ──────────────────────────── */}
        {currentStep === 2 && (
          <form onSubmit={handleSubmit} className="space-y-4 animate-fade-up">
            
            {/* Selected Role Badge */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-orange-50/90 dark:bg-orange-950/40 border border-orange-200/90 dark:border-orange-900/70">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-xl ${
                  formData.role === 'staff' 
                    ? 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300' 
                    : 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300'
                }`}>
                  {formData.role === 'staff' ? <Shield className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>
                <div className="text-xs">
                  <span className="text-slate-500 dark:text-slate-400">ประเภทบัญชีที่เลือก: </span>
                  <span className="font-extrabold text-orange-900 dark:text-orange-200">
                    {formData.role === 'staff' ? 'บุคลากร' : 'นักศึกษา'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handlePrevStep}
                className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:underline cursor-pointer"
              >
                เปลี่ยนประเภท
              </button>
            </div>

            {/* Name */}
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
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition duration-200"
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
                  placeholder="เช่น somchai.j (ตัวภาษาอังกฤษ)"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition duration-200"
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
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition duration-200"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors focus:outline-none cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Meter */}
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

            {/* ไม่มีช่อง Admin Key แล้ว — ทั้งนักศึกษาและบุคลากรสมัครได้โดยตรง */}

            {/* Buttons */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={handlePrevStep}
                className="py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>ย้อนกลับ</span>
              </button>
              
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98] bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/25"
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
            </div>
          </form>
        )}

        {/* Footer */}
        {onSwitchToLogin && (
          <div className="mt-6 pt-5 border-t border-orange-100 dark:border-slate-800 text-center flex items-center justify-center gap-1.5 text-xs sm:text-sm">
            <span className="text-slate-500 dark:text-slate-400">มีบัญชีผู้ใช้งานอยู่แล้ว?</span>
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="font-bold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:underline focus:outline-none transition-colors inline-flex items-center gap-1 cursor-pointer"
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
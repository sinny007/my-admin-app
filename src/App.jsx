import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, LogIn, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import UserDashboard from './components/UserDashboard';
import AdminDashboard from './components/AdminDashboard';
import RegisterForm from './components/RegisterForm';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

const API_URL =
  import.meta.env?.VITE_APPS_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbyizcvNesWFWqfBt41WI56A-D0XOaeTspGUJwWV7ua2lE4R3bA1r332A86DSl4yeVwSOw/exec";

export default function App() {
  // อ่านค่า LocalStorage ทันทีตอนดึง State เพื่อไม่ให้หน้า login แวบขึ้นมารอบหนึ่ง
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('app_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [view, setView] = useState(() => (currentUser ? 'dashboard' : 'login')); 
  
  const [loginForm, setLoginForm] = useState({ username: '', password: '', rememberMe: false });
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLoginChange = (e) => {
    const { name, value, type, checked } = e.target;
    setLoginForm((prev) => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');

    const trimmedUsername = loginForm.username.trim();
    const trimmedPassword = loginForm.password.trim();

    if (!trimmedUsername || !trimmedPassword) {
      const msg = 'กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน';
      setLoginError(msg);
      toast.error(msg);
      return;
    }

    setIsSubmitting(true);

    try {
      // ส่งคำขอ Login ไปยัง Google Apps Script API
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'login',
          username: trimmedUsername,
          password: trimmedPassword
        })
      });

      const textResponse = await response.text();
      let data;
      try {
        data = JSON.parse(textResponse);
      } catch {
        throw new Error('รูปแบบข้อมูลตอบกลับจากเซิร์ฟเวอร์ไม่ถูกต้อง');
      }

      if (data.success && data.user) {
        const userData = {
          ...data.user,
          role: String(data.user.role || 'user').toLowerCase().trim()
        };

        setCurrentUser(userData);
        if (loginForm.rememberMe) {
          localStorage.setItem('app_user', JSON.stringify(userData));
        }
        toast.success(`ยินดีต้อนรับคุณ ${userData.name || userData.username}`);
        setView('dashboard');
        setLoginForm({ username: '', password: '', rememberMe: false });
      } else {
        const errMsg = data.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
        setLoginError(errMsg);
        toast.error(errMsg);
      }
    } catch (error) {
      console.error('Login Error:', error);
      const errMsg = error.message || 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง';
      setLoginError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('app_user');
    setView('login');
    toast.info('ออกจากระบบเรียบร้อยแล้ว');
  };

  return (
    <ErrorBoundary>
      <>
      {/* Toast Notification Container ที่ใช้ร่วมกันทั่วทั้งแอพ */}
      <Toaster 
        position="top-right" 
        richColors 
        closeButton 
        theme="light"
        toastOptions={{
          style: {
            borderRadius: '16px',
            fontFamily: 'var(--font-sans)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
          }
        }} 
      />

      {view === 'dashboard' && currentUser ? (
        currentUser.role === 'admin' ? (
          <AdminDashboard user={currentUser} onLogout={handleLogout} apiUrl={API_URL} />
        ) : (
          <UserDashboard user={currentUser} onLogout={handleLogout} apiUrl={API_URL} />
        )
      ) : view === 'register' ? (
        <RegisterForm
          onSwitchToLogin={() => setView('login')}
          onRegisterSuccess={() => setView('login')}
          apiUrl={API_URL}
        />
      ) : (
        <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-slate-100/70 to-indigo-50/40 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans select-none">
          {/* Subtle Clean Ambient Highlights */}
          <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-indigo-50/50 to-transparent pointer-events-none" />
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-sky-200/30 rounded-full blur-3xl pointer-events-none" />

          {/* Main Clean Login Card */}
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-7 sm:p-9 relative z-10 my-auto transition-all duration-300">
            
            {/* Header / Brand */}
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <img 
                  src="/logo.png" 
                  alt="Logo" 
                  className="w-24 h-24 sm:w-28 sm:h-28 object-contain select-none transition-transform hover:scale-105 duration-200" 
                />
              </div>
              
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                ระบบยืม-คืนอุปกรณ์ไอที
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                เข้าสู่ระบบเพื่อจัดการและรับบริการยืม-คืนอุปกรณ์
              </p>
            </div>

            {/* Error Alert Box */}
            {loginError && (
              <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200/80 text-rose-700 text-xs sm:text-sm rounded-2xl flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span className="leading-snug font-medium">{loginError}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  ชื่อผู้ใช้งาน (Username)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    autoComplete="username"
                    placeholder="กรอก Username ของคุณ"
                    value={loginForm.username}
                    onChange={handleLoginChange}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition duration-200 text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  รหัสผ่าน (Password)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    placeholder="กรอกรหัสผ่านของคุณ"
                    value={loginForm.password}
                    onChange={handleLoginChange}
                    className="w-full pl-10 pr-11 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition duration-200 text-sm font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-indigo-600 transition-colors focus:outline-none cursor-pointer"
                    tabIndex={-1}
                    aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600 hover:text-slate-900 transition-colors select-none">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={loginForm.rememberMe}
                    onChange={handleLoginChange}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                  />
                  <span className="font-medium">จดจำฉันไว้ในระบบ</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-indigo-600/20 transition duration-150 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed text-sm cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังเข้าสู่ระบบ...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>เข้าสู่ระบบ</span>
                  </>
                )}
              </button>
            </form>

            {/* Footer Registration Link */}
            <div className="mt-6 pt-5 border-t border-slate-100 text-center flex items-center justify-center gap-1.5 text-xs sm:text-sm">
              <span className="text-slate-500">ยังไม่มีบัญชีผู้ใช้งาน?</span>
              <button
                type="button"
                onClick={() => setView('register')}
                className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline focus:outline-none transition-colors cursor-pointer"
              >
                สมัครสมาชิกที่นี่
              </button>
            </div>

            {/* Security Badge */}
            <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>ความปลอดภัยมาตรฐานการเชื่อมต่อ SSL/TLS</span>
            </div>

          </div>
        </div>
      )}
      </>
    </ErrorBoundary>
  );
}
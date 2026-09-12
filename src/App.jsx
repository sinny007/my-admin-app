import React, { useState, Suspense, lazy } from 'react';
import { User, Lock, Eye, EyeOff, LogIn, Loader2, AlertCircle, ShieldCheck, Zap } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

// Code-splitting ด้วย lazy loading เพื่อลด Initial Bundle Size ลงกว่า 85%
const UserDashboard = lazy(() => import('./components/UserDashboard'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const RegisterForm = lazy(() => import('./components/RegisterForm'));

const API_URL =
  import.meta.env?.VITE_APPS_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbyizcvNesWFWqfBt41WI56A-D0XOaeTspGUJwWV7ua2lE4R3bA1r332A86DSl4yeVwSOw/exec";

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('app_user') || sessionStorage.getItem('app_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [view, setView] = useState(() => (currentUser ? 'dashboard' : 'login'));
  const [loginForm, setLoginForm] = useState({ username: '', password: '', rememberMe: true });
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLoginChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (loginError) setLoginError('');
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
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'login',
          username: trimmedUsername,
          password: trimmedPassword
        }),
        redirect: 'follow'
      });

      const textResponse = await response.text();
      let data;
      try {
        data = JSON.parse(textResponse);
      } catch {
        console.error('Non-JSON server response:', textResponse);
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
          sessionStorage.removeItem('app_user');
        } else {
          sessionStorage.setItem('app_user', JSON.stringify(userData));
          localStorage.removeItem('app_user');
        }

        toast.success(`ยินดีต้อนรับคุณ ${userData.name || userData.username}`);
        setView('dashboard');
        setLoginForm({ username: '', password: '', rememberMe: true });
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

  const handleUpdateUser = (updatedUser) => {
    setCurrentUser(updatedUser);
    try {
      if (localStorage.getItem('app_user')) {
        localStorage.setItem('app_user', JSON.stringify(updatedUser));
      }
      if (sessionStorage.getItem('app_user')) {
        sessionStorage.setItem('app_user', JSON.stringify(updatedUser));
      }
    } catch {
      // ignore
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('app_user');
    sessionStorage.removeItem('app_user');
    setView('login');
    toast.info('ออกจากระบบเรียบร้อยแล้ว');
  };

  return (
    <ErrorBoundary>
      <>
      <Toaster
        position="top-right"
        richColors
        closeButton
        theme="dark"
        toastOptions={{
          style: {
            borderRadius: '14px',
            fontFamily: 'var(--font-sans)',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(99,102,241,0.25)',
            color: '#e2e8f0',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4), 0 0 20px rgba(99,102,241,0.1)'
          }
        }}
      />

      <Suspense fallback={
        <div className="min-h-screen w-full bg-animated flex flex-col items-center justify-center p-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-2 border-indigo-500/30 animate-spin-slow" />
              <div className="absolute inset-2 rounded-full border-2 border-t-indigo-400 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Zap className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <p className="text-sm font-semibold tracking-widest text-slate-400 uppercase font-mono animate-pulse">กำลังโหลด...</p>
          </div>
        </div>
      }>
        {view === 'dashboard' && currentUser ? (
          currentUser.role === 'admin' ? (
            <AdminDashboard
              user={currentUser}
              onLogout={handleLogout}
              apiUrl={API_URL}
              onUpdateUser={handleUpdateUser}
            />
          ) : (
            <UserDashboard
              user={currentUser}
              onLogout={handleLogout}
              apiUrl={API_URL}
              onUpdateUser={handleUpdateUser}
            />
          )
        ) : view === 'register' ? (
          <RegisterForm
            onSwitchToLogin={() => setView('login')}
            onRegisterSuccess={() => setView('login')}
            apiUrl={API_URL}
          />
        ) : (

        /* ─── LOGIN PAGE ─────────────────────────────────────────────── */
        <div className="min-h-screen w-full bg-animated flex items-center justify-center p-4 sm:p-6 relative overflow-hidden select-none">

          {/* Animated Background Orbs */}
          <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-20 pointer-events-none animate-orb-1"
            style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }} />
          <div className="absolute bottom-[-15%] right-[-10%] w-[450px] h-[450px] rounded-full opacity-15 pointer-events-none animate-orb-2"
            style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
          <div className="absolute top-[40%] right-[20%] w-[280px] h-[280px] rounded-full opacity-10 pointer-events-none animate-orb-3"
            style={{ background: 'radial-gradient(circle, #22d3ee 0%, transparent 70%)' }} />

          {/* Subtle Grid Pattern */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(rgba(99,102,241,1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,1) 1px, transparent 1px)`,
              backgroundSize: '60px 60px'
            }} />

          {/* Login Card */}
          <div className="relative z-10 w-full max-w-[420px] animate-scale-in">

            {/* Glow behind card */}
            <div className="absolute inset-0 rounded-3xl opacity-30 blur-2xl pointer-events-none"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #22d3ee)', transform: 'scale(1.05)' }} />

            <div className="relative glass-dark rounded-3xl p-7 sm:p-9 shadow-2xl neon-border-indigo">

              {/* Header / Brand */}
              <div className="text-center mb-7">
                <div className="flex justify-center mb-5">
                  <div className="relative">
                    {/* Glow ring behind logo */}
                    <div className="absolute inset-0 rounded-2xl animate-glow" style={{ background: 'transparent' }} />
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border border-indigo-500/30 shadow-lg shadow-indigo-500/20 animate-float bg-slate-900/50 p-1">
                      <img
                        src="/logo.png"
                        alt="Logo"
                        className="w-full h-full object-contain select-none"
                      />
                    </div>
                  </div>
                </div>

                <h1 className="text-2xl font-black tracking-tight gradient-text mb-1">
                  ระบบยืม-คืนอุปกรณ์ไอที
                </h1>
                <p className="text-xs text-slate-400">
                  เข้าสู่ระบบเพื่อจัดการและรับบริการยืม-คืนอุปกรณ์
                </p>
              </div>

              {/* Error Alert */}
              {loginError && (
                <div className="mb-5 p-3.5 rounded-2xl flex items-start gap-2.5 animate-fade-up"
                  style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)' }}>
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span className="text-xs leading-snug font-medium text-rose-300">{loginError}</span>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-4">

                {/* Username Field */}
                <div>
                  <label htmlFor="username" className="block text-[11px] font-bold uppercase tracking-widest mb-2 text-slate-400">
                    ชื่อผู้ใช้งาน (Username)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-indigo-400/60">
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
                      className="dark-input w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label htmlFor="password" className="block text-[11px] font-bold uppercase tracking-widest mb-2 text-slate-400">
                    รหัสผ่าน (Password)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-indigo-400/60">
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
                      className="dark-input w-full pl-10 pr-11 py-3 rounded-xl text-sm font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-indigo-400 transition-colors focus:outline-none cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-200 transition-colors select-none">
                    <input
                      type="checkbox"
                      name="rememberMe"
                      checked={loginForm.rememberMe}
                      onChange={handleLoginChange}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500/30 cursor-pointer accent-indigo-500"
                    />
                    <span className="font-medium">จดจำฉันไว้ในระบบ</span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-1 py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.97] btn-gradient-primary"
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
              <div className="mt-6 pt-5 text-center flex items-center justify-center gap-1.5 text-xs sm:text-sm"
                style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <span className="text-slate-500">ยังไม่มีบัญชีผู้ใช้งาน?</span>
                <button
                  type="button"
                  onClick={() => setView('register')}
                  className="font-bold text-indigo-400 hover:text-indigo-300 hover:underline focus:outline-none transition-colors cursor-pointer"
                >
                  สมัครสมาชิกที่นี่
                </button>
              </div>

              {/* Security Badge */}
              <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-600">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>ความปลอดภัยมาตรฐานการเชื่อมต่อ SSL/TLS</span>
              </div>

            </div>
          </div>
        </div>
        )}
      </Suspense>
      </>
    </ErrorBoundary>
  );
}
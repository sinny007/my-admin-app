import React, { useState, useEffect, Suspense, lazy } from 'react';
import { User, Lock, Eye, EyeOff, LogIn, Loader2, AlertCircle, ShieldCheck, Sparkles, Laptop, Sun, Moon } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

// Code-splitting ด้วย lazy loading เพื่อลด Initial Bundle Size
const UserDashboard = lazy(() => import('./components/UserDashboard'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const RegisterForm = lazy(() => import('./components/RegisterForm'));

const API_URL =
  import.meta.env?.VITE_APPS_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbxjMy2NzVzuWIBlobYAeyBD92PYUQUoxu6n0oF4ReWN91zE9FM7BwrsKuEzWM2ubALIQA/exec";

export default function App() {
  // Theme state
  const [isDark, setIsDark] = useState(() => {
    try {
      const savedTheme = localStorage.getItem('app_theme');
      if (savedTheme) return savedTheme === 'dark';
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('app_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('app_theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(prev => !prev);

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
        theme={isDark ? "dark" : "light"}
        toastOptions={{
          style: {
            borderRadius: '14px',
            fontFamily: 'var(--font-sans)',
            background: isDark ? '#1e293b' : '#ffffff',
            border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
            color: isDark ? '#f8fafc' : '#0f172a',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)'
          }
        }}
      />

      <Suspense fallback={
        <div className="min-h-screen w-full bg-animated flex flex-col items-center justify-center p-6">
          <div className="flex flex-col items-center gap-4 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-8 rounded-3xl border border-orange-200/80 dark:border-orange-950/60 shadow-xl shadow-orange-100/60 dark:shadow-none">
            <div className="relative w-14 h-14">
              <div className="absolute inset-0 rounded-full border-3 border-orange-100 dark:border-slate-700 animate-spin-slow" />
              <div className="absolute inset-1 rounded-full border-3 border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Laptop className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <p className="text-sm font-semibold tracking-wider text-orange-900/80 dark:text-orange-200/90 font-sans animate-pulse">กำลังโหลดข้อมูลระบบ...</p>
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
              isDark={isDark}
              toggleTheme={toggleTheme}
            />
          ) : (
            <UserDashboard
              user={currentUser}
              onLogout={handleLogout}
              apiUrl={API_URL}
              onUpdateUser={handleUpdateUser}
              isDark={isDark}
              toggleTheme={toggleTheme}
            />
          )
        ) : view === 'register' ? (
          <div className="relative">
            {/* Floating Theme Toggle in Register view */}
            <div className="absolute top-4 right-4 z-30">
              <button
                type="button"
                onClick={toggleTheme}
                className={`p-2.5 rounded-2xl border transition-all cursor-pointer shadow-md backdrop-blur-md ${
                  isDark
                    ? 'bg-slate-900/90 border-orange-500/30 text-amber-400 hover:bg-slate-800 hover:border-orange-400'
                    : 'bg-white/95 border-orange-200/90 text-orange-700 hover:bg-orange-50 hover:text-orange-600 shadow-orange-100/50'
                }`}
                title={isDark ? "สลับเป็นโหมดสว่าง" : "สลับเป็นโหมดมืด"}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
            <RegisterForm
              onSwitchToLogin={() => setView('login')}
              onRegisterSuccess={() => setView('login')}
              apiUrl={API_URL}
            />
          </div>
        ) : (

        /* ─── MODERN LOGIN PAGE (ORANGE & WHITE BRIGHT THEME) ──────── */
        <div className="min-h-screen w-full bg-animated flex items-center justify-center p-4 sm:p-6 relative overflow-hidden select-none">

          {/* Floating Theme Toggle (Login Screen) */}
          <div className="absolute top-4 right-4 z-20">
            <button
              type="button"
              onClick={toggleTheme}
              className={`p-2.5 rounded-2xl border transition-all cursor-pointer shadow-md backdrop-blur-md ${
                isDark
                  ? 'bg-slate-900/90 border-orange-500/30 text-amber-400 hover:bg-slate-800 hover:border-orange-400'
                  : 'bg-white/95 border-orange-200/90 text-orange-700 hover:bg-orange-50 hover:text-orange-600 shadow-orange-100/50'
              }`}
              title={isDark ? "สลับเป็นโหมดสว่าง (Light Mode)" : "สลับเป็นโหมดมืด (Dark Mode)"}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>

          {/* Floating Ambient Warm Orbs */}
          <div className="absolute top-[-10%] left-[-5%] w-[480px] h-[480px] rounded-full opacity-70 dark:opacity-25 pointer-events-none animate-orb-1"
            style={{ background: 'radial-gradient(circle, rgba(254, 215, 170, 0.8) 0%, transparent 70%)' }} />
          <div className="absolute bottom-[-10%] right-[-5%] w-[460px] h-[460px] rounded-full opacity-60 dark:opacity-20 pointer-events-none animate-orb-2"
            style={{ background: 'radial-gradient(circle, rgba(253, 186, 116, 0.7) 0%, transparent 70%)' }} />
          <div className="absolute top-[35%] right-[15%] w-[320px] h-[320px] rounded-full opacity-50 dark:opacity-15 pointer-events-none animate-orb-3"
            style={{ background: 'radial-gradient(circle, rgba(254, 240, 138, 0.6) 0%, transparent 70%)' }} />

          {/* Subtle Geometric Pattern Overlay */}
          <div className="absolute inset-0 opacity-[0.045] dark:opacity-[0.06] pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(circle, #ea580c 1.5px, transparent 1.5px)`,
              backgroundSize: '28px 28px'
            }} />

          {/* Login Card Container */}
          <div className="relative z-10 w-full max-w-[440px] animate-scale-in">

            {/* Glowing card border background */}
            <div className="absolute -inset-1 rounded-[32px] opacity-40 dark:opacity-30 blur-xl pointer-events-none"
              style={{ background: 'linear-gradient(135deg, #fb923c, #f97316, #f59e0b)' }} />

            <div className="relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl p-7 sm:p-9 shadow-2xl shadow-orange-500/10 dark:shadow-none border border-orange-200/90 dark:border-orange-950/70">

              {/* Header / Brand */}
              <div className="text-center mb-6">
                <div className="flex justify-center mb-4">
                  <div className="relative group">
                    <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl overflow-hidden border-2 border-orange-200 dark:border-slate-700 shadow-md shadow-orange-200/50 dark:shadow-none animate-float bg-white dark:bg-slate-800 p-2">
                      <img
                        src="/logo.png"
                        alt="IT Borrow Logo"
                        className="w-full h-full object-contain select-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-950/60 border border-orange-200/80 dark:border-orange-900 text-orange-700 dark:text-orange-300 text-xs font-semibold mb-2 shadow-xs">
                  <Sparkles className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                  <span>ระบบยืม-คืนอุปกรณ์ไอที</span>
                </div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mb-1">
                  เข้าสู่ระบบ
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  ยินดีต้อนรับ! เข้าสู่ระบบเพื่อจัดการและขอยืมอุปกรณ์
                </p>
              </div>

              {/* Error Alert */}
              {loginError && (
                <div className="mb-5 p-3.5 rounded-2xl flex items-start gap-2.5 animate-fade-up bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span className="text-xs leading-snug font-medium">{loginError}</span>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-4">

                {/* Username Field */}
                <div>
                  <label htmlFor="username" className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-slate-700 dark:text-slate-300">
                    ชื่อผู้ใช้งาน (Username)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
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
                      className="light-input w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-slate-700 dark:text-slate-300">
                    รหัสผ่าน (Password)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
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
                      className="light-input w-full pl-10 pr-11 py-3 rounded-xl text-sm font-medium"
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
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors select-none">
                    <input
                      type="checkbox"
                      name="rememberMe"
                      checked={loginForm.rememberMe}
                      onChange={handleLoginChange}
                      className="w-4 h-4 rounded border-orange-300 dark:border-slate-700 text-orange-600 focus:ring-orange-500/20 cursor-pointer accent-orange-600"
                    />
                    <span className="font-medium">จดจำฉันไว้ในระบบ</span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98] btn-gradient-primary shadow-orange-500/25"
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
              <div className="mt-5 pt-4 text-center flex items-center justify-center gap-1.5 text-xs sm:text-sm border-t border-orange-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">ยังไม่มีบัญชีผู้ใช้งาน?</span>
                <button
                  type="button"
                  onClick={() => setView('register')}
                  className="font-bold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:underline focus:outline-none transition-colors cursor-pointer"
                >
                  สมัครสมาชิกที่นี่
                </button>
              </div>

              {/* Security Badge */}
              <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>ระบบความปลอดภัยมาตรฐาน SSL/TLS</span>
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
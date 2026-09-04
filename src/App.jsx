import React, { useState, useEffect } from 'react';
import { User, Lock, Eye, EyeOff, LogIn, Loader2, Wrench, AlertCircle } from 'lucide-react';
import UserDashboard from './components/UserDashboard';
import AdminDashboard from './components/AdminDashboard';
import RegisterForm from './components/RegisterForm';

// ดึงค่า URL จาก Vite Environment Variable พร้อม Fallback
const API_URL = 
  import.meta.env?.VITE_APPS_SCRIPT_URL || 
  "https://script.google.com/macros/s/AKfycbwvgOZbVC1hLEoSpT0lzfsP3F98gWDed2xUXVHvIDVZ6q6YU_uqZfQPoCR7ooXoiaZufA/exec";

export default function App() {
  // State สำหรับจัดการ Authentication & UI View
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState('login'); // 'login' | 'register' | 'dashboard'
  
  // State สำหรับฟอร์ม Login
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ตรวจสอบ Session เดิมใน LocalStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('app_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setCurrentUser(parsedUser);
        setView('dashboard');
      } catch (e) {
        localStorage.removeItem('app_user');
      }
    }
  }, []);

  // ฟังก์ชันจัดการการกรอกข้อมูลในฟอร์ม Login
  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginForm((prev) => ({ ...prev, [name]: value }));
  };

  // ฟังก์ชันส่งข้อมูลเข้าสู่ระบบ
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');

    const trimmedUsername = loginForm.username.trim();
    const trimmedPassword = loginForm.password.trim();

    if (!trimmedUsername || !trimmedPassword) {
      setLoginError('กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน');
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
        })
      });

      const textResponse = await response.text();
      let data;
      try {
        data = JSON.parse(textResponse);
      } catch (parseError) {
        throw new Error('รูปแบบข้อมูลตอบกลับจากเซิร์ฟเวอร์ไม่ถูกต้อง');
      }

      if (data.success && data.user) {
        const userData = {
          ...data.user,
          role: String(data.user.role || 'user').toLowerCase().trim()
        };

        setCurrentUser(userData);
        localStorage.setItem('app_user', JSON.stringify(userData));
        setView('dashboard');
        setLoginForm({ username: '', password: '' });
      } else {
        setLoginError(data.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }
    } catch (error) {
      console.error('Login Error:', error);
      setLoginError(error.message || 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ฟังก์ชันออกจากระบบ
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('app_user');
    setView('login');
  };

  // Render View 1: หน้า Dashboard (แยกตาม Role)
  if (view === 'dashboard' && currentUser) {
    return currentUser.role === 'admin' ? (
      <AdminDashboard user={currentUser} onLogout={handleLogout} />
    ) : (
      <UserDashboard user={currentUser} onLogout={handleLogout} />
    );
  }

  // Render View 2: หน้าสมัครสมาชิก (Register)
  if (view === 'register') {
    return (
      <RegisterForm 
        onSwitchToLogin={() => setView('login')} 
        onRegisterSuccess={() => setView('login')}
      />
    );
  }

  // Render View 3: หน้าเข้าสู่ระบบ (Login) [Default]
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* Background Decorative Elements */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Card */}
      <div className="max-w-md w-full bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 p-8 sm:p-10 relative z-10 transition-all duration-300">
        
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600/10 text-indigo-600 rounded-2xl mb-4 shadow-inner">
            <Wrench className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
            ระบบยืม-คืนอุปกรณ์
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            เข้าสู่ระบบเพื่อจัดการและรับบริการยืม-คืน
          </p>
        </div>

        {/* Error Alert */}
        {loginError && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-600 text-sm rounded-2xl flex items-center gap-3 animate-fade-in">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <span>{loginError}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-5">
          
          {/* Username Input */}
          <div>
            <label htmlFor="username" className="block text-sm font-semibold text-slate-700 mb-1.5">
              ชื่อผู้ใช้งาน (Username)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-5 h-5" />
              </div>
              <input
                id="username"
                name="username"
                type="text"
                required
                autoComplete="username"
                placeholder="ระบุชื่อผู้ใช้งาน"
                value={loginForm.username}
                onChange={handleLoginChange}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition duration-200 text-sm"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1.5">
              รหัสผ่าน (Password)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-5 h-5" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="ระบุรหัสผ่าน"
                value={loginForm.password}
                onChange={handleLoginChange}
                className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition duration-200 text-sm"
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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-indigo-500/25 transition duration-200 flex items-center justify-center gap-2 disabled:bg-indigo-300 disabled:shadow-none disabled:cursor-not-allowed text-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>กำลังเข้าสู่ระบบ...</span>
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                <span>เข้าสู่ระบบ</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="mt-8 pt-6 border-t border-slate-100 text-center flex items-center justify-center gap-1.5 text-sm">
          <span className="text-slate-500">ยังไม่มีบัญชีผู้ใช้งาน?</span>
          <button
            type="button"
            onClick={() => setView('register')}
            className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline focus:outline-none transition-colors"
          >
            สมัครสมาชิกที่นี่
          </button>
        </div>

      </div>
    </div>
  );
}
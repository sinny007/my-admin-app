import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * ErrorBoundary — ป้องกันแอพพังทั้งหน้าเมื่อเกิด JavaScript Error ใน Component ลูก
 * ใช้เป็น Class Component เพราะ React ยังไม่มี Hook สำหรับ Error Boundary
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught error:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl border border-rose-200 shadow-lg p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                <AlertTriangle className="w-8 h-8 text-rose-500" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              เกิดข้อผิดพลาดในระบบ
            </h2>
            <p className="text-sm text-slate-500 mb-1">
              ระบบพบปัญหาที่ไม่คาดคิด กรุณาลองรีเฟรชหน้าเพจหรือติดต่อผู้ดูแลระบบ
            </p>
            {this.state.error && (
              <p className="text-xs text-rose-400 bg-rose-50 rounded-xl p-3 mt-3 text-left font-mono break-words">
                {this.state.error.message}
              </p>
            )}
            <div className="flex gap-3 mt-6 justify-center">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-indigo-200 transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                ลองใหม่
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition cursor-pointer"
              >
                รีเฟรชหน้า
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

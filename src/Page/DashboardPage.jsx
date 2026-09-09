import React from 'react';

export default function DashboardPage() {
  return (
    <div className="flex h-screen bg-slate-900 text-slate-100">
      <main className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">ระบบจัดการข้อมูล</h1>
        </div>
        <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
          <p className="text-sm text-slate-400">หน้า Dashboard สำหรับการจัดการระบบ</p>
        </div>
      </main>
    </div>
  );
}
import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { BarChart3, PieChart as PieIcon, TrendingUp } from 'lucide-react';

const PALETTE = [
  '#6366f1', // Indigo
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#3b82f6', // Blue
  '#14b8a6'  // Teal
];

// Custom Tooltip declared outside of render
function ChartTooltip({ active, payload, isDark }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className={`p-3 rounded-xl shadow-xl border text-xs ${
        isDark 
          ? 'bg-slate-800 border-slate-700 text-slate-100' 
          : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <p className="font-bold mb-1">{data.name}</p>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-400">จำนวนครั้งที่ยืม:</span>
          <span className="font-black text-indigo-600">{data.count} ครั้ง</span>
        </div>
        {data.percent !== undefined && (
          <div className="flex items-center justify-between gap-4 mt-1 text-[11px] text-slate-400">
            <span>สัดส่วน:</span>
            <span>{data.percent}% ของทั้งหมด</span>
          </div>
        )}
      </div>
    );
  }
  return null;
}

export default function BorrowStatsChart({ transactions = [], devices = [], isDark = false }) {
  const [chartType, setChartType] = useState('bar'); // 'bar' | 'donut'

  // คำนวณสถิติความถี่ในการยืมอุปกรณ์แยกตามหมวดหมู่
  const categoryStats = useMemo(() => {
    // Map deviceId -> category
    const devCategoryMap = {};
    devices.forEach((d) => {
      const id = String(d.id || d.code || '').trim();
      if (id) {
        devCategoryMap[id] = d.category || 'อุปกรณ์ทั่วไป';
      }
    });

    const counts = {};
    let totalBorrows = 0;

    transactions.forEach((t) => {
      const devId = String(t.deviceId || '').trim();
      let category = devCategoryMap[devId];

      if (!category) {
        // Fallback หาจากชื่ออุปกรณ์
        const matched = devices.find(d => d.name === t.deviceName);
        category = matched?.category || 'อุปกรณ์ทั่วไป';
      }

      // Simplify category title for clean chart label
      const cleanCat = category.split('(')[0].trim();
      counts[cleanCat] = (counts[cleanCat] || 0) + 1;
      totalBorrows++;
    });

    // แปลงเป็น Array แล้วเรียงลำดับจากยืมมากที่สุด
    const sorted = Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        percent: totalBorrows > 0 ? Math.round((count / totalBorrows) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);

    return {
      topCategories: sorted.slice(0, 6),
      allCategories: sorted,
      totalBorrows
    };
  }, [transactions, devices]);

  const { topCategories, totalBorrows } = categoryStats;

  if (transactions.length === 0 || topCategories.length === 0) {
    return (
      <div className={`rounded-3xl p-6 border text-center transition-colors ${
        isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-white border-slate-200/90 shadow-sm'
      }`}>
        <div className="flex items-center gap-2 mb-3 justify-center text-slate-400">
          <TrendingUp className="w-5 h-5 text-indigo-500" />
          <h3 className="font-bold text-sm">สถิติหมวดหมู่อุปกรณ์ที่ถูกยืมบ่อยที่สุด</h3>
        </div>
        <p className="text-xs text-slate-400 py-6">ยังไม่มีข้อมูลการยืมเพียงพอสำหรับการสร้างกราฟวิเคราะห์</p>
      </div>
    );
  }

  return (
    <div className={`rounded-3xl p-6 border transition-colors shadow-sm ${
      isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-white border-slate-200/90'
    }`}>
      {/* Header & Chart Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className={`font-black text-base tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              ประเภทอุปกรณ์ที่มีการยืมบ่อยที่สุด
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            สรุปข้อมูลสถิติจากประวัติการยืมทั้งหมด <span className="font-bold text-indigo-600 dark:text-indigo-400">{totalBorrows} ครั้ง</span>
          </p>
        </div>

        {/* View Switcher (Bar vs Donut) */}
        <div className={`flex items-center gap-1 p-1 rounded-xl border ${
          isDark ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            type="button"
            onClick={() => setChartType('bar')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              chartType === 'bar'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>กราฟแท่ง (Bar)</span>
          </button>
          <button
            type="button"
            onClick={() => setChartType('donut')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              chartType === 'donut'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <PieIcon className="w-3.5 h-3.5" />
            <span>กราฟวงกลม (Donut)</span>
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-64 sm:h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'bar' ? (
            <BarChart data={topCategories} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <XAxis
                dataKey="name"
                tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }}
                interval={0}
                tickLine={false}
                axisLine={{ stroke: isDark ? '#334155' : '#e2e8f0' }}
              />
              <YAxis
                tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }}
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<ChartTooltip isDark={isDark} />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(99,102,241,0.05)' }} />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {topCategories.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <PieChart>
              <Tooltip content={<ChartTooltip isDark={isDark} />} />
              <Pie
                data={topCategories}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={4}
              >
                {topCategories.map((entry, index) => (
                  <Cell key={`cell-pie-${index}`} fill={PALETTE[index % PALETTE.length]} />
                ))}
              </Pie>
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Category Legend Pill Badges */}
      <div className="flex flex-wrap items-center justify-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/80">
        {topCategories.map((cat, idx) => (
          <div
            key={cat.name}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
              isDark ? 'bg-slate-700/60 border-slate-600 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PALETTE[idx % PALETTE.length] }} />
            <span>{cat.name}</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">({cat.count})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

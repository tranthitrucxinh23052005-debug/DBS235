"use client"

import { useState, useMemo } from 'react';
import { Settings, BarChart3, PieChart as PieIcon, LineChart as LineIcon, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend as RechartsLegend } from 'recharts';
import { useAppData } from '../../hooks/useAppData';
import { getAcademicLevel } from '../../lib/dataUtils';

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#6366f1', '#f43f5e', '#94a3b8'];

export default function Tab8_Simulation() {
  const { data } = useAppData();
  const [difficultyOffset, setDifficultyOffset] = useState<number>(0);

  // 1. Core Logic: Điều chỉnh điểm số hàng loạt dựa trên thanh trượt
  const simulatedData = useMemo(() => {
    return data.map(row => ({
      ...row,
      DIEM_CHUYEN_CAN: Math.max(0, Math.min(10, Number(row.DIEM_CHUYEN_CAN) - difficultyOffset)),
      DIEM_GIUA_KY: Math.max(0, Math.min(10, Number(row.DIEM_GIUA_KY) - difficultyOffset)),
      DIEM_NHOM: Math.max(0, Math.min(10, Number(row.DIEM_NHOM) - difficultyOffset)),
      DIEM_CUOI_KY: Math.max(0, Math.min(10, Number(row.DIEM_CUOI_KY) - difficultyOffset)),
    }));
  }, [data, difficultyOffset]);

  // 2. Data cho Pie Chart (Tỷ lệ học lực mới)
  const academicLevelData = useMemo(() => {
    const counts: Record<string, number> = { 'Xuất sắc': 0, 'Giỏi': 0, 'Khá': 0, 'Trung bình': 0, 'Yếu': 0, 'Không đạt': 0 };
    simulatedData.forEach(row => {
      counts[getAcademicLevel(row.DIEM_CUOI_KY)]++;
    });
    return Object.entries(counts).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  }, [simulatedData]);

  // 3. Data cho Bar Chart (Phổ điểm)
  const distributionData = useMemo(() => {
    const bins = Array.from({ length: 10 }, (_, i) => ({ range: `${i}-${i + 1}`, count: 0 }));
    simulatedData.forEach(row => {
      const score = Number(row.DIEM_CUOI_KY);
      if (!isNaN(score)) {
        const index = Math.min(9, Math.floor(score));
        bins[index].count++;
      }

    });
    return bins;
  }, [simulatedData]);

  // 4. Data cho Line Chart (Thay đổi điểm TB các thành phần)
  const averageTrendData = useMemo(() => {
    const cols = [
      { key: 'DIEM_CHUYEN_CAN', label: 'Chuyên cần' },
      { key: 'DIEM_GIUA_KY', label: 'Giữa kỳ' },
      { key: 'DIEM_NHOM', label: 'Bài tập nhóm' },
      { key: 'DIEM_CUOI_KY', label: 'Kết thúc HP' }
    ];

    return cols.map(c => {
      const originalScores = data.map(r => Number(r[c.key])).filter(v => !isNaN(v));
      const simulatedScores = simulatedData.map(r => Number(r[c.key])).filter(v => !isNaN(v));

      return {
        name: c.label,
        'Điểm Gốc': originalScores.length ? +(originalScores.reduce((a, b) => a + b, 0) / originalScores.length).toFixed(2) : 0,
        'Điểm Mô Phỏng': simulatedScores.length ? +(simulatedScores.reduce((a, b) => a + b, 0) / simulatedScores.length).toFixed(2) : 0,
      };
    });
  }, [data, simulatedData]);
  const { minValue, maxValue } = useMemo(() => {
    const allValues = averageTrendData.flatMap(d => [d['Điểm Gốc'], d['Điểm Mô Phỏng']]);

    if (allValues.length === 0) {
      return { minValue: 0, maxValue: 10 };
    }

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);

    return {
      minValue: Math.max(0, Math.floor(min * 10) / 10 - 0.2),
      maxValue: Math.min(10, Math.ceil(max * 10) / 10 + 0.2),
    };
  }, [averageTrendData]);

  if (data.length === 0) return <div className="p-20 text-center text-slate-400 italic">Vui lòng tải dữ liệu tại Tab 1</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* KHU VỰC ĐIỀU KHIỂN */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-6 h-6 text-indigo-600" />
          <h3 className="font-bold text-slate-800 text-lg uppercase tracking-tight">Mô phỏng: Điều chỉnh độ khó Đề thi</h3>
        </div>

        <div className="max-w-2xl mx-auto py-4">
          <div className="flex justify-between items-end mb-4">
            <span className="text-sm font-bold text-slate-600 uppercase tracking-widest">Độ lệch điểm dự kiến:</span>
            <span className={`text-2xl font-black ${difficultyOffset > 0 ? 'text-rose-600' : difficultyOffset < 0 ? 'text-emerald-600' : 'text-slate-800'}`}>
              {difficultyOffset > 0 ? `-${difficultyOffset.toFixed(1)} Điểm` : difficultyOffset < 0 ? `+${Math.abs(difficultyOffset).toFixed(1)} Điểm` : 'Giữ nguyên'}
            </span>
          </div>

          <input
            type="range" min="-2" max="2" step="0.5"
            value={difficultyOffset}
            onChange={(e) => setDifficultyOffset(Number(e.target.value))}
            className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-bold uppercase">
            <span>Dễ hơn (+2đ)</span>
            <span>Mặc định (0đ)</span>
            <span>Khó hơn (-2đ)</span>
          </div>
        </div>
      </div>

      {/* KHU VỰC BIỂU ĐỒ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Pie Chart */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-3"><PieIcon className="w-4 h-4 text-blue-500" /> Phân loại Học lực Mới</h4>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={academicLevelData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                {academicLevelData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
              <RechartsLegend verticalAlign="bottom" iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Histogram */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-3"><BarChart3 className="w-4 h-4 text-indigo-500" /> Phổ điểm Cuối kỳ Mô phỏng</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={distributionData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="range" tick={{ fontSize: 10, fontWeight: 'bold' }} />
              <YAxis tick={{ fontSize: 10, fontWeight: 'bold' }} />
              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none' }} />
              <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* BIỂU ĐỒ BIẾN ĐỘNG - CHỖ NÀY ĐÃ FIX LỖI MINVALUE */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm lg:col-span-2">
          <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-3">
            <LineIcon className="w-4 h-4 text-blue-600" /> Biến động Điểm Trung bình Thành phần
          </h4>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={averageTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fontWeight: 'bold', fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[minValue, maxValue]}
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <RechartsLegend verticalAlign="top" align="right" iconType="circle" />

              <Line
                type="monotone"
                dataKey="Điểm Gốc"
                stroke="#94a3b8"
                strokeDasharray="5 5"
                strokeWidth={2}
                dot={{ r: 4, fill: '#94a3b8' }}
                name="Điểm Gốc"
              />
              <Line
                type="monotone"
                dataKey="Điểm Mô Phỏng"
                stroke="#3b82f6"
                strokeWidth={4}
                dot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 8 }}
                name="Điểm Mô Phỏng"
                animationDuration={1000}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
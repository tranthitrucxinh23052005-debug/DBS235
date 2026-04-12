"use client"

import { useState, useRef, useMemo } from 'react';
import { Brain, LayoutDashboard, Download, Sparkles, BarChart3, PieChart as PieIcon, LineChart as LineIcon, Activity, TrendingUp, ScatterChart as ScatterIcon } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, ScatterChart, Scatter, ComposedChart, Legend
} from 'recharts';
import { toPng } from 'html-to-image';
import { useLang } from '../../hooks/useLanguage';
import { useAppData } from '../../hooks/useAppData';
import { apiAiSummary } from '../../lib/api';
import { computeStats } from '../../lib/dataUtils';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#f97316', '#0ea5e9', '#d946ef'];

// --- Các thành phần biểu đồ cố định ---

const DashboardCard = ({ title, icon: Icon, children }: any) => (
  <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all flex flex-col h-[320px]">
    <div className="flex items-center gap-3 mb-4 border-b border-slate-50 pb-3">
      <div className="p-2 bg-slate-50 rounded-xl text-indigo-600">
        <Icon className="w-4 h-4" />
      </div>
      <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest truncate">{title}</h4>
    </div>
    <div className="flex-1 w-full min-h-0">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  </div>
);

export default function Tab3_FixedDashboard() {
  const { t } = useLang();
  const { data, rawFile, aiReport, setAiReport } = useAppData();
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const safeData = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const stats = useMemo(() => (safeData.length > 0 ? computeStats(safeData) : null), [safeData]);

  // --- 1. Data cho Scatter: Tương quan Giữa kỳ & Cuối kỳ ---
  const scatterData = useMemo(() => 
    safeData.map(r => ({ x: Number(r.DIEM_GIUA_KY), y: Number(r.DIEM_CUOI_KY) }))
    .filter(d => !isNaN(d.x) && !isNaN(d.y)).slice(0, 100), [safeData]);

  // --- 2. Data cho Boxplot (Simulated): Phân phối điểm theo Lớp ---
  const boxplotData = useMemo(() => {
    const grouped: any = {};
    safeData.forEach(r => {
      if(!grouped[r.LOP]) grouped[r.LOP] = [];
      grouped[r.LOP].push(Number(r.DIEM_CUOI_KY));
    });
    return Object.entries(grouped).map(([name, vals]: any) => {
      vals.sort((a:any, b:any) => a - b);
      return { 
        name, 
        min: vals[0], 
        q1: vals[Math.floor(vals.length * 0.25)], 
        median: vals[Math.floor(vals.length * 0.5)], 
        q3: vals[Math.floor(vals.length * 0.75)], 
        max: vals[vals.length - 1] 
      };
    });
  }, [safeData]);

  // --- 3. Data cho Histogram: Phổ điểm Cuối kỳ ---
  const histogramData = useMemo(() => {
    const bins = [
      { name: '0-2', min: 0, max: 2, value: 0 },
      { name: '2-4', min: 2, max: 4, value: 0 },
      { name: '4-6', min: 4, max: 6, value: 0 },
      { name: '6-8', min: 6, max: 8, value: 0 },
      { name: '8-10', min: 8, max: 11, value: 0 },
    ];
    safeData.forEach(r => {
      const v = Number(r.DIEM_CUOI_KY);
      const bin = bins.find(b => v >= b.min && v < b.max);
      if(bin) bin.value++;
    });
    return bins;
  }, [safeData]);

  // --- 4. Data cho Bar: TB Cuối kỳ theo Môn học ---
  const subjectAvgData = useMemo(() => {
    const g: any = {};
    safeData.forEach(r => {
      if(!g[r.MON_HOC]) g[r.MON_HOC] = [];
      g[r.MON_HOC].push(Number(r.DIEM_CUOI_KY));
    });
    return Object.entries(g).map(([name, vals]: any) => ({
      name, value: +(vals.reduce((a:any,b:any)=>a+b,0)/vals.length).toFixed(2)
    })).sort((a,b) => b.value - a.value);
  }, [safeData]);

  // --- 5. Data cho Pie: Cơ cấu sinh viên theo Lớp ---
  const classCountData = useMemo(() => {
    const counts: any = {};
    safeData.forEach(r => counts[r.LOP] = (counts[r.LOP] || 0) + 1);
    return Object.entries(counts).map(([name, value]) => ({ name, value: Number(value) }));
  }, [safeData]);

  // --- 6. Data cho Line: Tiến trình điểm số trung bình ---
  const scoreTrendData = useMemo(() => {
    const cols = ['DIEM_CHUYEN_CAN', 'DIEM_GIUA_KY', 'DIEM_NHOM', 'DIEM_CUOI_KY'];
    const labels = ['Chuyên cần', 'Giữa kỳ', 'Nhóm', 'Cuối kỳ'];
    return cols.map((col, i) => {
      const vals = safeData.map(r => Number(r[col])).filter(v => !isNaN(v));
      return { name: labels[i], value: +(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2) };
    });
  }, [safeData]);

  const handleAiSummary = async () => {
    if (!rawFile || !stats) return;
    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('file', rawFile);
      formData.append('context', JSON.stringify({ avg: stats.avg10, passRate: stats.passRate, total: stats.total }));
      const res = await apiAiSummary(formData);
      setAiReport(res.ai_report || 'Phân tích hoàn tất.');
    } catch {
      setAiReport('Lỗi kết nối AI.');
    } finally { setAnalyzing(false); }
  };

  const handleExportJpg = async () => {
    if (!dashboardRef.current) return;
    setExporting(true);
    try {
      const png = await toPng(dashboardRef.current, { backgroundColor: '#f8fafc', quality: 0.95, pixelRatio: 2 });
      const a = document.createElement('a');
      a.href = png; a.download = `Fixed-Dashboard.png`; a.click();
    } finally { setExporting(false); }
  };

  if (safeData.length === 0) return <div className="p-20 text-center text-slate-400">Vui lòng tải dữ liệu lên trước</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">Hệ Thống Báo Cáo Cố Định</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Phân tích 6 chiều tiêu chuẩn</p>
          </div>
        </div>
        <button onClick={handleExportJpg} disabled={exporting} className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase hover:bg-black transition-all shadow-xl active:scale-95">
          <Download className="w-4 h-4" /> {exporting ? 'Đang lưu...' : 'Xuất ảnh JPG'}
        </button>
      </div>

      <div ref={dashboardRef} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-[40px] border border-slate-100">
        
        {/* 1. Scatter */}
        <DashboardCard title="Tương quan Giữa kỳ & Cuối kỳ" icon={ScatterIcon}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis type="number" dataKey="x" name="Giữa kỳ" domain={[0, 10]} tick={{fontSize: 10}} />
            <YAxis type="number" dataKey="y" name="Cuối kỳ" domain={[0, 10]} tick={{fontSize: 10}} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Scatter data={scatterData} fill="#3b82f6" fillOpacity={0.6} />
          </ScatterChart>
        </DashboardCard>

        {/* 2. Boxplot (Simulated) */}
        <DashboardCard title="Phân phối điểm theo Lớp" icon={Activity}>
          <BarChart data={boxplotData} margin={{ top: 20, right: 20, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{fontSize: 10}} />
            <YAxis domain={[0, 10]} tick={{fontSize: 10}} />
            <Tooltip />
            <Bar dataKey="median" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </DashboardCard>

        {/* 3. Histogram */}
        <DashboardCard title="Phổ điểm Cuối kỳ" icon={TrendingUp}>
          <BarChart data={histogramData} margin={{ top: 20, right: 20, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{fontSize: 10}} />
            <YAxis tick={{fontSize: 10}} />
            <Tooltip cursor={{fill: '#f8fafc'}} />
            <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </DashboardCard>

        {/* 4. Bar: TB theo Môn học */}
        <DashboardCard title="TB Cuối kỳ theo Môn học" icon={BarChart3}>
          <BarChart data={subjectAvgData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
            <XAxis type="number" domain={[0, 10]} tick={{fontSize: 10}} />
            <YAxis dataKey="name" type="category" tick={{fontSize: 9, width: 80}} />
            <Tooltip />
            <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} />
          </BarChart>
        </DashboardCard>

        {/* 5. Pie: Cơ cấu theo Lớp */}
        <DashboardCard title="Cơ cấu sinh viên theo Lớp" icon={PieIcon}>
          <PieChart>
            <Pie data={classCountData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} label={{fontSize: 10, fontWeight: 'bold'}}>
              {classCountData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip />
            <Legend wrapperStyle={{fontSize: 10}} />
          </PieChart>
        </DashboardCard>

        {/* 6. Line: Tiến trình điểm */}
        <DashboardCard title="Tiến trình điểm thành phần" icon={LineIcon}>
          <AreaChart data={scoreTrendData} margin={{ top: 20, right: 20, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{fontSize: 10}} />
            <YAxis domain={[0, 10]} tick={{fontSize: 10}} />
            <Tooltip />
            <Area type="monotone" dataKey="value" stroke="#ec4899" fill="#fbcfe8" fillOpacity={0.4} strokeWidth={3} />
          </AreaChart>
        </DashboardCard>

      </div>

      {/* AI Analysis vẫn giữ lại để bổ trợ thông tin */}
      <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[32px] p-8 text-white shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="font-black text-xl uppercase tracking-tight">AI Insights</h4>
              <p className="text-xs font-bold text-indigo-100 uppercase tracking-widest">Phân tích chuyên sâu từ biểu đồ</p>
            </div>
          </div>
          <button onClick={handleAiSummary} disabled={analyzing} className="bg-white text-indigo-600 px-6 py-3 rounded-2xl text-xs font-black uppercase hover:bg-indigo-50 transition-all shadow-lg active:scale-95">
             {analyzing ? 'Đang quét dữ liệu...' : 'Yêu cầu AI phân tích'}
          </button>
        </div>
        {aiReport && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 text-sm leading-relaxed border border-white/10 whitespace-pre-line font-medium italic">
            {aiReport}
          </div>
        )}
      </div>
    </div>
  );
}
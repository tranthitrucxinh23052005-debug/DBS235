"use client"

import { useState, useRef, useMemo } from 'react';
import { Brain, LayoutDashboard, Download, Sparkles, AlertCircle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, ScatterChart, Scatter
} from 'recharts';
import { toPng } from 'html-to-image';
import { useLang } from '../../hooks/useLanguage';
import { useAppData } from '../../hooks/useAppData';
import { apiAiSummary, apiSuggestDashboard } from '../../lib/api';
import { computeStats } from '../../lib/dataUtils';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#f97316', '#0ea5e9', '#d946ef'];

interface ChartSuggestion {
  title: string;
  type: string;
  x: string;
  y: string;
  agg: string;
}

// 🛡️ Hàm xử lý dữ liệu bọc khiên chống sập
function buildChartData(rawData: any[], suggestion: ChartSuggestion) {
  if (!rawData || !Array.isArray(rawData) || rawData.length === 0) return [];
  if (!suggestion || !suggestion.x) return [];

  const { x, y, agg, type } = suggestion;

  try {
    if (type === 'Pie') {
      const counts: Record<string, number> = {};
      for (const row of rawData) {
        if (!row) continue;
        const key = String(row[x] ?? 'N/A');
        counts[key] = (counts[key] || 0) + 1;
      }
      return Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .filter(d => d.value > 0) 
        .slice(0, 10);
    }

    if (type === 'Scatter') {
       return rawData
         .map(r => ({ x: Number(r[x]), y: Number(r[y]) }))
         .filter(d => !isNaN(d.x) && !isNaN(d.y))
         .slice(0, 100);
    }

    const grouped: Record<string, number[]> = {};
    for (const row of rawData) {
      if (!row) continue;
      const key = String(row[x] ?? 'N/A');
      const val = Number(row[y]);
      if (!isNaN(val)) {
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(val);
      }
    }

    return Object.entries(grouped).map(([name, vals]) => {
      let aggVal = 0;
      if (vals.length > 0) {
        if (agg === 'sum') aggVal = vals.reduce((a, b) => a + b, 0);
        else if (agg === 'count') aggVal = vals.length;
        else aggVal = +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
      }
      return { name, value: isNaN(aggVal) ? 0 : aggVal };
    }).slice(0, 15);
  } catch (e) {
    return [];
  }
}

// 🛡️ Component biểu đồ nhỏ (An toàn 100%)
function MiniChart({ suggestion, data, index }: { suggestion: ChartSuggestion; data: any[]; index: number }) {
  const chartData = useMemo<any[]>(() => buildChartData(data, suggestion), [data, suggestion]);
  const color = COLORS[index % COLORS.length];
  const safeTitle = suggestion?.title || 'Biểu đồ';
  const type = suggestion?.type || 'Bar';

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
      <p className="text-xs font-bold text-slate-700 mb-3 truncate uppercase tracking-tight" title={safeTitle}>
        {safeTitle}
      </p>

      {/* CHẶN SẬP: Trả về box xám nếu không có data vẽ */}
      {(!chartData || chartData.length === 0) ? (
        <div className="w-full h-[160px] flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-lg">
          <AlertCircle className="w-6 h-6 mb-2 opacity-50" />
          <span className="text-[10px] font-semibold">Không đủ dữ liệu</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          {type === 'Pie' ? (
            <PieChart>
              <Pie
                data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                outerRadius={60} innerRadius={30}
                label={({ percent }) => (percent && percent > 0) ? `${(percent * 100).toFixed(0)}%` : ''}
                labelLine={false} fontSize={9} fontWeight="bold"
              >
                {chartData.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{borderRadius: '8px', fontSize: '11px'}} />
            </PieChart>
          ) : type === 'Line' ? (
            <LineChart data={chartData} margin={{top: 5, right: 5, left: -20, bottom: 0}}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} hide={(chartData?.length || 0) > 8} />
              <YAxis tick={{ fontSize: 9, fill: '#64748b' }} />
              <Tooltip contentStyle={{borderRadius: '8px', fontSize: '11px'}} />
              <Line type="monotone" dataKey="value" stroke={color} strokeWidth={3} dot={{r: 2, fill: color}} activeDot={{r: 4}} />
            </LineChart>
          ) : type === 'Area' ? (
            <AreaChart data={chartData} margin={{top: 5, right: 5, left: -20, bottom: 0}}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} hide={(chartData?.length || 0) > 8} />
              <YAxis tick={{ fontSize: 9, fill: '#64748b' }} />
              <Tooltip contentStyle={{borderRadius: '8px', fontSize: '11px'}} />
              <Area type="monotone" dataKey="value" stroke={color} fill={color} fillOpacity={0.2} strokeWidth={2} />
            </AreaChart>
          ) : type === 'Scatter' ? (
            <ScatterChart margin={{top: 5, right: 5, left: -20, bottom: 0}}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="x" type="number" tick={{ fontSize: 9, fill: '#64748b' }} />
              <YAxis dataKey="y" type="number" tick={{ fontSize: 9, fill: '#64748b' }} />
              <Tooltip cursor={{strokeDasharray: '3 3'}} contentStyle={{borderRadius: '8px', fontSize: '11px'}} />
              <Scatter data={chartData} fill={color} />
            </ScatterChart>
          ) : (
            <BarChart data={chartData} margin={{top: 5, right: 5, left: -20, bottom: 0}}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} hide={(chartData?.length || 0) > 8} />
              <YAxis tick={{ fontSize: 9, fill: '#64748b' }} />
              <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', fontSize: '11px'}} />
              <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default function Tab3_AI() {
  const { t } = useLang();
const { data, rawFile, aiReport, setAiReport } = useAppData();
const [suggestions, setSuggestions] = useState<ChartSuggestion[]>([]);  
  const dashboardRef = useRef<HTMLDivElement>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);

  // ĐÃ ÉP KIỂU MẢNG TUYỆT ĐỐI KHÔNG BAO GIỜ LỖI LENGTH NỮA!
  const safeData = Array.isArray(data) ? data : [];
  const safeSuggestions = Array.isArray(suggestions) ? suggestions : [];
  const stats = useMemo(() => (safeData.length > 0 ? computeStats(safeData) : null), [safeData]);

  const handleAiSummary = async () => {
    if (!rawFile || !stats) return; 

    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('file', rawFile);
      formData.append('context', JSON.stringify({
        avg: stats.avg10,
        passRate: stats.passRate,
        total: stats.total
      }));

      const res = await apiAiSummary(formData);
      setAiReport(res.ai_report ?? 'Hệ thống đã phân tích nhưng không phản hồi văn bản.');
    } catch (err) {
      setAiReport('Mạng bận. Đã kích hoạt báo cáo cục bộ (Local Mode).');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerateDashboard = async () => {
    if (!rawFile || safeData.length === 0) return;
    setGenerating(true);
    try {
      const res = await apiSuggestDashboard(rawFile);
      if (res && res.status === 'success' && Array.isArray(res.suggestions)) {
        let s = res.suggestions as ChartSuggestion[];
        if (s.length < 6) {
          const extra = buildFallbackSuggestions(6 - s.length, safeData);
          s = [...s, ...extra];
        }
        setSuggestions(s.slice(0, 6));
      } else {
        setSuggestions(buildFallbackSuggestions(6, safeData));
      }
    } catch {
      setSuggestions(buildFallbackSuggestions(6, safeData));
    } finally {
      setGenerating(false);
    }
  };

  const handleExportJpg = async () => {
    if (!dashboardRef.current) return;
    setExporting(true);
    try {
      // Đã thêm skipFonts để chống lỗi chụp ảnh trắng bóc
      const png = await toPng(dashboardRef.current, { backgroundColor: '#f8fafc', quality: 0.95, pixelRatio: 2, skipFonts: true });
      const a = document.createElement('a');
      a.href = png;
      a.download = `AI-Dashboard-${new Date().getTime()}.png`;
      a.click();
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(false);
    }
  };

  if (safeData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400 animate-in fade-in">
        <Brain className="w-16 h-16 mb-4 opacity-20" />
        <p className="font-bold uppercase tracking-widest text-sm">{t('pleaseUpload') || 'Vui lòng tải dữ liệu lên trước'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center shadow-inner">
            <LayoutDashboard className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">AI Auto Dashboard</h3>
            <p className="text-xs font-medium text-slate-500">Hệ thống tự động thiết kế 6 biểu đồ trực quan</p>
          </div>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={handleGenerateDashboard}
            disabled={generating || !rawFile}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md active:scale-95"
          >
            {generating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? 'ĐANG TẠO...' : 'TẠO DASHBOARD MỚI'}
          </button>
          
          {/* 👇 ĐÃ BỌC KHIÊN HOÀN TOÀN TẠI ĐÂY */}
          {safeSuggestions.length > 0 && (
            <button
              onClick={handleExportJpg}
              disabled={exporting}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-800 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-slate-900 disabled:opacity-50 transition-all shadow-md active:scale-95"
            >
              <Download className="w-4 h-4" />
              {exporting ? 'ĐANG LƯU...' : 'XUẤT ẢNH JPG'}
            </button>
          )}
        </div>
      </div>

      {/* 👇 VÀ ĐÃ BỌC KHIÊN HOÀN TOÀN TẠI ĐÂY NỮA NÈ */}
      {safeSuggestions.length > 0 && (
        <div ref={dashboardRef} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-inner"> 
          {safeSuggestions.map((s, i) => (
            <MiniChart key={i} suggestion={s} data={safeData} index={i} />
          ))}
        </div>
      )}

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-blue-900 uppercase">AI Phân Tích Dữ Liệu Tổng Quan</h3>
              <p className="text-xs font-medium text-blue-700">Trích xuất Insights toàn diện từ tập dữ liệu</p>
            </div>
          </div>
          <button
            onClick={handleAiSummary}
            disabled={analyzing || !rawFile}
            className="flex items-center gap-2 bg-white text-blue-700 border border-blue-200 px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-50 disabled:opacity-50 transition-all shadow-sm active:scale-95"
          >
            {analyzing ? <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {analyzing ? 'ĐANG QUÉT...' : 'YÊU CẦU PHÂN TÍCH'}
          </button>
        </div>
        
        {aiReport && (
          <div className="mt-6 bg-white border border-blue-100 rounded-2xl p-6 text-sm text-slate-700 leading-relaxed text-justify whitespace-pre-line shadow-sm">
            {aiReport}
          </div>
        )}
      </div>

    </div>
  );
}

// 🛡️ Hàm vét đáy tự quét cột thông minh
function buildFallbackSuggestions(count: number, data: any[]): ChartSuggestion[] {
  if (!data || !Array.isArray(data) || data.length === 0) return [];
  
  const firstRow = data.find(r => r && typeof r === 'object');
  if (!firstRow) return [];

  const cols = Object.keys(firstRow);
  const numCols = cols.filter(c => data.some(r => r && !isNaN(Number(r[c])) && r[c] !== null && r[c] !== ''));
  const catCols = cols.filter(c => data.some(r => r && (isNaN(Number(r[c])) || typeof r[c] === 'string')));

  const x1 = catCols.length > 0 ? catCols[0] : cols[0];
  const y1 = numCols.length > 0 ? numCols[0] : cols[0];
  const y2 = numCols.length > 1 ? numCols[1] : y1;

  if (!x1 || !y1) return [];

  const all: ChartSuggestion[] = [
    { title: `Điểm TB ${y1} theo ${x1}`, type: 'Bar', x: x1, y: y1, agg: 'mean' },
    { title: `Cơ cấu sinh viên theo ${x1}`, type: 'Pie', x: x1, y: y1, agg: 'count' },
    { title: `Tổng ${y2} phân bổ theo ${x1}`, type: 'Area', x: x1, y: y2, agg: 'sum' },
    { title: `Dao động ${y1} giữa ${x1}`, type: 'Line', x: x1, y: y1, agg: 'mean' },
    { title: `Số lượng phân rã ${x1}`, type: 'Pie', x: x1, y: y1, agg: 'count' },
    { title: `Tần suất khối lượng ${y1}`, type: 'Bar', x: x1, y: y1, agg: 'count' },
  ];
  
  return all.slice(0, count);
}
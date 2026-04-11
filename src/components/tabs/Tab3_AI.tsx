import { useState, useRef, useMemo } from 'react';
import { Brain, LayoutDashboard, Download, Sparkles } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { toPng } from 'html-to-image';
import { useLang } from '../../hooks/useLanguage';
import { useAppData } from '../../hooks/useAppData';
import { apiAiSummary, apiSuggestDashboard } from '../../lib/api';
import { computeStats } from '../../lib/dataUtils';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#f97316'];

interface ChartSuggestion {
  title: string;
  type: string;
  x: string;
  y: string;
  agg: string;
}

// Hàm xử lý dữ liệu biểu đồ
function buildChartData(rawData: any[], suggestion: ChartSuggestion) {
  const { x, y, agg } = suggestion;
  if (suggestion.type === 'Pie') {
    const counts: Record<string, number> = {};
    for (const row of rawData) {
      const key = String(row[x] ?? 'N/A');
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }
  const grouped: Record<string, number[]> = {};
  for (const row of rawData) {
    const key = String(row[x] ?? 'N/A');
    const val = Number(row[y]);
    if (!isNaN(val)) { 
      if (!grouped[key]) grouped[key] = []; 
      grouped[key].push(val); 
    }
  }
  return Object.entries(grouped).map(([name, vals]) => {
    const aggVal = agg === 'sum' ? vals.reduce((a, b) => a + b, 0) : agg === 'count' ? vals.length : +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
    return { name, value: aggVal };
  }).slice(0, 20);
}

// Component biểu đồ nhỏ
function MiniChart({ suggestion, data, index }: { suggestion: ChartSuggestion; data: any[]; index: number }) {
  const chartData = useMemo(() => buildChartData(data, suggestion), [data, suggestion]);
  const color = COLORS[index % COLORS.length];

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <p className="text-xs font-semibold text-gray-600 mb-3 truncate" title={suggestion.title}>{suggestion.title}</p>
      <ResponsiveContainer width="100%" height={160}>
        {suggestion.type === 'Pie' ? (
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={({ percent }) => `${(percent * 100).toFixed(0)}%`} fontSize={9}>
              {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        ) : suggestion.type === 'Line' ? (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis dataKey="name" tick={{ fontSize: 9 }} hide={chartData.length > 5} />
            <YAxis tick={{ fontSize: 9 }} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
          </LineChart>
        ) : suggestion.type === 'Area' ? (
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis dataKey="name" tick={{ fontSize: 9 }} hide={chartData.length > 5} />
            <YAxis tick={{ fontSize: 9 }} />
            <Tooltip />
            <Area type="monotone" dataKey="value" stroke={color} fill={color} fillOpacity={0.1} strokeWidth={2} />
          </AreaChart>
        ) : (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis dataKey="name" tick={{ fontSize: 9 }} hide={chartData.length > 5} />
            <YAxis tick={{ fontSize: 9 }} />
            <Tooltip />
            <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export default function Tab3_AI() {
  const { t } = useLang();
  const { data, rawFile, aiReport, setAiReport, suggestions, setSuggestions } = useAppData();
  
  // Ref để chụp ảnh dashboard
  const dashboardRef = useRef<HTMLDivElement>(null);

  // States
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Tính toán stats
  const stats = useMemo(() => (data.length > 0 ? computeStats(data) : null), [data]);

  const handleAiSummary = async () => {
    if (!rawFile) return;
    if (!stats) return; 

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
      setAiReport(res.ai_report ?? 'Không nhận được phản hồi từ AI.');
    } catch (err) {
      setAiReport('Lỗi kết nối AI.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerateDashboard = async () => {
    if (!rawFile) return;
    setGenerating(true);
    try {
      const res = await apiSuggestDashboard(rawFile);
      if (res.status === 'success') {
        let s = res.suggestions as ChartSuggestion[];
        if (s.length < 6) {
          const extra = buildFallbackSuggestions(6 - s.length);
          s = [...s, ...extra];
        }
        setSuggestions(s.slice(0, 6));
      } else {
        setSuggestions(buildFallbackSuggestions(6));
      }
    } catch {
      setSuggestions(buildFallbackSuggestions(6));
    } finally {
      setGenerating(false);
    }
  };

  const handleExportJpg = async () => {
    if (!dashboardRef.current) return;
    setExporting(true);
    try {
      const png = await toPng(dashboardRef.current, { backgroundColor: '#ffffff', quality: 0.95, pixelRatio: 2 });
      const a = document.createElement('a');
      a.href = png;
      a.download = `dashboard-${new Date().getTime()}.png`;
      a.click();
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(false);
    }
  };

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <Brain className="w-12 h-12 mb-3 opacity-30" />
        <p>{t('pleaseUpload')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Analysis Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-blue-500" />
          </div>
          <h3 className="font-semibold text-gray-700">{t('aiEvaluateAll')}</h3>
        </div>
        <button
          onClick={handleAiSummary}
          disabled={analyzing || !rawFile}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 transition shadow-md shadow-blue-100"
        >
          {analyzing ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{t('analyzing')}</> : <><Brain className="w-4 h-4" />{t('aiEvaluateAll')}</>}
        </button>
        {aiReport && (
          <div className="mt-4 bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100 rounded-xl p-5 text-sm text-gray-700 leading-relaxed whitespace-pre-line shadow-inner">
            {aiReport}
          </div>
        )}
      </div>

      {/* Dashboard Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-emerald-500" />
            </div>
            <h3 className="font-semibold text-gray-700">{t('dashboardTitle')}</h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleGenerateDashboard}
              disabled={generating || !rawFile}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition shadow-md shadow-emerald-100"
            >
              {generating ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{t('generating')}</> : t('generateDashboard')}
            </button>
            {suggestions.length > 0 && (
              <button
                onClick={handleExportJpg}
                disabled={exporting}
                className="flex items-center gap-2 bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition"
              >
                <Download className="w-4 h-4" />
                {exporting ? t('exporting') : t('exportDashboardImg')}
              </button>
            )}
          </div>
        </div>

        {suggestions.length > 0 && (
          <div ref={dashboardRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-white p-2"> 
            {suggestions.map((s, i) => (
              <MiniChart key={i} suggestion={s} data={data} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function buildFallbackSuggestions(count: number): ChartSuggestion[] {
  const all: ChartSuggestion[] = [
    { title: 'Điểm Cuối kỳ TB theo Môn học', type: 'Bar', x: 'MON_HOC', y: 'DIEM_CUOI_KY', agg: 'mean' },
    { title: 'Điểm Giữa kỳ TB theo Lớp', type: 'Bar', x: 'LOP', y: 'DIEM_GIUA_KY', agg: 'mean' },
    { title: 'Phân bố Sinh viên theo Lớp', type: 'Pie', x: 'LOP', y: 'DIEM_CUOI_KY', agg: 'count' },
    { title: 'Tổng Sinh viên theo Môn học', type: 'Bar', x: 'MON_HOC', y: 'DIEM_CUOI_KY', agg: 'count' },
    { title: 'Biến động Điểm Chuyên cần theo Lớp', type: 'Line', x: 'LOP', y: 'DIEM_CHUYEN_CAN', agg: 'mean' },
    { title: 'Điểm Bài tập nhóm theo Môn học', type: 'Area', x: 'MON_HOC', y: 'DIEM_NHOM', agg: 'mean' },
  ];
  return all.slice(0, count);
}
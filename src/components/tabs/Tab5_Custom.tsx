import { useState, useMemo, useRef } from 'react';
import { BarChart2, Sparkles, Loader2, Bot } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter, AreaChart, Area
} from 'recharts';
import { toPng } from 'html-to-image';
import { useLang } from '../../hooks/useLanguage';
import { useAppData } from '../../hooks/useAppData';
import { StudentRecord } from '../../lib/types';
import { apiChartInsight } from '../../lib/api'; 

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#f97316', '#06b6d4', '#ec4899'];

type ChartType = 'bar' | 'line' | 'scatter' | 'pie' | 'area';

function buildData(data: StudentRecord[], chartType: ChartType, xCol: string, yCol: string, aggFunc: string) {
  if (chartType === 'pie') {
    const counts: Record<string, number> = {};
    for (const row of data) {
      const key = String(row[xCol] ?? 'N/A');
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value })).slice(0, 15);
  }
  
  if (chartType === 'scatter') {
    return data
      .map(r => ({ x: Number(r[xCol]), y: Number(r[yCol]) }))
      .filter(p => !isNaN(p.x) && !isNaN(p.y))
      .slice(0, 500);
  }

  const grouped: Record<string, number[]> = {};
  for (const row of data) {
    const key = String(row[xCol] ?? 'N/A');
    const val = Number(row[yCol]);
    if (!isNaN(val)) { 
      if (!grouped[key]) grouped[key] = []; 
      grouped[key].push(val); 
    }
  }

  return Object.entries(grouped).map(([name, vals]) => {
    const v = aggFunc === 'sum' 
      ? vals.reduce((a, b) => a + b, 0) 
      : aggFunc === 'count' 
        ? vals.length 
        : +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
    return { name, value: v };
  }).slice(0, 20);
}

export default function Tab5_Custom() {
  const { t } = useLang();
  const { data } = useAppData();

  const [chartType, setChartType] = useState<ChartType>('bar');
  const [xCol, setXCol] = useState('');
  const [yCol, setYCol] = useState('');
  const [aggFunc, setAggFunc] = useState('mean');
  const [rendered, setRendered] = useState(false);
  
  // State cho AI
  const [aiInsight, setAiInsight] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  const analyzeCustomChart = async () => {
    if (!chartRef.current) return;
    setAiLoading(true);
    setAiInsight('');
    try {
      // Ép màu nền và màu chữ để html-to-image không bị mù màu
      const dataUrl = await toPng(chartRef.current, { 
        backgroundColor: '#ffffff', 
        style: { color: '#1e293b' },
        quality: 0.95 
      });
      const blob = await (await fetch(dataUrl)).blob();

      const formData = new FormData();
      formData.append('file', blob, 'custom_chart.png');
      formData.append('chart_type', 'custom');
      
      const res = await apiChartInsight(formData);
      setAiInsight(res.insight || res.ai_report || 'AI không đưa ra được nhận xét.');
    } catch (err) {
      setAiInsight('Không thể kết nối đến backend AI. Vui lòng kiểm tra server.');
    } finally {
      setAiLoading(false);
    }
  };

  const cols = data.length > 0 ? Object.keys(data[0]) : [];
  const numericCols = useMemo(() => 
    cols.filter(c => data.some(r => !isNaN(Number(r[c])) && r[c] !== null && r[c] !== '')),
    [cols, data]
  );
  const categoryCols = useMemo(() => 
    cols.filter(c => data.some(r => typeof r[c] === 'string' || isNaN(Number(r[c])))),
    [cols, data]
  );

  const chartData = useMemo(() => {
    if (!rendered || !xCol) return [];
    return buildData(data, chartType, xCol, yCol, aggFunc);
  }, [rendered, data, chartType, xCol, yCol, aggFunc]);

  const handleRender = () => {
    if (!xCol) return;
    if (chartType !== 'pie' && chartType !== 'scatter' && !yCol) return;
    setRendered(true);
    setAiInsight(''); 
  };

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <BarChart2 className="w-12 h-12 mb-3 opacity-30" />
        <p>{t('pleaseUpload') || 'Vui lòng tải dữ liệu lên trước'}</p>
      </div>
    );
  }

  // Hàm format nhãn trục X cho gọn nếu quá dài
  const formatXAxis = (tickItem: any) => {
    if (typeof tickItem === 'string' && tickItem.length > 15) return tickItem.substring(0, 12) + '...';
    return tickItem;
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 text-lg mb-6">{t('customChartTitle') || 'Tùy chỉnh biểu đồ phân tích'}</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="space-y-2">
            <label className="text-[13px] text-gray-600 font-medium block">Loại biểu đồ</label>
            <select
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              value={chartType}
              onChange={e => { setChartType(e.target.value as ChartType); setRendered(false); }}
            >
              <option value="bar">Biểu đồ Cột (Bar)</option>
              <option value="line">Biểu đồ Đường (Line)</option>
              <option value="scatter">Biểu đồ Phân tán (Scatter)</option>
              <option value="pie">Biểu đồ Tròn (Pie)</option>
              <option value="area">Biểu đồ Miền (Area)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[13px] text-gray-600 font-medium block">{chartType === 'pie' ? 'Phân loại theo' : 'Trục hoành (X)'}</label>
            <select
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              value={xCol}
              onChange={e => { setXCol(e.target.value); setRendered(false); }}
            >
              <option value="">-- Chọn cột --</option>
              {(chartType === 'pie' ? categoryCols : cols).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {chartType !== 'pie' && (
            <div className="space-y-2">
              <label className="text-[13px] text-gray-600 font-medium block">{chartType === 'scatter' ? 'Trục tung (Y)' : 'Giá trị (Y)'}</label>
              <select
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                value={yCol}
                onChange={e => { setYCol(e.target.value); setRendered(false); }}
              >
                <option value="">-- Chọn giá trị số --</option>
                {numericCols.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          {chartType !== 'pie' && chartType !== 'scatter' && (
            <div className="space-y-2">
              <label className="text-[13px] text-gray-600 font-medium block">Tính toán theo</label>
              <select
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                value={aggFunc}
                onChange={e => { setAggFunc(e.target.value); setRendered(false); }}
              >
                <option value="mean">Trung bình (Mean)</option>
                <option value="sum">Tổng (Sum)</option>
                <option value="count">Đếm số lượng (Count)</option>
              </select>
            </div>
          )}
        </div>

        <button
          onClick={handleRender}
          disabled={!xCol || (chartType !== 'pie' && chartType !== 'scatter' && !yCol)}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl text-sm font-semibold shadow-md shadow-blue-200 disabled:opacity-40 transition-all active:scale-95"
        >
          {t('renderChart') || 'Tạo biểu đồ'}
        </button>
      </div>

      {rendered && chartData.length > 0 && (
        <div className="space-y-6">
          {/* Bọc style màu sắc để html-to-image chụp được chữ */}
          <div 
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" 
            ref={chartRef}
            style={{ backgroundColor: '#ffffff', color: '#1e293b' }}
          >
            <div className="flex items-center justify-between mb-8">
              <h4 className="font-semibold text-gray-700">Kết quả trực quan</h4>
              <div className="flex gap-2">
                 <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full uppercase">{chartType}</span>
                 {chartType !== 'scatter' && chartType !== 'pie' && (
                   <span className="px-3 py-1 bg-slate-50 text-slate-600 text-[10px] font-bold rounded-full uppercase">{aggFunc}</span>
                 )}
              </div>
            </div>
            
            <ResponsiveContainer width="100%" height={400}>
              {chartType === 'bar' ? (
                <BarChart data={chartData} margin={{ top: 5, right: 30, bottom: 60, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} angle={-35} textAnchor="end" interval={0} height={80} tickFormatter={formatXAxis} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              ) : chartType === 'line' ? (
                <LineChart data={chartData} margin={{ top: 5, right: 30, bottom: 60, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} angle={-35} textAnchor="end" interval={0} height={80} tickFormatter={formatXAxis} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                </LineChart>
              ) : chartType === 'area' ? (
                <AreaChart data={chartData} margin={{ top: 5, right: 30, bottom: 60, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} angle={-35} textAnchor="end" interval={0} height={80} tickFormatter={formatXAxis} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" fillOpacity={0.3} fill="#3b82f6" strokeWidth={3} />
                </AreaChart>
              ) : chartType === 'scatter' ? (
                <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="x" name={xCol} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis dataKey="y" name={yCol} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Scatter data={chartData} fill="#3b82f6" fillOpacity={0.6} />
                </ScatterChart>
              ) : (
                <PieChart>
                  <Pie 
                    data={chartData} 
                    dataKey="value" 
                    nameKey="name" 
                    cx="50%" 
                    cy="50%" 
                    outerRadius={120} 
                    label={{fontSize: 11, fill: '#1e293b', fontWeight: 600}}
                    labelLine={{ stroke: '#94a3b8' }}
                  >
                    {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Legend wrapperStyle={{ fontSize: '12px', fontWeight: '500', paddingTop: '20px' }} />
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* AI Analysis Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 shadow-sm p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-blue-900 uppercase">AI Phân tích biểu đồ</h4>
                  <p className="text-xs text-blue-700">Gemini Vision - Tự động đọc dữ liệu hình ảnh</p>
                </div>
              </div>
              <button
                onClick={analyzeCustomChart}
                disabled={aiLoading}
                className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md active:scale-95 w-full sm:w-auto justify-center"
              >
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {aiLoading ? 'Đang phân tích...' : 'Khởi chạy AI'}
              </button>
            </div>
            
            {aiInsight && (
              <div className="mt-6 bg-white border border-blue-100 rounded-xl p-5 text-sm text-slate-700 leading-relaxed whitespace-pre-line shadow-sm animate-in fade-in slide-in-from-bottom-4">
                {aiInsight}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
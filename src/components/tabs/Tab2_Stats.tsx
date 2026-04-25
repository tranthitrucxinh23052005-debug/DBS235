import { useMemo, useState, useRef } from 'react';
import { Users, TrendingUp, Award, CheckCircle, ChevronDown, ChevronUp, Sparkles, HelpCircle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, ComposedChart, Scatter, ErrorBar
} from 'recharts';
import { useLang } from '../../hooks/useLanguage';
import { useAppData } from '../../hooks/useAppData';
import StatCard from '../ui/StatCard';
import { computeStats, computeBoxplotData, getAcademicLevel } from '../../lib/dataUtils';
import { apiChartInsight } from '../../lib/api';
import { toPng } from 'html-to-image';

const LEVEL_COLORS: Record<string, string> = {
  'Xuất sắc': '#10b981',
  'Giỏi': '#3b82f6',
  'Khá': '#f59e0b',
  'Trung bình': '#6366f1',
  'Yếu': '#f43f5e',
  'Không đạt': '#94a3b8',
};

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#6366f1', '#f43f5e', '#0ea5e9'];
const BOX_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#f43f5e', '#0ea5e9', '#f97316', '#14b8a6'];

export default function Tab2_Stats() {
  const { t } = useLang();
  const { data } = useAppData();

  const [selectedClass, setSelectedClass] = useState('');
  const [aiInsight, setAiInsight] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(true);

  const boxRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => computeStats(data), [data]);
  const boxData = useMemo(() => computeBoxplotData(data), [data]);
  const classes = useMemo(() => ['', ...[...new Set(data.map(r => String(r.LOP ?? '')).filter(Boolean))].sort()], [data]);

  const classData = useMemo(() => {
    const filtered = selectedClass ? data.filter(r => String(r.LOP) === selectedClass) : data;
    const bySubj: Record<string, Record<string, number>> = {};
    for (const row of filtered) {
      const subj = String(row.MON_HOC ?? 'N/A');
      const score = Number(row.DIEM_CUOI_KY) || 0;
      const level = getAcademicLevel(score);
      if (!bySubj[subj]) bySubj[subj] = { 'Xuất sắc': 0, 'Giỏi': 0, 'Khá': 0, 'Trung bình': 0, 'Yếu': 0, 'Không đạt': 0 };
      bySubj[subj][level] = (bySubj[subj][level] ?? 0) + 1;
    }
    return Object.entries(bySubj).map(([subject, counts]) => ({ subject, ...counts }));
  }, [data, selectedClass]);

  const chartData = useMemo(() => {
    return boxData?.map((d: any) => ({
      subject: d.subject,
      min: Number(d.min),
      q1: Number(d.q1),
      median: Number(d.median),
      q3: Number(d.q3),
      max: Number(d.max),
      mean: Number(d.mean),
      boxHeight: d.q3 - d.q1,
      // ✅ Dùng array [xuống, lên] để whisker chỉ đi 1 chiều
      lowerWhiskerErr: [d.q1 - d.min, 0],
      upperWhiskerErr: [0, d.max - d.q3],
      median_val: d.median,
      mean_val: d.mean
    }));
  }, [boxData]);
  const yDomain = useMemo(() => {
    if (!chartData?.length) return [0, 11];
    const mins = chartData.map((d: any) => d.min);
    const maxs = chartData.map((d: any) => d.max);
    const lower = Math.floor(Math.min(...mins) * 2) / 2 - 0.5;  // làm tròn 0.5 xuống
    const upper = Math.ceil(Math.max(...maxs) * 2) / 2 + 0.5;   // làm tròn 0.5 lên
    return [lower, upper];
  }, [chartData]);
  // ĐÃ PHỤC HỒI LẠI BIẾN pieData BỊ MẤT
  const pieData = useMemo(() => {
    const counts: Record<string, number> = { 'Xuất sắc': 0, 'Giỏi': 0, 'Khá': 0, 'Trung bình': 0, 'Yếu': 0, 'Không đạt': 0 };
    for (const row of data) {
      const score = Number(row.DIEM_CUOI_KY) || 0;
      counts[getAcademicLevel(score)]++;
    }
    return Object.entries(counts).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  }, [data]);

  // Đã căn chỉnh width (x1, x2) cho khớp với barSize={40} của Box
  const MedianLine = ({ cx, cy }: any) => (
    <line
      x1={cx - 20}
      x2={cx + 20}
      y1={cy}
      y2={cy}
      stroke="#111827"
      strokeWidth={3}
      strokeLinecap="round"
    />
  );

  // Đã căn chỉnh width cho nắp râu (Whisker Cap)
  const WhiskerCap = ({ cx, cy }: any) => (
    <line
      x1={cx - 10}
      x2={cx + 10}
      y1={cy}
      y2={cy}
      stroke="#475569"
      strokeWidth={2}
    />
  );

  const analyzeBoxplot = async () => {
    if (!boxRef.current) return;
    setAiLoading(true);
    setAiInsight('');
    try {
      const png = await toPng(boxRef.current, { backgroundColor: '#ffffff', pixelRatio: 2 });
      const res_img = await fetch(png);
      const blob = await res_img.blob();

      const formData = new FormData();
      formData.append('file', blob, 'boxplot.png');
      formData.append('chart_type', 'boxplot');

      const res = await apiChartInsight(formData);
      if (res.status === 'error') setAiInsight("Lỗi Backend: " + res.message);
      else setAiInsight(res.insight || res.ai_report || "AI không trả về kết quả.");
    } catch (err) {
      setAiInsight('Lỗi kết nối. Hãy kiểm tra xem Backend (Python) đã chạy chưa.');
    } finally {
      setAiLoading(false);
    }
  };

  if (data.length === 0) return <div className="p-20 text-center text-slate-400 italic">Vui lòng tải dữ liệu tại Tab 1</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* 4 CARDS THỐNG KÊ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Tổng sinh viên" value={stats.total} icon={<Users className="w-5 h-5" />} color="bg-blue-600" />
        <StatCard label="Điểm TB (10)" value={stats.avg10.toFixed(2)} icon={<TrendingUp className="w-5 h-5" />} color="bg-emerald-600" />
        <StatCard label="Điểm TB (4)" value={stats.avg4.toFixed(2)} icon={<Award className="w-5 h-5" />} color="bg-amber-600" />
        <StatCard label="Tỷ lệ đạt" value={`${stats.passRate}%`} icon={<CheckCircle className="w-5 h-5" />} color="bg-rose-600" />
      </div>

      {/* BIỂU ĐỒ TRÒN & CƠ CẤU */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-slate-800 text-lg">Cấu trúc học lực theo môn</h3>
            <select className="bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-medium text-slate-600 outline-none ring-1 ring-slate-200 focus:ring-blue-500" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
              <option value="">Tất cả các lớp</option>
              {classes.slice(1).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={classData} margin={{ bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="subject" tick={{ fontSize: 11, fill: '#64748b' }} angle={-25} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '12px' }} />
              {Object.keys(LEVEL_COLORS).map(level => (
                <Bar key={level} dataKey={level} stackId="a" fill={LEVEL_COLORS[level]} barSize={40} radius={0} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 flex flex-col">
          <h3 className="font-bold text-slate-800 text-lg mb-6 text-center">Phân phối tổng quát</h3>
          <div className="relative flex-1 flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={5}>
                  {pieData.map((entry, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            {pieData.map((entry, i) => (
              <div key={i} className="flex items-center gap-2 p-2 px-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="text-[12px] font-bold text-slate-700">{entry.name}: {entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BOXPLOT SECTION */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 overflow-hidden" ref={boxRef}>
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Biểu đồ Boxplot phân phối điểm</h3>
            <p className="text-xs text-slate-400 mt-1 italic">Trực quan hóa độ phân tán (Min, Q1, Median, Q3, Max)</p>
          </div>
          <button onClick={analyzeBoxplot} disabled={aiLoading} className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-2xl text-sm font-semibold hover:bg-blue-600 transition-all disabled:opacity-50">
            {aiLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Phân tích bằng AI
          </button>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart
            data={chartData}
            margin={{ bottom: 60, top: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />

            <XAxis
              dataKey="subject"
              tick={{ fontSize: 11, fill: '#64748b', fontWeight: 'bold' }}
              angle={-25}
              textAnchor="end"
              interval={0}
            />

            <YAxis domain={yDomain} />

            <Tooltip content={<BoxTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />

            <Bar dataKey="q1" stackId="box" fill="transparent" barSize={40} isAnimationActive={false} />

            <Bar dataKey="boxHeight" stackId="box" barSize={40}>
              {chartData.map((_, index) => (
                <Cell
                  key={index}
                  fill={BOX_COLORS[index % BOX_COLORS.length]}
                  fillOpacity={0.8}
                  stroke="#0f172a"
                  strokeWidth={1.5}
                />
              ))}
            </Bar>

            <Scatter dataKey="q1" fill="none">
              <ErrorBar dataKey="lowerWhiskerErr" direction="y" stroke="#475569" strokeWidth={2} width={10} />
            </Scatter>

            <Scatter dataKey="q3" fill="none">
              <ErrorBar dataKey="upperWhiskerErr" direction="y" stroke="#475569" strokeWidth={2} width={10} />
            </Scatter>

            <Scatter dataKey="min" shape={<WhiskerCap />} />
            <Scatter dataKey="max" shape={<WhiskerCap />} />

            <Scatter
              dataKey="median_val"
              shape={MedianLine}
              xAxisId={0}
              yAxisId={0}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {aiInsight && (
          <div className="mt-6 p-6 bg-blue-50 border border-blue-100 rounded-2xl animate-in slide-in-from-top-4">
            <div className="flex items-center gap-2 mb-2 text-blue-700 font-bold">
              <Sparkles className="w-4 h-4" /> Báo cáo Insight từ AI
            </div>
            <p className="text-sm text-blue-900 leading-relaxed whitespace-pre-wrap">{aiInsight}</p>
          </div>
        )}
      </div>

      {/* ACCORDION HƯỚNG DẪN GIẢI THÍCH BOXPLOT */}
      <div className="bg-slate-50 border border-slate-200 rounded-3xl overflow-hidden mt-8">
        <button onClick={() => setShowGuide(!showGuide)} className="w-full flex items-center justify-between p-6 hover:bg-slate-100 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
              <HelpCircle className="w-5 h-5 text-blue-600" />
            </div>
            <span className="font-bold text-slate-800 uppercase tracking-wider text-sm">Hướng dẫn đọc biểu đồ Boxplot</span>
          </div>
          {showGuide ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </button>

        {showGuide && (
          <div className="p-8 pt-0 border-t border-slate-200 animate-in slide-in-from-top-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-2 shrink-0" />
                  <p className="text-sm text-slate-600"><strong className="text-slate-800">Đường kẻ đen giữa hộp (Median):</strong> Giá trị trung vị. 50% sinh viên có điểm cao hơn và 50% thấp hơn.</p>
                </div>
                <div className="flex gap-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                  <p className="text-sm text-slate-600"><strong className="text-slate-800">Chiều cao hộp (IQR):</strong> Vùng chứa 50% điểm số nằm ở giữa. Hộp càng cao thì điểm số của nhóm này càng biến thiên mạnh.</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 shrink-0" />
                  <p className="text-sm text-slate-600"><strong className="text-slate-800">Râu (Whiskers):</strong> Thể hiện điểm Max và Min (không tính ngoại lệ). Thể hiện phổ điểm trải dài nhất của môn học đó.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// BẢNG GIẢI THÍCH (Tooltip)
function BoxTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  const d = payload?.[0]?.payload || {};
  if (!d.subject) return null;

  const f = (v: any) => (typeof v === 'number' ? v.toFixed(2) : 'N/A');

  // Dùng Array để khử hoàn toàn "khoảng trắng tàng hình" gây lỗi Babel
  const pClassName = ['font-bold', 'text-slate-800', 'border-b', 'pb-2', 'mb-2', 'text-sm'].join(' ');

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-2xl p-5 text-xs min-w-[220px] space-y-2">
      <p className={pClassName}>
        {label || d.subject}
      </p>

      <div className="flex justify-between"><span>Max:</span><b>{f(d.max)}</b></div>
      <div className="flex justify-between"><span>Q3:</span><b>{f(d.q3)}</b></div>
      <div className="flex justify-between text-blue-600"><span>Median:</span><b>{f(d.median)}</b></div>
      <div className="flex justify-between"><span>Q1:</span><b>{f(d.q1)}</b></div>
      <div className="flex justify-between"><span>Min:</span><b>{f(d.min)}</b></div>

      <div className="flex justify-between text-red-600 border-t pt-2 mt-2">
        <span>Mean:</span><b>{f(d.mean)}</b>
      </div>
    </div>
  );
}
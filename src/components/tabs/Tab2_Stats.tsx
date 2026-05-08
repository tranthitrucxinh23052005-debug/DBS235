import { useMemo, useState, useRef } from 'react';
import {
  Users,
  TrendingUp,
  Award,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  HelpCircle
} from 'lucide-react';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Scatter,
  ErrorBar
} from 'recharts';

import { useLang } from '../../hooks/useLanguage';
import { useAppData } from '../../hooks/useAppData';
import StatCard from '../ui/StatCard';
import { computeStats, getAcademicLevel } from '../../lib/dataUtils';
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

const PIE_COLORS = [
  '#10b981',
  '#3b82f6',
  '#f59e0b',
  '#6366f1',
  '#f43f5e',
  '#0ea5e9'
];

const BOX_COLORS = [
  '#10b981',
  '#3b82f6',
  '#f59e0b',
  '#8b5cf6',
  '#f43f5e',
  '#0ea5e9',
  '#f97316',
  '#14b8a6'
];

export default function Tab2_Stats() {
  const { t } = useLang();
  const { data } = useAppData();

  const [selectedClass, setSelectedClass] = useState('');
  const [aiInsight, setAiInsight] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(true);

  const boxRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => computeStats(data), [data]);

  const classes = useMemo(() => {
    return [
      '',
      ...[
        ...new Set(
          data
            .map((r: any) => String(r.LOP ?? ''))
            .filter(Boolean)
        )
      ].sort()
    ];
  }, [data]);

  // =========================
  // BOXPLOT DATA
  // =========================
  const boxData = useMemo(() => {
    const grouped: Record<string, number[]> = {};

    for (const row of data) {
      const lop = String(row.LOP || 'N/A');
      const score = Number(row.DIEM_CUOI_KY) || 0;

      if (!grouped[lop]) grouped[lop] = [];

      grouped[lop].push(score);
    }

    return Object.keys(grouped)
      .sort()
      .map((lop) => {
        const scores = grouped[lop].sort((a, b) => a - b);

        if (!scores.length) {
          return {
            subject: lop,
            min: 0,
            q1: 0,
            median: 0,
            q3: 0,
            max: 0,
            mean: 0
          };
        }

        const min = scores[0];
        const max = scores[scores.length - 1];

        const sum = scores.reduce((a, b) => a + b, 0);
        const mean = sum / scores.length;

        const getQ = (q: number) => {
          const pos = (scores.length - 1) * q;

          const base = Math.floor(pos);
          const rest = pos - base;

          if (scores[base + 1] !== undefined) {
            return (
              scores[base] +
              rest * (scores[base + 1] - scores[base])
            );
          }

          return scores[base];
        };

        return {
          subject: lop,
          min,
          q1: getQ(0.25),
          median: getQ(0.5),
          q3: getQ(0.75),
          max,
          mean
        };
      });
  }, [data]);

  // =========================
  // STACKED BAR DATA
  // =========================
  const classData = useMemo(() => {
    const byLop: Record<string, Record<string, number>> = {};

    for (const row of data) {
      const lop = String(row.LOP || 'N/A');

      const score = Number(row.DIEM_CUOI_KY) || 0;

      const level = getAcademicLevel(score);

      if (!byLop[lop]) {
        byLop[lop] = {
          'Xuất sắc': 0,
          'Giỏi': 0,
          'Khá': 0,
          'Trung bình': 0,
          'Yếu': 0,
          'Không đạt': 0
        };
      }

      byLop[lop][level] += 1;
    }

    let result = Object.keys(byLop)
      .sort((a, b) => a.localeCompare(b))
      .map((lop) => ({
        subject: lop,
        ...byLop[lop]
      }));

    if (selectedClass) {
      result = result.filter(
        (item) => item.subject === selectedClass
      );
    }

    return result;
  }, [data, selectedClass]);

  // =========================
  // CHART DATA
  // =========================
  const chartData = useMemo(() => {
    return (boxData || []).map((d: any) => ({
      subject: d.subject,

      min: Number(d.min),
      q1: Number(d.q1),
      median: Number(d.median),
      q3: Number(d.q3),
      max: Number(d.max),
      mean: Number(d.mean),

      boxHeight: d.q3 - d.q1,

      lowerWhiskerErr: [d.q1 - d.min, 0],
      upperWhiskerErr: [0, d.max - d.q3],

      median_val: d.median,
      mean_val: d.mean
    }));
  }, [boxData]);

  // =========================
  // Y DOMAIN
  // =========================
  const yDomain = useMemo(() => {
    if (!chartData.length) return [0, 10];

    const mins = chartData.map((d: any) => d.min);
    const maxs = chartData.map((d: any) => d.max);

    const lower = Math.max(
      0,
      Math.floor(Math.min(...mins) * 2) / 2 - 0.5
    );

    const upper =
      Math.ceil(Math.max(...maxs) * 2) / 2 + 0.5;

    return [lower, upper];
  }, [chartData]);

  // =========================
  // PIE DATA
  // =========================
  const pieData = useMemo(() => {
    const counts: Record<string, number> = {
      'Xuất sắc': 0,
      'Giỏi': 0,
      'Khá': 0,
      'Trung bình': 0,
      'Yếu': 0,
      'Không đạt': 0
    };

    for (const row of data) {
      const score = Number(row.DIEM_CUOI_KY) || 0;

      counts[getAcademicLevel(score)]++;
    }

    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({
        name,
        value
      }));
  }, [data]);

  // =========================
  // MEDIAN LINE
  // =========================
  const MedianLine = ({ cx, cy }: any) => (
    <line
      x1={cx - 20}
      x2={cx + 20}
      y1={cy}
      y2={cy}
      stroke="#dc2626"
      strokeWidth={4}
      strokeLinecap="round"
    />
  );

  // =========================
  // WHISKER CAP
  // =========================
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

  // =========================
  // AI ANALYSIS
  // =========================
  const analyzeBoxplot = async () => {
    if (!boxRef.current) return;

    setAiLoading(true);
    setAiInsight('');

    try {
      const png = await toPng(boxRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 2
      });

      const res_img = await fetch(png);

      const blob = await res_img.blob();

      const formData = new FormData();

      formData.append('file', blob, 'boxplot.png');

      formData.append('chart_type', 'boxplot');

      const res = await apiChartInsight(formData);

      if (res.status === 'error') {
        setAiInsight('Lỗi Backend: ' + res.message);
      } else {
        setAiInsight(
          res.insight ||
          res.ai_report ||
          'AI không trả về kết quả.'
        );
      }
    } catch (err) {
      setAiInsight(
        'Lỗi kết nối. Hãy kiểm tra Backend Python.'
      );
    } finally {
      setAiLoading(false);
    }
  };

  if (data.length === 0) {
    return (
      <div className="p-20 text-center text-slate-400 italic">
        Vui lòng tải dữ liệu tại Tab 1
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Tổng sinh viên"
          value={stats.total}
          icon={<Users className="w-5 h-5" />}
          color="bg-blue-600"
        />

        <StatCard
          label="Điểm TB (10)"
          value={stats.avg10.toFixed(2)}
          icon={<TrendingUp className="w-5 h-5" />}
          color="bg-emerald-600"
        />

        <StatCard
          label="Điểm TB (4)"
          value={stats.avg4.toFixed(2)}
          icon={<Award className="w-5 h-5" />}
          color="bg-amber-600"
        />

        <StatCard
          label="Tỷ lệ đạt"
          value={`${stats.passRate}%`}
          icon={<CheckCircle className="w-5 h-5" />}
          color="bg-rose-600"
        />
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* BAR */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">

          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-slate-800 text-lg">
              Cấu trúc học lực theo môn
            </h3>

            <select
              className="bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-medium text-slate-600 outline-none ring-1 ring-slate-200 focus:ring-blue-500"
              value={selectedClass}
              onChange={(e) =>
                setSelectedClass(e.target.value)
              }
            >
              <option value="">Tất cả các lớp</option>

              {classes.slice(1).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={classData}
              margin={{ bottom: 40 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f1f5f9"
              />

              <XAxis
                dataKey="subject"
                tick={{
                  fontSize: 11,
                  fill: '#64748b'
                }}
                angle={-25}
                textAnchor="end"
                interval={0}
              />

              <YAxis
                tick={{
                  fontSize: 11,
                  fill: '#64748b'
                }}
              />

              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow:
                    '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                }}
              />

              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{
                  paddingBottom: '20px',
                  fontSize: '12px'
                }}
              />

              {Object.keys(LEVEL_COLORS).map((level) => (
                <Bar
                  key={level}
                  dataKey={level}
                  stackId="a"
                  fill={LEVEL_COLORS[level]}
                  barSize={40}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* PIE */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 flex flex-col">

          <h3 className="font-bold text-slate-800 text-lg mb-6 text-center">
            Phân phối tổng quát
          </h3>

          <div className="relative flex-1 flex items-center justify-center">

            <ResponsiveContainer width="100%" height={300}>
              <PieChart>

                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                >
                  {pieData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        PIE_COLORS[
                        i % PIE_COLORS.length
                        ]
                      }
                      stroke="none"
                    />
                  ))}
                </Pie>

                <Tooltip />

              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* BOXPLOT */}
      <div
        className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 overflow-hidden"
        ref={boxRef}
      >

        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">

          <div>
            <h3 className="font-bold text-slate-800 text-lg">
              Biểu đồ Boxplot phân phối điểm
            </h3>

            <p className="text-xs text-slate-400 mt-1 italic">
              Min, Q1, Median, Q3, Max
            </p>
          </div>

          <button
            onClick={analyzeBoxplot}
            disabled={aiLoading}
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-2xl text-sm font-semibold hover:bg-blue-600 transition-all disabled:opacity-50"
          >
            {aiLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}

            Phân tích bằng AI
          </button>
        </div>

        <ResponsiveContainer width="100%" height={400}>

          <ComposedChart
            data={chartData}
            margin={{
              bottom: 60,
              top: 20
            }}
          >

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#f1f5f9"
            />

            <XAxis
              dataKey="subject"
              tick={{
                fontSize: 11,
                fill: '#64748b',
                fontWeight: 'bold'
              }}
              angle={-25}
              textAnchor="end"
              interval={0}
            />

            <YAxis
              domain={yDomain}
              tick={{
                fontSize: 11,
                fill: '#64748b'
              }}
              allowDecimals
            />

            <Tooltip
              content={<BoxTooltip />}
              cursor={{
                fill: 'rgba(0,0,0,0.03)'
              }}
            />

            {/* invisible offset */}
            <Bar
              dataKey="q1"
              stackId="box"
              fill="transparent"
              barSize={40}
              isAnimationActive={false}
            />

            {/* box */}
            <Bar
              dataKey="boxHeight"
              stackId="box"
              barSize={40}
            >
              {chartData.map((_, index) => (
                <Cell
                  key={index}
                  fill={
                    BOX_COLORS[
                    index % BOX_COLORS.length
                    ]
                  }
                  fillOpacity={0.8}
                  stroke="#0f172a"
                  strokeWidth={1.5}
                />
              ))}
            </Bar>

            {/* lower whisker */}
            <Scatter dataKey="q1" fill="none">
              <ErrorBar
                dataKey="lowerWhiskerErr"
                direction="y"
                stroke="#475569"
                strokeWidth={2}
                width={10}
              />
            </Scatter>

            {/* upper whisker */}
            <Scatter dataKey="q3" fill="none">
              <ErrorBar
                dataKey="upperWhiskerErr"
                direction="y"
                stroke="#475569"
                strokeWidth={2}
                width={10}
              />
            </Scatter>

            {/* whisker caps */}
            <Scatter
              dataKey="min"
              shape={(props: any) => (
                <WhiskerCap {...props} />
              )}
            />

            <Scatter
              dataKey="max"
              shape={(props: any) => (
                <WhiskerCap {...props} />
              )}
            />

            {/* median */}
            <Scatter
              dataKey="median_val"
              shape={(props: any) => (
                <MedianLine {...props} />
              )}
            />

          </ComposedChart>
        </ResponsiveContainer>

        {aiInsight && (
          <div className="mt-6 p-6 bg-blue-50 border border-blue-100 rounded-2xl">

            <div className="flex items-center gap-2 mb-2 text-blue-700 font-bold">
              <Sparkles className="w-4 h-4" />
              Báo cáo Insight từ AI
            </div>

            <p className="text-sm text-blue-900 leading-relaxed whitespace-pre-wrap">
              {aiInsight}
            </p>

          </div>
        )}
      </div>

      {/* GUIDE */}
      <div className="bg-slate-50 border border-slate-200 rounded-3xl overflow-hidden mt-8">

        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between p-6 hover:bg-slate-100 transition-colors"
        >

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
              <HelpCircle className="w-5 h-5 text-blue-600" />
            </div>

            <span className="font-bold text-slate-800 uppercase tracking-wider text-sm">
              Hướng dẫn đọc biểu đồ Boxplot
            </span>
          </div>

          {showGuide ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>
      </div>
    </div>
  );
}

// =========================
// TOOLTIP
// =========================
function BoxTooltip({
  active,
  payload,
  label
}: any) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const d =
    payload.find((p: any) => p?.payload)?.payload || {};

  if (!d.subject) return null;

  const f = (v: any) =>
    typeof v === 'number'
      ? v.toFixed(2)
      : 'N/A';

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-2xl p-5 text-xs min-w-[220px] space-y-2">

      <p className="font-bold text-slate-800 border-b pb-2 mb-2 text-sm">
        {label || d.subject}
      </p>

      <div className="flex justify-between">
        <span>Max:</span>
        <b>{f(d.max)}</b>
      </div>

      <div className="flex justify-between">
        <span>Q3:</span>
        <b>{f(d.q3)}</b>
      </div>

      <div className="flex justify-between text-blue-600">
        <span>Median:</span>
        <b>{f(d.median)}</b>
      </div>

      <div className="flex justify-between">
        <span>Q1:</span>
        <b>{f(d.q1)}</b>
      </div>

      <div className="flex justify-between">
        <span>Min:</span>
        <b>{f(d.min)}</b>
      </div>

      <div className="flex justify-between text-red-600 border-t pt-2 mt-2">
        <span>Mean:</span>
        <b>{f(d.mean)}</b>
      </div>
    </div>
  );
}
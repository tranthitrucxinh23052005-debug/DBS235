import { useMemo, useState, useRef } from 'react';
import { Users, TrendingUp, Award, CheckCircle, ChevronDown, ChevronUp, Sparkles, Info, HelpCircle, Network, TrendingDown } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, ComposedChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { useLang } from '../../hooks/useLanguage';
import { useAppData } from '../../hooks/useAppData';
import StatCard from '../ui/StatCard';
import { computeStats, computeBoxplotData, getAcademicLevel } from '../../lib/dataUtils';
import { apiChartInsight } from '../../lib/api';
import { toPng } from 'html-to-image';

const SCORE_COLS = ['DIEM_CHUYEN_CAN', 'DIEM_GIUA_KY', 'DIEM_NHOM', 'DIEM_CUOI_KY'];

const SCORE_LABELS: Record<string, string> = {
  'DIEM_CHUYEN_CAN': 'Chuyên Cần',
  'DIEM_GIUA_KY': 'Giữa Kỳ',
  'DIEM_NHOM': 'Nhóm',
  'DIEM_CUOI_KY': 'Cuối Kỳ'
};

// 🌡️ HÀM NÀY ĐÃ ĐƯỢC ĐỘ LẠI: TẠO HIỆU ỨNG NHIỆT ĐỘ NÓNG - LẠNH (ĐỎ -> TRẮNG -> XANH)
// Hàm tạo màu Đỏ (Nghịch) -> Trắng (0) -> Xanh dương (Thuận)
function heatColor(val: number): string {
  if (isNaN(val) || val === 0) return '#ffffff';
  const intensity = Math.abs(val);
  if (val > 0) {
    // Tương quan thuận: Xanh dương
    const r = Math.round(255 - intensity * (255 - 59));
    const g = Math.round(255 - intensity * (255 - 130));
    const b = Math.round(255 - intensity * (255 - 246));
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // Tương quan nghịch: Đỏ
    const r = Math.round(255 - intensity * (255 - 239));
    const g = Math.round(255 - intensity * (255 - 68));
    const b = Math.round(255 - intensity * (255 - 68));
    return `rgb(${r}, ${g}, ${b})`;
  }
}

function getTextColor(val: number): string {
  return Math.abs(val) > 0.6 ? '#ffffff' : '#334155';
}


export default function Tab4_Relations() {
  const { t } = useLang();
  const { data, correlation } = useAppData();
  
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  const corrMatrix = useMemo(() => {
    if (Object.keys(correlation).length > 0 && correlation['DIEM_CHUYEN_CAN']) return correlation;
    const result: Record<string, Record<string, number>> = {};
    for (const c1 of SCORE_COLS) {
      result[c1] = {};
      for (const c2 of SCORE_COLS) {
        const pairs = data
          .map(r => [Number(r[c1]), Number(r[c2])])
          .filter(([a, b]) => !isNaN(a) && !isNaN(b));
        if (pairs.length < 2) { result[c1][c2] = 0; continue; }
        const mx = pairs.reduce((s, p) => s + p[0], 0) / pairs.length;
        const my = pairs.reduce((s, p) => s + p[1], 0) / pairs.length;
        const num = pairs.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0);
        const den = Math.sqrt(
          pairs.reduce((s, p) => s + (p[0] - mx) ** 2, 0) *
          pairs.reduce((s, p) => s + (p[1] - my) ** 2, 0)
        );
        result[c1][c2] = den === 0 ? 0 : +(num / den).toFixed(4);
      }
    }
    return result;
  }, [data, correlation]);

  const corrCols = Object.keys(corrMatrix);

  const distData = useMemo(() => {
    const buckets: Record<string, number> = {};
    for (let i = 0; i <= 9; i++) {
      const lo = i;
      const hi = i + 1;
      const label = `${lo}-${hi}`;
      buckets[label] = data.filter(r => {
        const s = Number(r.DIEM_CUOI_KY);
        return !isNaN(s) && s >= lo && s < hi;
      }).length;
    }
    return Object.entries(buckets).map(([range, count]) => ({ range, count }));
  }, [data]);

  const students = useMemo(() => [...new Set(data.map(r => String(r.MSSV ?? '')).filter(Boolean))].sort(), [data]);
  
  const subjectsOfStudent = useMemo(() => {
    if (!selectedStudent) return [];
    return [...new Set(data.filter(r => String(r.MSSV) === selectedStudent).map(r => String(r.MON_HOC)))];
  }, [data, selectedStudent]);

  const radarData = useMemo(() => {
    if (!selectedStudent || !selectedSubject) return [];
    
    const studentRow = data.find(r => String(r.MSSV) === selectedStudent && String(r.MON_HOC) === selectedSubject);
    if (!studentRow) return [];

    const classRows = data.filter(r => String(r.MON_HOC) === selectedSubject);

    return SCORE_COLS.map(col => {
      const studentScore = Number(studentRow[col]) || 0;
      const allScores = classRows.map(d => Number(d[col])).filter(v => !isNaN(v));
      const avgScore = allScores.length ? +(allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(2) : 0;

      return {
        metric: SCORE_LABELS[col],
        score: studentScore,
        avg: avgScore,
        diff: (studentScore - avgScore).toFixed(2)
      };
    });
  }, [data, selectedStudent, selectedSubject]);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <Network className="w-12 h-12 mb-3 opacity-30" />
        <p className="font-bold uppercase tracking-widest text-sm">{t('pleaseUpload') || 'Vui lòng tải dữ liệu lên trước'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* KHU VỰC 1: BẢN ĐỒ NHIỆT (ĐÃ THÊM NÓNG LẠNH VÀ TRỤC X Y) */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-10 opacity-50"></div>
        <h3 className="font-black text-slate-800 text-xl mb-1 uppercase tracking-tight flex items-center gap-2">
          <Network className="w-6 h-6 text-blue-600" />
          {t('heatmapTitle') || 'Ma trận hệ số tương quan (Heatmap)'}
        </h3>
        <p className="text-sm font-medium text-slate-500 mb-8">{t('heatmapDesc') || 'Đánh giá mức độ ảnh hưởng tuyến tính giữa các cột điểm thành phần.'}</p>

        {corrCols.length > 0 ? (
          <div className="overflow-x-auto custom-scrollbar pb-6 relative">
            <div className="inline-block min-w-max p-4 bg-white border border-slate-200 rounded-xl">
              <div className="grid gap-1" style={{ gridTemplateColumns: `120px repeat(${corrCols.length}, 100px)` }}>
                {/* Ô góc trên cùng bên trái (Trống) */}
                <div className="flex items-end justify-end pb-2 pr-2 text-xs font-black text-slate-400 uppercase">
                  Y \ X
                </div>
                
                {/* TÊN CỘT TRỤC X */}
                {corrCols.map(c => (
                  <div key={`col-${c}`} className="text-center text-[11px] font-bold text-slate-700 pb-2 px-1 break-words">
                    {SCORE_LABELS[c] || c}
                  </div>
                ))}
                
                {/* TÊN CỘT TRỤC Y VÀ CÁC Ô GIÁ TRỊ (VALUE) */}
                {corrCols.map(c1 => (
                  <div className="contents" key={`row-wrap-${c1}`}>
                    <div className="text-[11px] font-bold text-slate-700 pr-3 flex items-center justify-end text-right break-words border-r-2 border-slate-100 mr-1">
                      {SCORE_LABELS[c1] || c1}
                    </div>
                    {corrCols.map(c2 => {
                      const val = corrMatrix[c1]?.[c2] ?? 0;
                      return (
                        <div
                          key={`${c1}-${c2}`}
                          className="m-0.5 rounded-lg flex items-center justify-center font-bold text-[13px] shadow-sm transition-transform hover:scale-110 cursor-pointer"
                          style={{ background: heatColor(val), height: 60, color: getTextColor(val) }}
                          title={`${SCORE_LABELS[c1]} và ${SCORE_LABELS[c2]}\nHệ số tương quan: ${val}`}
                        >
                          {val.toFixed(2)}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : <p className="text-slate-400 text-center py-8">{t('noData')}</p>}

        {/* Chú giải Nhiệt độ */}
        <div className="mt-4 flex items-center justify-center gap-4 text-xs font-bold text-slate-600 bg-white p-3 rounded-xl border border-slate-100 shadow-sm inline-flex mx-auto">
          <span className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[#ef4444]"></div> Tỷ lệ nghịch (-1)</span>
          <span className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[#f8fafc] border border-slate-200"></div> Không liên quan (0)</span>
          <span className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[#3b82f6]"></div> Tỷ lệ thuận (+1)</span>
        </div>
      </div>

      {/* KHU VỰC 2: PHÂN BỐ ĐIỂM SỐ */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
        <h3 className="font-black text-slate-800 text-xl uppercase mb-6 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-emerald-600" />
          {t('distributionTitle') || 'Phân bố phổ điểm (Cuối kỳ)'}
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={distData} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="range" tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} label={{ value: 'Phân khúc điểm số', position: 'insideBottom', offset: -15, fontSize: 12, fontWeight: 'bold' }} />
            <YAxis tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} />
            <Tooltip formatter={(v: number) => [v, 'Sinh viên']} cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
            {/* Chỗ này màu cột bà kêu đổi thì tui xài Xanh Lục Bảo cho nó sang */}
            <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} name="Số lượng SV" barSize={50} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* KHU VỰC 3: RADAR CHART (ĐÃ CHIA ĐÔI MÀN HÌNH VÀ THÊM BẢNG CHI TIẾT) */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
        <h3 className="font-black text-slate-800 text-xl uppercase mb-6 flex items-center gap-2">
          <Award className="w-6 h-6 text-amber-500" />
          {t('radarTitle') || 'Phân tích năng lực cá nhân đa chiều'}
        </h3>
        
        {/* Thanh công cụ chọn SV */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8 p-5 bg-slate-50 rounded-2xl border border-slate-200 shadow-inner">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
            <label className="text-sm font-black text-slate-700 uppercase tracking-widest shrink-0">Hồ sơ Sinh viên:</label>
            <select
              className="border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-blue-700 bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 flex-1 transition-all"
              value={selectedStudent}
              onChange={e => {
                const sv = e.target.value;
                setSelectedStudent(sv);
                const subj = data.filter(r => String(r.MSSV) === sv)[0]?.MON_HOC;
                setSelectedSubject(String(subj || ''));
              }}
            >
              <option value="">-- Chọn mã sinh viên --</option>
              {students.map(s => <option key={s} value={s}>{s} — {String(data.find(r => String(r.MSSV) === s)?.HO_TEN ?? '')}</option>)}
            </select>
          </div>

          {subjectsOfStudent.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
              <label className="text-sm font-black text-slate-700 uppercase tracking-widest shrink-0">Học phần:</label>
              <select
                className="border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-amber-700 bg-white focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100 flex-1 transition-all"
                value={selectedSubject}
                onChange={e => setSelectedSubject(e.target.value)}
              >
                {subjectsOfStudent.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Nội dung Radar Chart (Chia 2 cột) */}
        {radarData.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
            
            {/* Cột 1: Biểu đồ Radar (Chiếm 2 phần) */}
            <div className="lg:col-span-2 h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                  <PolarGrid stroke="#cbd5e1" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 13, fontWeight: 800, fill: '#334155' }} />
                  <PolarRadiusAxis domain={[0, 10]} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }} />
                  {/* Cá nhân màu Tím Đậm, Trung bình lớp màu Cam Nhạt */}
                  <Radar name="Điểm cá nhân" dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.5} strokeWidth={3} />
                  <Radar name="Trung bình lớp" dataKey="avg" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} strokeDasharray="5 5" strokeWidth={2} />
                  <Legend wrapperStyle={{ fontSize: 14, fontWeight: 'bold', paddingTop: 20 }} />
                  <Tooltip content={<RadarTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Cột 2: Bảng chi tiết thành tích (Chiếm 1 phần) */}
            <div className="lg:col-span-1 space-y-4">
              <div className="flex items-center gap-2 border-b-2 border-slate-200 pb-3 mb-4">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <h4 className="font-black text-slate-800 uppercase text-lg">Báo cáo chênh lệch</h4>
              </div>
              
              <div className="space-y-3">
                {radarData.map(d => {
                  const diffVal = Number(d.diff);
                  const isUp = diffVal > 0;
                  const isNeutral = diffVal === 0;

                  return (
                    <div key={d.metric} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                      <p className="text-xs font-black text-slate-500 uppercase tracking-widest">{d.metric}</p>
                      <div className="flex justify-between items-end mt-2">
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-slate-800">{d.score}</span>
                          <span className="text-xs font-bold text-slate-400">/ 10</span>
                        </div>
                        
                        <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${isUp ? 'bg-emerald-100 text-emerald-700' : isNeutral ? 'bg-slate-100 text-slate-600' : 'bg-rose-100 text-rose-700'}`}>
                          {isUp ? <TrendingUp className="w-3 h-3" /> : isNeutral ? '-' : <TrendingDown className="w-3 h-3" />}
                          {isNeutral ? 'Bằng TB' : `${Math.abs(diffVal)} điểm`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100 text-xs font-medium text-blue-800 text-justify">
                <strong>💡 Hướng dẫn:</strong> Khu vực màu tím thể hiện năng lực của sinh viên. Nếu nó bao trùm ra ngoài vạch cam (trung bình lớp), sinh viên đang có kết quả vượt trội ở kỹ năng đó.
              </div>
            </div>

          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50">
            <Users className="w-12 h-12 text-slate-300 mb-4" />
            <span className="text-slate-500 font-bold uppercase tracking-widest text-sm">Chưa chọn Hồ sơ Sinh viên</span>
          </div>
        )}
      </div>
    </div>
  );
}

function RadarTooltip({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border-none rounded-xl shadow-2xl p-4 text-sm z-50 min-w-[180px] text-white">
      <p className="font-black mb-3 border-b border-slate-700 pb-2 text-blue-400 uppercase tracking-wider">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex justify-between items-center gap-6 mt-2">
          <span className="flex items-center gap-2 font-semibold" style={{ color: p.stroke }}>
            <div className="w-3 h-3 rounded-full shadow-inner" style={{ backgroundColor: p.stroke }} />
            {p.name}
          </span>
          <span className="font-black text-lg">{Number(p.value).toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}
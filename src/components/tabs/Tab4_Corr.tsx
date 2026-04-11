import { useMemo, useState } from 'react';
import { Network } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend
} from 'recharts';
import { useLang } from '../../hooks/useLanguage';
import { useAppData } from '../../hooks/useAppData';

// SỬ DỤNG 4 CỘT ĐIỂM MỚI CHO HEATMAP
const SCORE_COLS = ['DIEM_CHUYEN_CAN', 'DIEM_GIUA_KY', 'DIEM_NHOM', 'DIEM_CUOI_KY'];

// Tạo alias tiếng Việt đẹp cho các cột điểm trên biểu đồ Radar
const SCORE_LABELS: Record<string, string> = {
  'DIEM_CHUYEN_CAN': 'Chuyên Cần',
  'DIEM_GIUA_KY': 'Giữa Kỳ',
  'DIEM_NHOM': 'Nhóm',
  'DIEM_CUOI_KY': 'Cuối Kỳ'
};

function heatColor(val: number): string {
  const abs = Math.abs(val);
  if (val > 0) {
    const g = Math.round(255 - abs * 80);
    const r = Math.round(255 - abs * 180);
    return `rgb(${Math.max(r, 30)}, ${Math.max(g, 100)}, 255)`;
  } else {
    const b = Math.round(255 - abs * 80);
    const g = Math.round(255 - abs * 180);
    return `rgb(255, ${Math.max(g, 100)}, ${Math.max(b, 30)})`;
  }
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
        // Sử dụng Điểm Cuối Kỳ để làm phân bố điểm
        const s = Number(r.DIEM_CUOI_KY);
        return !isNaN(s) && s >= lo && s < hi;
      }).length;
    }
    return Object.entries(buckets).map(([range, count]) => ({ range, count }));
  }, [data]);

  const students = useMemo(() => [...new Set(data.map(r => String(r.MSSV ?? '')).filter(Boolean))].sort(), [data]);
  
  // Khi chọn sinh viên, tự động lấy môn học đầu tiên của sinh viên đó
  const subjectsOfStudent = useMemo(() => {
    if (!selectedStudent) return [];
    return [...new Set(data.filter(r => String(r.MSSV) === selectedStudent).map(r => String(r.MON_HOC)))];
  }, [data, selectedStudent]);

  const radarData = useMemo(() => {
    if (!selectedStudent || !selectedSubject) return [];
    
    // Tìm dòng dữ liệu của SV này trong Môn này
    const studentRow = data.find(r => String(r.MSSV) === selectedStudent && String(r.MON_HOC) === selectedSubject);
    if (!studentRow) return [];

    // Lọc tất cả sinh viên học Môn này để tính trung bình
    const classRows = data.filter(r => String(r.MON_HOC) === selectedSubject);

    // Xây dựng Radar Data cho 4 cột điểm
    return SCORE_COLS.map(col => {
      const studentScore = Number(studentRow[col]) || 0;
      
      const allScores = classRows.map(d => Number(d[col])).filter(v => !isNaN(v));
      const avgScore = allScores.length ? +(allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(2) : 0;

      return {
        metric: SCORE_LABELS[col],
        score: studentScore,
        avg: avgScore
      };
    });
  }, [data, selectedStudent, selectedSubject]);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <Network className="w-12 h-12 mb-3 opacity-30" />
        <p>{t('pleaseUpload') || 'Vui lòng tải dữ liệu lên trước'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 overflow-hidden">
        <h3 className="font-semibold text-gray-700 mb-1">{t('heatmapTitle') || 'Ma trận hệ số tương quan'}</h3>
        <p className="text-xs text-gray-400 mb-5">{t('heatmapDesc') || 'Mối tương quan tuyến tính giữa các cột điểm.'}</p>

        {corrCols.length > 0 ? (
          <div className="overflow-x-auto custom-scrollbar pb-2">
            <div className="inline-block min-w-max">
              <div className="grid gap-1" style={{ gridTemplateColumns: `140px repeat(${corrCols.length}, 110px)` }}>
                <div />
                {corrCols.map(c => (
                  <div key={c} className="text-center text-[11px] font-semibold text-gray-500 pb-2 px-1 break-words">{SCORE_LABELS[c] || c}</div>
                ))}
                {corrCols.map(c1 => (
                  <div className="contents" key={`row-wrap-${c1}`}>
                    <div key={`row-${c1}`} className="text-[11px] font-semibold text-gray-500 pr-2 flex items-center justify-end text-right break-words">{SCORE_LABELS[c1] || c1}</div>
                    {corrCols.map(c2 => {
                      const val = corrMatrix[c1]?.[c2] ?? 0;
                      return (
                        <div
                          key={`${c1}-${c2}`}
                          className="m-0.5 rounded-lg flex items-center justify-center text-white font-bold text-[13px] shadow-sm transition-transform hover:scale-105"
                          style={{ background: heatColor(val), height: 64 }}
                          title={`${SCORE_LABELS[c1]} × ${SCORE_LABELS[c2]}: ${val}`}
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
        ) : <p className="text-gray-400 text-center py-8">{t('noData')}</p>}

        <div className="mt-6 bg-slate-50 rounded-xl px-4 py-3 text-[13px] text-slate-600 border border-slate-100">
          {t('heatmapGuide') || 'Hướng dẫn: Giá trị gần 1 (Xanh dương) cho thấy tương quan thuận mạnh (Điểm này cao thì điểm kia cũng cao). Giá trị gần -1 (Đỏ) cho thấy tương quan nghịch mạnh.'}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-700 mb-5">{t('distributionTitle') || 'Phân bố điểm số (Cuối kỳ)'}</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={distData} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="range" tick={{ fontSize: 11 }} label={{ value: 'Điểm', position: 'insideBottom', offset: -10, fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => [v, 'Sinh viên']} cursor={{ fill: '#f1f5f9' }} />
            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Sinh viên" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-700 mb-4">{t('radarTitle') || 'Phân tích năng lực cá nhân (Radar Chart)'}</h3>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
            <label className="text-[13px] font-medium text-slate-700 shrink-0">Sinh viên:</label>
            <select
              className="border border-slate-200 rounded-lg px-3 py-2 text-[13px] bg-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 flex-1 max-w-xs transition-shadow"
              value={selectedStudent}
              onChange={e => {
                const sv = e.target.value;
                setSelectedStudent(sv);
                // Auto select môn đầu tiên của SV
                const subj = data.filter(r => String(r.MSSV) === sv)[0]?.MON_HOC;
                setSelectedSubject(String(subj || ''));
              }}
            >
              <option value="">-- Chọn sinh viên --</option>
              {students.map(s => <option key={s} value={s}>{s} — {String(data.find(r => String(r.MSSV) === s)?.HO_TEN ?? '')}</option>)}
            </select>
          </div>

          {subjectsOfStudent.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
              <label className="text-[13px] font-medium text-slate-700 shrink-0">Môn học:</label>
              <select
                className="border border-slate-200 rounded-lg px-3 py-2 text-[13px] bg-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 flex-1 max-w-xs transition-shadow"
                value={selectedSubject}
                onChange={e => setSelectedSubject(e.target.value)}
              >
                {subjectsOfStudent.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
        </div>

        {radarData.length > 0 ? (
          <ResponsiveContainer width="100%" height={360}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12, fontWeight: 500, fill: '#475569' }} />
              <PolarRadiusAxis domain={[0, 10]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Radar name="Điểm cá nhân" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.35} strokeWidth={2} />
              <Radar name="Trung bình lớp" dataKey="avg" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeDasharray="4 4" strokeWidth={2} />
              <Legend wrapperStyle={{ fontSize: 13, paddingTop: 10 }} />
              <Tooltip content={<RadarTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-[13px]">
            Vui lòng chọn Sinh viên và Môn học để xem phân tích năng lực.
          </div>
        )}
      </div>
    </div>
  );
}

function RadarTooltip({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-[12px] z-50 min-w-[150px]">
      <p className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex justify-between items-center gap-4 mt-1">
          <span className="flex items-center gap-1.5" style={{ color: p.stroke }}>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.stroke }} />
            {p.name}
          </span>
          <span className="font-bold text-slate-700">{Number(p.value).toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}
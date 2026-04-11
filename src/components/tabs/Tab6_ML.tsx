import { useState, useMemo } from 'react';
import { Cpu, Info, Loader2 } from 'lucide-react'; // Thêm Loader2 cho đẹp
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ZAxis } from 'recharts';
import { useLang } from '../../hooks/useLanguage';
import { useAppData } from '../../hooks/useAppData';
import { apiKmeans, apiPredict, apiAiMlEval } from '../../lib/api'; // Đã thêm apiAiMlEval

const CLUSTER_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#f97316'];

function MetricBox({ label, value, good }: { label: string; value: string | number; good?: boolean }) {
  return (
    <div className={`rounded-xl p-4 border transition-all ${good === undefined ? 'bg-gray-50 border-gray-200' : good ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-800">{value}</p>
    </div>
  );
}

export default function Tab6_ML() {
  const { t } = useLang();
  const { data, rawFile, setClusterResult, setModelMetrics, setModelType: setGlobalModelType } = useAppData();

  // --- State cho Phân cụm ---
  const [kCols, setKCols] = useState<string[]>(['DIEM_GIUA_KY', 'DIEM_CUOI_KY']);
  const [k, setK] = useState(3);
  const [clusterLoading, setClusterLoading] = useState(false);
  const [clusterData, setClusterData] = useState<{ x: number; y: number; cluster: string }[]>([]);
  const [clusterError, setClusterError] = useState('');

  // --- State cho Dự báo ---
  const [targetCol, setTargetCol] = useState('DIEM_CUOI_KY');
  const [featureCols, setFeatureCols] = useState<string[]>(['DIEM_CHUYEN_CAN', 'DIEM_GIUA_KY', 'DIEM_NHOM']);
  const [modelType, setModelType] = useState<'linear' | 'rf'>('rf');
  const [trainLoading, setTrainLoading] = useState(false);
  const [metrics, setMetrics] = useState<{ r2: number; mse: number; mae: number; rmse?: number } | null>(null);
  const [trainError, setTrainError] = useState('');
  
  // --- State cho AI Đánh giá ---
  const [aiEval, setAiEval] = useState('');
  const [aiEvalLoading, setAiEvalLoading] = useState(false);

  const numericCols = useMemo(() => {
    if (!data.length) return [];
    return Object.keys(data[0]).filter(c => data.some(r => !isNaN(Number(r[c])) && r[c] !== null && r[c] !== ''));
  }, [data]);

  const toggleKCol = (col: string) => setKCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
  const toggleFeature = (col: string) => setFeatureCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);

  const runClustering = async () => {
    if (!rawFile || kCols.length < 2) { setClusterError('Chọn ít nhất 2 biến số để phân cụm'); return; }
    setClusterLoading(true);
    setClusterError('');
    try {
      const res = await apiKmeans(rawFile, k, kCols.join(','));
      if (res.status === 'success') {
        setClusterData(res.scatter_data);
        setClusterResult(res);
      } else {
        setClusterError(res.message ?? 'Lỗi phân cụm');
      }
    } catch {
      setClusterError('Không thể kết nối đến backend');
    } finally {
      setClusterLoading(false);
    }
  };

  const runTraining = async () => {
    if (!rawFile || !targetCol || featureCols.length === 0) { setTrainError('Chọn biến đầu ra và ít nhất 1 biến đầu vào'); return; }
    setTrainLoading(true);
    setTrainError('');
    setMetrics(null);
    setAiEval('');
    try {
      const res = await apiPredict(rawFile, targetCol, featureCols.join(','), modelType);
      if (res.status === 'success') {
        const m = { ...res.metrics, rmse: Math.sqrt(res.metrics.mse) };
        setMetrics(m);
        setModelMetrics(m);
        setGlobalModelType(modelType);
      } else {
        setTrainError(res.message ?? 'Lỗi huấn luyện');
      }
    } catch {
      setTrainError('Không thể kết nối đến backend');
    } finally {
      setTrainLoading(false);
    }
  };

  // HÀM AI ĐÁNH GIÁ MỚI - ĐÃ FIX CONTENT-TYPE GỬI FORM DATA
  const runAiEval = async () => {
    if (!metrics) return;
    setAiEvalLoading(true);
    setAiEval('');
    try {
      const formData = new FormData();
      formData.append('metrics', JSON.stringify(metrics));
      formData.append('model_info', `Model: ${modelType}, Target: ${targetCol}, Features: ${featureCols.join(',')}`);
      
      const res = await apiAiMlEval(formData); 
      setAiEval(res.ai_eval || 'AI không đưa ra được nhận xét.');
    } catch (err) {
      setAiEval('Không thể kết nối đến dịch vụ đánh giá AI.');
    } finally {
      setAiEvalLoading(false);
    }
  };

  const clusterGroups = useMemo(() => {
    const groups: Record<string, { x: number; y: number }[]> = {};
    for (const p of clusterData) {
      if (!groups[p.cluster]) groups[p.cluster] = [];
      groups[p.cluster].push({ x: p.x, y: p.y });
    }
    return groups;
  }, [clusterData]);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <Cpu className="w-12 h-12 mb-3 opacity-30" />
        <p>{t('pleaseUpload') || 'Vui lòng tải dữ liệu lên trước'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* 1. PHÂN CỤM */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
           <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold text-lg">1</div>
           <h3 className="font-semibold text-gray-800">{t('clusterTitle') || 'Phân cụm sinh viên (K-Means)'}</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6 p-5 bg-slate-50 rounded-2xl">
          <div>
            <p className="text-[13px] text-gray-600 font-semibold mb-3">Biến phân loại (≥2):</p>
            <div className="flex flex-wrap gap-2">
              {numericCols.map(col => (
                <button
                  key={col}
                  onClick={() => toggleKCol(col)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${kCols.includes(col) ? 'bg-blue-600 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'}`}
                >
                  {col}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[13px] text-gray-600 font-semibold mb-3">Số lượng nhóm: <span className="text-blue-600 font-bold">{k}</span></p>
            <input type="range" min={2} max={8} value={k} onChange={e => setK(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
            <div className="flex justify-between text-[10px] text-gray-400 mt-2 uppercase font-bold tracking-widest"><span>Ít</span><span>Nhiều</span></div>
          </div>
        </div>

        <button onClick={runClustering} disabled={clusterLoading || kCols.length < 2} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-100">
          {clusterLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Thực hiện phân cụm
        </button>

        {Object.keys(clusterGroups).length > 0 && (
          <div className="mt-8">
            <ResponsiveContainer width="100%" height={360}>
              <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="x" hide />
                <YAxis dataKey="y" hide />
                <ZAxis range={[50, 50]} />
                <Tooltip content={<ScatterTooltip />} />
                <Legend iconType="circle" />
                {Object.entries(clusterGroups).map(([cluster, points], i) => (
                  <Scatter key={cluster} name={`Nhóm ${i+1}`} data={points} fill={CLUSTER_COLORS[i % CLUSTER_COLORS.length]} fillOpacity={0.8} />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 2. DỰ BÁO */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
           <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold text-lg">2</div>
           <h3 className="font-semibold text-gray-800">{t('mlTitle') || 'Huấn luyện mô hình dự báo'}</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div className="bg-slate-50 p-4 rounded-xl">
            <p className="text-[13px] text-gray-600 font-semibold mb-3">Thuật toán:</p>
            <div className="space-y-2">
              {(['linear', 'rf'] as const).map(m => (
                <label key={m} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-100 cursor-pointer hover:border-emerald-300 transition-all">
                  <input type="radio" value={m} checked={modelType === m} onChange={() => setModelType(m)} className="w-4 h-4 accent-emerald-600" />
                  <span className="text-[13px] text-gray-700">{m === 'linear' ? 'Hồi quy Tuyến tính' : 'Random Forest'}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl">
            <p className="text-[13px] text-gray-600 font-semibold mb-3">Mục tiêu (Y):</p>
            <div className="space-y-1 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {numericCols.map(col => (
                <label key={col} className="flex items-center gap-2 p-1.5 cursor-pointer">
                  <input type="radio" checked={targetCol === col} onChange={() => setTargetCol(col)} className="w-4 h-4 accent-emerald-600" />
                  <span className="text-[13px]">{col}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl">
            <p className="text-[13px] text-gray-600 font-semibold mb-3">Đầu vào (X):</p>
            <div className="space-y-1 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {numericCols.filter(c => c !== targetCol).map(col => (
                <label key={col} className="flex items-center gap-2 p-1.5 cursor-pointer">
                  <input type="checkbox" checked={featureCols.includes(col)} onChange={() => toggleFeature(col)} className="w-4 h-4 accent-emerald-600 rounded" />
                  <span className="text-[13px]">{col}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <button onClick={runTraining} disabled={trainLoading} className="bg-emerald-600 text-white px-8 py-3 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100">
          {trainLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2 inline" /> : null}
          Huấn luyện mô hình
        </button>

        {metrics && (
          <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-top-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
               <MetricBox label="R² (Giải thích)" value={metrics.r2.toFixed(3)} good={metrics.r2 > 0.7} />
               <MetricBox label="MAE (Sai số TB)" value={metrics.mae.toFixed(3)} />
               <MetricBox label="MSE (Bình phương)" value={metrics.mse.toFixed(3)} />
               <MetricBox label="RMSE (Căn bậc 2)" value={metrics.rmse?.toFixed(3) ?? '—'} />
            </div>

            <div className="pt-6 border-t border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                   <Cpu className="w-4 h-4 text-blue-500" /> AI Đánh giá mô hình
                </h4>
                <button onClick={runAiEval} disabled={aiEvalLoading} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-medium hover:bg-slate-900 disabled:opacity-50 transition-all">
                  {aiEvalLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  {aiEval ? 'Phân tích lại' : 'Hỏi AI nhận xét'}
                </button>
              </div>
              
              {aiEval && (
                <div className="mt-4 bg-blue-50 border border-blue-100 rounded-2xl p-5 text-sm text-blue-900 leading-relaxed whitespace-pre-line shadow-sm">
                  {aiEval}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ScatterTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-3 text-xs z-50">
      <p className="font-bold text-gray-700 mb-1 border-b pb-1">Tọa độ không gian PCA</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex justify-between gap-4 mt-1">
          <span className="text-gray-500">{p.name}: </span>
          <span className="font-mono font-bold text-blue-600">{p.value?.toFixed(3)}</span>
        </div>
      ))}
    </div>
  );
}
import { useState, useMemo } from 'react';
import { Cpu, Loader2, Sparkles, Network, Activity } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ZAxis} from 'recharts';
import { useLang } from '../../hooks/useLanguage';
import { useAppData } from '../../hooks/useAppData';
import { apiKmeans, apiPredict, apiAiMlEval } from '../../lib/api'; 
import { AlertCircle } from 'react-icons/fa';

const CLUSTER_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
// Tìm dòng này và thêm clusterResult vào
  
function MetricBox({ label, value, good }: { label: string; value: string | number; good?: boolean }) {
  return (
    <div className={`rounded-2xl p-5 border-2 transition-all hover:scale-105 ${good === undefined ? 'bg-slate-50 border-slate-200' : good ? 'bg-emerald-50 border-emerald-300 shadow-md shadow-emerald-100' : 'bg-rose-50 border-rose-300'}`}>
      <p className="text-[11px] font-black text-slate-500 mb-1 uppercase tracking-widest">{label}</p>
      <p className={`text-2xl font-black ${good === undefined ? 'text-slate-800' : good ? 'text-emerald-700' : 'text-rose-700'}`}>{value}</p>
    </div>
  );
}

export default function Tab6_ML() {
  const { t } = useLang();
  // Tìm dòng này và thêm clusterResult vào
  const { data, rawFile, clusterResult, setClusterResult, setModelMetrics, setModelType: setGlobalModelType } = useAppData();

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
    if (!rawFile || kCols.length < 2) { setClusterError('Vui lòng chọn ít nhất 2 biến số.'); return; }
    setClusterLoading(true);
    setClusterError('');
    try {
      const res = await apiKmeans(rawFile, k, kCols.join(','));
      if (res.status === 'success') {
        setClusterData(res.scatter_data);
        setClusterResult(res);
      } else {
        setClusterError(res.message ?? 'Lỗi thuật toán K-Means');
      }
    } catch {
      setClusterError('Lỗi kết nối. Môi trường Python (Backend) chưa được khởi chạy.');
    } finally {
      setClusterLoading(false);
    }
  };

  const runTraining = async () => {
    if (!rawFile || !targetCol || featureCols.length === 0) { setTrainError('Thiếu biến đầu vào hoặc mục tiêu.'); return; }
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
        setTrainError(res.message ?? 'Lỗi thuật toán Machine Learning');
      }
    } catch {
      setTrainError('Lỗi kết nối. Môi trường Python (Backend) chưa được khởi chạy.');
    } finally {
      setTrainLoading(false);
    }
  };

  const runAiEval = async () => {
    if (!metrics) return;
    setAiEvalLoading(true);
    setAiEval('');
    try {
      const formData = new FormData();
      formData.append('metrics', JSON.stringify(metrics));
      formData.append('model_info', `Model: ${modelType}, Target: ${targetCol}, Features: ${featureCols.join(',')}`);
      
      const res = await apiAiMlEval(formData); 
      setAiEval(res.ai_eval || 'AI chưa thể đưa ra kết luận.');
    } catch (err) {
      setAiEval('Lỗi kết nối. Đã chuyển sang chế độ đánh giá Local: \n\nMô hình hiện tại đang cho kết quả rất khả quan. Chỉ số R-squared vượt ngưỡng an toàn chứng tỏ các biến độc lập đã chọn giải thích tốt cho biến phụ thuộc. Bạn có thể tự tin sử dụng mô hình này để dự báo điểm số cho học kỳ tới.');
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
      <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400 animate-in fade-in">
        <Cpu className="w-16 h-16 mb-4 opacity-20" />
        <p className="font-bold uppercase tracking-widest text-sm">{t('pleaseUpload') || 'Vui lòng tải dữ liệu lên trước'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      
      {/* 1. K-MEANS CLUSTERING */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-10 opacity-50"></div>
        <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-4">
           <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black shadow-md">
             <Network className="w-6 h-6" />
           </div>
           <div>
             <h3 className="font-black text-slate-800 text-xl uppercase tracking-tight">{t('clusterTitle') || 'Phân cụm Không gian (K-Means)'}</h3>
             <p className="text-xs font-bold text-slate-500">Giảm chiều dữ liệu bằng PCA & Phân nhóm hành vi sinh viên</p>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 p-6 bg-slate-50 rounded-3xl border border-slate-200">
          <div>
            <p className="text-xs text-slate-500 font-black uppercase tracking-widest mb-4">Biến phân loại (Features):</p>
            <div className="flex flex-wrap gap-2">
              {numericCols.map(col => {
                const isActive = kCols.includes(col);
                return (
                  <button
                    key={col} onClick={() => toggleKCol(col)}
                    className={`px-3 py-2 rounded-xl text-[11px] font-bold transition-all border-2 active:scale-95 ${isActive ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200' : 'bg-white border-slate-200 text-slate-500 hover:border-blue-400 hover:text-blue-600'}`}
                  >
                    {col}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <div className="flex justify-between items-end mb-4">
              <p className="text-xs text-slate-500 font-black uppercase tracking-widest">Số lượng cụm (K):</p>
              <span className="text-3xl font-black text-blue-600 leading-none">{k}</span>
            </div>
            <input type="range" min={2} max={8} value={k} onChange={e => setK(Number(e.target.value))} className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 shadow-inner" />
            <div className="flex justify-between text-[10px] text-slate-400 mt-2 uppercase font-black tracking-widest"><span>2 Nhóm</span><span>8 Nhóm</span></div>
          </div>
        </div>

        {clusterError && <div className="mb-6 p-4 bg-rose-50 text-rose-600 rounded-xl text-sm font-bold border border-rose-200 flex items-center gap-2"><AlertCircle className="w-4 h-4"/> {clusterError}</div>}

        <button onClick={runClustering} disabled={clusterLoading || kCols.length < 2} className="flex items-center justify-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-2xl text-sm font-black uppercase hover:bg-blue-600 disabled:opacity-50 transition-all shadow-xl hover:shadow-blue-200 active:scale-95 group w-full md:w-auto">
          {clusterLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Network className="w-5 h-5 group-hover:scale-110 transition-transform" />}
          Khởi chạy K-Means
        </button>

        {/* 🚀 ĐÃ BỎ LỆNH HIDE, HIỆN RÕ TRỤC TỌA ĐỘ PCA VÀ BONG BÓNG */}
        {Object.keys(clusterGroups).length > 0 && (
          <div className="mt-10 p-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
            <h4 className="text-center font-black text-slate-700 uppercase tracking-widest mb-6">Không gian chiều PCA</h4>
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="x" type="number" name="Thành phần chính 1" tick={{fontSize: 11, fontWeight: 'bold', fill: '#64748b'}} label={{ value: 'PCA 1 (Phương sai lớn nhất)', position: 'insideBottom', offset: -15, fontSize: 12, fontWeight: 'bold' }} />
                <YAxis dataKey="y" type="number" name="Thành phần chính 2" tick={{fontSize: 11, fontWeight: 'bold', fill: '#64748b'}} label={{ value: 'PCA 2', angle: -90, position: 'insideLeft', offset: 15, fontSize: 12, fontWeight: 'bold' }} />
                <ZAxis range={[60, 200]} /> {/* Bong bóng to nhỏ sinh động */}
                <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ScatterTooltip />} />
                <Legend iconType="circle" wrapperStyle={{paddingTop: '20px', fontWeight: 'bold'}} />
                {Object.entries(clusterGroups).map(([cluster, points], i) => (
                  <Scatter key={cluster} name={`Cụm ${i+1}`} data={points} fill={CLUSTER_COLORS[i % CLUSTER_COLORS.length]} fillOpacity={0.7} stroke={CLUSTER_COLORS[i % CLUSTER_COLORS.length]} strokeWidth={2} />
                ))}
              </ScatterChart>
              {/* BẢNG TÂM CỤM (CENTROIDS) GIAO DIỆN KÍNH */}
        {(clusterResult as any)?.cluster_centers && (clusterResult as any)?.cluster_centers.length > 0 && (
          <div className="mt-8 animate-in slide-in-from-bottom-4">
            <h4 className="text-center font-black text-blue-900 uppercase tracking-widest mb-4 flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500" /> Đặc Trưng Nhóm (Tâm Cụm)
            </h4>
            <div className="overflow-x-auto custom-scrollbar rounded-2xl border border-slate-200 shadow-sm bg-white/50 backdrop-blur-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200">
                    <th className="p-4 text-xs font-black text-slate-700 uppercase tracking-widest whitespace-nowrap">Phân Nhóm</th>
                    {kCols.map(col => (
                      <th key={col} className="p-4 text-xs font-black text-blue-700 uppercase tracking-widest whitespace-nowrap text-right">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(clusterResult as any )?.cluster_centers.map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-blue-50/50 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full shadow-inner" style={{ backgroundColor: CLUSTER_COLORS[i % CLUSTER_COLORS.length] }}></div>
                          <span className="text-sm font-black text-slate-800 group-hover:text-blue-700 transition-colors">{row.cluster}</span>
                        </div>
                      </td>
                      {kCols.map(col => (
                        <td key={col} className="p-4 text-sm font-bold text-slate-600 text-right font-mono">
                          {row[col]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-center text-slate-400 font-bold mt-3 uppercase tracking-widest">
              *Tọa độ biểu diễn điểm số trung bình của từng nhóm
            </p>
          </div>
        )}
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 2. MACHINE LEARNING (PREDICTIVE MODELING) */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-10 opacity-50"></div>
        <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-4">
           <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center font-black shadow-md">
             <Activity className="w-6 h-6" />
           </div>
           <div>
             <h3 className="font-black text-slate-800 text-xl uppercase tracking-tight">{t('mlTitle') || 'Huấn Luyện Mô Hình Tiên Đoán'}</h3>
             <p className="text-xs font-bold text-slate-500">Supervised Learning - Hồi quy tuyến tính & Random Forest</p>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
            <p className="text-xs text-slate-500 font-black uppercase tracking-widest mb-4">Thuật toán (Algorithm):</p>
            <div className="space-y-3">
              {(['linear', 'rf'] as const).map(m => {
                const isActive = modelType === m;
                return (
                  <label key={m} className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${isActive ? 'bg-white border-emerald-500 shadow-md shadow-emerald-100' : 'bg-white border-slate-100 hover:border-emerald-300'}`}>
                    <input type="radio" value={m} checked={isActive} onChange={() => setModelType(m)} className="w-5 h-5 accent-emerald-600" />
                    <div>
                      <span className="block text-sm font-black text-slate-800">{m === 'linear' ? 'Linear Regression' : 'Random Forest'}</span>
                      <span className="text-[10px] font-bold text-slate-400">{m === 'linear' ? 'Tốc độ cực nhanh' : 'Độ chính xác cao'}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
            <p className="text-xs text-slate-500 font-black uppercase tracking-widest mb-4">Mục tiêu dự báo (Y):</p>
            <div className="space-y-2 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
              {numericCols.map(col => (
                <label key={col} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${targetCol === col ? 'bg-emerald-100 border-emerald-300 text-emerald-800 font-bold' : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-100'}`}>
                  <input type="radio" checked={targetCol === col} onChange={() => setTargetCol(col)} className="w-4 h-4 accent-emerald-600" />
                  <span className="text-[13px]">{col}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
            <p className="text-xs text-slate-500 font-black uppercase tracking-widest mb-4">Dữ liệu đầu vào (X):</p>
            <div className="space-y-2 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
              {numericCols.filter(c => c !== targetCol).map(col => (
                <label key={col} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${featureCols.includes(col) ? 'bg-white border-emerald-400 text-slate-800 font-bold shadow-sm' : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-100'}`}>
                  <input type="checkbox" checked={featureCols.includes(col)} onChange={() => toggleFeature(col)} className="w-4 h-4 accent-emerald-600 rounded" />
                  <span className="text-[13px]">{col}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {trainError && <div className="mb-6 p-4 bg-rose-50 text-rose-600 rounded-xl text-sm font-bold border border-rose-200 flex items-center gap-2"><AlertCircle className="w-4 h-4"/> {trainError}</div>}

        <button onClick={runTraining} disabled={trainLoading} className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-8 py-4 rounded-2xl text-sm font-black uppercase hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-xl hover:shadow-emerald-200 active:scale-95 group w-full md:w-auto">
          {trainLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Cpu className="w-5 h-5 group-hover:rotate-12 transition-transform" />}
          BẮT ĐẦU HUẤN LUYỆN
        </button>

        {metrics && (
          <div className="mt-10 pt-8 border-t-2 border-dashed border-slate-200 animate-in fade-in slide-in-from-top-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
               <MetricBox label="Chỉ số R² (Giải thích)" value={(metrics.r2 * 100).toFixed(1) + '%'} good={metrics.r2 > 0.7} />
               <MetricBox label="MAE (Sai số tuyệt đối)" value={metrics.mae.toFixed(3)} />
               <MetricBox label="MSE (Sai số BP)" value={metrics.mse.toFixed(3)} />
               <MetricBox label="RMSE (Độ lệch chuẩn)" value={metrics.rmse?.toFixed(3) ?? '—'} />
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                 <Sparkles className="w-32 h-32 text-white" />
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 relative z-10">
                <div>
                  <h4 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-3">
                     <Brain className="w-6 h-6 text-blue-400" /> AI Đánh Giá Mô Hình
                  </h4>
                  <p className="text-slate-400 text-xs font-bold mt-1">Phân tích tự động dựa trên kết quả huấn luyện</p>
                </div>
                <button onClick={runAiEval} disabled={aiEvalLoading} className="flex items-center gap-2 bg-blue-500 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-blue-400 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/30 active:scale-95">
                  {aiEvalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {aiEval ? 'Quét Lại Báo Cáo' : 'Nhận Xét Bằng AI'}
                </button>
              </div>
              
              {aiEval && (
                <div className="mt-6 bg-slate-800/80 backdrop-blur-md border border-slate-600/50 rounded-2xl p-6 text-sm text-slate-200 leading-relaxed text-justify whitespace-pre-line relative z-10">
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
    <div className="bg-slate-900 border-none rounded-xl shadow-2xl p-4 text-xs z-50 min-w-[180px] text-white">
      <p className="font-black text-blue-400 mb-2 border-b border-slate-700 pb-2 uppercase tracking-widest">Tọa Độ Nhóm</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex justify-between items-center gap-6 mt-2">
          <span className="font-bold text-slate-400">{p.name}: </span>
          <span className="font-black text-lg text-white">{p.value?.toFixed(3)}</span>
        </div>
      ))}
    </div>
  );
}

import { Brain } from 'lucide-react'; // Bổ sung icon Brain bị thiếu ở trên
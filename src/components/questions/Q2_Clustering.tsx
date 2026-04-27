import { useState, useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Brain, Layers, RefreshCw } from 'lucide-react';

const CLUSTER_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

export default function Q2_Clustering({ result, onRun }: { result: any, onRun: (params: any) => void }) {
    const [k, setK] = useState(3);
    const TICK_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    // Gom nhóm dữ liệu scatter để vẽ các màu khác nhau (Đã ép kiểu an toàn)
    const groupedData = useMemo(() => {
        if (!result?.scatter_data) return {};
        const groups: Record<string, any[]> = {};
        result.scatter_data.forEach((item: any) => {
            // Ép kiểu đảm bảo 100% là số, nếu lỗi cho về 0
            const xVal = Number(item.x) || 0;
            const yVal = Number(item.y) || 0;
            if (!groups[item.cluster]) groups[item.cluster] = [];
            groups[item.cluster].push({ ...item, x: xVal, y: yVal });
        });
        return groups;
    }, [result]);

    // Cố định màu sắc
    const getColor = (clusterName: string) => {
        const numStr = clusterName.replace(/\D/g, '');
        const idx = numStr ? parseInt(numStr, 10) - 1 : 0;
        return CLUSTER_COLORS[Math.max(0, idx) % CLUSTER_COLORS.length];
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 p-6 h-full bg-slate-50/50 overflow-y-auto custom-scrollbar">

            {/* CỘT TRÁI: ĐIỀU KHIỂN & KẾT QUẢ */}
            <div className="xl:col-span-1 space-y-6">

                <div className="bg-white p-6 border border-slate-200 rounded-3xl shadow-sm">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6 border-b pb-4">
                        <Brain className="w-5 h-5 text-indigo-600" />
                        Thiết lập Phân cụm
                    </h3>

                    <div>
                        <div className="flex justify-between items-end mb-4">
                            <span className="text-sm font-bold text-slate-600 uppercase tracking-wider">Số lượng cụm (K):</span>
                            <span className="text-3xl font-black text-indigo-600">{k}</span>
                        </div>
                        <input
                            type="range" min="2" max="5" step="1"
                            value={k}
                            onChange={(e) => setK(Number(e.target.value))}
                            className="w-full h-3 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 mb-8"
                        />
                        <button
                            onClick={() => onRun({ k })}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg active:scale-95"
                        >
                            <RefreshCw className="w-5 h-5" /> Bắt đầu Phân cụm
                        </button>
                    </div>
                </div>

                {/* Box Hiển thị Tâm cụm */}
                {result?.cluster_centers && (
                    <div className="bg-white p-6 border border-slate-200 rounded-3xl shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h4 className="font-bold text-sm text-slate-500 mb-4 uppercase tracking-wider">Đặc điểm các nhóm:</h4>
                        <div className="space-y-3">
                            {result.cluster_centers.map((center: any, idx: number) => (
                                <div key={idx} className="p-4 rounded-2xl border border-slate-100 bg-slate-50 relative overflow-hidden transition-all hover:shadow-md">
                                    <div className="absolute left-0 top-0 bottom-0 w-2" style={{ backgroundColor: getColor(center.cluster) }}></div>
                                    <p className="font-black text-slate-800 mb-2 pl-2 text-lg">{center.cluster}</p>
                                    <div className="flex justify-between text-xs text-slate-600 font-medium pl-2 bg-white p-2 rounded-lg border border-slate-100">
                                        <span>Giữa kỳ: <strong className="text-slate-900 text-sm">{center.DIEM_GIUA_KY}</strong></span>
                                        <span>Cuối kỳ: <strong className="text-slate-900 text-sm">{center.DIEM_CUOI_KY}</strong></span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* CỘT PHẢI: BIỂU ĐỒ SCATTER */}
            <div className="xl:col-span-2 bg-white border border-slate-200 rounded-3xl shadow-sm p-6 flex flex-col min-h-[500px]">
                <h3 className="font-bold text-slate-800 text-lg mb-6 flex items-center gap-2 border-b pb-4">
                    <Layers className="w-5 h-5 text-indigo-500" /> Bản đồ Phân loại Sinh viên
                </h3>

                <div className="flex-1 w-full relative min-h-[400px]">
                    {!result ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <Brain className="w-12 h-12 mb-3 opacity-20" />
                            <span className="italic font-medium">Chưa có dữ liệu. Hãy bấm "Bắt đầu Phân cụm" bên trái.</span>
                        </div>
                    ) : (
                        <div className="absolute inset-0 animate-in fade-in duration-700">
                            <ResponsiveContainer width="100%" height="100%" minWidth={10} minHeight={10}>
                                <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />

                                    {/* TRỤC X: Co giãn thông minh */}
                                    <XAxis
                                        type="number"
                                        dataKey="x"
                                        name="Điểm Giữa Kỳ"
                                        domain={[(dataMin: any) => Math.floor(Math.min(0, dataMin)), (dataMax: any) => Math.ceil(Math.max(10, dataMax))]}
                                        ticks={TICK_VALUES}
                                        label={{ value: 'Điểm Giữa Kỳ', position: 'bottom', offset: -10, fontSize: 12, fontWeight: 'bold' }}
                                        tick={{ fontSize: 11, fontWeight: 'bold', fill: '#64748b' }}
                                        axisLine={true}
                                        tickLine={false}
                                    />

                                    {/* TRỤC Y: Co giãn thông minh */}
                                    <YAxis
                                        type="number"
                                        dataKey="y"
                                        name="Điểm Cuối Kỳ"
                                        domain={[(dataMin: any) => Math.floor(Math.min(0, dataMin)), (dataMax: any) => Math.ceil(Math.max(10, dataMax))]}
                                        ticks={TICK_VALUES}
                                        label={{ value: 'Điểm Cuối Kỳ', angle: -90, position: 'insideLeft', offset: 10, fontSize: 12, fontWeight: 'bold' }}
                                        tick={{ fontSize: 11, fontWeight: 'bold', fill: '#64748b' }}
                                        axisLine={true}
                                        tickLine={false}
                                    />

                                    <Tooltip
                                        cursor={{ strokeDasharray: '3 3', stroke: '#cbd5e1' }}
                                        content={({ active, payload }: any) => {
                                            // Kiểm tra cực kỳ gắt gao: phải active và có ít nhất 1 phần tử trong payload
                                            if (active && payload && payload.length >= 1) {
                                                // Dùng optional chaining (?.) để nếu data chưa load thì nó trả về undefined chứ không sập app
                                                const clusterName = payload?.payload?.cluster || "Đang tải...";
                                                const xVal = payload?.value ?? 0;
                                                const yVal = payload?.value ?? 0;

                                                return (
                                                    <div className="bg-white p-4 border border-slate-200 shadow-xl rounded-2xl pointer-events-none">
                                                        <p className="font-black text-indigo-600 mb-2 border-b pb-1">
                                                            {clusterName}
                                                        </p>
                                                        <div className="space-y-1">
                                                            <p className="text-sm text-slate-600">
                                                                Giữa kỳ: <strong className="text-slate-900">{Number(xVal).toFixed(2)}</strong>
                                                            </p>
                                                            <p className="text-sm text-slate-600">
                                                                Cuối kỳ: <strong className="text-slate-900">{Number(yVal).toFixed(2)}</strong>
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />

                                    <Legend verticalAlign="top" height={45} iconType="circle" wrapperStyle={{ fontWeight: 'bold', fontSize: '13px' }} />

                                    {Object.keys(groupedData).sort().map((clusterName) => (
                                        <Scatter
                                            key={clusterName}
                                            name={clusterName}
                                            data={groupedData[clusterName]}
                                            fill={getColor(clusterName)}
                                        />
                                    ))}
                                </ScatterChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}
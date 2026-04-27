import { Scale, Info, ShieldAlert, BadgeCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function Q5_Fairness({ result }: { result: any }) {
    if (!result) return <div className="p-10 text-center">Đang kiểm tra tính công bằng...</div>;

    const data = result.data;
    const anomalies = data.filter((s: any) => s.status !== "Bình thường");

    return (
        <div className="p-8 h-full bg-white overflow-y-auto custom-scrollbar">
            <div className="mb-8">
                <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                    <Scale className="w-7 h-7 text-indigo-600" />
                    Kiểm định Tính công bằng (Fairness Check)
                </h3>
                <p className="text-slate-500">Phân tích sự chênh lệch giữa đánh giá quá trình và kết quả thi thực tế.</p>
            </div>

            {/* BIỂU ĐỒ PHÂN PHỐI ĐỘ LỆCH */}
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-8">
                <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-sm uppercase">
                    <Info className="w-4 h-4" /> Biểu đồ phân phối độ lệch (Process - Final)
                </h4>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" hide />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <ReferenceLine y={0} stroke="#64748b" />
                            <Bar dataKey="gap" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* THỐNG KÊ TỔNG QUAN */}
                <div className="space-y-4">
                    <div className="p-6 bg-indigo-600 text-white rounded-3xl shadow-lg">
                        <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-1">Chênh lệch trung bình</p>
                        <h5 className="text-4xl font-black">{result.stats.mean_gap}đ</h5>
                        <p className="text-xs mt-2 opacity-80 leading-relaxed">
                            Dấu (+) nghĩa là điểm quá trình đang cao hơn điểm thi.
                            Lớp học có xu hướng {result.stats.mean_gap > 0 ? "được ưu ái" : "bị chấm gắt"} ở phần quá trình.
                        </p>
                    </div>

                    <div className="p-6 bg-white border border-slate-200 rounded-3xl flex items-center gap-4">
                        <div className={`p-4 rounded-2xl ${anomalies.length === 0 ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                            {anomalies.length === 0 ? <BadgeCheck className="text-emerald-600" /> : <ShieldAlert className="text-rose-600" />}
                        </div>
                        <div>
                            <p className="font-black text-slate-800 text-lg">{anomalies.length} trường hợp</p>
                            <p className="text-xs text-slate-500">Có độ lệch bất thường (vượt ngưỡng 2σ)</p>
                        </div>
                    </div>
                </div>

                {/* DANH SÁCH BẤT THƯỜNG */}
                <div className="bg-slate-900 text-slate-300 p-6 rounded-3xl shadow-xl">
                    <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-rose-400" />
                        Nhật ký Anomaly
                    </h4>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        {anomalies.length > 0 ? anomalies.map((s: any, idx: number) => (
                            <div key={idx} className="p-3 bg-slate-800 rounded-xl border border-slate-700 flex justify-between items-center">
                                <div>
                                    <p className="text-white font-bold text-sm">{s.name}</p>
                                    <p className="text-[10px] text-slate-500">Chênh lệch: {s.gap}đ</p>
                                </div>
                                <span className={`text-[9px] font-black px-2 py-1 rounded-md ${s.status === "Học tài thi phận" ? "bg-amber-500/20 text-amber-400" : "bg-rose-500/20 text-rose-400"
                                    }`}>
                                    {s.status.toUpperCase()}
                                </span>
                            </div>
                        )) : (
                            <p className="text-center py-10 text-slate-600 italic text-sm">Hệ thống chấm điểm rất đồng nhất.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
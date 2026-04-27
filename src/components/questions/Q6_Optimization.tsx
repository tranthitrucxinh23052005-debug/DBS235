import { useMemo } from 'react';
import { Cpu, Zap, CheckCircle2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#6366f1'];

export default function Q6_Optimization({ result }: { result: any }) {
    // Đã bọc useMemo và ép kiểu Number để tránh lỗi 'unknown'
    const chartData = useMemo(() => {
        if (!result) return [];
        return Object.entries(result).map(([name, value]) => ({
            name,
            value: Number(value)
        }));
    }, [result]);

    if (!result) return <div className="p-10 text-center text-slate-400 font-medium">AI đang tính toán bộ trọng số tối ưu...</div>;

    return (
        <div className="p-8 h-full bg-white flex flex-col items-center justify-center text-center overflow-y-auto custom-scrollbar">
            <div className="max-w-2xl w-full py-10">
                <div className="inline-flex p-4 bg-indigo-100 rounded-full mb-6">
                    <Cpu className="w-10 h-10 text-indigo-600 animate-pulse" />
                </div>

                <h3 className="text-3xl font-black text-slate-800 mb-2">Đề xuất Trọng số từ AI</h3>
                <p className="text-slate-500 mb-10">Thuật toán đã phân tích dữ liệu để tìm ra bộ trọng số công bằng nhất.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    {/* BIỂU ĐỒ TRÒN */}
                    <div className="h-64 relative min-w-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {chartData.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: '20px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                            <Zap className="w-8 h-8 text-amber-500" />
                        </div>
                    </div>

                    {/* DANH SÁCH TRỌNG SỐ */}
                    <div className="space-y-4">
                        {chartData.map((item, idx) => (
                            <div key={item.name} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-hover hover:bg-white hover:shadow-md">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                                    <span className="font-bold text-slate-700">{item.name}</span>
                                </div>
                                <span className="text-xl font-black text-slate-900">{item.value}%</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-12 p-6 bg-emerald-50 rounded-3xl border border-emerald-100 flex items-start gap-4 text-left">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-1" />
                    <div>
                        <h5 className="font-bold text-emerald-900 uppercase text-xs tracking-widest mb-1">Kết luận từ mô hình</h5>
                        <p className="text-sm text-emerald-800 leading-relaxed opacity-90">
                            Bộ trọng số này giúp tối ưu hóa mối tương quan giữa điểm thành phần và điểm cuối kỳ.
                            Sử dụng bộ trọng số này sẽ phản ánh chính xác hơn năng lực thực tế của người học.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
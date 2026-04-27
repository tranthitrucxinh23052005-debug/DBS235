import { AlertTriangle, CheckCircle2, Info, UserX } from 'lucide-react';

export default function Q4_EarlyWarning({ result }: { result: any[] }) {
    if (!result) return <div className="p-10 text-center">Đang tính toán rủi ro...</div>;

    const dangerList = result.filter(s => s.risk === "Nguy hiểm");
    const warningList = result.filter(s => s.risk === "Cảnh báo");

    return (
        <div className="p-8 h-full bg-slate-50 overflow-y-auto custom-scrollbar">
            <div className="mb-8">
                <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                    <AlertTriangle className="w-7 h-7 text-rose-500" />
                    Hệ thống Cảnh báo sớm (Early Warning)
                </h3>
                <p className="text-slate-500">Dựa trên điểm quá trình hiện tại để dự báo nguy cơ rớt môn.</p>
            </div>

            {/* TỔNG QUAN RỦI RO */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-3xl border-b-4 border-rose-500 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-bold text-slate-400 uppercase">Nguy hiểm</span>
                        <UserX className="w-5 h-5 text-rose-500" />
                    </div>
                    <div className="text-4xl font-black text-rose-600">{dangerList.length}</div>
                    <p className="text-xs text-slate-400 mt-1">Cần {'>'} 7.5đ cuối kỳ</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border-b-4 border-amber-500 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-bold text-slate-400 uppercase">Cảnh báo</span>
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="text-4xl font-black text-amber-600">{warningList.length}</div>
                    <p className="text-xs text-slate-400 mt-1">Cần {'>'} 5.5đ cuối kỳ</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border-b-4 border-emerald-500 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-bold text-slate-400 uppercase">An toàn</span>
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div className="text-4xl font-black text-emerald-600">{result.length - dangerList.length - warningList.length}</div>
                    <p className="text-xs text-slate-400 mt-1">Xác suất đậu cao</p>
                </div>
            </div>

            {/* DANH SÁCH CHI TIẾT */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 bg-slate-50 border-b border-slate-200 font-bold text-slate-700 flex items-center gap-2">
                    <Info className="w-4 h-4 text-indigo-500" />
                    Chi tiết sinh viên cần lưu ý
                </div>
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-xs font-bold text-slate-400 uppercase bg-slate-50/50">
                            <th className="p-4">Sinh viên</th>
                            <th className="p-4">Điểm tích lũy (50%)</th>
                            <th className="p-4">Điểm cần thi để đậu</th>
                            <th className="p-4">Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {result.filter(s => s.risk !== "An toàn").map((s, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4">
                                    <div className="font-bold text-slate-700">{s.name}</div>
                                    <div className="text-[10px] text-slate-400">{s.mssv}</div>
                                </td>
                                <td className="p-4 font-mono text-slate-600">{s.accumulated} / 5.0</td>
                                <td className="p-4 font-black text-indigo-600">{s.needed}</td>
                                <td className="p-4">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${s.risk === "Nguy hiểm" ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
                                        }`}>
                                        {s.risk}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
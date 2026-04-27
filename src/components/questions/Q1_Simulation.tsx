import { useState, useMemo } from 'react';
import { useAppData } from '../../hooks/useAppData';
import { ArrowUp, ArrowDown, Minus, Calculator, Settings2 } from 'lucide-react';

export default function Q1_Simulation() {
    const { activeData } = useAppData();

    // State lưu trữ trọng số do user tùy chỉnh
    const [wCC, setWCC] = useState(10);
    const [wGK, setWGK] = useState(20);
    const [wNH, setWNH] = useState(20);
    const [wCK, setWCK] = useState(50);
    const [ignoreGroup, setIgnoreGroup] = useState(false);

    // Core Logic: Tính toán điểm & Rank real-time
    const results = useMemo(() => {
        // 1. Tính điểm và Rank GỐC (chuẩn 10-20-20-50)
        const originalScores = activeData.map(student => {
            const cc = Number(student.DIEM_CHUYEN_CAN) || 0;
            const gk = Number(student.DIEM_GIUA_KY) || 0;
            const nh = Number(student.DIEM_NHOM) || 0;
            const ck = Number(student.DIEM_CUOI_KY) || 0;
            const origScore = (cc * 10 + gk * 20 + nh * 20 + ck * 50) / 100;
            return { ...student, origScore };
        }).sort((a, b) => b.origScore - a.origScore)
            .map((s, idx) => ({ ...s, origRank: idx + 1 }));

        // 2. Tính điểm và Rank MÔ PHỎNG (theo thanh trượt)
        const effectiveWNH = ignoreGroup ? 0 : wNH;
        const totalWeight = wCC + wGK + effectiveWNH + wCK;

        const simulatedScores = originalScores.map(student => {
            const cc = Number(student.DIEM_CHUYEN_CAN) || 0;
            const gk = Number(student.DIEM_GIUA_KY) || 0;
            const nh = Number(student.DIEM_NHOM) || 0;
            const ck = Number(student.DIEM_CUOI_KY) || 0;

            const simScore = totalWeight === 0 ? 0 :
                (cc * wCC + gk * wGK + nh * effectiveWNH + ck * wCK) / totalWeight;

            return { ...student, simScore };
        }).sort((a, b) => b.simScore - a.simScore)
            .map((s, idx) => ({ ...s, simRank: idx + 1 }));

        // 3. Sắp xếp lại theo Rank gốc để hiển thị
        return simulatedScores.sort((a, b) => a.origRank - b.origRank);
    }, [activeData, wCC, wGK, wNH, wCK, ignoreGroup]);

    // Thống kê sự thay đổi
    const changedCount = results.filter(r => r.origRank !== r.simRank).length;

    return (
        <div className="flex h-full bg-slate-50/50">
            {/* TRÁI: BẢNG ĐIỀU KHIỂN TRỌNG SỐ */}
            <div className="w-1/3 p-6 border-r border-slate-200 bg-white overflow-y-auto custom-scrollbar">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6">
                    <Settings2 className="w-5 h-5 text-indigo-600" />
                    Điều chỉnh Trọng số
                </h3>

                <div className="space-y-6">
                    <div className="flex items-center justify-between p-3 bg-rose-50 rounded-xl border border-rose-100">
                        <span className="text-sm font-bold text-rose-800">Bỏ qua Điểm Nhóm</span>
                        <input
                            type="checkbox"
                            checked={ignoreGroup}
                            onChange={(e) => setIgnoreGroup(e.target.checked)}
                            className="w-5 h-5 accent-rose-600 rounded cursor-pointer"
                        />
                    </div>

                    {[
                        { label: 'Chuyên cần', val: wCC, set: setWCC, color: 'text-emerald-600' },
                        { label: 'Giữa kỳ', val: wGK, set: setWGK, color: 'text-blue-600' },
                        { label: 'Bài tập nhóm', val: wNH, set: setWNH, color: 'text-amber-600', disabled: ignoreGroup },
                        { label: 'Cuối kỳ', val: wCK, set: setWCK, color: 'text-indigo-600' },
                    ].map(item => (
                        <div key={item.label} className={`space-y-2 ${item.disabled ? 'opacity-40 pointer-events-none' : ''}`}>
                            <div className="flex justify-between items-end">
                                <span className="text-sm font-bold text-slate-700">{item.label}</span>
                                <span className={`text-lg font-black ${item.color}`}>{item.disabled ? 0 : item.val}</span>
                            </div>
                            <input
                                type="range" min="0" max="100" step="5"
                                value={item.val}
                                onChange={(e) => item.set(Number(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    ))}

                    <div className="mt-8 p-4 bg-slate-100 rounded-xl text-xs text-slate-500 font-medium">
                        <Calculator className="w-4 h-4 mb-2 inline-block text-slate-600" /> <br />
                        Tổng trọng số không cần bằng 100, hệ thống sẽ tự động chuẩn hóa tỷ lệ (Normalization).
                    </div>
                </div>
            </div>

            {/* PHẢI: BẢNG KẾT QUẢ XẾP HẠNG */}
            <div className="w-2/3 p-6 flex flex-col h-full">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800 text-lg">Bảng Xếp Hạng Mô Phỏng</h3>
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 font-bold text-sm rounded-full">
                        Biến động: {changedCount} / {results.length} SV
                    </span>
                </div>

                <div className="flex-1 overflow-auto border border-slate-200 rounded-2xl bg-white shadow-sm custom-scrollbar">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="p-4 font-bold text-slate-600 border-b">Họ Tên</th>
                                <th className="p-4 font-bold text-slate-600 border-b text-center">Đ.Gốc</th>
                                <th className="p-4 font-bold text-slate-600 border-b text-center">Đ.Mô phỏng</th>
                                <th className="p-4 font-bold text-slate-600 border-b text-center">Hạng Gốc</th>
                                <th className="p-4 font-bold text-indigo-600 border-b text-center">Hạng Mới</th>
                                <th className="p-4 font-bold text-slate-600 border-b text-center">Biến động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {results.map((r, i) => {
                                const rankDiff = r.origRank - r.simRank; // Dương là tăng hạng (số nhỏ hơn), Âm là giảm hạng

                                return (
                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 font-medium text-slate-700">{r.HO_TEN}</td>
                                        <td className="p-4 text-center text-slate-500">{r.origScore.toFixed(2)}</td>
                                        <td className="p-4 text-center font-bold text-indigo-600">{r.simScore.toFixed(2)}</td>
                                        <td className="p-4 text-center text-slate-500">#{r.origRank}</td>
                                        <td className="p-4 text-center font-black text-slate-800">#{r.simRank}</td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-center gap-1 font-bold">
                                                {rankDiff > 0 ? (
                                                    <><ArrowUp className="w-4 h-4 text-emerald-500" /> <span className="text-emerald-500">+{rankDiff}</span></>
                                                ) : rankDiff < 0 ? (
                                                    <><ArrowDown className="w-4 h-4 text-rose-500" /> <span className="text-rose-500">{rankDiff}</span></>
                                                ) : (
                                                    <><Minus className="w-4 h-4 text-slate-300" /> <span className="text-slate-400">0</span></>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
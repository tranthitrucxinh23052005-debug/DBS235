import { useMemo } from 'react';
import { Info, ArrowRightLeft } from 'lucide-react';

export default function Q3_Correlation({ result }: { result: any }) {
    const columns = useMemo(() => result ? Object.keys(result) : [], [result]);

    const getBgColor = (val: number) => {
        if (val === 1) return 'bg-slate-100 text-slate-400'; // Đường chéo chính
        if (val > 0.5) return 'bg-emerald-500 text-white';   // Tương quan thuận mạnh
        if (val > 0.2) return 'bg-emerald-200 text-emerald-900';
        if (val < -0.5) return 'bg-rose-500 text-white';    // Tương quan nghịch mạnh
        if (val < -0.2) return 'bg-rose-200 text-rose-900';
        return 'bg-slate-50 text-slate-600';                // Tương quan yếu
    };

    if (!result) return <div className="p-10 text-center text-slate-400">Đang tải dữ liệu phân tích...</div>;

    return (
        <div className="p-8 h-full flex flex-col gap-8 bg-white">
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        <ArrowRightLeft className="w-6 h-6 text-indigo-600" />
                        Phân tích Mối liên hệ (Correlation)
                    </h3>
                    <p className="text-slate-500 mt-1">Khám phá xem các thành phần điểm có ảnh hưởng lẫn nhau không.</p>
                </div>
            </div>

            {/* HEATMAP GRID - ĐÃ FIX LỆCH PHẢI */}
            <div className="flex justify-center">
                <div className="inline-block border border-slate-200 rounded-3xl p-8 shadow-sm bg-slate-50/50">
                    <table className="border-separate border-spacing-3">
                        <thead>
                            <tr>
                                {/* Cột trống đầu tiên: Cho nó một độ rộng cố định để không đẩy bảng */}
                                <th className="w-32"></th>
                                {columns.map(col => (
                                    <th key={col} className="p-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-24">
                                        {col.replace('DIEM_', '').replace('_', ' ')}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {columns.map(rowCol => (
                                <tr key={rowCol}>
                                    <td className="p-2 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right pr-6 whitespace-nowrap">
                                        {rowCol.replace('DIEM_', '').replace('_', ' ')}
                                    </td>
                                    {columns.map(colCol => {
                                        const val = result[rowCol][colCol];
                                        return (
                                            <td
                                                key={colCol}
                                                className={`w-24 h-16 rounded-2xl text-center font-black text-base transition-all hover:scale-110 cursor-default shadow-sm border-2 border-white ${getBgColor(val)}`}
                                            >
                                                {val}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* INSIGHTS BOX */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 bg-indigo-50 rounded-3xl border border-indigo-100">
                    <h4 className="font-bold text-indigo-900 flex items-center gap-2 mb-2">
                        <Info className="w-4 h-4" /> Giải thích chỉ số
                    </h4>
                    <ul className="text-xs text-indigo-800 space-y-2 opacity-80">
                        <li>• <strong>Sát 1.0:</strong> Học giỏi đều, cột này cao thì cột kia cũng cao.</li>
                        <li>• <strong>Sát -1.0:</strong> Có sự bù trừ, ví dụ "học tài thi phận" (quá trình tốt nhưng thi kém).</li>
                        <li>• <strong>Gần 0:</strong> Các cột điểm không liên quan gì đến nhau.</li>
                    </ul>
                </div>

                <div className="p-5 bg-amber-50 rounded-3xl border border-amber-100">
                    <h4 className="font-bold text-amber-900 mb-2 italic">Gợi ý Insight:</h4>
                    <p className="text-xs text-amber-800 leading-relaxed">
                        Nếu tương quan giữa <strong>Điểm Nhóm</strong> và <strong>Cuối Kỳ</strong> thấp (dưới 0.3), có thể sinh viên đang phụ thuộc vào nhóm mà chưa nắm vững kiến thức cá nhân.
                    </p>
                </div>
            </div>
        </div>
    );
}
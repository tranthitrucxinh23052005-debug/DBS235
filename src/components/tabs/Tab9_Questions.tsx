"use client"

import { useState } from 'react';
import { useQuestionOrchestrator, QuestionId } from '../../hooks/useQuestionOrchestrator';
import { MessageSquare, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { useAppData } from '../../hooks/useAppData';
import Q1_Simulation from '../questions/Q1_Simulation';
import Q2_Clustering from '../questions/Q2_Clustering';
import Q3_Correlation from '../questions/Q3_Correlation';
import Q4_EarlyWarning from '../questions/Q4_EarlyWarning';
import Q5_Fairness from '../questions/Q5_Fairness';


// === IMPORT CÁC COMPONENT CÂU HỎI Ở ĐÂY (Sẽ tạo ở các Phase sau) ===
// const Q1_Simulation = () => <div>Nội dung Câu hỏi 1</div>;

export default function Tab9_Questions() {
    const { QUESTIONS, runQuestion, loading, error } = useQuestionOrchestrator();
    const { activeData } = useAppData();

    const [selectedQ, setSelectedQ] = useState<QuestionId | null>(null);
    const [qResult, setQResult] = useState<any>(null);

    // Xử lý khi user click vào một câu hỏi ở Sidebar
    const handleSelectQuestion = async (qId: QuestionId) => {
        setSelectedQ(qId);
        setQResult(null); // Reset kết quả cũ

        // Gọi hàm chạy câu hỏi từ Orchestrator
        const result = await runQuestion(qId);
        if (result) {
            setQResult(result);
        }
    };
    const handleRunQuestionParams = async (params: any) => {
        if (!selectedQ) return;
        const res = await runQuestion(selectedQ, params);
        if (res) setQResult(res);
    };

    // Hàm render Component động dựa trên câu hỏi được chọn
    const renderQuestionContent = () => {
        if (loading) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-indigo-600 space-y-4">
                    <Loader2 className="w-12 h-12 animate-spin" />
                    <p className="font-medium animate-pulse">Đang phân tích dữ liệu chuyên sâu...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-rose-500 space-y-4">
                    <AlertCircle className="w-12 h-12" />
                    <p className="font-bold">{error}</p>
                </div>
            );
        }

        if (!selectedQ) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                    <MessageSquare className="w-16 h-16 opacity-20" />
                    <p className="text-lg font-medium">Chọn một câu hỏi bên trái để bắt đầu phân tích</p>
                    <p className="text-sm">Hệ thống đang sẵn sàng xử lý {activeData.length} bản ghi.</p>
                </div>
            );
        }

        // === ROUTER ĐỘNG ĐỂ RENDER COMPONENT TƯƠNG ỨNG ===
        switch (selectedQ) {
            case 'q1':
                return <Q1_Simulation />;
            case 'q2':
                return <Q2_Clustering result={qResult} onRun={handleRunQuestionParams} />;
            case 'q3':
                return <Q3_Correlation result={qResult} />;
            case 'q4':
                return <Q4_EarlyWarning result={qResult} />;
            case 'q5':
                return <Q5_Fairness result={qResult} />;
            default:
                return <div className="p-6 text-slate-500">Component cho câu hỏi này đang được xây dựng...</div>;
        }
    };

    return (
        <div className="h-[800px] flex gap-6 animate-in fade-in duration-500">

            {/* SIDEBAR - DANH SÁCH CÂU HỎI */}
            <div className="w-1/3 flex flex-col gap-3">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-2">
                    <h3 className="font-black text-slate-800 text-lg uppercase flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-indigo-600" />
                        Hệ thống Hỏi - Đáp
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Khám phá insight từ dữ liệu</p>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                    {QUESTIONS.map((q) => (
                        <button
                            key={q.id}
                            onClick={() => handleSelectQuestion(q.id as QuestionId)}
                            className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 group ${selectedQ === q.id
                                ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500/20 shadow-sm'
                                : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-black px-2 py-1 bg-slate-100 text-slate-600 rounded-md">
                                    Câu hỏi {q.id.replace('q', '')}
                                </span>
                                <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${selectedQ === q.id ? 'text-indigo-600 translate-x-1' : 'text-slate-400 group-hover:text-indigo-500'}`} />
                            </div>
                            <h4 className={`font-bold text-sm mb-1 line-clamp-2 ${selectedQ === q.id ? 'text-indigo-900' : 'text-slate-800'}`}>
                                {q.title}
                            </h4>
                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                {q.description}
                            </p>
                        </button>
                    ))}
                </div>
            </div>

            {/* MAIN PANEL - HIỂN THỊ KẾT QUẢ */}
            <div className="w-2/3 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                {renderQuestionContent()}
            </div>

        </div>
    );
}
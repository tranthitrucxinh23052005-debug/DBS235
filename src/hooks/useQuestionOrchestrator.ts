import { useState, useCallback } from 'react';
import { useAppData } from './useAppData';

// 1. Cập nhật Type: Chỉ còn từ q1 đến q5
export type QuestionId = 'q1' | 'q2' | 'q3' | 'q4' | 'q5';

export const QUESTIONS = [
    { id: 'q1', title: 'Điểm cuối kỳ có phản ánh năng lực không?', description: 'Mô phỏng thay đổi trọng số và điểm thành phần để xem thứ hạng thay đổi ra sao.' },
    { id: 'q2', title: 'Có các kiểu sinh viên khác nhau không?', description: 'Phân cụm sinh viên dựa trên điểm Giữa kỳ và Cuối kỳ.' },
    { id: 'q3', title: 'Có tồn tại sự bù trừ điểm không?', description: 'Phân tích mối tương quan giữa các cột điểm.' },
    { id: 'q4', title: 'Ai có nguy cơ điểm thấp?', description: 'Dự báo sinh viên có khả năng rớt môn dựa trên điểm quá trình.' },
    { id: 'q5', title: 'Hệ thống chấm điểm có công bằng không?', description: 'Phân rã điểm số và tìm kiếm các yếu tố bất thường.' },
];

export function useQuestionOrchestrator() {
    const { activeData, rawFile } = useAppData();
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // === CÁC HÀM XỬ LÝ CHO TỪNG CÂU HỎI ===

    const runScoreSimulation = async (data: any[], params: any) => {
        console.log("Running Q1: Simulation with params", params);
        return { mockResult: "Q1 Result Data" };
    };

    const runClustering = async (data: any[], params: any) => {
        if (!rawFile) {
            throw new Error("Không tìm thấy file dữ liệu gốc. Vui lòng quay lại Tab 1 để tải file.");
        }
        const k = params?.k || 3;
        const formData = new FormData();
        formData.append('file', rawFile);
        formData.append('k', k.toString());
        formData.append('kmeans_cols', 'DIEM_GIUA_KY,DIEM_CUOI_KY');

        const response = await fetch('https://tieuthetunhacongdang-tx-data-analytics-api.hf.space/api/kmeans-pipeline', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error("Lỗi kết nối đến Server AI Hugging Face.");
        const resData = await response.json();
        if (resData.status !== "success") throw new Error(resData.message);
        return resData;
    };

    const runTradeoff = async (data: any[]) => {
        if (!rawFile) throw new Error("Vui lòng tải lại file ở Tab 1.");
        const formData = new FormData();
        formData.append('file', rawFile);
        const response = await fetch('https://tieuthetunhacongdang-tx-data-analytics-api.hf.space/api/correlation', {
            method: 'POST',
            body: formData
        });
        const resData = await response.json();
        if (resData.status !== "success") throw new Error(resData.message);
        return resData.matrix;
    };

    const runPrediction = async (data: any[]) => {
        if (!rawFile) throw new Error("Vui lòng tải lại file ở Tab 1.");
        const formData = new FormData();
        formData.append('file', rawFile);
        const response = await fetch('https://tieuthetunhacongdang-tx-data-analytics-api.hf.space/api/early-warning', {
            method: 'POST',
            body: formData
        });
        const resData = await response.json();
        if (resData.status !== "success") throw new Error(resData.message);
        return resData.data;
    };

    const runFairness = async (data: any[]) => {
        if (!rawFile) throw new Error("Vui lòng tải lại file ở Tab 1.");
        const formData = new FormData();
        formData.append('file', rawFile);
        const response = await fetch('https://tieuthetunhacongdang-tx-data-analytics-api.hf.space/api/fairness', {
            method: 'POST',
            body: formData
        });
        const resData = await response.json();
        if (resData.status !== "success") throw new Error(resData.message);
        return resData;
    };

    // === MAPPING BẢN ĐỒ CÂU HỎI (Đã xóa runOptimization) ===
    const questionMap: Record<QuestionId, (data: any[], params: any) => Promise<any>> = {
        'q1': runScoreSimulation,
        'q2': runClustering,
        'q3': runTradeoff,
        'q4': runPrediction,
        'q5': runFairness
    };

    // === HÀM ĐIỀU PHỐI CHÍNH ===
    const runQuestion = useCallback(async (questionId: QuestionId, params: any = {}) => {
        if (!activeData || activeData.length === 0) {
            setError("Dữ liệu đang trống. Vui lòng tải dữ liệu.");
            return null;
        }

        setLoading(true);
        setError(null);
        try {
            const handler = questionMap[questionId];
            if (!handler) throw new Error("Câu hỏi chưa được hỗ trợ.");
            const result = await handler(activeData, params);
            return result;
        } catch (err: any) {
            setError(err.message || "Đã xảy ra lỗi khi chạy phân tích.");
            return null;
        } finally {
            setLoading(false);
        }
    }, [activeData]);

    return {
        runQuestion,
        loading,
        error,
        QUESTIONS
    };
}
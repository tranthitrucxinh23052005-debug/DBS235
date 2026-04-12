import { useState, useRef } from 'react';
import { FileText, Sparkles, Download, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useLang } from '../../hooks/useLanguage';
import { useAppData } from '../../hooks/useAppData';
import { computeStats } from '../../lib/dataUtils';
import { apiAiSummary, apiFinalSummary } from '../../lib/api'; // Đã thêm apiFinalSummary
import html2canvas from "html2canvas";

export default function Tab7_Summary() {
  const { t } = useLang();
  const { data, rawFile, aiReport, modelMetrics, modelType, clusterResult } = useAppData();

  const [summaryText, setSummaryText] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const stats = data.length > 0 ? computeStats(data) : null;

  // HÀM TỔNG HỢP SIÊU AI - KẾT NỐI 6 TAB
  const handleFullProcessSummary = async () => {
    setLoading(true);
    setSummaryText('');
    try {
      let finalContent = "";

      // 1. Lấy báo cáo chi tiết từ Tab 3 (Dữ liệu thô)
      if (rawFile) {
        const resDetail = await apiAiSummary(rawFile);
        finalContent += resDetail.ai_report || "";
      }

      // 2. Xây dựng ngữ cảnh từ các Tab thống kê và ML
      const clusterCount = clusterResult ? [...new Set(clusterResult.scatter_data.map(p => p.cluster))].length : 0;
      
      const context = `
        === THÔNG SỐ KỸ THUẬT TỪ HỆ THỐNG ===
        - Thống kê: Tổng ${stats?.total} SV, Trung bình ${stats?.avg10}, Tỷ lệ đạt ${stats?.passRate}%.
        - Machine Learning: Mô hình ${modelType === 'rf' ? 'Random Forest' : 'Hồi quy'} đạt R²=${modelMetrics?.r2 || 'N/A'}.
        - Phân cụm: Đã chia dữ liệu thành ${clusterCount} nhóm sinh viên riêng biệt.
        - AI Insight trước đó: ${aiReport?.substring(0, 300)}...
      `;

      // 3. Gọi AI viết lời kết tổng hợp (Tab 7 chuyên biệt)
      const formData = new FormData();
      formData.append('context', context);
      const resFinal = await apiFinalSummary(formData);

      // 4. Gộp tất cả lại thành một báo cáo hoàn chỉnh
      const localStats = buildLocalSummary();
      setSummaryText(`${localStats}\n\n${finalContent}\n\n=== LỜI KẾT TỪ TRÍ TUỆ NHÂN TẠO ===\n\n${resFinal.final_conclusion || ""}`);
      
    } catch (err) {
      console.error(err);
      setSummaryText(buildLocalSummary() + "\n\n(Lưu ý: Không thể kết nối AI để lấy lời kết chi tiết)");
    } finally {
      setLoading(false);
    }
  };

  function buildLocalSummary(): string {
    const lines: string[] = [];
    lines.push(`=== BÁO CÁO TỔNG HỢP PHÂN TÍCH DỮ LIỆU ===`);
    lines.push(`Ngày xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')}`);
    lines.push(`Đơn vị: Khoa Khoa học Dữ liệu (DS Faculty)`);
    lines.push('');

    if (stats) {
      lines.push('--- THỐNG KÊ TỔNG QUAN ---');
      lines.push(`• Tổng số sinh viên ghi nhận: ${stats.total}`);
      lines.push(`• Điểm trung bình (Cuối kỳ): ${stats.avg10}`);
      lines.push(`• Tỷ lệ sinh viên đạt (>= 5.0): ${stats.passRate}%`);
      lines.push('');
    }

    if (modelMetrics) {
      lines.push('--- KẾT QUẢ MÔ HÌNH DỰ BÁO ---');
      lines.push(`• Thuật toán: ${modelType === 'rf' ? 'Random Forest' : 'Hồi quy'}`);
      lines.push(`• Độ chính xác (R²): ${modelMetrics.r2.toFixed(3)}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  // Nhớ cài và import cái này trên đầu file nha: 
// import html2canvas from "html2canvas";
// import { jsPDF } from "jspdf";

const handleExportPDF = async () => {
  const reportElement = document.getElementById('report-content'); // Đặt id này cho cái thẻ <div> bọc toàn bộ báo cáo của bà
  if (!reportElement) return;

  try {
    // 1. Chụp ảnh toàn bộ báo cáo với độ nét cao (scale 2)
    const canvas = await html2canvas(reportElement, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');

    // 2. Nhét ảnh vào PDF khổ A4
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Bao_Cao_DSB_HUB_${new Date().getTime()}.pdf`);
  } catch (error) {
    console.error("Lỗi xuất PDF:", error);
  }
};

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <FileText className="w-12 h-12 mb-3 opacity-30" />
        <p>Vui lòng tải dữ liệu lên trước</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatusCard title="Trạng thái Dữ liệu" desc={stats ? `${stats.total} sinh viên` : 'Chờ...'} active={!!stats} />
        <StatusCard title="Trí tuệ nhân tạo" desc={aiReport ? 'Đã có phân tích' : 'Chưa chạy'} active={!!aiReport} />
        <StatusCard title="Mô hình dự báo" desc={modelMetrics ? `R² = ${modelMetrics.r2.toFixed(2)}` : 'Chưa có'} active={!!modelMetrics} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-lg">Tổng hợp báo cáo toàn hệ thống</h3>
              <p className="text-xs text-gray-500">AI sẽ tóm tắt kết quả từ 6 Tab: Dữ liệu, Thống kê, AI Insight, Tương quan, Tùy chỉnh và ML</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleFullProcessSummary}
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-100"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loading ? 'Đang tổng hợp...' : 'Tổng hợp 6 Tab'}
            </button>
            
            {summaryText && (
              <button
                onClick={handleExportPDF}
                disabled={exporting}
                className="flex items-center gap-2 bg-slate-800 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-900 disabled:opacity-50 transition-all"
              >
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Tải PDF
              </button>
            )}
          </div>
        </div>

        {summaryText ? (
          <div ref={reportRef} className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-sm text-slate-700 leading-relaxed whitespace-pre-line font-mono shadow-inner max-h-[600px] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-300">
            {summaryText}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <AlertCircle className="w-10 h-10 text-slate-300 mb-3" />
            <p className="text-slate-500 text-sm font-medium">Nhấn nút "Tổng hợp 6 Tab" để AI tạo báo cáo chiến lược cuối cùng.</p>
          </div>
        )}
      </div>

      {stats && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
            <span className="w-1 h-5 bg-blue-600 rounded-full" />
            Thông số cốt lõi
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <StatItem label="Quy mô" value={`${stats.total} SV`} color="text-blue-600" bg="bg-blue-50" />
            <StatItem label="Điểm TB" value={stats.avg10} color="text-emerald-600" bg="bg-emerald-50" />
            <StatItem label="Hệ 4" value={stats.avg4} color="text-amber-600" bg="bg-amber-50" />
            <StatItem label="Tỷ lệ đạt" value={`${stats.passRate}%`} color={stats.passRate >= 70 ? "text-emerald-600" : "text-red-600"} bg={stats.passRate >= 70 ? "bg-emerald-50" : "bg-red-50"} />
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-components
function StatusCard({ title, desc, active }: { title: string; desc: string; active: boolean }) {
  return (
    <div className={`rounded-2xl p-4 border flex items-center gap-3 transition-all ${active ? 'bg-white border-emerald-100 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
        <CheckCircle2 className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{title}</p>
        <p className={`font-bold text-sm ${active ? 'text-slate-700' : 'text-slate-400'}`}>{desc}</p>
      </div>
    </div>
  );
}

function StatItem({ label, value, color, bg }: { label: string; value: string | number; color: string; bg: string }) {
  return (
    <div className={`${bg} rounded-2xl p-5 border border-transparent hover:border-white transition-all`}>
      <p className="text-xs font-semibold text-slate-500 mb-1">{label}</p>
      <p className={`text-3xl font-black ${color}`}>{value}</p>
    </div>
  );
}
import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, FileSpreadsheet, AlertTriangle, CheckCircle2, Search, Filter, ChevronLeft, ChevronRight, Download, Lock, X, Database } from 'lucide-react';
import { useLang } from '../../hooks/useLanguage';
import { useAppData } from '../../hooks/useAppData';
import { parseFile, hasMissingRequiredData } from '../../lib/dataUtils';
import * as XLSX from 'xlsx';

// Cập nhật cấu trúc cột mới
const REQUIRED_COLS = ['MSSV', 'HO_TEN', 'LOP', 'MON_HOC', 'DIEM_CHUYEN_CAN', 'DIEM_GIUA_KY', 'DIEM_NHOM', 'DIEM_CUOI_KY'];
const PAGE_SIZE = 15;

export default function Tab1_Data() {
  const { t } = useLang();
  const { data, setData, setRawFile } = useAppData();

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missingCols, setMissingCols] = useState<string[]>([]);
  const [missingDataDetails, setMissingDataDetails] = useState<Record<string, number>>({});
  const [uploadOk, setUploadOk] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [page, setPage] = useState(1);

  const inputRef = useRef<HTMLInputElement>(null);

  // Lấy danh sách Lớp và Môn học duy nhất để làm bộ lọc
  const classes = [...new Set(data.map(r => String(r.LOP ?? '')).filter(Boolean))].sort();
  const subjects = [...new Set(data.map(r => String(r.MON_HOC ?? '')).filter(Boolean))].sort();

  const filtered = data.filter(row => {
    const s = search.toLowerCase();
    const matchSearch = !search || [row.MSSV, row.HO_TEN, row.LOP, row.MON_HOC].some(v => String(v ?? '').toLowerCase().includes(s));
    const matchClass = !filterClass || String(row.LOP) === filterClass;
    const matchSubject = !filterSubject || String(row.MON_HOC) === filterSubject;
    return matchSearch && matchClass && matchSubject;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const processFile = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);
    setMissingCols([]);
    setMissingDataDetails({});
    setUploadOk(false);
    setUploadedFile(file);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['csv', 'xlsx', 'xls'].includes(ext ?? '')) {
        setError(t('invalidFormat'));
        setUploadedFile(null);
        return;
      }

      const { data: parsed, missingCols: mc } = await parseFile(file);

      // Kiểm tra cột thiếu dựa trên REQUIRED_COLS mới
      const currentCols = parsed.length > 0 ? Object.keys(parsed[0]) : [];
      const missing = REQUIRED_COLS.filter(c => !currentCols.includes(c));

      if (missing.length > 0) {
        setMissingCols(missing);
        setError(t('missingColumns'));
        setUploadedFile(null);
        return;
      }

      const { hasMissing, details } = hasMissingRequiredData(parsed);
      if (hasMissing) {
        setMissingDataDetails(details);
        setError(t('missingData'));
        setUploadedFile(null);
        return;
      }

      setData(parsed);
      setRawFile(file);
      setUploadOk(true);
      setPage(1);
    } catch (err) {
      setError(err instanceof Error && err.message === 'INVALID_FORMAT' ? t('invalidFormat') : t('uploadError'));
      setUploadedFile(null);
    } finally {
      setUploading(false);
    }
  }, [t, setData, setRawFile]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const clearFile = () => {
    setUploadedFile(null);
    setData([]);
    setUploadOk(false);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const downloadTemplate = (format: 'csv' | 'xlsx') => {
    // 45 dòng dữ liệu mẫu đã được thêm vào đây
    const templateData = [
      ['MSSV', 'HO_TEN', 'LOP', 'MON_HOC', 'DIEM_CHUYEN_CAN', 'DIEM_GIUA_KY', 'DIEM_NHOM', 'DIEM_CUOI_KY'],
      ['SV001', 'Nguyen Van A', 'DS21A', 'Toan cao cap', 10, 9.5, 8.0, 8.5],
      ['SV002', 'Tran Thi B', 'DS21A', 'Toan cao cap', 9, 8.0, 8.5, 7.5],
      ['SV003', 'Le Van C', 'DS21A', 'Toan cao cap', 10, 7.5, 9.0, 8.0],
      ['SV004', 'Pham Thi D', 'DS21A', 'Toan cao cap', 8, 8.5, 7.5, 9.0],
      ['SV005', 'Hoang Van E', 'DS21A', 'Toan cao cap', 10, 9.0, 8.0, 8.5],
      ['SV006', 'Vo Thi F', 'DS21B', 'Lap trinh Python', 9, 8.5, 9.0, 8.5],
      ['SV007', 'Dang Van G', 'DS21B', 'Lap trinh Python', 10, 7.0, 8.5, 7.5],
      ['SV008', 'Bui Thi H', 'DS21B', 'Lap trinh Python', 10, 9.5, 9.5, 9.0],
      ['SV009', 'Do Van I', 'DS21B', 'Lap trinh Python', 8, 6.5, 7.0, 6.5],
      ['SV010', 'Ngo Thi K', 'DS21B', 'Lap trinh Python', 9, 8.0, 8.0, 8.0],
      ['SV011', 'Nguyen Hai L', 'DS22A', 'Co so du lieu', 10, 9.0, 8.5, 9.5],
      ['SV012', 'Tran Van M', 'DS22A', 'Co so du lieu', 10, 8.5, 8.0, 8.5],
      ['SV013', 'Le Thi N', 'DS22A', 'Co so du lieu', 9, 7.5, 8.5, 7.0],
      ['SV014', 'Pham Van P', 'DS22A', 'Co so du lieu', 10, 9.5, 9.0, 9.5],
      ['SV015', 'Hoang Thi Q', 'DS22A', 'Co so du lieu', 8, 6.0, 7.5, 6.5],
      ['SV016', 'Vo Van R', 'DS22B', 'Xac suat thong ke', 9, 8.5, 8.0, 8.0],
      ['SV017', 'Dang Thi S', 'DS22B', 'Xac suat thong ke', 10, 9.0, 9.5, 9.0],
      ['SV018', 'Bui Van T', 'DS22B', 'Xac suat thong ke', 10, 7.5, 8.0, 7.5],
      ['SV019', 'Do Thi U', 'DS22B', 'Xac suat thong ke', 9, 8.0, 8.5, 8.5],
      ['SV020', 'Ngo Van V', 'DS22B', 'Xac suat thong ke', 8, 7.0, 7.5, 7.0],
      ['SV021', 'Nguyen Thi X', 'DS21A', 'Hoc may', 10, 9.5, 9.0, 9.5],
      ['SV022', 'Tran Van Y', 'DS21A', 'Hoc may', 10, 8.5, 8.5, 8.0],
      ['SV023', 'Le Thi Z', 'DS21A', 'Hoc may', 9, 8.0, 9.0, 8.5],
      ['SV024', 'Pham Van W', 'DS21A', 'Hoc may', 8, 6.5, 7.0, 6.0],
      ['SV025', 'Hoang Thi K', 'DS21A', 'Hoc may', 10, 9.0, 8.5, 9.0],
      ['SV026', 'Vo Van M', 'DS21B', 'Toan cao cap', 10, 8.5, 8.0, 8.5],
      ['SV027', 'Dang Thi N', 'DS21B', 'Toan cao cap', 9, 7.5, 8.5, 7.0],
      ['SV028', 'Bui Van P', 'DS21B', 'Toan cao cap', 10, 9.5, 9.0, 9.5],
      ['SV029', 'Do Thi Q', 'DS21B', 'Toan cao cap', 8, 6.0, 7.5, 6.5],
      ['SV030', 'Ngo Van R', 'DS21B', 'Toan cao cap', 9, 8.5, 8.0, 8.0],
      ['SV031', 'Nguyen Thi S', 'DS22A', 'Lap trinh Python', 10, 9.0, 9.5, 9.0],
      ['SV032', 'Tran Van T', 'DS22A', 'Lap trinh Python', 10, 7.5, 8.0, 7.5],
      ['SV033', 'Le Thi U', 'DS22A', 'Lap trinh Python', 9, 8.0, 8.5, 8.5],
      ['SV034', 'Pham Van V', 'DS22A', 'Lap trinh Python', 8, 7.0, 7.5, 7.0],
      ['SV035', 'Hoang Thi X', 'DS22A', 'Lap trinh Python', 10, 9.5, 9.0, 9.5],
      ['SV036', 'Vo Van Y', 'DS22B', 'Co so du lieu', 10, 8.5, 8.5, 8.0],
      ['SV037', 'Dang Thi Z', 'DS22B', 'Co so du lieu', 9, 8.0, 9.0, 8.5],
      ['SV038', 'Bui Van W', 'DS22B', 'Co so du lieu', 8, 6.5, 7.0, 6.0],
      ['SV039', 'Do Thi K', 'DS22B', 'Co so du lieu', 10, 9.0, 8.5, 9.0],
      ['SV040', 'Ngo Van M', 'DS22B', 'Co so du lieu', 10, 8.5, 8.0, 8.5],
      ['SV041', 'Nguyen Thi N', 'DS21A', 'Xac suat thong ke', 9, 7.5, 8.5, 7.0],
      ['SV042', 'Tran Van P', 'DS21A', 'Xac suat thong ke', 10, 9.5, 9.0, 9.5],
      ['SV043', 'Le Thi Q', 'DS21A', 'Xac suat thong ke', 8, 6.0, 7.5, 6.5],
      ['SV044', 'Pham Van R', 'DS21B', 'Xac suat thong ke', 9, 8.5, 8.0, 8.0],
      ['SV045', 'Hoang Thi S', 'DS21B', 'Xac suat thong ke', 10, 9.0, 9.5, 9.0]
    ];

    if (format === 'csv') {
      const csvContent = templateData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'mau_du_lieu.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (format === 'xlsx') {
      const worksheet = XLSX.utils.aoa_to_sheet(templateData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
      XLSX.writeFile(workbook, 'mau_du_lieu.xlsx');
    }
  };

  const cols = data.length > 0 ? Object.keys(data[0]) : [];

  return (
    <div className="max-w-6xl mx-auto w-full flex flex-col gap-8 pb-10">
      
      <div className="mb-2">
        <h2 className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight mb-2">Chuẩn bị dữ liệu</h2>
        <p className="text-sm sm:text-base text-slate-500 max-w-2xl leading-relaxed">
          Tải lên bảng điểm khảo thí để kích hoạt hệ thống phân tích, trích xuất thông tin và đưa ra các quyết định hỗ trợ học tập.
        </p>
      </div>

      {/* UPLOAD BOX */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          
          <div className="lg:col-span-5 p-6 sm:p-8 border-b lg:border-b-0 lg:border-r border-slate-100 bg-slate-50/50 flex flex-col">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="text-[16px] font-semibold text-slate-900">Cấu trúc dữ liệu</h3>
            </div>
            
            <p className="text-[13px] sm:text-[14px] text-slate-600 mb-6 leading-relaxed">
              Hệ thống yêu cầu dữ liệu đầu vào định dạng <strong>.csv</strong> hoặc <strong>.xlsx</strong>. File cần chứa các trường sau:
            </p>
            
            <div className="flex flex-wrap gap-2 mb-8">
              {REQUIRED_COLS.map(col => (
                <span key={col} className="inline-flex items-center px-2.5 py-1.5 rounded-md text-[12px] font-mono font-medium bg-white border border-slate-200 text-slate-600">
                  {col}
                </span>
              ))}
            </div>

            <div className="mt-auto pt-6 border-t border-slate-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-[13px] font-medium text-slate-900">Chưa có file chuẩn?</p>
                <p className="text-[12px] text-slate-500 mt-0.5">Tải file mẫu để nhập liệu.</p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button 
                  onClick={() => downloadTemplate('csv')} 
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 text-[13px] font-semibold rounded-lg hover:bg-slate-50 hover:text-blue-600 transition-all"
                >
                  <Download className="w-4 h-4" /> .CSV
                </button>
                <button 
                  onClick={() => downloadTemplate('xlsx')} 
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-emerald-200 text-emerald-700 text-[13px] font-semibold rounded-lg hover:bg-emerald-50 transition-all"
                >
                  <FileSpreadsheet className="w-4 h-4" /> .XLSX
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-center relative min-h-[300px]">
            {!uploadOk && !uploadedFile ? (
              <div className="w-full max-w-md mx-auto relative group">
                <div 
                  className={`relative w-full flex flex-col items-center justify-center p-8 sm:p-12 rounded-2xl border-2 transition-all cursor-pointer
                    ${dragging ? 'border-blue-500 bg-blue-50/50 scale-[1.01]' : 'border-dashed border-slate-300 bg-slate-50/50 hover:bg-slate-50 hover:border-blue-400'}`}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if(f) processFile(f); }}
                  onClick={() => inputRef.current?.click()}
                >
                  <input type="file" ref={inputRef} accept=".csv,.xlsx,.xls" className="hidden" onChange={onFileChange} />
                  <div className={`w-16 h-16 mb-5 shadow-sm border rounded-2xl flex items-center justify-center transition-colors ${dragging ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-500 group-hover:text-blue-600 group-hover:border-blue-200'}`}>
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <h4 className="text-[15px] sm:text-[16px] font-semibold text-slate-900 mb-1.5 text-center">
                    Nhấn để duyệt file <span className="font-normal text-slate-500">hoặc kéo thả</span>
                  </h4>
                  <p className="text-[13px] text-slate-500 text-center">Hỗ trợ .CSV, .XLSX</p>
                </div>
                <div className="flex items-center justify-center gap-1.5 mt-8 text-[12px] font-medium text-slate-400">
                  <Lock className="w-3.5 h-3.5" /> Dữ liệu được xử lý tại trình duyệt.
                </div>
              </div>
            ) : uploading ? (
               <div className="w-full flex flex-col items-center justify-center space-y-4">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm font-medium text-blue-700">{t('loading')}</p>
               </div>
            ) : uploadOk && uploadedFile ? (
              <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center p-8 border border-emerald-200/80 bg-emerald-50/50 rounded-2xl relative shadow-sm">
                <button onClick={clearFile} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
                <div className="w-16 h-16 mb-5 bg-white border border-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-sm relative">
                  <FileSpreadsheet className="w-8 h-8" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center border-2 border-white"><CheckCircle2 className="w-3 h-3" /></div>
                </div>
                <h4 className="text-[17px] font-semibold text-slate-900 text-center mb-1 break-all line-clamp-2">{uploadedFile.name}</h4>
                <p className="text-[13px] text-emerald-600 font-medium">{t('uploadSuccess')} — {data.length} {t('rows')}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* HIỂN THỊ LỖI */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-700 font-semibold">{error}</p>
              {missingCols.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-red-600">File của bạn đang thiếu các cột bắt buộc sau:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {missingCols.map(c => <span key={c} className="bg-red-100 text-red-700 px-2 py-0.5 rounded font-mono text-xs">{c}</span>)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BẢNG DỮ LIỆU */}
      {data.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col mt-4">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-gray-800">{t('dataTable')}</h3>
            <span className="ml-auto text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md">{filtered.length} / {data.length} {t('rows')}</span>
          </div>

          <div className="p-4 border-b border-gray-50 flex flex-wrap gap-3 bg-slate-50/50">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" placeholder="Tìm theo tên, MSSV..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <div className="relative w-full sm:w-48">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 bg-white" value={filterClass} onChange={e => { setFilterClass(e.target.value); setPage(1); }}>
                <option value="">Tất cả các lớp</option>
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="relative w-full sm:w-48">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 bg-white" value={filterSubject} onChange={e => { setFilterSubject(e.target.value); setPage(1); }}>
                <option value="">Tất cả môn học</option>
                {subjects.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 text-[11px] uppercase tracking-wider">#</th>
                  {cols.map(col => (
                    <th key={col} className="px-4 py-3 text-left font-semibold text-slate-600 text-[11px] uppercase tracking-wider whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pageData.map((row, i) => (
                  <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-[13px]">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    {cols.map(col => {
                      const val = (row as any)[col];
                      const isScore = ['DIEM_CHUYEN_CAN', 'DIEM_GIUA_KY', 'DIEM_NHOM', 'DIEM_CUOI_KY'].includes(col);
                      const score = Number(val);
                      let badge = '';
                      
                      if (isScore && !isNaN(score)) {
                        badge = score >= 8 ? 'text-emerald-600 font-medium' : score >= 5 ? 'text-amber-600 font-medium' : 'text-red-500 font-medium';
                      }
                      
                      return (
                        <td key={col} className={`px-4 py-3 whitespace-nowrap text-[13px] ${badge || 'text-slate-700'}`}>
                          {val === null || val === undefined ? <span className="text-slate-300 italic">—</span> : String(val)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-slate-50/30">
            <p className="text-[13px] text-slate-500">Trang <strong className="font-medium text-slate-700">{page}</strong> / {totalPages}</p>
            <div className="flex items-center gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-md border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white hover:shadow-sm transition-all text-slate-600">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-md border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white hover:shadow-sm transition-all text-slate-600">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
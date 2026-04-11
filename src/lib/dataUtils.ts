import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { StudentRecord, COLUMN_ALIASES } from './types';

export function getAcademicLevel(score: number): string {
  if (score >= 9) return 'Xuất sắc';
  if (score >= 8) return 'Giỏi';
  if (score >= 6.5) return 'Khá';
  if (score >= 5) return 'Trung bình';
  if (score >= 4) return 'Yếu';
  return 'Không đạt';
}

export function getAcademicLevelEn(score: number): string {
  if (score >= 9) return 'Excellent';
  if (score >= 8) return 'Very Good';
  if (score >= 6.5) return 'Good';
  if (score >= 5) return 'Average';
  if (score >= 4) return 'Weak';
  return 'Fail';
}

export function normalizeColumnName(raw: string): string | null {
  const lower = raw.toLowerCase().trim();
  for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (lower === canonical.toLowerCase() || aliases.includes(lower)) {
      return canonical;
    }
  }
  return null;
}

export async function parseFile(file: File): Promise<{ data: StudentRecord[]; mappedCols: Record<string, string>; missingCols: string[]; rawHeaders: string[] }> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  let rawData: Record<string, unknown>[] = [];
  let rawHeaders: string[] = [];

  if (ext === 'xlsx' || ext === 'xls') {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
    if (json.length > 0) rawHeaders = Object.keys(json[0]);
    rawData = json;
  } else if (ext === 'csv') {
    const text = await file.text();
    const result = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true, dynamicTyping: false });
    rawHeaders = result.meta.fields ?? [];
    rawData = result.data;
  } else {
    throw new Error('INVALID_FORMAT');
  }

  const mappedCols: Record<string, string> = {};
  for (const header of rawHeaders) {
    const canonical = normalizeColumnName(header);
    if (canonical) mappedCols[canonical] = header;
  }

  const required = Object.keys(COLUMN_ALIASES);
  const missingCols = required.filter(r => !mappedCols[r]);

  const data: StudentRecord[] = rawData.map(row => {
    const mapped: any = {};
    for (const [canonical, rawCol] of Object.entries(mappedCols)) {
      const val = row[rawCol];
      mapped[canonical] = val === null || val === undefined || val === '' ? null : val as string | number;
    }
    for (const col of rawHeaders) {
      if (!Object.values(mappedCols).includes(col)) {
        const val = row[col];
        mapped[col] = val === null || val === undefined || val === '' ? null : val as string | number;
      }
    }
    return mapped as StudentRecord;
  });

  return { data, mappedCols, missingCols, rawHeaders };
}

// 1. CẬP NHẬT KIỂM TRA DỮ LIỆU THIẾU
export function hasMissingRequiredData(data: StudentRecord[]): { hasMissing: boolean; details: Record<string, number> } {
  // Đổi mảng required sang 4 cột điểm mới
  const required = ['MSSV', 'HO_TEN', 'LOP', 'MON_HOC', 'DIEM_CHUYEN_CAN', 'DIEM_GIUA_KY', 'DIEM_NHOM', 'DIEM_CUOI_KY'];
  const details: Record<string, number> = {};
  let hasMissing = false;
  for (const col of required) {
    // Ép kiểu r sang any vì TypeScript phàn nàn StudentRecord không có key bắt buộc
    const count = data.filter((r: any) => r[col] === null || r[col] === undefined || r[col] === '').length;
    if (count > 0) { details[col] = count; hasMissing = true; }
  }
  return { hasMissing, details };
}

// Hàm phụ trợ tính điểm tổng kết (Công thức ví dụ: CC 10%, GK 20%, Nhóm 20%, CK 50%)
export function calculateFinalScore(row: StudentRecord): number {
  const cc = Number(row.DIEM_CHUYEN_CAN) || 0;
  const gk = Number(row.DIEM_GIUA_KY) || 0;
  const nhom = Number(row.DIEM_NHOM) || 0;
  const ck = Number(row.DIEM_CUOI_KY) || 0;
  return (cc * 0.1) + (gk * 0.2) + (nhom * 0.2) + (ck * 0.5);
}

// 2. CẬP NHẬT TÍNH TOÁN THỐNG KÊ (Dựa trên điểm cuối kỳ hoặc điểm tổng kết)
export function computeStats(data: StudentRecord[]) {
  // Lấy Điểm Cuối Kỳ làm mốc đánh giá chính (Bạn có thể đổi sang calculateFinalScore nếu muốn)
  const finalScores = data.map(r => Number(r.DIEM_CUOI_KY)).filter(v => !isNaN(v));
  
  const avgScore = finalScores.length ? finalScores.reduce((a, b) => a + b, 0) / finalScores.length : 0;
  const passed = finalScores.filter(s => s >= 5).length; // Thường điểm >= 5 là đậu
  const passRate = finalScores.length ? (passed / finalScores.length) * 100 : 0;
  
  // Trả về avgScore thay cho avg10 (để tránh lỗi ở các component khác nếu nó dùng avg10)
  return { 
    total: data.length, 
    avg10: +avgScore.toFixed(2), 
    avg4: +(avgScore * 0.4).toFixed(2), // Ước lượng hệ 4 tạm thời
    passRate: +passRate.toFixed(1) 
  };
}

// 3. CẬP NHẬT DỮ LIỆU BOXPLOT
export function computeBoxplotData(data: StudentRecord[]) {
  const bySubject: Record<string, number[]> = {};
  for (const row of data) {
    const subj = String(row.MON_HOC ?? 'N/A');
    // Dùng điểm cuối kỳ vẽ Boxplot
    const score = Number(row.DIEM_CUOI_KY);
    if (!isNaN(score)) {
      if (!bySubject[subj]) bySubject[subj] = [];
      bySubject[subj].push(score);
    }
  }
  return Object.entries(bySubject).map(([subject, scores]) => {
    const sorted = [...scores].sort((a, b) => a - b);
    const q1 = percentile(sorted, 25);
    const median = percentile(sorted, 50);
    const q3 = percentile(sorted, 75);
    const iqr = q3 - q1;
    const min = Math.max(sorted[0], q1 - 1.5 * iqr);
    const max = Math.min(sorted[sorted.length - 1], q3 + 1.5 * iqr);
    const outliers = sorted.filter(v => v < q1 - 1.5 * iqr || v > q3 + 1.5 * iqr);
    return { subject, min, q1, median, q3, max, outliers, mean: +(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) };
  });
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

// 4. CẬP NHẬT TÍNH TOÁN HỆ SỐ TƯƠNG QUAN
export function computeCorrelation(data: StudentRecord[]): Record<string, Record<string, number>> {
  // Thay đổi mảng numericCols sang 4 cột điểm mới
  const numericCols = ['DIEM_CHUYEN_CAN', 'DIEM_GIUA_KY', 'DIEM_NHOM', 'DIEM_CUOI_KY'];
  const result: Record<string, Record<string, number>> = {};
  
  for (const c1 of numericCols) {
    result[c1] = {};
    for (const c2 of numericCols) {
      // Ép kiểu r sang any để tránh lỗi TypeScript
      const pairs = data.map((r: any) => [Number(r[c1]), Number(r[c2])]).filter(([a, b]) => !isNaN(a) && !isNaN(b));
      result[c1][c2] = pairs.length > 1 ? pearsonCorr(pairs.map(p => p[0]), pairs.map(p => p[1])) : 0;
    }
  }
  return result;
}

function pearsonCorr(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0) return 0;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  const num = x.reduce((acc, xi, i) => acc + (xi - mx) * (y[i] - my), 0);
  const den = Math.sqrt(x.reduce((acc, xi) => acc + (xi - mx) ** 2, 0) * y.reduce((acc, yi) => acc + (yi - my) ** 2, 0));
  return den === 0 ? 0 : +(num / den).toFixed(4);
}
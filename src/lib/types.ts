// Giao diện dữ liệu sinh viên đã được cập nhật cho 4 cột điểm mới
export interface StudentRecord {
  MSSV: string | number;
  HO_TEN: string;
  LOP: string;
  MON_HOC: string;
  DIEM_CHUYEN_CAN: number | null;
  DIEM_GIUA_KY: number | null;
  DIEM_NHOM: number | null;
  DIEM_CUOI_KY: number | null;
  [key: string]: string | number | null; // Giữ lại index signature để linh hoạt
}

export interface ColumnInfo {
  name: string;
  type: 'SỐ' | 'CHỮ' | 'THỜI GIAN';
  nan_count: number;
}

export interface UploadResult {
  status: 'success' | 'error';
  total_rows?: number;
  columns_info?: ColumnInfo[];
  missing_stats?: { column: string; System_NaN: number; User_Miss: number }[];
  message?: string;
}

export interface ProcessResult {
  status: 'success' | 'error';
  data?: StudentRecord[];
  correlation?: Record<string, Record<string, number>>;
  message?: string;
}

export interface ClusterResult {
  status: 'success' | 'error';
  features?: string[];
  centers?: number[][];
  scatter_data?: { x: number; y: number; cluster: string }[];
  message?: string;
}

export interface PredictResult {
  status: 'success' | 'error';
  metrics?: { r2: number; mse: number; mae: number; rmse?: number };
  message?: string;
}

export type Language = 'vi' | 'en';

// --- ĐÃ CẬP NHẬT DANH SÁCH CỘT BẮT BUỘC ---
export const REQUIRED_COLUMNS = [
  'MSSV',
  'HO_TEN',
  'LOP',
  'MON_HOC',
  'DIEM_CHUYEN_CAN',
  'DIEM_GIUA_KY',
  'DIEM_NHOM',
  'DIEM_CUOI_KY',
];

export const REQUIRED_COLUMNS_EN = [
  'STUDENT_ID',
  'FULL_NAME',
  'CLASS',
  'SUBJECT',
  'ATTENDANCE_SCORE',
  'MIDTERM_SCORE',
  'GROUP_SCORE',
  'FINAL_SCORE',
];

// --- ĐÃ CẬP NHẬT ALIAS CHO CÁC CỘT MỚI ---
// Alias giúp hệ thống tự động nhận diện đúng cột dù file Excel có viết hơi khác một chút
export const COLUMN_ALIASES: Record<string, string[]> = {
  MSSV: ['mssv', 'ma sv', 'ma_sv', 'student_id', 'studentid', 'id sinh viên', 'msv'],
  HO_TEN: ['ho_ten', 'ho ten', 'ten', 'full_name', 'fullname', 'name', 'họ tên', 'tên'],
  LOP: ['lop', 'class', 'lớp', 'nhom', 'nhóm', 'group'],
  MON_HOC: ['mon_hoc', 'mon hoc', 'subject', 'môn', 'môn học', 'course'],
  DIEM_CHUYEN_CAN: ['diem_chuyen_can', 'diem chuyen can', 'chuyen can', 'chuyên cần', 'cc', 'attendance'],
  DIEM_GIUA_KY: ['diem_giua_ky', 'diem giua ky', 'giua ky', 'giữa kỳ', 'gk', 'midterm'],
  DIEM_NHOM: ['diem_nhom', 'diem nhom', 'nhom', 'nhóm', 'btl', 'bài tập lớn', 'group_score'],
  DIEM_CUOI_KY: ['diem_cuoi_ky', 'diem cuoi ky', 'cuoi ky', 'cuối kỳ', 'ck', 'thi', 'final'],
};
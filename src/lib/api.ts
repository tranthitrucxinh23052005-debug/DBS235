const API_URL = "https://tieuthetunhacongdang-tx-data-analytics-api.hf.space";
/**
 * Hàm phụ trợ để gửi FormData bằng Fetch API
 * Tự động xử lý lỗi HTTP và trả về JSON
 */
async function postForm(endpoint: string, formData: FormData) {
  const res = await fetch(`${API_URL}${endpoint}`, { 
    method: 'POST', 
    body: formData 
    // Lưu ý: Không để Content-Type ở đây, trình duyệt sẽ tự thêm boundary cho FormData
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// 1. Tab 1: Upload và kiểm tra file thô
export async function apiUpload(file: File) {
  const fd = new FormData();
  fd.append('file', file);
  return postForm('/api/upload', fd);
}

// 2. Tab 1: Xử lý dữ liệu và lấy ma trận tương quan
export async function apiProcessData(file: File) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('mode', 'mean');
  fd.append('scale_type', 'none');
  fd.append('scale_cols', '');
  return postForm('/api/process-data', fd);
}

// 3. Tab 3: Phân tích AI chi tiết (Dài)
export async function apiAiSummary(formData: FormData) {
  // Sử dụng hàm postForm dùng chung hoặc fetch trực tiếp
  const res = await fetch(`${API_URL}/api/ai-summary`, { 
    method: 'POST', 
    body: formData 
  });
  return res.json();
}

// 4. Tab 3: Đề xuất Dashboard 6 biểu đồ
export async function apiSuggestDashboard(file: File) {
  const fd = new FormData();
  fd.append('file', file);
  return postForm('/api/suggest-dashboard', fd);
}

// 5. Tab 6: Phân cụm K-means
export async function apiKmeans(file: File, k: number, kmeansCols: string) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('k', String(k));
  fd.append('scale_type', 'standard');
  fd.append('scale_cols', kmeansCols);
  fd.append('kmeans_cols', kmeansCols);
  return postForm('/api/kmeans-pipeline', fd);
}

// 6. Tab 6: Huấn luyện mô hình dự báo
export async function apiPredict(file: File, targetCol: string, featureCols: string, modelType: string) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('target_col', targetCol);
  fd.append('feature_cols', featureCols);
  fd.append('model_type', modelType);
  return postForm('/api/predict', fd);
}

// 7. Tab 2 & Tab 5: AI nhận xét hình ảnh biểu đồ (Boxplot/Custom)
export async function apiChartInsight(formData: FormData) {
  return postForm('/api/chart-insight', formData);
}

// 8. Tab 6: AI nhận xét các chỉ số Metrics của mô hình
export async function apiAiMlEval(formData: FormData) {
  return postForm('/api/ai-ml-eval', formData);
}

// 9. Tab 7: AI tổng kết toàn bộ 6 Tab trước đó
export async function apiFinalSummary(formData: FormData) {
  return postForm('/api/final-summary', formData);
}
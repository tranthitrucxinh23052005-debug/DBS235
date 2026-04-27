import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { StudentRecord } from '../lib/types';

interface AppDataContext {
  data: StudentRecord[];
  setData: (d: StudentRecord[]) => void;
  rawFile: File | null;
  setRawFile: (f: File | null) => void;
  correlation: Record<string, Record<string, number>>;
  setCorrelation: (c: Record<string, Record<string, number>>) => void;
  aiReport: string;
  setAiReport: (r: string) => void;
  modelMetrics: { r2: number; mse: number; mae: number; rmse?: number } | null;
  setModelMetrics: (m: { r2: number; mse: number; mae: number; rmse?: number } | null) => void;
  modelType: string;
  setModelType: (m: string) => void;
  clusterResult: { scatter_data: { x: number; y: number; cluster: string }[] } | null;
  setClusterResult: (r: { scatter_data: { x: number; y: number; cluster: string }[] } | null) => void;

  // BỔ SUNG CÁC STATE & FUNCTION MỚI VÀO INTERFACE
  rawData: any[];
  setRawData: (d: any[]) => void;
  cleanData: any[];
  setCleanData: (d: any[]) => void;
  activeData: any[];
  setActiveData: (d: any[]) => void;
  includeOutliers: boolean;
  setIncludeOutliers: (b: boolean) => void;
  handleDataQuality: (dataWithFlags: any[]) => void;
  toggleOutliers: (status: boolean) => void;
}

const Ctx = createContext<AppDataContext>({
  data: [], setData: () => { },
  rawFile: null, setRawFile: () => { },
  correlation: {}, setCorrelation: () => { },
  aiReport: '', setAiReport: () => { },
  modelMetrics: null, setModelMetrics: () => { },
  modelType: 'linear', setModelType: () => { },
  clusterResult: null, setClusterResult: () => { },

  // BỔ SUNG GIÁ TRỊ MẶC ĐỊNH
  rawData: [], setRawData: () => { },
  cleanData: [], setCleanData: () => { },
  activeData: [], setActiveData: () => { },
  includeOutliers: true, setIncludeOutliers: () => { },
  handleDataQuality: () => { },
  toggleOutliers: () => { }
});

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<StudentRecord[]>([]);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [correlation, setCorrelation] = useState<Record<string, Record<string, number>>>({});
  const [aiReport, setAiReport] = useState('');
  const [modelMetrics, setModelMetrics] = useState<{ r2: number; mse: number; mae: number; rmse?: number } | null>(null);
  const [modelType, setModelType] = useState('linear');
  const [clusterResult, setClusterResult] = useState<{ scatter_data: { x: number; y: number; cluster: string }[] } | null>(null);

  // 1. Thêm các biến này vào State/Context của bạn:
  const [rawData, setRawData] = useState<any[]>([]);       // Dữ liệu gốc
  const [cleanData, setCleanData] = useState<any[]>([]);   // Dữ liệu đã bỏ Outlier/Suspicious
  const [activeData, setActiveData] = useState<any[]>([]); // Dữ liệu đang được hệ thống sử dụng
  const [includeOutliers, setIncludeOutliers] = useState<boolean>(true); // Toggle

  useEffect(() => {
    // Nếu data có dữ liệu mà activeData đang trống, thì tự động copy sang
    if (data && data.length > 0 && activeData.length === 0) {
      setRawData(data);
      setCleanData(data);
      setActiveData(data);
    }
  }, [data, activeData.length]);
  // 2. CHUYỂN CÁC HÀM NÀY VÀO BÊN TRONG ĐỂ DÙNG ĐƯỢC STATE
  const handleDataQuality = (dataWithFlags: any[]) => {
    setRawData(dataWithFlags);

    // Clean data là data không có outlier và không suspicious
    const cleaned = dataWithFlags.filter(row => !row.is_outlier && !row.is_suspicious);
    setCleanData(cleaned);

    // Mặc định lúc mới vào là dùng rawData
    setActiveData(dataWithFlags);
  };

  const toggleOutliers = (status: boolean) => {
    setIncludeOutliers(status);
    setActiveData(status ? rawData : cleanData);
  };

  return (
    <Ctx.Provider value={{
      data, setData, rawFile, setRawFile, correlation, setCorrelation,
      aiReport, setAiReport, modelMetrics, setModelMetrics, modelType, setModelType,
      clusterResult, setClusterResult,

      // XUẤT STATE VÀ FUNCTION RA CHO CÁC COMPONENT KHÁC DÙNG
      rawData, setRawData, cleanData, setCleanData, activeData, setActiveData,
      includeOutliers, setIncludeOutliers, handleDataQuality, toggleOutliers
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAppData() {
  return useContext(Ctx);
}
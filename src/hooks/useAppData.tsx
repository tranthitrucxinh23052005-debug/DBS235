import { createContext, useContext, useState, ReactNode } from 'react';
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
}

const Ctx = createContext<AppDataContext>({
  data: [], setData: () => {},
  rawFile: null, setRawFile: () => {},
  correlation: {}, setCorrelation: () => {},
  aiReport: '', setAiReport: () => {},
  modelMetrics: null, setModelMetrics: () => {},
  modelType: 'linear', setModelType: () => {},
  clusterResult: null, setClusterResult: () => {},
});

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<StudentRecord[]>([]);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [correlation, setCorrelation] = useState<Record<string, Record<string, number>>>({});
  const [aiReport, setAiReport] = useState('');
  const [modelMetrics, setModelMetrics] = useState<{ r2: number; mse: number; mae: number; rmse?: number } | null>(null);
  const [modelType, setModelType] = useState('linear');
  const [clusterResult, setClusterResult] = useState<{ scatter_data: { x: number; y: number; cluster: string }[] } | null>(null);

  return (
    <Ctx.Provider value={{ data, setData, rawFile, setRawFile, correlation, setCorrelation, aiReport, setAiReport, modelMetrics, setModelMetrics, modelType, setModelType, clusterResult, setClusterResult }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAppData() {
  return useContext(Ctx);
}

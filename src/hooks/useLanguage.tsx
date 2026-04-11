import { createContext, useContext, useState, ReactNode } from 'react';
import { Language } from '../lib/types';
import { t as translate } from '../lib/i18n';

interface LangContext {
  lang: Language;
  toggleLang: () => void;
  t: (key: string) => string;
}

const LangCtx = createContext<LangContext>({ lang: 'vi', toggleLang: () => {}, t: (k) => k });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>('vi');
  const toggleLang = () => setLang(l => l === 'vi' ? 'en' : 'vi');
  const t = (key: string) => translate(lang, key);
  return <LangCtx.Provider value={{ lang, toggleLang, t }}>{children}</LangCtx.Provider>;
}

export function useLang() {
  return useContext(LangCtx);
}

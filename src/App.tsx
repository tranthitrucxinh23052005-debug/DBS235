import React, { useState } from 'react';
import { 
  Database, BarChart2, Brain, Network, PieChart, Cpu, FileText, 
  Globe, CheckCircle2, X, Menu, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { LanguageProvider, useLang } from './hooks/useLanguage';
import { AppDataProvider, useAppData } from './hooks/useAppData';

// Import các Tabs của bạn
import Tab1_Data from './components/tabs/Tab1_Data';
import Tab2_Stats from './components/tabs/Tab2_Stats';
import Tab3_AI from './components/tabs/Tab3_AI';
import Tab4_Corr from './components/tabs/Tab4_Corr';
import Tab5_Custom from './components/tabs/Tab5_Custom';
import Tab6_ML from './components/tabs/Tab6_ML';
import Tab7_Summary from './components/tabs/Tab7_Summary';

const TABS = [
  { id: 0, labelKey: 'tab1', icon: Database, Component: Tab1_Data },
  { id: 1, labelKey: 'tab2', icon: BarChart2, Component: Tab2_Stats },
  { id: 2, labelKey: 'tab3', icon: Brain, Component: Tab3_AI },
  { id: 3, labelKey: 'tab4', icon: Network, Component: Tab4_Corr },
  { id: 4, labelKey: 'tab5', icon: PieChart, Component: Tab5_Custom },
  { id: 5, labelKey: 'tab6', icon: Cpu, Component: Tab6_ML },
  { id: 6, labelKey: 'tab7', icon: FileText, Component: Tab7_Summary },
];

function AppContent() {
  const { t, lang, toggleLang } = useLang();
  const { data } = useAppData();
  
  const [activeTab, setActiveTab] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

  const hasData = data.length > 0;

  const handleTabChange = (tabId: number) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false); // Đóng menu trên mobile khi chọn tab
  };

  const ActiveTabComponent = TABS[activeTab].Component;

  return (
    <div className="h-screen w-full bg-[#f8fafc] flex overflow-hidden font-sans text-slate-800 selection:bg-blue-100 selection:text-blue-900">
      
      {/* MOBILE OVERLAY */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`
        fixed top-0 left-0 h-full bg-white border-r border-slate-200 z-50 transition-all duration-300 flex flex-col shadow-2xl lg:shadow-none
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0 ${isDesktopCollapsed ? 'lg:w-20' : 'lg:w-64'}
      `}>
        {/* Sidebar Header */}
        <div className="h-20 flex items-center gap-3.5 px-4 border-b border-slate-100 shrink-0">
          <div className={`transition-all duration-300 ${isDesktopCollapsed ? 'w-10 h-10' : 'w-12 h-12'}`}>
            <img 
              src="/logo-hub.jpg" 
              alt="Logo HUB" 
              className="w-full h-full object-contain"
              onError={(e) => { e.currentTarget.style.display = 'none'; }} 
            />
          </div>
          {!isDesktopCollapsed && (
            <div className="flex flex-col whitespace-nowrap animate-in fade-in duration-300">
              <h1 className="text-[14px] font-bold text-slate-800 leading-tight">Trường Đại học</h1>
              <h2 className="text-[14px] font-bold text-slate-800 leading-tight">Ngân hàng TPHCM</h2>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1 custom-scrollbar">
          {!isDesktopCollapsed && (
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-3 mt-2">
              {lang === 'vi' ? 'Phân hệ phân tích' : 'Analysis Modules'}
            </p>
          )}
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isDisabled = tab.id !== 0 && !hasData;
            return (
              <button
                key={tab.id}
                onClick={() => !isDisabled && handleTabChange(tab.id)}
                disabled={isDisabled}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all group
                  ${isActive ? 'bg-blue-50 text-blue-700' : isDisabled ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
                  ${isDesktopCollapsed ? 'justify-center' : 'justify-start'}
                `}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                {!isDesktopCollapsed && <span className="whitespace-nowrap">{t(tab.labelKey)}</span>}
              </button>
            );
          })}
        </nav>

        {/* User Footer */}
<div className="p-4 border-t border-slate-100 shrink-0">
  <div className={`bg-slate-50 rounded-lg border border-slate-100 flex items-center ${isDesktopCollapsed ? 'justify-center p-2' : 'p-3 gap-3'}`}>
    {/* Vùng chứa Logo Khoa */}
    <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
      <img 
        src="/logokhoa.png" 
        alt="Logo Khoa" 
        className="w-full h-full object-contain p-1"
        onError={(e) => {
          // Fallback nếu ảnh lỗi thì hiện chữ viết tắt
          e.currentTarget.style.display = 'none';
          e.currentTarget.parentElement!.innerHTML = '<span class="text-[10px] font-bold text-slate-500">KHDL</span>';
        }} 
      />
    </div>

    {/* Thông tin giảng viên - Tự động ẩn khi thu nhỏ */}
    {!isDesktopCollapsed && (
      <div className="flex-1 min-w-0 overflow-hidden animate-in fade-in duration-300">
        <p className="text-[13px] font-bold text-slate-900 truncate">Giảng viên</p>
        <p className="text-[11px] font-medium text-blue-600 truncate">Khoa Khoa học Dữ liệu</p>
      </div>
    )}
  </div>
</div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isDesktopCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2" onClick={() => setIsMobileMenuOpen(true)}><Menu className="w-5 h-5" /></button>
            <button className="hidden lg:flex p-1.5" onClick={() => setIsDesktopCollapsed(!isDesktopCollapsed)}>
              {isDesktopCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
            <h2 className="text-[15px] font-semibold text-slate-800">{t(TABS[activeTab].labelKey)}</h2>
          </div>
          <button onClick={toggleLang} className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
            <Globe className="w-4 h-4" /> <span>{lang === 'vi' ? 'Tiếng Việt' : 'English'}</span>
          </button>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
          <ActiveTabComponent />
        </main>
      </div>

      {/* Style tag nằm cuối cùng nhưng vẫn phải ở TRONG div cha */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}} />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppDataProvider>
        <AppContent />
      </AppDataProvider>
    </LanguageProvider>
  );
}
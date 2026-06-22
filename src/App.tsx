/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  AppTab,
  ContractSettings
} from './types';
import {
  Settings,
  Layers,
  FileSpreadsheet,
  FilePlus,
  BarChart3,
  FolderDown,
  Database,
  Calculator,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  HelpCircle,
  RefreshCw,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import SettingsView from './components/SettingsView';
import LuanChuyenView from './components/LuanChuyenView';
import HopDongMoiView from './components/HopDongMoiView';
import BangKeView from './components/BangKeView';
import { downloadTemplate } from './utils/excel';
import {
  hasValidGoogleSheetsUrl,
  pullAllFromGoogleSheets,
  pushAllToGoogleSheets,
  GOOGLE_SHEETS_SCRIPT_URL,
  writeActionLogToSheet,
  getPortalUserEmail
} from './services/dbService';

const DEFAULT_RULES = [
  { id: 'rule_1', keyword: 'ADX - Viết nội dung', outputValue: 'Mua gói quảng cáo ADX' },
  { id: 'rule_2', keyword: 'Native ads - Viết nội dung', outputValue: 'Mua gói quảng cáo Native ads' },
  { id: 'rule_3', keyword: 'Kingsize, Mobile - viết nội dung', outputValue: 'Mua gói quảng cáo Kingsize Mobile' }
];

const DEFAULT_CONFIG: ContractSettings = {
  taxRate: 8,
  agencyFeeRate: 12,
  requiredHeadersLuanChuyen: ['Mã hợp đồng', 'Tên hợp đồng', 'Tên Khách hàng', 'Tên NVKD', 'Chuyên trang'],
  requiredHeadersHopDongMoi: ['Số HĐ', 'Tên sale', 'Tên khách hàng', 'Sản phẩm', 'Thành tiền'],
  requiredHeadersBangKe: ['STT', 'Mã booking', 'Số HT', 'Nội dung quảng cáo', 'Lịch đăng'],
  contractSuffix: 'AD',
  contractNameSeparator: '/',
  exceptionRules: DEFAULT_RULES,
  logsEnabled: true,
  userName: 'Kế toán viên',
  googleSheetsUrl: 'https://script.google.com/macros/s/AKfycbx6l4gM4WbIxaoCJDMpztCpzzIuCiZ7m38wEZdSMI2IjLPNv4bhCs7n1tzgQafomSER/exec',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.LUAN_CHUYEN);
  const [headerActions, setHeaderActions] = useState<React.ReactNode>(null);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });
  const [config, setConfig] = useState<ContractSettings>(() => {
    const raw = localStorage.getItem('app_contract_settings');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (!parsed.googleSheetsUrl || parsed.googleSheetsUrl.trim() === '') {
          parsed.googleSheetsUrl = 'https://script.google.com/macros/s/AKfycbx6l4gM4WbIxaoCJDMpztCpzzIuCiZ7m38wEZdSMI2IjLPNv4bhCs7n1tzgQafomSER/exec';
          localStorage.setItem('app_contract_settings', JSON.stringify(parsed));
        }
        return {
          ...DEFAULT_CONFIG,
          ...parsed,
        };
      } catch {
        return DEFAULT_CONFIG;
      }
    }
    const initConfig = { ...DEFAULT_CONFIG };
    localStorage.setItem('app_contract_settings', JSON.stringify(initConfig));
    return initConfig;
  });

  // Google Sheets Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(() => {
    return localStorage.getItem('google_sheets_last_synced');
  });

  // Tự động tìm kiếm email người dùng trên portal/url khi khởi chạy và ghi nhận log
  useEffect(() => {
    const initUserAndLog = async () => {
      let finalEmail = '';
      try {
        // 1. Thử lấy từ URL query hoặc hash (email=...)
        const hash = window.location.hash || window.location.search;
        const match = hash.match(/email=([^&]+)/);
        if (match && match[1]) {
          finalEmail = decodeURIComponent(match[1]);
        }

        // 2. Thử lấy từ portal IndexedDB nếu chưa có ở URL
        if (!finalEmail) {
          const portalEmail = await getPortalUserEmail();
          if (portalEmail) {
            finalEmail = portalEmail;
          }
        }

        // Cập nhật cấu hình nếu tìm thấy email mới
        if (finalEmail) {
          setConfig(prev => {
            const updated = { ...prev, userName: finalEmail };
            localStorage.setItem('app_contract_settings', JSON.stringify(updated));
            return updated;
          });
        }
      } catch (e) {
        console.error('Failed to get portal user email:', e);
      } finally {
        // Ghi log khởi động ứng dụng
        writeActionLogToSheet("Khởi động ứng dụng", "Đã mở trang đối chiếu Hợp đồng - Bảng kê");
      }
    };
    initUserAndLog();
  }, []);

  // Tự động tải ngầm dữ liệu từ Google Sheets khi mở app
  useEffect(() => {
    const autoSync = async () => {
      if (hasValidGoogleSheetsUrl()) {
        setIsSyncing(true);
        setSyncError(null);
        try {
          const stats = await pullAllFromGoogleSheets();
          const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setLastSynced(timeStr);
          localStorage.setItem('google_sheets_last_synced', timeStr);
          
          // Nạp lại cấu hình mới nhất từ local storage
          const raw = localStorage.getItem('app_contract_settings');
          if (raw) {
            try {
              setConfig(JSON.parse(raw));
            } catch (e) {}
          }
          
          setSyncSuccessMsg(`Tự động đồng bộ ngầm thành công lúc ${timeStr}! (KH: ${stats.customersCount} dòng)`);
          setTimeout(() => setSyncSuccessMsg(null), 6000);
        } catch (err: any) {
          console.error("Lỗi đồng bộ Google Sheets tự động:", err);
          setSyncError(err?.message || "Lỗi đồng bộ tự động");
        } finally {
          setIsSyncing(false);
        }
      }
    };
    autoSync();
  }, []);

  const handleManualPull = async () => {
    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccessMsg(null);
    try {
      const stats = await pullAllFromGoogleSheets();
      const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSynced(timeStr);
      localStorage.setItem('google_sheets_last_synced', timeStr);
      
      const raw = localStorage.getItem('app_contract_settings');
      if (raw) {
        try {
          setConfig(JSON.parse(raw));
        } catch (e) {}
      }
      
      setSyncSuccessMsg(`Đồng bộ thành công! Đã nạp ${stats.customersCount} khách hàng, ${stats.departmentsCount} bộ phận, ${stats.productsCount} sản phẩm.`);
      setTimeout(() => setSyncSuccessMsg(null), 5000);
      writeActionLogToSheet("Đồng bộ tải (Pull)", `Đồng bộ thủ công thành công từ Google Sheets: Nạp ${stats.customersCount} khách hàng, ${stats.departmentsCount} bộ phận, ${stats.productsCount} sản phẩm.`);
      return stats;
    } catch (err: any) {
      setSyncError(err?.message || "Lỗi khi tải dữ liệu từ Sheet");
      writeActionLogToSheet("Đồng bộ tải (Pull) thất bại", `Lỗi: ${err?.message || "Không rõ nguyên nhân"}`);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  const handleManualPush = async (currentConfig: ContractSettings) => {
    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccessMsg(null);
    try {
      await pushAllToGoogleSheets(currentConfig);
      const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSynced(timeStr);
      localStorage.setItem('google_sheets_last_synced', timeStr);
      setSyncSuccessMsg(`Đã đẩy toàn bộ dữ liệu cấu hình và master data lên Google Sheet thành công!`);
      setTimeout(() => setSyncSuccessMsg(null), 5000);
      writeActionLogToSheet("Đồng bộ gửi (Push)", "Đẩy thành công cấu hình và master data hiện tại lên Google Sheets.");
    } catch (err: any) {
      setSyncError(err?.message || "Lỗi khi ghi dữ liệu lên Sheet");
      writeActionLogToSheet("Đồng bộ gửi (Push) thất bại", `Lỗi: ${err?.message || "Không rõ nguyên nhân"}`);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveConfig = (updated: ContractSettings) => {
    setConfig(updated);
    localStorage.setItem('app_contract_settings', JSON.stringify(updated));
    writeActionLogToSheet("Lưu cấu hình", "Cập nhật tham số chung của hệ thống.");
    // Tự động đẩy lên Google Sheet nếu có URL cấu hình
    if (hasValidGoogleSheetsUrl()) {
      handleManualPush(updated).catch(err => {
        console.error("Auto-push config thất bại:", err);
      });
    }
  };

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  // Nav menus
  const navItems = [
    { id: AppTab.LUAN_CHUYEN, label: 'Xử lý hợp đồng luân chuyển', icon: Layers, desc: 'Hợp đồng bản cứng' },
    { id: AppTab.HOP_DONG_MOI, label: 'Xử lý hợp đồng mới', icon: FilePlus, desc: 'Hợp đồng mới' },
    { id: AppTab.BANG_KE, label: 'Xử lý bảng kê', icon: BarChart3, desc: 'Bảng kê chứng từ' },
    { id: AppTab.SETTINGS, label: 'Setup', icon: Settings, desc: 'Cài đặt tham số & Master data' },
  ];

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-800 antialiased overflow-hidden">
      {/* Sidebar Navigation */}
      <aside
        className={`${isCollapsed ? 'w-20' : 'w-80'
          } bg-white text-slate-800 flex flex-col flex-shrink-0 border-r border-slate-200 transition-all duration-300 relative`}
      >
        {/* Toggle Collapse Button sits on the border line list */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-6 h-6 w-6 bg-white text-slate-400 hover:text-indigo-600 rounded-full flex items-center justify-center border border-slate-200 shadow-md hover:bg-slate-50 transition duration-200 z-50 cursor-pointer"
          title={isCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
        >
          {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>

        {/* Brand Header */}
        <div className={`p-5 border-b border-slate-100 flex items-center ${isCollapsed ? 'justify-center py-6' : 'space-x-3'}`}>
          <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-600/20 flex-shrink-0">
            <Database className="h-5 w-5" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <h1 className="text-sm font-extrabold tracking-tight text-slate-900 leading-tight break-words line-clamp-2">
                Tham chiếu hợp đồng - bảng kê
              </h1>
              <span className="text-[10px] font-bold text-indigo-600 font-mono tracking-wider uppercase block mt-0.5">
                Kế toán VCC
              </span>
            </div>
          )}
        </div>

        {/* Dynamic Workspace Nav links */}
        <div className={`flex-1 overflow-y-auto py-6 space-y-7 ${isCollapsed ? 'px-2' : 'px-4'}`}>
          <div>
            {!isCollapsed ? (
              <span className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3 font-mono">
                Phân hệ nghiệp vụ
              </span>
            ) : (
              <hr className="border-slate-100 mx-2 mb-4" />
            )}
            <nav className="space-y-1.5 font-sans">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center rounded-xl transition text-left cursor-pointer group
                      ${isCollapsed ? 'justify-center p-3.5' : 'justify-between p-3'}
                      ${isActive
                        ? 'bg-indigo-50 text-indigo-700 shadow-sm font-medium'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                      {!isCollapsed && (
                        <div>
                          <div className="text-sm font-semibold text-slate-800 group-hover:text-slate-950">{item.label}</div>
                          <div className={`text-xs ${isActive ? 'text-indigo-500 font-medium' : 'text-slate-400'}`}>{item.desc}</div>
                        </div>
                      )}
                    </div>
                    {!isCollapsed && (
                      <ChevronRight className={`h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick template toolkit */}
          {!isCollapsed && (
            <div className="bg-slate-50/60 border border-slate-200/60 rounded-xl p-4.5 space-y-3">
              <span className="text-xs font-bold text-slate-700 flex items-center space-x-2 font-mono">
                <FolderDown className="h-4 w-4 text-indigo-600" />
                <span>TESTING TOOLKIT</span>
              </span>
              <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                Chưa có file Excel thử nghiệm? Nhấp tải nhanh các file mẫu đã hạch toán cột hệt như thực tế:
              </p>
              <div className="space-y-1.5 pt-1">
                <button
                  onClick={() => downloadTemplate('luan_chuyen')}
                  className="w-full text-left text-xs bg-white hover:bg-slate-50 text-indigo-600 hover:text-indigo-700 p-2 rounded-lg font-semibold transition border border-slate-200 shadow-sm cursor-pointer"
                >
                  📥 Tải Mẫu HĐ Luân Chuyển
                </button>
                <button
                  onClick={() => downloadTemplate('hop_dong_moi')}
                  className="w-full text-left text-xs bg-white hover:bg-slate-50 text-indigo-600 hover:text-indigo-700 p-2 rounded-lg font-semibold transition border border-slate-200 shadow-sm cursor-pointer"
                >
                  📥 Tải Mẫu Hợp Đồng Mới
                </button>
                <button
                  onClick={() => downloadTemplate('bang_ke')}
                  className="w-full text-left text-xs bg-white hover:bg-slate-50 text-indigo-600 hover:text-indigo-700 p-2 rounded-lg font-semibold transition border border-slate-200 shadow-sm cursor-pointer"
                >
                  📥 Tải Mẫu Bảng Kê Ads
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Workspace Info Footbar */}
        {!isCollapsed && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/40 text-xs text-slate-400 space-y-1 font-mono">
            <p>Kế toán viên: <span className="text-slate-600 font-semibold">{config.userName || 'Kế toán viên'}</span></p>
            <p>Môi trường: <span className="text-emerald-600 font-semibold">AI Studio MVP</span></p>
          </div>
        )}
      </aside>

      {/* Main Container Workspace */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Workspace Top header bar */}
        <header className="bg-white border-b border-slate-200 h-16 flex-shrink-0 px-8 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-slate-500">
            <span>Hệ thống nội bộ</span>
            <span>/</span>
            <span className="font-semibold text-slate-800">
              {navItems.find((n) => n.id === activeTab)?.label}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold leading-none border border-emerald-100">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Cơ sở hạch toán: 2026</span>
            </span>

            {(activeTab === AppTab.LUAN_CHUYEN || activeTab === AppTab.HOP_DONG_MOI || activeTab === AppTab.BANG_KE) && headerActions}

            {isSyncing && (
              <span className="flex items-center space-x-1.5 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-semibold border border-indigo-100 animate-pulse">
                <RefreshCw className="h-3 w-3 animate-spin text-indigo-600" />
                <span>Đang đồng bộ...</span>
              </span>
            )}
            {syncError && (
              <span className="flex items-center space-x-1.5 bg-rose-50 text-rose-750 px-3 py-1 rounded-full text-xs font-semibold border border-rose-150" title={syncError}>
                <AlertCircle className="h-3 w-3 text-rose-600" />
                <span className="truncate max-w-[150px]">Lỗi: {syncError}</span>
              </span>
            )}
            {syncSuccessMsg && (
              <span className="flex items-center space-x-1.5 bg-emerald-50 text-emerald-750 px-3 py-1 rounded-full text-xs font-semibold border border-emerald-150">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                <span>{syncSuccessMsg}</span>
              </span>
            )}
            {!isSyncing && !syncError && !syncSuccessMsg && lastSynced && (
              <span className="text-xs text-slate-400 font-mono">
                Đồng bộ Sheet: {lastSynced}
              </span>
            )}
          </div>
        </header>

        {/* Interactive content body panel */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-6xl mx-auto">
            {activeTab === AppTab.SETTINGS && (
              <SettingsView
                config={config}
                onSaveConfig={handleSaveConfig}
                isSyncing={isSyncing}
                syncError={syncError}
                lastSynced={lastSynced}
                onManualPull={handleManualPull}
                onManualPush={handleManualPush}
              />
            )}

            {activeTab === AppTab.LUAN_CHUYEN && (
              <LuanChuyenView
                config={config}
                onHeaderActionsChange={setHeaderActions}
              />
            )}

            {activeTab === AppTab.HOP_DONG_MOI && (
              <HopDongMoiView
                config={config}
                onHeaderActionsChange={setHeaderActions}
              />
            )}

            {activeTab === AppTab.BANG_KE && (
              <BangKeView
                config={config}
                onHeaderActionsChange={setHeaderActions}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

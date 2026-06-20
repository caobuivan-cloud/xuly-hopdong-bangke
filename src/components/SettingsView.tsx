/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Settings, Save, Check, FileDown, ShieldAlert, Cpu, 
  Trash2, Plus, Edit, Database, FileSpreadsheet, AlertCircle, 
  CheckCircle, FileUp, X, ChevronDown, ChevronUp, RefreshCw, Sparkles, Search 
} from 'lucide-react';
import { 
  ContractSettings, ExceptionRule, DepartmentMaster, CustomerMaster, ProductMaster 
} from '../types';
import { downloadTemplate, parseExcelFile } from '../utils/excel';
import { dbService } from '../services/dbService';

interface SettingsViewProps {
  id?: string;
  config: ContractSettings;
  onSaveConfig: (updated: ContractSettings) => void;
}

// Utility to remove Vietnamese diacritics and make string lowercase for robust matching
export function stripVietnameseDiacritics(str: string): string {
  return str
    .normalize('NFD') // decomposes characters with diacritics
    .replace(/[\u0300-\u036f]/g, '') // remove combining diacritical marks
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

export default function SettingsView({
  id = 'settings-view',
  config,
  onSaveConfig,
}: SettingsViewProps) {
  // General configs settings states
  const [taxRate, setTaxRate] = useState(config.taxRate);
  const [agencyFee, setAgencyFee] = useState(config.agencyFeeRate);
  const [contractSuffix, setContractSuffix] = useState(config.contractSuffix || 'AD');
  const [contractNameSeparator, setContractNameSeparator] = useState(config.contractNameSeparator || '/');
  
  const [luanChuyenHeaders, setLuanChuyenHeaders] = useState(config.requiredHeadersLuanChuyen.join(', '));
  const [hopDongMoiHeaders, setHopDongMoiHeaders] = useState(config.requiredHeadersHopDongMoi.join(', '));
  const [bangKeHeaders, setBangKeHeaders] = useState(config.requiredHeadersBangKe.join(', '));
  
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Exceptions rules states
  const [exceptionRules, setExceptionRules] = useState<ExceptionRule[]>(config.exceptionRules || []);
  const [newKeyword, setNewKeyword] = useState('');
  const [newOutput, setNewOutput] = useState('');
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  // Master Data state loaded from dbService
  const [departments, setDepartments] = useState<DepartmentMaster[]>([]);
  const [customers, setCustomers] = useState<CustomerMaster[]>([]);
  const [products, setProducts] = useState<ProductMaster[]>([]);

  // Expand states for previewing the Master Data
  const [expandedMaster, setExpandedMaster] = useState<'bophan' | 'khach' | 'sanpham' | null>(null);

  // Search term states for each Master table
  const [searchTermDept, setSearchTermDept] = useState('');
  const [searchTermCust, setSearchTermCust] = useState('');
  const [searchTermProd, setSearchTermProd] = useState('');

  // Upload/Parse feedback states
  const [uploadFeedback, setUploadFeedback] = useState<{
    type: 'success' | 'error' | null;
    message: string;
    target: 'bophan' | 'khach' | 'sanpham' | null;
  }>({ type: null, message: '', target: null });

  // Load master data on mount
  useEffect(() => {
    const loadMasters = async () => {
      const depts = await dbService.getDepartments();
      const custs = await dbService.getCustomers();
      const prods = await dbService.getProducts();
      setDepartments(depts);
      setCustomers(custs);
      setProducts(prods);
    };
    loadMasters();
  }, []);

  // Sync exception rules if config changes underneath
  useEffect(() => {
    if (config.exceptionRules) {
      setExceptionRules(config.exceptionRules);
    }
  }, [config.exceptionRules]);

  // Computed filtered arrays for Master search (client-side, covers all displayed fields except stt)
  const normalizedDeptQuery = stripVietnameseDiacritics(searchTermDept);
  const filteredDepartments = searchTermDept.trim() === ''
    ? departments
    : departments.filter(d =>
        stripVietnameseDiacritics(d.tenBoPhan).includes(normalizedDeptQuery) ||
        stripVietnameseDiacritics(d.maSale).includes(normalizedDeptQuery)
      );

  const normalizedCustQuery = stripVietnameseDiacritics(searchTermCust);
  const filteredCustomers = searchTermCust.trim() === ''
    ? customers
    : customers.filter(c =>
        stripVietnameseDiacritics(c.tenKhach).includes(normalizedCustQuery) ||
        stripVietnameseDiacritics(c.maKhach).includes(normalizedCustQuery)
      );

  const normalizedProdQuery = stripVietnameseDiacritics(searchTermProd);
  const filteredProducts = searchTermProd.trim() === ''
    ? products
    : products.filter(p =>
        stripVietnameseDiacritics(p.keyword).includes(normalizedProdQuery) ||
        stripVietnameseDiacritics(p.maVuViec).includes(normalizedProdQuery) ||
        stripVietnameseDiacritics(p.tenSanPham).includes(normalizedProdQuery) ||
        stripVietnameseDiacritics(p.tkDoanhThu).includes(normalizedProdQuery) ||
        stripVietnameseDiacritics(String(p.thueSuat ?? '')).includes(normalizedProdQuery)
      );


  const handleSaveConfigs = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSaveConfig({
      taxRate,
      agencyFeeRate: agencyFee,
      requiredHeadersLuanChuyen: luanChuyenHeaders.split(',').map((h) => h.trim()).filter(Boolean),
      requiredHeadersHopDongMoi: hopDongMoiHeaders.split(',').map((h) => h.trim()).filter(Boolean),
      requiredHeadersBangKe: bangKeHeaders.split(',').map((h) => h.trim()).filter(Boolean),
      contractSuffix,
      contractNameSeparator,
      exceptionRules,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Add/Update exception rules
  const handleAddOrUpdateRule = () => {
    if (!newKeyword.trim() || !newOutput.trim()) return;

    if (editingRuleId) {
      const updated = exceptionRules.map((r) => 
        r.id === editingRuleId ? { ...r, keyword: newKeyword.trim(), outputValue: newOutput.trim() } : r
      );
      setExceptionRules(updated);
      setEditingRuleId(null);
    } else {
      const newRule: ExceptionRule = {
        id: 'rule_' + Date.now(),
        keyword: newKeyword.trim(),
        outputValue: newOutput.trim()
      };
      setExceptionRules([...exceptionRules, newRule]);
    }

    setNewKeyword('');
    setNewOutput('');
    
    // Auto sync state to parent config
    setTimeout(() => {
      onSaveConfig({
        taxRate,
        agencyFeeRate: agencyFee,
        requiredHeadersLuanChuyen: luanChuyenHeaders.split(',').map((h) => h.trim()).filter(Boolean),
        requiredHeadersHopDongMoi: hopDongMoiHeaders.split(',').map((h) => h.trim()).filter(Boolean),
        requiredHeadersBangKe: bangKeHeaders.split(',').map((h) => h.trim()).filter(Boolean),
        contractSuffix,
        contractNameSeparator,
        exceptionRules: editingRuleId 
          ? exceptionRules.map((r) => r.id === editingRuleId ? { ...r, keyword: newKeyword.trim(), outputValue: newOutput.trim() } : r)
          : [...exceptionRules, { id: 'rule_' + Date.now(), keyword: newKeyword.trim(), outputValue: newOutput.trim() }],
      });
    }, 100);
  };

  const handleEditRule = (rule: ExceptionRule) => {
    setNewKeyword(rule.keyword);
    setNewOutput(rule.outputValue);
    setEditingRuleId(rule.id);
  };

  const handleDeleteRule = (id: string) => {
    const updated = exceptionRules.filter((r) => r.id !== id);
    setExceptionRules(updated);
    
    // Auto sync state to parent config
    setTimeout(() => {
      onSaveConfig({
        taxRate,
        agencyFeeRate: agencyFee,
        requiredHeadersLuanChuyen: luanChuyenHeaders.split(',').map((h) => h.trim()).filter(Boolean),
        requiredHeadersHopDongMoi: hopDongMoiHeaders.split(',').map((h) => h.trim()).filter(Boolean),
        requiredHeadersBangKe: bangKeHeaders.split(',').map((h) => h.trim()).filter(Boolean),
        contractSuffix,
        contractNameSeparator,
        exceptionRules: updated,
      });
    }, 100);
  };

  // Handle master file upload
  const handleMasterUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'bophan' | 'khach' | 'sanpham') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFeedback({ type: null, message: '', target });

    try {
      const parsed = await parseExcelFile(file);
      if (parsed.sheets.length === 0) {
        throw new Error('File excel không chứa dữ liệu Sheet nào.');
      }

      const activeSheet = parsed.sheets[0];
      const rows = activeSheet.rows;
      const headers = activeSheet.headers.map(h => h.trim());

      if (rows.length === 0) {
        throw new Error('Sheet dữ liệu đầu tiên rỗng.');
      }

      if (target === 'bophan') {
        // Required logic: Tên bộ phận thực hiện, Mã sale
        const colTenBoPhan = headers.find(h => stripVietnameseDiacritics(h).includes('ten bo phan') || stripVietnameseDiacritics(h).includes('bo phan thuc hien'));
        const colMaSale = headers.find(h => stripVietnameseDiacritics(h).includes('ma sale') || stripVietnameseDiacritics(h).includes('sale') || stripVietnameseDiacritics(h).includes('ma nv'));
        const colStt = headers.find(h => stripVietnameseDiacritics(h) === 'stt');

        if (!colTenBoPhan || !colMaSale) {
          throw new Error('File thiếu cột bắt buộc. Cần có cột chứa thông tin: "Tên bộ phận thực hiện" và "Mã sale".');
        }

        const formattedDepts: DepartmentMaster[] = rows.map((r, i) => ({
          stt: colStt ? r[colStt] : i + 1,
          tenBoPhan: String(r[colTenBoPhan] || '').trim(),
          maSale: String(r[colMaSale] || '').trim(),
        })).filter(d => d.tenBoPhan && d.maSale);

        await dbService.saveDepartments(formattedDepts);
        setDepartments(formattedDepts);
        setUploadFeedback({
          type: 'success',
          message: `Đã tải thành công danh sách mã bộ phận (${formattedDepts.length} dòng).`,
          target,
        });
      } 
      else if (target === 'khach') {
        // Required logic: Tên khách, Mã khách
        const colTenKhach = headers.find(h => stripVietnameseDiacritics(h).includes('ten khach') || stripVietnameseDiacritics(h).includes('ten khach hang'));
        const colMaKhach = headers.find(h => stripVietnameseDiacritics(h).includes('ma khach') || stripVietnameseDiacritics(h).includes('ma kh') || stripVietnameseDiacritics(h).includes('customer code'));
        const colStt = headers.find(h => stripVietnameseDiacritics(h) === 'stt');

        if (!colTenKhach || !colMaKhach) {
          throw new Error('File thiếu cột bắt buộc. Cần có cột chứa thông tin: "Tên khách" và "Mã khách".');
        }

        const formattedCusts: CustomerMaster[] = rows.map((r, i) => ({
          stt: colStt ? r[colStt] : i + 1,
          tenKhach: String(r[colTenKhach] || '').trim(),
          maKhach: String(r[colMaKhach] || '').trim(),
        })).filter(c => c.tenKhach && c.maKhach);

        await dbService.saveCustomers(formattedCusts);
        setCustomers(formattedCusts);
        setUploadFeedback({
          type: 'success',
          message: `Đã tải thành công danh sách mã khách (${formattedCusts.length} dòng).`,
          target,
        });
      } 
      else if (target === 'sanpham') {
        // Required logic: Cụm từ nhận diện, Chuẩn hóa mã Vụ việc, Chuẩn hóa Tên sản phẩm, TK doanh thu, Thuế suất (nếu có)
        const colKeyword = headers.find(h => stripVietnameseDiacritics(h).includes('cum tu nhan dien') || stripVietnameseDiacritics(h).includes('keyword') || stripVietnameseDiacritics(h) === 'cum tu');
        const colMaVuViec = headers.find(h => stripVietnameseDiacritics(h).includes('chuan hoa ma vu viec') || stripVietnameseDiacritics(h).includes('ma vu viec'));
        const colTenSanPham = headers.find(h => stripVietnameseDiacritics(h).includes('chuan hoa ten san pham') || stripVietnameseDiacritics(h).includes('ten san pham'));
        const colTkDoanhThu = headers.find(h => stripVietnameseDiacritics(h).includes('tk doanh thu') || stripVietnameseDiacritics(h).includes('tai khoan doanh thu') || stripVietnameseDiacritics(h) === 'tk');
        const colThueSuat = headers.find(h => stripVietnameseDiacritics(h).includes('thue suat') || stripVietnameseDiacritics(h).includes('thue') || stripVietnameseDiacritics(h).includes('vat'));

        if (!colKeyword || !colMaVuViec || !colTenSanPham || !colTkDoanhThu) {
          throw new Error('File thiếu cột bắt buộc. Cần có các cột chính xác: "Cụm từ nhận diện", "Chuẩn hóa mã Vụ việc", "Chuẩn hóa Tên sản phẩm" và "TK doanh thu".');
        }

        const formattedProds: ProductMaster[] = rows.map((r) => ({
          keyword: String(r[colKeyword] || '').trim(),
          maVuViec: String(r[colMaVuViec] || '').trim(),
          tenSanPham: String(r[colTenSanPham] || '').trim(),
          tkDoanhThu: String(r[colTkDoanhThu] || '').trim(),
          thueSuat: colThueSuat ? String(r[colThueSuat] || '').trim() : undefined,
        })).filter(p => p.keyword && p.maVuViec && p.tenSanPham);

        await dbService.saveProducts(formattedProds);
        setProducts(formattedProds);
        setUploadFeedback({
          type: 'success',
          message: `Đã hạch toán chuẩn hóa thành công danh mục sản phẩm vụ việc (${formattedProds.length} dòng).`,
          target,
        });
      }
    } catch (err: any) {
      setUploadFeedback({
        type: 'error',
        message: err?.message || 'Lỗi bất ngờ xảy ra khi chuẩn hóa file master.',
        target,
      });
    }

    // Reset file input value
    e.target.value = '';
  };

  // Clear master dataset
  const handleClearMaster = async (target: 'bophan' | 'khach' | 'sanpham') => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa toàn bộ dữ liệu master này không?`)) return;

    if (target === 'bophan') {
      await dbService.clearDepartments();
      setDepartments([]);
    } else if (target === 'khach') {
      await dbService.clearCustomers();
      setCustomers([]);
    } else if (target === 'sanpham') {
      await dbService.clearProducts();
      setProducts([]);
    }

    setUploadFeedback({
      type: 'success',
      message: 'Đã xóa dữ liệu thành phẩm khỏi bộ nhớ đệm.',
      target,
    });
  };

  return (
    <div id={id} className="space-y-8 pb-16">
      {/* View Header */}
      <div className="flex items-center justify-between border-b border-slate-205 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center space-x-2">
            <Settings className="h-6 w-6 text-indigo-500" />
            <span>Tham Số Hệ Thống & Master Data Cấu Hình</span>
          </h2>
          <p className="text-sm text-slate-550 mt-1">
            Quản trị dữ liệu lõi, định dạng tệp, quy chế so khớp hóa đơn, và bảng tra cứu chuẩn hóa.
          </p>
        </div>
      </div>

      {/* Grid: Config forms + Rules exception list */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Form panel: Column 1 & 2 */}
        <div className="xl:col-span-2 space-y-6">
          <form onSubmit={handleSaveConfigs} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
              <Database className="h-5 w-5 text-indigo-500" />
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
                1. Tham số tài chính & Phân tách Hợp đồng
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Thuế suất VAT (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="w-full pl-3 pr-8 py-2 border border-slate-300 rounded-lg text-slate-800 font-mono focus:ring-1 focus:ring-indigo-500"
                  />
                  <span className="absolute right-3 top-2.5 text-slate-400 font-mono text-xs">%</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Tỷ lệ chiết khấu
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={agencyFee}
                    onChange={(e) => setAgencyFee(Number(e.target.value))}
                    className="w-full pl-3 pr-8 py-2 border border-slate-300 rounded-lg text-slate-800 font-mono focus:ring-1 focus:ring-indigo-500"
                  />
                  <span className="absolute right-3 top-2.5 text-slate-400 font-mono text-xs">%</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Hậu tố hợp đồng
                </label>
                <input
                  type="text"
                  value={contractSuffix}
                  onChange={(e) => setContractSuffix(e.target.value)}
                  placeholder="AD"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 font-mono text-sm focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Ví dụ: HD-2026-001/VCC-<strong>AD</strong></span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Dấu ngăn cách
                </label>
                <input
                  type="text"
                  value={contractNameSeparator}
                  onChange={(e) => setContractNameSeparator(e.target.value)}
                  placeholder="/"
                  maxLength={5}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 font-mono text-sm focus:ring-1 focus:ring-indigo-500 text-center"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Ký tự ngăn cách mã hợp đồng</span>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Validation schema configs */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Yêu cầu so khớp cột bắt buộc khi kiểm thử tệp
              </h4>
              
              <div className="space-y-3.5">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-bold text-slate-650 font-mono">Hợp đồng Luân chuyển</span>
                    <span className="text-[10px] text-slate-400">Ngăn cách qua dấu phẩy</span>
                  </div>
                  <input
                    type="text"
                    value={luanChuyenHeaders}
                    onChange={(e) => setLuanChuyenHeaders(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono text-slate-700"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-bold text-slate-650 font-mono">Hợp đồng Mới ký</span>
                  </div>
                  <input
                    type="text"
                    value={hopDongMoiHeaders}
                    onChange={(e) => setHopDongMoiHeaders(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono text-slate-700"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-bold text-slate-650 font-mono">Bảng kê đối soát Chiến dịch</span>
                  </div>
                  <input
                    type="text"
                    value={bangKeHeaders}
                    onChange={(e) => setBangKeHeaders(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono text-slate-700"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              {saveSuccess ? (
                <div className="flex items-center space-x-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100">
                  <Check className="h-3.5 w-3.5" />
                  <span>Đã ghi nhớ thay đổi cấu hình!</span>
                </div>
              ) : <div />}

              <button
                type="submit"
                className="flex items-center space-x-1.5 px-4.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow"
              >
                <Save className="h-4 w-4" />
                <span>LƯU THAM SỐ CHUNG</span>
              </button>
            </div>
          </form>

          {/* exception rules for chuyên trang / chuyên trang import */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <div>
                  <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
                    2. Rule ngoại lệ Chuyên trang / Chuyên trang Import
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Match không phân biệt hoa/thường, không diacritics (dấu tiếng Việt).
                  </p>
                </div>
              </div>
            </div>

            {/* Form inline add/edit exception */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 bg-slate-50 p-4.5 rounded-xl border border-slate-100">
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Cụm từ nhận diện (Keyword)</label>
                <input
                  type="text"
                  placeholder="Ví dụ: ADX - Viết nội dung"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Chuẩn hóa Đầu ra (Output Value)</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Mua gói quảng cáo ADX"
                  value={newOutput}
                  onChange={(e) => setNewOutput(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleAddOrUpdateRule}
                  className="w-full flex items-center justify-center space-x-1.5 px-3 py-2 text-xs font-bold text-white bg-indigo-650 hover:bg-indigo-750 rounded-lg transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{editingRuleId ? 'Sửa Rule' : 'Thêm Rule'}</span>
                </button>
              </div>
            </div>

            {/* Rules table */}
            <div className="overflow-x-auto border border-slate-150 rounded-lg">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold text-slate-550 w-8 text-center">STT</th>
                    <th className="px-4 py-2.5 font-semibold text-slate-550">Gốc tìm kiếm (Keyword)</th>
                    <th className="px-4 py-2.5 font-semibold text-slate-550">Hạch toán đầu ra tương ứng</th>
                    <th className="px-4 py-2.5 font-semibold text-slate-550 w-24 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {exceptionRules.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-slate-400 italic font-sans">
                        Chưa có rule ngoại lệ nào được cấu hình.
                      </td>
                    </tr>
                  ) : (
                    exceptionRules.map((rule, idx) => (
                      <tr key={rule.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="px-4 py-2 font-mono text-slate-700 bg-amber-50/10 font-bold">{rule.keyword}</td>
                        <td className="px-4 py-2 text-slate-800 font-semibold">{rule.outputValue}</td>
                        <td className="px-4 py-2 text-right space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditRule(rule)}
                            className="p-1 hover:text-indigo-600 rounded"
                            title="Chỉnh sửa rule"
                          >
                            <Edit className="h-3.5 w-3.5 inline" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRule(rule.id)}
                            className="p-1 hover:text-rose-600 rounded"
                            title="Xóa rule"
                          >
                            <Trash2 className="h-3.5 w-3.5 inline" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Master Data checklist layout: Column 3 */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center space-x-1.5">
              <Database className="h-4 w-4 text-indigo-400" />
              <span>DỮ LIỆU GỐC (MASTER DATA)</span>
            </h4>
            
            <p className="text-xs text-slate-350 leading-relaxed font-sans">
              Kiểm dịch và cảnh báo trạng thái nạp các tệp chuẩn hóa kế toán/quảng cáo của doanh nghiệp:
            </p>

            <ul className="space-y-3 text-xs">
              {/* Dept check */}
              <li className="flex items-center justify-between p-3 rounded-lg bg-slate-800/40 border border-slate-800/60">
                <div>
                  <span className="block font-semibold">1. Mã bộ phận</span>
                  <span className="text-[10px] text-slate-400 font-mono">Danh mục bộ phận thực hiện & mã sale</span>
                </div>
                {departments.length > 0 ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-450 border border-emerald-500/30 text-[10px] font-bold font-mono">
                    Đã nạp {departments.length} dòng
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[10px] font-bold font-mono">
                    ⚠️ Chưa có dữ liệu
                  </span>
                )}
              </li>

              {/* Customer check */}
              <li className="flex items-center justify-between p-3 rounded-lg bg-slate-800/40 border border-slate-800/60">
                <div>
                  <span className="block font-semibold">2. Mã khách hàng</span>
                  <span className="text-[10px] text-slate-400 font-mono">Map tên khách sang mã KH hạch toán</span>
                </div>
                {customers.length > 0 ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-450 border border-emerald-500/30 text-[10px] font-bold font-mono">
                    Đã nạp {customers.length} dòng
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[10px] font-bold font-mono">
                    ⚠️ Chưa có dữ liệu
                  </span>
                )}
              </li>

              {/* Products / services search check */}
              <li className="flex items-center justify-between p-3 rounded-lg bg-slate-800/40 border border-slate-800/60">
                <div>
                  <span className="block font-semibold">3. Standardizing vụ việc/SP</span>
                  <span className="text-[10px] text-slate-400 font-mono">Đổi diễn giải thô sang mã vụ việc, TK doanh thu</span>
                </div>
                {products.length > 0 ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-450 border border-emerald-500/30 text-[10px] font-bold font-mono">
                    Đã nạp {products.length} dòng
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[10px] font-bold font-mono">
                    ⚠️ Chưa có dữ liệu
                  </span>
                )}
              </li>
            </ul>
          </div>

          {/* Quick instructions panel */}
          <div className="bg-indigo-50 border border-indigo-150 p-5 rounded-xl font-sans text-xs text-indigo-850 space-y-2">
            <h5 className="font-bold uppercase tracking-wider text-indigo-900">Cách nạp Master Data</h5>
            <ol className="list-decimal list-inside space-y-1 text-slate-650">
              <li>Tải tệp tin Excel mẫu ở hộp bên dưới.</li>
              <li>Điền đúng cột và dữ liệu thực tế tại đơn vị.</li>
              <li>Dùng nút <strong>Nạp File mới</strong> ở từng loại Master mục số 3 bên dưới để load dữ liệu vào.</li>
              <li>Hệ thống tự động sử dụng bảng master này để chuẩn hóa tự động các tệp hạch toán.</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Segment 3: Master Data management suite (Vertical layout blocks) */}
      <div className="space-y-6">
        <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
          <Database className="h-5 w-5 text-indigo-500" />
          <h3 className="font-extrabold text-slate-800 text-base uppercase">
            3. Trực quan hóa & Quản trị Sổ Master Data
          </h3>
        </div>

        {/* 1. MASTER DEPARTMENTS (MÃ BỘ PHẬN) */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center space-x-3">
                <span className="text-sm font-bold text-slate-800 uppercase tracking-wider font-mono">Master 1: Danh sách mã bộ phận thực hiện</span>
                {departments.length > 0 ? (
                  <span className="px-2 py-0.5 text-[10px] font-bold text-emerald-750 bg-emerald-50 border border-emerald-100 rounded-full font-mono">
                    Đã nạp: {departments.length} dòng
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-bold text-rose-750 bg-rose-50 border border-rose-100 rounded-full font-mono">
                    Thiếu dữ liệu!
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Yêu cầu cột: <strong className="font-mono text-slate-600">Tên bộ phận thực hiện, Mã sale</strong> (Hệ thống map dựa trên tên diễn giải bộ phận).
              </p>
            </div>

            <div className="flex items-center flex-wrap gap-2">
              <button
                type="button"
                onClick={() => downloadTemplate('m_bophan')}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-250 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-sm"
              >
                <FileDown className="h-3.5 w-3.5" />
                <span>Mẫu Excel</span>
              </button>

              <label className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer shadow">
                <FileUp className="h-3.5 w-3.5" />
                <span>Nạp File mới</span>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={(e) => handleMasterUpload(e, 'bophan')}
                  className="hidden"
                />
              </label>

              {departments.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleClearMaster('bophan')}
                  className="p-1.5 text-rose-655 hover:bg-rose-50 border border-rose-200 hover:border-rose-300 rounded-lg"
                  title="Xóa tệp master"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setExpandedMaster(expandedMaster === 'bophan' ? null : 'bophan')}
                className="p-1.5 hover:bg-slate-100 border border-slate-200 rounded-lg"
              >
                {expandedMaster === 'bophan' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Feedback section specifically to this target card */}
          {uploadFeedback.target === 'bophan' && uploadFeedback.message && (
            <div className={`p-4 text-xs font-medium border-b ${
              uploadFeedback.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
                : 'bg-rose-50 text-rose-800 border-rose-100'
            }`}>
              {uploadFeedback.message}
            </div>
          )}

          {/* Search box for Master 1 */}
          {departments.length > 0 && expandedMaster === 'bophan' && (
            <div className="px-4 pt-3 pb-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  id="search-master-bophan"
                  type="text"
                  value={searchTermDept}
                  onChange={e => setSearchTermDept(e.target.value)}
                  placeholder="Tìm theo tên bộ phận hoặc mã sale..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-400 outline-none text-slate-700 placeholder-slate-400 bg-white"
                />
                {searchTermDept && (
                  <button type="button" onClick={() => setSearchTermDept('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              {searchTermDept && (
                <p className="text-[10px] text-slate-400 mt-1">
                  Đang hiển thị {filteredDepartments.length} / {departments.length} dòng
                </p>
              )}
            </div>
          )}

          {/* Preview collapsible table content */}
          {expandedMaster === 'bophan' && (
            <div className="p-4 overflow-x-auto max-h-[350px]">
              {departments.length === 0 ? (
                <div className="py-8 px-4 text-center text-slate-400 italic">
                  Chưa nạp danh sách bộ phận master. Vui lòng tải file mẫu và import để xem trước.
                </div>
              ) : filteredDepartments.length === 0 ? (
                <div className="py-6 px-4 text-center text-slate-400 italic text-xs">
                  Không tìm thấy kết quả nào khớp với “{searchTermDept}”.
                </div>
              ) : (
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-2 text-slate-500 font-mono w-16">STT</th>
                      <th className="px-4 py-2 text-slate-700 font-semibold">Tên bộ phận thực hiện</th>
                      <th className="px-4 py-2 text-slate-700 font-semibold">Mã sale mapping</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDepartments.map((dept, index) => (
                      <tr key={index} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2 text-slate-400 font-mono">{dept.stt}</td>
                        <td className="px-4 py-2 font-medium text-slate-850">{dept.tenBoPhan}</td>
                        <td className="px-4 py-2 font-mono text-indigo-600 font-bold bg-indigo-50/20">{dept.maSale}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* 2. MASTER CUSTOMERS (MÃ KHÁCH HÀNG) */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center space-x-3">
                <span className="text-sm font-bold text-slate-800 uppercase tracking-wider font-mono">Master 2: Bảng tra cứu đối chiếu mã khách hàng</span>
                {customers.length > 0 ? (
                  <span className="px-2 py-0.5 text-[10px] font-bold text-emerald-750 bg-emerald-50 border border-emerald-100 rounded-full font-mono">
                    Đã nạp: {customers.length} dòng
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-bold text-rose-750 bg-rose-50 border border-rose-100 rounded-full font-mono">
                    Thiếu dữ liệu!
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Yêu cầu cột: <strong className="font-mono text-slate-600">Tên khách, Mã khách</strong> (Map đối soát hóa đơn / hạch toán chính xác).
              </p>
            </div>

            <div className="flex items-center flex-wrap gap-2">
              <button
                type="button"
                onClick={() => downloadTemplate('m_khach')}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-250 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-sm"
              >
                <FileDown className="h-3.5 w-3.5" />
                <span>Mẫu Excel</span>
              </button>

              <label className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer shadow">
                <FileUp className="h-3.5 w-3.5" />
                <span>Nạp File mới</span>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={(e) => handleMasterUpload(e, 'khach')}
                  className="hidden"
                />
              </label>

              {customers.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleClearMaster('khach')}
                  className="p-1.5 text-rose-655 hover:bg-rose-50 border border-rose-200 hover:border-rose-300 rounded-lg"
                  title="Xóa tệp master"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setExpandedMaster(expandedMaster === 'khach' ? null : 'khach')}
                className="p-1.5 hover:bg-slate-100 border border-slate-200 rounded-lg"
              >
                {expandedMaster === 'khach' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Feedback section */}
          {uploadFeedback.target === 'khach' && uploadFeedback.message && (
            <div className={`p-4 text-xs font-medium border-b ${
              uploadFeedback.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
                : 'bg-rose-50 text-rose-800 border-rose-100'
            }`}>
              {uploadFeedback.message}
            </div>
          )}

          {/* Search box for Master 2 */}
          {customers.length > 0 && expandedMaster === 'khach' && (
            <div className="px-4 pt-3 pb-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  id="search-master-khach"
                  type="text"
                  value={searchTermCust}
                  onChange={e => setSearchTermCust(e.target.value)}
                  placeholder="Tìm theo tên hoặc mã khách hàng..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-400 outline-none text-slate-700 placeholder-slate-400 bg-white"
                />
                {searchTermCust && (
                  <button type="button" onClick={() => setSearchTermCust('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              {searchTermCust && (
                <p className="text-[10px] text-slate-400 mt-1">
                  Đang hiển thị {filteredCustomers.length} / {customers.length} dòng
                </p>
              )}
            </div>
          )}

          {/* Collapsible preview customer */}
          {expandedMaster === 'khach' && (
            <div className="p-4 overflow-x-auto max-h-[350px]">
              {customers.length === 0 ? (
                <div className="py-8 px-4 text-center text-slate-400 italic">
                  Chưa nạp danh sách khách master. Vui lòng tải file mẫu và import để xem trước.
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="py-6 px-4 text-center text-slate-400 italic text-xs">
                  Không tìm thấy kết quả nào khớp với “{searchTermCust}”.
                </div>
              ) : (
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-2 text-slate-500 font-mono w-16">STT</th>
                      <th className="px-4 py-2 text-slate-700 font-semibold">Tên khách hàng</th>
                      <th className="px-4 py-2 text-slate-700 font-semibold">Mã khách hàng tương ứng (Sổ cái)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCustomers.map((cust, index) => (
                      <tr key={index} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2 text-slate-400 font-mono">{cust.stt}</td>
                        <td className="px-4 py-2 font-medium text-slate-850">{cust.tenKhach}</td>
                        <td className="px-4 py-2 font-mono text-emerald-600 font-bold bg-emerald-50/20">{cust.maKhach}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* 3. MASTER PRODUCTS STANDARD (DANH SÁCH CHUẨN HÓA SẢN PHẨM/VỤ VIỆC) */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center space-x-3">
                <span className="text-sm font-bold text-slate-800 uppercase tracking-wider font-mono">Master 3: Cấu hình chuẩn hóa Sản Phẩm & Mã Vụ Việc</span>
                {products.length > 0 ? (
                  <span className="px-2 py-0.5 text-[10px] font-bold text-emerald-750 bg-emerald-50 border border-emerald-100 rounded-full font-mono">
                    Đã nạp: {products.length} dòng
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-bold text-rose-750 bg-rose-50 border border-rose-100 rounded-full font-mono">
                    Thiếu dữ liệu!
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Yêu cầu cột: <strong className="font-mono text-slate-600">Cụm từ nhận diện, Chuẩn hóa mã Vụ việc, Chuẩn hóa Tên sản phẩm, TK doanh thu</strong>. (Chuẩn hóa tự động diễn giải thô sang mã vụ việc và TK sổ cái).
              </p>
            </div>

            <div className="flex items-center flex-wrap gap-2">
              <button
                type="button"
                onClick={() => downloadTemplate('m_sanpham')}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-250 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-sm"
              >
                <FileDown className="h-3.5 w-3.5" />
                <span>Mẫu Excel</span>
              </button>

              <label className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer shadow">
                <FileUp className="h-3.5 w-3.5" />
                <span>Nạp File mới</span>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={(e) => handleMasterUpload(e, 'sanpham')}
                  className="hidden"
                />
              </label>

              {products.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleClearMaster('sanpham')}
                  className="p-1.5 text-rose-655 hover:bg-rose-50 border border-rose-200 hover:border-rose-300 rounded-lg"
                  title="Xóa tệp master"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setExpandedMaster(expandedMaster === 'sanpham' ? null : 'sanpham')}
                className="p-1.5 hover:bg-slate-100 border border-slate-200 rounded-lg"
              >
                {expandedMaster === 'sanpham' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Feedback section */}
          {uploadFeedback.target === 'sanpham' && uploadFeedback.message && (
            <div className={`p-4 text-xs font-medium border-b ${
              uploadFeedback.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
                : 'bg-rose-50 text-rose-800 border-rose-100'
            }`}>
              {uploadFeedback.message}
            </div>
          )}

          {/* Search box for Master 3 */}
          {products.length > 0 && expandedMaster === 'sanpham' && (
            <div className="px-4 pt-3 pb-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  id="search-master-sanpham"
                  type="text"
                  value={searchTermProd}
                  onChange={e => setSearchTermProd(e.target.value)}
                  placeholder="Tìm keyword, mã vụ việc, tên sản phẩm, TK doanh thu, thuế suất..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-400 outline-none text-slate-700 placeholder-slate-400 bg-white"
                />
                {searchTermProd && (
                  <button type="button" onClick={() => setSearchTermProd('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              {searchTermProd && (
                <p className="text-[10px] text-slate-400 mt-1">
                  Đang hiển thị {filteredProducts.length} / {products.length} dòng
                </p>
              )}
            </div>
          )}

          {/* Collapsible preview products */}
          {expandedMaster === 'sanpham' && (
            <div className="p-4 overflow-x-auto max-h-[350px]">
              {products.length === 0 ? (
                <div className="py-8 px-4 text-center text-slate-400 italic">
                  Chưa nạp danh sách chuẩn hóa sản phẩm. Vui lòng tải file mẫu và nạp để xem bảng tra cứu.
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-6 px-4 text-center text-slate-400 italic text-xs">
                  Không tìm thấy kết quả nào khớp với “{searchTermProd}”.
                </div>
              ) : (
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-2 text-slate-700 font-semibold">Cụm từ nhận diện (Keyword)</th>
                      <th className="px-4 py-2 text-slate-700 font-semibold">Chuẩn hóa mã Vụ việc</th>
                      <th className="px-4 py-2 text-slate-700 font-semibold">Chuẩn hóa tên sản phẩm</th>
                      <th className="px-4 py-2 text-slate-700 font-semibold">TK Doanh Thu</th>
                      <th className="px-4 py-2 text-slate-700 font-semibold text-right">Lọc thuế suất (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.map((prod, index) => (
                      <tr key={index} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2 font-bold text-amber-800 bg-amber-50/5 font-mono">{prod.keyword}</td>
                        <td className="px-4 py-2 font-mono text-indigo-650 font-bold">{prod.maVuViec}</td>
                        <td className="px-4 py-2 text-slate-800 font-medium">{prod.tenSanPham}</td>
                        <td className="px-4 py-2 font-mono text-slate-600">{prod.tkDoanhThu}</td>
                        <td className="px-4 py-2 font-mono text-right text-slate-500">{prod.thueSuat !== undefined && prod.thueSuat !== '' ? `${prod.thueSuat}%` : 'Mặc định'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}

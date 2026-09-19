/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, Settings, RotateCcw, Check, Plus, AlertCircle, Sparkles, Tag, CloudUpload
} from 'lucide-react';
import { ContractSettings, HeaderAliasesBangKe } from '../types';
import { DEFAULT_HEADER_ALIASES_BANG_KE } from '../utils/businessLogic';

interface BangKeHeaderMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ContractSettings;
  onSaveConfig: (updated: ContractSettings) => void;
  onManualPush?: (config: ContractSettings) => Promise<any>;
}

interface FieldDefinition {
  key: string;
  label: string;
  description: string;
  required?: boolean;
}

const FIELDS: FieldDefinition[] = [
  {
    key: 'lichDang',
    label: 'Lịch chạy / Lịch đăng',
    description: 'Cột chứa khoảng thời gian chạy hoặc ngày đăng (ví dụ: 01/05/2026 - 31/05/2026)',
    required: true,
  },
  {
    key: 'maBooking',
    label: 'Mã booking',
    description: 'Cột mã booking quảng cáo (ví dụ: QC1600526)',
    required: true,
  },
  {
    key: 'soHt',
    label: 'Số HT (Hệ thống)',
    description: 'Cột số hợp đồng hệ thống (ví dụ: TH0071225)',
  },
  {
    key: 'nhan',
    label: 'Nhãn / Thương hiệu',
    description: 'Tên nhãn hàng hoặc thương hiệu khách hàng',
  },
  {
    key: 'noiDungQuangCao',
    label: 'Nội dung quảng cáo',
    description: 'Cột nội dung, diễn giải dùng để nhận diện mã vụ việc và sản phẩm',
    required: true,
  },
  {
    key: 'chiTiet',
    label: 'Chi tiết chạy',
    description: 'Cột chi tiết bổ trợ cho nội dung chạy',
  },
  {
    key: 'donViTinh',
    label: 'Đơn vị tính (ĐVT)',
    description: 'Đơn vị tính (Gói, CPM, Lượt, Bài...)',
  },
  {
    key: 'soLuong',
    label: 'Số lượng',
    description: 'Số lượng thực hiện theo bảng kê',
  },
  {
    key: 'donGia',
    label: 'Đơn giá',
    description: 'Đơn giá thực hiện theo bảng kê',
  },
  {
    key: 'chietKhau',
    label: 'Chiết khấu (CK)',
    description: 'Tỷ lệ chiết khấu (%) hoặc số tiền chiết khấu',
  },
  {
    key: 'thanhTienSauCk',
    label: 'Thành tiền sau chiết khấu',
    description: 'Thành tiền thực tế sau chiết khấu hoặc doanh thu',
  },
  {
    key: 'stt',
    label: 'Số thứ tự (STT)',
    description: 'Cột số thứ tự dòng dữ liệu bảng kê',
  },
  {
    key: 'ghiChu',
    label: 'Ghi chú',
    description: 'Cột ghi chú bổ sung',
  },
];

export default function BangKeHeaderMappingModal({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onManualPush,
}: BangKeHeaderMappingModalProps) {
  // Merge current with default
  const [aliases, setAliases] = useState<HeaderAliasesBangKe>(() => {
    return {
      ...DEFAULT_HEADER_ALIASES_BANG_KE,
      ...(config.headerAliasesBangKe || {}),
    };
  });

  const [inputValues, setInputValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    const merged = { ...DEFAULT_HEADER_ALIASES_BANG_KE, ...(config.headerAliasesBangKe || {}) };
    for (const key of Object.keys(merged)) {
      initial[key] = (merged[key] || []).join(', ');
    }
    return initial;
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleInputChange = (fieldKey: string, value: string) => {
    setInputValues(prev => ({ ...prev, [fieldKey]: value }));
    const list = value.split(',').map(s => s.trim()).filter(Boolean);
    setAliases(prev => ({ ...prev, [fieldKey]: list }));
  };

  const handleResetDefault = () => {
    setAliases(DEFAULT_HEADER_ALIASES_BANG_KE);
    const initial: Record<string, string> = {};
    for (const key of Object.keys(DEFAULT_HEADER_ALIASES_BANG_KE)) {
      initial[key] = (DEFAULT_HEADER_ALIASES_BANG_KE[key] || []).join(', ');
    }
    setInputValues(initial);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      // Build clean aliases
      const cleanAliases: HeaderAliasesBangKe = {};
      for (const key of Object.keys(inputValues)) {
        cleanAliases[key] = inputValues[key]
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
      }

      const updatedConfig: ContractSettings = {
        ...config,
        headerAliasesBangKe: cleanAliases,
      };

      onSaveConfig(updatedConfig);

      if (onManualPush) {
        await onManualPush(updatedConfig).catch(err => {
          console.warn('Lỗi push ngầm:', err);
        });
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 900);
    } catch (err) {
      console.error('Lỗi khi lưu cấu hình nhận diện cột:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl shadow-sm">
              <Settings className="h-5 w-5 animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span>Cài đặt nhận diện cột Bảng kê</span>
                <span className="text-[11px] font-semibold bg-indigo-50 text-indigo-600 border border-indigo-200 px-2 py-0.5 rounded-full">
                  Đồng bộ toàn công ty
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Thêm các từ khóa/tên cột khác nhau để hệ thống tự động nhận diện chính xác kể cả khi khách hàng đổi tên tiêu đề cột.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
            title="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body: Fields List */}
        <div className="p-6 overflow-y-auto space-y-4 divide-y divide-slate-100 flex-1">
          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-800 flex items-start gap-2.5">
            <Sparkles className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Mẹo nhập từ khóa:</span> Nhập các tên cột có thể xuất hiện trong Excel, ngăn cách nhau bằng dấu phẩy <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">,</code> (không phân biệt chữ hoa, chữ thường hay dấu tiếng Việt). Sau khi lưu, cấu hình sẽ tự động đồng bộ lên Google Sheets để các máy khác dùng chung.
            </div>
          </div>

          {FIELDS.map(field => {
            const currentStr = inputValues[field.key] ?? (DEFAULT_HEADER_ALIASES_BANG_KE[field.key] || []).join(', ');
            const currentTags = currentStr.split(',').map(s => s.trim()).filter(Boolean);

            return (
              <div key={field.key} className="pt-4 first:pt-0 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-700">{field.label}</span>
                    {field.required && (
                      <span className="text-[10px] text-rose-500 font-semibold">*Bắt buộc</span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 italic">
                    {field.description}
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={currentStr}
                    onChange={(e) => handleInputChange(field.key, e.target.value)}
                    placeholder="Ví dụ: Lịch đăng, Lịch chạy, Thời gian chạy, Thời gian..."
                    className="w-full text-xs text-slate-700 bg-white border border-slate-300 rounded-lg px-3 py-2 shadow-xs focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none transition"
                  />
                </div>

                {/* Preview tags chips */}
                {currentTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {currentTags.map((tag, idx) => (
                      <span 
                        key={idx} 
                        className="inline-flex items-center gap-1 text-[11px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md font-medium"
                      >
                        <Tag className="h-2.5 w-2.5 text-slate-400" />
                        <span>{tag}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/80">
          <button
            type="button"
            onClick={handleResetDefault}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg font-medium transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Khôi phục mặc định</span>
          </button>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-lg transition"
            >
              Hủy
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center space-x-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-sm hover:shadow transition disabled:opacity-50 cursor-pointer"
            >
              {saveSuccess ? (
                <>
                  <Check className="h-4 w-4 text-emerald-300" />
                  <span>Đã lưu & đồng bộ!</span>
                </>
              ) : isSaving ? (
                <>
                  <CloudUpload className="h-4 w-4 animate-bounce" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Lưu & Đồng bộ Google Sheets</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

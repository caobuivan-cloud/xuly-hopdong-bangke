/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BarChart3, HelpCircle, FileText, CheckCircle2, Calculator, FileSpreadsheet, 
  Download, AlertTriangle, XCircle, Search, Trash2, Check, ArrowRight, UserCheck, 
  Settings, RefreshCw, ChevronLeft, ChevronRight, Info, Eye, Sparkles, Filter, 
  Layers
} from 'lucide-react';
import { 
  ContractSettings, UploadedFileData, CustomerMaster, DepartmentMaster, ProductMaster,
  BangKeTemplateId 
} from '../types';
import ExcelUpload from './ExcelUpload';
import { exportToExcel } from '../utils/excel';
import { buildFastImportRows, filterFastImportEligibleRows } from '../utils/fastImport';
import { 
  normalizeText, lookupExact, keywordMatch, applyExceptionRules, parseNumber,
  parsePostingDateRange, parseContractDateFromBooking, buildFastContractLookup,
  getRawCellValue, lookupFastContractByBooking, buildGhiChuChiTietIdempotent
} from '../utils/businessLogic';
import { 
  detectBangKeTemplate, getBangKeTemplateHandler, getAllBangKeTemplates 
} from '../utils/bangKeTemplates';
import { dbService, writeActionLogToSheet } from '../services/dbService';
import ConfirmModal from './ConfirmModal';
import BangKeHeaderMappingModal from './BangKeHeaderMappingModal';
import { DEFAULT_HEADER_ALIASES_BANG_KE } from '../utils/businessLogic';

interface BangKeViewProps {
  id?: string;
  config: ContractSettings;
  onHeaderActionsChange?: (actions: React.ReactNode | null) => void;
  onSaveConfig?: (updated: ContractSettings) => void;
  onManualPush?: (currentConfig: ContractSettings) => Promise<any>;
}

const FIELD_LABELS: Record<string, string> = {
  maBooking: 'Mã booking',
  lichDang: 'Lịch đăng',
  maKhach: 'Mã khách',
  boPhanThucHien: 'Bộ phận thực hiện',
  maVv: 'Mã vụ việc',
  sanPhamImport: 'Sản phẩm import',
  thueSuat: 'Thuế suất',
  thanhTienSauCk: 'Thành tiền sau CK',
  tkDoanhThu: 'TK doanh thu',
};

function TooltipIcon({ children, tooltip }: { children: React.ReactNode; tooltip: string }) {
  return (
    <span className="relative inline-flex items-center group">
      {children}
      <span className="pointer-events-none absolute left-full top-1/2 z-[120] ml-2 hidden w-72 -translate-y-1/2 whitespace-normal rounded-md bg-slate-900 px-2.5 py-1.5 text-left text-[10px] font-medium leading-snug text-white shadow-lg group-hover:block">
        {tooltip}
      </span>
    </span>
  );
}

const mergeUploadedFiles = (files: UploadedFileData[], label: string): UploadedFileData | null => {
  if (files.length === 0) return null;
  const headers = new Set<string>();
  const rows: Record<string, any>[] = [];
  files.forEach((file) => {
    const primarySheet = file.sheets[0];
    if (!primarySheet) return;
    primarySheet.headers.forEach((header) => headers.add(header));
    primarySheet.rows.forEach((row) => rows.push({ ...row, __sourceFile: file.fileName }));
  });
  
  const firstSheet = files[0]?.sheets[0];
  
  return {
    fileName: files.length === 1 ? files[0].fileName : `${label} (${files.length} file)`,
    fileSize: files.reduce((total, file) => total + file.fileSize, 0),
    uploadedAt: files[0].uploadedAt,
    sheets: [{ 
      sheetName: label, 
      headers: Array.from(headers), 
      rows,
      merges: firstSheet?.merges,
      headerRowIndex: firstSheet?.headerRowIndex,
      rawArray: firstSheet?.rawArray,
    }],
  };
};

export default function BangKeView({
  id = 'bang-ke-view',
  config,
  onHeaderActionsChange,
  onSaveConfig,
  onManualPush,
}: BangKeViewProps) {
  // Master data lists
  const [customers, setCustomers] = useState<CustomerMaster[]>([]);
  const [departments, setDepartments] = useState<DepartmentMaster[]>([]);
  const [products, setProducts] = useState<ProductMaster[]>([]);
  const [loadingMaster, setLoadingMaster] = useState(true);

  // Modal configuration for header mapping
  const [showHeaderMappingModal, setShowHeaderMappingModal] = useState(false);

  // Files uploaded by user
  const [fileBangKeList, setFileBangKeList] = useState<UploadedFileData[]>([]);
  const [fileFastList, setFileFastList] = useState<UploadedFileData[]>([]);

  // Processed table rows & message states
  const [processedRows, setProcessedRows] = useState<Record<string, any>[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{ title: string; message: string; type?: 'info' | 'warning' | 'danger'; onConfirm: () => void } | null>(null);

  // Search query & filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'DATE_ERROR' | 'MISSING_FAST' | 'MISSING_VV'>('ALL');
  const [vvConfidenceRange, setVvConfidenceRange] = useState({ from: '', to: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;

  const fileBangKe = useMemo(() => mergeUploadedFiles(fileBangKeList, 'Bảng kê chi tiết'), [fileBangKeList]);
  const fileFast = useMemo(() => mergeUploadedFiles(fileFastList, 'Danh sách hợp đồng Fast'), [fileFastList]);

  const fastLookupMap = useMemo(() => {
    const sheetFast = fileFast && fileFast.sheets.length > 0 ? fileFast.sheets[0] : null;
    return sheetFast ? buildFastContractLookup(sheetFast.rows) : new Map();
  }, [fileFast]);

  const appendUploadedFiles = (
    incomingFiles: UploadedFileData[],
    setter: React.Dispatch<React.SetStateAction<UploadedFileData[]>>
  ) => {
    if (!incomingFiles || incomingFiles.length === 0) return;

    const action = () => {
      // Bổ sung id duy nhất và auto-detect template cho bảng kê
      const enrichedNewFiles = incomingFiles.map(file => {
        const fileId = file.id || `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        let templateId = file.templateId;
        if (!templateId && setter === setFileBangKeList && file.sheets.length > 0) {
          templateId = detectBangKeTemplate(file.sheets[0]);
        }
        return {
          ...file,
          id: fileId,
          templateId,
        };
      });

      setter(prevFiles => {
        // Lọc tránh trùng lặp file (cùng tên và cùng kích thước)
        const nonDuplicateFiles = enrichedNewFiles.filter(newF => 
          !prevFiles.some(existing => existing.fileName === newF.fileName && existing.fileSize === newF.fileSize)
        );

        if (nonDuplicateFiles.length === 0) {
          return prevFiles;
        }

        const updated = [...prevFiles, ...nonDuplicateFiles];
        const isFast = setter === setFileFastList;
        const typeStr = isFast ? "Danh sách hợp đồng Fast" : "Bảng kê chi tiết";
        const fileNames = nonDuplicateFiles.map(f => f.fileName).join(', ');
        writeActionLogToSheet(
          `Thêm file ${typeStr}`,
          `Đã bổ sung ${nonDuplicateFiles.length} tệp: ${fileNames} (Tổng: ${updated.length} tệp)`
        );
        return updated;
      });

      setProcessedRows(null);
    };

    if (processedRows) {
      setConfirmConfig({
        title: 'Xác nhận bổ sung file',
        message: 'Dữ liệu đã xử lý và các thay đổi thủ công trên bảng sẽ được làm mới khi thêm file mới. Bạn có chắc chắn muốn bổ sung file vào danh sách không?',
        type: 'warning',
        onConfirm: action
      });
    } else {
      action();
    }
  };

  const clearUploadedFiles = (
    setter: React.Dispatch<React.SetStateAction<UploadedFileData[]>>
  ) => {
    const action = () => {
      setter(() => []);
      setProcessedRows(null);
      const isFast = setter === setFileFastList;
      const typeStr = isFast ? "Danh sách hợp đồng Fast" : "Bảng kê chi tiết";
      writeActionLogToSheet(`Xóa tất cả file ${typeStr}`, `Đã dọn dẹp toàn bộ danh sách file ${typeStr}`);
    };

    if (processedRows) {
      setConfirmConfig({
        title: 'Xác nhận xóa tất cả file',
        message: 'Tất cả file đã chọn và dữ liệu bảng kê đã xử lý sẽ bị xóa. Bạn có chắc chắn không?',
        type: 'danger',
        onConfirm: action
      });
    } else {
      action();
    }
  };

  const updateFileTemplate = (fileId: string, newTemplateId: BangKeTemplateId) => {
    setFileBangKeList(prev => prev.map(f => {
      if (f.id === fileId) {
        return { ...f, templateId: newTemplateId };
      }
      return f;
    }));
    setProcessedRows(null);
  };

  const removeUploadedFile = (
    index: number,
    setter: React.Dispatch<React.SetStateAction<UploadedFileData[]>>
  ) => {
    const action = () => {
      setter((files) => {
        const removedFile = files[index];
        if (removedFile) {
          const isFast = setter === setFileFastList;
          const typeStr = isFast ? "Danh sách hợp đồng Fast" : "Bảng kê chi tiết";
          writeActionLogToSheet(
            `Xóa file ${typeStr}`,
            `Xóa tệp: ${removedFile.fileName}`
          );
        }
        return files.filter((_, fileIndex) => fileIndex !== index);
      });
      setProcessedRows(null);
    };

    if (processedRows) {
      setConfirmConfig({
        title: 'Xác nhận xóa file',
        message: 'Dữ liệu đã xử lý và các thay đổi thủ công trên bảng sẽ bị mất nếu tiếp tục. Bạn có chắc chắn muốn thay đổi danh sách file không?',
        type: 'warning',
        onConfirm: action
      });
    } else {
      action();
    }
  };

  // Active inputs autocomplete manager state
  const [activeAutocomplete, setActiveAutocomplete] = useState<{
    rowId: string;
    field: 'maVv' | 'maKhach' | 'boPhanThucHien' | 'sanPhamImport' | 'tkDoanhThu';
    searchQuery: string;
  } | null>(null);

  // Dropdown ref for handling outside clicks
  const autocompleteContainerRef = useRef<HTMLDivElement | null>(null);

  // Load masters on load
  useEffect(() => {
    async function loadMasters() {
      try {
        const c = await dbService.getCustomers();
        const d = await dbService.getDepartments();
        const p = await dbService.getProducts();
        setCustomers(c);
        setDepartments(d);
        setProducts(p);
      } catch (err) {
        console.error('Lỗi khi tải Master Data trong BangKeView:', err);
      } finally {
        setLoadingMaster(false);
      }
    }
    loadMasters();
  }, []);

  // Handle click outside autocomplete helper
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        autocompleteContainerRef.current && 
        !autocompleteContainerRef.current.contains(event.target as Node)
      ) {
        setActiveAutocomplete(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Flex cell value helper with fallback
  const getCellValue = (row: any, ...candidates: string[]): string => {
    const keys = Object.keys(row);
    // Exact check
    for (const cand of candidates) {
      if (row[cand] !== undefined) return String(row[cand]);
      const found = keys.find(k => k.trim().toLowerCase() === cand.trim().toLowerCase());
      if (found) return String(row[found]);
    }
    // Normalized check
    const strippedCands = candidates.map(c => normalizeText(c));
    for (const key of keys) {
      if (strippedCands.includes(normalizeText(key))) {
        return String(row[key]);
      }
    }
    return '';
  };

  // Dynamic header cell value extractor using configured aliases
  const getFieldValue = (row: any, fieldKey: string, fallbackCandidates: string[] = []): string => {
    const configuredAliases = config.headerAliasesBangKe?.[fieldKey];
    const defaultAliases = DEFAULT_HEADER_ALIASES_BANG_KE[fieldKey] || [];
    const candidates = Array.from(new Set([
      ...(configuredAliases || []),
      ...defaultAliases,
      ...fallbackCandidates,
    ])).filter(Boolean);

    return getCellValue(row, ...candidates);
  };

  // Run business mapping logic on uploaded datasets
  const handleProcessBangKe = () => {
    if (isProcessing) return;

    if (!fileBangKeList || fileBangKeList.length === 0) {
      setErrorMessage('Vui lòng tải lên ít nhất một "File Bảng kê" trước khi thực hiện hạch toán.');
      return;
    }

    setIsProcessing(true);
    window.setTimeout(() => {
      try {
        setErrorMessage(null);
        const sheetFast = fileFast && fileFast.sheets.length > 0 ? fileFast.sheets[0] : null;

        // Pre-normalize products master list to avoid millions of heavy normalizeText calls inside loop
        const preNormalizedProducts = products.map(p => ({
          ...p,
          __normKeyword: normalizeText(p.keyword)
        }));

        const suffix = config.contractSuffix || 'AD';
        const separator = config.contractNameSeparator !== undefined ? config.contractNameSeparator : '/';

        const allMappedRows: any[] = [];
        let globalRowIndex = 0;

        // Xử lý độc lập từng file theo templateId của file đó
        for (const fileItem of fileBangKeList) {
          const sheetBangKe = fileItem.sheets[0];
          if (!sheetBangKe) continue;

          const fileTemplateId: BangKeTemplateId = fileItem.templateId || 'STANDARD';
          const templateHandler = getBangKeTemplateHandler(fileTemplateId);

          // 1. Quét thuế suất toàn sheet từ dòng VAT nếu có (chỉ nhận diện tỷ lệ thuế hợp lệ: 0 <= rate <= 100)
          let sheetWideTaxRate: number | null = null;
          sheetBangKe.rows.forEach((r) => {
            const combinedRowText = Object.values(r).map(String).join(' ').toLowerCase();
            // Bỏ qua các dòng tổng cộng tiền (e.g. "tổng cộng gồm vat", "chưa vat", "tiền vat")
            if (combinedRowText.includes('tổng cộng') || combinedRowText.includes('tong cong') || combinedRowText.includes('chưa vat') || combinedRowText.includes('chua vat')) {
              return;
            }
            if (combinedRowText.includes('vat') || combinedRowText.includes('gtgt') || combinedRowText.includes('thuế') || combinedRowText.includes('thue')) {
              // Ưu tiên định dạng có dấu %: e.g. "VAT 8%", "Thuế 10%"
              const matchPercent = combinedRowText.match(/(?:vat|gtgt|thuế|thue)?[^\d%]{0,10}(\d{1,2})\s*%/i);
              if (matchPercent) {
                const parsedRate = Number(matchPercent[1]);
                if (parsedRate >= 0 && parsedRate <= 100) {
                  sheetWideTaxRate = parsedRate;
                }
              } else {
                // Khớp "VAT 8", "VAT 10", "GTGT 8" (chỉ lấy số 1 hoặc 2 chữ số)
                const matchVatNum = combinedRowText.match(/(?:vat|gtgt)\s*(\d{1,2})\b/i);
                if (matchVatNum) {
                  const parsedRate = Number(matchVatNum[1]);
                  if (parsedRate >= 0 && parsedRate <= 100) {
                    sheetWideTaxRate = parsedRate;
                  }
                }
              }
            }
          });

          // 2. Unmerge & forward-fill data for vertical merges (except booking column)
          const merges = sheetBangKe.merges || [];
          const headerIndex = sheetBangKe.headerRowIndex ?? 0;
          const rawHeaders = Array.isArray(sheetBangKe.rawArray?.[headerIndex]) 
            ? sheetBangKe.rawArray[headerIndex] 
            : (sheetBangKe.headers || []);

          // Identify booking column indices to never forward-fill booking
          const bookingColIndices = new Set<number>();
          rawHeaders.forEach((h: any, colIdx: number) => {
            const norm = normalizeText(h);
            if (['ma booking', 'booking', 'so booking', 'ma book', 'hop dong'].some(k => norm.includes(k))) {
              bookingColIndices.add(colIdx);
            }
          });
          bookingColIndices.add(1); // Standard Column B is Ma booking

          // Clone rows to avoid direct mutation of sheet data while filling values
          const preparedRows = sheetBangKe.rows.map(r => ({
            ...r,
            __cells: Array.isArray(r.__cells) ? [...r.__cells] : []
          }));

          merges.forEach((m: any) => {
            if (m.e.r > m.s.r) {
              for (let c = m.s.c; c <= m.e.c; c++) {
                if (bookingColIndices.has(c)) continue; // Do NOT forward-fill booking code

                const topRowIndex = m.s.r - (headerIndex + 1);
                if (topRowIndex < 0 || topRowIndex >= preparedRows.length) continue;

                const topRow = preparedRows[topRowIndex];
                const headerKey = rawHeaders[c] || Object.keys(topRow).find(k => !k.startsWith('__') && topRow[k] !== undefined);
                const topVal = (topRow.__cells && topRow.__cells[c] !== undefined && topRow.__cells[c] !== '')
                  ? topRow.__cells[c]
                  : (headerKey ? topRow[headerKey] : '');

                if (topVal !== undefined && topVal !== null && String(topVal).trim() !== '') {
                  for (let r = m.s.r + 1; r <= m.e.r; r++) {
                    const targetRowIdx = r - (headerIndex + 1);
                    if (targetRowIdx >= 0 && targetRowIdx < preparedRows.length) {
                      const targetRow = preparedRows[targetRowIdx];
                      if (targetRow.__cells) {
                        targetRow.__cells[c] = topVal;
                      }
                      if (headerKey) {
                        targetRow[headerKey] = topVal;
                      }
                    }
                  }
                }
              }
            }
          });

          // 3. Lọc dòng đến dòng Tổng
          const filteredRowsForTable: any[] = [];
          const isSequenceNumber = (val: any): boolean => {
            if (val === null || val === undefined) return false;
            const s = String(val).trim();
            if (s === '') return false;
            return /^\d+(\.0+)?$/.test(s);
          };

          for (let i = 0; i < preparedRows.length; i++) {
            const row = preparedRows[i];
            const rIdx = headerIndex + 1 + i;

            const hasHorizontalMerge = merges.some((m: any) => 
              rIdx >= m.s.r && rIdx <= m.e.r && m.s.c === 0 && m.e.c >= 2
            );
            if (hasHorizontalMerge) break;

            const colAValue = (row.__cells && row.__cells.length > 0) ? row.__cells[0] : '';
            const sttValue = getCellValue(row, 'STT', 'stt', 'No').trim();

            const isColANum = isSequenceNumber(colAValue);
            const isSttNum = isSequenceNumber(sttValue);

            if (!isColANum && !isSttNum) break;

            const normalizedVal = normalizeText(sttValue);
            let isTotalRow = false;
            if (
              normalizedVal === 'tong' ||
              normalizedVal === 'tong cong' ||
              normalizedVal === 'cong' ||
              normalizedVal === 'tong thanh tien' ||
              normalizedVal === 'tong cong thanh tien' ||
              normalizedVal === 'tong tien' ||
              normalizedVal === 'tong so tien' ||
              normalizedVal === 'tong gia tri' ||
              normalizedVal === 'tong thanh toan' ||
              normalizedVal === 'tong cong thanh toan' ||
              normalizedVal === 'cong thanh tien' ||
              normalizedVal === 'thanh tien' ||
              normalizedVal === 'cong cong' ||
              normalizedVal.startsWith('tong thanh tien') ||
              normalizedVal.startsWith('tong cong') ||
              normalizedVal.startsWith('tong tien') ||
              normalizedVal.startsWith('tong so tien') ||
              normalizedVal.startsWith('tong gia tri') ||
              normalizedVal.startsWith('tong thanh toan') ||
              normalizedVal.startsWith('tong cong thanh toan') ||
              normalizedVal === 'to ng' ||
              normalizedVal === 'to ng co ng' ||
              normalizedVal === 'co ng' ||
              normalizedVal === 'to ng tha nh tie n' ||
              normalizedVal === 'to ng co ng tha nh tie n' ||
              normalizedVal === 'to ng tie n' ||
              normalizedVal === 'to ng so tie n' ||
              normalizedVal === 'to ng gia tri' ||
              normalizedVal === 'to ng tha nh toan' ||
              normalizedVal === 'to ng co ng tha nh toan' ||
              normalizedVal === 'co ng tha nh tie n' ||
              normalizedVal === 'tha nh tie n' ||
              normalizedVal === 'co ng co ng' ||
              normalizedVal.startsWith('to ng tha nh tie n') ||
              normalizedVal.startsWith('to ng co ng') ||
              normalizedVal.startsWith('to ng tie n') ||
              normalizedVal.startsWith('to ng so tie n') ||
              normalizedVal.startsWith('to ng gia tri') ||
              normalizedVal.startsWith('to ng tha nh toan') ||
              normalizedVal.startsWith('to ng co ng tha nh toan')
            ) {
              isTotalRow = true;
            }

            if (isTotalRow) break;
            filteredRowsForTable.push(row);
          }

          // Auto Data Pattern Sampling cho lịch đăng nếu cần
          let autoDetectedLichDangKey: string | null = null;
          if (filteredRowsForTable.length > 0) {
            const sampleRows = filteredRowsForTable.slice(0, 3);
            const sampleKeys = Object.keys(filteredRowsForTable[0] || {});
            
            const isDatePatternValue = (val: any): boolean => {
              if (!val) return false;
              const s = String(val).trim();
              return (
                /^\d{1,2}\/\d{1,2}\/\d{2,4}\s*[-–~to|den]+\s*\d{1,2}\/\d{1,2}\/\d{2,4}/i.test(s) ||
                /^\d{1,2}\s*[-–~]\s*\d{1,2}\/\d{1,2}\/\d{2,4}/i.test(s) ||
                /^\d{1,2}\/\d{1,2}\s*[-–~]\s*\d{1,2}\/\d{1,2}\/\d{2,4}/i.test(s) ||
                /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s)
              );
            };

            for (const key of sampleKeys) {
              if (key.startsWith('__EMPTY') || key.toLowerCase() === 'stt') continue;
              let matchCount = 0;
              for (const r of sampleRows) {
                if (isDatePatternValue(r[key])) {
                  matchCount++;
                }
              }
              if (matchCount >= 1) {
                autoDetectedLichDangKey = key;
                break;
              }
            }
          }

          // 4. Map từng row qua Adapter của Template
          for (let rowIndex = 0; rowIndex < filteredRowsForTable.length; rowIndex++) {
            const rawRow = filteredRowsForTable[rowIndex];
            
            // Chạy qua transformRow của template tương ứng
            const normalized = templateHandler.transformRow(rawRow);
            if (!normalized) {
              // Row bị lọc bỏ (ví dụ WPP dòng tiền null hoặc <= 0)
              continue;
            }

            // Raw inputs extract fallback
            const sttCol = normalized.stt ? String(normalized.stt) : getFieldValue(rawRow, 'stt', ['STT', 'stt', 'No']).trim();
            const maBooking = normalized.maBooking || getRawCellValue(rawRow, 1) || getFieldValue(rawRow, 'maBooking', ['Mã booking', 'Ma booking', 'Booking']).trim();
            const soHt = normalized.soHt || getFieldValue(rawRow, 'soHt', ['Số HT', 'So HT', 'HT', 'Hệ thống']).trim();
            const nhan = getFieldValue(rawRow, 'nhan', ['Nhãn', 'Nhan', 'Brand', 'Thương hiệu']).trim();
            const noiDungQuangCao = normalized.noiDung || getFieldValue(rawRow, 'noiDungQuangCao', ['Nội dung quảng cáo', 'Noi dung quang cao', 'Nội dung', 'Diễn giải']).trim();
            const chiTiet = normalized.chuyenTrang || getFieldValue(rawRow, 'chiTiet', ['Chi tiết', 'Chi tiet', 'Chi tiết chạy']).trim();
            
            let lichDang = normalized.lichDang || getFieldValue(rawRow, 'lichDang', ['Lịch đăng', 'Lich dang', 'Lịch chạy', 'Lich chay', 'Thời gian chạy', 'Thoi gian chay', 'Thời gian', 'Thoi gian']).trim();
            if (!lichDang && autoDetectedLichDangKey && rawRow[autoDetectedLichDangKey] !== undefined) {
              lichDang = String(rawRow[autoDetectedLichDangKey]).trim();
            }

            const donViTinh = getFieldValue(rawRow, 'donViTinh', ['Đơn vị tính', 'Don vi tinh', 'ĐVT', 'DVT']).trim();
            const soLuongRaw = normalized.soLuong !== undefined ? String(normalized.soLuong) : getFieldValue(rawRow, 'soLuong', ['Số lượng', 'So luong', 'Qty']).trim();
            const donGiaRaw = normalized.donGia !== undefined ? String(normalized.donGia) : getFieldValue(rawRow, 'donGia', ['Đơn giá', 'Don gia', 'Price']).trim();
            const chietKhauRaw = normalized.chietKhau !== undefined ? String(normalized.chietKhau) : getFieldValue(rawRow, 'chietKhau', ['Chiết khấu', 'Chiet khau', 'CK']).trim();
            const ghiChuCol = getFieldValue(rawRow, 'ghiChu', ['Ghi chú', 'Ghi chu', 'Note']).trim();

            const maHopDong = maBooking ? `${maBooking}${suffix}` : '';
            const tenHopDong = maBooking ? `${maBooking}${separator}${suffix}` : '';

            // Fast contract lookup
            let existsInFast = false;
            let fastStatus = '';
            let fastMaKhach = '';
            let fastBoPhanThucHien = '';
            let fastGhiChu = '';

            if (sheetFast) {
              const match = lookupFastContractByBooking(fastLookupMap, maBooking);
              if (match) {
                existsInFast = true;
                fastStatus = match.fastStatus;
                fastMaKhach = match.fastMaKhach;
                fastBoPhanThucHien = match.fastBoPhanThucHien;
                fastGhiChu = match.fastGhiChu;
              }
            }

            // Parse ngày đăng
            const parsedDateRange = parsePostingDateRange(lichDang);
            const formatDateDayLocal = (d: Date | null): string => {
              if (!d) return '';
              const day = String(d.getDate()).padStart(2, '0');
              const month = String(d.getMonth() + 1).padStart(2, '0');
              const year = d.getFullYear();
              return `${day}/${month}/${year}`;
            };
            const ngayBatDau = formatDateDayLocal(parsedDateRange.startDate);
            const ngayKetThuc = formatDateDayLocal(parsedDateRange.endDate);

            const parsedContractDate = parseContractDateFromBooking(maBooking);
            const ngayHopDong = parsedContractDate.text || '';

            // 5. Product lookup via Normalized Precedence (Ưu tiên normalized.lookupContent -> normalized.chuyenTrang -> noiDungQuangCao)
            const textToLookup = normalized.lookupContent || normalized.chuyenTrang || noiDungQuangCao;
            let matchResult = keywordMatch(textToLookup, preNormalizedProducts);
            // Fallback: nếu lookup theo textToLookup không tìm thấy mà có noiDungQuangCao khác biệt, thử lookup tiếp theo noiDungQuangCao
            if ((!matchResult.bestMatch || matchResult.status === 'KHONG_MATCH') && noiDungQuangCao && noiDungQuangCao !== textToLookup) {
              const fallbackMatch = keywordMatch(noiDungQuangCao, preNormalizedProducts);
              if (fallbackMatch.bestMatch && fallbackMatch.status !== 'KHONG_MATCH') {
                matchResult = fallbackMatch;
              }
            }
            const maVv = matchResult.maVV || '';
            const confidenceScore = matchResult.bestMatch ? matchResult.confidenceScore : 0;
            const matchStatus = matchResult.bestMatch ? matchResult.status : 'KHONG_MATCH';
            const sanPhamImport = matchResult.bestMatch?.tenSanPham || '';
            const tkDoanhThu = matchResult.bestMatch?.tkDoanhThu || '';

            // 6. Số lượng, Đơn giá, CK & Thành tiền sau CK
            const soLuong = parseNumber(soLuongRaw) || 0;
            const donGia = parseNumber(donGiaRaw) || 0;
            let chietKhau = parseNumber(chietKhauRaw) || 0;
            if ((chietKhau > 0 && chietKhau <= 1) || String(chietKhauRaw).includes('%')) {
              if (chietKhau > 0 && chietKhau <= 1) {
                chietKhau = Math.round(chietKhau * 100);
              }
            }

            // Ưu tiên thành tiền từ normalized (nguồn)
            let thanhTienSauCk = normalized.thanhTienSauCk !== undefined 
              ? normalized.thanhTienSauCk 
              : (parseNumber(getFieldValue(rawRow, 'thanhTienSauCk', ['Thành tiền sau chiết khấu (VNĐ)', 'Thành tiền sau chiết khấu', 'Thành tiền'])) || (soLuong * donGia * (1 - chietKhau / 100)));

            // 7. Thuế suất & Giá trị vv VAT (Áp dụng Unified Money/Tax Contract)
            let thueSuat = config.taxRate;
            if (sheetWideTaxRate !== null) {
              thueSuat = sheetWideTaxRate;
            } else if (matchResult.bestMatch && matchResult.bestMatch.thueSuat !== undefined && matchResult.bestMatch.thueSuat !== '') {
              thueSuat = parseNumber(matchResult.bestMatch.thueSuat);
            } else {
              const rawRowThueSuat = getCellValue(rawRow, 'Thuế suất', 'Thue suat', 'VAT', 'Tỷ lệ VAT').trim();
              if (rawRowThueSuat) {
                thueSuat = parseNumber(rawRowThueSuat);
              }
            }

            const taxRateMultiplier = thueSuat > 1 ? thueSuat / 100 : thueSuat;
            const thueSuatVal = thueSuat > 1 ? thueSuat : thueSuat * 100;
            
            // Công thức thuế thống nhất: dựa trực tiếp trên thanhTienSauCk
            const giaTriCuaVvVat = Math.round(thanhTienSauCk * (1 + taxRateMultiplier));

            const tyLeCk = chietKhau;

            // Chuyên trang — Ưu tiên exception rules, sau đó đến normalized.chuyenTrang
            let exceptionText = applyExceptionRules(textToLookup, config.exceptionRules);
            const chuyenTrang = exceptionText || normalized.chuyenTrang || noiDungQuangCao || '';

            // Ghi chú chi tiết idempotent
            const ghiChuChiTiet = soHt ? buildGhiChuChiTietIdempotent(soHt, separator, suffix) : '';

            allMappedRows.push({
              id: `bk_row_${globalRowIndex++}_${Date.now()}`,
              sttOriginal: sttCol || String(rowIndex + 1),
              maBooking,
              soHt,
              nhan,
              noiDungQuangCao,
              chiTiet,
              lichDang,
              donViTinh,
              soLuong,
              donGia,
              chietKhauRaw: chietKhauRaw,
              thanhTienSauCk,
              ghiChuCol,

              maHopDong,
              tenHopDong,
              bangKe: maBooking,
              existsInFast,
              fastStatus,
              maKhach: fastMaKhach || '',
              boPhanThucHien: fastBoPhanThucHien || '',
              fastGhiChu: fastGhiChu || '',

              ngayBatDau,
              ngayKetThuc,
              ngayHopDong,

              maVv,
              confidenceScore,
              matchStatus,
              sanPhamImport,
              tkDoanhThu,
              thueSuat: thueSuatVal,
              giaTriCuaVvVat,
              tyLeCk,
              chuyenTrang,
              ghiChuChiTiet,
              status: 1, // Bảng kê Status = 1

              __sourceFile: fileItem.fileName,
              __templateId: fileTemplateId,

              ngayHd1: '',
              ngayHd2: '',
              ngayHd3: '',
              ngayHd4: '',
              ngayHd5: '',
              ngayHd6: '',
              tienHd1: '',
              tienHd2: '',
              tienHd3: '',
              tienHd4: '',
              tienHd5: '',
              tienHd6: '',
            });
          }
        }

        setProcessedRows(allMappedRows);
        setCurrentPage(1);
        writeActionLogToSheet(
          'Xử lý bảng kê',
          `Xử lý thành công ${allMappedRows.length} dòng dữ liệu từ ${fileBangKeList.length} file.`
        );
      } catch (err: any) {
        setErrorMessage(err?.message || 'Có lỗi xảy ra khi xử lý dữ liệu.');
      } finally {
        window.setTimeout(() => setIsProcessing(false), 450);
      }
    }, 0);
  };


  // Autocomplete change side effects
  const handleUpdateField = (rowId: string, field: string, value: any) => {
    if (!processedRows) return;
    const row = processedRows.find(r => r.id === rowId);
    const oldVal = row ? row[field] : '';
    const updated = processedRows.map(row => {
      if (row.id !== rowId) return row;
      const newRow = { ...row, [field]: value };
      newRow.manualChanges = {
        ...(row.manualChanges || {}),
        [field]: true,
      };

      if (field === 'maVv') {
        const foundProd = products.find(p => p.maVuViec === value);
        if (foundProd) {
          newRow.sanPhamImport = foundProd.tenSanPham;
          newRow.tkDoanhThu = foundProd.tkDoanhThu;
          
          let parsedThue = config.taxRate;
          if (foundProd.thueSuat !== undefined && foundProd.thueSuat !== '') {
            parsedThue = parseNumber(foundProd.thueSuat);
          }
          newRow.thueSuat = parsedThue > 1 ? parsedThue : parsedThue * 100;
          newRow.confidenceScore = 100;
          newRow.matchStatus = 'OK';
          
          const multiplier = parsedThue > 1 ? parsedThue / 100 : parsedThue;
          newRow.giaTriCuaVvVat = Math.round(newRow.thanhTienSauCk * (1 + multiplier));
        }
      }

      if (field === 'sanPhamImport') {
        const foundProd = products.find(p => p.tenSanPham === value);
        if (foundProd) {
          newRow.maVv = foundProd.maVuViec;
          newRow.tkDoanhThu = foundProd.tkDoanhThu;
          
          let parsedThue = config.taxRate;
          if (foundProd.thueSuat !== undefined && foundProd.thueSuat !== '') {
            parsedThue = parseNumber(foundProd.thueSuat);
          }
          newRow.thueSuat = parsedThue > 1 ? parsedThue : parsedThue * 100;
          newRow.confidenceScore = 100;
          newRow.matchStatus = 'OK';

          const multiplier = parsedThue > 1 ? parsedThue / 100 : parsedThue;
          newRow.giaTriCuaVvVat = Math.round(newRow.thanhTienSauCk * (1 + multiplier));
        }
      }

      if (field === 'thueSuat') {
        const parsedThue = parseNumber(value);
        newRow.thueSuat = parsedThue;
        const multiplier = parsedThue > 1 ? parsedThue / 100 : parsedThue;
        newRow.giaTriCuaVvVat = Math.round(newRow.thanhTienSauCk * (1 + multiplier));
      }

      if (field === 'thanhTienSauCk') {
        const parsedVal = parseNumber(value);
        newRow.thanhTienSauCk = parsedVal;
        const multiplier = newRow.thueSuat > 1 ? newRow.thueSuat / 100 : newRow.thueSuat;
        newRow.giaTriCuaVvVat = Math.round(parsedVal * (1 + multiplier));
      }

      if (field === 'lichDang') {
        const parsedDates = parsePostingDateRange(value);
        newRow.lichDang = value;
        
        const formatDateDayLocal = (d: Date | null): string => {
          if (!d) return '';
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          return `${day}/${month}/${year}`;
        };

        newRow.ngayBatDau = formatDateDayLocal(parsedDates.startDate);
        newRow.ngayKetThuc = formatDateDayLocal(parsedDates.endDate);
      }

      if (field === 'maBooking') {
        const suffix = config.contractSuffix || 'AD';
        const separator = config.contractNameSeparator !== undefined ? config.contractNameSeparator : '/';
        const cleanBooking = String(value || '').trim();
        newRow.maBooking = cleanBooking;
        newRow.maHopDong = cleanBooking ? `${cleanBooking}${suffix}` : '';
        newRow.tenHopDong = cleanBooking ? `${cleanBooking}${separator}${suffix}` : '';

        const parsedContractDate = parseContractDateFromBooking(cleanBooking);
        newRow.ngayHopDong = parsedContractDate.text || '';

        // EFR-01: Recompute Fast classification and related fields dynamically on edit
        let existsInFast = false;
        let fastStatus = '';
        let fastMaKhach = '';
        let fastBoPhanThucHien = '';
        let fastGhiChu = '';

        if (fastLookupMap && fastLookupMap.size > 0) {
          const match = lookupFastContractByBooking(fastLookupMap, cleanBooking);
          if (match) {
            existsInFast = true;
            fastStatus = match.fastStatus;
            fastMaKhach = match.fastMaKhach;
            fastBoPhanThucHien = match.fastBoPhanThucHien;
            fastGhiChu = match.fastGhiChu;
          }
        }

        newRow.existsInFast = existsInFast;
        newRow.fastStatus = fastStatus;
        newRow.maKhach = fastMaKhach || '';
        newRow.boPhanThucHien = fastBoPhanThucHien || '';
        newRow.fastGhiChu = fastGhiChu || '';
      }

      return newRow;
    });

    setProcessedRows(updated);

    if (row && String(oldVal) !== String(value)) {
      const fieldLabel = FIELD_LABELS[field] || field;
      const docCode = row.maBooking || row.maHopDong || `Dòng ${rowId}`;
      writeActionLogToSheet(
        'Sửa dòng bảng kê',
        `Thay đổi trường "${fieldLabel}" của booking "${docCode}" từ "${oldVal}" sang "${value}"`
      );
    }
  };

  // Autocomplete matcher options selector
  const autocompleteOptions = useMemo(() => {
    if (!activeAutocomplete) return [];
    const query = normalizeText(activeAutocomplete.searchQuery);

    if (activeAutocomplete.field === 'maVv') {
      return products.filter(p => 
        normalizeText(p.keyword).includes(query) || 
        normalizeText(p.maVuViec).includes(query) || 
        normalizeText(p.tenSanPham).includes(query)
      ).slice(0, 10);
    }

    if (activeAutocomplete.field === 'sanPhamImport') {
      return products.filter(p => 
        normalizeText(p.tenSanPham).includes(query) || 
        normalizeText(p.keyword).includes(query) || 
        normalizeText(p.maVuViec).includes(query)
      ).slice(0, 10);
    }

    if (activeAutocomplete.field === 'tkDoanhThu') {
      const matched = products.filter(p => 
        normalizeText(p.tkDoanhThu).includes(query) || 
        normalizeText(p.tenSanPham).includes(query)
      );
      const seen = new Set<string>();
      return matched.filter(p => {
        if (seen.has(p.tkDoanhThu)) return false;
        seen.add(p.tkDoanhThu);
        return true;
      }).slice(0, 10);
    }

    if (activeAutocomplete.field === 'maKhach') {
      return customers.filter(c => 
        normalizeText(c.tenKhach).includes(query) || 
        normalizeText(c.maKhach).includes(query)
      ).slice(0, 10);
    }

    if (activeAutocomplete.field === 'boPhanThucHien') {
      return departments.filter(d => 
        normalizeText(d.tenBoPhan).includes(query) || 
        normalizeText(d.maSale).includes(query)
      ).slice(0, 10);
    }

    return [];
  }, [activeAutocomplete, products, customers, departments]);

  // Filtering on criteria logic
  const filteredRows = useMemo(() => {
    if (!processedRows) return [];

    return processedRows.filter(row => {
      // 1. Diagnostics filter tab checks
      const isDateError = !row.ngayBatDau || !row.ngayKetThuc || !row.ngayHopDong;
      const isMissingFast = !row.existsInFast;
      const isMissingVv = !row.maVv || row.matchStatus === 'CAN_KIEM_TRA' || row.confidenceScore < 70;

      if (filterType === 'DATE_ERROR' && !isDateError) return false;
      if (filterType === 'MISSING_FAST' && !isMissingFast) return false;
      if (filterType === 'MISSING_VV' && !isMissingVv) return false;

      const rangeFrom = vvConfidenceRange.from === '' ? 0 : Math.max(0, Math.min(100, Number(vvConfidenceRange.from)));
      const rangeTo = vvConfidenceRange.to === '' ? 100 : Math.max(0, Math.min(100, Number(vvConfidenceRange.to)));
      const lowerConfidence = Math.min(rangeFrom, rangeTo);
      const upperConfidence = Math.max(rangeFrom, rangeTo);
      const rowConfidence = Number(row.confidenceScore || 0);
      if ((vvConfidenceRange.from !== '' || vvConfidenceRange.to !== '') && (rowConfidence < lowerConfidence || rowConfidence > upperConfidence)) return false;

      // 2. Search keyword checks
      if (searchTerm.trim()) {
        const query = normalizeText(searchTerm);
        const matchBooking = normalizeText(row.maBooking).includes(query);
        const matchHopDong = normalizeText(row.maHopDong).includes(query);
        const matchTenHd = normalizeText(row.tenHopDong).includes(query);
        const matchNhan = normalizeText(row.nhan).includes(query);
        const matchNoiDung = normalizeText(row.noiDungQuangCao).includes(query);
        const matchKhach = normalizeText(row.maKhach).includes(query);

        return matchBooking || matchHopDong || matchTenHd || matchNhan || matchNoiDung || matchKhach;
      }

      return true;
    });
  }, [processedRows, filterType, vvConfidenceRange, searchTerm]);

  // Pagination offsets bounding
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));

  // Compute live visual dashboard aggregates
  const stats = useMemo(() => {
    if (!processedRows) {
      return { total: 0, dateErrors: 0, missingFast: 0, missingVv: 0 };
    }

    let dateErrors = 0;
    let missingFast = 0;
    let missingVv = 0;

    processedRows.forEach(row => {
      if (!row.ngayBatDau || !row.ngayKetThuc || !row.ngayHopDong) {
        dateErrors++;
      }
      if (row.maBooking && !row.existsInFast) {
        missingFast++;
      }
      if (!row.maVv || row.matchStatus === 'CAN_KIEM_TRA' || row.confidenceScore < 70) {
        missingVv++;
      }
    });

    return { total: processedRows.length, dateErrors, missingFast, missingVv };
  }, [processedRows]);

  const handleExportFile = (type: 'new' | 'old') => {
    if (!processedRows || processedRows.length === 0) return;

    // Filter rows based on type
    // New: tenHopDong doesn't match in fastLookupMap OR matches but status is '2'
    // Old: matches in fastLookupMap and status is '1'
    const exportSubset = processedRows.filter(row => {
      const cleanBooking = String(row.maBooking || '').trim();
      const match = fastLookupMap && fastLookupMap.size > 0 ? lookupFastContractByBooking(fastLookupMap, cleanBooking) : null;
      if (type === 'new') {
        return !match || String(match.fastStatus).trim() === '2';
      } else {
        return match && String(match.fastStatus).trim() === '1';
      }
    });

    if (exportSubset.length === 0) {
      setConfirmConfig({
        title: 'Thông báo',
        message: `Không có dòng dữ liệu nào thuộc nhóm Hợp đồng ${type === 'new' ? 'MỚI' : 'CŨ'} để xuất khẩu.`,
        type: 'info',
        onConfirm: () => {}
      });
      return;
    }

    // Check for critical missing values or validation markings before exporting
    const hasWarnings = exportSubset.some(row => 
      !row.ngayBatDau || !row.ngayKetThuc || !row.ngayHopDong || 
      !row.maKhach || !row.maKhach.trim() ||
      !row.boPhanThucHien || !row.boPhanThucHien.trim() ||
      !row.maVv || !row.maVv.trim() ||
      row.matchStatus === 'CAN_KIEM_TRA' || row.confidenceScore < 70
    );

    const executeExport = () => {
      // Loại bỏ các dòng chiết khấu 100% hoặc VAT rỗng/bằng 0 theo quy định chuẩn FAST
      const validRows = filterFastImportEligibleRows(exportSubset);
      if (validRows.length === 0) {
        setConfirmConfig({
          title: 'Thông báo',
          message: `Tất cả ${exportSubset.length} dòng thuộc nhóm Hợp đồng ${type === 'new' ? 'MỚI' : 'CŨ'} đều có Chiết khấu 100% hoặc Giá trị VAT = 0 nên không có dữ liệu để xuất khẩu.`,
          type: 'info',
          onConfirm: () => {}
        });
        return;
      }

      // Build output rows with status = 1 (FAST Accounting requirement)
      const outputData = buildFastImportRows(validRows, { status: 1, sttMode: 'sequential' });

      // Generate file name with current date: import_hop_dong_moi_YYYY-MM-DD.xlsx / import_hop_dong_cu_YYYY-MM-DD.xlsx
      const todayStr = new Date().toISOString().split('T')[0];
      const targetFileName = type === 'new' 
        ? `import_hop_dong_moi_${todayStr}.xlsx` 
        : `import_hop_dong_cu_${todayStr}.xlsx`;

      exportToExcel(
        [{ sheetName: type === 'new' ? 'HĐ Mới Import' : 'HĐ Cũ Import', data: outputData }],
        targetFileName
      );

      writeActionLogToSheet(
        'Xuất Excel bảng kê',
        `Xuất thành công tệp Excel [${targetFileName}] chứa ${validRows.length} dòng thuộc nhóm ${type === 'new' ? 'Hợp đồng mới' : 'Hợp đồng cũ'}.`
      );
    };

    if (hasWarnings) {
      setConfirmConfig({
        title: '⚠️ CẢNH BÁO PHÁT HIỆN LỖI HẠCH TOÁN',
        message: `Sổ xuất Excel ${type === 'new' ? 'Hợp đồng MỚI' : 'Hợp đồng CŨ'} chuẩn bị tải xuống có dòng gặp Lịch đăng sai định dạng, thiếu Mã vụ việc thâm căn, thiếu Mã khách hoặc nghi vấn độ chính xác (Confidence Score thấp).\n\nBạn có chắc chắn muốn xuất tệp Excel không?`,
        type: 'danger',
        onConfirm: executeExport
      });
    } else {
      executeExport();
    }
  };

  useEffect(() => {
    onHeaderActionsChange?.(
      <div className="flex items-center gap-2">
        {fileBangKe && (
          <button
            onClick={handleProcessBangKe}
            disabled={isProcessing}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-wait text-white text-xs font-bold rounded-full shadow-sm transition-all active:scale-[0.98]"
          >
            {isProcessing ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Calculator className="h-3.5 w-3.5" />
            )}
            <span>{isProcessing ? 'Đang xử lý' : 'Xử lý'}</span>
          </button>
        )}

        {processedRows && (
          <>
            <button
              type="button"
              onClick={() => handleExportFile('new')}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-full transition shadow-sm cursor-pointer"
              title="Xuất các HĐ không tồn tại trong FAST hoặc có trạng thái là 2"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Xuất HĐ mới</span>
            </button>
            <button
              type="button"
              onClick={() => handleExportFile('old')}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-full transition shadow-sm cursor-pointer"
              title="Xuất các HĐ tồn tại trong FAST và có trạng thái là 1"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Xuất HĐ cũ</span>
            </button>
          </>
        )}
      </div>
    );

    return () => onHeaderActionsChange?.(null);
  }, [fileBangKe, fileFast, processedRows, isProcessing, products, config, onHeaderActionsChange, fastLookupMap]);

  return (
    <div id={id} className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4 gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center space-x-2">
            <Layers className="h-6 w-6 text-indigo-500" />
            <span>Xử lý bảng kê</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Hạch toán phân rã Bảng kê chi tiếp từ Ad-servers sang mã Vụ việc master, đồng bộ lookup thông tin Hợp đồng từ hệ thống Fast, parse khoảng ngày Lịch chạy tự do và xuất file kết quả.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowHeaderMappingModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 rounded-lg text-xs font-semibold shadow-2xs transition cursor-pointer"
            title="Tùy chỉnh từ khóa nhận diện tiêu đề cột trong bảng kê"
          >
            <Settings className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600" />
            <span>Cài đặt nhận diện cột</span>
          </button>
        </div>
      </div>

      {/* Dual Upload Sector Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Card 1: Bảng kê upload */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono flex items-center space-x-1.5">
              <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg font-bold">1</span>
              <span>Tải lên File Bảng kê chi tiết</span>
            </h3>
            {fileBangKe ? (
              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md px-2 py-0.5 font-bold font-mono">
                SẴN SÀNG
              </span>
            ) : (
              <span className="text-[10px] bg-indigo-55 bg-opacity-10 text-indigo-700 border border-indigo-100 rounded-md px-2 py-0.5 font-bold font-mono">
                BẮT BUỘC
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            Xem xét parse các mốc STT, Mã booking, Lịch đăng, Đơn giá, Chiết khấu, % Thuế suất và Thành tiền.
          </p>
          <ExcelUpload
            multiple
            compact
            showSuccessDetails={false}
            onUploadSuccess={(data) => {
              appendUploadedFiles([data], setFileBangKeList);
            }}
            onUploadManySuccess={(data) => {
              appendUploadedFiles(data, setFileBangKeList);
            }}
            onUploadError={(err) => setErrorMessage(err)}
            placeholderText="Kéo thả một hoặc nhiều File Bảng kê chi tiết vào đây hoặc click để chọn (chọn nhiều đợt/nhiều folder)"
          />
          {fileBangKeList.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                <span>File đã tải lên ({fileBangKeList.length})</span>
                <button
                  type="button"
                  onClick={() => clearUploadedFiles(setFileBangKeList)}
                  className="text-rose-500 hover:text-rose-700 hover:underline normal-case font-medium text-[10px]"
                >
                  Xóa tất cả
                </button>
              </div>
              <div className="space-y-1.5">
                {fileBangKeList.map((file, index) => {
                  const currentTemplate = file.templateId || 'STANDARD';
                  const allTemplates = getAllBangKeTemplates();
                  const fileKey = file.id || `${file.fileName}_${index}`;
                  return (
                    <div key={fileKey} className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50/70 px-2.5 py-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[11px] font-semibold text-slate-700" title={file.fileName}>
                          {file.fileName} <span className="text-slate-400 font-mono">({file.sheets[0]?.rows.length || 0} dòng)</span>
                        </div>
                      </div>

                      {/* Dropdown chọn mẫu độc lập cho từng file */}
                      <div className="flex items-center space-x-1.5 shrink-0">
                        <select
                          value={currentTemplate}
                          onChange={(e) => updateFileTemplate(file.id || fileKey, e.target.value as BangKeTemplateId)}
                          title="Chọn mẫu bảng kê áp dụng riêng cho file này"
                          className="text-[11px] font-medium bg-white border border-slate-300 rounded px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm"
                        >
                          {allTemplates.map(tmpl => (
                            <option key={tmpl.id} value={tmpl.id}>
                              {tmpl.name}
                            </option>
                          ))}
                        </select>
                        <button 
                          type="button" 
                          onClick={() => removeUploadedFile(index, setFileBangKeList)} 
                          title="Xóa file này khỏi danh sách xử lý" 
                          className="h-6 w-6 flex items-center justify-center rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Fast upload */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono flex items-center space-x-1.5">
              <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg font-bold">2</span>
              <span>Tải lên Danh sách hợp đồng Fast</span>
            </h3>
            {fileFast ? (
              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md px-2 py-0.5 font-bold font-mono">
                ĐÃ LIÊN KẾT
              </span>
            ) : (
              <span className="text-[10px] bg-slate-100 text-slate-450 border border-slate-200 rounded-md px-2 py-0.5 font-bold font-mono">
                KHÔNG BẮT BUỘC
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            Để đối chiếu lookup thông tin Trạng thái, Mã khách và Bộ phận thực hiện tự động bằng Tên hợp đồng.
          </p>
          <ExcelUpload
            multiple
            compact
            showSuccessDetails={false}
            onUploadSuccess={(data) => {
              appendUploadedFiles([data], setFileFastList);
            }}
            onUploadManySuccess={(data) => {
              appendUploadedFiles(data, setFileFastList);
            }}
            onUploadError={(err) => setErrorMessage(err)}
            placeholderText="Kéo thả một hoặc nhiều File Danh sách hợp đồng Fast vào đây hoặc click để chọn (chọn nhiều đợt/nhiều folder)"
          />
          {fileFastList.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                <span>File đã tải lên ({fileFastList.length})</span>
                <button
                  type="button"
                  onClick={() => clearUploadedFiles(setFileFastList)}
                  className="text-rose-500 hover:text-rose-700 hover:underline normal-case font-medium text-[10px]"
                >
                  Xóa tất cả
                </button>
              </div>
              <div className="space-y-1">
                {fileFastList.map((file, index) => (
                  <div key={`${file.fileName}_${index}`} className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50/70 px-2.5 py-1.5">
                    <div className="min-w-0">
                      <div className="truncate text-[11px] font-semibold text-slate-700" title={file.fileName}>
                        {file.fileName} <span className="text-slate-400 font-mono">({file.sheets[0]?.rows.length || 0} dòng)</span>
                      </div>
                    </div>
                    <button type="button" onClick={() => removeUploadedFile(index, setFileFastList)} title="Xóa file này khỏi danh sách đối soát Fast" className="h-6 w-6 flex items-center justify-center rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-150 p-4 rounded-xl text-rose-800 text-xs flex items-start space-x-2.5">
          <XCircle className="h-5 w-5 text-rose-500 mt-0.5 flex-shrink-0" />
          <p className="font-medium">{errorMessage}</p>
        </div>
      )}

      {isProcessing && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-indigo-700 text-xs font-bold flex items-center gap-2 shadow-sm">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Đang xử lý dữ liệu Excel...</span>
        </div>
      )}

      {/* Main interactive grid area */}
      {processedRows && (
        <div className="space-y-6 animate-fade-in">
          {/* Interactive filter and search controls ribbon */}
          <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-4.5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            
            {/* Left filtration panel */}
            <div className="flex flex-wrap items-center gap-3">
              
              {/* Search text filter */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Mã booking, Hợp đồng, nội dung..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-slate-800 border border-slate-700 text-xs px-3.5 pl-9 py-2 rounded-lg text-white w-56 focus:outline-none focus:border-indigo-500 placeholder-slate-450 font-medium"
                />
              </div>

              {/* Status categories tab toggles */}
              <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700 gap-1 select-none">
                <button
                  type="button"
                  onClick={() => { setFilterType('ALL'); setCurrentPage(1); }}
                  className={`text-[10.5px] px-3 py-1 font-bold rounded-md transition ${filterType === 'ALL' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                  Tất cả ({stats.total})
                </button>
                <button
                  type="button"
                  onClick={() => { setFilterType('DATE_ERROR'); setCurrentPage(1); }}
                  className={`text-[10.5px] px-3 py-1 font-bold rounded-md transition flex items-center space-x-1 ${filterType === 'DATE_ERROR' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-rose-450'}`}
                >
                  <span>Lỗi ngày</span>
                  {stats.dateErrors > 0 && <span className="bg-white/20 text-white rounded-full px-1.5 py-0.1 font-extrabold text-[9px]">{stats.dateErrors}</span>}
                </button>
                <button
                  type="button"
                  onClick={() => { setFilterType('MISSING_FAST'); setCurrentPage(1); }}
                  className={`text-[10.5px] px-3 py-1 font-bold rounded-md transition flex items-center space-x-1 ${filterType === 'MISSING_FAST' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-amber-450'}`}
                >
                  <span>Chưa khớp FAST</span>
                  {stats.missingFast > 0 && <span className="bg-white/20 text-white rounded-full px-1.5 py-0.1 font-extrabold text-[9px]">{stats.missingFast}</span>}
                </button>
                <button
                  type="button"
                  onClick={() => { setFilterType('MISSING_VV'); setCurrentPage(1); }}
                  className={`text-[10.5px] px-3 py-1 font-bold rounded-md transition flex items-center space-x-1 ${filterType === 'MISSING_VV' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-amber-450'}`}
                >
                  <span>Mã VV lỗi</span>
                  {stats.missingVv > 0 && <span className="bg-white/20 text-white rounded-full px-1.5 py-0.1 font-extrabold text-[9px]">{stats.missingVv}</span>}
                </button>
              </div>

              <div className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 ${
                vvConfidenceRange.from !== '' || vvConfidenceRange.to !== ''
                  ? 'bg-emerald-900/30 text-emerald-100 border-emerald-600/60'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="text-xs font-bold whitespace-nowrap">Khớp ma_vv</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Từ"
                  value={vvConfidenceRange.from}
                  onChange={(e) => {
                    setVvConfidenceRange((prev) => ({ ...prev, from: e.target.value }));
                    setCurrentPage(1);
                  }}
                  className="w-12 bg-slate-900/60 border border-slate-700 rounded-md px-1.5 py-0.5 text-right text-xs font-bold font-mono text-white focus:outline-none focus:border-emerald-400"
                  aria-label="Phần trăm mã vụ việc khớp từ"
                />
                <span className="text-[10px] font-bold text-slate-400">-</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Đến"
                  value={vvConfidenceRange.to}
                  onChange={(e) => {
                    setVvConfidenceRange((prev) => ({ ...prev, to: e.target.value }));
                    setCurrentPage(1);
                  }}
                  className="w-12 bg-slate-900/60 border border-slate-700 rounded-md px-1.5 py-0.5 text-right text-xs font-bold font-mono text-white focus:outline-none focus:border-emerald-400"
                  aria-label="Phần trăm mã vụ việc khớp đến"
                />
                <span className="text-xs font-bold">%</span>
                {(vvConfidenceRange.from !== '' || vvConfidenceRange.to !== '') && (
                  <button
                    type="button"
                    onClick={() => {
                      setVvConfidenceRange({ from: '', to: '' });
                      setCurrentPage(1);
                    }}
                    title="Xóa khoảng lọc % khớp ma_vv"
                    className="h-4 w-4 flex items-center justify-center rounded-full text-emerald-200 hover:bg-emerald-800"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Core Interactive Spreadsheet Frame */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm relative">
            <div ref={autocompleteContainerRef} className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-max text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-205 text-slate-500 font-semibold uppercase tracking-wider select-none font-mono">
                    <th className="py-2.5 px-3 text-center border-r border-slate-200 w-[55px]">STT</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Thông Tin Hợp Đồng</th>
                    <th className="py-2.5 px-3 min-w-[110px]">Mã Booking</th>
                    <th className="py-2.5 px-3 min-w-[140px]">Lịch chạy (Đăng)</th>
                    <th className="py-2.5 px-3 min-w-[100px] text-center">Bắt Đầu</th>
                    <th className="py-2.5 px-3 min-w-[100px] text-center">Kết Thúc</th>
                    <th className="py-2.5 px-3 min-w-[100px] text-center">Ngày HĐ</th>
                    <th className="py-2.5 px-3 min-w-[100px]">Mã Khách Hàng</th>
                    <th className="py-2.5 px-3 min-w-[100px]">BP Thực Hiện</th>
                    <th className="py-2.5 px-3 min-w-[120px]">Mã Vụ Việc</th>
                    <th className="py-2.5 px-3 min-w-[220px]">Tên Sản Phẩm / Dịch Vụ</th>
                    <th className="py-2.5 px-3 min-w-[80px] text-right">Số lượng</th>
                    <th className="py-2.5 px-3 min-w-[90px] text-right">Đơn giá</th>
                    <th className="py-2.5 px-3 min-w-[75px] text-right">Thuế suất %</th>
                    <th className="py-2.5 px-3 min-w-[110px] text-right">Giá trị trước thuế</th>
                    <th className="py-2.5 px-3 min-w-[110px] text-right">Giá trị VAT</th>
                    <th className="py-2.5 px-3 min-w-[90px]">TK Doanh Thu</th>
                    <th className="py-2.5 px-3 min-w-[70px] text-right">CK %</th>
                    <th className="py-2.5 px-3 min-w-[220px]">Chuyên trang</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Ghi chú chi tiết</th>
                    <th className="py-2.5 px-3 min-w-[80px] text-center">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan={21} className="py-12 text-center text-slate-450 font-medium">
                        Không tìm thấy dòng nào khớp với các điều kiện lọc hoăc tìm kiếm hiện hành.
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row, idx) => {
                      const absoluteIndex = (currentPage - 1) * rowsPerPage + idx + 1;

                      // Row state indicators
                      const isDateError = !row.ngayBatDau || !row.ngayKetThuc || !row.ngayHopDong;
                      const isMissingFast = !row.existsInFast;
                      const isVvWarning = !row.maVv || row.matchStatus === 'CAN_KIEM_TRA' || row.confidenceScore < 70;
                      const rowWarnings = [
                        isDateError ? 'Lỗi ngày bắt đầu/kết thúc/ngày hợp đồng' : '',
                        isMissingFast ? 'Chưa khớp hợp đồng Fast' : '',
                        !row.maVv ? 'Thiếu Mã vụ việc' : '',
                        row.maVv && isVvWarning ? `Mã vụ việc khớp thấp (${row.confidenceScore || 0}%)` : '',
                      ].filter(Boolean);
                      const manualFields = Object.keys(row.manualChanges || {}).map((field) => FIELD_LABELS[field] || field);

                      return (
                        <tr 
                          key={row.id} 
                          className={`hover:bg-slate-50/50 transition duration-150 ${
                            isDateError ? 'bg-rose-50 bg-opacity-25' : 
                            isMissingFast ? 'bg-amber-50 bg-opacity-20' : ''
                          }`}
                        >
                          
                          {/* Index STT */}
                          <td className="py-3 px-3 text-center text-slate-450 font-mono font-bold border-r border-slate-100 select-none">
                            <div className="flex items-center justify-center gap-1.5">
                              <span>{absoluteIndex}</span>
                              {manualFields.length === 0 && rowWarnings.length > 0 && (
                                <TooltipIcon tooltip={`Cảnh báo: ${rowWarnings.join('; ')}`}>
                                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                </TooltipIcon>
                              )}
                              {manualFields.length > 0 && (
                                <TooltipIcon tooltip="Người dùng sửa tay">
                                  <Info className="h-3.5 w-3.5 text-sky-500" />
                                </TooltipIcon>
                              )}
                            </div>
                          </td>

                          {/* Computed Contract */}
                          <td className="py-3 px-3">
                            <div className="font-mono font-bold text-slate-800 text-[11px]">
                              {row.maHopDong || <span className="text-rose-400 italic">BK rỗng</span>}
                            </div>
                            <div className="text-[10px] text-slate-450 mt-0.5 max-w-[240px] whitespace-normal break-words" title={row.tenHopDong}>
                              {row.tenHopDong || 'N/A'}
                            </div>
                          </td>

                          {/* Mã booking */}
                          <td className="py-3 px-3">
                            <input
                              type="text"
                              value={row.maBooking}
                              onChange={(e) => handleUpdateField(row.id, 'maBooking', e.target.value)}
                              className="font-mono font-semibold bg-transparent focus:bg-white border border-transparent focus:border-slate-350 rounded px-1.5 py-0.5 w-full text-[11px] text-slate-800"
                            />
                          </td>

                          {/* Lịch chạy / Lịch đăng */}
                          <td className="py-3 px-3">
                            <input
                              type="text"
                              value={row.lichDang}
                              onChange={(e) => handleUpdateField(row.id, 'lichDang', e.target.value)}
                              className={`bg-transparent focus:bg-white border rounded px-1.5 py-0.5 w-full text-[11px] text-slate-700 ${
                                !row.lichDang ? 'border-amber-400 font-medium' : 'border-transparent focus:border-slate-300'
                              }`}
                            />
                          </td>

                          {/* Ngay bat dau */}
                          <td className="py-3 px-3 text-center">
                            <span className={`font-mono text-[10.5px] px-1.5 py-0.5 rounded font-medium ${!row.ngayBatDau ? 'bg-rose-50 text-rose-600 font-bold' : 'text-slate-600'}`}>
                              {row.ngayBatDau || 'Chưa parse'}
                            </span>
                          </td>

                          {/* Ngay ket thuc */}
                          <td className="py-3 px-3 text-center">
                            <span className={`font-mono text-[10.5px] px-1.5 py-0.5 rounded font-medium ${!row.ngayKetThuc ? 'bg-rose-50 text-rose-600 font-bold' : 'text-slate-600'}`}>
                              {row.ngayKetThuc || 'Chưa parse'}
                            </span>
                          </td>

                          {/* Ngay hop dong */}
                          <td className="py-3 px-3 text-center">
                            <span className={`font-mono text-[10.5px] px-1.5 py-0.5 rounded font-medium ${!row.ngayHopDong ? 'bg-rose-50 text-rose-600 font-bold' : 'text-slate-600'}`}>
                              {row.ngayHopDong || 'Lỗi booking'}
                            </span>
                          </td>

                          {/* Autocomplete: Mã khách */}
                          <td className="py-3 px-3 relative">
                            <div className={`flex items-center border rounded-lg bg-white px-2 py-0.5 transition focus-within:ring-2 focus-within:ring-indigo-505/20 focus-within:border-indigo-500 ${!row.maKhach ? 'border-amber-400 bg-amber-50/10' : 'border-slate-205'}`}>
                              <input
                                type="text"
                                value={row.maKhach}
                                onChange={(e) => {
                                  handleUpdateField(row.id, 'maKhach', e.target.value);
                                  setActiveAutocomplete({ rowId: row.id, field: 'maKhach', searchQuery: e.target.value });
                                }}
                                onFocus={() => setActiveAutocomplete({ rowId: row.id, field: 'maKhach', searchQuery: row.maKhach })}
                                className="w-full bg-transparent focus:outline-none text-[11px] font-mono font-bold text-slate-800 px-1"
                                placeholder="..."
                              />
                            </div>

                            {/* Dropdown Options */}
                            {activeAutocomplete?.rowId === row.id && activeAutocomplete?.field === 'maKhach' && (
                              <div className="absolute left-2.5 top-11 z-[99] bg-white border border-slate-200 rounded-lg shadow-xl max-h-72 overflow-y-auto w-96 p-1 text-left">
                                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider p-1.5 font-mono border-b bg-slate-50 flex items-center justify-between">
                                  <span>Mã Khách Master</span>
                                  <button type="button" onClick={() => setActiveAutocomplete(null)} className="text-slate-450 hover:text-slate-600">×</button>
                                </div>
                                {autocompleteOptions.length === 0 ? (
                                  <div className="p-2 text-slate-400 italic text-[11px]">Không khớp kết quả</div>
                                ) : (
                                  (autocompleteOptions as CustomerMaster[]).map((c) => (
                                    <button
                                      key={c.maKhach}
                                      type="button"
                                      onClick={() => {
                                        handleUpdateField(row.id, 'maKhach', c.maKhach);
                                        setActiveAutocomplete(null);
                                      }}
                                      className="group relative w-full text-left p-2 hover:bg-indigo-50/60 rounded flex flex-col transition text-[11px]"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <span className="font-bold text-indigo-700 font-mono shrink-0">{c.maKhach}</span>
                                        <span className="text-[10px] text-slate-400 font-mono">STT: {c.stt || 'N/A'}</span>
                                      </div>
                                      <span className="text-slate-700 font-semibold font-sans leading-snug break-words">{c.tenKhach}</span>
                                    </button>
                                  ))
                                )}
                              </div>
                            )}
                          </td>

                          {/* Autocomplete: BP thực hiện */}
                          <td className="py-3 px-3 relative">
                            <div className={`flex items-center border rounded-lg bg-white px-2 py-0.5 transition focus-within:ring-2 focus-within:ring-indigo-505/20 focus-within:border-indigo-500 ${!row.boPhanThucHien ? 'border-amber-405 bg-amber-50/10' : 'border-slate-205'}`}>
                              <input
                                type="text"
                                value={row.boPhanThucHien}
                                onChange={(e) => {
                                  handleUpdateField(row.id, 'boPhanThucHien', e.target.value);
                                  setActiveAutocomplete({ rowId: row.id, field: 'boPhanThucHien', searchQuery: e.target.value });
                                }}
                                onFocus={() => setActiveAutocomplete({ rowId: row.id, field: 'boPhanThucHien', searchQuery: row.boPhanThucHien })}
                                className="w-full bg-transparent focus:outline-none text-[11px] font-mono font-bold text-slate-800 px-1"
                                placeholder="..."
                              />
                            </div>

                            {/* Dropdown Options */}
                            {activeAutocomplete?.rowId === row.id && activeAutocomplete?.field === 'boPhanThucHien' && (
                              <div className="absolute left-2.5 top-11 z-[99] bg-white border border-slate-200 rounded-lg shadow-xl max-h-72 overflow-y-auto w-96 p-1 text-left">
                                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider p-1.5 font-mono border-b bg-slate-50 flex items-center justify-between">
                                  <span>BP Thực Hiện Master</span>
                                  <button type="button" onClick={() => setActiveAutocomplete(null)} className="text-slate-450 hover:text-slate-600">×</button>
                                </div>
                                {autocompleteOptions.length === 0 ? (
                                  <div className="p-2 text-slate-400 italic text-[11px]">Không khớp bộ phận</div>
                                ) : (
                                  (autocompleteOptions as DepartmentMaster[]).map((d) => (
                                    <button
                                      key={d.maSale}
                                      type="button"
                                      onClick={() => {
                                        handleUpdateField(row.id, 'boPhanThucHien', d.maSale);
                                        setActiveAutocomplete(null);
                                      }}
                                      className="group relative w-full text-left p-2 hover:bg-indigo-50/60 rounded flex flex-col transition text-[11px]"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <span className="font-bold text-indigo-700 font-mono shrink-0">{d.maSale}</span>
                                        <span className="text-[10px] text-slate-400 font-mono">STT: {d.stt || 'N/A'}</span>
                                      </div>
                                      <span className="text-slate-700 font-semibold font-sans leading-snug break-words">{d.tenBoPhan}</span>
                                    </button>
                                  ))
                                )}
                              </div>
                            )}
                          </td>

                          {/* Autocomplete: Mã Vụ Việc */}
                          <td className="py-3 px-3 relative">
                            <div className={`flex items-center border rounded-lg bg-white px-2 py-0.5 transition focus-within:ring-2 focus-within:ring-indigo-505/20 focus-within:border-indigo-500 ${isVvWarning ? 'border-amber-400 bg-amber-50/10' : 'border-slate-205'}`}>
                              <input
                                type="text"
                                value={row.maVv}
                                onChange={(e) => {
                                  handleUpdateField(row.id, 'maVv', e.target.value);
                                  setActiveAutocomplete({ rowId: row.id, field: 'maVv', searchQuery: e.target.value });
                                }}
                                onFocus={() => setActiveAutocomplete({ rowId: row.id, field: 'maVv', searchQuery: row.maVv })}
                                className="w-full bg-transparent focus:outline-none text-[11px] font-mono font-bold text-slate-800 px-1"
                                placeholder="..."
                              />
                              {row.maVv && (
                                <span className={`text-[9px] font-mono font-bold px-1 py-0.5 rounded ml-1 shrink-0 select-none transition ${row.matchStatus === 'OK' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                  {row.confidenceScore}%
                                </span>
                              )}
                            </div>

                            {/* Options Dropdown */}
                            {activeAutocomplete?.rowId === row.id && activeAutocomplete?.field === 'maVv' && (
                              <div className="absolute left-2.5 top-11 z-[99] bg-white border border-slate-200 rounded-lg shadow-xl max-h-80 overflow-y-auto w-[28rem] p-1 text-left">
                                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider p-1.5 font-mono border-b bg-slate-50 flex items-center justify-between">
                                  <span>Mã Vụ Việc Master</span>
                                  <button type="button" onClick={() => setActiveAutocomplete(null)} className="text-slate-450 hover:text-slate-600">×</button>
                                </div>
                                {autocompleteOptions.length === 0 ? (
                                  <div className="p-2 text-slate-400 italic text-[11px]">Không khớp mốc nào</div>
                                ) : (
                                  (autocompleteOptions as ProductMaster[]).map((p) => (
                                    <button
                                      key={p.maVuViec}
                                      type="button"
                                      onClick={() => {
                                        handleUpdateField(row.id, 'maVv', p.maVuViec);
                                        setActiveAutocomplete(null);
                                      }}
                                      className="group relative w-full text-left p-2 hover:bg-indigo-50/60 rounded flex flex-col transition text-[11px]"
                                    >
                                      <span className="font-bold text-indigo-700 font-mono">{p.maVuViec}</span>
                                      <span className="text-slate-700 font-semibold leading-snug break-words font-sans">{p.tenSanPham}</span>
                                      <span className="text-slate-500 text-[10px] leading-snug break-words">Từ khóa: {p.keyword}</span>
                                    </button>
                                  ))
                                )}
                              </div>
                            )}
                          </td>

                          {/* Autocomplete: Tên sản phẩm */}
                          <td className="py-3 px-3 relative">
                            <div className="flex items-center border border-transparent hover:border-slate-300 focus-within:border-indigo-500 rounded px-1">
                              <textarea
                                value={row.sanPhamImport}
                                onChange={(e) => {
                                  handleUpdateField(row.id, 'sanPhamImport', e.target.value);
                                  setActiveAutocomplete({ rowId: row.id, field: 'sanPhamImport', searchQuery: e.target.value });
                                }}
                                onFocus={() => setActiveAutocomplete({ rowId: row.id, field: 'sanPhamImport', searchQuery: row.sanPhamImport })}
                                className="w-full bg-transparent focus:outline-none text-[11px] font-medium text-slate-700 leading-tight resize-none h-[42px] whitespace-normal break-words"
                                placeholder="Chuẩn hóa SP..."
                              />
                            </div>

                            {/* Options Dropdown */}
                            {activeAutocomplete?.rowId === row.id && activeAutocomplete?.field === 'sanPhamImport' && (
                              <div className="absolute left-2.5 top-11 z-[99] bg-white border border-slate-200 rounded-lg shadow-xl max-h-80 overflow-y-auto w-[28rem] p-1 text-left">
                                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider p-1.5 font-mono border-b bg-slate-50 flex items-center justify-between">
                                  <span>Chọn Sản phẩm Chuẩn</span>
                                  <button type="button" onClick={() => setActiveAutocomplete(null)} className="text-slate-450 hover:text-slate-600">×</button>
                                </div>
                                {autocompleteOptions.length === 0 ? (
                                  <div className="p-2 text-slate-400 italic text-[11px]">Không có sản phẩm chuẩn khớp</div>
                                ) : (
                                  (autocompleteOptions as ProductMaster[]).map((p) => (
                                    <button
                                      key={p.maVuViec}
                                      type="button"
                                      onClick={() => {
                                        handleUpdateField(row.id, 'sanPhamImport', p.tenSanPham);
                                        setActiveAutocomplete(null);
                                      }}
                                      className="w-full text-left p-1.5 hover:bg-slate-50 rounded flex flex-col transition text-[11px]"
                                    >
                                      <span className="font-semibold text-slate-700">{p.tenSanPham}</span>
                                      <span className="text-indigo-600 font-mono font-bold text-[10px] mt-0.5">{p.maVuViec}</span>
                                    </button>
                                  ))
                                )}
                              </div>
                            )}
                          </td>

                          {/* Số lượng */}
                          <td className="py-3 px-3 text-right">
                            <span className="font-mono text-slate-600 font-semibold">{row.soLuong}</span>
                          </td>

                          {/* Đơn giá */}
                          <td className="py-3 px-3 text-right">
                            <span className="font-mono text-slate-600">{row.donGia.toLocaleString('vi-VN')}</span>
                          </td>

                          {/* Thuế suất */}
                          <td className="py-3 px-3 text-right">
                            <input
                              type="text"
                              value={row.thueSuat}
                              onChange={(e) => handleUpdateField(row.id, 'thueSuat', e.target.value)}
                              className="font-mono bg-transparent focus:bg-white border border-transparent focus:border-slate-350 rounded px-1 py-0.5 text-right w-12 text-[11px]"
                            />
                          </td>

                          {/* Thành tiền (Giá trị) */}
                          <td className="py-3 px-3 text-right">
                            <input
                              type="text"
                              value={row.thanhTienSauCk}
                              onChange={(e) => handleUpdateField(row.id, 'thanhTienSauCk', e.target.value)}
                              className="font-mono bg-transparent font-bold focus:bg-white border border-transparent focus:border-slate-350 rounded px-1.5 py-0.5 text-right w-24 text-[11.5px] text-slate-800"
                            />
                          </td>

                          {/* Giá trị của vv VAT */}
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-700">
                            {row.giaTriCuaVvVat.toLocaleString('vi-VN')}
                          </td>

                          {/* Autocomplete: TK Doanh Thu */}
                          <td className="py-3 px-3 relative">
                            <div className="flex items-center border border-transparent hover:border-slate-300 focus-within:border-indigo-500 rounded px-1">
                              <input
                                type="text"
                                value={row.tkDoanhThu}
                                onChange={(e) => {
                                  handleUpdateField(row.id, 'tkDoanhThu', e.target.value);
                                  setActiveAutocomplete({ rowId: row.id, field: 'tkDoanhThu', searchQuery: e.target.value });
                                }}
                                onFocus={() => setActiveAutocomplete({ rowId: row.id, field: 'tkDoanhThu', searchQuery: row.tkDoanhThu })}
                                className="w-full bg-transparent focus:outline-none text-[11px] font-mono leading-none text-slate-600"
                                placeholder="..."
                              />
                            </div>

                            {/* Options Dropdown */}
                            {activeAutocomplete?.rowId === row.id && activeAutocomplete?.field === 'tkDoanhThu' && (
                              <div className="absolute right-0 top-11 z-[99] bg-white border border-slate-200 rounded-lg shadow-xl max-h-56 overflow-y-auto w-48 p-1 text-left">
                                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider p-1.5 font-mono border-b bg-slate-50 flex items-center justify-between">
                                  <span>Dán TK Doanh Thu</span>
                                  <button type="button" onClick={() => setActiveAutocomplete(null)} className="text-slate-450 hover:text-slate-600">×</button>
                                </div>
                                {autocompleteOptions.length === 0 ? (
                                  <div className="p-2 text-slate-400 italic text-[11px]">Không thấy tài khoản</div>
                                ) : (
                                  (autocompleteOptions as ProductMaster[]).map((p) => (
                                    <button
                                      key={p.maVuViec + '_' + p.tkDoanhThu}
                                      type="button"
                                      onClick={() => {
                                        handleUpdateField(row.id, 'tkDoanhThu', p.tkDoanhThu);
                                        setActiveAutocomplete(null);
                                      }}
                                      className="w-full text-left p-1.5 hover:bg-slate-50 rounded flex flex-col transition text-[11px] font-mono"
                                    >
                                      <span className="font-bold text-indigo-700">{p.tkDoanhThu}</span>
                                      <span className="text-slate-450 text-[10px] font-sans truncate">{p.tenSanPham}</span>
                                    </button>
                                  ))
                                )}
                              </div>
                            )}
                          </td>

                          {/* Tỷ lệ chiết khấu */}
                          <td className="py-3 px-3 text-right font-mono text-slate-500">
                            {row.tyLeCk}%
                          </td>

                          {/* Chuyên trang representation */}
                          <td className="py-3 px-3 max-w-[240px] whitespace-normal break-words" title={row.chuyenTrang}>
                            <span className="text-slate-600 font-sans">{row.chuyenTrang}</span>
                          </td>

                          {/* Ghi chú chi tiết */}
                          <td className="py-3 px-3 max-w-[200px] whitespace-normal break-words text-[11px] font-mono text-slate-500">
                            {row.ghiChuChiTiet || <span className="text-slate-300 italic">Trống</span>}
                          </td>

                          {/* Fast status value */}
                          <td className="py-3 px-3 text-center border-l border-slate-100 font-mono text-[11px] font-bold text-slate-700">
                            {row.fastStatus || ''}
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Footer */}
            {totalPages > 1 && (
              <div className="px-4.5 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50 select-none">
                <span className="text-[11px] font-medium text-slate-500">
                  Hiển thị từ <strong className="text-slate-700 font-mono">{(currentPage - 1) * rowsPerPage + 1}</strong> đến{' '}
                  <strong className="text-slate-700 font-mono">{Math.min(currentPage * rowsPerPage, filteredRows.length)}</strong> trong số{' '}
                  <strong className="text-slate-700 font-mono">{filteredRows.length}</strong> dòng hạch toán
                </span>
                
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1 px-2 text-xs font-semibold rounded-md border border-slate-205 bg-white hover:bg-slate-55 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCurrentPage(i + 1)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-md transition ${currentPage === i + 1 ? 'bg-indigo-600 text-white font-mono' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-1 px-2 text-xs font-semibold rounded-md border border-slate-205 bg-white hover:bg-slate-55 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmConfig !== null}
        title={confirmConfig?.title || ''}
        message={confirmConfig?.message || ''}
        type={confirmConfig?.type || 'info'}
        onConfirm={() => {
          confirmConfig?.onConfirm();
          setConfirmConfig(null);
        }}
        onCancel={() => setConfirmConfig(null)}
      />

      <BangKeHeaderMappingModal
        isOpen={showHeaderMappingModal}
        onClose={() => setShowHeaderMappingModal(false)}
        config={config}
        onSaveConfig={(updated) => {
          if (onSaveConfig) {
            onSaveConfig(updated);
          }
        }}
        onManualPush={onManualPush}
      />
    </div>
  );
}

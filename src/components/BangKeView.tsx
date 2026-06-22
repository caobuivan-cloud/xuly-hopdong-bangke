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
  ContractSettings, UploadedFileData, CustomerMaster, DepartmentMaster, ProductMaster 
} from '../types';
import ExcelUpload from './ExcelUpload';
import { exportToExcel } from '../utils/excel';
import { buildFastImportRows } from '../utils/fastImport';
import { 
  normalizeText, lookupExact, keywordMatch, applyExceptionRules, parseNumber,
  parsePostingDateRange, parseContractDateFromBooking
} from '../utils/businessLogic';
import { dbService, writeActionLogToSheet } from '../services/dbService';
import ConfirmModal from './ConfirmModal';

interface BangKeViewProps {
  id?: string;
  config: ContractSettings;
  onHeaderActionsChange?: (actions: React.ReactNode | null) => void;
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
  return {
    fileName: files.length === 1 ? files[0].fileName : `${label} (${files.length} file)`,
    fileSize: files.reduce((total, file) => total + file.fileSize, 0),
    uploadedAt: files[0].uploadedAt,
    sheets: [{ sheetName: label, headers: Array.from(headers), rows }],
  };
};

export default function BangKeView({
  id = 'bang-ke-view',
  config,
  onHeaderActionsChange,
}: BangKeViewProps) {
  // Master data lists
  const [customers, setCustomers] = useState<CustomerMaster[]>([]);
  const [departments, setDepartments] = useState<DepartmentMaster[]>([]);
  const [products, setProducts] = useState<ProductMaster[]>([]);
  const [loadingMaster, setLoadingMaster] = useState(true);

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

  const replaceUploadedFiles = (
    files: UploadedFileData[],
    setter: React.Dispatch<React.SetStateAction<UploadedFileData[]>>
  ) => {
    const action = () => {
      setter(files);
      setProcessedRows(null);
      if (files.length > 0) {
        const fileNames = files.map(f => f.fileName).join(', ');
        const isFast = setter === setFileFastList;
        const typeStr = isFast ? "Danh sách hợp đồng Fast" : "Bảng kê chi tiết";
        writeActionLogToSheet(
          `Tải file ${typeStr}`,
          `Tải lên tệp: ${fileNames}`
        );
      }
    };

    if (processedRows) {
      setConfirmConfig({
        title: 'Xác nhận thay đổi file',
        message: 'Dữ liệu đã xử lý và các thay đổi thủ công trên bảng sẽ bị mất nếu tiếp tục. Bạn có chắc chắn muốn thay đổi danh sách file không?',
        type: 'warning',
        onConfirm: action
      });
    } else {
      action();
    }
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

  // Flex cell value helper
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

  // Run business mapping logic on uploaded datasets
  const handleProcessBangKe = () => {
    if (isProcessing) return;

    if (!fileBangKe || fileBangKe.sheets.length === 0) {
      setErrorMessage('Vui lòng tải lên "File Bảng kê" trước khi thực hiện hạch toán.');
      return;
    }

    setIsProcessing(true);
    window.setTimeout(() => {
      try {
        setErrorMessage(null);
        const sheetBangKe = fileBangKe.sheets[0];
        const sheetFast = fileFast && fileFast.sheets.length > 0 ? fileFast.sheets[0] : null;

        // Scan the sheet for a sheet-wide VAT tax percentage from a VAT row
        let sheetWideTaxRate: number | null = null;
        sheetBangKe.rows.forEach((r) => {
      const combinedRowText = Object.values(r).map(String).join(' ').toLowerCase();
      if (combinedRowText.includes('vat') || combinedRowText.includes('gtgt') || combinedRowText.includes('thuế')) {
        const matchPercent = combinedRowText.match(/(\d+)\s*%/);
        if (matchPercent) {
          sheetWideTaxRate = Number(matchPercent[1]);
        } else {
          const matchVatNum = combinedRowText.match(/vat\s*(\d+)/i) || combinedRowText.match(/gtgt\s*(\d+)/i);
          if (matchVatNum) {
            sheetWideTaxRate = Number(matchVatNum[1]);
          }
        }
      }
    });

        // Pre-build a hash map for O(1) lookups instead of nested loops
        const fastLookupMap = new Map<string, { fastStatus: string; fastMaKhach: string; fastBoPhanThucHien: string; fastGhiChu: string }>();
        if (sheetFast) {
          sheetFast.rows.forEach(f => {
            const fastTen = String(getCellValue(f, 'Tên hợp đồng', 'Ten hop dong') || '').trim();
            const fastCode = String(getCellValue(f, 'Hợp đồng', 'Hop dong', 'Mã hợp đồng', 'Mã HĐ') || '').trim();
            const status = String(getCellValue(f, 'Trạng thái', 'Trang thai')).trim();
            const maKhach = String(getCellValue(f, 'Mã khách', 'Ma khach')).trim();
            const boPhan = String(getCellValue(f, 'Bộ phận thực hiện', 'Bo phan thuc hien', 'BP thực hiện')).trim();
            const ghiChu = String(getCellValue(f, 'Ghi chú', 'Ghi chu')).trim();
            const val = { fastStatus: status, fastMaKhach: maKhach, fastBoPhanThucHien: boPhan, fastGhiChu: ghiChu };
            if (fastTen) fastLookupMap.set(normalizeText(fastTen), val);
            if (fastCode) fastLookupMap.set(normalizeText(fastCode), val);
          });
        }

        // Pre-normalize products master list to avoid millions of heavy normalizeText calls inside loop
        const preNormalizedProducts = products.map(p => ({
          ...p,
          __normKeyword: normalizeText(p.keyword)
        }));

        const mapped = sheetBangKe.rows.map((row, index) => {
      // 1. Raw inputs extracts
      const sttCol = getCellValue(row, 'STT', 'stt', 'No').trim();
      const maBooking = getCellValue(row, 'Mã booking', 'Ma booking', 'Booking Code', 'Booking', 'Mã booking quảng cáo').trim();
      const soHt = getCellValue(row, 'Số HT', 'So HT', 'HT', 'Hệ thống').trim();
      const nhan = getCellValue(row, 'Nhãn', 'Nhan', 'Brand', 'Thương hiệu').trim();
      const noiDungQuangCao = getCellValue(row, 'Nội dung quảng cáo', 'Noi dung quang cao', 'Nội dung', 'Diễn giải').trim();
      const chiTiet = getCellValue(row, 'Chi tiết', 'Chi tiet', 'Chi tiết chạy').trim();
      const lichDang = getCellValue(row, 'Lịch đăng', 'Lich dang', 'Lịch chạy', 'Lich chay', 'Thời gian').trim();
      const donViTinh = getCellValue(row, 'Đơn vị tính', 'Don vi tinh', 'ĐVT', 'DVT').trim();
      const soLuongRaw = getCellValue(row, 'Số lượng', 'So luong', 'Qty').trim();
      const donGiaRaw = getCellValue(row, 'Đơn giá', 'Don gia', 'Price').trim();
      const chietKhauRaw = getCellValue(row, 'Chiết khấu', 'Chiet khau', 'CK').trim();
      const thanhTienSauCkRaw = getCellValue(row, 'Thành tiền sau chiết khấu (VNĐ)', 'Thành tiền sau chiết khấu', 'Thanh tien sau chiet khau', 'Thành tiền thực chạy (có VAT)', 'Thành tiền', 'Thanh tien').trim();
      const ghiChuCol = getCellValue(row, 'Ghi chú', 'Ghi chu', 'Note').trim();

      // 2. Local config overrides
      const suffix = config.contractSuffix || 'AD';
      const separator = config.contractNameSeparator !== undefined ? config.contractNameSeparator : '/';
      
      const maHopDong = maBooking ? `${maBooking}${suffix}` : '';
      const tenHopDong = maBooking ? `${maBooking}${separator}${suffix}` : '';

      // 3. Fast mapping lookup using computed contract values
      let existsInFast = false;
      let fastStatus = '';
      let fastMaKhach = '';
      let fastBoPhanThucHien = '';
      let fastGhiChu = '';

      if (sheetFast) {
        const normTenHopDong = normalizeText(tenHopDong);
        const normMaHopDong = normalizeText(maHopDong);
        const match = (normTenHopDong && fastLookupMap.get(normTenHopDong)) || 
                      (normMaHopDong && fastLookupMap.get(normMaHopDong));
        if (match) {
          existsInFast = true;
          fastStatus = match.fastStatus;
          fastMaKhach = match.fastMaKhach;
          fastBoPhanThucHien = match.fastBoPhanThucHien;
          fastGhiChu = match.fastGhiChu;
        }
      }

      // 4. Booking parsing dates
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

      // "Ngày hợp đồng = lấy từ 4 ký tự cuối của Mã booking dạng MMyy, trả về 01/MM/yyyy."
      const parsedContractDate = parseContractDateFromBooking(maBooking);
      const ngayHopDong = parsedContractDate.text || '';

      // 5. Product lookup via fuzzy matcher
      const matchResult = keywordMatch(noiDungQuangCao, preNormalizedProducts);
      const maVv = matchResult.maVV || '';
      const confidenceScore = matchResult.bestMatch ? matchResult.confidenceScore : 0;
      const matchStatus = matchResult.bestMatch ? matchResult.status : 'KHONG_MATCH';
      const sanPhamImport = matchResult.bestMatch?.tenSanPham || '';
      const tkDoanhThu = matchResult.bestMatch?.tkDoanhThu || '';

      // 6. Numbers format
      const soLuong = parseNumber(soLuongRaw) || 0;
      const donGia = parseNumber(donGiaRaw) || 0;
      const chietKhau = parseNumber(chietKhauRaw) || 0;
      const thanhTienSauCk = parseNumber(thanhTienSauCkRaw) || (soLuong * donGia * (1 - chietKhau / 100));

      // 7. Tax rate parsing - "Thuế suất = lấy từ dòng VAT trong bảng kê nếu có, tách số và bỏ ký hiệu %."
      let thueSuat = config.taxRate;
      
      if (sheetWideTaxRate !== null) {
        thueSuat = sheetWideTaxRate;
      } else if (matchResult.bestMatch && matchResult.bestMatch.thueSuat !== undefined && matchResult.bestMatch.thueSuat !== '') {
        thueSuat = parseNumber(matchResult.bestMatch.thueSuat);
      } else {
        const rawRowThueSuat = getCellValue(row, 'Thuế suất', 'Thue suat', 'VAT', 'Tỷ lệ VAT').trim();
        if (rawRowThueSuat) {
          thueSuat = parseNumber(rawRowThueSuat);
        }
      }

      const taxRateMultiplier = thueSuat > 1 ? thueSuat / 100 : thueSuat;
      const thueSuatVal = thueSuat > 1 ? thueSuat : thueSuat * 100;
      const giaTriCuaVvVat = Math.round(thanhTienSauCk * taxRateMultiplier);

      const tyLeCk = chietKhau;

      // Exception rules for Chuyên trang
      let exceptionText = applyExceptionRules(noiDungQuangCao, config.exceptionRules);
      const chuyenTrang = exceptionText || noiDungQuangCao || '';

      // "Ghi chú chi tiết = Số HT + contractNameSeparator + contractSuffix"
      const ghiChuChiTiet = soHt ? `${soHt}${separator}${suffix}` : '';

      return {
        id: `bk_row_${index}_${Date.now()}`,
        sttOriginal: sttCol || String(index + 1),
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
      };
    });

        setProcessedRows(mapped);
        setCurrentPage(1);
        writeActionLogToSheet(
          'Xử lý bảng kê',
          `Xử lý thành công ${mapped.length} dòng dữ liệu.`
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
      const changedManually = String(row[field] ?? '') !== String(value ?? '');
      if (changedManually) {
        newRow.manualChanges = {
          ...(row.manualChanges || {}),
          [field]: true,
        };
      }

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
          newRow.giaTriCuaVvVat = Math.round(newRow.thanhTienSauCk * multiplier);
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
          newRow.giaTriCuaVvVat = Math.round(newRow.thanhTienSauCk * multiplier);
        }
      }

      if (field === 'thueSuat') {
        const parsedThue = parseNumber(value);
        newRow.thueSuat = parsedThue;
        const multiplier = parsedThue > 1 ? parsedThue / 100 : parsedThue;
        newRow.giaTriCuaVvVat = Math.round(newRow.thanhTienSauCk * multiplier);
      }

      if (field === 'thanhTienSauCk') {
        const parsedVal = parseNumber(value);
        newRow.thanhTienSauCk = parsedVal;
        const multiplier = newRow.thueSuat > 1 ? newRow.thueSuat / 100 : newRow.thueSuat;
        newRow.giaTriCuaVvVat = Math.round(parsedVal * multiplier);
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
      return { total: 0, dateErrors: 0, missingFast: 0, missingVv: 0, totalAmmount: 0 };
    }

    let dateErrors = 0;
    let missingFast = 0;
    let missingVv = 0;
    let totalAmmount = 0;

    processedRows.forEach(row => {
      if (!row.ngayBatDau || !row.ngayKetThuc || !row.ngayHopDong) {
        dateErrors++;
      }
      if (!row.existsInFast) {
        missingFast++;
      }
      if (!row.maVv || row.matchStatus === 'CAN_KIEM_TRA' || row.confidenceScore < 70) {
        missingVv++;
      }
      totalAmmount += row.thanhTienSauCk || 0;
    });

    return { total: processedRows.length, dateErrors, missingFast, missingVv, totalAmmount };
  }, [processedRows]);

  // Export spreadsheet engine - "Export 2 files: import_hop_dong_moi.xlsx and import_hop_dong_cu.xlsx"
  const handleExportFiles = (fileType: 'moi' | 'cu') => {
    if (!processedRows || processedRows.length === 0) return;

    // Filter logic:
    // If Tên hợp đồng không có trong Fast thì là hợp đồng mới
    // Nếu có trong Fast nhưng Trạng thái = 2 thì cũng đưa vào file mới
    // Nếu Tên hợp đồng có trong Fast và Trạng thái khác 2 thì đưa vào file cũ
    const exportSubset = processedRows.filter(row => {
      const hasContractInFast = row.existsInFast;
      const status2Val = row.fastStatus === '2' || row.fastStatus === 2 || String(row.fastStatus).trim() === '2';

      if (fileType === 'moi') {
        return !hasContractInFast || status2Val;
      } else {
        return hasContractInFast && !status2Val;
      }
    });

    if (exportSubset.length === 0) {
      alert(`Không tìm thấy dòng tương ứng phù hợp để xuất File hợp đồng ${fileType === 'moi' ? 'Mới' : 'Cũ'}.`);
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
      const outputData = buildFastImportRows(exportSubset, { status: 1, sttMode: 'sequential' });

      const targetFileName = fileType === 'moi' ? 'import_hop_dong_moi.xlsx' : 'import_hop_dong_cu.xlsx';
      exportToExcel(
        [{ sheetName: 'HĐ Đối Soát Fast Import', data: outputData }],
        targetFileName
      );

      writeActionLogToSheet(
        `Xuất Excel bảng kê hợp đồng ${fileType === 'moi' ? 'mới' : 'cũ'}`,
        `Xuất thành công tệp Excel [${targetFileName}] chứa ${exportSubset.length} dòng.`
      );
    };

    if (hasWarnings) {
      setConfirmConfig({
        title: '⚠️ CẢNH BÁO PHÁT HIỆN LỖI HẠCH TOÁN',
        message: 'Sổ xuất Excel chuẩn bị tải xuống có dòng gặp Lịch đăng sai định dạng, thiếu Mã vụ việc thâm căn, thiếu Mã khách hoặc nghi vấn độ chính xác (Confidence Score thấp).\n\nBạn có chắc chắn muốn xuất tệp Excel không?',
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
              onClick={() => handleExportFiles('moi')}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-650 hover:bg-indigo-750 text-white text-xs font-bold rounded-full transition shadow-sm cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Excel Mới</span>
            </button>
            <button
              type="button"
              onClick={() => handleExportFiles('cu')}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-full transition shadow-sm cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Excel Cũ</span>
            </button>
          </>
        )}
      </div>
    );

    return () => onHeaderActionsChange?.(null);
  }, [fileBangKe, processedRows, isProcessing, onHeaderActionsChange]);

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
              replaceUploadedFiles([data], setFileBangKeList);
            }}
            onUploadManySuccess={(data) => {
              replaceUploadedFiles(data, setFileBangKeList);
            }}
            onUploadError={(err) => setErrorMessage(err)}
            placeholderText="Kéo thả một hoặc nhiều File Bảng kê chi tiết vào đây hoặc click để chọn"
          />
          {fileBangKeList.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 font-mono">File đã tải lên ({fileBangKeList.length})</div>
              <div className="space-y-1">
                {fileBangKeList.map((file, index) => (
                  <div key={`${file.fileName}_${index}`} className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50/70 px-2.5 py-1.5">
                    <div className="min-w-0">
                      <div className="truncate text-[11px] font-semibold text-slate-700" title={file.fileName}>
                        {file.fileName} <span className="text-slate-400 font-mono">({file.sheets[0]?.rows.length || 0} dòng)</span>
                      </div>
                    </div>
                    <button type="button" onClick={() => removeUploadedFile(index, setFileBangKeList)} title="Xóa file này khỏi danh sách xử lý" className="h-6 w-6 flex items-center justify-center rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
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
              replaceUploadedFiles([data], setFileFastList);
            }}
            onUploadManySuccess={(data) => {
              replaceUploadedFiles(data, setFileFastList);
            }}
            onUploadError={(err) => setErrorMessage(err)}
            placeholderText="Kéo thả một hoặc nhiều File Danh sách hợp đồng Fast vào đây hoặc click để chọn"
          />
          {fileFastList.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 font-mono">File đã tải lên ({fileFastList.length})</div>
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

      {/* Primary Analytics Trigger Ribbon */}
      {fileBangKe && (
        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3 text-slate-600 text-xs">
            <Info className="h-5 w-5 text-indigo-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-slate-700">Tệp tin đầu vào sẵn sàng phân tích</p>
              <p className="text-slate-450 mt-0.5">
                File Bảng kê: <strong className="font-mono text-indigo-600">[{fileBangKe.fileName}]</strong> ({fileBangKe.sheets[0]?.rows.length} dòng)
                {fileFast && <> | File HĐ Fast: <strong className="font-mono text-rose-600">[{fileFast.fileName}]</strong> ({fileFast.sheets[0]?.rows.length} dòng)</>}
              </p>
            </div>
          </div>
        </div>
      )}

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
          
          {/* Diagnostic Metrics Dashboards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            
            {/* Metric: Total */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Tổng số dòng</span>
              <div>
                <span className="text-xl font-extrabold text-slate-700 leading-none">{stats.total}</span>
                <span className="text-[10px] text-slate-400 font-mono ml-1">dòng</span>
              </div>
              <span className="text-[9px] text-slate-400 mt-1 block">Bảng kê tải lên</span>
            </div>

            {/* Metric: Gross amount */}
            <div className="bg-indigo-50/55 border border-indigo-100 rounded-xl p-4 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest font-mono">Tổng doanh số</span>
              <div>
                <span className="text-xl font-extrabold text-indigo-700 leading-none font-sans">
                  {stats.totalAmmount.toLocaleString('vi-VN')}
                </span>
                <span className="text-[10px] text-indigo-400 font-mono ml-1">VND</span>
              </div>
              <span className="text-[9px] text-indigo-400 mt-1 block">Giá trị trước thuế</span>
            </div>

            {/* Metric: Date Parse Failures */}
            <div className={`border rounded-xl p-4 flex flex-col justify-between transition-all duration-200 ${stats.dateErrors > 0 ? 'bg-rose-50/40 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
              <span className={`text-[10px] font-bold uppercase tracking-widest font-mono ${stats.dateErrors > 0 ? 'text-rose-500' : 'text-slate-400'}`}>Lỗi Lịch đăng</span>
              <div>
                <span className={`text-xl font-extrabold font-sans ${stats.dateErrors > 0 ? 'text-rose-700' : 'text-slate-700'}`}>{stats.dateErrors}</span>
                <span className="text-[10px] text-slate-400 font-mono ml-1">lỗi</span>
              </div>
              <span className="text-[9px] text-slate-450 mt-1 block">Không parse được ngày</span>
            </div>

            {/* Metric: Unlinked contract lookups */}
            <div className={`border rounded-xl p-4 flex flex-col justify-between transition-all duration-200 ${stats.missingFast > 0 ? 'bg-amber-50/40 border-amber-205' : 'bg-slate-50 border-slate-200'}`}>
              <span className={`text-[10px] font-bold uppercase tracking-widest font-mono ${stats.missingFast > 0 ? 'text-amber-600' : 'text-slate-400'}`}>Chưa khớp FAST</span>
              <div>
                <span className={`text-xl font-extrabold font-sans ${stats.missingFast > 0 ? 'text-amber-700' : 'text-slate-700'}`}>{stats.missingFast}</span>
                <span className="text-[10px] text-slate-400 font-mono ml-1">lỗi</span>
              </div>
              <span className="text-[9px] text-slate-450 mt-1 block">Tên HĐ không có trong Fast</span>
            </div>

            {/* Metric: Low confidence keyword matching */}
            <div className={`border rounded-xl p-4 flex flex-col justify-between transition-all duration-200 ${stats.missingVv > 0 ? 'bg-amber-50/40 border-amber-205' : 'bg-slate-50 border-slate-200'}`}>
              <span className={`text-[10px] font-bold uppercase tracking-widest font-mono ${stats.missingVv > 0 ? 'text-amber-600' : 'text-slate-400'}`}>Kiểm tra Mã VV</span>
              <div>
                <span className={`text-xl font-extrabold font-sans ${stats.missingVv > 0 ? 'text-amber-700' : 'text-slate-700'}`}>{stats.missingVv}</span>
                <span className="text-[10px] text-slate-400 font-mono ml-1">lỗi</span>
              </div>
              <span className="text-[9px] text-slate-450 mt-1 block">Confidence match thấp</span>
            </div>

          </div>

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
                    <th className="py-2.5 px-3 min-w-[150px]">Thông Tin Hợp Đồng</th>
                    <th className="py-2.5 px-3 min-w-[110px]">Mã Booking</th>
                    <th className="py-2.5 px-3 min-w-[140px]">Lịch chạy (Đăng)</th>
                    <th className="py-2.5 px-3 min-w-[100px] text-center">Bắt Đầu</th>
                    <th className="py-2.5 px-3 min-w-[100px] text-center">Kết Thúc</th>
                    <th className="py-2.5 px-3 min-w-[100px] text-center">Ngày HĐ</th>
                    <th className="py-2.5 px-3 min-w-[100px]">Mã Khách Hàng</th>
                    <th className="py-2.5 px-3 min-w-[100px]">BP Thực Hiện</th>
                    <th className="py-2.5 px-3 min-w-[120px]">Mã Vụ Việc</th>
                    <th className="py-2.5 px-3 min-w-[150px]">Tên Sản Phẩm / Dịch Vụ</th>
                    <th className="py-2.5 px-3 min-w-[80px] text-right">Số lượng</th>
                    <th className="py-2.5 px-3 min-w-[90px] text-right">Đơn giá</th>
                    <th className="py-2.5 px-3 min-w-[75px] text-right">Thuế suất %</th>
                    <th className="py-2.5 px-3 min-w-[110px] text-right">Giá trị trước thuế</th>
                    <th className="py-2.5 px-3 min-w-[110px] text-right">Giá trị VAT</th>
                    <th className="py-2.5 px-3 min-w-[90px]">TK Doanh Thu</th>
                    <th className="py-2.5 px-3 min-w-[70px] text-right">CK %</th>
                    <th className="py-2.5 px-3 min-w-[150px]">Chuyên trang</th>
                    <th className="py-2.5 px-3 min-w-[150px]">Ghi chú chi tiết</th>
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
                                <TooltipIcon tooltip={`Đã sửa thủ công: ${manualFields.join(', ')}`}>
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
                            <div className="text-[10px] text-slate-450 mt-0.5 max-w-[150px] truncate" title={row.tenHopDong}>
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
                              <input
                                type="text"
                                value={row.sanPhamImport}
                                onChange={(e) => {
                                  handleUpdateField(row.id, 'sanPhamImport', e.target.value);
                                  setActiveAutocomplete({ rowId: row.id, field: 'sanPhamImport', searchQuery: e.target.value });
                                }}
                                onFocus={() => setActiveAutocomplete({ rowId: row.id, field: 'sanPhamImport', searchQuery: row.sanPhamImport })}
                                className="w-full bg-transparent focus:outline-none text-[11px] font-medium text-slate-700 leading-tight"
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
                          <td className="py-3 px-3 max-w-[150px] truncate" title={row.chuyenTrang}>
                            <span className="text-slate-600 font-sans">{row.chuyenTrang}</span>
                          </td>

                          {/* Ghi chú chi tiết */}
                          <td className="py-3 px-3 whitespace-nowrap text-[11px] font-mono text-slate-500">
                            {row.ghiChuChiTiet || <span className="text-slate-300 italic">Trống</span>}
                          </td>

                          {/* Fast Link Status Indicator */}
                          <td className="py-3 px-3 text-center border-l border-slate-100">
                            {row.existsInFast ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-100 font-mono">
                                FAST (STT: {row.fastStatus || 'N/A'})
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-100 font-mono">
                                HĐ MỚI
                              </span>
                            )}
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
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Layers, HelpCircle, FileText, CheckCircle2, Calculator, FileSpreadsheet, 
  Download, AlertTriangle, XCircle, Search, Trash2, Check, ArrowRight, UserCheck, 
  Settings, RefreshCw, ChevronLeft, ChevronRight, Info, Eye, Sparkles
} from 'lucide-react';
import { 
  ContractSettings, UploadedFileData, CustomerMaster, DepartmentMaster, ProductMaster 
} from '../types';
import ExcelUpload from './ExcelUpload';
import { exportToExcel } from '../utils/excel';
import { buildFastImportRows, filterFastImportEligibleRows } from '../utils/fastImport';
import { 
  normalizeText, lookupExact, keywordMatch, applyExceptionRules, parseNumber 
} from '../utils/businessLogic';
import { dbService, writeActionLogToSheet } from '../services/dbService';
import ConfirmModal from './ConfirmModal';

interface LuanChuyenViewProps {
  id?: string;
  config: ContractSettings;
  onHeaderActionsChange?: (actions: React.ReactNode | null) => void;
}

type QuickFilter = 'ALL' | 'QUALIFIED' | 'MISSING_KHACH' | 'MISSING_DEPT' | 'MISSING_VV' | 'NEED_CHECK';

const FIELD_LABELS: Record<string, string> = {
  maKhach: 'Mã khách',
  tenKhachHang: 'Tên khách hàng',
  boPhanThucHien: 'Bộ phận thực hiện',
  tenNvkd: 'Tên NVKD',
  maVv: 'Mã vụ việc',
  tkDoanhThu: 'TK doanh thu',
  sanPhamImport: 'Sản phẩm import',
  chuyenTrangImport: 'Chuyên trang import',
};

function TooltipIcon({
  children,
  tooltip,
}: {
  children: React.ReactNode;
  tooltip: string;
}) {
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
    primarySheet.rows.forEach((row) => {
      rows.push({
        ...row,
        __sourceFile: file.fileName,
      });
    });
  });

  return {
    fileName: files.length === 1 ? files[0].fileName : `${label} (${files.length} file)`,
    fileSize: files.reduce((total, file) => total + file.fileSize, 0),
    uploadedAt: files[0].uploadedAt,
    sheets: [
      {
        sheetName: label,
        headers: Array.from(headers),
        rows,
      },
    ],
  };
};

export default function LuanChuyenView({
  id = 'luan-chuyen-view',
  config,
  onHeaderActionsChange,
}: LuanChuyenViewProps) {
  // Master data state
  const [customers, setCustomers] = useState<CustomerMaster[]>([]);
  const [departments, setDepartments] = useState<DepartmentMaster[]>([]);
  const [products, setProducts] = useState<ProductMaster[]>([]);
  const [loadingMaster, setLoadingMaster] = useState(true);

  // Separate upload states for Hard Contract and Fast Contract
  const [fileCungList, setFileCungList] = useState<UploadedFileData[]>([]);
  const [fileFastList, setFileFastList] = useState<UploadedFileData[]>([]);

  // Processing state
  const [processedRows, setProcessedRows] = useState<Record<string, any>[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{ title: string; message: string; type?: 'info' | 'warning' | 'danger'; onConfirm: () => void } | null>(null);

  // Filtering & Pagination states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState(true); // Default to filter by Fast list comparison
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('QUALIFIED');
  const [vvConfidenceRange, setVvConfidenceRange] = useState({ from: '', to: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;

  const fileCung = useMemo(() => mergeUploadedFiles(fileCungList, 'Hợp đồng luân chuyển'), [fileCungList]);
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
        const typeStr = isFast ? "Danh sách hợp đồng Fast" : "Hợp đồng luân chuyển";
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
          const typeStr = isFast ? "Danh sách hợp đồng Fast" : "Hợp đồng luân chuyển";
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

  // Autocomplete editing states
  const [activeAutocomplete, setActiveAutocomplete] = useState<{
    rowId: string;
    field: 'maVv' | 'maKhach' | 'boPhanThucHien';
    searchQuery: string;
  } | null>(null);

  // Load master data on mount
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
        console.error('Error loading Master Data in LuanChuyenView:', err);
      } finally {
        setLoadingMaster(false);
      }
    }
    loadMasters();
  }, []);

  // Soft/Robust Cell Value extractor
  const getCellValue = (row: any, ...candidates: string[]): string => {
    const keys = Object.keys(row);
    // 1. Try exact match
    for (const cand of candidates) {
      if (row[cand] !== undefined) return String(row[cand]);
      const found = keys.find(k => k.trim().toLowerCase() === cand.trim().toLowerCase());
      if (found) return String(row[found]);
    }
    // 2. Try normalized casing & diacritics stripping
    const strippedCands = candidates.map(c => normalizeText(c));
    for (const key of keys) {
      if (strippedCands.includes(normalizeText(key))) {
        return String(row[key]);
      }
    }
    return '';
  };

  // Run business logic mapping and enrichment
  const handleProcessFiles = () => {
    if (isProcessing) return;

    if (!fileCung || fileCung.sheets.length === 0) {
      setErrorMessage('Vui lòng tải lên "File Hợp đồng cứng" trước khi xử lý.');
      return;
    }

    setIsProcessing(true);
    window.setTimeout(() => {
      try {
        setErrorMessage(null);
        const sheetCung = fileCung.sheets[0];
        const sheetFast = fileFast && fileFast.sheets.length > 0 ? fileFast.sheets[0] : null;

        // Pre-build a hash map for O(1) lookups instead of nested loops
        const fastLookupMap = new Map<string, { fastStatus: string; fastGhiChu: string }>();
        if (sheetFast) {
          sheetFast.rows.forEach(f => {
            const fastTen = String(getCellValue(f, 'Tên hợp đồng', 'Ten hop dong') || '').trim();
            const fastCode = String(getCellValue(f, 'Hợp đồng', 'Hop dong', 'Mã hợp đồng') || '').trim();
            const status = String(getCellValue(f, 'Trạng thái', 'Trang thai')).trim();
            const ghiChu = String(getCellValue(f, 'Ghi chú', 'Ghi chu')).trim();
            const val = { fastStatus: status, fastGhiChu: ghiChu };
            if (fastTen) fastLookupMap.set(normalizeText(fastTen), val);
            if (fastCode) fastLookupMap.set(normalizeText(fastCode), val);
          });
        }

        const mapped = sheetCung.rows.map((row, index) => {
      // 1. Read key texts for lookup
      const tenKhachHang = getCellValue(row, 'Tên Khách hàng', 'Ten Khach hang', 'Khách hàng', 'Tên khách').trim();
      const tenNvkd = getCellValue(row, 'Tên NVKD', 'Ten NVKD', 'NVKD', 'Nhân viên kinh doanh', 'Người bán').trim();
      const chuyenTrang = getCellValue(row, 'Chuyên trang', 'Chuyen trang', 'Kênh', 'Kenh', 'Chuyên trang import').trim();
      const hinhThucQc = getCellValue(row, 'Hình thức QC', 'Hinh thuc QC', 'Hình thức', 'Hinh thuc').trim();

      const originalMaKhach = getCellValue(row, 'Mã khách', 'Ma khach', 'Mã KH', 'Ma KH').trim();
      const originalBoPhan = getCellValue(row, 'Bộ phận thực hiện', 'Bo phan thuc hien', 'Bộ phận', 'BP thực hiện').trim();

      // 2. Lookup Mã khách
      let maKhach = lookupExact(tenKhachHang, customers, 'tenKhach', 'maKhach') || originalMaKhach;
      
      // 3. Lookup Bộ phận thực hiện
      let boPhanThucHien = lookupExact(tenNvkd, departments, 'tenBoPhan', 'maSale') || originalBoPhan;

      // 4. Product matching (ma_vv & Sản phầm Import)
      const matchResult = keywordMatch(chuyenTrang, products);
      let maVv = matchResult.maVV || getCellValue(row, 'ma_vv', 'Mã vụ việc', 'Mã VV').trim();
      let tkDoanhThu = matchResult.tkDoanhThu || getCellValue(row, 'tk_doanh thu', 'tk_doanhthu', 'Tài khoản doanh thu').trim();
      let sanPhamImport = matchResult.tenSanPham || getCellValue(row, 'Sản phầm Import', 'SanPhamImport', 'Tên sản phẩm', 'Sản phẩm').trim();

      // 5. Compute Chuyên trang import = Hình thức QC + " - " + Chuyên trang 
      // check exception rules
      const rawImportText = hinhThucQc ? `${hinhThucQc} - ${chuyenTrang}` : chuyenTrang;
      let exceptionText = applyExceptionRules(rawImportText, config.exceptionRules);
      if (!exceptionText && chuyenTrang) {
        exceptionText = applyExceptionRules(chuyenTrang, config.exceptionRules);
      }
      const chuyenTrangImport = exceptionText || rawImportText;

      // 6. Gather all standard columns
      const maHopDong = getCellValue(row, 'Mã hợp đồng', 'Ma hop dong', 'Hợp đồng').trim();
      const tenHopDong = getCellValue(row, 'Tên hợp đồng', 'Ten hop dong').trim();
      const ngayBatDau = getCellValue(row, 'Ngày bắt đầu', 'Ngay bat dau', 'Từ ngày').trim();
      const ngayKetThuc = getCellValue(row, 'Ngày kết thúc', 'Ngay ket thuc', 'Đến ngày').trim();
      const ngayHopDong = getCellValue(row, 'Ngày hợp đồng', 'Ngay hop dong', 'Ngày ký').trim();

      const ngayHd1 = getCellValue(row, 'ngay_hd1').trim();
      const ngayHd2 = getCellValue(row, 'ngay_hd2').trim();
      const ngayHd3 = getCellValue(row, 'ngay_hd3').trim();
      const ngayHd4 = getCellValue(row, 'ngay_hd4').trim();
      const ngayHd5 = getCellValue(row, 'ngay_hd5').trim();
      const ngayHd6 = getCellValue(row, 'ngay_hd6').trim();

      const tienHd1 = getCellValue(row, 'tien_hd1').trim();
      const tienHd2 = getCellValue(row, 'tien_hd2').trim();
      const tienHd3 = getCellValue(row, 'tien_hd3').trim();
      const tienHd4 = getCellValue(row, 'tien_hd4').trim();
      const tienHd5 = getCellValue(row, 'tien_hd5').trim();
      const tienHd6 = getCellValue(row, 'tien_hd6').trim();

      const giaTri = parseNumber(getCellValue(row, 'Giá trị', 'Gia tri', 'Thành tiền', 'Tổng giá trị'));
      const soLuong = parseNumber(getCellValue(row, 'Số lượng', 'So luong') || 1);
      const donGia = parseNumber(getCellValue(row, 'Đơn giá', 'Don gia'));
      const thueSuat = parseNumber(getCellValue(row, 'Thuế suất', 'Thue suat') || config.taxRate);
      const giaTriCuaVv = parseNumber(getCellValue(row, 'Giá trị của vv', 'Giá trị vụ việc', 'Gia tri cua vv'));
      const rawGiaTriCuaVvVat = getCellValue(row, 'Giá trị của vv VAT', 'Giá trị vụ việc VAT', 'Gia tri cua vv VAT').trim();
      const giaTriCuaVvVat = rawGiaTriCuaVvVat !== '' ? parseNumber(rawGiaTriCuaVvVat) : undefined;
      const bangKe = getCellValue(row, 'Bảng kê', 'Bang ke').trim();
      const tyLeCk = parseNumber(getCellValue(row, 'Tỷ lệ ck', 'Ty le ck', 'Chiết khấu'));
      const ghiChu = getCellValue(row, 'Ghi chú', 'Ghi chu').trim();
      const sanPham = getCellValue(row, 'Sản phẩm', 'San pham').trim();
      const website = getCellValue(row, 'Website').trim();
      const loaiBanner = getCellValue(row, 'Loại banner', 'Loai banner').trim();

      // 7. Check references in FAST contract file
      let existsInFast = false;
      let fastStatus = '';
      let fastGhiChu = '';

      if (sheetFast) {
        const normTenHopDong = normalizeText(tenHopDong);
        const normMaHopDong = normalizeText(maHopDong);
        const match = (normTenHopDong && fastLookupMap.get(normTenHopDong)) || 
                      (normMaHopDong && fastLookupMap.get(normMaHopDong));
        if (match) {
          existsInFast = true;
          fastStatus = match.fastStatus;
          fastGhiChu = match.fastGhiChu;
        }
      }

      return {
        id: `row_${index}_${Date.now()}`,
        maHopDong,
        tenHopDong,
        tenKhachHang,
        maKhach,
        tenNvkd,
        boPhanThucHien,
        ngayBatDau,
        ngayKetThuc,
        ngayHopDong,

        ngayHd1,
        ngayHd2,
        ngayHd3,
        ngayHd4,
        ngayHd5,
        ngayHd6,

        tienHd1,
        tienHd2,
        tienHd3,
        tienHd4,
        tienHd5,
        tienHd6,

        giaTri,
        maVv,
        soLuong,
        donGia,
        thueSuat,
        giaTriCuaVv,
        giaTriCuaVvVat,
        tkDoanhThu,
        bangKe,
        tyLeCk,
        chuyenTrang,
        ghiChu,
        hinhThucQc,
        sanPham,
        website,
        loaiBanner,

        chuyenTrangImport,
        sanPhamImport,

        confidenceScore: matchResult.bestMatch ? matchResult.confidenceScore : 0,
        matchStatus: matchResult.bestMatch ? matchResult.status : 'KHONG_MATCH',

        existsInFast,
        fastStatus,
        fastGhiChu,
      };
    });

        setProcessedRows(mapped);
        setCurrentPage(1);
        writeActionLogToSheet(
          'Xử lý hợp đồng luân chuyển',
          `Xử lý thành công ${mapped.length} dòng dữ liệu.`
        );
      } catch (err: any) {
        setErrorMessage(err?.message || 'Có lỗi xảy ra khi xử lý dữ liệu.');
      } finally {
        window.setTimeout(() => setIsProcessing(false), 450);
      }
    }, 0);
  };

  // Inline updates for any manually modified fields
  const handleUpdateField = (rowId: string, field: string, val: any) => {
    if (!processedRows) return;
    const row = processedRows.find(r => r.id === rowId);
    const oldVal = row ? row[field] : '';
    const updated = processedRows.map(row => {
      if (row.id !== rowId) return row;

      const newRow = { ...row, [field]: val };
      newRow.manualChanges = {
        ...(row.manualChanges || {}),
        [field]: true,
      };

      // Extra helpers: if product selection changes, let's update related info
      if (field === 'maVv') {
        const foundProd = products.find(p => p.maVuViec === val);
        if (foundProd) {
          newRow.sanPhamImport = foundProd.tenSanPham;
          newRow.tkDoanhThu = foundProd.tkDoanhThu;
          newRow.confidenceScore = 100;
          newRow.matchStatus = 'OK';
        }
      }
      return newRow;
    });
    setProcessedRows(updated);

    if (row && String(oldVal) !== String(val)) {
      const fieldLabel = FIELD_LABELS[field] || field;
      const docCode = row.maHopDong || row.tenHopDong || `Dòng ${rowId}`;
      writeActionLogToSheet(
        'Sửa dòng hợp đồng luân chuyển',
        `Thay đổi trường "${fieldLabel}" của hợp đồng "${docCode}" từ "${oldVal}" sang "${val}"`
      );
    }
  };

  // Autocomplete matching helpers
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

  // Clean filtration predicate
  const shouldKeepRow = (row: any) => {
    // If filterActive and Fast list is uploaded, check existence matching rules:
    // - Lấy dòng nếu Tên hợp đồng không tồn tại trong Fast.
    // - Hoặc nếu tồn tại trong Fast nhưng Trạng thái = 2 và Ghi chú trống.
    if (filterActive && fileFast) {
      if (!row.existsInFast) return true;
      const isStatus2 = String(row.fastStatus).trim() === '2';
      const isGhiChuEmpty = !row.fastGhiChu || String(row.fastGhiChu).trim() === '';
      return isStatus2 && isGhiChuEmpty;
    }
    return true; // Return all rows otherwise
  };

  // Filter and Search processor
  const filteredRows = useMemo(() => {
    if (!processedRows) return [];
    
    return processedRows.filter(row => {
      // 1. apply exclusion logic
      if (!shouldKeepRow(row)) return false;

      if (quickFilter === 'MISSING_KHACH' && row.maKhach?.trim()) return false;
      if (quickFilter === 'MISSING_DEPT' && row.boPhanThucHien?.trim()) return false;
      if (quickFilter === 'MISSING_VV' && row.maVv?.trim()) return false;
      if (
        quickFilter === 'NEED_CHECK' &&
        !(row.maVv?.trim() && (row.matchStatus === 'CAN_KIEM_TRA' || row.confidenceScore < 70))
      ) return false;

      const rangeFrom = vvConfidenceRange.from === '' ? 0 : Math.max(0, Math.min(100, Number(vvConfidenceRange.from)));
      const rangeTo = vvConfidenceRange.to === '' ? 100 : Math.max(0, Math.min(100, Number(vvConfidenceRange.to)));
      const lowerConfidence = Math.min(rangeFrom, rangeTo);
      const upperConfidence = Math.max(rangeFrom, rangeTo);
      const rowConfidence = Number(row.confidenceScore || 0);
      if ((vvConfidenceRange.from !== '' || vvConfidenceRange.to !== '') && (rowConfidence < lowerConfidence || rowConfidence > upperConfidence)) return false;

      // 2. apply text search matches
      if (searchTerm.trim()) {
        const query = normalizeText(searchTerm);
        const matchCode = normalizeText(row.maHopDong).includes(query);
        const matchName = normalizeText(row.tenHopDong).includes(query);
        const matchCustName = normalizeText(row.tenKhachHang).includes(query);
        const matchCustCode = normalizeText(row.maKhach).includes(query);

        return matchCode || matchName || matchCustName || matchCustCode;
      }

      return true;
    });
  }, [processedRows, filterActive, fileFast, quickFilter, vvConfidenceRange, searchTerm]);

  // Eligible rows for FAST export (exclude empty VAT and 100% discount)
  const eligibleExportRows = useMemo(() => {
    return filterFastImportEligibleRows(filteredRows);
  }, [filteredRows]);

  // Pagination rows
  const paginatedRows = useMemo(() => {
    const startIdx = (currentPage - 1) * rowsPerPage;
    return filteredRows.slice(startIdx, startIdx + rowsPerPage);
  }, [filteredRows, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));

  // Statistics calculation matching instructions
  const stats = useMemo(() => {
    if (!processedRows) {
      return { totalSource: 0, qualifiedCount: 0, missingKhach: 0, missingDept: 0, missingVv: 0, needCheck: 0 };
    }

    const totalSource = processedRows.length;
    // We compute metrics specifically over the ACTIVE subset or qualified subset
    const qualifiedList = processedRows.filter(shouldKeepRow);
    const qualifiedCount = qualifiedList.length;

    let missingKhach = 0;
    let missingDept = 0;
    let missingVv = 0;
    let needCheck = 0;

    qualifiedList.forEach(row => {
      if (!row.maKhach || !row.maKhach.trim()) missingKhach++;
      if (!row.boPhanThucHien || !row.boPhanThucHien.trim()) missingDept++;
      if (!row.maVv || !row.maVv.trim()) {
        missingVv++;
      } else if (row.matchStatus === 'CAN_KIEM_TRA' || row.confidenceScore < 70) {
        needCheck++;
      }
    });

    return { totalSource, qualifiedCount, missingKhach, missingDept, missingVv, needCheck };
  }, [processedRows, filterActive, fileFast]);

  // Export 36 columns formatted as requested
  const handleExportFinished = () => {
    if (!processedRows || eligibleExportRows.length === 0) return;

    // Check for critical missing values or validation markings before exporting
    const hasWarnings = eligibleExportRows.some(row =>
      !row.ngayBatDau ||
      !row.ngayKetThuc ||
      !row.ngayHopDong ||
      !row.maKhach || !row.maKhach.trim() ||
      !row.boPhanThucHien || !row.boPhanThucHien.trim() ||
      !row.maVv || !row.maVv.trim() ||
      row.matchStatus === 'CAN_KIEM_TRA' ||
      row.confidenceScore < 70
    );

    const executeExport = () => {
      const exportFormatted = buildFastImportRows(eligibleExportRows, { status: 1, sttMode: 'blank' });

      exportToExcel(
        [{ sheetName: 'HĐ Luân Chuyển Fast Import', data: exportFormatted }],
        `Enriched_LuanChuyen_36Cols_${new Date().toISOString().split('T')[0]}.xlsx`
      );

      writeActionLogToSheet(
        'Xuất Excel hợp đồng luân chuyển',
        `Xuất thành công tệp Excel chứa ${eligibleExportRows.length} dòng.`
      );
    };

    if (hasWarnings) {
      setConfirmConfig({
        title: '⚠️ CẢNH BÁO PHÁT HIỆN LỖI HẠCH TOÁN',
        message: 'Sổ xuất Excel chuẩn bị tải xuống có dòng gặp Ngày tháng thiếu, thiếu Mã vụ việc thâm căn, thiếu Mã khách hoặc nghi vấn độ chính xác (Confidence Score thấp).\n\nBạn có chắc chắn muốn xuất tệp Excel không?',
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
        {fileCung && (
          <button
            onClick={handleProcessFiles}
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
          <button
            onClick={handleExportFinished}
            disabled={eligibleExportRows.length === 0}
            title={`Xuất ${eligibleExportRows.length} dòng - 36 cột`}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-full transition shadow-sm cursor-pointer disabled:cursor-not-allowed"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Excel</span>
            <span className="bg-emerald-500/40 text-white text-[10px] font-mono px-1.5 py-0.5 rounded-full">{eligibleExportRows.length}</span>
          </button>
        )}
      </div>
    );

    return () => onHeaderActionsChange?.(null);
  }, [fileCung, processedRows, eligibleExportRows, isProcessing, onHeaderActionsChange]);

  return (
    <div id={id} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-4.5 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center space-x-2">
            <Layers className="h-6 w-6 text-indigo-500" />
            <span>Xử lý hợp đồng luân chuyển</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Hạch toán doanh thu và bóc tách dữ liệu hợp đồng cứng, đối chiếu loại trừ trạng thái hợp đồng Fast và xuất mẫu 36 cột chuẩn hóa.
          </p>
        </div>
      </div>

      {/* Dual File Upload Phase */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload 1: Hard Contract */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono flex items-center space-x-1.5">
              <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">1</span>
              <span>Tải lên File Hợp đồng cứng</span>
            </h3>
            {fileCung ? (
              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md px-2 py-0.5 font-bold font-mono">
                SẴN SÀNG
              </span>
            ) : (
              <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-100 rounded-md px-2 py-0.5 font-bold font-mono">
                BẮT BUỘC
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400">Xem xét tự động trích xuất mã khách, bộ phận thực hiện, ma_vv, sản phẩm và doanh thu tài khoản.</p>
          <ExcelUpload
            multiple
            compact
            showSuccessDetails={false}
            onUploadSuccess={(data) => {
              replaceUploadedFiles([data], setFileCungList);
            }}
            onUploadManySuccess={(data) => {
              replaceUploadedFiles(data, setFileCungList);
            }}
            onUploadError={(err) => setErrorMessage(err)}
            placeholderText="Kéo thả một hoặc nhiều File Hợp đồng cứng (.xlsx, .xls) vào đây hoặc click để chọn"
          />
          {fileCungList.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                File đã tải lên ({fileCungList.length})
              </div>
              <div className="space-y-1">
                {fileCungList.map((file, index) => (
                  <div key={`${file.fileName}_${index}`} className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50/70 px-2.5 py-1.5">
                    <div className="min-w-0">
                      <div className="truncate text-[11px] font-semibold text-slate-700" title={file.fileName}>
                        {file.fileName} <span className="text-slate-400 font-mono">({file.sheets[0]?.rows.length || 0} dòng)</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeUploadedFile(index, setFileCungList)}
                      title="Xóa file này khỏi danh sách xử lý"
                      className="h-6 w-6 flex items-center justify-center rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Upload 2: Fast Contract List */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono flex items-center space-x-1.5">
              <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">2</span>
              <span>Tải lên Danh sách hợp đồng Fast</span>
            </h3>
            {fileFast ? (
              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md px-2 py-0.5 font-bold font-mono">
                ĐÃ GHÉP NỐI
              </span>
            ) : (
              <span className="text-[10px] bg-slate-100 text-slate-450 border border-slate-200 rounded-md px-2 py-0.5 font-bold font-mono">
                KHÔNG BẮT BUỘC
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400">Để tự đối soát loại trừ các hợp đồng đã ký trong Fast (Lọc bớt các dòng trùng khớp).</p>
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
            placeholderText="Kéo thả một hoặc nhiều File Fast (.xlsx, .xls) vào đây hoặc click để chọn"
          />
          {fileFastList.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                File đã tải lên ({fileFastList.length})
              </div>
              <div className="space-y-1">
                {fileFastList.map((file, index) => (
                  <div key={`${file.fileName}_${index}`} className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50/70 px-2.5 py-1.5">
                    <div className="min-w-0">
                      <div className="truncate text-[11px] font-semibold text-slate-700" title={file.fileName}>
                        {file.fileName} <span className="text-slate-400 font-mono">({file.sheets[0]?.rows.length || 0} dòng)</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeUploadedFile(index, setFileFastList)}
                      title="Xóa file này khỏi danh sách đối soát Fast"
                      className="h-6 w-6 flex items-center justify-center rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    >
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

      {/* Processed results block */}
      {processedRows && (
        <div className="space-y-4">

          {/* Stats tab pills + search — single row bar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Tab pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => { setQuickFilter('ALL'); setSearchTerm(''); setVvConfidenceRange({ from: '', to: '' }); setFilterActive(false); setCurrentPage(1); }}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition border ${
                  quickFilter === 'ALL' && !searchTerm
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                <span>Tất cả</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                  quickFilter === 'ALL' && !searchTerm ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>{stats.totalSource}</span>
              </button>

              {fileFast && (
                <button
                  onClick={() => { setQuickFilter('QUALIFIED'); setFilterActive(true); setSearchTerm(''); setCurrentPage(1); }}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition border ${
                    quickFilter === 'QUALIFIED'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-indigo-600 border-indigo-200 hover:border-indigo-400'
                  }`}
                >
                  <span>Đủ điều kiện xuất</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                    quickFilter === 'QUALIFIED' ? 'bg-white/25 text-white' : 'bg-indigo-50 text-indigo-600'
                  }`}>{stats.qualifiedCount}</span>
                </button>
              )}

              {stats.missingKhach > 0 && (
                <button
                  onClick={() => { setQuickFilter('MISSING_KHACH'); setFilterActive(true); setSearchTerm(''); setCurrentPage(1); }}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                    quickFilter === 'MISSING_KHACH'
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-300'
                  }`}
                >
                  <AlertTriangle className="h-3 w-3" />
                  <span>Thiếu Mã khách</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                    quickFilter === 'MISSING_KHACH' ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-700'
                  }`}>{stats.missingKhach}</span>
                </button>
              )}

              {stats.missingDept > 0 && (
                <button
                  onClick={() => { setQuickFilter('MISSING_DEPT'); setFilterActive(true); setSearchTerm(''); setCurrentPage(1); }}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                    quickFilter === 'MISSING_DEPT'
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-300'
                  }`}
                >
                  <AlertTriangle className="h-3 w-3" />
                  <span>Thiếu Bộ phận</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                    quickFilter === 'MISSING_DEPT' ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-700'
                  }`}>{stats.missingDept}</span>
                </button>
              )}

              {stats.missingVv > 0 && (
                <button
                  onClick={() => { setQuickFilter('MISSING_VV'); setFilterActive(true); setSearchTerm(''); setCurrentPage(1); }}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                    quickFilter === 'MISSING_VV'
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-rose-50 text-rose-700 border-rose-200 hover:border-rose-300'
                  }`}
                >
                  <XCircle className="h-3 w-3" />
                  <span>Thiếu MA_VV</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                    quickFilter === 'MISSING_VV' ? 'bg-white/25 text-white' : 'bg-rose-100 text-rose-700'
                  }`}>{stats.missingVv}</span>
                </button>
              )}

              {stats.needCheck > 0 && (
                <button
                  onClick={() => { setQuickFilter('NEED_CHECK'); setFilterActive(true); setSearchTerm(''); setCurrentPage(1); }}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                    quickFilter === 'NEED_CHECK'
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-amber-50 text-amber-600 border-amber-200 hover:border-amber-300'
                  }`}
                >
                  <HelpCircle className="h-3 w-3" />
                  <span>Cần kiểm tra</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                    quickFilter === 'NEED_CHECK' ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-700'
                  }`}>{stats.needCheck}</span>
                </button>
              )}
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* ma_vv confidence threshold */}
            <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 shadow-sm ${
              vvConfidenceRange.from !== '' || vvConfidenceRange.to !== ''
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-white text-slate-500 border-slate-200'
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
                className="w-12 bg-white/70 border border-slate-200 rounded-md px-1.5 py-0.5 text-right text-xs font-bold font-mono text-slate-700 focus:outline-none focus:border-emerald-400"
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
                className="w-12 bg-white/70 border border-slate-200 rounded-md px-1.5 py-0.5 text-right text-xs font-bold font-mono text-slate-700 focus:outline-none focus:border-emerald-400"
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
                  className="ml-0.5 h-4 w-4 flex items-center justify-center rounded-full text-emerald-600 hover:bg-emerald-100"
                >
                  <XCircle className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm hợp đồng, tiền, ngân hàng..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 text-xs pl-8 pr-3 py-1.5 rounded-full text-slate-700 w-56 focus:outline-none focus:border-indigo-400 placeholder-slate-400 shadow-sm"
              />
            </div>

          </div>

          {/* Main Interactive Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-widest font-mono">Bảng dữ liệu hạch toán chi tiết (Cho phép sửa trực tiếp)</h4>
              <span className="text-[11px] text-slate-400">Hiển thị <strong className="text-slate-700">{filteredRows.length}</strong> dòng hạch toán trong bộ lọc</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-500 border-b border-slate-250 select-none font-semibold">
                    <th className="py-3 px-3 w-10 text-center font-mono">STT</th>
                    <th className="py-3 px-3 min-w-[120px]">Mã / Tên Hợp Đồng</th>
                    <th className="py-3 px-3 min-w-[200px]">Khách Hàng & Mã Sale</th>
                    <th className="py-3 px-3 min-w-[180px]">Mã Khách (Autocomplete)</th>
                    <th className="py-3 px-3 min-w-[185px]">Bộ Phận Thực Hiện (Autocomplete)</th>
                    <th className="py-3 px-3 min-w-[200px]">Mã Vụ Việc - ma_vv (Autocomplete)</th>
                    <th className="py-3 px-3 min-w-[130px]">TK Doanh Thu</th>
                    <th className="py-3 px-3 min-w-[220px]">Sản Phẩm Import</th>
                    <th className="py-3 px-3 min-w-[220px]">Chuyên Trang Import</th>
                    <th className="py-3 px-3 min-w-[100px] text-right">Tổng Giá Trị</th>
                    <th className="py-3 px-3 min-w-[110px] text-center">Trạng Thái Fast</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400 font-medium">
                        Không tìm thấy hợp đồng nào khớp điều kiện tìm kiếm/lọc.
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row, idx) => {
                      const absoluteIndex = (currentPage - 1) * rowsPerPage + idx + 1;
                      
                      // Highlight diagnostics
                      const isMissingKhach = !row.maKhach || !row.maKhach.trim();
                      const isMissingDept = !row.boPhanThucHien || !row.boPhanThucHien.trim();
                      const isMissingVv = !row.maVv || !row.maVv.trim();
                      const isLowConfidence = row.matchStatus === 'CAN_KIEM_TRA' || row.confidenceScore < 70;
                      const rowWarnings = [
                        isMissingKhach ? 'Thiếu Mã khách' : '',
                        isMissingDept ? 'Thiếu Bộ phận thực hiện' : '',
                        isMissingVv ? 'Thiếu Mã vụ việc' : '',
                        !isMissingVv && isLowConfidence ? `Mã vụ việc khớp thấp (${row.confidenceScore || 0}%)` : '',
                      ].filter(Boolean);
                      const manualFields = Object.keys(row.manualChanges || {}).map((field) => FIELD_LABELS[field] || field);
                      
                      return (
                        <tr key={row.id} className="hover:bg-slate-50/50 transition">
                          
                          {/* STT Column */}
                          <td className="py-3 px-3 text-center text-slate-450 font-mono font-bold border-r border-slate-100">
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

                          {/* Code & Name of Contract */}
                          <td className="py-3 px-3">
                            <div className="font-mono font-bold text-slate-700 text-[11px]">{row.maHopDong || <span className="text-slate-305 italic">N/A</span>}</div>
                            <div className="text-slate-500 max-w-[240px] whitespace-normal break-words text-[11px] mt-0.5" title={row.tenHopDong}>
                              {row.tenHopDong}
                            </div>
                          </td>

                          {/* Raw Customer and Salesperson Name */}
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-700 text-[11px] max-w-[250px] whitespace-normal break-words" title={row.tenKhachHang}>{row.tenKhachHang}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5 flex items-center space-x-1">
                              <span className="font-mono bg-slate-100 px-1 rounded">Sale:</span>
                              <span className="font-medium whitespace-normal break-words max-w-[180px]">{row.tenNvkd || 'N/A'}</span>
                            </div>
                          </td>

                          {/* Editable: Mã Khách with Autocomplete */}
                          <td className="py-3 px-3 relative">
                            <div className={`relative flex items-center border rounded-lg transition focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 bg-white px-2.5 py-1 ${isMissingKhach ? 'border-amber-400 bg-amber-50/10' : 'border-slate-200'}`}>
                              <input
                                type="text"
                                value={row.maKhach}
                                onChange={(e) => {
                                  handleUpdateField(row.id, 'maKhach', e.target.value);
                                  setActiveAutocomplete({ rowId: row.id, field: 'maKhach', searchQuery: e.target.value });
                                }}
                                onFocus={() => setActiveAutocomplete({ rowId: row.id, field: 'maKhach', searchQuery: row.maKhach })}
                                className="w-full bg-transparent focus:outline-none text-[11px] font-mono font-bold text-slate-800"
                                placeholder="Nhập Mã khách..."
                              />
                            </div>
                            
                            {/* Autocomplete dropdown list */}
                            {activeAutocomplete?.rowId === row.id && activeAutocomplete?.field === 'maKhach' && (
                              <div className="absolute left-3 top-11 z-[99] bg-white border border-slate-200 rounded-lg shadow-xl max-h-72 overflow-y-auto w-96 p-1 text-left">
                                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider p-1.5 font-mono border-b bg-slate-50 flex items-center justify-between">
                                  <span>Gợi ý Mã khách</span>
                                  <button type="button" onClick={() => setActiveAutocomplete(null)} className="text-slate-400 hover:text-slate-600">×</button>
                                </div>
                                {autocompleteOptions.length === 0 ? (
                                  <div className="p-2 text-slate-400 italic text-[11px]">Không tìm thấy khách hàng nào khớp</div>
                                ) : (
                                  (autocompleteOptions as CustomerMaster[]).map((c) => (
                                    <button
                                      key={c.maKhach}
                                      type="button"
                                      onClick={() => {
                                        handleUpdateField(row.id, 'maKhach', c.maKhach);
                                        handleUpdateField(row.id, 'tenKhachHang', c.tenKhach);
                                        setActiveAutocomplete(null);
                                      }}
                                      className="group relative w-full text-left p-2 hover:bg-indigo-50/60 rounded flex flex-col transition text-[11px]"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <span className="font-bold text-indigo-650 font-mono shrink-0">{c.maKhach}</span>
                                        <span className="text-[10px] text-slate-400 font-mono">STT: {c.stt || 'N/A'}</span>
                                      </div>
                                      <span className="text-slate-700 font-semibold font-sans leading-snug break-words">{c.tenKhach}</span>
                                      <span className="pointer-events-none absolute left-2 top-full z-[120] mt-1 hidden max-w-sm rounded-md bg-slate-900 px-2.5 py-1.5 text-[10px] leading-snug text-white shadow-lg group-hover:block">
                                        Mã khách: {c.maKhach} | Tên khách: {c.tenKhach}
                                      </span>
                                    </button>
                                  ))
                                )}
                              </div>
                            )}
                          </td>

                          {/* Editable: Bộ phận thực hiện with Autocomplete */}
                          <td className="py-3 px-3 relative">
                            <div className={`relative flex items-center border rounded-lg transition focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 bg-white px-2.5 py-1 ${isMissingDept ? 'border-amber-400 bg-amber-50/10' : 'border-slate-200'}`}>
                              <input
                                type="text"
                                value={row.boPhanThucHien}
                                onChange={(e) => {
                                  handleUpdateField(row.id, 'boPhanThucHien', e.target.value);
                                  setActiveAutocomplete({ rowId: row.id, field: 'boPhanThucHien', searchQuery: e.target.value });
                                }}
                                onFocus={() => setActiveAutocomplete({ rowId: row.id, field: 'boPhanThucHien', searchQuery: row.boPhanThucHien })}
                                className="w-full bg-transparent focus:outline-none text-[11px] font-mono font-bold text-slate-800"
                                placeholder="Mã bộ phận..."
                              />
                            </div>

                            {/* Autocomplete dropdown */}
                            {activeAutocomplete?.rowId === row.id && activeAutocomplete?.field === 'boPhanThucHien' && (
                              <div className="absolute left-3 top-11 z-[99] bg-white border border-slate-200 rounded-lg shadow-xl max-h-72 overflow-y-auto w-96 p-1 text-left">
                                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider p-1.5 font-mono border-b bg-slate-50 flex items-center justify-between">
                                  <span>Gợi ý Bộ Phận</span>
                                  <button type="button" onClick={() => setActiveAutocomplete(null)} className="text-slate-400 hover:text-slate-600">×</button>
                                </div>
                                {autocompleteOptions.length === 0 ? (
                                  <div className="p-2 text-slate-400 italic text-[11px]">Không tìm thấy bộ phận/sale nào khớp</div>
                                ) : (
                                  (autocompleteOptions as DepartmentMaster[]).map((d) => (
                                    <button
                                      key={d.maSale}
                                      type="button"
                                      onClick={() => {
                                        handleUpdateField(row.id, 'boPhanThucHien', d.maSale);
                                        handleUpdateField(row.id, 'tenNvkd', d.tenBoPhan);
                                        setActiveAutocomplete(null);
                                      }}
                                      className="group relative w-full text-left p-2 hover:bg-indigo-50/60 rounded flex flex-col transition text-[11px]"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <span className="font-bold text-indigo-650 font-mono shrink-0">{d.maSale}</span>
                                        <span className="text-[10px] text-slate-400 font-mono">STT: {d.stt || 'N/A'}</span>
                                      </div>
                                      <span className="text-slate-700 font-semibold font-sans leading-snug break-words">{d.tenBoPhan}</span>
                                      <span className="pointer-events-none absolute left-2 top-full z-[120] mt-1 hidden max-w-sm rounded-md bg-slate-900 px-2.5 py-1.5 text-[10px] leading-snug text-white shadow-lg group-hover:block">
                                        Mã sale/bộ phận: {d.maSale} | Tên bộ phận: {d.tenBoPhan}
                                      </span>
                                    </button>
                                  ))
                                )}
                              </div>
                            )}
                          </td>

                          {/* Editable: ma_vv (Product master link) with Autocomplete */}
                          <td className="py-3 px-3 relative">
                            <div className={`relative flex items-center border rounded-lg transition focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 bg-white px-2.5 py-1 ${isMissingVv ? 'border-rose-400 bg-rose-50/10' : isLowConfidence ? 'border-amber-400 bg-amber-50/10' : 'border-slate-200'}`}>
                              <input
                                type="text"
                                value={row.maVv}
                                onChange={(e) => {
                                  handleUpdateField(row.id, 'maVv', e.target.value);
                                  setActiveAutocomplete({ rowId: row.id, field: 'maVv', searchQuery: e.target.value });
                                }}
                                onFocus={() => setActiveAutocomplete({ rowId: row.id, field: 'maVv', searchQuery: row.maVv })}
                                className="w-full bg-transparent focus:outline-none text-[11px] font-mono font-bold text-slate-800"
                                placeholder="Khớp Mã Vụ Việc..."
                              />
                              {row.maVv && (
                                <span className={`text-[9px] font-bold px-1 py-0.5 rounded ml-1 font-mono uppercase ${row.matchStatus === 'OK' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                  {row.confidenceScore}%
                                </span>
                              )}
                            </div>

                            {/* Autocomplete dropdown */}
                            {activeAutocomplete?.rowId === row.id && activeAutocomplete?.field === 'maVv' && (
                              <div className="absolute left-3 top-11 z-[99] bg-white border border-slate-200 rounded-lg shadow-xl max-h-80 overflow-y-auto w-[28rem] p-1 text-left">
                                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider p-1.5 font-mono border-b bg-slate-50 flex items-center justify-between">
                                  <span>Chọn Vụ Việc / Sản phẩm Master</span>
                                  <button type="button" onClick={() => setActiveAutocomplete(null)} className="text-slate-400 hover:text-slate-600">×</button>
                                </div>
                                {autocompleteOptions.length === 0 ? (
                                  <div className="p-2 text-slate-400 italic text-[11px]">Không khớp cụm từ sản phẩm nào</div>
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
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-indigo-750 font-mono">{p.maVuViec}</span>
                                        <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded">TK: {p.tkDoanhThu || 'N/A'}</span>
                                      </div>
                                      <span className="text-slate-700 font-semibold font-sans mt-0.5 leading-snug break-words">{p.tenSanPham}</span>
                                      <span className="text-[10px] text-slate-500 leading-snug break-words">Từ khóa: {p.keyword}</span>
                                      {p.thueSuat !== undefined && p.thueSuat !== '' && (
                                        <span className="text-[10px] text-slate-400 font-mono">Thuế suất: {p.thueSuat}%</span>
                                      )}
                                      <span className="pointer-events-none absolute left-2 top-full z-[120] mt-1 hidden max-w-md rounded-md bg-slate-900 px-2.5 py-1.5 text-[10px] leading-snug text-white shadow-lg group-hover:block">
                                        Mã vụ việc: {p.maVuViec} | Sản phẩm: {p.tenSanPham} | TK doanh thu: {p.tkDoanhThu || 'N/A'} | Từ khóa: {p.keyword}
                                      </span>
                                    </button>
                                  ))
                                )}
                              </div>
                            )}
                          </td>

                          {/* Editable: tk_doanh thu */}
                          <td className="py-3 px-3">
                            <input
                              type="text"
                              value={row.tkDoanhThu}
                              onChange={(e) => handleUpdateField(row.id, 'tkDoanhThu', e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] font-mono text-slate-700 focus:outline-none focus:border-indigo-505"
                            />
                          </td>

                          {/* Editable: Sản phẩm Import */}
                          <td className="py-3 px-3">
                            <textarea
                              value={row.sanPhamImport}
                              onChange={(e) => handleUpdateField(row.id, 'sanPhamImport', e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-700 focus:outline-none focus:border-indigo-505 resize-none h-[42px] whitespace-normal break-words"
                              title={row.sanPhamImport}
                            />
                          </td>

                          {/* Editable: Chuyên trang Import */}
                          <td className="py-3 px-3">
                            <textarea
                              value={row.chuyenTrangImport}
                              onChange={(e) => handleUpdateField(row.id, 'chuyenTrangImport', e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-700 focus:outline-none focus:border-indigo-505 resize-none h-[42px] whitespace-normal break-words"
                              title={row.chuyenTrangImport}
                            />
                          </td>

                          {/* Value in VND */}
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-800 text-[11px]">
                            {row.giaTri ? row.giaTri.toLocaleString('vi-VN') : '0'} ₫
                          </td>

                          {/* Reconciliation state with Fast */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {row.existsInFast ? (
                              <div className="flex flex-col items-center">
                                <span className="text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md px-1.5 py-0.5 font-bold font-mono">
                                  KHỚP FAST
                                </span>
                                <div className="text-[9px] text-slate-400 mt-1 font-mono">
                                  Tr.Thái: {row.fastStatus || 'N/A'} {row.fastGhiChu ? `(${row.fastGhiChu})` : '(G.Chú rỗng)'}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[9px] bg-slate-100 text-slate-450 border border-slate-200 rounded-md px-1.5 py-0.5 font-bold font-mono">
                                KHÔNG CÓ TRong FAST
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between font-sans select-none">
                <span className="text-xs text-slate-500 font-medium">
                  Hiển thị trang <strong className="text-slate-800 font-semibold">{currentPage}</strong> / <strong className="text-slate-800 font-semibold">{totalPages}</strong> ({filteredRows.length} dòng dữ liệu)
                </span>

                <div className="flex items-center space-x-2.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-250 bg-white hover:bg-slate-50 disabled:bg-slate-50/50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeft className="h-4 w-4 text-slate-600" />
                  </button>

                  <div className="flex items-center space-x-1">
                    {Array.from({ length: totalPages }, (_, index) => {
                      const pageNum = index + 1;
                      const isSpanned = pageNum === 1 || pageNum === totalPages || Math.abs(pageNum - currentPage) <= 1;
                      
                      if (!isSpanned) {
                        if (pageNum === 2 || pageNum === totalPages - 1) {
                          return <span key={pageNum} className="text-xs text-slate-400 px-1 font-mono">...</span>;
                        }
                        return null;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`text-xs font-bold leading-none w-7 py-2 rounded-md font-mono transition ${currentPage === pageNum ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:hover:bg-slate-100 border border-transparent'}`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-slate-250 bg-white hover:bg-slate-50 disabled:bg-slate-50/50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <ChevronRight className="h-4 w-4 text-slate-600" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Autocomplete helper dismissing overlay block */}
      {activeAutocomplete && (
        <div 
          className="fixed inset-0 z-40 bg-transparent" 
          onClick={() => setActiveAutocomplete(null)}
        />
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

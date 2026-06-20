/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FilePlus, HelpCircle, FileText, CheckCircle2, Calculator, FileSpreadsheet, 
  Download, AlertTriangle, XCircle, Search, Trash2, Check, ArrowRight, UserCheck, 
  Settings, RefreshCw, ChevronLeft, ChevronRight, Info, Eye, Sparkles, Filter
} from 'lucide-react';
import { 
  ContractSettings, UploadedFileData, CustomerMaster, DepartmentMaster, ProductMaster 
} from '../types';
import ExcelUpload from './ExcelUpload';
import { exportToExcel } from '../utils/excel';
import { buildFastImportRows } from '../utils/fastImport';
import { 
  normalizeText, lookupExact, keywordMatch, applyExceptionRules, parseNumber 
} from '../utils/businessLogic';
import { dbService } from '../services/dbService';

interface HopDongMoiViewProps {
  id?: string;
  config: ContractSettings;
}

const FIELD_LABELS: Record<string, string> = {
  maKhach: 'Mã khách',
  tenKhachHang: 'Tên khách hàng',
  boPhanThucHien: 'Bộ phận thực hiện',
  tenSale: 'Tên sale',
  maVv: 'Mã vụ việc',
  sanPhamImport: 'Sản phẩm import',
  tkDoanhThu: 'TK doanh thu',
  thueSuat: 'Thuế suất',
  chuyenTrangImport: 'Chuyên trang import',
  giaTri: 'Giá trị',
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

export default function HopDongMoiView({
  id = 'hop-dong-moi-view',
  config,
}: HopDongMoiViewProps) {
  // Master data state loaded from storage
  const [customers, setCustomers] = useState<CustomerMaster[]>([]);
  const [departments, setDepartments] = useState<DepartmentMaster[]>([]);
  const [products, setProducts] = useState<ProductMaster[]>([]);
  const [loadingMaster, setLoadingMaster] = useState(true);

  // Files uploaded by accountant
  const [fileMoiList, setFileMoiList] = useState<UploadedFileData[]>([]);
  const [fileFastList, setFileFastList] = useState<UploadedFileData[]>([]);

  // Processing results and errors
  const [processedRows, setProcessedRows] = useState<Record<string, any>[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filtering & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState(true); // Default: Filter out rows that exist in Fast
  const [vvConfidenceRange, setVvConfidenceRange] = useState({ from: '', to: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;

  const fileMoi = useMemo(() => mergeUploadedFiles(fileMoiList, 'Hợp đồng mới'), [fileMoiList]);
  const fileFast = useMemo(() => mergeUploadedFiles(fileFastList, 'Danh sách hợp đồng Fast'), [fileFastList]);

  const confirmResetProcessedData = () => {
    if (!processedRows) return true;
    const ok = window.confirm(
      'Dữ liệu đã xử lý và các thay đổi thủ công trên bảng sẽ bị mất nếu tiếp tục. Bạn có chắc chắn muốn thay đổi danh sách file không?'
    );
    if (ok) {
      setProcessedRows(null);
      setCurrentPage(1);
      setActiveAutocomplete(null);
    }
    return ok;
  };

  const replaceUploadedFiles = (
    files: UploadedFileData[],
    setter: React.Dispatch<React.SetStateAction<UploadedFileData[]>>
  ) => {
    if (!confirmResetProcessedData()) return;
    setter(files);
    setProcessedRows(null);
  };

  const removeUploadedFile = (
    index: number,
    setter: React.Dispatch<React.SetStateAction<UploadedFileData[]>>
  ) => {
    if (!confirmResetProcessedData()) return;
    setter((files) => files.filter((_, fileIndex) => fileIndex !== index));
    setProcessedRows(null);
  };

  // Active inputs autocomplete manager
  const [activeAutocomplete, setActiveAutocomplete] = useState<{
    rowId: string;
    field: 'maVv' | 'maKhach' | 'boPhanThucHien' | 'sanPhamImport' | 'tkDoanhThu';
    searchQuery: string;
  } | null>(null);

  // Dropdown reference to handle click outside
  const autocompleteContainerRef = useRef<HTMLDivElement | null>(null);

  // Load masters on mount
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
        console.error('Lỗi khi tải Master Data trong HopDongMoiView:', err);
      } finally {
        setLoadingMaster(false);
      }
    }
    loadMasters();
  }, []);

  // Handle click outside autocomplete
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

  // Helper extractor for flexible cell values
  const getCellValue = (row: any, ...candidates: string[]): string => {
    const keys = Object.keys(row);
    // Try exact matches
    for (const cand of candidates) {
      if (row[cand] !== undefined) return String(row[cand]);
      const found = keys.find(k => k.trim().toLowerCase() === cand.trim().toLowerCase());
      if (found) return String(row[found]);
    }
    // Try normalized match
    const strippedCands = candidates.map(c => normalizeText(c));
    for (const key of keys) {
      if (strippedCands.includes(normalizeText(key))) {
        return String(row[key]);
      }
    }
    return '';
  };

  // Run mapping engine and compare with Fast list
  const handleProcessContracts = () => {
    if (isProcessing) return;

    if (!fileMoi || fileMoi.sheets.length === 0) {
      setErrorMessage('Vui lòng tải lên "File Hợp đồng mới" trước khi hạch toán.');
      return;
    }

    setIsProcessing(true);
    window.setTimeout(() => {
      try {
        setErrorMessage(null);
        const sheetMoi = fileMoi.sheets[0];
        const sheetFast = fileFast && fileFast.sheets.length > 0 ? fileFast.sheets[0] : null;

        const mapped = sheetMoi.rows.map((row, index) => {
      // 1. extract literal values
      const soHd = getCellValue(row, 'Số HĐ', 'So HD', 'Mã yêu cầu', 'Hợp đồng', 'Số HĐ nhận việc').trim();
      const tenSale = getCellValue(row, 'Tên sale', 'Ten sale', 'Sale', 'Tên NVKD', 'Người bán').trim();
      const tenKhachHang = getCellValue(row, 'Tên khách hàng', 'Ten khach hang', 'Tên khách', 'Khách hàng').trim();
      
      const sanPham = getCellValue(row, 'Sản phẩm', 'San pham').trim();
      const loaiBanner = getCellValue(row, 'Loại banner', 'Loai banner').trim();
      const tenBanner = getCellValue(row, 'Tên banner', 'Ten banner').trim();

      const soLuongRaw = getCellValue(row, 'Số lượng', 'So luong').trim();
      const donGia = parseNumber(getCellValue(row, 'Đơn giá', 'Don gia'));
      const chietKhau = parseNumber(getCellValue(row, 'Chiết khấu', 'Chiet khau', 'Tỷ lệ ck'));
      const thanhTien = parseNumber(getCellValue(row, 'Thành tiền', 'Thanh tien') || getCellValue(row, 'Tổng thành tiền', 'Thành tiền thực chạy (có VAT)'));

      // 2. logic: Mã hợp đồng / Tên hợp đồng
      const suffix = config.contractSuffix || 'AD';
      const separator = config.contractNameSeparator !== undefined ? config.contractNameSeparator : '/';
      const maHopDong = soHd ? `${soHd}${suffix}` : '';
      const tenHopDong = soHd ? `${soHd}${separator}${suffix}` : '';

      // 3. logic: Mã khách & Bộ phận thực hiện
      const maKhach = lookupExact(tenKhachHang, customers, 'tenKhach', 'maKhach') || '';
      const boPhanThucHien = lookupExact(tenSale, departments, 'tenBoPhan', 'maSale') || '';

      // 4. logic: Mã vụ việc (keyword match)
      const combinedProductText = [sanPham, loaiBanner, tenBanner].filter(Boolean).join(' ');
      const matchResult = keywordMatch(combinedProductText, products);

      const maVv = matchResult.maVV || '';
      const confidenceScore = matchResult.bestMatch ? matchResult.confidenceScore : 0;
      const matchStatus = matchResult.bestMatch ? matchResult.status : 'KHONG_MATCH';

      // 5. logic: Số lượng (extract number from string)
      const soLuong = parseNumber(soLuongRaw) || 1;

      // 6. logic: Thuế suất (lookup from master or fallback)
      let thueSuat = config.taxRate;
      let hasThueSuatInMaster = false;
      if (matchResult.bestMatch && matchResult.bestMatch.thueSuat !== undefined && matchResult.bestMatch.thueSuat !== '') {
        thueSuat = parseNumber(matchResult.bestMatch.thueSuat);
        hasThueSuatInMaster = true;
      } else {
        const rawThueSuat = getCellValue(row, 'Thuế suất', 'Thue suat').trim();
        if (rawThueSuat) {
          thueSuat = parseNumber(rawThueSuat);
        }
      }

      // 7. logic: Giá trị của vv VAT = Thành tiền * Thuế suất
      const taxRateMultiplier = thueSuat > 1 ? thueSuat / 100 : thueSuat;
      const giaTriCuaVvVat = Math.round(thanhTien * taxRateMultiplier);

      // 8. logic: tk_doanh thu
      const tkDoanhThu = matchResult.bestMatch?.tkDoanhThu || '';

      // 9. logic: Tỷ lệ ck
      const tyLeCk = chietKhau;

      // 10. logic: Sản phẩm Import = Chuẩn hóa Tên sản phẩm
      const sanPhamImport = matchResult.bestMatch?.tenSanPham || '';

      // 11. logic: Chuyên trang import 
      const website = getCellValue(row, 'Website').trim();
      const chuyenMuc = getCellValue(row, 'Chuyên mục', 'Chuyen muc').trim();
      const hinhThucQc = getCellValue(row, 'Hình thức QC', 'Hinh thuc QC').trim();
      const nhomWebsite = getCellValue(row, 'Nhóm website', 'Nhom website').trim();

      let rawChuyenTrang = website || nhomWebsite || '';
      if (chuyenMuc) rawChuyenTrang = rawChuyenTrang ? `${rawChuyenTrang} - ${chuyenMuc}` : chuyenMuc;
      if (hinhThucQc) {
        rawChuyenTrang = rawChuyenTrang ? `${hinhThucQc} - ${rawChuyenTrang}` : hinhThucQc;
      }

      let exceptionText = applyExceptionRules(rawChuyenTrang, config.exceptionRules);
      if (!exceptionText && website) {
        exceptionText = applyExceptionRules(website, config.exceptionRules);
      }
      const chuyenTrangImport = exceptionText || rawChuyenTrang || getCellValue(row, 'Chuyên trang', 'Chuyen trang').trim();

      // Dates support
      const ngayBatDau = getCellValue(row, 'Ngày bắt đầu', 'Ngay bat dau', 'Từ ngày').trim();
      const ngayKetThuc = getCellValue(row, 'Ngày kết thúc', 'Ngay ket thuc', 'Đến ngày').trim();
      const ngayHopDong = getCellValue(row, 'Ngày hợp đồng', 'Ngay hop dong', 'Ngày ký').trim();

      // 12. Check references in FAST list
      let existsInFast = false;
      let fastGhiChu = '';
      let fastStatus = '';

      if (sheetFast) {
        const normTenHopDong = normalizeText(tenHopDong);
        const normMaHopDong = normalizeText(maHopDong);

        const matchFastRow = sheetFast.rows.find(f => {
          const fastTen = String(getCellValue(f, 'Tên hợp đồng', 'Ten hop dong') || '').trim();
          const fastCode = String(getCellValue(f, 'Hợp đồng', 'Hop dong', 'Mã hợp đồng', 'Mã HĐ') || '').trim();
          
          return (fastTen && normalizeText(fastTen) === normTenHopDong) ||
                 (normMaHopDong && fastCode && normalizeText(fastCode) === normMaHopDong);
        });

        if (matchFastRow) {
          existsInFast = true;
          fastStatus = String(getCellValue(matchFastRow, 'Trạng thái', 'Trang thai')).trim();
          fastGhiChu = String(getCellValue(matchFastRow, 'Ghi chú', 'Ghi chu')).trim();
        }
      }

      return {
        id: `row_${index}_${Date.now()}`,
        maHopDong,
        tenHopDong,
        tenKhachHang,
        maKhach,
        tenSale,
        boPhanThucHien,
        ngayBatDau,
        ngayKetThuc,
        ngayHopDong,

        ngayHd1: getCellValue(row, 'ngay_hd1').trim(),
        ngayHd2: getCellValue(row, 'ngay_hd2').trim(),
        ngayHd3: getCellValue(row, 'ngay_hd3').trim(),
        ngayHd4: getCellValue(row, 'ngay_hd4').trim(),
        ngayHd5: getCellValue(row, 'ngay_hd5').trim(),
        ngayHd6: getCellValue(row, 'ngay_hd6').trim(),

        tienHd1: getCellValue(row, 'tien_hd1').trim(),
        tienHd2: getCellValue(row, 'tien_hd2').trim(),
        tienHd3: getCellValue(row, 'tien_hd3').trim(),
        tienHd4: getCellValue(row, 'tien_hd4').trim(),
        tienHd5: getCellValue(row, 'tien_hd5').trim(),
        tienHd6: getCellValue(row, 'tien_hd6').trim(),

        giaTri: thanhTien, // Price mapped to 'Thành tiền' (as pre-VAT standard for Fast system)
        maVv,
        soLuong,
        donGia,
        thueSuat,
        giaTriCuaVvVat,
        tkDoanhThu,
        bangKe: getCellValue(row, 'Bảng kê', 'Bang ke').trim(),
        tyLeCk,
        chuyenTrang: website,
        ghiChu: getCellValue(row, 'Ghi chú', 'Ghi chu', 'Điều kiện thanh toán').trim(),
        hinhThucQc,
        sanPham,
        loaiBanner,
        tenBanner,

        chuyenTrangImport,
        sanPhamImport,

        confidenceScore,
        matchStatus,
        hasThueSuatInMaster,

        existsInFast,
        fastStatus,
        fastGhiChu,
      };
    });

        setProcessedRows(mapped);
        setCurrentPage(1);
      } catch (err: any) {
        setErrorMessage(err?.message || 'Có lỗi xảy ra khi xử lý dữ liệu.');
      } finally {
        window.setTimeout(() => setIsProcessing(false), 450);
      }
    }, 0);
  };

  // Inline column updates
  const handleUpdateField = (rowId: string, field: string, value: any) => {
    if (!processedRows) return;
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

      // Re-trigger product lookup implications if Mã Vụ việc changes
      if (field === 'maVv') {
        const foundProd = products.find(p => p.maVuViec === value);
        if (foundProd) {
          newRow.sanPhamImport = foundProd.tenSanPham;
          newRow.tkDoanhThu = foundProd.tkDoanhThu;
          newRow.thueSuat = foundProd.thueSuat !== undefined && foundProd.thueSuat !== '' ? parseNumber(foundProd.thueSuat) : newRow.thueSuat;
          newRow.confidenceScore = 100;
          newRow.matchStatus = 'OK';
          newRow.hasThueSuatInMaster = true;

          // Recompute VAT
          const taxRateMultiplier = newRow.thueSuat > 1 ? newRow.thueSuat / 100 : newRow.thueSuat;
          newRow.giaTriCuaVvVat = Math.round(newRow.giaTri * taxRateMultiplier);
        }
      }

      // Re-trigger product lookup implications if Tên sản phẩm changes
      if (field === 'sanPhamImport') {
        const foundProd = products.find(p => p.tenSanPham === value);
        if (foundProd) {
          newRow.maVv = foundProd.maVuViec;
          newRow.tkDoanhThu = foundProd.tkDoanhThu;
          newRow.thueSuat = foundProd.thueSuat !== undefined && foundProd.thueSuat !== '' ? parseNumber(foundProd.thueSuat) : newRow.thueSuat;
          newRow.confidenceScore = 100;
          newRow.matchStatus = 'OK';
          newRow.hasThueSuatInMaster = true;

          // Recompute VAT
          const taxRateMultiplier = newRow.thueSuat > 1 ? newRow.thueSuat / 100 : newRow.thueSuat;
          newRow.giaTriCuaVvVat = Math.round(newRow.giaTri * taxRateMultiplier);
        }
      }

      // If thueSuat changes, recompute Giá trị của vv VAT
      if (field === 'thueSuat') {
        const parsedThue = parseNumber(value);
        newRow.thueSuat = parsedThue;
        const taxRateMultiplier = parsedThue > 1 ? parsedThue / 100 : parsedThue;
        newRow.giaTriCuaVvVat = Math.round(newRow.giaTri * taxRateMultiplier);
      }

      // If giaTri changes, recompute Giá trị của vv VAT
      if (field === 'giaTri') {
        const parsedVal = parseNumber(value);
        newRow.giaTri = parsedVal;
        const taxRateMultiplier = newRow.thueSuat > 1 ? newRow.thueSuat / 100 : newRow.thueSuat;
        newRow.giaTriCuaVvVat = Math.round(parsedVal * taxRateMultiplier);
      }

      return newRow;
    });
    setProcessedRows(updated);
  };

  // Autocomplete option engine
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
      // Return list of products matching this or general products list
      const matched = products.filter(p => 
        normalizeText(p.tkDoanhThu).includes(query) || 
        normalizeText(p.tenSanPham).includes(query)
      );
      // Deduplicate tkDoanhThu
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

  // Filtering rules mapping to Fast check:
  // "Lọc các dòng có Tên hợp đồng không tồn tại trong Fast"
  const shouldKeepRow = (row: any) => {
    if (filterActive && fileFast) {
      const isStatus2 = String(row.fastStatus).trim() === '2';
      return !row.existsInFast || isStatus2;
    }
    return true;
  };

  // Filter & Search rows
  const filteredRows = useMemo(() => {
    if (!processedRows) return [];

    return processedRows.filter(row => {
      // 1. fast list duplicate checks
      if (!shouldKeepRow(row)) return false;

      const rangeFrom = vvConfidenceRange.from === '' ? 0 : Math.max(0, Math.min(100, Number(vvConfidenceRange.from)));
      const rangeTo = vvConfidenceRange.to === '' ? 100 : Math.max(0, Math.min(100, Number(vvConfidenceRange.to)));
      const lowerConfidence = Math.min(rangeFrom, rangeTo);
      const upperConfidence = Math.max(rangeFrom, rangeTo);
      const rowConfidence = Number(row.confidenceScore || 0);
      if ((vvConfidenceRange.from !== '' || vvConfidenceRange.to !== '') && (rowConfidence < lowerConfidence || rowConfidence > upperConfidence)) return false;

      // 2. text matching
      if (searchTerm.trim()) {
        const query = normalizeText(searchTerm);
        const matchCode = normalizeText(row.maHopDong).includes(query);
        const matchName = normalizeText(row.tenHopDong).includes(query);
        const matchCust = normalizeText(row.tenKhachHang).includes(query);
        const matchCustCode = normalizeText(row.maKhach).includes(query);
        const matchSale = normalizeText(row.tenSale).includes(query);

        return matchCode || matchName || matchCust || matchCustCode || matchSale;
      }

      return true;
    });
  }, [processedRows, filterActive, fileFast, vvConfidenceRange, searchTerm]);

  // Pagination bounds
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));

  // Compute stats on the current qualified list
  const stats = useMemo(() => {
    if (!processedRows) {
      return { totalSource: 0, qualifiedCount: 0, missingKhach: 0, missingDept: 0, missingVv: 0, missingThueSuat: 0, needCheck: 0 };
    }

    const totalSource = processedRows.length;
    const qualifiedList = processedRows.filter(shouldKeepRow);
    const qualifiedCount = qualifiedList.length;

    let missingKhach = 0;
    let missingDept = 0;
    let missingVv = 0;
    let missingThueSuat = 0;
    let needCheck = 0;

    qualifiedList.forEach(row => {
      if (!row.maKhach || !row.maKhach.trim()) missingKhach++;
      if (!row.boPhanThucHien || !row.boPhanThucHien.trim()) missingDept++;
      if (!row.maVv || !row.maVv.trim()) {
        missingVv++;
      } else {
        if (row.matchStatus === 'CAN_KIEM_TRA' || row.confidenceScore < 70) {
          needCheck++;
        }
      }
      if (row.thueSuat === undefined || row.thueSuat === null || isNaN(row.thueSuat)) {
        missingThueSuat++;
      }
    });

    return { totalSource, qualifiedCount, missingKhach, missingDept, missingVv, missingThueSuat, needCheck };
  }, [processedRows, filterActive, fileFast]);

  // Excel output with exactly 36 columns and default Status = 2
  const handleExportFinished = () => {
    if (!processedRows || filteredRows.length === 0) return;

    // Check for critical missing values or validation markings before exporting
    const hasWarnings = filteredRows.some(row => 
      !row.ngayBatDau || !row.ngayKetThuc || !row.ngayHopDong || 
      !row.maKhach || !row.maKhach.trim() ||
      !row.boPhanThucHien || !row.boPhanThucHien.trim() ||
      !row.maVv || !row.maVv.trim() ||
      row.matchStatus === 'CAN_KIEM_TRA' || row.confidenceScore < 70
    );

    if (hasWarnings) {
      const confirmExport = window.confirm(
        '⚠️ CẢNH BÁO PHÁT HIỆN LỖI HẠCH TOÁN:\n\n' +
        'Sổ xuất Excel chuẩn bị tải xuống có dòng gặp Ngày tháng thiếu, thiếu Mã vụ việc thâm căn, thiếu Mã khách hoặc nghi vấn độ chính xác (Confidence Score thấp).\n\n' +
        'Bạn có chắc chắn muốn xuất tệp Excel không?'
      );
      if (!confirmExport) return;
    }

    const dataExcel = buildFastImportRows(filteredRows, { status: 2, sttMode: 'blank' });

    exportToExcel(
      [{ sheetName: 'HĐ Mới Fast Import', data: dataExcel }],
      `Enriched_HopDongMoi_36Cols_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  return (
    <div id={id} className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-4.5 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center space-x-2">
            <FilePlus className="h-6 w-6 text-indigo-500" />
            <span>Xử lý hợp đồng mới</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Hạch toán bóc tách hợp đồng mới ký kết sang mã vụ việc, tự động dán doanh thu, liên kết thuế suất, lọc loại trừ trùng lặp có sẵn trong hệ thống Fast.
          </p>
        </div>
      </div>

      {/* Dual upload workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Upload 1: New contracts */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono flex items-center space-x-1.5">
              <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg font-bold">1</span>
              <span>Tải lên File Hợp đồng mới</span>
            </h3>
            {fileMoi ? (
              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md px-2 py-0.5 font-bold font-mono">
                SẴN SÀNG
              </span>
            ) : (
              <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-100 rounded-md px-2 py-0.5 font-bold font-mono">
                BẮT BUỘC
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            Xem xét trích xuất Mã KH, Bộ phận thực hiện, Mã vụ việc (gộp Sản phẩm + Banner), Số lượng và Tính thuế suất.
          </p>
          <ExcelUpload
            multiple
            compact
            showSuccessDetails={false}
            onUploadSuccess={(data) => {
              replaceUploadedFiles([data], setFileMoiList);
            }}
            onUploadManySuccess={(data) => {
              replaceUploadedFiles(data, setFileMoiList);
            }}
            onUploadError={(err) => setErrorMessage(err)}
            placeholderText="Kéo thả một hoặc nhiều File Hợp đồng mới (.xlsx, .xls) vào đây hoặc click để chọn"
          />
          {fileMoiList.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 font-mono">File đã tải lên ({fileMoiList.length})</div>
              <div className="space-y-1">
                {fileMoiList.map((file, index) => (
                  <div key={`${file.fileName}_${index}`} className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50/70 px-2.5 py-1.5">
                    <div className="min-w-0">
                      <div className="truncate text-[11px] font-semibold text-slate-700" title={file.fileName}>
                        {file.fileName} <span className="text-slate-400 font-mono">({file.sheets[0]?.rows.length || 0} dòng)</span>
                      </div>
                    </div>
                    <button type="button" onClick={() => removeUploadedFile(index, setFileMoiList)} title="Xóa file này khỏi danh sách xử lý" className="h-6 w-6 flex items-center justify-center rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Upload 2: Fast contracts list (optional/filter matching) */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono flex items-center space-x-1.5">
              <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg font-bold">2</span>
              <span>Tải lên Danh sách hợp đồng Fast (Loại trừ trùng)</span>
            </h3>
            {fileFast ? (
              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md px-2 py-0.5 font-bold font-mono">
                SẴN SÀNG ĐỐI CHIẾU
              </span>
            ) : (
              <span className="text-[10px] bg-slate-100 text-slate-450 border border-slate-200 rounded-md px-2 py-0.5 font-bold font-mono">
                KHÔNG BẮT BUỘC
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            Để tự động lọc bớt các hợp đồng mới đã được đẩy/đăng ký trong hệ thống Fast (so khớp mã và tên hợp đồng).
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
            placeholderText="Kéo thả một hoặc nhiều Danh sách hợp đồng Fast (.xlsx, .xls) hoặc click để chọn"
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

      {/* Controller actions */}
      {fileMoi && (
        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3 text-slate-600 text-xs">
            <Info className="h-5 w-5 text-indigo-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-slate-700">Tệp tin đầu vào sẵn sàng phân tích</p>
              <p className="text-slate-400">
                File HĐ Mới: <strong className="font-mono text-indigo-600">[{fileMoi.fileName}]</strong> ({fileMoi.sheets[0]?.rows.length} dòng)
                {fileFast && <> | File HĐ Fast: <strong className="font-mono text-rose-600">[{fileFast.fileName}]</strong> ({fileFast.sheets[0]?.rows.length} dòng)</>}
              </p>
            </div>
          </div>
          <button
            onClick={handleProcessContracts}
            disabled={isProcessing}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-wait text-white text-sm font-bold rounded-xl shadow-md transition-all active:scale-[0.98]"
          >
            {isProcessing ? <RefreshCw className="h-4.5 w-4.5 animate-spin" /> : <Calculator className="h-4.5 w-4.5" />}
            <span>{isProcessing ? 'ĐANG XỬ LÝ...' : 'HẠCH TOÁN & LOẠI TRÙNG FAST'}</span>
          </button>
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

      {/* Report presentation workspace */}
      {processedRows && (
        <div className="space-y-6">
          
          {/* Integrated stats dashboards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
            
            {/* Total inputs */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 transition">
              <span className="text-[10px] font-bold text-slate-400 block uppercase font-mono tracking-wider">HĐ Mới tải lên</span>
              <div className="flex items-baseline space-x-1 mt-1.5">
                <span className="text-xl font-extrabold text-slate-700">{stats.totalSource}</span>
                <span className="text-[10px] text-slate-400 font-mono">dòng</span>
              </div>
              <span className="text-[9px] text-slate-400 mt-1 block">Tệp gốc ban đầu</span>
            </div>

            {/* Qualified export */}
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 transition">
              <span className="text-[10px] font-bold text-indigo-500 block uppercase font-mono tracking-wider">Đủ mốc hạch toán</span>
              <div className="flex items-baseline space-x-1 mt-1.5">
                <span className="text-xl font-extrabold text-indigo-700 font-sans">{stats.qualifiedCount}</span>
                <span className="text-[10px] text-indigo-400 font-mono">dòng</span>
              </div>
              <span className="text-[9px] text-indigo-400 mt-1 block">
                {fileFast ? "Đã lọc trùng khớp Fast" : "Chưa so khớp tệp Fast"}
              </span>
            </div>

            {/* Missing customers lookup */}
            <div className={`border rounded-xl p-4 transition ${stats.missingKhach > 0 ? 'bg-amber-50/40 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
              <span className={`text-[10px] font-bold block uppercase font-mono tracking-wider ${stats.missingKhach > 0 ? 'text-amber-600' : 'text-slate-400'}`}>Thiếu mã khách</span>
              <div className="flex items-baseline space-x-1 mt-1.5">
                <span className={`text-xl font-extrabold font-sans ${stats.missingKhach > 0 ? 'text-amber-700' : 'text-slate-700'}`}>{stats.missingKhach}</span>
                <span className="text-[10px] text-slate-400 font-mono">lỗi</span>
              </div>
              <span className="text-[9px] text-slate-450 mt-1 block">Cần điền Mã KH</span>
            </div>

            {/* Missing department code */}
            <div className={`border rounded-xl p-4 transition ${stats.missingDept > 0 ? 'bg-amber-50/40 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
              <span className={`text-[10px] font-bold block uppercase font-mono tracking-wider ${stats.missingDept > 0 ? 'text-amber-600' : 'text-slate-400'}`}>Thiếu bộ phận</span>
              <div className="flex items-baseline space-x-1 mt-1.5">
                <span className={`text-xl font-extrabold font-sans ${stats.missingDept > 0 ? 'text-amber-700' : 'text-slate-700'}`}>{stats.missingDept}</span>
                <span className="text-[10px] text-slate-400 font-mono">lỗi</span>
              </div>
              <span className="text-[9px] text-slate-450 mt-1 block">Bộ phận bán chưa map</span>
            </div>

            {/* Missing ma_vv */}
            <div className={`border rounded-xl p-4 transition ${stats.missingVv > 0 ? 'bg-rose-50/40 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
              <span className={`text-[10px] font-bold block uppercase font-mono tracking-wider ${stats.missingVv > 0 ? 'text-rose-600' : 'text-slate-400'}`}>Thiếu mã vụ việc</span>
              <div className="flex items-baseline space-x-1 mt-1.5">
                <span className={`text-xl font-extrabold font-sans ${stats.missingVv > 0 ? 'text-rose-700' : 'text-slate-700'}`}>{stats.missingVv}</span>
                <span className="text-[10px] text-slate-400 font-mono">lỗi</span>
              </div>
              <span className="text-[9px] text-slate-450 mt-1 block">Không khớp keyword</span>
            </div>

            {/* Missing tax rate */}
            <div className={`border rounded-xl p-4 transition ${stats.missingThueSuat > 0 ? 'bg-rose-50/40 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
              <span className={`text-[10px] font-bold block uppercase font-mono tracking-wider ${stats.missingThueSuat > 0 ? 'text-rose-600' : 'text-slate-400'}`}>Thiếu thuế suất</span>
              <div className="flex items-baseline space-x-1 mt-1.5">
                <span className={`text-xl font-extrabold font-sans ${stats.missingThueSuat > 0 ? 'text-rose-700' : 'text-slate-700'}`}>{stats.missingThueSuat}</span>
                <span className="text-[10px] text-slate-400 font-mono">lỗi</span>
              </div>
              <span className="text-[9px] text-slate-450 mt-1 block">Cần bổ sung/lookup</span>
            </div>

            {/* Needs check (CAN_KIEM_TRA) */}
            <div className={`border rounded-xl p-4 transition ${stats.needCheck > 0 ? 'bg-amber-50/40 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
              <span className={`text-[10px] font-bold block uppercase font-mono tracking-wider ${stats.needCheck > 0 ? 'text-amber-600' : 'text-slate-400'}`}>Cần kiểm tra</span>
              <div className="flex items-baseline space-x-1 mt-1.5">
                <span className={`text-xl font-extrabold font-sans ${stats.needCheck > 0 ? 'text-amber-700' : 'text-slate-700'}`}>{stats.needCheck}</span>
                <span className="text-[10px] text-slate-400 font-mono">dòng</span>
              </div>
              <span className="text-[9px] text-slate-450 mt-1 block">Confidence match thấp</span>
            </div>

          </div>

          {/* Interactive filter & exporter ribbon */}
          <div className="bg-slate-900 border border-slate-850 text-white rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Mã HĐ, Tên HĐ, Khách hàng, Sale..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-slate-800 border border-slate-700 text-xs px-3.5 pl-9 py-2 rounded-lg text-white w-56 focus:outline-none focus:border-indigo-500 placeholder-slate-450 font-medium"
                />
              </div>

              {/* Duplicate comparison trigger */}
              {fileFast && (
                <label className="flex items-center space-x-2.5 cursor-pointer select-none text-xs bg-slate-800 p-2.5 rounded-lg border border-slate-700">
                  <input
                    type="checkbox"
                    checked={filterActive}
                    onChange={(e) => {
                      setFilterActive(e.target.checked);
                      setCurrentPage(1);
                    }}
                    className="rounded text-indigo-600 focus:ring-opacity-0 h-4 w-4"
                  />
                  <span className="font-semibold flex items-center space-x-1">
                    <Filter className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Lọc loại trừ HĐ đã tồn tại trên Fast ({stats.qualifiedCount} / {stats.totalSource} dòng)</span>
                  </span>
                </label>
              )}

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

            <button
              onClick={handleExportFinished}
              disabled={filteredRows.length === 0}
              className="flex items-center justify-center space-x-2 text-xs font-bold leading-none bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 disabled:text-slate-500 cursor-pointer disabled:cursor-not-allowed text-white px-5 py-3 rounded-lg transition shadow-md"
            >
              <Download className="h-4.5 w-4.5" />
              <span>XUẤT FILE PHỤC VỤ FAST IMPORT ({filteredRows.length} DÒNG - 36 CỘT)</span>
            </button>
          </div>

          {/* Interactive Spreadsheet View */}
          <div ref={autocompleteContainerRef} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-55/45">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-widest font-mono">Màn hình hiệu chuẩn bảng kê hạch toán (Duyệt & Sửa trực tiếp)</span>
              <span className="text-[11px] text-slate-450">Hiển thị <strong className="text-slate-700">{filteredRows.length}</strong> dòng hạch toán trong bảng lọc</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-500 border-b border-slate-200 select-none font-semibold">
                    <th className="py-2.5 px-3 w-10 text-center font-mono">STT</th>
                    <th className="py-2.5 px-3 min-w-[120px]">Tên / Mã Hợp Đồng</th>
                    <th className="py-2.5 px-3 min-w-[130px]">Khách Hàng (Raw)</th>
                    <th className="py-2.5 px-3 min-w-[160px]">Mã Khách (Autocomplete)</th>
                    <th className="py-2.5 px-3 min-w-[150px]">Bộ Phận Thực Hiện (Autocomplete)</th>
                    <th className="py-2.5 px-3 min-w-[180px]">Mã Vụ Việc - ma_vv (Autocomplete)</th>
                    <th className="py-2.5 px-3 min-w-[170px]">Tên Sản Phẩm Import (Autocomplete)</th>
                    <th className="py-2.5 px-3 min-w-[105px]">TK Doanh Thu (Autocomplete)</th>
                    <th className="py-2.5 px-3 min-w-[70px] text-center">Thuế Suất</th>
                    <th className="py-2.5 px-3 min-w-[130px]">Chuyên Trang Import</th>
                    <th className="py-2.5 px-3 min-w-[90px] text-right">Tổng Tiền</th>
                    <th className="py-2.5 px-3 min-w-[100px] text-right">Tiền VAT vụ việc</th>
                    <th className="py-2.5 px-3 min-w-[100px] text-center">Trạng Thái Fast</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="py-12 text-center text-slate-450 font-medium">
                        Không tìm thấy hợp đồng mới nào khớp với các điều kiện lọc và tìm kiếm hiện tại.
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row, idx) => {
                      const absoluteIndex = (currentPage - 1) * rowsPerPage + idx + 1;

                      // Diagnostic flags
                      const isMissingKhach = !row.maKhach || !row.maKhach.trim();
                      const isMissingDept = !row.boPhanThucHien || !row.boPhanThucHien.trim();
                      const isMissingVv = !row.maVv || !row.maVv.trim();
                      const isMissingThue = row.thueSuat === undefined || row.thueSuat === null || isNaN(row.thueSuat);
                      const isLowConfidence = row.matchStatus === 'CAN_KIEM_TRA' || row.confidenceScore < 70;
                      const rowWarnings = [
                        isMissingKhach ? 'Thiếu Mã khách' : '',
                        isMissingDept ? 'Thiếu Bộ phận thực hiện' : '',
                        isMissingVv ? 'Thiếu Mã vụ việc' : '',
                        isMissingThue ? 'Thiếu Thuế suất' : '',
                        !isMissingVv && isLowConfidence ? `Mã vụ việc khớp thấp (${row.confidenceScore || 0}%)` : '',
                      ].filter(Boolean);
                      const manualFields = Object.keys(row.manualChanges || {}).map((field) => FIELD_LABELS[field] || field);

                      return (
                        <tr key={row.id} className="hover:bg-slate-50/50 transition duration-150">
                          
                          {/* Indexes */}
                          <td className="py-3 px-3 text-center text-slate-450 font-mono font-bold border-r border-slate-100">
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

                          {/* Code & Name Contract */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="font-mono font-bold text-slate-700 text-[11px]">{row.maHopDong || <span className="text-rose-400 italic">Chưa nhập</span>}</div>
                            <div className="text-[10px] text-slate-450 mt-0.5 max-w-[200px] truncate" title={row.tenHopDong}>
                              {row.tenHopDong || 'N/A'}
                            </div>
                          </td>

                          {/* Ten khach nhap tay */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="font-semibold text-slate-750 text-[11px] max-w-[140px] truncate" title={row.tenKhachHang}>
                              {row.tenKhachHang || 'N/A'}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5 max-w-[120px] truncate">
                              Sale: <span className="font-medium text-slate-600">{row.tenSale || 'K.Hàng Đại Lý'}</span>
                            </div>
                          </td>

                          {/* Autocomplete: Mã Khách */}
                          <td className="py-3 px-3 relative">
                            <div className={`flex items-center border rounded-lg bg-white px-2.5 py-1 transition focus-within:ring-2 focus-within:ring-indigo-505/20 focus-within:border-indigo-500 ${isMissingKhach ? 'border-amber-400 bg-amber-50/10' : 'border-slate-200'}`}>
                              <input
                                type="text"
                                value={row.maKhach}
                                onChange={(e) => {
                                  handleUpdateField(row.id, 'maKhach', e.target.value);
                                  setActiveAutocomplete({ rowId: row.id, field: 'maKhach', searchQuery: e.target.value });
                                }}
                                onFocus={() => setActiveAutocomplete({ rowId: row.id, field: 'maKhach', searchQuery: row.maKhach })}
                                className="w-full bg-transparent focus:outline-none text-[11px] font-mono font-bold text-slate-800"
                                placeholder="Khớp Mã khách..."
                              />
                            </div>

                            {/* Options Dropdown */}
                            {activeAutocomplete?.rowId === row.id && activeAutocomplete?.field === 'maKhach' && (
                              <div className="absolute left-3 top-11 z-[99] bg-white border border-slate-200 rounded-lg shadow-xl max-h-72 overflow-y-auto w-96 p-1 text-left">
                                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider p-1.5 font-mono border-b bg-slate-50 flex items-center justify-between">
                                  <span>Tìm Mã Khách Master</span>
                                  <button type="button" onClick={() => setActiveAutocomplete(null)} className="text-slate-400 hover:text-slate-600">×</button>
                                </div>
                                {autocompleteOptions.length === 0 ? (
                                  <div className="p-2 text-slate-400 italic text-[11px]">Không khớp kết quả nào</div>
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

                          {/* Autocomplete: Bộ phận thực hiện (lookup of sale name) */}
                          <td className="py-3 px-3 relative">
                            <div className={`flex items-center border rounded-lg bg-white px-2.5 py-1 transition focus-within:ring-2 focus-within:ring-indigo-505/20 focus-within:border-indigo-500 ${isMissingDept ? 'border-amber-400 bg-amber-50/10' : 'border-slate-200'}`}>
                              <input
                                type="text"
                                value={row.boPhanThucHien}
                                onChange={(e) => {
                                  handleUpdateField(row.id, 'boPhanThucHien', e.target.value);
                                  setActiveAutocomplete({ rowId: row.id, field: 'boPhanThucHien', searchQuery: e.target.value });
                                }}
                                onFocus={() => setActiveAutocomplete({ rowId: row.id, field: 'boPhanThucHien', searchQuery: row.boPhanThucHien })}
                                className="w-full bg-transparent focus:outline-none text-[11px] font-mono font-bold text-slate-800"
                                placeholder="Khớp Mã BP..."
                              />
                            </div>

                            {/* Options Dropdown */}
                            {activeAutocomplete?.rowId === row.id && activeAutocomplete?.field === 'boPhanThucHien' && (
                              <div className="absolute left-3 top-11 z-[99] bg-white border border-slate-200 rounded-lg shadow-xl max-h-72 overflow-y-auto w-96 p-1 text-left">
                                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider p-1.5 font-mono border-b bg-slate-50 flex items-center justify-between">
                                  <span>Bộ Phận / Sale phòng ban</span>
                                  <button type="button" onClick={() => setActiveAutocomplete(null)} className="text-slate-400 hover:text-slate-600">×</button>
                                </div>
                                {autocompleteOptions.length === 0 ? (
                                  <div className="p-2 text-slate-400 italic text-[11px]">Không có mốc trùng khớp</div>
                                ) : (
                                  (autocompleteOptions as DepartmentMaster[]).map((d) => (
                                    <button
                                      key={d.maSale}
                                      type="button"
                                      onClick={() => {
                                        handleUpdateField(row.id, 'boPhanThucHien', d.maSale);
                                        handleUpdateField(row.id, 'tenSale', d.tenBoPhan);
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
                            <div className={`flex items-center border rounded-lg bg-white px-2.5 py-1 transition focus-within:ring-2 focus-within:ring-indigo-505/20 focus-within:border-indigo-500 ${isMissingVv ? 'border-rose-400 bg-rose-50/10' : isLowConfidence ? 'border-amber-400 bg-amber-50/10' : 'border-slate-200'}`}>
                              <input
                                type="text"
                                value={row.maVv}
                                onChange={(e) => {
                                  handleUpdateField(row.id, 'maVv', e.target.value);
                                  setActiveAutocomplete({ rowId: row.id, field: 'maVv', searchQuery: e.target.value });
                                }}
                                onFocus={() => setActiveAutocomplete({ rowId: row.id, field: 'maVv', searchQuery: row.maVv })}
                                className="w-full bg-transparent focus:outline-none text-[11px] font-mono font-bold text-slate-800"
                                placeholder="Nhập ma_vv..."
                              />
                              {row.maVv && (
                                <span className={`text-[9px] font-mono font-bold px-1 py-0.5 rounded ml-1 transition ${row.matchStatus === 'OK' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-55 text-amber-700'}`}>
                                  {row.confidenceScore}%
                                </span>
                              )}
                            </div>

                            {/* Dropdown */}
                            {activeAutocomplete?.rowId === row.id && activeAutocomplete?.field === 'maVv' && (
                              <div className="absolute left-3 top-11 z-[99] bg-white border border-slate-200 rounded-lg shadow-xl max-h-80 overflow-y-auto w-[28rem] p-1 text-left">
                                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider p-1.5 font-mono border-b bg-slate-50 flex items-center justify-between">
                                  <span>Chọn Vụ Việc Master</span>
                                  <button type="button" onClick={() => setActiveAutocomplete(null)} className="text-slate-400 hover:text-slate-600">×</button>
                                </div>
                                {autocompleteOptions.length === 0 ? (
                                  <div className="p-2 text-slate-400 italic text-[11px]">Không tìm thấy mã vụ việc nào</div>
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
                                        <span className="font-mono font-bold text-indigo-755">{p.maVuViec}</span>
                                        <span className="text-[10px] font-mono bg-slate-100 rounded px-1.5 py-0.5 text-slate-500">TK: {p.tkDoanhThu || 'N/A'}</span>
                                      </div>
                                      <span className="text-slate-700 font-semibold font-sans mt-0.5 leading-snug break-words">{p.tenSanPham}</span>
                                      <span className="text-[10px] text-slate-500 leading-snug break-words">Nhận dạng: {p.keyword}</span>
                                    </button>
                                  ))
                                )}
                              </div>
                            )}
                          </td>

                          {/* Autocomplete: Tên sản phẩm Standard */}
                          <td className="py-3 px-3 relative">
                            <div className="flex items-center border border-slate-200 bg-white rounded-lg px-2 py-1 focus-within:ring-2 focus-within:ring-indigo-505/20 focus-within:border-indigo-500">
                              <input
                                type="text"
                                value={row.sanPhamImport}
                                onChange={(e) => {
                                  handleUpdateField(row.id, 'sanPhamImport', e.target.value);
                                  setActiveAutocomplete({ rowId: row.id, field: 'sanPhamImport', searchQuery: e.target.value });
                                }}
                                onFocus={() => setActiveAutocomplete({ rowId: row.id, field: 'sanPhamImport', searchQuery: row.sanPhamImport })}
                                className="w-full bg-transparent focus:outline-none text-[11px] text-slate-700"
                                placeholder="Standard Product..."
                                title={row.sanPhamImport}
                              />
                            </div>

                            {/* Dropdown */}
                            {activeAutocomplete?.rowId === row.id && activeAutocomplete?.field === 'sanPhamImport' && (
                              <div className="absolute left-3 top-11 z-[99] bg-white border border-slate-200 rounded-lg shadow-xl max-h-80 overflow-y-auto w-[28rem] p-1 text-left">
                                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider p-1.5 font-mono border-b bg-slate-50 flex items-center justify-between">
                                  <span>Chọn Sản phẩm Standard</span>
                                  <button type="button" onClick={() => setActiveAutocomplete(null)} className="text-slate-400 hover:text-slate-600">×</button>
                                </div>
                                {autocompleteOptions.length === 0 ? (
                                  <div className="p-2 text-slate-400 italic text-[11px]">Không khớp sản phẩm nào</div>
                                ) : (
                                  (autocompleteOptions as ProductMaster[]).map((p) => (
                                    <button
                                      key={p.maVuViec}
                                      type="button"
                                      onClick={() => {
                                        handleUpdateField(row.id, 'sanPhamImport', p.tenSanPham);
                                        setActiveAutocomplete(null);
                                      }}
                                      className="group relative w-full text-left p-2 hover:bg-indigo-50/60 rounded flex flex-col transition text-[11px]"
                                    >
                                      <span className="font-bold text-slate-700 leading-snug break-words">{p.tenSanPham}</span>
                                      <span className="text-[10px] text-slate-500 leading-snug break-words">Mã: {p.maVuViec} | TK: {p.tkDoanhThu || 'N/A'} | Từ khóa: {p.keyword}</span>
                                    </button>
                                  ))
                                )}
                              </div>
                            )}
                          </td>

                          {/* Autocomplete/Editable: TK Doanh Thu */}
                          <td className="py-3 px-3 relative">
                            <div className="flex items-center border border-slate-200 bg-white rounded-lg px-2 py-1 focus-within:ring-2 focus-within:ring-indigo-505/20 focus-within:border-indigo-500">
                              <input
                                type="text"
                                value={row.tkDoanhThu}
                                onChange={(e) => {
                                  handleUpdateField(row.id, 'tkDoanhThu', e.target.value);
                                  setActiveAutocomplete({ rowId: row.id, field: 'tkDoanhThu', searchQuery: e.target.value });
                                }}
                                onFocus={() => setActiveAutocomplete({ rowId: row.id, field: 'tkDoanhThu', searchQuery: row.tkDoanhThu })}
                                className="w-full bg-transparent focus:outline-none text-[11px] font-mono text-slate-700 font-bold"
                                placeholder="..."
                              />
                            </div>

                            {/* Options Dropdown */}
                            {activeAutocomplete?.rowId === row.id && activeAutocomplete?.field === 'tkDoanhThu' && (
                              <div className="absolute right-3 top-11 z-[99] bg-white border border-slate-200 rounded-lg shadow-xl max-h-56 overflow-y-auto w-48 p-1 text-left">
                                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider p-1.5 font-mono border-b bg-slate-50 flex items-center justify-between">
                                  <span>Chọn tài khoản</span>
                                  <button type="button" onClick={() => setActiveAutocomplete(null)} className="text-slate-400 hover:text-slate-600">×</button>
                                </div>
                                {autocompleteOptions.length === 0 ? (
                                  <div className="p-2 text-slate-450 italic text-[11px]">Không có gợi ý tương ứng</div>
                                ) : (
                                  (autocompleteOptions as ProductMaster[]).map((p) => (
                                    <button
                                      key={p.maVuViec}
                                      type="button"
                                      onClick={() => {
                                        handleUpdateField(row.id, 'tkDoanhThu', p.tkDoanhThu);
                                        setActiveAutocomplete(null);
                                      }}
                                      className="w-full text-left p-1.5 hover:bg-slate-50 rounded flex items-center justify-between transition text-[11px] font-mono font-bold"
                                    >
                                      <span className="text-slate-750">{p.tkDoanhThu}</span>
                                      <span className="text-[9px] font-sans font-normal text-slate-400 truncate max-w-[80px]">{p.tenSanPham}</span>
                                    </button>
                                  ))
                                )}
                              </div>
                            )}
                          </td>

                          {/* Editable: Thuế Suất */}
                          <td className="py-3 px-3">
                            <div className={`flex items-center border rounded-lg bg-white px-2 py-1 ${isMissingThue ? 'border-amber-400 bg-amber-50/10' : 'border-slate-200'}`}>
                              <input
                                type="text"
                                value={row.thueSuat !== undefined ? row.thueSuat : ''}
                                onChange={(e) => handleUpdateField(row.id, 'thueSuat', e.target.value)}
                                className="w-full bg-transparent focus:outline-none text-[11px] font-mono font-bold text-center text-slate-800"
                                placeholder="10"
                              />
                            </div>
                          </td>

                          {/* Editable: Chuyên Trang Import */}
                          <td className="py-3 px-3">
                            <div className="flex items-center border border-slate-200 bg-white rounded-lg px-2 py-1">
                              <input
                                type="text"
                                value={row.chuyenTrangImport}
                                onChange={(e) => handleUpdateField(row.id, 'chuyenTrangImport', e.target.value)}
                                className="w-full bg-transparent focus:outline-none text-[11px] text-slate-700"
                                title={row.chuyenTrangImport}
                              />
                            </div>
                          </td>

                          {/* Inline editable pre-VAT standard Price */}
                          <td className="py-3 px-3 relative text-right">
                            <div className="flex items-center border border-slate-200 bg-white rounded-lg px-2 py-1 justify-end">
                              <input
                                type="text"
                                value={row.giaTri ? row.giaTri.toLocaleString('vi-VN') : '0'}
                                onChange={(e) => handleUpdateField(row.id, 'giaTri', e.target.value)}
                                className="w-full bg-transparent text-right focus:outline-none text-[11px] text-slate-800 font-mono font-bold"
                              />
                            </div>
                          </td>

                          {/* Calculated: Giá trị của vv VAT */}
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-800 text-[11px]">
                            {row.giaTriCuaVvVat ? row.giaTriCuaVvVat.toLocaleString('vi-VN') : '0'} ₫
                          </td>

                          {/* Fast duplication state */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {row.existsInFast ? (
                              <div className="flex flex-col items-center">
                                <span className="text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-250 rounded-md px-1.5 py-0.5 font-bold font-mono">
                                  KHỚP FAST
                                </span>
                                <span className="text-[8px] text-slate-400 mt-0.5 font-mono">
                                  {row.fastStatus ? `Tr.Thái: ${row.fastStatus}` : 'Trùng trên Fast'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[9px] bg-slate-100 text-slate-450 border border-slate-200 rounded-md px-1.5 py-0.5 font-bold font-mono">
                                CHƯA CÓ TRÊN FAST
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

            {/* Pagination controls */}
            {filteredRows.length > 0 && (
              <div className="px-6 py-4.5 bg-slate-50 border-t border-slate-150 flex items-center justify-between text-slate-500 font-sans">
                <span className="text-xs font-semibold">
                  Trang <strong className="text-slate-800">{currentPage}</strong> / <strong className="text-slate-800">{totalPages}</strong> (Tổng cộng <strong className="text-slate-800">{filteredRows.length}</strong> kết quả)
                </span>

                <div className="flex items-center space-x-2.5">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1 px-2.5 bg-white border border-slate-205 rounded-lg text-xs font-semibold hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed select-none transition"
                  >
                    Trước
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1 px-2.5 bg-white border border-slate-205 rounded-lg text-xs font-semibold hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed select-none transition"
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

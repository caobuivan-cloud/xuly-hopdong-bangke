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
import { 
  normalizeText, lookupExact, keywordMatch, applyExceptionRules, parseNumber 
} from '../utils/businessLogic';
import { dbService } from '../services/dbService';

interface LuanChuyenViewProps {
  id?: string;
  config: ContractSettings;
}

export default function LuanChuyenView({
  id = 'luan-chuyen-view',
  config,
}: LuanChuyenViewProps) {
  // Master data state
  const [customers, setCustomers] = useState<CustomerMaster[]>([]);
  const [departments, setDepartments] = useState<DepartmentMaster[]>([]);
  const [products, setProducts] = useState<ProductMaster[]>([]);
  const [loadingMaster, setLoadingMaster] = useState(true);

  // Separate upload states for Hard Contract and Fast Contract
  const [fileCung, setFileCung] = useState<UploadedFileData | null>(null);
  const [fileFast, setFileFast] = useState<UploadedFileData | null>(null);

  // Processing state
  const [processedRows, setProcessedRows] = useState<Record<string, any>[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filtering & Pagination states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState(true); // Default to filter by Fast list comparison
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;

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
    if (!fileCung || fileCung.sheets.length === 0) {
      setErrorMessage('Vui lòng tải lên "File Hợp đồng cứng" trước khi xử lý.');
      return;
    }

    setErrorMessage(null);
    const sheetCung = fileCung.sheets[0];
    const sheetFast = fileFast && fileFast.sheets.length > 0 ? fileFast.sheets[0] : null;

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

        const matchFastRow = sheetFast.rows.find(f => {
          const fastTen = String(getCellValue(f, 'Tên hợp đồng', 'Ten hop dong') || '').trim();
          const fastCode = String(getCellValue(f, 'Hợp đồng', 'Hop dong', 'Mã hợp đồng') || '').trim();
          
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
  };

  // Inline updates for any manually modified fields
  const handleUpdateField = (rowId: string, field: string, val: any) => {
    if (!processedRows) return;
    const updated = processedRows.map(row => {
      if (row.id !== rowId) return row;

      const newRow = { ...row, [field]: val };

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
  }, [processedRows, filterActive, fileFast, searchTerm]);

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

    const exportFormatted = filteredRows.map((row, index) => {
      return {
        'Mã hợp đồng': row.maHopDong || '',
        'Tên hợp đồng': row.tenHopDong || '',
        'Mã khách': row.maKhach || '',
        'Bộ phân thưc hiện': row.boPhanThucHien || '',
        'Ngày bắt đầu': row.ngayBatDau || '',
        'Ngày kết thúc': row.ngayKetThuc || '',
        'Ngày hợp đồng': row.ngayHopDong || '',
        'ngay_hd1': row.ngayHd1 || '',
        'ngay_hd2': row.ngayHd2 || '',
        'ngay_hd3': row.ngayHd3 || '',
        'ngay_hd4': row.ngayHd4 || '',
        'ngay_hd5': row.ngayHd5 || '',
        'ngay_hd6': row.ngayHd6 || '',
        'tien_hd1': row.tienHd1 || '',
        'tien_hd2': row.tienHd2 || '',
        'tien_hd3': row.tienHd3 || '',
        'tien_hd4': row.tienHd4 || '',
        'tien_hd5': row.tienHd5 || '',
        'tien_hd6': row.tienHd6 || '',
        'Giá trị': row.giaTri || 0,
        'ma_vv': row.maVv || '',
        'Số lượng': row.soLuong || 0,
        'Đơn giá': row.donGia || 0,
        'Thuế suất': row.thueSuat || 0,
        'Giá trị của vv VAT': row.giaTriCuaVv || 0,
        'tk_doanh thu': row.tkDoanhThu || '',
        'Bảng kê': row.bangKe || '',
        'Tỷ lệ ck': row.tyLeCk || 0,
        'Chuyên trang': row.chuyenTrangImport || '',
        'Ghi chú chi tiết': row.ghiChu || '',
        ' ': '', // Empty blank block 1
        'Status': 1,
        '  ': '', // Empty blank block 2
        'Ghi chú tổng': row.fastGhiChu || '',
        'stt': index + 1,
        'Tên sản phẩm': row.sanPhamImport || '',
      };
    });

    exportToExcel(
      [{ sheetName: 'HĐ Luân Chuyển Fast Import', data: exportFormatted }],
      `Enriched_LuanChuyen_36Cols_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  return (
    <div id={id} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-4.5 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center space-x-2">
            <Layers className="h-6 w-6 text-indigo-500" />
            <span>Workflow Đối Soát & Hạch Toán Luân Chuyển</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Hạch toán doanh thu và bóc tách dữ liệu hợp đồng cứng, đối chiếu loại trừ trạng thái hợp đồng Fast và xuất mẫu 36 cột chuẩn hóa.
          </p>
        </div>
      </div>

      {/* Dual File Upload Phase */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload 1: Hard Contract */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3.5">
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
            onUploadSuccess={(data) => {
              setFileCung(data);
              setProcessedRows(null);
            }}
            onUploadError={(err) => setErrorMessage(err)}
            placeholderText="Kéo thả File Hợp đồng cứng (.xlsx, .xls) vào đây hoặc click để chọn"
          />
        </div>

        {/* Upload 2: Fast Contract List */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3.5">
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
            onUploadSuccess={(data) => {
              setFileFast(data);
              setProcessedRows(null);
            }}
            onUploadError={(err) => setErrorMessage(err)}
            placeholderText="Kéo thả File Fast (.xlsx, .xls) vào đây hoặc click để chọn"
          />
        </div>
      </div>

      {/* Process Button Panel */}
      {fileCung && (
        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3 text-slate-600 text-xs">
            <Info className="h-5 w-5 text-indigo-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-slate-700">Dữ liệu đã nạp sẵn sàng</p>
              <p className="text-slate-400">Hợp đồng luân chuyển: <strong className="font-mono text-indigo-600">[{fileCung?.fileName}]</strong> ({fileCung?.sheets[0]?.rows.length} dòng) {fileFast && <>| So khớp Fast: <strong className="font-mono text-rose-600">[{fileFast?.fileName}]</strong> ({fileFast?.sheets[0]?.rows.length} dòng)</>}</p>
            </div>
          </div>
          <button
            onClick={handleProcessFiles}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-md transition-all active:scale-[0.98]"
          >
            <Calculator className="h-4.5 w-4.5" />
            <span>HẠCH TOÁN & ĐỐI SOÁT FAST</span>
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-150 p-4 rounded-xl text-rose-800 text-xs flex items-start space-x-2.5">
          <XCircle className="h-5 w-5 text-rose-500 mt-0.5 flex-shrink-0" />
          <p className="font-medium">{errorMessage}</p>
        </div>
      )}

      {/* Processed results block */}
      {processedRows && (
        <div className="space-y-6">
          
          {/* Summary stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            
            {/* Total source cells */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 transition-all">
              <span className="text-[10px] font-bold text-slate-400 block uppercase font-mono tracking-wider">Hợp đồng gốc</span>
              <div className="flex items-baseline space-x-1.5 mt-1.5">
                <span className="text-2xl font-extrabold text-slate-700 font-sans">{stats.totalSource}</span>
                <span className="text-[10px] text-slate-400 font-mono">dòng</span>
              </div>
              <span className="text-[9px] text-slate-400 mt-1 block">Tổng tệp cứng tải lên</span>
            </div>

            {/* Qualified for Export */}
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 transition-all">
              <span className="text-[10px] font-bold text-indigo-500 block uppercase font-mono tracking-wider">Đủ điều kiện Xuất</span>
              <div className="flex items-baseline space-x-1.5 mt-1.5">
                <span className="text-2xl font-extrabold text-indigo-700 font-sans">{stats.qualifiedCount}</span>
                <span className="text-[10px] text-indigo-400 font-mono">dòng</span>
              </div>
              <span className="text-[9px] text-indigo-400 mt-1 block">
                {fileFast ? "Đã lọc loại trừ qua Fast" : "Chưa lọc qua Fast"}
              </span>
            </div>

            {/* Missing customer code */}
            <div className={`border rounded-xl p-4 transition-all ${stats.missingKhach > 0 ? 'bg-amber-50/40 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
              <span className={`text-[10px] font-bold block uppercase font-mono tracking-wider ${stats.missingKhach > 0 ? 'text-amber-600' : 'text-slate-400'}`}>Thiếu mã khách</span>
              <div className="flex items-baseline space-x-1.5 mt-1.5">
                <span className={`text-2xl font-extrabold font-sans ${stats.missingKhach > 0 ? 'text-amber-700' : 'text-slate-705'}`}>{stats.missingKhach}</span>
                <span className="text-[10px] text-slate-400 font-mono">lỗi</span>
              </div>
              <span className="text-[9px] text-slate-400 mt-1 block">Cần bổ sung mã KH</span>
            </div>

            {/* Missing department code */}
            <div className={`border rounded-xl p-4 transition-all ${stats.missingDept > 0 ? 'bg-amber-50/40 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
              <span className={`text-[10px] font-bold block uppercase font-mono tracking-wider ${stats.missingDept > 0 ? 'text-amber-600' : 'text-slate-400'}`}>Thiếu bộ phận</span>
              <div className="flex items-baseline space-x-1.5 mt-1.5">
                <span className={`text-2xl font-extrabold font-sans ${stats.missingDept > 0 ? 'text-amber-700' : 'text-slate-705'}`}>{stats.missingDept}</span>
                <span className="text-[10px] text-slate-400 font-mono">lỗi</span>
              </div>
              <span className="text-[9px] text-slate-400 mt-1 block">Chưa map mã bộ phận</span>
            </div>

            {/* Missing ma_vv */}
            <div className={`border rounded-xl p-4 transition-all ${stats.missingVv > 0 ? 'bg-rose-50/40 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
              <span className={`text-[10px] font-bold block uppercase font-mono tracking-wider ${stats.missingVv > 0 ? 'text-rose-600' : 'text-slate-400'}`}>Thiếu ma_vv</span>
              <div className="flex items-baseline space-x-1.5 mt-1.5">
                <span className={`text-2xl font-extrabold font-sans ${stats.missingVv > 0 ? 'text-rose-700' : 'text-slate-705'}`}>{stats.missingVv}</span>
                <span className="text-[10px] text-slate-400 font-mono">lỗi</span>
              </div>
              <span className="text-[9px] text-slate-400 mt-1 block">Không khớp sản phẩm</span>
            </div>

            {/* Needs check (CAN_KIEM_TRA) */}
            <div className={`border rounded-xl p-4 transition-all ${stats.needCheck > 0 ? 'bg-amber-50/40 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
              <span className={`text-[10px] font-bold block uppercase font-mono tracking-wider ${stats.needCheck > 0 ? 'text-amber-600' : 'text-slate-400'}`}>Cần kiểm tra</span>
              <div className="flex items-baseline space-x-1.5 mt-1.5">
                <span className={`text-2xl font-extrabold font-sans ${stats.needCheck > 0 ? 'text-amber-700' : 'text-slate-705'}`}>{stats.needCheck}</span>
                <span className="text-[10px] text-slate-400 font-mono">dòng</span>
              </div>
              <span className="text-[9px] text-slate-400 mt-1 block">Độ tin cậy thấp (<span className="font-mono">70%</span>)</span>
            </div>
            
          </div>

          {/* Controller bars with interactive filters and export triggers */}
          <div className="bg-slate-900 text-white rounded-xl p-5 shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-4 font-sans">
            <div className="flex flex-wrap items-center gap-4">
              
              {/* Text Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Mã HĐ, Tên HĐ, Tên KH..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-slate-800 border border-slate-700 text-xs px-3.5 pl-9 py-2 rounded-lg text-white w-56 focus:outline-none focus:border-indigo-500 placeholder-slate-400 font-medium"
                />
              </div>

              {/* Toggle comparing with Fast list */}
              {fileFast && (
                <label className="flex items-center space-x-2 cursor-pointer select-none text-xs bg-slate-800 p-2 rounded-lg border border-slate-700">
                  <input
                    type="checkbox"
                    checked={filterActive}
                    onChange={(e) => {
                      setFilterActive(e.target.checked);
                      setCurrentPage(1);
                    }}
                    className="rounded text-indigo-600 focus:ring-opacity-0 h-4 w-4"
                  />
                  <span className="font-semibold">Lọc tự động theo danh sách Fast ({stats.qualifiedCount} / {stats.totalSource} dòng)</span>
                </label>
              )}
            </div>

            <button
              onClick={handleExportFinished}
              disabled={filteredRows.length === 0}
              className="flex items-center justify-center space-x-2 text-xs font-bold leading-none bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-750 disabled:text-slate-400 cursor-pointer disabled:cursor-not-allowed text-white px-5 py-3 rounded-lg transition shadow-md"
            >
              <Download className="h-4.5 w-4.5" />
              <span>XUẤT FILE PHỤC VỤ FAST IMPORT ({filteredRows.length} DÒNG - 36 CỘT)</span>
            </button>
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
                    <th className="py-3 px-3 min-w-[120px]">Khách Hàng & Mã Sale</th>
                    <th className="py-3 px-3 min-w-[180px]">Mã Khách (Autocomplete)</th>
                    <th className="py-3 px-3 min-w-[185px]">Bộ Phận Thực Hiện (Autocomplete)</th>
                    <th className="py-3 px-3 min-w-[200px]">Mã Vụ Việc - ma_vv (Autocomplete)</th>
                    <th className="py-3 px-3 min-w-[130px]">TK Doanh Thu</th>
                    <th className="py-3 px-3 min-w-[160px]">Sản Phẩm Import</th>
                    <th className="py-3 px-3 min-w-[150px]">Chuyên Trang Import</th>
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
                      
                      return (
                        <tr key={row.id} className="hover:bg-slate-50/50 transition">
                          
                          {/* STT Column */}
                          <td className="py-3 px-3 text-center text-slate-450 font-mono font-bold border-r border-slate-100">
                            {absoluteIndex}
                          </td>

                          {/* Code & Name of Contract */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="font-mono font-bold text-slate-700 text-[11px]">{row.maHopDong || <span className="text-slate-305 italic">N/A</span>}</div>
                            <div className="text-slate-500 max-w-[200px] truncate text-[11px] mt-0.5" title={row.tenHopDong}>
                              {row.tenHopDong}
                            </div>
                          </td>

                          {/* Raw Customer and Salesperson Name */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="font-semibold text-slate-700 text-[11px] max-w-[160px] truncate" title={row.tenKhachHang}>{row.tenKhachHang}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5 flex items-center space-x-1">
                              <span className="font-mono bg-slate-100 px-1 rounded">Sale:</span>
                              <span className="font-medium truncate max-w-[100px]">{row.tenNvkd || 'N/A'}</span>
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
                              <div className="absolute left-3 top-11 z-[99] bg-white border border-slate-200 rounded-lg shadow-xl max-h-56 overflow-y-auto w-64 p-1 text-left">
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
                                      className="w-full text-left p-1.5 hover:bg-slate-50 rounded flex flex-col transition text-[11px]"
                                    >
                                      <span className="font-bold text-indigo-650 font-mono">{c.maKhach}</span>
                                      <span className="text-slate-500 font-sans truncate">{c.tenKhach}</span>
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
                              <div className="absolute left-3 top-11 z-[99] bg-white border border-slate-200 rounded-lg shadow-xl max-h-56 overflow-y-auto w-64 p-1 text-left">
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
                                      className="w-full text-left p-1.5 hover:bg-slate-50 rounded flex flex-col transition text-[11px]"
                                    >
                                      <span className="font-bold text-indigo-650 font-mono">{d.maSale}</span>
                                      <span className="text-slate-500 font-sans truncate">{d.tenBoPhan}</span>
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
                              <div className="absolute left-3 top-11 z-[99] bg-white border border-slate-200 rounded-lg shadow-xl max-h-56 overflow-y-auto w-72 p-1 text-left">
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
                                      className="w-full text-left p-2 hover:bg-slate-50 rounded flex flex-col transition text-[11px]"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-indigo-750 font-mono">{p.maVuViec}</span>
                                        <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1 rounded">{p.tkDoanhThu}</span>
                                      </div>
                                      <span className="text-slate-600 font-sans mt-0.5 truncate">{p.tenSanPham}</span>
                                      <span className="text-[9px] text-slate-400 italic">Keyword: {p.keyword}</span>
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
                            <input
                              type="text"
                              value={row.sanPhamImport}
                              onChange={(e) => handleUpdateField(row.id, 'sanPhamImport', e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] text-slate-700 focus:outline-none focus:border-indigo-505"
                              title={row.sanPhamImport}
                            />
                          </td>

                          {/* Editable: Chuyên trang Import */}
                          <td className="py-3 px-3">
                            <input
                              type="text"
                              value={row.chuyenTrangImport}
                              onChange={(e) => handleUpdateField(row.id, 'chuyenTrangImport', e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] text-slate-700 focus:outline-none focus:border-indigo-505"
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
    </div>
  );
}

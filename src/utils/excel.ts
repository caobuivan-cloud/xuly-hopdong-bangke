/**
 * @contract src/utils/excel.ts
 * - Trách nhiệm:
 *   - Phục vụ các API đọc (parse) dữ liệu từ file Excel và xuất (export) dữ liệu hạch toán sang file .xlsx.
 *   - Thực hiện tự động phát hiện vị trí dòng chứa header dựa trên từ khóa mẫu (HEADER_KEYWORDS).
 *   - Lưu trữ và duy trì mảng dữ liệu thô rawArray trong cấu trúc ExcelSheetData để hỗ trợ re-parse động.
 * - Không chịu trách nhiệm:
 *   - Không chứa logic nghiệp vụ (business lookup, keyword matching, tính thuế suất, map mã khách).
 * - Ràng buộc:
 *   - Mọi thay đổi đối với detectHeaderRowIndex hoặc HEADER_KEYWORDS phải duy trì tính tương thích ngược để không phá vỡ tính năng tự nhận diện của LuanChuyenView và BangKeView.
 */

import * as XLSX from 'xlsx';
import { UploadedFileData, ExcelSheetData } from '../types';

/**
 * Danh sách từ khóa đặc trưng dùng để nhận diện dòng tiêu đề thật của bảng dữ liệu.
 * Khi một dòng chứa tối thiểu MIN_HEADER_KEYWORD_MATCHES từ khóa, nó được xem là header row.
 */
const HEADER_KEYWORDS = [
  'hợp đồng', 'hop dong',
  'tên hợp đồng', 'ten hop dong',
  'mã booking', 'ma booking', 'booking',
  'số ht', 'so ht',
  'mã khách', 'ma khach',
  'khách hàng', 'khach hang',
  'trạng thái', 'trang thai',
  'ngày hợp đồng', 'ngay hop dong',
  'lịch đăng', 'lich dang',
  'stt',
  'tên sale', 'ten sale',
  'bộ phận', 'bo phan',
  'hình thức', 'hinh thuc',
  'thành tiền', 'thanh tien',
  'số lượng', 'so luong',
  'đơn giá', 'don gia',
  'ghi chú', 'ghi chu',
  'chiết khấu', 'chiet khau',
  'mã sale', 'ma sale',
  'số hđ', 'so hd',
  'dự án', 'du an',
  'phòng ban', 'phong ban',
  'tên khách hàng', 'ten khach hang',
  'loại banner', 'loai banner',
  'tên banner', 'ten banner',
];

const MIN_HEADER_KEYWORD_MATCHES = 2;

/**
 * Chuẩn hóa chuỗi để so sánh không phân biệt hoa thường và dấu tiếng Việt.
 */
function normalizeForHeaderDetection(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim();
}

/**
 * Quét các dòng thô (2D array) để tìm chỉ số dòng tiêu đề thật.
 * Trả về index của dòng header nếu tìm thấy, hoặc -1 nếu không tìm thấy
 * (caller sẽ fallback về dòng 0 — hành vi backward-compatible).
 */
function detectHeaderRowIndex(rawArray: any[][]): number {
  for (let i = 0; i < rawArray.length; i++) {
    const row = rawArray[i];
    if (!Array.isArray(row)) continue;

    let matchCount = 0;
    for (const cell of row) {
      if (cell === null || cell === undefined) continue;
      const normalized = normalizeForHeaderDetection(String(cell));
      for (const keyword of HEADER_KEYWORDS) {
        if (normalized === keyword || normalized.includes(keyword)) {
          matchCount++;
          break; // mỗi cell chỉ tính 1 lần
        }
      }
      if (matchCount >= MIN_HEADER_KEYWORD_MATCHES) return i;
    }
  }
  return -1; // không tìm thấy — fallback về dòng 0
}

/**
 * Parses an Excel File object into structured JSON data.
 * Tự động nhận diện dòng tiêu đề thật (dynamic header detection).
 * Nếu không phát hiện được header, fallback về dòng 0 (backward-compatible).
 */
export async function parseExcelFile(file: File): Promise<UploadedFileData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          throw new Error('Không thể đọc dữ liệu từ file.');
        }

        const workbook = XLSX.read(data, {
          type: 'binary',
          cellDates: true,
          cellNF: false,
          cellText: true,
        });

        const sheets: ExcelSheetData[] = [];

        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];

          // Bước 1: Đọc thô toàn bộ sheet dạng 2D array (không dùng dòng nào làm header)
          const rawArray = XLSX.utils.sheet_to_json<any[]>(worksheet, {
            header: 1,
            defval: '',
          });

          // Bước 2: Tự động phát hiện dòng tiêu đề thật
          const headerRowIndex = detectHeaderRowIndex(rawArray);
          // Nếu không phát hiện được (headerRowIndex === -1), dùng dòng 0 (backward-compatible)
          const effectiveHeaderRow = headerRowIndex >= 0 ? headerRowIndex : 0;

          // Bước 3: Parse dữ liệu từ đúng dòng header trở đi
          // range option: bỏ qua các dòng trước header
          const rawRows = XLSX.utils.sheet_to_json<any>(worksheet, {
            defval: '',
            range: effectiveHeaderRow,
          });

          const dataRows = rawArray.slice(effectiveHeaderRow + 1);
          rawRows.forEach((row, rowIndex) => {
            row.__cells = dataRows[rowIndex] || [];
          });

          let headers: string[] = [];
          if (rawRows.length > 0) {
            const headerSet = new Set<string>();
            rawRows.forEach((row) => {
              Object.keys(row).forEach((key) => {
                if (!key.startsWith('__')) headerSet.add(key);
              });
            });
            headers = Array.from(headerSet);
          }

          sheets.push({
            sheetName,
            headers,
            rows: rawRows,
            headerRowIndex: effectiveHeaderRow,
            rawArray,
          });
        }

        if (sheets.length === 0) {
          throw new Error('File Excel rỗng hoặc không có sheet hợp lệ.');
        }

        resolve({
          fileName: file.name,
          fileSize: file.size,
          sheets,
          uploadedAt: new Date().toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
        });
      } catch (error: any) {
        reject(new Error(error?.message || 'Định dạng file Excel không hợp lệ hoặc bị lỗi.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Có lỗi xảy ra trong quá trình đọc file.'));
    };

    reader.readAsBinaryString(file);
  });
}

/**
 * Re-parses an ExcelSheetData object starting from a new header row index.
 * Uses the saved rawArray to re-extract headers and rows.
 */
export function reparseSheetWithHeaderIndex(sheet: ExcelSheetData, newHeaderRowIndex: number): ExcelSheetData {
  if (!sheet.rawArray || sheet.rawArray.length === 0) {
    return sheet;
  }

  // Convert raw 2D array back to a temporary worksheet to parse using XLSX range utilities
  const tempWorksheet = XLSX.utils.aoa_to_sheet(sheet.rawArray);
  const rawRows = XLSX.utils.sheet_to_json<any>(tempWorksheet, {
    defval: '',
    range: newHeaderRowIndex,
  });

  const dataRows = sheet.rawArray.slice(newHeaderRowIndex + 1);
  rawRows.forEach((row, rowIndex) => {
    row.__cells = dataRows[rowIndex] || [];
  });

  let headers: string[] = [];
  if (rawRows.length > 0) {
    const headerSet = new Set<string>();
    rawRows.forEach((row) => {
      Object.keys(row).forEach((key) => {
        if (!key.startsWith('__')) headerSet.add(key);
      });
    });
    headers = Array.from(headerSet);
  }

  return {
    ...sheet,
    headers,
    rows: rawRows,
    headerRowIndex: newHeaderRowIndex,
  };
}



/**
 * Exports JSON data structure to a downloadable Excel (.xlsx) file.
 */
export function exportToExcel(
  sheets: { sheetName: string; data: Record<string, any>[] }[],
  fileName: string = 'export.xlsx'
): void {
  const wb = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const ws = XLSX.utils.json_to_sheet(sheet.data);
    XLSX.utils.book_append_sheet(wb, ws, sheet.sheetName.substring(0, 31)); // xlsx sheet names are max 31 chars
  }

  XLSX.writeFile(wb, fileName);
}

/**
 * Downloads a mock template with prefilled columns so the accountant has instant data to play with.
 */
export function downloadTemplate(type: 'luan_chuyen' | 'hop_dong_moi' | 'bang_ke' | 'm_bophan' | 'm_khach' | 'm_sanpham'): void {
  let sheetName = '';
  let filename = '';
  let data: Record<string, any>[] = [];

  switch (type) {
    case 'luan_chuyen':
      sheetName = 'HĐ Luân Chuyển';
      filename = 'Template_Hop_Dong_Luan_Chuyen.xlsx';
      data = [
        {
          'Mã Hợp Đồng': 'HDLC-2026-001',
          'Khách Hàng': 'Công ty Cổ phần VCCorp',
          'Dịch Vụ': 'Quảng cáo Banner Admicro',
          'Giá Trị Trước Thuế (VND)': 150000000,
          'Thuế Suất (%)': 10,
          'Thành Tiền (VND)': 165000000,
          'Ngày Ký': '2026-01-15',
          'Trạng Thái': 'Đã đối soát',
        },
        {
          'Mã Hợp Đồng': 'HDLC-2026-002',
          'Khách Hàng': 'Tập đoàn Vingroup',
          'Dịch Vụ': 'PR Bài viết Kênh 14',
          'Giá Trị Trước Thuế (VND)': 80000000,
          'Thuế Suất (%)': 8,
          'Thành Tiền (VND)': 86400000,
          'Ngày Ký': '2026-01-20',
          'Trạng Thái': 'Đang luân chuyển',
        },
        {
          'Mã Hợp Đồng': 'HDLC-2026-003',
          'Khách Hàng': 'Công ty sữa Vinamilk',
          'Dịch Vụ': 'Video Tài Trợ Youtube',
          'Giá Trị Trước Thuế (VND)': 350000000,
          'Thuế Suất (%)': 10,
          'Thành Tiền (VND)': 385000000,
          'Ngày Ký': '2026-02-10',
          'Trạng Thái': 'Chờ ký duyệt',
        },
      ];
      break;

    case 'hop_dong_moi':
      sheetName = 'HĐ Mới';
      filename = 'Template_Hop_Dong_Moi.xlsx';
      data = [
        {
          'Số HĐ': 'HĐ-2026-001',
          'Dự án': 'Kinh doanh Kênh 14 PR',
          'Tên sale': 'Ban Nội Dung - Kênh 14',
          'Phòng ban': 'Phòng Nội dung',
          'Tên khách hàng': 'Shopee Việt Nam',
          'Loại khách hàng': 'Đại lý',
          'Hình thức QC': 'Bài viết PR',
          'Sản phẩm': 'PR Kênh 14 vip',
          'Website': 'Kenh14.vn',
          'Chuyên mục': 'Xã hội',
          'Loại banner': '-',
          'Tên banner': 'Bài trọn gói',
          'Số lượng': '2 bài',
          'Đơn giá': 15000000,
          'Chiết khấu': 12,
          'Thành tiền': 30000000,
        },
        {
          'Số HĐ': 'HĐ-2026-002',
          'Dự án': 'Chiến dịch hiển thị đa kênh',
          'Tên sale': 'Ban Kinh Doanh - Admicro',
          'Phòng ban': 'Phòng Quảng cáo',
          'Tên khách hàng': 'Tập đoàn Vingroup',
          'Loại khách hàng': 'Khách hàng lẻ',
          'Hình thức QC': 'Quảng cáo Banner',
          'Sản phẩm': 'Banner AdX',
          'Website': 'Cafef.vn',
          'Chuyên mục': 'Kinh doanh',
          'Loại banner': 'Chân cột',
          'Tên banner': 'AdX CPC Premium',
          'Số lượng': '10',
          'Đơn giá': 3500000,
          'Chiết khấu': 5,
          'Thành tiền': 35000000,
        }
      ];
      break;

    case 'bang_ke':
      sheetName = 'Bảng Kê Chi Tiết';
      filename = 'Template_Bang_Ke.xlsx';
      data = [
        {
          'STT': 1,
          'Mã booking': 'BK0626',
          'Số HT': 'HT-99',
          'Nhãn': 'Shopee Summer',
          'Nội dung quảng cáo': 'PR Kênh 14 vip bài viết chuyên trang du lịch',
          'Chi tiết': 'Bài viết quảng cáo du lịch hè',
          'Lịch đăng': '01/06/2026-15/06/2026',
          'Đơn vị tính': 'Bài',
          'Số lượng': 2,
          'Đơn giá': 15000000,
          'Chiết khấu': 10,
          'Thành tiền sau chiết khấu (VNĐ)': 27000000,
          'Ghi chú': 'Kênh 14 quảng bá du lịch hè',
        },
        {
          'STT': 2,
          'Mã booking': 'BK0726',
          'Số HT': 'HT-101',
          'Nhãn': 'Samsung Galaxy',
          'Nội dung quảng cáo': 'Banner AdX hiển thị vị trí chân cột Cafef',
          'Chi tiết': 'Hành trình trải nghiệm AI',
          'Lịch đăng': 'd-d/M/yyyy: 05-15/07/2026',
          'Đơn vị tính': 'Click',
          'Số lượng': 10,
          'Đơn giá': 3500000,
          'Chiết khấu': 0,
          'Thành tiền sau chiết khấu (VNĐ)': 35000000,
          'Ghi chú': 'Banner AdX Tech',
        },
      ];
      break;

    case 'm_bophan':
      sheetName = 'Mã Bộ Phận';
      filename = 'Master_Ma_Bo_Phan.xlsx';
      data = [
        {
          'STT': 1,
          'Tên bộ phận thực hiện': 'Ban Nội Dung - Kênh 14',
          'Mã sale': 'SALE_K14',
        },
        {
          'STT': 2,
          'Tên bộ phận thực hiện': 'Ban Kinh Doanh - Admicro',
          'Mã sale': 'SALE_ADX',
        },
        {
          'STT': 3,
          'Tên bộ phận thực hiện': 'Công ty CP truyền thông - PR',
          'Mã sale': 'SALE_PR',
        },
      ];
      break;

    case 'm_khach':
      sheetName = 'Mã Khách';
      filename = 'Master_Ma_Khach.xlsx';
      data = [
        {
          'STT': 1,
          'Tên khách': 'Shopee Việt Nam',
          'Mã khách': 'KH_SHOPEE',
        },
        {
          'STT': 2,
          'Tên khách': 'Công ty Cổ phần VCCorp',
          'Mã khách': 'KH_VCC',
        },
        {
          'STT': 3,
          'Tên khách': 'Tập đoàn Vingroup',
          'Mã khách': 'KH_VIC',
        },
      ];
      break;

    case 'm_sanpham':
      sheetName = 'Chuẩn Hóa Sản Phẩm';
      filename = 'Master_Chuan_Hoa_San_Pham.xlsx';
      data = [
        {
          'Cụm từ nhận diện': 'PR Kênh 14 vip',
          'Chuẩn hóa mã Vụ việc': 'VV_PR_K14',
          'Chuẩn hóa Tên sản phẩm': 'Dịch vụ Bài PR Kênh 14',
          'TK doanh thu': '51111',
          'Thuế suất': 10,
        },
        {
          'Cụm từ nhận diện': 'Banner AdX',
          'Chuẩn hóa mã Vụ việc': 'VV_BAN_ADX',
          'Chuẩn hóa Tên sản phẩm': 'Doanh thu Banner AdX',
          'TK doanh thu': '51112',
          'Thuế suất': 10,
        },
        {
          'Cụm từ nhận diện': 'Video Youtube',
          'Chuẩn hóa mã Vụ việc': 'VV_VID_YT',
          'Chuẩn hóa Tên sản phẩm': 'Dịch vụ Clip Youtube',
          'TK doanh thu': '51113',
          'Thuế suất': 8,
        },
      ];
      break;
  }

  exportToExcel([{ sheetName, data }], filename);
}

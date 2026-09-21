/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ExceptionRule, ProductMaster, HeaderAliasesBangKe } from '../types';

export const DEFAULT_HEADER_ALIASES_BANG_KE: HeaderAliasesBangKe = {
  stt: ['STT', 'stt', 'No'],
  maBooking: ['Mã booking', 'Ma booking', 'Booking', 'Số booking'],
  soHt: ['Số HT', 'So HT', 'HT', 'Hệ thống'],
  nhan: ['Nhãn', 'Nhan', 'Brand', 'Thương hiệu'],
  noiDungQuangCao: ['Nội dung quảng cáo', 'Noi dung quang cao', 'Nội dung', 'Diễn giải'],
  chiTiet: ['Chi tiết', 'Chi tiet', 'Chi tiết chạy'],
  lichDang: ['Lịch đăng', 'Lich dang', 'Lịch chạy', 'Lich chay', 'Thời gian chạy', 'Thoi gian chay', 'Thời gian', 'Thoi gian', 'Timeline'],
  donViTinh: ['Đơn vị tính', 'Don vi tinh', 'ĐVT', 'DVT'],
  soLuong: ['Số lượng', 'So luong', 'Qty'],
  donGia: ['Đơn giá', 'Don gia', 'Price'],
  chietKhau: ['Chiết khấu', 'Chiet khau', 'CK'],
  thanhTienSauCk: ['Thành tiền sau chiết khấu (VNĐ)', 'Thành tiền sau chiết khấu', 'Thanh tien sau chiet khau', 'Thành tiền thực chạy (có VAT)', 'Thành tiền', 'Thanh tien'],
  ghiChu: ['Ghi chú', 'Ghi chu', 'Note']
};

export interface FastContractLookupValue {
  fastStatus: string;
  fastMaKhach: string;
  fastBoPhanThucHien: string;
  fastGhiChu: string;
}

export function normalizeContractNameKey(value: any): string {
  return String(value ?? '').replace(/\s+/g, '').trim().toLowerCase();
}

export function getRawCellValue(row: any, columnIndex: number): string {
  if (Array.isArray(row?.__cells)) {
    const value = row.__cells[columnIndex];
    if (value !== undefined && value !== null) return String(value).trim();
  }
  return '';
}

export function buildFastContractLookup(rows: any[]): Map<string, FastContractLookupValue> {
  const lookup = new Map<string, FastContractLookupValue>();

  rows.forEach((row, index) => {
    const tenHopDong = getRawCellValue(row, 1);
    const key = normalizeContractNameKey(tenHopDong);
    if (!key) return;

    lookup.set(key, {
      fastMaKhach: getRawCellValue(row, 3),
      fastBoPhanThucHien: getRawCellValue(row, 5),
      fastStatus: getRawCellValue(row, 8),
      fastGhiChu: getRawCellValue(row, 13),
    });
  });

  return lookup;
}

export function lookupFastContractByBooking(
  lookup: Map<string, FastContractLookupValue>,
  maBooking: string
): FastContractLookupValue | undefined {
  if (!maBooking) return undefined;
  return lookup.get(normalizeContractNameKey(`${maBooking}/AD`));
}

/**
 * 1. normalizeText(value)
 * - Convert về string.
 * - Trim.
 * - Lowercase.
 * - Bỏ dấu tiếng Việt.
 * - Chuẩn hóa nhiều khoảng trắng thành một khoảng trắng.
 * - Loại bỏ ký tự đặc biệt thừa thãi ở đầu/cuối để tăng độ chính xác so khớp.
 */
export function normalizeText(value: any): string {
  if (value === null || value === undefined) return '';
  let str = String(value).trim().toLowerCase();

  // Normalize Vietnamese diacritics
  str = str.normalize('NFD').replace(/[\u0305-\u036f]/g, ''); // replaces decomposing symbols
  str = str
    .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
    .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
    .replace(/[ìíịỉĩ]/g, 'i')
    .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
    .replace(/[ùúụủũưừứựửữ]/g, 'u')
    .replace(/[ỳýỵỷỹ]/g, 'y')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-_/]/g, ' '); // Replace custom non-alphanumeric except safe delimiters with spaces

  // Replace multiple spaces with a single space
  str = str.replace(/\s+/g, ' ').trim();
  return str;
}

/**
 * 2. lookupExact(sourceValue, masterRows, sourceField, returnField)
 * - So khớp exact sau khi normalize cả hai vế.
 * - Thường dùng cho đối chiếu Mã khách và Mã bộ phận thực hiện.
 */
export function lookupExact<T>(
  sourceValue: any,
  masterRows: T[],
  sourceField: keyof T,
  returnField: keyof T
): any | null {
  if (!sourceValue) return null;
  const normalizedSourceValue = normalizeText(sourceValue);

  for (const row of masterRows) {
    const targetVal = row[sourceField];
    if (targetVal) {
      const normTarget = (row as any).__normExactVals?.[sourceField] || normalizeText(targetVal);
      if (normTarget === normalizedSourceValue) {
        return row[returnField];
      }
    }
  }
  return null;
}

export interface CandidateMatch {
  product: ProductMaster;
  score: number; // 0 - 100
  matchedKeyword: string;
}

export interface KeywordMatchResult {
  bestMatch: ProductMaster | null;
  candidates: CandidateMatch[];
  confidenceScore: number;
  status: 'OK' | 'CAN_KIEM_TRA' | 'KHONG_MATCH';
  matchedKeyword: string;
  maVV: string;
  tenSanPham: string;
  tkDoanhThu: string;
  thueSuat: string | number;
}

/**
 * Calculates a basic Jaccard-like word overlap ratio between input words and keyword words
 */
function calculateWordOverlap(inputNorm: string, kwNorm: string): number {
  const inputWords = new Set(inputNorm.split(' ').filter(Boolean));
  const kwWords = kwNorm.split(' ').filter(Boolean);
  if (kwWords.length === 0) return 0;
  
  let matchCount = 0;
  kwWords.forEach(w => {
    if (inputWords.has(w)) {
      matchCount++;
    }
  });

  return (matchCount / kwWords.length) * 100;
}

/**
 * 3. keywordMatch(inputText, productMaster)
 * Dùng để bóc tách thông tin Vụ Việc/Sản Phẩm dựa trên nội dung diễn giải thô.
 */
export function keywordMatch(
  inputText: string,
  productMaster: ProductMaster[]
): KeywordMatchResult {
  const result: KeywordMatchResult = {
    bestMatch: null,
    candidates: [],
    confidenceScore: 0,
    status: 'KHONG_MATCH',
    matchedKeyword: '',
    maVV: '',
    tenSanPham: '',
    tkDoanhThu: '',
    thueSuat: '',
  };

  if (!inputText || productMaster.length === 0) {
    return result;
  }

  const normInput = normalizeText(inputText);
  const candidates: CandidateMatch[] = [];

  for (const prod of productMaster) {
    const normKW = (prod as any).__normKeyword || normalizeText(prod.keyword);
    if (!normKW) continue;

    let score = 0;

    // A. Thống kê so khớp chuẩn xác tuyệt đối (100)
    if (normInput === normKW) {
      score = 100;
    }
    // B. Substring match: Keyword nằm trọn vẹn trong diễn giải (80 - 95 điểm tỷ lệ theo độ phủ)
    else if (normInput.includes(normKW)) {
      const coverageRatio = normKW.length / normInput.length;
      score = Math.round(80 + 15 * coverageRatio);
    }
    // C. Từ khoá ngược: Diễn giải lại nằm trong keyword (70 - 79 điểm)
    else if (normKW.includes(normInput)) {
      const coverageRatio = normInput.length / normKW.length;
      score = Math.round(70 + 9 * coverageRatio);
    }
    // D. Fuzzy overlap match theo cụm từ (50 - 69 điểm)
    else {
      const overlapScore = calculateWordOverlap(normInput, normKW);
      if (overlapScore > 0) {
        // scale to max 65
        score = Math.round(40 + (overlapScore * 25) / 100);
      }
    }

    if (score >= 40) {
      candidates.push({
        product: prod,
        score,
        matchedKeyword: prod.keyword,
      });
    }
  }

  // Sắp xếp ưu tiên: Điểm số cao nhất -> Keyword dài hơn -> Mã vụ việc cụ thể hơn
  candidates.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return b.matchedKeyword.length - a.matchedKeyword.length;
  });

  result.candidates = candidates;

  if (candidates.length > 0) {
    const best = candidates[0];
    result.bestMatch = best.product;
    result.confidenceScore = best.score;
    result.matchedKeyword = best.matchedKeyword;
    result.maVV = best.product.maVuViec;
    result.tenSanPham = best.product.tenSanPham;
    result.tkDoanhThu = best.product.tkDoanhThu;
    result.thueSuat = best.product.thueSuat !== undefined ? best.product.thueSuat : '';

    // Xác định Trạng thái kiểm duyệt (Status check rules)
    // 1. Nếu điểm cao nhưng có ứng viên thứ 2 điểm số xê dịch sát nút (biên độ dưới 6 điểm), bắt buộc CẦN KIỂM TRÁ để kiểm toán viên rà soát lại
    const hasCompetitor = candidates.length > 1 && (best.score - candidates[1].score < 6);

    if (hasCompetitor) {
      result.status = 'CAN_KIEM_TRA';
    } else if (best.score >= 90) {
      result.status = 'OK';
    } else if (best.score >= 70) {
      result.status = 'CAN_KIEM_TRA';
    } else {
      result.status = 'KHONG_MATCH';
    }
  }

  return result;
}

/**
 * 4. applyExceptionRules(inputText, rules)
 * - Match không phân biệt hoa/thường và dấu.
 * - Trả về outputValue tương ứng của Rule đầu tiên khớp, ngược lại trả null.
 */
export function applyExceptionRules(
  inputText: string,
  rules: ExceptionRule[]
): string | null {
  if (!inputText || rules.length === 0) return null;
  const normInput = normalizeText(inputText);

  for (const rule of rules) {
    const normKW = normalizeText(rule.keyword);
    if (normKW && normInput.includes(normKW)) {
      return rule.outputValue;
    }
  }
  return null;
}

/**
 * 5. parseNumber(value)
 * - Tự lọc ra các ký tự số, ký tự âm, dấu chấm, dấu phẩy từ chuỗi bất kỳ.
 * - Hỗ trợ đắc lực khi kế toán nhập định dạng tiền dạng 1.250.000,50đ hoặc $15,000.
 */
export function parseNumber(value: any): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;

  const rawStr = String(value).trim();
  if (!rawStr) return 0;

  // Check if it has a European or Vietnamese formatting like '1.250.000,50'
  // Where periods are thousands separators and comma is decimal separator.
  const hasCommaDecimal = /,\d{1,2}$/.test(rawStr) && (rawStr.match(/\./g) || []).length > 0;
  
  let formatted = rawStr;
  if (hasCommaDecimal) {
    // replace dots with empty string, make comma a standard dot
    formatted = formatted.replace(/\./g, '').replace(/,/g, '.');
  } else {
    // standard or clean format: remove commas used as thousands separators, then process
    // If it looks like '1,250,000.00'
    if ((formatted.match(/,/g) || []).length > 0 && formatted.includes('.')) {
      formatted = formatted.replace(/,/g, '');
    } else if ((formatted.match(/,/g) || []).length > 1 && !formatted.includes('.')) {
      // Looks like '1,250,000'
      formatted = formatted.replace(/,/g, '');
    } else if ((formatted.match(/,/g) || []).length === 1 && !formatted.includes('.')) {
      // Single comma, could be decimal or thousands separator. Let's look at numbers following.
      // If it's 3 digits like '1,500', it's most likely thousands. If 1 or 2 like '10,5', it's decimal.
      const parts = formatted.split(',');
      if (parts[1].length === 3) {
        formatted = formatted.replace(/,/g, '');
      } else {
        formatted = formatted.replace(/,/g, '.');
      }
    }
  }

  // Strip all non-numeric chars except digits, minus, and period
  const cleanStr = formatted.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleanStr);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * 6. parsePostingDateRange(value)
 * Diễn dịch Lịch đăng chiến dịch / Khoảng ngày hoạt động từ chuỗi tự do.
 * Đầu ra gồm ngày bắt đầu & ngày kết thúc.
 * Hỗ trợ các mẫu đa dạng:
 * - dd/MM/yyyy               → ngày đơn: startDate = ngày đó, endDate = null
 * - M/d/yyyy                 → ngày đơn: startDate = ngày đó, endDate = null
 * - dd/MM/yyyy-dd/MM/yyyy    → dải: startDate, endDate đầy đủ
 * - d-d/M/yyyy               → dải rút gọn cùng tháng/năm
 * - d/M-d/M/yyyy             → dải rút gọn cùng năm
 * - d/M/yy-d/M/yy            → dải đầy đủ năm 2 chữ số
 *
 * Lưu ý: Khi chỉ có 1 ngày duy nhất (ngày đơn), endDate = null (bỏ trống).
 * Theo spec nghiệp vụ 2026-06-29: ngày đơn → startDate, endDate để trống.
 */
export function parsePostingDateRange(value: string): {
  startDate: Date | null;
  endDate: Date | null;
  raw: string;
} {
  const result: { startDate: Date | null; endDate: Date | null; raw: string } = {
    startDate: null,
    endDate: null,
    raw: String(value || '').trim(),
  };

  const text = result.raw;
  if (!text) return result;

  // Helpers to formulate date parts cleanly back to a valid Date object
  const makeDate = (d: number, m: number, y: number): Date | null => {
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    let fullYear = y;
    if (y < 100) {
      fullYear = y + 2000; // yy to 20yy
    }
    const dateObj = new Date(fullYear, m - 1, d);
    return isNaN(dateObj.getTime()) ? null : dateObj;
  };

  try {
    // Normalize format a bit: replace spaces and specific characters
    const cleanText = text.replace(/\s+/g, '').replace(/to|den|~/g, '-');

    // Case A: dd/mm/yyyy - dd/mm/yyyy or d/m/yy-d/m/yy
    const rangeMatch1 = cleanText.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})-(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (rangeMatch1) {
      result.startDate = makeDate(Number(rangeMatch1[1]), Number(rangeMatch1[2]), Number(rangeMatch1[3]));
      result.endDate = makeDate(Number(rangeMatch1[4]), Number(rangeMatch1[5]), Number(rangeMatch1[6]));
      return result;
    }

    // Case B: d-d/M/yyyy (Ex: 01-15/06/2026 -> Start 01/06/2026, End 15/06/2026)
    const rangeMatch2 = cleanText.match(/^(\d{1,2})-(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (rangeMatch2) {
      const m = Number(rangeMatch2[3]);
      const y = Number(rangeMatch2[4]);
      result.startDate = makeDate(Number(rangeMatch2[1]), m, y);
      result.endDate = makeDate(Number(rangeMatch2[2]), m, y);
      return result;
    }

    // Case C: d/M-d/M/yyyy (Ex: 15/5-20/6/2026 -> Start 15/05/2026, End 20/06/2026)
    const rangeMatch3 = cleanText.match(/^(\d{1,2})\/(\d{1,2})-(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (rangeMatch3) {
      const y = Number(rangeMatch3[5]);
      result.startDate = makeDate(Number(rangeMatch3[1]), Number(rangeMatch3[2]), y);
      result.endDate = makeDate(Number(rangeMatch3[3]), Number(rangeMatch3[4]), y);
      return result;
    }

    // Case D: Single date like dd/MM/yyyy or d/M/yy
    // Spec 2026-06-29: ngày đơn → startDate = ngày đó, endDate = null (bỏ trống)
    const singleMatch = cleanText.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (singleMatch) {
      const dateObj = makeDate(Number(singleMatch[1]), Number(singleMatch[2]), Number(singleMatch[3]));
      result.startDate = dateObj;
      result.endDate = null; // Ngày đơn: không có ngày kết thúc
      return result;
    }

    // Fallback parser: search for any date patterns using regex
    const matches = cleanText.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/g);
    if (matches && matches.length >= 2) {
      const sPart = matches[0].split('/');
      const ePart = matches[1].split('/');
      result.startDate = makeDate(Number(sPart[0]), Number(sPart[1]), Number(sPart[2]));
      result.endDate = makeDate(Number(ePart[0]), Number(ePart[1]), Number(ePart[2]));
      return result;
    } else if (matches && matches.length === 1) {
      const sPart = matches[0].split('/');
      const dateObj = makeDate(Number(sPart[0]), Number(sPart[1]), Number(sPart[2]));
      result.startDate = dateObj;
      // Spec 2026-06-29: ngày đơn → endDate = null (bỏ trống)
    }
  } catch (err) {
    // Silent fail and return partial nulls gracefully
  }

  return result;
}

/**
 * 7. parseContractDateFromBooking(maBooking)
 * - Lấy 4 ký tự cuối dạng MMyy. (Ví dụ: BK-2026-1123 -> '1123' -> Month 11, Year 2023)
 * - Hoặc lấy 4 số liền kề nhau cuối chuỗi.
 * - Trả về ngày rằm/đầu tháng: 01/MM/yyyy 00:00:00
 */
export function parseContractDateFromBooking(maBooking: string): {
  contractDate: Date | null;
  text: string;
} {
  const result: { contractDate: Date | null; text: string } = {
    contractDate: null,
    text: '',
  };

  if (!maBooking) return result;
  const cleanCode = String(maBooking).trim();

  // Extract the last 4 characters if they are digits, or find the last cluster of 4 digits
  let digits = '';
  const lastFour = cleanCode.slice(-4);
  if (/^\d{4}$/.test(lastFour)) {
    digits = lastFour;
  } else {
    const match = cleanCode.match(/\d{4}(?=[^\d]*$)/); // finds last 4-digit sequence
    if (match) {
      digits = match[0];
    }
  }

  if (digits.length === 4) {
    const month = parseInt(digits.slice(0, 2), 10);
    const yrShort = parseInt(digits.slice(2, 4), 10);

    if (month >= 1 && month <= 12) {
      const fullYear = 2000 + yrShort;
      const contractDateObj = new Date(fullYear, month - 1, 1);
      
      result.contractDate = contractDateObj;
      result.text = `01/${month < 10 ? '0' + month : month}/${fullYear}`;
    }
  }

  return result;
}

/**
 * Chuyển đổi các ký tự xuống dòng (Char(10) \n, Char(13) \r) thành dấu nối " - "
 * và làm sạch khoảng trắng dư thừa liên tiếp.
 */
export function sanitizeNewlinesToDash(val: any): string {
  if (val === undefined || val === null) return '';
  return String(val)
    .replace(/[\r\n]+/g, ' - ')
    .replace(/\s*-\s*/g, ' - ')
    .trim();
}

/**
 * Helper trích xuất ký tự trong ngoặc đơn cuối chuỗi (dùng cho SUN, WPP để lấy 14 ký tự Số HT).
 * Ví dụ: "Dịch vụ quảng cáo... (12345678901234)" -> "12345678901234"
 */
export function extractParenthesesTail(val: any, targetLength: number = 14): string {
  if (val === undefined || val === null) return '';
  const text = String(val).trim();
  const match = text.match(/\(([^)]+)\)\s*$/);
  if (match && match[1]) {
    const inside = match[1].trim();
    if (targetLength > 0 && inside.length > targetLength) {
      return inside.slice(-targetLength);
    }
    return inside;
  }
  return text;
}

/**
 * Tách dòng và lấy nội dung sau tiền tố "Loại quảng cáo :" (mẫu SUN).
 * Hỗ trợ các biến thể hoa thường, có/không dấu cách trước sau dấu hai chấm.
 */
export function extractSunContentDetail(rawContent: any): string {
  if (!rawContent) return '';
  const text = String(rawContent);
  const lines = text.split(/[\r\n]+/);
  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^loại\s*quảng\s*cáo\s*:\s*(.+)$/i);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return lines[0]?.trim() || text.trim();
}

/**
 * Chuyển đổi an toàn giá trị ngày nhận từ parser (Date object, Excel serial number, hoặc string)
 * sang chuỗi ngày chuẩn DD/MM/YYYY.
 */
export function formatRawDateValue(dateVal: any): string {
  if (dateVal === undefined || dateVal === null || dateVal === '') return '';

  if (dateVal instanceof Date) {
    if (isNaN(dateVal.getTime())) return '';
    // Khắc phục lỗi lịch sử múi giờ (LMT timezone bug trong SheetJS/Excel):
    // Do độ lệch múi giờ lịch sử trước 1970 (GMT+6:42 vs GMT+7), các ngày Excel chuyển sang Date
    // thường rơi vào 23:59:56 đêm ngày hôm trước thay vì 00:00:00 ngày hiện tại.
    // Thêm 12 giờ để đưa mốc thời gian về an toàn ở giữa ngày chuẩn.
    const adjusted = new Date(dateVal.getTime() + 12 * 3600 * 1000);
    const day = String(adjusted.getDate()).padStart(2, '0');
    const month = String(adjusted.getMonth() + 1).padStart(2, '0');
    const year = adjusted.getFullYear();
    return `${day}/${month}/${year}`;
  }

  if (typeof dateVal === 'number') {
    // Excel serial number (ví dụ 46161)
    if (dateVal > 10000 && dateVal < 100000) {
      const utcDays = Math.floor(dateVal - 25569);
      const utcValue = utcDays * 86400;
      const dateInfo = new Date(utcValue * 1000);
      const day = String(dateInfo.getUTCDate()).padStart(2, '0');
      const month = String(dateInfo.getUTCMonth() + 1).padStart(2, '0');
      const year = dateInfo.getUTCFullYear();
      return `${day}/${month}/${year}`;
    }
    return String(dateVal);
  }

  const str = String(dateVal).trim();
  const dMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dMatch) {
    const day = String(dMatch[1]).padStart(2, '0');
    const month = String(dMatch[2]).padStart(2, '0');
    let year = Number(dMatch[3]);
    if (year < 100) year += 2000;
    return `${day}/${month}/${year}`;
  }

  return str;
}

/**
 * Chuẩn hóa mã booking, loại bỏ hậu tố /AD thừa nếu có để làm key tra cứu gốc.
 */
export function cleanBookingCode(rawBooking: any): string {
  if (!rawBooking) return '';
  const text = String(rawBooking).trim();
  return text.replace(/\/AD$/i, '').trim();
}

/**
 * Xây dựng Ghi chú chi tiết an toàn, không nhân đôi /AD/AD nếu soHt đã kết thúc bằng /AD.
 */
export function buildGhiChuChiTietIdempotent(soHt: any, separator: string = '-', suffix: string = '/AD'): string {
  const cleanHt = String(soHt ?? '').trim();
  if (!cleanHt) return '';
  if (cleanHt.toLowerCase().endsWith(suffix.toLowerCase())) {
    return cleanHt;
  }
  return `${cleanHt}${suffix}`;
}

/**
 * Helper parse số có sentinel:
 * - Trả về null khi giá trị rỗng, undefined, hoặc text lỗi không phải số.
 * - Giữ nguyên 0 nếu giá trị thực sự là 0.
 */
export function parseOptionalNumber(value: any): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number') {
    return isNaN(value) ? null : value;
  }
  const str = String(value).trim();
  if (str === '') return null;
  
  // Xóa đơn vị tiền tệ và khoảng trắng: đ, VND, VNĐ, %
  let cleanStr = str.replace(/[đVNĐ%]/gi, '').trim();
  if (cleanStr === '') return null;

  // Xử lý dấu phân cách hàng nghìn và thập phân:
  // Nếu có nhiều dấu chấm (ví dụ: 15.500.000) -> đây là phân cách hàng nghìn tiếng Việt
  if ((cleanStr.match(/\./g) || []).length > 1) {
    cleanStr = cleanStr.replace(/\./g, '');
  } else if ((cleanStr.match(/,/g) || []).length > 1) {
    // Nếu có nhiều dấu phẩy (ví dụ: 15,500,000) -> phân cách hàng nghìn kiểu US
    cleanStr = cleanStr.replace(/,/g, '');
  } else if (cleanStr.includes('.') && cleanStr.includes(',')) {
    // Cả hai: xác định cái nào là hàng nghìn
    if (cleanStr.indexOf('.') < cleanStr.indexOf(',')) {
      // 15.500,00 -> chấm là nghìn, phẩy là thập phân
      cleanStr = cleanStr.replace(/\./g, '').replace(',', '.');
    } else {
      // 15,500.00 -> phẩy là nghìn
      cleanStr = cleanStr.replace(/,/g, '');
    }
  } else {
    // Chỉ có 1 dấu chấm hoặc 1 dấu phẩy
    // Nếu dấu chấm theo sau bởi đúng 3 chữ số cuối (ví dụ 15.500) -> coi là hàng nghìn
    if (/\.\d{3}$/.test(cleanStr)) {
      cleanStr = cleanStr.replace(/\./g, '');
    } else {
      // Chuẩn hóa dấu phẩy thành dấu chấm nếu là phân cách thập phân
      cleanStr = cleanStr.replace(/,/g, '');
    }
  }

  // Xóa các khoảng trắng còn lại
  cleanStr = cleanStr.replace(/\s+/g, '');
  if (cleanStr === '') return null;
  const num = Number(cleanStr);
  return isNaN(num) ? null : num;
}

/**
 * Chuẩn hóa và tính tổng chiết khấu cho WPP/MMS.
 */
export function parseAndSumDiscounts(ckRaw: any, ckuDaiRaw: any): number {
  const parsePercent = (val: any): number => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') {
      // Nếu là số thập phân như 0.15 thì hiểu là 15%
      return val <= 1 && val > 0 ? val * 100 : val;
    }
    const str = String(val).trim().replace(/%/g, '').replace(/,/g, '.');
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  };

  const ck1 = parsePercent(ckRaw);
  const ck2 = parsePercent(ckuDaiRaw);
  return ck1 + ck2;
}

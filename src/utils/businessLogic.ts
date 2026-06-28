/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ExceptionRule, ProductMaster } from '../types';

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

  rows.forEach(row => {
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

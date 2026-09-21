/**
 * @contract src/utils/bangKeTemplates.ts
 * - Trách nhiệm:
 *   - Quản lý danh sách các mẫu bảng kê (Registry: STANDARD, MMS, SUN, WPP).
 *   - Nhận diện tự động mẫu bảng kê theo kiến trúc 3 lớp:
 *     1. Metadata tiêu đề / Bên A / Tên bảng kê phía trên header row
 *     2. Từ khóa đặc trưng của header columns
 *     3. Cột biến đổi và dữ liệu dòng mẫu (data sampling)
 *   - Chuẩn hóa các dòng dữ liệu thô (transformRow) thành NormalizedBangKeRow.
 *   - Mở rộng mẫu mới thông qua registerBangKeTemplate.
 */

import { BangKeTemplateId, BangKeTemplateConfig, NormalizedBangKeRow, ExcelSheetData } from '../types';
import {
  extractParenthesesTail,
  extractSunContentDetail,
  formatRawDateValue,
  cleanBookingCode,
  buildGhiChuChiTietIdempotent,
  parseAndSumDiscounts,
  parseOptionalNumber,
  sanitizeNewlinesToDash,
} from './businessLogic';

export interface BangKeTemplateHandler extends BangKeTemplateConfig {
  detector: (sheet: ExcelSheetData) => { matched: boolean; score: number };
  transformRow: (rawRow: Record<string, any>, context?: any) => NormalizedBangKeRow | null;
}

const templateRegistry = new Map<BangKeTemplateId, BangKeTemplateHandler>();

function normalizeText(val: any): string {
  return String(val ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim();
}

/**
 * 1. TEMPLATE STANDARD (Mẫu bảng kê chuẩn)
 */
const standardTemplate: BangKeTemplateHandler = {
  id: 'STANDARD',
  name: 'Mẫu Chuẩn (Standard)',
  description: 'Mẫu bảng kê chuẩn với các cột Mã booking, Lịch đăng, Số HT, Nội dung quảng cáo...',
  badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
  detector: (sheet: ExcelSheetData) => {
    // Score baseline cho standard
    const headers = sheet.headers.map(normalizeText);
    let matches = 0;
    if (headers.some(h => h.includes('ma booking') || h.includes('booking'))) matches++;
    if (headers.some(h => h.includes('so ht') || h.includes('ht'))) matches++;
    if (headers.some(h => h.includes('lich dang') || h.includes('lich chay') || h.includes('thoi gian'))) matches++;
    if (headers.some(h => h.includes('noi dung quang cao') || h.includes('noi dung'))) matches++;
    
    return {
      matched: matches >= 2,
      score: matches * 10,
    };
  },
  transformRow: (rawRow: Record<string, any>) => {
    const rawBooking = rawRow['Mã booking'] || rawRow['Booking'] || rawRow['booking'] || '';
    const cleanBooking = cleanBookingCode(rawBooking);
    const rawSoHt = rawRow['Số HT'] || rawRow['So HT'] || rawRow['HT'] || '';
    const cleanSoHt = String(rawSoHt).trim();
    const chuyenTrang = String(rawRow['Chuyên trang'] || rawRow['chuyenTrang'] || rawRow['Nhãn'] || '').trim();
    const rawNoiDung = String(rawRow['Nội dung quảng cáo'] || rawRow['Nội dung'] || rawRow['noiDung'] || '');
    const noiDung = sanitizeNewlinesToDash(rawNoiDung);

    return {
      stt: rawRow['STT'] || rawRow['stt'],
      maBooking: cleanBooking,
      rawBooking: String(rawBooking).trim(),
      lichDang: formatRawDateValue(rawRow['Lịch đăng'] || rawRow['Thời gian chạy'] || rawRow['lichDang']),
      soHt: cleanSoHt,
      rawSoHt: String(rawSoHt).trim(),
      chuyenTrang,
      lookupContent: chuyenTrang || noiDung,
      noiDung,
      soLuong: parseOptionalNumber(rawRow['Số lượng']) ?? undefined,
      donGia: parseOptionalNumber(rawRow['Đơn giá']) ?? undefined,
      chietKhau: parseOptionalNumber(rawRow['Chiết khấu'] || rawRow['CK']) ?? undefined,
      thanhTienSauCk: parseOptionalNumber(rawRow['Thành tiền sau chiết khấu (VNĐ)'] || rawRow['Thành tiền']) ?? undefined,
      ...rawRow,
    };
  },
};

/**
 * 2. TEMPLATE MMS
 * Đặc trưng:
 * - Cột Hợp đồng -> Mã booking (bỏ đuôi /AD nếu có, khi lên Tên HĐ tự nối /AD).
 * - Cột Số HT giữ nguyên (đã có đuôi /AD).
 * - Cột "Thành tiền VNĐ\r\n(không VAT)" hoặc "Thành tiền VNĐ (không VAT)" map trực tiếp vào thanhTienSauCk.
 */
const mmsTemplate: BangKeTemplateHandler = {
  id: 'MMS',
  name: 'Mẫu MMS',
  description: 'Mẫu bảng kê MMS: Cột Hợp đồng làm booking, map trực tiếp Thành tiền VNĐ (không VAT)',
  badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  detector: (sheet: ExcelSheetData) => {
    let score = 0;
    const rawArray = sheet.rawArray || [];
    const headerRow = sheet.headerRowIndex ?? 0;

    // Lớp 1: Quét các dòng trước header tìm metadata tên Bên A / MMS
    for (let r = 0; r < headerRow; r++) {
      const row = rawArray[r];
      if (!Array.isArray(row)) continue;
      const rowStr = normalizeText(row.join(' '));
      if (rowStr.includes('mms') || rowStr.includes('mindshare') || rowStr.includes('mediamind')) {
        score += 50;
      }
    }

    // Lớp 2: Quét header
    const headers = sheet.headers.map(normalizeText);
    const hasHopDong = headers.some(h => h === 'hop dong' || h.includes('hop dong'));
    const hasThanhTienKhongVat = headers.some(h => h.includes('thanh tien') && h.includes('khong vat'));
    const hasSoHt = headers.some(h => h === 'so ht' || h.includes('so ht'));

    if (hasHopDong) score += 30;
    if (hasThanhTienKhongVat) score += 30;
    if (hasSoHt) score += 10;

    // Lớp 3: Data sampling
    if (sheet.rows && sheet.rows.length > 0) {
      const sample = sheet.rows[0];
      const sampleKeys = Object.keys(sample);
      const ttKey = sampleKeys.find(k => {
        const norm = normalizeText(k);
        return norm.includes('thanh tien') && norm.includes('khong vat');
      });
      if (ttKey && sample[ttKey] !== undefined) score += 10;
    }

    return {
      matched: score >= 60,
      score,
    };
  },
  transformRow: (rawRow: Record<string, any>) => {
    // Cột Hợp đồng làm booking
    const rawBooking = rawRow['Hợp đồng'] || rawRow['Hop dong'] || rawRow['Mã booking'] || '';
    const cleanBooking = cleanBookingCode(rawBooking);

    // Cột Số HT
    const rawSoHt = rawRow['Số HT'] || rawRow['So HT'] || rawRow['HT'] || '';
    const cleanSoHt = String(rawSoHt).trim();

    // Cột Thành tiền không VAT
    let thanhTienRaw: any = undefined;
    for (const key of Object.keys(rawRow)) {
      const normKey = normalizeText(key);
      if (normKey.includes('thanh tien') && normKey.includes('khong vat')) {
        thanhTienRaw = rawRow[key];
        break;
      }
    }
    if (thanhTienRaw === undefined) {
      thanhTienRaw = rawRow['Thành tiền'] || rawRow['Thành tien'];
    }

    const parsedThanhTien = parseOptionalNumber(thanhTienRaw);
    const rawChuyenTrang = String(rawRow['Chuyên trang'] || '').trim();
    const rawNhan = String(rawRow['Nhãn hàng'] || rawRow['Nhãn'] || '').trim();
    const noiDung = sanitizeNewlinesToDash(rawRow['Nội dung quảng cáo'] || rawRow['Nội dung'] || '');
    // Ưu tiên cột Chuyên trang riêng nếu có; nếu không có thì dùng noiDung; Nhãn chỉ dùng fallback cuối cùng
    const chuyenTrang = rawChuyenTrang || noiDung || rawNhan;

    return {
      stt: rawRow['STT'] || rawRow['stt'],
      maBooking: cleanBooking,
      rawBooking: String(rawBooking).trim(),
      lichDang: formatRawDateValue(rawRow['Lịch đăng'] || rawRow['Thời gian chạy']),
      soHt: cleanSoHt,
      rawSoHt: String(rawSoHt).trim(),
      chuyenTrang,
      lookupContent: noiDung || chuyenTrang,
      noiDung,
      soLuong: parseOptionalNumber(rawRow['Số lượng']) ?? undefined,
      donGia: parseOptionalNumber(rawRow['Đơn giá']) ?? undefined,
      chietKhau: parseOptionalNumber(rawRow['Chiết khấu'] || rawRow['CK']) ?? undefined,
      thanhTienSauCk: parsedThanhTien !== null ? parsedThanhTien : undefined,
      ...rawRow,
    };
  },
};

/**
 * 3. TEMPLATE SUN
 * Đặc trưng:
 * - Cột Mã book -> Mã booking.
 * - Cột Số HT lấy 14 ký tự trong ngoặc đơn cuối ô (...).
 * - Nội dung quảng cáo: tách dòng, lấy chuỗi sau "Loại quảng cáo :" làm chi tiết/chuyên trang và lookup sản phẩm.
 */
const sunTemplate: BangKeTemplateHandler = {
  id: 'SUN',
  name: 'Mẫu SUN',
  description: 'Mẫu bảng kê SUN: Mã book, Số HT lấy ngoặc đơn 14 ký tự cuối, tách Loại quảng cáo :',
  badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
  detector: (sheet: ExcelSheetData) => {
    let score = 0;
    const rawArray = sheet.rawArray || [];
    const headerRow = sheet.headerRowIndex ?? 0;

    // Lớp 1: Quét tiêu đề bên A
    for (let r = 0; r < headerRow; r++) {
      const row = rawArray[r];
      if (!Array.isArray(row)) continue;
      const rowStr = normalizeText(row.join(' '));
      if (rowStr.includes('sun') || rowStr.includes('sunflower') || rowStr.includes('suntory')) {
        score += 50;
      }
    }

    // Lớp 2: Kiểm tra header
    const headers = sheet.headers.map(normalizeText);
    const hasMaBook = headers.some(h => h === 'ma book' || h.includes('ma book'));
    const hasNoiDungQc = headers.some(h => h.includes('noi dung quang cao') || h.includes('noi dung'));
    const hasSoHt = headers.some(h => h === 'so ht' || h.includes('so ht'));

    if (hasMaBook) score += 35;
    if (hasNoiDungQc) score += 15;
    if (hasSoHt) score += 15;

    // Lớp 3: Data sampling (Nội dung có chứa "Loại quảng cáo :" hoặc Số HT có ngoặc đơn)
    if (sheet.rows && sheet.rows.length > 0) {
      const sample = sheet.rows[0];
      const sampleValues = Object.values(sample).map(v => String(v));
      const hasSunContentType = sampleValues.some(v => /loại\s*quảng\s*cáo\s*:/i.test(v));
      const hasParenthesesTail = sampleValues.some(v => /\([0-9a-zA-Z\s/-]+\)$/.test(v.trim()));
      if (hasSunContentType) score += 20;
      if (hasParenthesesTail) score += 15;
    }

    return {
      matched: score >= 60,
      score,
    };
  },
  transformRow: (rawRow: Record<string, any>) => {
    const rawBooking = rawRow['Mã book'] || rawRow['Ma book'] || rawRow['Mã booking'] || '';
    const cleanBooking = cleanBookingCode(rawBooking);

    // Cột Số HT: lấy 14 ký tự trong ngoặc đơn cuối ô nếu có
    const rawSoHt = rawRow['Số HT'] || rawRow['So HT'] || rawRow['HT'] || '';
    const cleanSoHt = extractParenthesesTail(rawSoHt, 14);

    // Nội dung quảng cáo: tách "Loại quảng cáo :"
    const rawNoiDung = rawRow['Nội dung quảng cáo'] || rawRow['Nội dung'] || '';
    const sunDetail = extractSunContentDetail(rawNoiDung);
    const cleanNoiDung = sanitizeNewlinesToDash(rawNoiDung);

    const chuyenTrang = sunDetail || String(rawRow['Chuyên trang'] || '').trim();
    const parsedThanhTien = parseOptionalNumber(rawRow['Thành tiền sau chiết khấu (VNĐ)'] || rawRow['Thành tiền']);

    return {
      stt: rawRow['STT'] || rawRow['stt'],
      maBooking: cleanBooking,
      rawBooking: String(rawBooking).trim(),
      lichDang: formatRawDateValue(rawRow['Lịch đăng'] || rawRow['Thời gian chạy']),
      soHt: cleanSoHt,
      rawSoHt: String(rawSoHt).trim(),
      chuyenTrang,
      lookupContent: sunDetail || chuyenTrang || cleanNoiDung,
      noiDung: cleanNoiDung,
      soLuong: parseOptionalNumber(rawRow['Số lượng']) ?? undefined,
      donGia: parseOptionalNumber(rawRow['Đơn giá']) ?? undefined,
      chietKhau: parseOptionalNumber(rawRow['Chiết khấu'] || rawRow['CK']) ?? undefined,
      thanhTienSauCk: parsedThanhTien !== null ? parsedThanhTien : undefined,
      ...rawRow,
    };
  },
};

/**
 * 4. TEMPLATE WPP
 * Đặc trưng:
 * - Cột Mã booking -> Mã booking (chuẩn hóa bỏ dấu cách/ký tự lạ).
 * - Cột Số HT lấy 14 ký tự trong ngoặc đơn cuối.
 * - Lịch đăng = Ngày bắt đầu - Ngày kết thúc.
 * - Chiết khấu = Chiết khấu + Chiết khấu ưu đãi.
 * - Chuyên trang = Ghép Cách mua + Sản phẩm + Website/tag + Tên banner.
 * - Bỏ qua dòng tiền null hoặc <= 0.
 */
const wppTemplate: BangKeTemplateHandler = {
  id: 'WPP',
  name: 'Mẫu WPP',
  description: 'Mẫu bảng kê WPP: Ghép Lịch đăng, tổng Chiết khấu, ghép Chuyên trang 4 trường',
  badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
  detector: (sheet: ExcelSheetData) => {
    let score = 0;
    const rawArray = sheet.rawArray || [];
    const headerRow = sheet.headerRowIndex ?? 0;

    // Lớp 1: Quét bên A
    for (let r = 0; r < headerRow; r++) {
      const row = rawArray[r];
      if (!Array.isArray(row)) continue;
      const rowStr = normalizeText(row.join(' '));
      if (rowStr.includes('wpp') || rowStr.includes('groupm') || rowStr.includes('mindshare') || rowStr.includes('ogilvy')) {
        score += 50;
      }
    }

    // Lớp 2: Headers
    const headers = sheet.headers.map(normalizeText);
    const hasIoWpp = headers.some(h => h.includes('io wpp') || h === 'io');
    const hasNgayBatDau = headers.some(h => h.includes('ngay bat dau'));
    const hasNgayKetThuc = headers.some(h => h.includes('ngay ket thuc'));
    const hasCachMua = headers.some(h => h.includes('cach mua'));
    const hasWebsiteTag = headers.some(h => h.includes('website') || h.includes('tag'));

    if (hasIoWpp) score += 35;
    if (hasNgayBatDau && hasNgayKetThuc) score += 20;
    if (hasCachMua) score += 15;
    if (hasWebsiteTag) score += 10;

    // Lớp 3: Data sampling
    if (sheet.rows && sheet.rows.length > 0) {
      const sample = sheet.rows[0];
      const sampleKeys = Object.keys(sample);
      const ioKey = sampleKeys.find(k => normalizeText(k).includes('io'));
      if (ioKey && sample[ioKey]) score += 15;
    }

    return {
      matched: score >= 60,
      score,
    };
  },
  transformRow: (rawRow: Record<string, any>) => {
    // 1. Kiểm tra điều kiện loại trừ dòng không có tiền hoặc tiền <= 0
    let rawMoney: any = rawRow['Thành tiền sau chiết khấu (VNĐ)'] || rawRow['Thành tiền sau chiết khấu'] || rawRow['Thành tiền'];
    if (rawMoney === undefined) {
      for (const key of Object.keys(rawRow)) {
        const normKey = normalizeText(key);
        if (normKey.includes('thanh tien sau chiet khau') || (normKey.includes('thanh tien') && !normKey.includes('uu dai'))) {
          rawMoney = rawRow[key];
          break;
        }
      }
    }
    const parsedMoney = parseOptionalNumber(rawMoney);
    if (parsedMoney === null || parsedMoney <= 0) {
      return null;
    }

    // 2. Booking code
    const rawBooking = rawRow['Mã booking'] || rawRow['Ma booking'] || rawRow['Booking'] || '';
    const cleanBooking = cleanBookingCode(rawBooking);

    // 3. Ghép Lịch đăng: Ngày bắt đầu - Ngày kết thúc
    const rawStart = rawRow['Ngày bắt đầu'] || rawRow['Ngay bat dau'] || rawRow['Từ ngày'] || '';
    const rawEnd = rawRow['Ngày kết thúc'] || rawRow['Ngay ket thuc'] || rawRow['Đến ngày'] || '';
    const startStr = formatRawDateValue(rawStart);
    const endStr = formatRawDateValue(rawEnd);
    let lichDang = '';
    if (startStr && endStr) {
      lichDang = `${startStr} - ${endStr}`;
    } else {
      lichDang = startStr || endStr || '';
    }

    // 4. Số HT: lấy 14 ký tự trong ngoặc đơn cuối
    const rawSoHt = rawRow['Số HT'] || rawRow['HT'] || '';
    const cleanSoHt = extractParenthesesTail(rawSoHt, 14);

    // 5. Chiết khấu: tổng CK (cột O) + CK ưu đãi (cột P)
    let ckVal: any = undefined;
    let ckUuDaiVal: any = undefined;
    for (const key of Object.keys(rawRow)) {
      const normKey = normalizeText(key);
      const isMoneyCol = normKey.includes('thanh tien') || normKey.includes('so tien') || normKey.includes('vnd');
      if (isMoneyCol) continue;

      if (normKey.includes('uu dai')) {
        ckUuDaiVal = rawRow[key];
      } else if (normKey === 'chiet khau' || normKey === 'ck' || (normKey.includes('chiet khau') && !normKey.includes('sau'))) {
        ckVal = rawRow[key];
      }
    }
    const totalCk = parseAndSumDiscounts(ckVal, ckUuDaiVal);

    // 6. Chuyên trang: Ghép Cách mua + Sản phẩm + Website/tag + Tên banner
    const cachMua = String(rawRow['Cách mua'] || rawRow['Cach mua'] || '').trim();
    const sanPham = String(rawRow['Sản phẩm'] || rawRow['San pham'] || '').trim();
    let websiteTag = '';
    let tenBanner = '';
    for (const key of Object.keys(rawRow)) {
      const normKey = normalizeText(key);
      if (normKey.includes('website') || normKey.includes('tag')) websiteTag = String(rawRow[key] || '').trim();
      if (normKey.includes('ten banner') || normKey.includes('banner')) tenBanner = String(rawRow[key] || '').trim();
    }
    const parts = [cachMua, sanPham, websiteTag, tenBanner].filter(p => Boolean(p));
    const chuyenTrangCombined = parts.join(' - ');

    return {
      stt: rawRow['STT'] || rawRow['stt'],
      maBooking: cleanBooking,
      rawBooking: String(rawBooking).trim(),
      lichDang,
      soHt: cleanSoHt,
      rawSoHt: String(rawSoHt).trim(),
      chuyenTrang: chuyenTrangCombined,
      lookupContent: chuyenTrangCombined || sanPham,
      noiDung: tenBanner || sanPham || chuyenTrangCombined,
      soLuong: parseOptionalNumber(rawRow['Số lượng']) ?? undefined,
      donGia: parseOptionalNumber(rawRow['Đơn giá']) ?? undefined,
      chietKhau: totalCk,
      thanhTienSauCk: parsedMoney,
      ...rawRow,
    };
  },
};

// Đăng ký các template mặc định
templateRegistry.set('STANDARD', standardTemplate);
templateRegistry.set('MMS', mmsTemplate);
templateRegistry.set('SUN', sunTemplate);
templateRegistry.set('WPP', wppTemplate);

/**
 * Đăng ký template mới mở rộng (extensibility)
 */
export function registerBangKeTemplate(template: BangKeTemplateHandler): void {
  templateRegistry.set(template.id, template);
}

/**
 * Lấy danh sách thông tin hiển thị của tất cả templates đã đăng ký
 */
export function getAllBangKeTemplates(): BangKeTemplateConfig[] {
  return Array.from(templateRegistry.values()).map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    badgeColor: t.badgeColor,
  }));
}

/**
 * Lấy handler của một template cụ thể
 */
export function getBangKeTemplateHandler(templateId: BangKeTemplateId): BangKeTemplateHandler {
  return templateRegistry.get(templateId) || standardTemplate;
}

/**
 * Tự động phát hiện template phù hợp nhất cho sheet bảng kê
 */
export function detectBangKeTemplate(sheet: ExcelSheetData): BangKeTemplateId {
  let bestTemplateId: BangKeTemplateId = 'STANDARD';
  let highestScore = -1;

  // Duyệt qua các template chuyên biệt trước (MMS, SUN, WPP)
  const specializedTemplates: BangKeTemplateId[] = ['MMS', 'SUN', 'WPP'];
  for (const id of specializedTemplates) {
    const handler = templateRegistry.get(id);
    if (!handler) continue;
    const result = handler.detector(sheet);
    if (result.matched && result.score > highestScore) {
      highestScore = result.score;
      bestTemplateId = id;
    }
  }

  // Nếu không template chuyên biệt nào match, fallback về STANDARD
  if (highestScore < 50) {
    return 'STANDARD';
  }

  return bestTemplateId;
}

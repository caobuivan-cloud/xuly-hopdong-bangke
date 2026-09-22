/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ExceptionRule, ProductMaster, HeaderAliasesBangKe, SiteMaster, LearnedRule } from '../types';

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
  str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // replaces decomposing symbols
  str = str
    .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
    .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
    .replace(/[ìíịỉĩ]/g, 'i')
    .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
    .replace(/[ùúụủũưừứựửữ]/g, 'u')
    .replace(/[ỳýỵỷỹ]/g, 'y')
    .replace(/đ/g, 'd')
    .replace(/[\u2013\u2014]/g, '-') // Chuẩn hóa en-dash và em-dash thành dấu gạch ngang chuẩn
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
 * parseCompoundRules(products)
 * Tự động bóc tách quy tắc kép từ keyword dạng:
 * "Đơn vị tính CPM - Nội dung quảng cáo chứa cụm từ Admatic"
 */
export function parseCompoundRules(products: ProductMaster[]): ProductMaster[] {
  const COMPOUND_REGEX = /^(?:đơn vị tính|don vi tinh|đvt|dvt)\s+([a-z0-9]+)\s*-\s*nội dung quảng cáo chứa cụm từ\s+(.+)$/i;

  return products.map(prod => {
    if (prod.isCompoundRule && prod.dvtRequired && prod.contentKeyword) {
      return prod;
    }

    const trimmedKeyword = (prod.keyword || '').trim();
    const match = trimmedKeyword.match(COMPOUND_REGEX);

    if (match) {
      const dvt = match[1].trim().toUpperCase();
      const contentKw = match[2].trim();
      return {
        ...prod,
        dvtRequired: dvt,
        contentKeyword: contentKw,
        isCompoundRule: true,
      };
    }

    const normKw = normalizeText(trimmedKeyword);
    const isBroad = normKw === 'quang cao' || normKw === 'chi phi' || normKw === 'tuyen bai' || normKw === 'banner';

    return {
      ...prod,
      isBroadFallback: isBroad,
    };
  });
}

export const DEFAULT_INTERNAL_SITES: SiteMaster[] = [
  { domain: 'kenh14.vn', maSite: 'K14', tenSite: 'Kenh14' },
  { domain: 'cafef.vn', maSite: 'CAFEF', tenSite: 'CafeF' },
  { domain: 'cafebiz.vn', maSite: 'CAFE BIZ', tenSite: 'CafeBiz' },
  { domain: 'soha.vn', maSite: 'SHNEW', tenSite: 'Soha' },
  { domain: 'afamily.vn', maSite: 'AFAMILY', tenSite: 'Afamily' },
  { domain: 'genk.vn', maSite: 'GENK', tenSite: 'GenK' },
  { domain: 'autopro.com.vn', maSite: 'AUTOPRO', tenSite: 'Autopro' },
  { domain: 'gamek.vn', maSite: 'GAMEK', tenSite: 'GameK' },
];

/**
 * extractSite(text, sites)
 * Tìm Site Nội Bộ xuất hiện trong text (ưu tiên tên dài hơn trước)
 * So khớp qua cả tenSite, maSite và domain
 */
export function extractSite(text: string, sites: SiteMaster[] = DEFAULT_INTERNAL_SITES): SiteMaster | null {
  if (!text || sites.length === 0) return null;
  const normInput = normalizeText(text);

  let bestSite: SiteMaster | null = null;
  let maxSiteLen = 0;

  for (const site of sites) {
    const candidateKeywords = [
      site.tenSite,
      site.maSite,
      (site as any).quyChuan,
      site.domain ? site.domain.replace(/\.(?:vn|com\.vn|com)$/i, '') : ''
    ].filter(Boolean);

    for (const kw of candidateKeywords) {
      const normKw = normalizeText(kw);
      if (!normKw) continue;

      if (isWordBoundaryMatch(normInput, normKw) || (normKw.length >= 4 && normInput.includes(normKw))) {
        if (normKw.length > maxSiteLen) {
          maxSiteLen = normKw.length;
          bestSite = site;
        }
      }
    }
  }

  return bestSite;
}

/**
 * isWordBoundaryMatch(text, keyword)
 * Kiểm tra keyword khớp ranh giới từ trong text
 */
export function isWordBoundaryMatch(text: string, keyword: string): boolean {
  if (!text || !keyword) return false;
  const normT = normalizeText(text);
  const normK = normalizeText(keyword);
  if (!normT || !normK) return false;
  if (normT === normK) return true;

  const escaped = normK.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, 'i');
  return regex.test(normT);
}

/**
 * 3. matchProductAdvanced(inputText, donViTinh, products, sites, learnedRules)
 * Thuật toán nhận diện 4 tầng:
 * - Tầng 0: Sổ tay Tự học (LearnedRules) từ thao tác kế toán viên đã từng sửa
 * - Tầng 1: Quy tắc kép có ĐVT (CPM/CPC)
 * - Tầng 2: Phân loại Tuyến bài vs Social (Site NB vs Mua ngoài)
 * - Tầng 3: So khớp từ khóa Master Data & Longest Match First
 */
export function matchProductAdvanced(
  inputText: string,
  donViTinh: string | undefined,
  products: ProductMaster[],
  sites: SiteMaster[] = [],
  learnedRules: LearnedRule[] = []
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

  if (!inputText || (products.length === 0 && learnedRules.length === 0)) {
    return result;
  }

  const normInput = normalizeText(inputText);

  // =========================================================================
  // TẦNG 0: BỘ NHỚ TỰ HỌC TỪ KẾ TOÁN (CORRECTION MEMORY) - ƯU TIÊN SỐ 1
  // =========================================================================
  if (learnedRules && learnedRules.length > 0) {
    for (const lr of learnedRules) {
      const pattern = lr.rawContentPattern || (lr as any).originalText || (lr as any).normalizedKey || '';
      const normLR = normalizeText(pattern);
      if (!normLR) continue;

      // Kiểm tra thêm điều kiện ĐVT nếu rule có chỉ định ĐVT
      if (lr.donViTinh && donViTinh) {
        const normDvtRule = normalizeText(lr.donViTinh);
        const normDvtInput = normalizeText(donViTinh);
        if (normDvtRule !== normDvtInput) continue;
      }

      if (normInput === normLR || (normLR.length >= 6 && normInput.includes(normLR))) {
        const syntheticProd: ProductMaster = {
          keyword: pattern,
          maVuViec: lr.maVuViec,
          tenSanPham: lr.tenSanPham,
          tkDoanhThu: lr.tkDoanhThu || '51133',
          thueSuat: lr.thueSuat !== undefined ? lr.thueSuat : '',
        };
        return {
          bestMatch: syntheticProd,
          candidates: [{ product: syntheticProd, score: 100, matchedKeyword: pattern }],
          confidenceScore: 100,
          status: 'OK',
          matchedKeyword: pattern,
          maVV: lr.maVuViec,
          tenSanPham: lr.tenSanPham,
          tkDoanhThu: lr.tkDoanhThu || '51133',
          thueSuat: lr.thueSuat !== undefined ? lr.thueSuat : '',
        };
      }
    }
  }

  // =========================================================================
  // TẦNG 1: QUY TẮC KÉP CÓ ĐƠN VỊ TÍNH (CPM / CPC)
  // =========================================================================
  const normDvt = donViTinh ? normalizeText(donViTinh) : '';
  if (normDvt) {
    const matchedCompoundRules: { product: ProductMaster; score: number }[] = [];

    for (const prod of products) {
      if (!prod.isCompoundRule || !prod.dvtRequired || !prod.contentKeyword) continue;

      const normReqDvt = (prod as any).__normDvtRequired || normalizeText(prod.dvtRequired);
      const normContentKw = (prod as any).__normContentKeyword || normalizeText(prod.contentKeyword);

      if (normDvt === normReqDvt && normContentKw && normInput.includes(normContentKw)) {
        matchedCompoundRules.push({
          product: prod,
          score: 100,
        });
      }
    }

    if (matchedCompoundRules.length > 0) {
      matchedCompoundRules.sort((a, b) => {
        const lenA = (a.product.contentKeyword || '').length;
        const lenB = (b.product.contentKeyword || '').length;
        return lenB - lenA;
      });

      const best = matchedCompoundRules[0];
      return {
        bestMatch: best.product,
        candidates: matchedCompoundRules.map(m => ({
          product: m.product,
          score: m.score,
          matchedKeyword: m.product.keyword,
        })),
        confidenceScore: 100,
        status: 'OK',
        matchedKeyword: best.product.keyword,
        maVV: best.product.maVuViec,
        tenSanPham: best.product.tenSanPham,
        tkDoanhThu: best.product.tkDoanhThu,
        thueSuat: best.product.thueSuat !== undefined ? best.product.thueSuat : '',
      };
    }
  }

  // =========================================================================
  // TẦNG 2: PHÂN LOẠI CHI PHÍ DỊCH VỤ / TUYẾN BÀI / SOCIAL (SITE NỘI BỘ VS MUA NGOÀI)
  // =========================================================================
  const CHI_PHI_REGEX = /(?:chi\s+phi\s+san\s+xuat|chi\s+phi\s+quan\s+tri|chi\s+phi\s+van\s+hanh|chi\s+phi\s+marketing|marketing\s+fee)/i;
  if (CHI_PHI_REGEX.test(normInput)) {
    const chiPhiProduct: ProductMaster = {
      keyword: 'Chi phí',
      maVuViec: 'CHI PHI',
      tenSanPham: 'Chi phí',
      tkDoanhThu: '51133',
      thueSuat: 8,
    };
    return {
      bestMatch: chiPhiProduct,
      candidates: [{ product: chiPhiProduct, score: 100, matchedKeyword: chiPhiProduct.keyword }],
      confidenceScore: 100,
      status: 'OK',
      matchedKeyword: chiPhiProduct.keyword,
      maVV: 'CHI PHI',
      tenSanPham: 'Chi phí',
      tkDoanhThu: '51133',
      thueSuat: 8,
    };
  }

  const SOCIAL_REGEX = /(?:fanpage|tiktok|seeding|sharelink|video\s+fanpage)/i;
  const isSocialSignal = SOCIAL_REGEX.test(normInput);

  const TUYEN_BAI_REGEX = /(?:tuyen\s+bai|advertorial|bai\s+pr|pr\s+bai|editorial\s+content)/i;
  const isTuyenBaiSignal = TUYEN_BAI_REGEX.test(normInput);

  // Danh sách nhận diện báo ngoài (kể cả không có đuôi .vn)
  const EXTERNAL_MEDIA_REGEX = /(?:thanhnien|thanh\s+nien|tuoitre|tuoi\s+tre|vietnamnet|eva\.vn|eva|znews|zing|elle|vnexpress|vn\s+express|dantri|dan\s+tri|vtv|dep\.com|dep|yeah1|schannel|beatvn|theanh28|hong\s+bien)/i;
  const hasExternalDomain = /\.(?:vn|com|net|org)\b/i.test(inputText) && !extractSite(inputText, sites);
  const isExternalMedia = EXTERNAL_MEDIA_REGEX.test(normInput) || hasExternalDomain;

  if (isTuyenBaiSignal) {
    // 1. Tuyến bài trên báo ngoài -> Bắt buộc là MUA NGOÀI
    if (isExternalMedia) {
      const muaNgoaiProduct: ProductMaster = {
        keyword: 'Tuyến bài mua ngoài báo chí',
        maVuViec: 'MUA NGOAI',
        tenSanPham: 'Mua ngoài',
        tkDoanhThu: '51133',
        thueSuat: 8,
      };
      return {
        bestMatch: muaNgoaiProduct,
        candidates: [{ product: muaNgoaiProduct, score: 100, matchedKeyword: muaNgoaiProduct.keyword }],
        confidenceScore: 100,
        status: 'OK',
        matchedKeyword: muaNgoaiProduct.keyword,
        maVV: 'MUA NGOAI',
        tenSanPham: 'Mua ngoài',
        tkDoanhThu: '51133',
        thueSuat: 8,
      };
    }
    // 2. Tuyến bài trên Site Nội bộ (Kenh14, Genk, Cafebiz, Soha, CafeF, Afamily...) -> Bắt buộc là TUYEN BAI
    const tuyenBaiProduct: ProductMaster = {
      keyword: 'Tuyến bài',
      maVuViec: 'TUYEN BAI',
      tenSanPham: 'Tuyến bài',
      tkDoanhThu: '51133',
      thueSuat: 8,
    };
    return {
      bestMatch: tuyenBaiProduct,
      candidates: [{ product: tuyenBaiProduct, score: 100, matchedKeyword: tuyenBaiProduct.keyword }],
      confidenceScore: 100,
      status: 'OK',
      matchedKeyword: tuyenBaiProduct.keyword,
      maVV: 'TUYEN BAI',
      tenSanPham: 'Tuyến bài',
      tkDoanhThu: '51133',
      thueSuat: 8,
    };
  }

  if (isSocialSignal) {
    const foundSite = extractSite(inputText, sites);

    if (foundSite) {
      // Fanpage/Tiktok thuộc Site Nội Bộ -> Gán mã Site quy chuẩn (K14, GENK, AFAMILY...)
      const siteCode = foundSite.maSite || (foundSite as any).quyChuan || '';
      const actionName = normInput.includes('tiktok') ? 'Đăng Tiktok' : 'Đăng fanpage';
      const syntheticProd: ProductMaster = {
        keyword: `${actionName} ${siteCode}`,
        maVuViec: siteCode,
        tenSanPham: actionName,
        tkDoanhThu: '51133',
        thueSuat: 8,
      };
      return {
        bestMatch: syntheticProd,
        candidates: [{ product: syntheticProd, score: 100, matchedKeyword: syntheticProd.keyword }],
        confidenceScore: 100,
        status: 'OK',
        matchedKeyword: syntheticProd.keyword,
        maVV: siteCode,
        tenSanPham: syntheticProd.tenSanPham,
        tkDoanhThu: syntheticProd.tkDoanhThu,
        thueSuat: syntheticProd.thueSuat,
      };
    } else {
      // Fanpage/Tiktok ngoài (Beatvn, Theanh28, Schannel...) -> MUA NGOÀI
      const muaNgoaiProduct: ProductMaster = {
        keyword: 'Social Mua ngoài',
        maVuViec: 'MUA NGOAI',
        tenSanPham: 'Mua ngoài',
        tkDoanhThu: '51133',
        thueSuat: 8,
      };
      return {
        bestMatch: muaNgoaiProduct,
        candidates: [{ product: muaNgoaiProduct, score: 100, matchedKeyword: muaNgoaiProduct.keyword }],
        confidenceScore: 100,
        status: 'OK',
        matchedKeyword: muaNgoaiProduct.keyword,
        maVV: 'MUA NGOAI',
        tenSanPham: 'Mua ngoài',
        tkDoanhThu: '51133',
        thueSuat: 8,
      };
    }
  }

  // =========================================================================
  // TẦNG 3: SO KHỚP TỪ KHÓA MASTER DATA & LONGEST MATCH FIRST
  // =========================================================================
  const candidates: CandidateMatch[] = [];

  for (const prod of products) {
    if (prod.isCompoundRule) continue;

    const normKW = (prod as any).__normKeyword || normalizeText(prod.keyword);
    if (!normKW) continue;

    let score = 0;

    // 1. So khớp từ ngắn (<= 4 ký tự) như PR, CPD, KOL, KOC, TVC, iTVC, AdX: Dùng Word Boundary
    if (normKW.length <= 4) {
      if (normInput === normKW) {
        score = 100;
      } else if (isWordBoundaryMatch(normInput, normKW)) {
        score = 95;
      } else {
        score = 0;
      }
    }
    // 2. So khớp exact
    else if (normInput === normKW) {
      score = 100;
    }
    // 3. Substring match: Keyword nằm trọn vẹn trong diễn giải
    else if (normInput.includes(normKW)) {
      const coverageRatio = normKW.length / normInput.length;
      score = Math.round(80 + 15 * coverageRatio);
    }
    // 4. Từ khóa ngược: Diễn giải nằm trong keyword
    else if (normKW.includes(normInput)) {
      const coverageRatio = normInput.length / normKW.length;
      score = Math.round(70 + 9 * coverageRatio);
    }
    // 5. Word overlap
    else {
      const overlapScore = calculateWordOverlap(normInput, normKW);
      if (overlapScore > 0) {
        score = Math.round(40 + (overlapScore * 25) / 100);
      }
    }

    // Dìm hạng từ khóa chung (broad fallback)
    if (prod.isBroadFallback && score > 0) {
      score = Math.min(score, 60);
    }

    // Đặc biệt: Nếu diễn giải chứa "chi phi marketing" hoặc "marketing fee", ưu tiên mã CHI PHI
    if ((normInput.includes('chi phi marketing') || normInput.includes('marketing fee')) && prod.maVuViec === 'CHI PHI') {
      score = Math.max(score, 90);
    }

    if (score >= 40) {
      candidates.push({
        product: prod,
        score,
        matchedKeyword: prod.keyword,
      });
    }
  }

  candidates.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const aBroad = a.product.isBroadFallback ? 1 : 0;
    const bBroad = b.product.isBroadFallback ? 1 : 0;
    if (aBroad !== bBroad) {
      return aBroad - bBroad;
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

    const hasCompetitor = candidates.length > 1 &&
      (best.score - candidates[1].score < 6) &&
      (candidates[1].product.maVuViec !== best.product.maVuViec);

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
 * 4. keywordMatch(inputText, productMaster)
 * Backward compatible wrapper gọi matchProductAdvanced.
 */
export function keywordMatch(
  inputText: string,
  productMaster: ProductMaster[]
): KeywordMatchResult {
  return matchProductAdvanced(inputText, '', productMaster, [], []);
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
 * Tách dòng và lấy nội dung diễn giải từ ô "Nội dung quảng cáo":
 * 1. Nếu có cả "Loại quảng cáo:" và "Loại sản phẩm:" (hoặc Loại sp/SP) -> nối thành: `Loại quảng cáo - Loại sản phẩm`
 * 2. Nếu chỉ có "Loại quảng cáo:" -> lấy `Loại quảng cáo`
 * 3. Nếu không có "Loại quảng cáo:" -> chuyển toàn bộ Char(10) (xuống dòng) thành dấu nối ` - `
 */
export function extractSunContentDetail(rawContent: any): string {
  if (!rawContent) return '';
  const text = String(rawContent);
  const lines = text.split(/[\r\n]+/);

  let loaiQc = '';
  let loaiSp = '';

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Nhận diện dòng "Loại quảng cáo :"
    const qcMatch = trimmed.match(/^loại\s*quảng\s*cáo\s*:\s*(.+)$/i);
    if (qcMatch && qcMatch[1]) {
      loaiQc = qcMatch[1].trim();
      continue;
    }

    // Nhận diện dòng "Loại sản phẩm :" hoặc "Loại sp :" / "Loại SP :"
    const spMatch = trimmed.match(/^loại\s*(?:sản\s*phẩm|sp)\s*:\s*(.+)$/i);
    if (spMatch && spMatch[1]) {
      loaiSp = spMatch[1].trim();
      continue;
    }
  }

  // Trường hợp 1: Có cả Loại quảng cáo và Loại sản phẩm -> Nối `Loại quảng cáo - Loại sản phẩm`
  if (loaiQc && loaiSp) {
    return `${loaiQc} - ${loaiSp}`;
  }

  // Trường hợp 2: Chỉ có Loại quảng cáo -> Lấy Loại quảng cáo
  if (loaiQc) {
    return loaiQc;
  }

  // Trường hợp 3: Không có Loại quảng cáo -> Thay toàn bộ Char(10) thành dấu nối (-)
  return sanitizeNewlinesToDash(text);
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

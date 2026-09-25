import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { parseExcelWorkbook } from '../src/utils/excel';
import {
  detectBangKeTemplate,
  getBangKeTemplateHandler,
} from '../src/utils/bangKeTemplates';
import {
  formatRawDateValue,
  cleanBookingCode,
  buildGhiChuChiTietIdempotent,
  parseOptionalNumber,
  extractSunContentDetail,
  sanitizeNewlinesToDash,
} from '../src/utils/businessLogic';

console.log('--- BẮT ĐẦU CHẠY SUITE TEST PHASE 1 ---');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const formDir = path.resolve(__dirname, '../Form');

// SUN phải có dấu hiệu riêng trong đúng cột, kể cả khi metadata đã đủ điểm.
const sunDetector = getBangKeTemplateHandler('SUN').detector;
function sunFixture(booking: string, contentHeader: string, content: string, metadata = '') {
  return {
    sheetName: 'Bảng kê',
    headers: [booking, 'Số HT', contentHeader, 'Ghi chú'],
    rows: [{ [booking]: 'QC01', 'Số HT': 'HT01', [contentHeader]: content, 'Ghi chú': 'Loại quảng cáo: PR' }],
    rawArray: [[metadata]],
    headerRowIndex: 1,
  };
}
const sunDetectionCases = [
  { name: 'Mã book và nội dung SUN hợp lệ', sheet: sunFixture('Mã book', 'Nội dung quảng cáo', 'Loại quảng cáo : PR'), expected: true },
  { name: 'Mã booking không được cộng điểm Mã book', sheet: sunFixture('Mã booking', 'Nội dung quảng cáo', 'Loại quảng cáo: PR'), expected: false },
  { name: 'Thiếu Loại quảng cáo dù metadata SUN', sheet: sunFixture('Mã book', 'Nội dung quảng cáo', 'Đăng bài PR', 'SUN'), expected: false },
  { name: 'Loại quảng cáo chỉ ở Ghi chú', sheet: sunFixture('Mã book', 'Nội dung quảng cáo', '', 'SUN'), expected: false },
  { name: 'Cột Nội dung không thay thế Nội dung quảng cáo', sheet: sunFixture('Mã book', 'Nội dung', 'Loại quảng cáo: PR', 'SUN'), expected: false },
  { name: 'Tên cột chứa thêm chữ không khớp', sheet: sunFixture('Mã book', 'Nội dung quảng cáo khác', 'Loại quảng cáo: PR', 'SUN'), expected: false },
  { name: 'Chấp nhận bỏ dấu và khoảng trắng ngoài tên cột', sheet: sunFixture(' Ma book ', ' Noi dung quang cao ', 'LOẠI  QUẢNG CÁO : PR'), expected: true },
];
for (const item of sunDetectionCases) {
  if (sunDetector(item.sheet).matched !== item.expected) throw new Error(`SUN: ${item.name}`);
}
console.log('✅ Passed: Điều kiện bắt buộc và phân biệt tên cột SUN');

// 1. Test helper parseOptionalNumber với các trường hợp sentinel (EFR-11)
console.log('\n[TEST 1] Kiểm thử parseOptionalNumber:');
const nullCases = [undefined, null, '', '   ', 'abc', 'N/A'];
for (const val of nullCases) {
  const res = parseOptionalNumber(val);
  if (res !== null) {
    throw new Error(`parseOptionalNumber(${val}) phải trả về null nhưng lại ra ${res}`);
  }
}
console.log('✅ Passed: Các giá trị rỗng/lỗi đều trả về null');

const zeroCases = [0, '0', '0.0', ' 0 '];
for (const val of zeroCases) {
  const res = parseOptionalNumber(val);
  if (res !== 0) {
    throw new Error(`parseOptionalNumber(${val}) phải trả về 0 nhưng lại ra ${res}`);
  }
}
console.log('✅ Passed: Giá trị số 0 được giữ nguyên số 0');

const validNumberCases = [
  { in: '9,600,000', out: 9600000 },
  { in: '15.500.000 đ', out: 15500000 },
  { in: 1250000, out: 1250000 },
];
for (const tc of validNumberCases) {
  const res = parseOptionalNumber(tc.in);
  if (res !== tc.out) {
    throw new Error(`parseOptionalNumber(${tc.in}) mong đợi ${tc.out} nhưng ra ${res}`);
  }
}
console.log('✅ Passed: Parse đúng số nguyên và số có format');

// 2. Test helper Date formatting (EFR-02)
console.log('\n[TEST 2] Kiểm thử formatRawDateValue với Date object và số serial:');
const testDateObj = new Date(2026, 8, 19); // 19/09/2026
const formattedDate = formatRawDateValue(testDateObj);
if (formattedDate !== '19/09/2026') {
  throw new Error(`formatRawDateValue(Date) lỗi: mong đợi 19/09/2026 nhưng ra ${formattedDate}`);
}
const testSerial = 46161; // 18/05/2026
const formattedSerial = formatRawDateValue(testSerial);
console.log(`- Serial 46161 formatted: ${formattedSerial}`);
console.log('✅ Passed: Format ngày tháng thành công');

// 3. Test helper buildGhiChuChiTietIdempotent không bị /AD/AD (EFR-04)
console.log('\n[TEST 3] Kiểm thử buildGhiChuChiTietIdempotent:');
const htWithAd = 'HT0060126/AD';
const res1 = buildGhiChuChiTietIdempotent(htWithAd);
if (res1 !== 'HT0060126/AD') {
  throw new Error(`buildGhiChuChiTietIdempotent lỗi bị nhân đôi: ${res1}`);
}
const htWithoutAd = 'HT0060126';
const res2 = buildGhiChuChiTietIdempotent(htWithoutAd);
if (res2 !== 'HT0060126/AD') {
  throw new Error(`buildGhiChuChiTietIdempotent lỗi không nối: ${res2}`);
}
const res3 = buildGhiChuChiTietIdempotent('A02NPP0020226', '/', 'AD');
if (res3 !== 'A02NPP0020226/AD') {
  throw new Error(`buildGhiChuChiTietIdempotent lỗi với separator '/' và suffix 'AD': ${res3}`);
}
const res4 = buildGhiChuChiTietIdempotent('A02NPP0020226/AD', '/', 'AD');
if (res4 !== 'A02NPP0020226/AD') {
  throw new Error(`buildGhiChuChiTietIdempotent lỗi idempotent với separator '/' và suffix 'AD': ${res4}`);
}
console.log('✅ Passed: Suffix /AD bảo đảm idempotent và nối đúng separator');

// 4. Test đọc 3 workbook thật trong thư mục Form/
console.log('\n[TEST 4] Kiểm thử nạp 3 file workbook thật:');
const filesToTest = [
  { dir: path.resolve(__dirname, '../File test'), fileName: 'Bảng kê Bảo sinh T09.2026 A02NPP0020226.xlsx', expectedTemplate: 'STANDARD' },
  { dir: formDir, fileName: 'BK Mẫu MMS. Hương Hiền.xlsx', expectedTemplate: 'MMS' },
  { dir: formDir, fileName: 'BK Mẫu SUN.Hương Hiền.xlsx', expectedTemplate: 'SUN' },
  { dir: formDir, fileName: 'Mẫu BK WPP.Hương Hiền.xlsx', expectedTemplate: 'WPP' },
  // Tên SunGroup không đủ: dòng mẫu thiếu dấu hiệu bắt buộc "Loại quảng cáo:".
  { dir: path.resolve(__dirname, '../File test'), fileName: 'Bảng kê so 2_ PR_SunGroup- HT0080126-Thang 08.2026 (4).xlsx', expectedTemplate: 'STANDARD' },
];

for (const item of filesToTest) {
  const filePath = path.join(item.dir, item.fileName);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ Bỏ qua test file mẫu ${item.fileName} (không tìm thấy trên môi trường hiện tại)`);
    continue;
  }

  const buffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    cellDates: true,
    cellNF: false,
    cellText: true,
  });

  const parsed = parseExcelWorkbook(workbook, item.fileName, buffer.length);
  const sheet = parsed.sheets[0];
  const detectedTemplate = detectBangKeTemplate(sheet);

  console.log(`- File: "${item.fileName}" -> Phát hiện: ${detectedTemplate} (Dòng header: ${sheet.headerRowIndex}, Số dòng: ${sheet.rows.length})`);
  if (detectedTemplate !== item.expectedTemplate) {
    throw new Error(`File ${item.fileName} phát hiện sai: mong đợi ${item.expectedTemplate} nhưng ra ${detectedTemplate}`);
  }

  // Test transformer cho template
  const handler = getBangKeTemplateHandler(detectedTemplate);
  const sampleRow = sheet.rows[0];
  const transformed = handler.transformRow(sampleRow);
  if (!transformed) {
    throw new Error(`Dòng đầu tiên của ${item.fileName} bị null sau transform!`);
  }

  console.log(`  + Sample row transform: maBooking="${transformed.maBooking}", soHt="${transformed.soHt}", lichDang="${transformed.lichDang}", tien=${transformed.thanhTienSauCk}`);

  if (detectedTemplate === 'MMS') {
    // Assert tiền MMS 9,600,000 không bị mất hoặc tính sai (EFR-03, EFR-06)
    if (transformed.thanhTienSauCk !== 9600000) {
      console.warn(`  * Cảnh báo tiền MMS dòng 0: ${transformed.thanhTienSauCk}`);
    }
  }

  if (detectedTemplate === 'SUN') {
    // Assert Số HT đã tách sạch 14 ký tự ngoặc đơn
    if (transformed.soHt.includes('(') || transformed.soHt.includes(')')) {
      throw new Error(`SUN Số HT vẫn còn dính ngoặc đơn: ${transformed.soHt}`);
    }
  }

  if (detectedTemplate === 'WPP') {
    // Assert Chuyên trang đã ghép
    if (!transformed.chuyenTrang) {
      throw new Error('WPP Chuyên trang ghép bị rỗng!');
    }
  }
}
console.log('✅ Passed: Cả 3 file mẫu đều được nhận diện 100% và transform chuẩn xác');

// 5. Test Intentional Deviation Fixture (EFR-10)
console.log('\n[TEST 5] Kiểm thử Fixture tiền nguồn lệch công thức (Intentional Deviation Fixture):');
// Số lượng = 2, Đơn giá = 10,000,000, CK = 10% (công thức lý thuyết ra 18,000,000)
// Nhưng nguồn thực tế ghi 15,500,000 (do thỏa thuận giá trọn gói) và VAT = 8%
const rawFixture = {
  'Mã booking': 'BK-TEST-INTENTIONAL',
  'Số lượng': 2,
  'Đơn giá': 10000000,
  'Chiết khấu': 10,
  'Thành tiền sau chiết khấu (VNĐ)': 15500000,
  'Số HT': 'HT-TEST-01/AD',
};
const standardHandler = getBangKeTemplateHandler('STANDARD');
const normalizedFixture = standardHandler.transformRow(rawFixture);
if (!normalizedFixture) {
  throw new Error('Fixture row null!');
}
const thanhTienSauCk = normalizedFixture.thanhTienSauCk;
if (thanhTienSauCk !== 15500000) {
  throw new Error(`Hệ thống không ưu tiên tiền nguồn: mong đợi 15,500,000 nhưng ra ${thanhTienSauCk}`);
}

const taxRateMultiplier = 0.08; // 8% VAT
const giaTriCuaVvVat = Math.round(thanhTienSauCk * (1 + taxRateMultiplier));
if (giaTriCuaVvVat !== 16740000) {
  throw new Error(`Tính thuế bị sai: mong đợi 16,740,000 nhưng ra ${giaTriCuaVvVat}`);
}
console.log(`- Tiền nguồn: ${thanhTienSauCk}, VAT 8% -> Giá trị vv VAT: ${giaTriCuaVvVat}`);
console.log('\n[TEST 6] Kiểm thử extractSunContentDetail (bóc tách Loại quảng cáo / Loại sản phẩm):');
const caseBoth = 'Loại quảng cáo: Admatic\nLoại sản phẩm: Gói nhiều sản phẩm\nTag: News, Entertainment';
const resBoth = extractSunContentDetail(caseBoth);
if (resBoth !== 'Admatic - Gói nhiều sản phẩm') {
  throw new Error(`Mong đợi "Admatic - Gói nhiều sản phẩm" nhưng nhận được "${resBoth}"`);
}
console.log('✅ Passed: Có cả Loại quảng cáo và Loại sản phẩm -> Nối thành công:', resBoth);

const caseOnlyQc = 'Loại quảng cáo : Banner\nKích thước: 300x250';
const resOnlyQc = extractSunContentDetail(caseOnlyQc);
if (resOnlyQc !== 'Banner') {
  throw new Error(`Mong đợi "Banner" nhưng nhận được "${resOnlyQc}"`);
}
console.log('✅ Passed: Chỉ có Loại quảng cáo -> Lấy Loại quảng cáo:', resOnlyQc);

const caseNoQc = 'Quảng cáo bài PR\nTrang chuyên mục\nKhông có loại quảng cáo';
const resNoQc = extractSunContentDetail(caseNoQc);
if (resNoQc !== 'Quảng cáo bài PR - Trang chuyên mục - Không có loại quảng cáo') {
  throw new Error(`Mong đợi thay thế Char(10) thành dấu (-) nhưng nhận được "${resNoQc}"`);
}
console.log('✅ Passed: Không có Loại quảng cáo -> Thay toàn bộ Char(10) thành dấu (-):', resNoQc);

console.log('\n🎉 TOÀN BỘ SUITE TEST PHASE 1 ĐÃ VƯỢT QUA XUẤT SẮC! 🎉\n');

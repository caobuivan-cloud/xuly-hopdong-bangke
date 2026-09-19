import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { parseExcelWorkbook } from '../src/utils/excel';
import {
  detectBangKeTemplate,
  getBangKeTemplateHandler,
} from '../src/utils/bangKeTemplates';
import { buildFastImportRows, filterFastImportEligibleRows } from '../src/utils/fastImport';
import {
  formatRawDateValue,
  cleanBookingCode,
  buildGhiChuChiTietIdempotent,
  parseContractDateFromBooking,
  parsePostingDateRange,
  parseOptionalNumber,
} from '../src/utils/businessLogic';

console.log('--- BẮT ĐẦU CHẠY SUITE TEST TỔNG HỢP PHASE 2 & 3 (FAST EXPORT & PIPELINE) ---');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const formDir = path.resolve(__dirname, '../Form');

const filesToTest = [
  { fileName: 'BK Mẫu MMS. Hương Hiền.xlsx', templateId: 'MMS' },
  { fileName: 'BK Mẫu SUN.Hương Hiền.xlsx', templateId: 'SUN' },
  { fileName: 'Mẫu BK WPP.Hương Hiền.xlsx', templateId: 'WPP' },
];

for (const item of filesToTest) {
  const filePath = path.join(formDir, item.fileName);
  const buffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    cellDates: true,
    cellNF: false,
    cellText: true,
  });

  const parsed = parseExcelWorkbook(workbook, item.fileName, buffer.length);
  const sheet = parsed.sheets[0];
  const detectedId = detectBangKeTemplate(sheet);
  const handler = getBangKeTemplateHandler(detectedId as any);

  console.log(`\nTesting pipeline for file "${item.fileName}" (Template: ${detectedId}):`);

  // Transform 5 dòng mẫu
  const sampleRows: any[] = [];
  for (let i = 0; i < Math.min(sheet.rows.length, 5); i++) {
    const raw = sheet.rows[i];
    const transformed = handler.transformRow(raw);
    if (!transformed) continue;

    // Giả lập mapped row giống BangKeView
    const maBooking = transformed.maBooking;
    const soHt = transformed.soHt;
    const parsedDates = parsePostingDateRange(transformed.lichDang);
    const formatDate = (d: Date | null) => d ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` : '';
    const parsedContract = parseContractDateFromBooking(maBooking);

    const taxRate = 0.08; // 8% VAT
    const thanhTien = transformed.thanhTienSauCk || 0;
    const vat = Math.round(thanhTien * (1 + taxRate));

    sampleRows.push({
      maBooking,
      soHt,
      maHopDong: `${maBooking}AD`,
      tenHopDong: `${maBooking}/AD`,
      bangKe: maBooking,
      maKhach: 'KH_TEST',
      boPhanThucHien: 'BP_TEST',
      ngayBatDau: formatDate(parsedDates.startDate),
      ngayKetThuc: formatDate(parsedDates.endDate),
      ngayHopDong: parsedContract.text || '01/01/2026',
      maVv: 'VV_TEST',
      soLuong: transformed.soLuong || 1,
      donGia: transformed.donGia || thanhTien,
      thueSuat: 8,
      thanhTienSauCk: thanhTien,
      giaTriCuaVvVat: vat,
      tkDoanhThu: '5111',
      tyLeCk: transformed.chietKhau || 0,
      chuyenTrang: transformed.chuyenTrang,
      ghiChuChiTiet: buildGhiChuChiTietIdempotent(soHt, '/', 'AD'),
      sanPhamImport: transformed.lookupContent || 'SP_TEST',
    });
  }

  // Gọi buildFastImportRows
  const fastRows = buildFastImportRows(sampleRows, { status: 1, sttMode: 'blank' });
  if (fastRows.length === 0) {
    throw new Error(`File ${item.fileName} không sinh được dòng FAST nào!`);
  }

  const firstFast = fastRows[0];
  console.log(`  + Dòng FAST mẫu:`);
  console.log(`    - Mã HĐ: ${firstFast['Mã hợp đồng']}`);
  console.log(`    - Tên HĐ: ${firstFast['Tên hợp đồng']}`);
  console.log(`    - Giá trị của vv VAT: ${firstFast['Giá trị của vv VAT']}`);
  console.log(`    - Chuyên trang: ${firstFast['Chuyên trang']}`);
  console.log(`    - Ghi chú chi tiết: ${firstFast['Ghi chú chi tiết']}`);
  console.log(`    - Status: ${firstFast['Status']}`);

  // Assert không có /AD/AD
  if (String(firstFast['Ghi chú chi tiết']).includes('/AD/AD')) {
    throw new Error(`Ghi chú chi tiết bị nhân đôi /AD/AD: ${firstFast['Ghi chú chi tiết']}`);
  }

  // Test lọc dòng đủ điều kiện hạch toán
  const eligible = filterFastImportEligibleRows(sampleRows);
  console.log(`  + Dòng đủ điều kiện hạch toán FAST: ${eligible.length}/${sampleRows.length}`);
}

console.log('\n🎉 TOÀN BỘ SUITE TEST FAST EXPORT CHO 3 MẪU ĐÃ PASS 100%! 🎉\n');

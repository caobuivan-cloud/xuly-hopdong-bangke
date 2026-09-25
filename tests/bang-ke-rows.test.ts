import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';
import { parseExcelWorkbook } from '../src/utils/excel';
import { fillBangKeVerticalMerges, selectBangKeDetailRows } from '../src/utils/bangKeRows';

for (const header of ['Mã book', 'Mã booking']) {
  const rows = [
    { STT: '', [header]: 'QC01', __rowNum__: 12 },
    { STT: 2, [header]: 'QC00', __rowNum__: 13 },
    { STT: 'Tổng', [header]: 'QC02', __rowNum__: 14 },
    { STT: 4, [header]: 'QC03', __rowNum__: 15 },
    { STT: 5, [header]: 'QC04', __rowNum__: 16 },
  ];
  assert.deepEqual(selectBangKeDetailRows(rows, [], 11, header), rows);
  assert.deepEqual(selectBangKeDetailRows([rows[0], rows[2]], [], 11, header), [rows[0]]);
  for (const blank of ['', '  ', null, undefined]) {
    const withBlank = rows.map((r, i) => i === 1 ? { ...r, [header]: blank } : r);
    assert.deepEqual(selectBangKeDetailRows(withBlank, [], 11, header), [rows[0]]);
  }
  for (const endColumn of [2, 12]) {
    const merges = [{ s: { r: 15, c: 0 }, e: { r: 15, c: endColumn } }];
    assert.deepEqual(selectBangKeDetailRows(rows, merges, 11, header), rows.slice(0, 3));
  }
  // A:B, B:D, và gộp dọc cột A không phải điểm kết thúc bảng.
  for (const merge of [
    { s: { r: 12, c: 0 }, e: { r: 12, c: 1 } },
    { s: { r: 12, c: 1 }, e: { r: 12, c: 3 } },
    { s: { r: 12, c: 0 }, e: { r: 17, c: 0 } },
  ]) assert.equal(selectBangKeDetailRows(rows, [merge], 11, header).length, 5);
}

for (const bookingHeader of ['Mã book', 'Mã booking']) {
  const headers = ['STT', bookingHeader, 'Số HT', 'Thành tiền'];
  const source = [
    { STT: 1, [bookingHeader]: 'QC01', 'Số HT': 'HT01', 'Thành tiền': 0, __rowNum__: 12 },
    // Dòng Excel 14 hoàn toàn trống được sheet_to_json bỏ qua.
    { STT: 3, [bookingHeader]: '', 'Số HT': '', 'Thành tiền': '', __rowNum__: 14 },
    { STT: 4, [bookingHeader]: '', 'Số HT': '', 'Thành tiền': '', __rowNum__: 15 },
    { STT: 5, [bookingHeader]: 'QC02', 'Số HT': '', 'Thành tiền': '', __rowNum__: 16 },
  ];
  const snapshot = JSON.stringify(source);
  const merges = [1, 2, 3].map(c => ({ s: { r: 12, c }, e: { r: 14, c } }));
  const filled = fillBangKeVerticalMerges(source, merges, 11, headers);
  assert.equal(filled.length, 5);
  for (const row of filled.slice(0, 3)) {
    assert.equal(row[bookingHeader], 'QC01');
    assert.equal(row['Số HT'], 'HT01');
    assert.equal(row['Thành tiền'], 0);
  }
  assert.equal(filled[1].__cells[1], 'QC01');
  assert.equal(filled[2].__cells[1], 'QC01');
  assert.equal(filled[3][bookingHeader], '');
  assert.equal(selectBangKeDetailRows(filled, merges, 11, bookingHeader).length, 3);
  assert.equal(JSON.stringify(source), snapshot);
  const stopMerge = { s: { r: 14, c: 0 }, e: { r: 15, c: 2 } };
  assert.equal(selectBangKeDetailRows(filled, [...merges, stopMerge], 11, bookingHeader).length, 2);
}
console.log('PASS: điền merge dọc cột B và các cột khác, giữ số 0, không điền ngoài merge.');

const fixture = path.resolve('File test/Bảng kê Bảo sinh T09.2026 A02NPP0020226.xlsx');
if (fs.existsSync(fixture)) {
  const workbook = XLSX.read(fs.readFileSync(fixture), { type: 'buffer', cellDates: true, cellNF: false, cellText: true });
  const sheet = parseExcelWorkbook(workbook).sheets[0];
  const headerIndex = sheet.headerRowIndex!;
  const prepared = fillBangKeVerticalMerges(sheet.rows, sheet.merges || [], headerIndex, sheet.headers);
  const rows = selectBangKeDetailRows(prepared, sheet.merges || [], headerIndex, sheet.headers[1]);
  assert.equal(rows.length, 75);
  assert.deepEqual(rows.slice(-8).map(r => r.__rowNum__ + 1), [80, 81, 82, 83, 84, 85, 86, 87]);
  const moneyHeader = sheet.headers[11];
  assert.equal(rows.reduce((sum, r) => sum + Number(r[moneyHeader]), 0), 683800000);
  console.log('PASS: Bảo sinh có đủ 75 dòng, tổng tiền 683.800.000 đồng.');
} else {
  console.log('SKIP: File Bảo sinh không có trong checkout này.');
}
console.log('PASS: nhận diện cột B và ranh giới ô gộp A:C trở lên.');

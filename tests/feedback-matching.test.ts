import xlsx from "xlsx";
import { parseCompoundRules, matchProductAdvanced, DEFAULT_INTERNAL_SITES } from "../src/utils/businessLogic";
import { ProductMaster, SiteMaster, LearnedRule } from "../src/types";

// 1. Load Master Products
const masterWb = xlsx.readFile("./File test/Chuẩn hóa mã Hương Hiền.xlsx");
const prodRaw = xlsx.utils.sheet_to_json(masterWb.Sheets["CH VV SP"], { header: 1 });
const products: ProductMaster[] = prodRaw.slice(1).filter((r: any) => r[0] && r[1] && r[2]).map((r: any) => ({
  keyword: String(r[0]).trim(),
  maVuViec: String(r[1]).trim(),
  tenSanPham: String(r[2]).trim(),
  tkDoanhThu: String(r[3] || "").trim()
}));
const parsedProducts = parseCompoundRules(products);

// 2. Load Sites
const sites: SiteMaster[] = DEFAULT_INTERNAL_SITES;

// 3. Load Test Rows from import_hop_dong_cu_2026-09-21-loi.xlsx
const testWb = xlsx.readFile("File test/import_hop_dong_cu_2026-09-21-loi.xlsx");
const testSheet = testWb.Sheets[testWb.SheetNames[0]];
const testRows: any[] = xlsx.utils.sheet_to_json(testSheet, { header: 1 });

let correct = 0;
let total = 0;
const failures: any[] = [];

for (let i = 1; i < testRows.length; i++) {
  const row = testRows[i];
  if (!row || row.length === 0) continue;
  const chuyenTrang = String(row[28] || "").trim(); // Col 28: Chuyen trang
  const expectedMa = String(row[19] || row[20] || "").trim(); // Col 19 if not empty, else Col 20
  
  if (!chuyenTrang && !expectedMa) continue;
  total++;

  const res = matchProductAdvanced(
    chuyenTrang,
    undefined,
    parsedProducts,
    sites,
    []
  );

  const matchedMa = res.maVV || '';
  if (matchedMa.toUpperCase() === expectedMa.toUpperCase()) {
    correct++;
  } else {
    failures.push({
      rowIdx: i + 1,
      chuyenTrang,
      expected: expectedMa,
      actual: matchedMa,
      status: res.status,
      score: res.confidenceScore
    });
  }
}

console.log(`\n=== KẾT QUẢ TEST PHASE 1 MATCHING LOGIC (MẶC ĐỊNH) ===`);
console.log(`Tổng số dòng test: ${total}`);
console.log(`Số dòng khớp đúng: ${correct} / ${total} (${((correct/total)*100).toFixed(1)}%)`);
console.log(`Số dòng chưa khớp: ${failures.length}`);

if (failures.length > 0) {
  console.log("\nChi tiết các dòng chưa khớp theo quy tắc mặc định:");
  failures.forEach(f => {
    console.log(`Row ${f.rowIdx} | Expected: [${f.expected}] vs Actual: [${f.actual}] (${f.status}, score=${f.score}) | ChuyenTrang: "${f.chuyenTrang}"`);
  });
}

// BƯỚC THỬ NGHIỆM FEEDBACK-DRIVEN LEARNING:
// Giả lập kế toán sửa dòng Row 31 thành "TUYEN BAI" và xuất file -> Hệ thống lưu 1 LearnedRule
const mockLearnedRules: LearnedRule[] = [
  {
    id: "lr_test_01",
    rawContentPattern: "Social Media - Đăng fanpage - Fanpage K14",
    maVuViec: "TUYEN BAI",
    tenSanPham: "Tuyến bài",
    tkDoanhThu: "51133",
    useCount: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userNote: "Kế toán chốt đưa Fanpage K14 hợp đồng này về Tuyến bài"
  }
];

let correctAfterLearning = 0;
for (let i = 1; i < testRows.length; i++) {
  const row = testRows[i];
  if (!row || row.length === 0) continue;
  const chuyenTrang = String(row[28] || "").trim();
  const expectedMa = String(row[19] || row[20] || "").trim();
  if (!chuyenTrang && !expectedMa) continue;

  const res = matchProductAdvanced(
    chuyenTrang,
    undefined,
    parsedProducts,
    sites,
    mockLearnedRules
  );

  const matchedMa = res.maVV || '';
  if (matchedMa.toUpperCase() === expectedMa.toUpperCase()) {
    correctAfterLearning++;
  }
}

console.log(`\n=== KẾT QUẢ SAU KHI HỆ THỐNG HỌC 1 GÓP Ý TỪ KẾ TOÁN (FEEDBACK-DRIVEN LEARNING) ===`);
console.log(`Số dòng khớp đúng: ${correctAfterLearning} / ${total} (${((correctAfterLearning/total)*100).toFixed(1)}%)`);

// In ra các dòng còn lệch nếu có
for (let i = 1; i < testRows.length; i++) {
  const row = testRows[i];
  if (!row || row.length === 0) continue;
  const chuyenTrang = String(row[28] || "").trim();
  const expectedMa = String(row[19] || row[20] || "").trim();
  if (!chuyenTrang && !expectedMa) continue;

  const res = matchProductAdvanced(
    chuyenTrang,
    undefined,
    parsedProducts,
    sites,
    mockLearnedRules
  );

  const matchedMa = res.maVV || '';
  if (matchedMa.toUpperCase() !== expectedMa.toUpperCase()) {
    console.log(`Còn lại: Row ${i + 1} | Expected: [${expectedMa}] vs Actual: [${matchedMa}] | ChuyenTrang: "${chuyenTrang}"`);
  }
}

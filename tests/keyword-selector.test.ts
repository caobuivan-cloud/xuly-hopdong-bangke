import { extractCandidateKeywords, matchProductAdvanced } from '../src/utils/businessLogic';
import { LearnedRule, ProductMaster } from '../src/types';

console.log('=== TEST TÍNH NĂNG CHỌN TỪ KHÓA MÁY HỌC (KEYWORD ATTRIBUTION) ===\n');

// 1. Kiểm thử extractCandidateKeywords
const sampleText = 'Social Media - Đăng fanpage - Fanpage K14';
const candidates = extractCandidateKeywords(sampleText);
console.log('Input:', sampleText);
console.log('Bóc tách Tag Pills:', candidates);

if (
  candidates.includes('Social Media') &&
  candidates.includes('Đăng fanpage') &&
  candidates.includes('Fanpage K14')
) {
  console.log('✅ Test 1 Passed: Bóc tách chính xác các cụm từ Tag Pills!');
} else {
  console.error('❌ Test 1 Failed!');
  process.exit(1);
}

// 2. Kiểm thử so khớp với LearnedRule có chọn Keyword
const learnedRuleWithKw: LearnedRule = {
  id: 'rule_test_kw',
  rawContentPattern: 'Social Media - Đăng fanpage - Fanpage K14',
  keyword: 'Đăng fanpage', // Kế toán chọn tag này
  maVuViec: 'TUYEN BAI',
  tenSanPham: 'Đăng fanpage',
  tkDoanhThu: '51133',
  updatedAt: new Date().toISOString()
};

const testVariations = [
  'Social Media - Đăng fanpage - Fanpage K14',
  'Social Media - Đăng fanpage - Fanpage K14 (Gói đặc biệt)',
  'Kênh 14 - Đăng fanpage - Post trưa',
  'Quảng cáo video - Đăng fanpage'
];

console.log('\n--- Kiểm tra khả năng tổng quát hóa của máy học khi có Keyword: "Đăng fanpage" ---');
let allPassed = true;
for (const text of testVariations) {
  const result = matchProductAdvanced(text, undefined, [], [], [learnedRuleWithKw]);

  const isMatched = result.maVV === 'TUYEN BAI';
  console.log(`- "${text}" -> MaVV: [${result.maVV}] (Score: ${result.confidenceScore}%) => ${isMatched ? '✅ Khớp đúng' : '❌ Lệch'}`);
  if (!isMatched) allPassed = false;
}

// 3. Kiểm thử so khớp với LearnedRule có chọn NHIỀU KEYWORDS (Compound AND)
console.log('\n--- Kiểm tra khả năng kết hợp NHIỀU từ khóa: ["Admatic", "Gói VIP"] ---');
const learnedRuleWithMultiKw: LearnedRule = {
  id: 'rule_test_multi_kw',
  rawContentPattern: 'Admatic - Gói VIP - Chiết khấu đặc biệt',
  keywords: ['Admatic', 'Gói VIP'], // Kế toán chọn 2 tags
  maVuViec: 'GOI_VIP',
  tenSanPham: 'Sản phẩm VIP',
  tkDoanhThu: '51133',
  updatedAt: new Date().toISOString()
};

const multiKwTests = [
  { text: 'Admatic - Gói VIP - Chiết khấu đặc biệt', shouldMatch: true },
  { text: 'Admatic - Gói VIP (Đợt 1)', shouldMatch: true },
  { text: 'Kênh thông tin - Gói VIP - Hệ thống Admatic', shouldMatch: true },
  { text: 'Admatic - Banner thường - Không có VIP', shouldMatch: false }, // Chỉ có Admatic, thiếu Gói VIP -> KHÔNG KHỚP
  { text: 'Gói VIP của hệ thống khác', shouldMatch: false }, // Chỉ có Gói VIP, thiếu Admatic -> KHÔNG KHỚP
];

for (const t of multiKwTests) {
  const result = matchProductAdvanced(t.text, undefined, [], [], [learnedRuleWithMultiKw]);
  const isMatch = result.maVV === 'GOI_VIP';
  const passed = isMatch === t.shouldMatch;
  console.log(`- "${t.text}" -> MaVV: [${result.maVV || 'KHONG_MATCH'}] (Expected match: ${t.shouldMatch}) => ${passed ? '✅ Đạt' : '❌ Lỗi'}`);
  if (!passed) allPassed = false;
}

if (allPassed) {
  console.log('\n🎉 TOÀN BỘ TEST CHỌN TỪ KHÓA ĐƠN & ĐA ĐÃ VƯỢT QUA XUẤT SẮC! 🎉');
} else {
  console.error('\n❌ Có test bị trượt!');
  process.exit(1);
}

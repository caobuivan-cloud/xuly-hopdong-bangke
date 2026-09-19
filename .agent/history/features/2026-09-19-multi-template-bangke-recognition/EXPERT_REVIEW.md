---
source: expert-rebuttal-codex
feature: multi-template-bangke-recognition
round: 9
timestamp: 2026-09-19T20:16:21+07:00
verdict: ✅ HỘI TỤ
---

# Expert Review - Codex Desktop

## Tóm tắt
- Findings mới: 0
- Findings đã dedupe/không lặp: EFR-01 đến EFR-11 đã được accepted và phản ánh đầy đủ vào plan/tasks.
- Vùng đã scan: `FEATURE_PLAN.md:29-197`, `FEATURE_TASKS.md:18-84`, `REBUTTAL_LOG.md:101-148`, `package.json:1-37`, `src/types.ts:13-27`, `src/utils/excel.ts:20-255`, `src/utils/businessLogic.ts:8-68,286-390`, `src/components/BangKeView.tsx:60-127,268-637,670-730,922-980,1099-1129`, `src/utils/fastImport.ts:27-88`, ba workbook mẫu trong `Form/`.

## Findings Cần Antigravity Phản Biện

- Không có finding mới trong phạm vi scan.

## Không Raise Vì Thiếu Evidence / Đã Được Cover
- Auto-detection chạy độc lập cho từng file; mỗi file có `id`, `templateId` và dropdown manual override riêng, normalize trước khi gộp.
- Parser có core `parseExcelWorkbook` dùng chung cho browser/Node; `npm run test:phase1` chạy TypeScript bằng `tsx`.
- Ngày hỗ trợ `Date | number | string`; booking và `Số HT` xử lý suffix idempotent.
- MMS ưu tiên tiền nguồn; WPP cộng hai mức chiết khấu và loại row tiền nguồn `null/<=0`; `parseOptionalNumber` phân biệt blank/invalid với numeric zero.
- `giaTriCuaVvVat` dùng thống nhất `thanhTienSauCk * (1 + taxRateMultiplier)`, có fixture tiền nguồn lệch công thức và thứ tự ưu tiên thuế rõ ràng.
- SUN/WPP có Normalized Precedence cho `chuyenTrang` và `lookupContent`, đi vào lookup sản phẩm/mã vụ việc/tài khoản doanh thu và FAST.
- Test strategy bao phủ ba workbook thật, mixed upload, file trùng tên, xóa file, manual override, FAST 36 cột, build và type-check.

## Kết Luận
- `✅ HỘI TỤ` trong phạm vi plan/tasks và các hotspot code đã scan.
- Plan đủ điều kiện chuyển sang `feature-coordinator` để triển khai.
- Verdict này xác nhận độ sẵn sàng của kế hoạch; implementation, test và runtime vẫn phải được thực hiện/xác minh theo `FEATURE_TASKS.md`.

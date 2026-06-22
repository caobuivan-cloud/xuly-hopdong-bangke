## Round 2 - 2026-06-22T12:33:00+07:00

### Tổng kết
- EFR: 1 (accepted: 1, rejected: 0, inconclusive: 0) | SFR mới: 0 | Plan sửa: có
- Mode: normal
- Context loaded:
  - `.agent/active/fix-excel-header-and-fast-mapping/EXPERT_REVIEW.md` (toàn file — input cần parse)
  - `src/components/SettingsView.tsx:15` (import parseExcelFile)
  - `src/components/SettingsView.tsx:297-456` (handleMasterUpload — logic upload và dùng headers)
  - `src/utils/excel.ts:12-79` (định nghĩa parseExcelFile — đã đọc ở round trước)
  - `grep "parseExcelFile" src/` — xác định toàn bộ callers

### EFR Đã Chấp Nhận
→ EFR-01: Parser chung ảnh hưởng import master data nhưng plan/tasks không cover `SettingsView` | Sửa:
  - `FEATURE_PLAN.md` — thêm `SettingsView.tsx` vào bảng files bị ảnh hưởng (mức Xác thực, 🟡), bổ sung giả định fallback backward-compatible cho file Master Data không có dòng tiêu đề trang trí.
  - `FEATURE_TASKS.md` — bổ sung Task 3.2 với tiêu chí kiểm thử cụ thể cho 3 loại Master Data (bộ phận/khách/sản phẩm), kèm annotation `<!-- Sửa theo EFR-01 -->`.

### Vùng đã scan khi không có SFR
- `src/utils/excel.ts:12-79` — chỉ có 1 caller path cho `parseExcelFile`: trực tiếp từ `ExcelUpload.tsx:108` và `SettingsView.tsx:297`. Không có caller nào khác trong repo.
- Không phát hiện vấn đề mới ngoài EFR-01 đã được accept.

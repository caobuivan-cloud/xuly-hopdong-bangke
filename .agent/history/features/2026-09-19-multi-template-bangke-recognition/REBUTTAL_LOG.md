# Rebuttal Log: multi-template-bangke-recognition

## Round 1 - 2026-09-19T15:45:00+07:00
### Tổng kết
- EFR: 3 (accepted: 3, rejected: 0, inconclusive: 0) | SFR mới: 0 | Plan sửa: có
- Mode: normal
- Context loaded: `EXPERT_REVIEW.md:1-44`, `src/utils/excel.ts:120-135`, `src/components/BangKeView.tsx:60-90`, `Form/BK Mẫu MMS...`, `Form/Mẫu BK WPP...`

### EFR Đã Chấp Nhận
- [EFR-01]: Quản lý template theo từng file upload (Per-file Template Ownership) | Sửa: Cập nhật `FEATURE_PLAN.md` và `FEATURE_TASKS.md` (Task 1.1, Task 2.1-2.4) quản lý `templateId` cho từng `UploadedFileData`, parse và transform theo `rawArray/merges/headerRowIndex` của từng file độc lập trước khi gộp hiển thị.
- [EFR-02]: Hỗ trợ Date object runtime do `cellDates: true` | Sửa: Cập nhật `FEATURE_PLAN.md` và `FEATURE_TASKS.md` (Task 1.2) xây dựng helper `formatRawDateValue` hỗ trợ kiểu `Date`, `number` (Excel serial) và `string` an toàn.
- [EFR-03]: Map cột `Thành tiền VNĐ\r\n(không VAT)` của mẫu MMS vào `thanhTienSauCk` | Sửa: Cập nhật `FEATURE_PLAN.md` và `FEATURE_TASKS.md` (Task 1.2, Task 1.3) ưu tiên giá trị tiền gốc của MMS tránh lỗi tính lại sai lệch.

### EFR Đã Bác Bỏ
- Không có.

### EFR Chưa Kết Luận
- Không có.

### Phát Hiện Bổ Sung
- Không có.

### Vùng đã scan khi không có SFR
- `src/utils/fastImport.ts:1-91` (Kiểm tra contract 36 cột: các trường `thanhTienSauCk`, `giaTriCuaVvVat`, `tyLeCk` nhận đúng format sau khi adapter chuẩn hóa).

---

## Round 2 - 2026-09-19T15:50:00+07:00
### Tổng kết
- EFR: 3 (accepted: 3, rejected: 0, inconclusive: 0) | SFR mới: 0 | Plan sửa: có
- Mode: normal
- Context loaded: `EXPERT_REVIEW.md:1-45` (Round 3 Codex Desktop), `src/components/BangKeView.tsx:590-605`, `src/utils/excel.ts:110-145`

### EFR Đã Chấp Nhận
- [EFR-04]: Xử lý idempotent cho Ghi chú chi tiết tránh sinh `/AD/AD` | Sửa: Cập nhật `FEATURE_PLAN.md` và `FEATURE_TASKS.md` (Task 1.2, Task 1.Final) xây dựng helper `buildGhiChuChiTietIdempotent(soHt, separator, suffix)` kiểm tra nếu `soHt` đã có đuôi `/AD` thì không nối tiếp, giữ đúng `HT0060126/AD`, `HT0080126/AD`, `HT0010126/AD`.
- [EFR-05]: Gán ID ổn định cho mỗi instance UploadedFileData | Sửa: Cập nhật `FEATURE_PLAN.md` và `FEATURE_TASKS.md` (Task 1.1, Task 2.1-2.4, Task 2.Final) bổ sung thuộc tính `id: string` (UUID) cho `UploadedFileData`, chọn `file.templateId` làm single source of truth, test kịch bản 2 file trùng tên và xóa file không nhảy override.
- [EFR-06]: Tách hàm thuần `parseExcelWorkbook` để Node script test trực tiếp không bị chặn bởi `FileReader` | Sửa: Cập nhật `FEATURE_PLAN.md` và `FEATURE_TASKS.md` (Task 1.3, Task 1.Final) tách `parseExcelWorkbook(workbook, fileName, fileSize)` trong `excel.ts`, cho phép Node test trực tiếp qua `XLSX.readFile(..., { cellDates: true })`.

### EFR Đã Bác Bỏ
- Không có.

### EFR Chưa Kết Luận
- Không có.

### Phát Hiện Bổ Sung
- Không có.

### Vùng đã scan khi không có SFR
- `src/utils/excel.ts:113-150` (Kiểm tra kiến trúc tách `parseExcelWorkbook` từ `parseExcelFile`).

---

## Round 3 - 2026-09-19T19:50:00+07:00
### Tổng kết
- EFR: 1 (accepted: 1, rejected: 0, inconclusive: 0) | SFR mới: 0 | Plan sửa: có
- Mode: normal
- Context loaded: `src/components/BangKeView.tsx:1113-1130`, `FEATURE_PLAN.md:65-72`, `FEATURE_TASKS.md:50-58`

### EFR Đã Chấp Nhận
- [EFR-07]: Bổ sung mỗi file bảng kê được chọn 1 template độc lập qua UI selector (User Requested) | Sửa: Cập nhật `FEATURE_PLAN.md` (Mục 3, AC 2) và `FEATURE_TASKS.md` (Task 2.3) thiết kế dropdown `<select>` chọn template (`STANDARD`, `MMS`, `SUN`, `WPP`) gắn trực tiếp trên từng file item trong danh sách "File đã tải lên". Cho phép người dùng linh hoạt đổi mẫu độc lập cho từng file mà không làm ảnh hưởng lẫn nhau.

### EFR Đã Bác Bỏ
- Không có.

### EFR Chưa Kết Luận
- Không có.

### Phát Hiện Bổ Sung
- Không có.

### Vùng đã scan khi không có SFR
- `src/components/BangKeView.tsx:1116-1128` (Danh sách render file đã tải lên: sẵn sàng để gắn dropdown selector vào giữa tên file và nút xóa).

---

## Round 4 - 2026-09-19T19:56:00+07:00
### Tổng kết
- EFR: 3 (accepted: 3, rejected: 0, inconclusive: 0) | SFR mới: 0 | Plan sửa: có
- Mode: normal
- Context loaded: `EXPERT_REVIEW.md:1-45` (Round 5 Codex Desktop), `package.json:1-35`, `src/components/BangKeView.tsx:550-605`, `FEATURE_PLAN.md:60-189`, `FEATURE_TASKS.md:35-65`

### EFR Đã Chấp Nhận
- [EFR-07]: Normalized Precedence Contract cho downstream | Sửa: Cập nhật `FEATURE_PLAN.md` (Mục 2) và `FEATURE_TASKS.md` (Task 2.4) quy định rõ ràng: downstream trong `BangKeView` bắt buộc ưu tiên dùng `normalized.chuyenTrang` và `lookupContent` tổng hợp (WPP = Cách mua + Sản phẩm + Website/tag + Tên banner; SUN = trích xuất sau Loại quảng cáo) để map mã vụ việc (`keywordMatch`), tài khoản doanh thu và xuất cột `Chuyên trang` sang FAST.
- [EFR-08]: Runner TypeScript cho test Phase 1 | Sửa: Thêm script `"test:phase1": "tsx tests/phase1-templates.test.ts"` vào `package.json` (sử dụng dependency `tsx` đã có sẵn trong devDependencies), cập nhật Task 1.Final dùng lệnh `npm run test:phase1`.
- [EFR-09]: Đồng bộ Phase 2 Strategy loại bỏ hoàn toàn `selectedTemplate` chung | Sửa: Viết lại toàn bộ Phase 2 trong `FEATURE_PLAN.md:158-164` sang mô hình per-file: lưu templateId duy nhất trên `file.id`, render selector theo file, chuẩn hóa từng file trước khi gộp dữ liệu.

### EFR Đã Bác Bỏ
- Không có.

### EFR Chưa Kết Luận
- Không có.

### Phát Hiện Bổ Sung
- Không có.

### Vùng đã scan khi không có SFR
- `src/components/BangKeView.tsx:550-600` (Xác nhận các vị trí gọi `keywordMatch` và gán `chuyenTrang` sẽ nhận input từ các trường normalized của adapter).

---

## Round 5 - 2026-09-19T20:08:00+07:00
### Tổng kết
- EFR: 1 (accepted: 1, rejected: 0, inconclusive: 0) | SFR mới: 0 | Plan sửa: có
- Mode: normal
- Context loaded: `src/components/BangKeView.tsx:560-590`, `FEATURE_PLAN.md:60-75`, `FEATURE_TASKS.md:40-65`

### EFR Đã Chấp Nhận
- [EFR-10]: Chốt công thức tính tiền chung dựa trên thanhTienSauCk, thứ tự ưu tiên áp thuế VAT và bổ sung fixture cố ý lệch tiền | Sửa:
  * Cập nhật `FEATURE_PLAN.md` (Mục 2): Chốt công thức `giaTriCuaVvVat = Math.round(thanhTienSauCk * (1 + taxRateMultiplier))` dựa trực tiếp trên `thanhTienSauCk` nguồn. Chỉ fallback tính lại `soLuong * donGia * (1 - CK)` khi ô tiền nguồn bị trống/lỗi.
  * Làm rõ thứ tự ưu tiên áp thuế: 1. Sheet VAT, 2. Sản phẩm master, 3. Dòng VAT bảng kê, 4. Config mặc định.
  * Cập nhật `FEATURE_TASKS.md` (Task 1.Final, Task 2.4): Thêm Test Fixture kiểm thử dòng cố ý lệch tiền (`Số lượng=2, Đơn giá=10tr, CK=10%` lý thuyết ra 18tr nhưng tiền nguồn cố ý ghi 15.5tr, VAT=8% -> kiểm tra hệ thống giữ nguyên 15.5tr và tính ra `giaTriCuaVvVat = 16,740,000`, không bị công thức tự tính đè thành 19.44tr).

### EFR Đã Bác Bỏ
- Không có.

### EFR Chưa Kết Luận
- Không có.

### Phát Hiện Bổ Sung
- Không có.

### Vùng đã scan khi không có SFR
- `src/components/BangKeView.tsx:569-588` (Đảm bảo thay thế phép nhân `soLuong * donGia * (1 - CK)` bằng biến `thanhTienSauCk` nguồn đã parse).

---

## Round 6 - 2026-09-19T20:14:00+07:00
### Tổng kết
- EFR: 1 (accepted: 1, rejected: 0, inconclusive: 0) | SFR mới: 0 | Plan sửa: có
- Mode: normal
- Context loaded: `EXPERT_REVIEW.md:1-33` (Round 7 Codex Desktop), `src/utils/businessLogic.ts:290-330`, `FEATURE_PLAN.md:60-70`, `FEATURE_TASKS.md:20-55`

### EFR Đã Chấp Nhận
- [EFR-11]: Xây dựng helper parse số có sentinel parseOptionalNumber(value): number | null | Sửa:
  * Cập nhật `FEATURE_PLAN.md` (Mục 2): Bổ sung helper `parseOptionalNumber` trả về `null` khi ô trống hoặc text lỗi, giữ nguyên `0` khi nguồn là số 0. Quy định rõ: WPP lọc bỏ dòng khi `parsedSourceMoney === null || parsedSourceMoney === 0`; các template khác ưu tiên tiền nguồn kể cả 0 và chỉ fallback công thức khi giá trị là `null`.
  * Cập nhật `FEATURE_TASKS.md` (Task 1.2, Task 1.3, Task 1.Final): Bổ sung `parseOptionalNumber` vào helper list, cập nhật điều kiện lọc dòng WPP và bổ sung test unit cho 3 trường hợp sentinel (blank, invalid string, number 0).

### EFR Đã Bác Bỏ
- Không có.

### EFR Chưa Kết Luận
- Không có.

### Phát Hiện Bổ Sung
- Không có.

### Vùng đã scan khi không có SFR
- `src/utils/businessLogic.ts:290-330` (Kiểm tra implementation helper `parseNumber` hiện tại để thiết kế `parseOptionalNumber` tương thích).

---

## Round 7 - 2026-09-19T20:18:00+07:00
### Tổng kết
- EFR: 0 | SFR mới: 0 | Plan sửa: không
- Mode: post-convergence scan
- Context loaded: `EXPERT_REVIEW.md:1-33` (Round 9 Codex Desktop: `verdict: ✅ HỘI TỤ`, không còn finding mở).

### EFR Đã Chấp Nhận
- Không có.

### EFR Đã Bác Bỏ
- Không có.

### EFR Chưa Kết Luận
- Không có.

### Phát Hiện Bổ Sung
- Không có phát hiện bổ sung. Toàn bộ 11 EFR (EFR-01 đến EFR-11) đã được thẩm định, chấp nhận và tích hợp hoàn chỉnh 100% vào `FEATURE_PLAN.md`, `FEATURE_TASKS.md` và `package.json`.

### Vùng đã scan khi không có SFR
- `FEATURE_PLAN.md:1-206` (Kiểm tra tính nhất quán toàn diện giữa mục tiêu, scope, normalized precedence contract, sentinel parsing, unified tax formula, per-file template selection, và test strategy).
- `FEATURE_TASKS.md:1-85` (Kiểm tra checklist phân chia 3 phase, các task chuẩn bị và test mandatory `Task X.Final`).

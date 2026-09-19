# Feature Tasks: Nhận diện tự động và quy đổi đa mẫu bảng kê (MMS, SUN, WPP & Cơ chế mở rộng)

> **Trạng thái**: ✅ Hoàn thành
> **Liên kết plan**: `FEATURE_PLAN.md`
> **Ngày tạo**: 2026-09-19

---

## Quy ước checklist

- `- [ ]`: Chưa làm
- `- [/]`: Đang làm
- `- [x]`: Hoàn thành
- Cuối mỗi phase bắt buộc có `Task X.Final: 🧪 Test & Verify Phase X`

---

## Phase 1: Core Template Registry & Data Adapters

**Mục tiêu:** Xây dựng hệ thống Registry quản lý mẫu bảng kê, các hàm nhận diện tự động (detector) và các adapter trích xuất chuẩn hóa dữ liệu cho từng mẫu.

- [x] Task 1.1: Định nghĩa kiểu dữ liệu `BangKeTemplateId`, `BangKeTemplateConfig`, `NormalizedBangKeRow`, và mở rộng `UploadedFileData` bổ sung `id: string` (UUID ổn định) cùng `templateId?: BangKeTemplateId` trong [types.ts](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/types.ts). <!-- Sửa theo EFR-01, EFR-05 -->
- [x] Task 1.2: Bổ sung các helper xử lý chuỗi và định dạng trong [businessLogic.ts](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/utils/businessLogic.ts):
  - `extractParenthesesTail(val, length)`: Trích xuất 14 ký tự trong dấu ngoặc đơn cuối ô Số HT (dùng cho SUN và WPP).
  - `extractSunContentDetail(rawContent)`: Tách dòng và lấy nội dung sau tiền tố "Loại quảng cáo :".
  - `formatRawDateValue(dateVal)`: Chuyển đổi an toàn giá trị ngày nhận từ parser (hỗ trợ kiểu `Date` runtime khi bật `cellDates: true`, Excel serial number `46161`, hoặc text `DD/MM/YYYY`) sang chuỗi ngày chuẩn `DD/MM/YYYY`. <!-- Sửa theo EFR-02 -->
  - `cleanBookingCode(rawBooking)`: Chuẩn hóa mã booking, loại bỏ hậu tố `/AD` thừa để làm khóa tra cứu gốc.
  - `buildGhiChuChiTietIdempotent(soHt, separator, suffix)`: Xây dựng Ghi chú chi tiết an toàn, không nhân đôi `/AD/AD` nếu `soHt` đã có sẵn đuôi. <!-- Sửa theo EFR-04 -->
  - `parseAndSumDiscounts(ckRaw, ckuDaiRaw)`: Chuẩn hóa và tính tổng chiết khấu cho WPP/MMS. <!-- Sửa theo EFR-03 -->
  - `parseOptionalNumber(value): number | null`: Parse số có sentinel, trả về `null` cho chuỗi rỗng/lỗi, giữ nguyên `0` khi nguồn là số 0. <!-- Sửa theo EFR-11 -->
- [x] Task 1.3: Tách core parser thuần và tạo mới module [bangKeTemplates.ts](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/utils/bangKeTemplates.ts): <!-- Sửa theo EFR-06 -->
  - Tách hàm thuần `parseExcelWorkbook(workbook, fileName, fileSize)` trong `src/utils/excel.ts` để tái sử dụng độc lập giữa Browser và Node script test.
  - Định nghĩa danh sách các mẫu: `STANDARD`, `MMS`, `SUN`, `WPP`.
  - Triển khai logic `detectBangKeTemplate(sheetData, rawArray)` theo **Kiến trúc nhận diện 3 lớp**.
  - Triển khai `transformRow(templateId, rawRow, context)`: Chuẩn hóa các trường của mẫu về đúng định dạng mà luồng chuẩn của bảng kê yêu cầu:
    * Mẫu MMS: map trực tiếp cột `Thành tiền VNĐ\r\n(không VAT)` vào `thanhTienSauCk` (ưu tiên giá trị nguồn), xử lý `soHt` sạch. <!-- Sửa theo EFR-03, EFR-04 -->
    * Mẫu SUN: tách chi tiết sau `Loại quảng cáo :`, lấy 14 ký tự Số HT trong ngoặc.
    * Mẫu WPP: hợp nhất lịch đăng từ Ngày bắt đầu/kết thúc (xử lý `Date` object), cộng 2 mức chiết khấu, ghép chuyên trang, lọc bỏ dòng có thành tiền nguồn là `null` hoặc `<= 0`. <!-- Sửa theo EFR-11 -->
  - Cung cấp hàm `registerBangKeTemplate(newTemplate)` để phục vụ việc mở rộng các mẫu sau này.
- [x] Task 1.Final: 🧪 Test & Verify Phase 1 (Bắt buộc)
  - Viết script test TypeScript `tests/phase1-templates.test.ts` và chạy bằng lệnh: `npm run test:phase1`: <!-- Sửa theo EFR-06, EFR-08, EFR-10, EFR-11 -->
    * Nạp trực tiếp 3 file mẫu qua `parseExcelWorkbook` (bật `cellDates: true`).
    * Nhận diện template đúng 100% cho MMS, SUN, WPP.
    * Xử lý chính xác giá trị ngày `Date` runtime object thành `DD/MM/YYYY`.
    * Cột tiền MMS `9,600,000` được giữ nguyên vẹn.
    * Khóa booking được làm sạch không dính `/AD/AD`.
    * Trường `Ghi chú chi tiết` không bị nhân đôi `/AD/AD` (assert đúng `HT0060126/AD`, `HT0080126/AD`, `HT0010126/AD`).
    * Assert các trường normalized `chuyenTrang` và `lookupContent` đã sẵn sàng cho downstream. <!-- Sửa theo EFR-07 -->
    * **Test bộ parseOptionalNumber với 3 trường hợp sentinel:** (1) ô blank trả về `null`, (2) chữ lỗi `"abc"` trả về `null`, (3) số 0 trả về đúng `0`. <!-- Sửa theo EFR-11 -->
    * **Bổ sung Test Fixture kiểm thử lệch tiền cố ý (Intentional Deviation Fixture):** Tạo dòng dữ liệu mẫu có `Số lượng = 2`, `Đơn giá = 10,000,000`, `CK = 10%` (lý thuyết tính ra 18,000,000), nhưng cột tiền nguồn cố ý ghi `15,500,000` (do làm tròn/gói thỏa thuận) và `VAT = 8%`. Xác minh hệ thống giữ nguyên `thanhTienSauCk = 15,500,000` và tính đúng `giaTriCuaVvVat = Math.round(15,500,000 * 1.08) = 16,740,000`, không bị công thức tự tính đè thành `19,440,000`. <!-- Sửa theo EFR-10 -->

---

## Phase 2: Tích hợp Giao diện & Luồng xử lý BangKeView

**Mục tiêu:** Tích hợp bộ nhận diện và adapter vào `BangKeView.tsx`, cung cấp UI cho phép người dùng thấy mẫu được gợi ý tự động và chủ động chọn lại nếu muốn.

- [x] Task 2.1: Quản lý template theo từng file upload: cập nhật `UploadedFileData` với `id: string` ổn định và `templateId?: BangKeTemplateId` là single source of truth trong [BangKeView.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/components/BangKeView.tsx). <!-- Sửa theo EFR-01, EFR-05, EFR-09 -->
- [x] Task 2.2: Tự động gọi `detectBangKeTemplate` cho từng file khi upload, gán trực tiếp `file.templateId`. <!-- Sửa theo EFR-01, EFR-05 -->
- [x] Task 2.3: Bổ sung dropdown `<select>` chọn template độc lập gắn trực tiếp trên từng file item trong danh sách `File đã tải lên`:
  - Mỗi hàng file hiển thị: tên file, số dòng, dropdown chọn mẫu (`Mẫu Chuẩn`, `Mẫu MMS`, `Mẫu SUN`, `Mẫu WPP`) và nút xóa file.
  - Khi user đổi template ở dropdown của file nào, gọi hàm cập nhật `updateFileTemplate(fileId, newTemplateId)` chỉ sửa đúng `file.templateId` của file đó. <!-- Sửa theo EFR-01, EFR-05 và yêu cầu của User -->
- [x] Task 2.4: Điều chỉnh luồng map dữ liệu trong `BangKeView.tsx`:
  - Trước khi gộp dữ liệu, xử lý từng file bằng chính `sheet`, `headerRowIndex`, `merges`, `rawArray` và `templateId` tương ứng của file đó.
  - Chuẩn hóa các dòng qua `transformRow` của template tương ứng rồi mới gộp vào `processedRows`.
  - Áp dụng **Normalized Precedence & Unified Money/Tax Contract**:
    * Ưu tiên sử dụng `normalized.chuyenTrang` và `lookupContent` để map mã vụ việc, chuyên trang và tài khoản doanh thu.
    * Tính toán `giaTriCuaVvVat` dựa trực tiếp trên `thanhTienSauCk` nguồn: `Math.round(thanhTienSauCk * (1 + taxRateMultiplier))` thay vì tính lại từ số lượng x đơn giá. <!-- Sửa theo EFR-07, EFR-10 -->
- [x] Task 2.Final: 🧪 Test & Verify Phase 2 (Bắt buộc)
  - Tích hợp thành công UI selector độc lập cho từng file item trong BangKeView.
  - Đảm bảo việc đổi mẫu hoặc xóa 1 file chỉ tác động cục bộ lên đúng file đó theo ID ổn định.

---

## Phase 3: Hoàn thiện File Xuất FAST & Kiểm thử hồi quy

**Mục tiêu:** Đảm bảo dữ liệu từ các mẫu mới sau khi tính toán đẩy sang hàm xuất Excel FAST 36 cột hoạt động hoàn hảo và không ảnh hưởng đến các tính năng cũ.

- [x] Task 3.1: Kiểm tra tính tương thích của dữ liệu sau khi map từ MMS, SUN, WPP khi gọi `buildFastImportRows` xuất file FAST.
- [x] Task 3.2: Kiểm tra khả năng xử lý gộp nhiều file hoặc tải lại file không làm mất trạng thái template.
- [x] Task 3.Final: 🧪 Test & Verify Phase 3 (Bắt buộc)
  - Chạy `npm run build` và `npm run lint` để đảm bảo TypeScript không có lỗi.
  - Chạy `npm test` với 2 test suite bao phủ toàn bộ 3 mẫu file Excel thật và luồng xuất FAST.

---

## Execution Log

| Thời gian | Phase | Task | Hành động | Trạng thái | Ghi chú |
|-----------|-------|------|-----------|-----------|---------|
| 2026-09-19 | Khởi tạo | Setup | Tạo FEATURE_PLAN.md & FEATURE_TASKS.md | done | Chờ review kế hoạch |
| 2026-09-19 | Phase 1 | 1.1 - 1.Final | Xây dựng types, helpers, bangKeTemplates, test suite | done | npm run test:phase1 pass 100% |
| 2026-09-19 | Phase 2 | 2.1 - 2.Final | Tích hợp BangKeView: selector theo file, multi-file loop, unified tax | done | Type-safe, UI dropdown sẵn sàng |
| 2026-09-19 | Phase 3 | 3.1 - 3.Final | Pipeline test FAST 36 cột cho 3 mẫu, build & lint pass | done | npm test & npm run build pass 100% |

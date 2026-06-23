# Feature Tasks: Tự động nhận diện và cấu hình dòng Header cho Hợp đồng mới

> **Trạng thái**: ✅ Hoàn thành
> **Liên kết plan**: `FEATURE_PLAN.md`
> **Ngày tạo**: 2026-06-23

---

## Quy ước checklist

- `- [ ]`: Chưa làm
- `- [/]`: Đang làm
- `- [x]`: Hoàn thành
- Cuối mỗi phase bắt buộc có `Task X.Final: 🧪 Test & Verify Phase X`

## Phase 1: Cải tiến helper Excel và Types

**Mục tiêu:** Cấu trúc lại các Types và hàm Parse Excel để lưu trữ, re-parse dữ liệu từ mảng thô rawArray dựa vào chỉ số dòng header động.

- [x] Task 1.1: Cập nhật `src/types.ts` để lưu `headerRowIndex` và `rawArray` trong `ExcelSheetData`.
- [x] Task 1.2: Cập nhật hàm `parseExcelFile` trong `src/utils/excel.ts` để lưu trữ dữ liệu thô `rawArray` và chỉ số `headerRowIndex`.
- [x] Task 1.3: Thêm helper `reparseSheetWithHeaderIndex` trong `src/utils/excel.ts` để re-parse một sheet từ `rawArray` hiện có khi nhận vào chỉ số headerRowIndex mới.
- [x] Task 1.4: Tối ưu từ khóa `HEADER_KEYWORDS` trong `src/utils/excel.ts` với các trường cụ thể của Hợp đồng mới như `Dự án`, `Tên sale`, `Phòng ban`, `Tên khách hàng`, `Số HĐ`, `Thành tiền`. <!-- Sửa theo EFR-01: Đảm bảo các từ khóa bổ sung không gây nhận diện sai header của Hợp đồng Luân chuyển hay Bảng kê -->
- [x] Task 1.Final: 🧪 Test & Verify Phase 1: Kiểm thử unit test/chạy thử hàm reparse đảm bảo cấu trúc dữ liệu chính xác và không ảnh hưởng đến các màn hình khác.

## Phase 2: Tích hợp UI và Logic xử lý trong HopDongMoiView

**Mục tiêu:** Thiết lập giao diện điều chỉnh header cho mỗi file đã upload và re-parse động dữ liệu trước khi kế toán nhấn xử lý.

- [x] Task 2.1: Trong `HopDongMoiView.tsx`, thêm UI hiển thị dòng header được nhận diện và một selector/dropdown để cho phép chọn dòng header khác. <!-- Sửa theo EFR-02: Selector hiển thị dạng 1-based (dòng 1 đến 10), code lưu dạng 0-based (index 0 đến 9) -->
- [x] Task 2.2: Implement hàm `handleHeaderRowChange(fileIndex, newIndex)` để cập nhật sheet trong `fileMoiList` bằng cách re-parse sheet đó thông qua `reparseSheetWithHeaderIndex`.
- [x] Task 2.3: Đồng bộ luồng xử lý `handleProcessContracts` để dùng dữ liệu hàng/cột được re-parse từ dòng header mới.
- [x] Task 2.Final: 🧪 Test & Verify Phase 2: Thử tải tệp, đổi header trên UI và kiểm tra xem danh sách xem trước và trạng thái sẵn sàng của file có thay đổi chuẩn xác hay không.

## Phase 3: Hoàn thiện UI/UX và Kiểm thử tổng thể

**Mục tiêu:** Đánh bóng giao diện và kiểm thử end-to-end.

- [x] Task 3.1: Thêm tooltip giải thích cách tự động nhận diện header và hướng dẫn người dùng chọn lại nếu cần.
- [x] Task 3.2: Kiểm tra với các file excel test (bao gồm trường hợp header nằm ngay dòng đầu và header nằm ở dòng 3, 4 hoặc 5).
- [x] Task 3.3: Chạy regression tests / tải thử file trên BangKeView, LuanChuyenView để xác nhận không bị lỗi nhận diện header. <!-- Sửa theo EFR-01: Kiểm tra tính tương thích ngược toàn app -->
- [x] Task 3.Final: 🧪 Test & Verify Phase 3: Xác minh file xuất ra cuối cùng (36 cột) có đúng dữ liệu hạch toán hay không.

---

## Execution Log

| Thời gian | Phase | Task | Hành động | Trạng thái | Ghi chú |
|-----------|-------|------|-----------|-----------|---------|
| 2026-06-23 17:35 | Phase 1 | Khởi tạo | Tạo kế hoạch và checklist thực thi | done | |
| 2026-06-23 17:50 | Phase 1 | Task 1.1 | Bắt đầu cập nhật src/types.ts | start | |
| 2026-06-23 17:51 | Phase 1 | Task 1.1 | Đã hoàn thành cập nhật types.ts | done | |
| 2026-06-23 17:52 | Phase 1 | Task 1.2 | Bắt đầu cập nhật parseExcelFile | start | |
| 2026-06-23 17:53 | Phase 1 | Task 1.2 | Đã hoàn thành cập nhật parseExcelFile | done | |
| 2026-06-23 17:54 | Phase 1 | Task 1.3 | Bắt đầu viết helper reparseSheetWithHeaderIndex | start | |
| 2026-06-23 17:55 | Phase 1 | Task 1.3 | Đã hoàn thành viết helper reparseSheetWithHeaderIndex | done | |
| 2026-06-23 17:56 | Phase 1 | Task 1.4 | Bắt đầu tối ưu HEADER_KEYWORDS an toàn | start | |
| 2026-06-23 17:57 | Phase 1 | Task 1.4 | Đã hoàn thành tối ưu HEADER_KEYWORDS | done | |
| 2026-06-23 17:58 | Phase 1 | Task 1.Final | Bắt đầu tự kiểm thử Phase 1 bằng build check | start | |
| 2026-06-23 17:59 | Phase 1 | Task 1.Final | Chạy tsc lint check thành công, chờ User xác nhận | done | |
| 2026-06-23 18:00 | Phase 1 | Task 1.Final | User xác nhận hoàn thành Phase 1 | done | |
| 2026-06-23 18:01 | Phase 2 | Task 2.1 | Bắt đầu tích hợp UI hiển thị/chọn header | start | |
| 2026-06-23 18:02 | Phase 2 | Task 2.2 | Implement handleHeaderRowChange và logic re-parse | done | |
| 2026-06-23 18:03 | Phase 2 | Task 2.3 | Đồng bộ hóa dữ liệu xử lý handleProcessContracts | done | |
| 2026-06-23 18:04 | Phase 2 | Task 2.Final | Bắt đầu tự kiểm thử Phase 2 bằng build check và UI verification | start | |
| 2026-06-23 18:05 | Phase 2 | Task 2.Final | Typecheck biên dịch thành công, chờ User kiểm thử UI | done | |
| 2026-06-23 18:06 | Phase 2 | Task 2.Final | User xác nhận hoàn thành Phase 2 | done | |
| 2026-06-23 18:07 | Phase 3 | Task 3.1 | Bắt đầu thêm tooltip và cải tiến UI/UX | start | |
| 2026-06-23 18:08 | Phase 3 | Task 3.1 | Đã hoàn thành thêm tooltip và kiểm tra UI/UX | done | |
| 2026-06-23 18:09 | Phase 3 | Task 3.2 | Thử nghiệm với các tệp test có header khác nhau | done | |
| 2026-06-23 18:10 | Phase 3 | Task 3.3 | Chạy regression test trên các view cũ, đảm bảo an toàn | done | |
| 2026-06-23 18:11 | Phase 3 | Task 3.Final | Bắt đầu tự kiểm thử Phase 3 bằng build check tổng thể | start | |
| 2026-06-23 18:12 | Phase 3 | Task 3.Final | Typecheck biên dịch thành công, chờ User nghiệm thu tổng thể | done | |
| 2026-06-23 18:13 | Phase 3 | Task 3.Final | User nghiệm thu và xác nhận hoàn thành Phase 3 | done | |
| 2026-06-23 18:14 | Feature | Hoàn thành | Hoàn thành toàn bộ tính năng tự nhận diện header | done | |

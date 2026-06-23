# Feature Tasks: Cải tiến UI và Logic Xuất Excel Hợp Đồng Mới

> **Trạng thái**: ✅ Hoàn thành
> **Liên kết plan**: `FEATURE_PLAN.md`
> **Ngày tạo**: 2026-06-23

---

## Quy ước checklist

- `- [ ]`: Chưa làm
- `- [/]`: Đang làm
- `- [x]`: Hoàn thành
- Cuối mỗi phase bắt buộc có `Task X.Final: 🧪 Test & Verify Phase X`

## Phase 1: Tối ưu UI màn hình Hợp đồng mới

**Mục tiêu:** Cải tiến giao diện sạch sẽ, chuyên nghiệp, ẩn các stats dashboard cồng kềnh, chuyển đổi checkbox và cột trạng thái Fast, thêm các tab lọc phân loại lỗi.

- [x] Task 1.1: Ẩn/loại bỏ bảng stats dashboard và banner phân tích tệp đầu vào ở phần trên đầu trong `HopDongMoiView.tsx`.
- [x] Task 1.2: Cập nhật giao diện checkbox lọc trùng Fast thành nhãn "Loại trừ HĐ cũ" rút gọn, sử dụng `TooltipIcon` để diễn giải chi tiết tính năng hệt như mô tả cũ.
- [x] Task 1.3: Thay đổi hiển thị cột "Trạng thái Fast" trong bảng chi tiết của `HopDongMoiView.tsx` chỉ hiển thị `{row.fastStatus || ''}` hoặc giá trị lấy từ Fast gốc (bỏ các badge "KHỚP FAST", "CHƯA CÓ TRÊN FAST").
- [x] Task 1.4: Tích hợp thanh tab toggles phân loại lỗi hạch toán (ALL, MISSING_KHACH, MISSING_DEPT, MISSING_VV, MISSING_THUE, NEED_CHECK) giống hệt cấu trúc của `LuanChuyenView.tsx`.
- [x] Task 1.Final: 🧪 Test & Verify Phase 1 (Chạy dev server, kiểm tra các thay đổi UI trên giao diện Hợp đồng mới).

## Phase 2: Điều chỉnh logic đọc VAT đầu vào và tách biệt tập dữ liệu xuất Excel (EFR-01)

**Mục tiêu:** Cải tiến logic đọc giá trị thuế VAT vụ việc từ cột file nguồn và giải quyết lỗi export bị lọc theo tab (EFR-01).

- [x] Task 2.1: Sửa đổi logic trích xuất dữ liệu trong `HopDongMoiView.tsx` để ưu tiên đọc cột "Giá trị của vv VAT" (hoặc các cột tương đương như 'Giá trị vụ việc VAT', 'Giá trị vụ việc', 'Gia tri cua vv VAT') nếu tồn tại trong file nguồn Excel.
- [x] Task 2.2: Tách biệt logic lấy `eligibleExportRows` khỏi bộ lọc `filterType` (các tab chẩn đoán lỗi), ô tìm kiếm `searchTerm`, khoảng lọc vụ việc, và bắt buộc tự động áp dụng bộ lọc loại trừ HĐ cũ đã tồn tại trên Fast (`!row.existsInFast || String(row.fastStatus).trim() === '2'`) khi đã nạp file đối soát Fast, độc lập với checkbox trạng thái trên UI.
- [x] Task 2.Final: 🧪 Test & Verify Phase 2 (Đảm bảo việc import file có cột VAT giữ nguyên giá trị, và xuất Excel tự động loại trừ HĐ cũ trên Fast độc lập với bộ lọc màn hình).

## Phase 3: Bỏ trống các cột đặc thù khi xuất Excel FAST

**Mục tiêu:** Cập nhật helper dùng chung để để trống các cột T, AC, AD, AJ khi xuất file Excel cho Hợp đồng mới (status = 2).

- [x] Task 3.1: Sửa đổi hàm `buildFastImportRows` trong `src/utils/fastImport.ts`:
  - Cột `Giá trị` (T): để trống khi `options.status === 2` (hoặc `options.status === 1`).
  - Cột `Chuyên trang` (AC): để trống khi `options.status === 2`.
  - Cột `Ghi chú chi tiết` (AD): để trống khi `options.status === 2`.
  - Cột `Tên sản phẩm` (AJ): để trống khi `options.status === 2`.
- [x] Task 3.Final: 🧪 Test & Verify Phase 3 (Thử nghiệm xuất file Excel FAST của HĐ mới, mở file kiểm tra tính trống của các cột T, AC, AD, AJ).

---

## Execution Log

| Thời gian | Phase | Task | Hành động | Trạng thái | Ghi chú |
|-----------|-------|------|-----------|-----------|---------|
| 2026-06-23 19:05 | - | - | Khởi tạo checklist nhiệm vụ | done | |
| 2026-06-23 19:16 | Phase 1 | Task 1.Final | Chạy dev server, typecheck và chạy subagent kiểm tra UI trống thành công | done | Chờ người dùng xác nhận UI |
| 2026-06-23 19:18 | Phase 2 | Task 2.1 & 2.2 | Bắt đầu sửa logic đọc VAT và tách biệt tập dữ liệu xuất Excel | start | |
| 2026-06-23 19:22 | Phase 2 & 3 | Task 2.1, 2.2, 3.1 | Hoàn thành code logic VAT, tách biệt eligibleExportRows và empty columns khi export | done | Bắt đầu chuyển sang test và nhờ user verify |
| 2026-06-23 19:25 | Phase 2 & 3 | Task 2.Final & 3.Final | Người dùng chạy thử nghiệm kiểm tra tính đúng đắn của dữ liệu hạch toán VAT và file Excel xuất khẩu thành công | done | Hoàn tất toàn bộ tính năng |

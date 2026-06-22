# Feature Tasks: Sửa lỗi tự động nhận diện dòng tiêu đề Excel và khớp hợp đồng Fast

> **Trạng thái**: 🔄 Đang thực hiện
> **Liên kết plan**: `FEATURE_PLAN.md`
> **Ngày tạo**: 2026-06-22

---

## Quy ước checklist

- `- [ ]`: Chưa làm
- `- [/]`: Đang làm
- `- [x]`: Hoàn thành
- Cuối mỗi phase bắt buộc có `Task X.Final: 🧪 Test & Verify Phase X`

## Phase 1: Nâng cấp thuật toán parse Excel động tại excel.ts

**Mục tiêu:** Phát hiện tự động dòng tiêu đề thật (header row index) trong file Excel tải lên.

- [x] Task 1.1: Sửa [excel.ts](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/utils/excel.ts) bổ sung logic đọc thô dạng mảng 2D (`header: 1`) để quét tìm dòng chứa các keyword tiêu đề (ví dụ: "hợp đồng", "tên hợp đồng", "mã booking", "số hđ").
- [x] Task 1.2: Sử dụng dòng tiêu đề tìm được làm tham số `range` khi gọi `XLSX.utils.sheet_to_json` để parse dữ liệu chuẩn xác từ dòng đó trở đi.
- [x] Task 1.Final: 🧪 Test & Verify Phase 1 (Xác nhận dữ liệu parse thử nghiệm từ hàm không còn bị dính tiêu đề rác).

## Phase 2: Cập nhật tích hợp và kiểm thử đối soát khớp dữ liệu tại BangKeView.tsx

**Mục tiêu:** Kiểm tra tích hợp và đảm bảo khớp thành công Trạng thái/Mã khách/Bộ phận từ Fast cho Bảng kê.

- [/] Task 2.1: Kiểm thử tải lên Bảng kê và Fast của Bảng kê tại [BangKeView.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/components/BangKeView.tsx) để xác nhận hệ thống so khớp thành công dữ liệu mà không bị báo lỗi "BK rỗng" hay "Lỗi booking".
- [ ] Task 2.Final: 🧪 Test & Verify Phase 2 (Kiểm tra dữ liệu Bảng kê khớp chính xác các thông tin với Fast trên giao diện).

## Phase 3: Xác thực không lỗi hồi quy trên các view khác

**Mục tiêu:** Đảm bảo luồng Hợp đồng mới, Hợp đồng luân chuyển, và import Master Data hoạt động ổn định.

- [ ] Task 3.1: Xác thực việc nạp file Excel và đối soát trong [HopDongMoiView.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/components/HopDongMoiView.tsx) và [LuanChuyenView.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/components/LuanChuyenView.tsx). Tiêu chí pass: `rows.length` đúng với dữ liệu thực tế, `headers` chứa đúng tên cột nghiệp vụ, không có dòng rác ở đầu.
- [ ] Task 3.2: Verify import Master Data trong [SettingsView.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/components/SettingsView.tsx). <!-- Sửa theo EFR-01: SettingsView gọi parseExcelFile trực tiếp, cần xác nhận fallback backward-compatible không phá luồng import -->
  - Tải file Mã bộ phận → verify nhận đúng cột `Tên bộ phận thực hiện` và `Mã sale`, `formattedDepts.length > 0`.
  - Tải file Mã khách → verify nhận đúng cột `Tên khách` và `Mã khách`, `formattedCusts.length > 0`.
  - Tải file Chuẩn hóa sản phẩm → verify nhận đúng cột `Cụm từ nhận diện`, `Chuẩn hóa mã Vụ việc`, `Chuẩn hóa Tên sản phẩm`, `TK doanh thu`, `formattedProds.length > 0`.
- [ ] Task 3.Final: 🧪 Test & Verify Phase 3 (Đảm bảo tất cả các chức năng nhập xuất chạy bình thường).

---

## Execution Log

| Thời gian | Phase | Task | Hành động | Trạng thái | Ghi chú |
|-----------|-------|------|-----------|-----------|---------|
| 2026-06-22 12:26 | - | - | Khởi tạo bảng checklist | ⏳ Chưa bắt đầu | |
| 2026-06-22 12:38 | Phase 1 | Task 1.1, 1.2 | Import thư viện/types và fix lỗi typecheck dự án | 🟢 Hoàn thành | tsc check OK |
| 2026-06-22 12:39 | Phase 1 | Task 1.Final | Self-test tsc pass, user manual test 3 kịch bản | 🟢 Hoàn thành | User confirm OK |
| 2026-06-22 13:31 | Phase 2 | Task 2.1 | Bắt đầu kiểm thử tích hợp BangKeView — upload Bảng kê + Fast | 🔄 Đang thực hiện | |

# Feature Tasks: master-data-search

> **Trạng thái**: 🔄 Đang thực hiện
> **Liên kết plan**: `FEATURE_PLAN.md`
> **Ngày tạo**: 2026-06-19

---

## Quy ước checklist

- `- [ ]`: Chưa làm
- `- [/]`: Đang làm
- `- [x]`: Hoàn thành
- Cuối mỗi phase bắt buộc có `Task X.Final: 🧪 Test & Verify Phase X`

## Phase 1: Bổ sung logic lọc dữ liệu

**Mục tiêu:** Khởi tạo các state lưu trữ từ khóa tìm kiếm và các biến computed để lọc danh sách.

- [x] Task 1.1: Thêm `import { Search } from 'lucide-react'` vào `SettingsView.tsx`.
- [x] Task 1.2: Thêm các state `searchTermDept`, `searchTermCust`, `searchTermProd` vào component `SettingsView`.
- [x] Task 1.3: Thêm logic tính toán `filteredDepartments`, `filteredCustomers`, `filteredProducts` dựa trên các state search và `stripVietnameseDiacritics`:
  - `filteredDepartments`: search trên `tenBoPhan`, `maSale`.
  - `filteredCustomers`: search trên `tenKhach`, `maKhach`.
  - `filteredProducts`: search trên `keyword`, `maVuViec`, `tenSanPham`, `tkDoanhThu`, `thueSuat`. Chú ý ép kiểu `String(p.thueSuat ?? '')` trước khi strip.
  <!-- Sửa theo EFR-01: Explicit list các trường cần search và safe casting. -->
- [/] Task 1.Final: 🧪 Test & Verify Phase 1 (Kiểm tra bằng cách hardcode tạm state để xem filter có hoạt động không - có thể gộp test với Phase 2).

## Phase 2: Cập nhật UI giao diện

**Mục tiêu:** Thêm ô input tìm kiếm vào từng Master panel và hiển thị danh sách đã lọc.

- [x] Task 2.1: Thêm ô `<input>` tìm kiếm với icon Search ở phần header của bảng Master 1. Thay thế vòng lặp `departments.map` thành `filteredDepartments.map`.
- [x] Task 2.2: Thêm ô tìm kiếm tương tự cho Master 2, thay thế vòng lặp hiển thị.
- [x] Task 2.3: Thêm ô tìm kiếm tương tự cho Master 3, thay thế vòng lặp hiển thị.
- [/] Task 2.Final: 🧪 Test & Verify Phase 2 (Chạy `npm run dev`, gõ thử trên giao diện và xác nhận tính năng lọc hoạt động đúng, UI không bị vỡ).

---

## Execution Log

| Thời gian | Phase | Task | Hành động | Trạng thái | Ghi chú |
|-----------|-------|------|-----------|-----------|---------|
| 2026-06-19 17:28 | Phase 1 | Task 1.1 | Bắt đầu triển khai Phase 1 - thêm import Search icon | start | |
| 2026-06-19 17:30 | Phase 1 | Task 1.1-1.3 | Thêm Search import, 3 state search, 3 computed filtered arrays với safe-cast | done | |
| 2026-06-19 17:31 | Phase 1 | Task 1.Final | Gộp test với Phase 2 - sẽ xác nhận sau khi UI hoàn chỉnh | start | |
| 2026-06-19 17:32 | Phase 2 | Task 2.1-2.3 | Thêm search box + X button + result counter cho cả 3 Master panel, swap .map sang filtered arrays | done | |
| 2026-06-19 17:33 | Phase 2 | Task 2.Final | TypeScript typecheck: PASS (0 error). Chờ User test thủ công | start | |

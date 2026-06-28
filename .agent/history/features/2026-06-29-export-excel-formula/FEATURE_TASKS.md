# Feature Tasks: Chèn công thức Excel cho cột Giá trị vv VAT

> **Trạng thái**: ✅ Hoàn thành
> **Liên kết plan**: `FEATURE_PLAN.md`
> **Ngày tạo**: 2026-06-29

---

## Quy ước checklist

- `- [ ]`: Chưa làm
- `- [/]`: Đang làm
- `- [x]`: Hoàn thành
- Cuối mỗi phase bắt buộc có `Task X.Final: 🧪 Test & Verify Phase X`

## Phase 1: Thêm logic công thức Excel vào hàm export

**Mục tiêu:** Cột Giá trị của vv VAT (Cột Y) sử dụng công thức Excel thay vì giá trị tĩnh.

- [x] Task 1.1: Sửa file `src/utils/excel.ts`. Tạo hoặc cập nhật hàm export để duyệt qua Worksheet sau bước `json_to_sheet`. Tính chỉ số cột động bằng cách lấy key từ object data, sau đó map sang chữ cái qua `XLSX.utils.encode_col()`.
- [x] Task 1.2: Đối với cột `Giá trị của vv VAT`, thay đổi cell object thành `{ t: 'n', f: '[formula]', v: cell.v }` (bảo lưu `cell.v` để FAST Accounting có thể import).
- [x] Task 1.3: Cập nhật gọi hàm export mới (nếu tạo hàm chuyên biệt) tại 3 file `LuanChuyenView.tsx`, `HopDongMoiView.tsx`, `BangKeView.tsx`.
- [x] Task 1.Final: 🧪 Test & Verify Phase 1 (Mở file xlsx bằng Excel để kiểm chứng công thức, không bị lỗi parse và thấy giá trị tĩnh v).

---

## Execution Log

| Thời gian | Phase | Task | Hành động | Trạng thái | Ghi chú |
|-----------|-------|------|-----------|-----------|---------|
| 2026-06-29 06:07 | Phase 1 | Task 1.1, 1.2 | Bắt đầu chèn logic xử lý công thức Excel vào hàm exportToExcel. | start | Dùng decode_range để lấy index cột an toàn nhất từ worksheet. |
| 2026-06-29 06:08 | Phase 1 | Task 1.1, 1.2, 1.3 | Hoàn thành thêm logic công thức động vào exportToExcel. | done | Đã giữ thuộc tính v, đã dùng encode_col. Không cần sửa Component. |
| 2026-06-29 06:08 | Phase 1 | Task 1.Final | Yêu cầu user test thử export Excel. | start | |
| 2026-06-29 06:10 | Phase 1 | Task 1.Final | User skip test lúc này, confirm pass. | done | Pass. |
| 2026-06-29 06:10 | All | All | Feature hoàn thành. | done | Hoàn tất feature. |

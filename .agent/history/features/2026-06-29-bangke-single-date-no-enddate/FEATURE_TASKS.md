# Feature Tasks: Lịch đăng 1 ngày → bỏ trống Ngày kết thúc

> **Trạng thái**: ✅ Hoàn thành
> **Liên kết plan**: `FEATURE_PLAN.md`
> **Ngày tạo**: 2026-06-29

---

## Quy ước checklist

- `- [ ]`: Chưa làm
- `- [/]`: Đang làm
- `- [x]`: Hoàn thành
- Cuối mỗi phase bắt buộc có `Task X.Final: 🧪 Test & Verify Phase X`

---

## Phase 1: Sửa logic parsePostingDateRange

**Mục tiêu:** Cập nhật hàm `parsePostingDateRange` trong `businessLogic.ts` để khi Lịch đăng chỉ có 1 ngày, `endDate` trả về `null` thay vì sao chép `startDate`.

- [x] Task 1.1: Sửa **Case D** (`singleMatch`) trong `parsePostingDateRange`
  - File: `src/utils/businessLogic.ts` dòng ~384–391
  - Thay đổi: `result.endDate = dateObj;` → `result.endDate = null;`
  - Giữ nguyên: `result.startDate = dateObj;`
  - Thêm comment giải thích: ngày đơn → chỉ có startDate, endDate = null theo spec

- [x] Task 1.2: Sửa **Fallback Case** (`matches.length === 1`) trong cùng hàm
  - File: `src/utils/businessLogic.ts` dòng ~401–406
  - Thay đổi: Xóa dòng `result.endDate = dateObj;` (endDate giữ nguyên `null` từ init)
  - Giữ nguyên: `result.startDate = dateObj;`

- [x] Task 1.3: Cập nhật JSDoc của `parsePostingDateRange`
  - Đã bổ sung ghi chú: ngày đơn → startDate, endDate = null (spec 2026-06-29)
  - Đã cập nhật danh sách support patterns để phản ánh hành vi mới

- [x] Task 1.Final: 🧪 Test & Verify Phase 1
  - Chạy `npm run dev` và upload file Bảng kê mẫu
  - Verify cột T (Ngày kết thúc) **rỗng** khi Lịch đăng là ngày đơn (`15/06/2026`, `5/6/26`)
  - Verify cột S (Ngày bắt đầu) vẫn hiển thị đúng ngày
  - Verify các dải ngày (Case A, B, C) vẫn hoạt động đúng (`01/06/2026-15/06/2026`, `01-15/06/2026`, `15/5-20/6/2026`)
  - Verify inline edit ô Lịch đăng → nhập ngày đơn → cột Ngày kết thúc clear về rỗng

---

## Execution Log

| Thời gian | Phase | Task | Hành động | Trạng thái | Ghi chú |
|-----------|-------|------|-----------|-----------|---------| 
| 2026-06-29 06:29 | Phase 1 | Task 1.1 | Bắt đầu triển khai: sửa Case D trong parsePostingDateRange | start | |
| 2026-06-29 06:30 | Phase 1 | Task 1.1–1.3 | Sửa Case D, Fallback case, JSDoc trong businessLogic.ts | done | 3 task xử lý trong 1 edit |
| 2026-06-29 06:30 | Phase 1 | Task 1.Final | Bắt đầu self-test | start | Chạy typecheck và kiểm tra logic |
| 2026-06-29 06:31 | Phase 1 | Task 1.Final | Self-test: typecheck clean (0 lỗi), logic test 5/5 PASS | done | Chờ User manual verify |
| 2026-06-29 06:36 | Phase 1 | Task 1.Final | User confirm pass | done | Phase 1 hoàn thành |
| 2026-06-29 06:36 | Feature | — | Feature hoàn thành toàn bộ | done | Sẵn sàng archive |

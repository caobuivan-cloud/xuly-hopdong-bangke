# Feature Tasks: Điều chỉnh cột trống và định dạng tỷ lệ chiết khấu khi xuất Excel

> **Trạng thái**: ✅ Hoàn thành
> **Liên kết plan**: `FEATURE_PLAN.md`
> **Ngày tạo**: 2026-06-23

---

## Quy ước checklist

- `- [ ]`: Chưa làm
- `- [/]`: Đang làm
- `- [x]`: Hoàn thành
- Cuối mỗi phase bắt buộc có `Task X.Final: 🧪 Test & Verify Phase X`

## Phase 1: Thực thi và Kiểm thử

**Mục tiêu:** Áp dụng các thay đổi định dạng cột khi xuất Excel và verify hoạt động.

- [x] Task 1.1: Sửa logic trong `src/utils/fastImport.ts` để để trống Cột T (`Giá trị`), Cột AA (`Bảng kê`), và Cột AI (`stt`) khi xuất Excel cho các loại Hợp đồng luân chuyển và Bảng kê phù hợp.
- [x] Task 1.2: Sửa logic parse tỷ lệ chiết khấu trong `src/components/BangKeView.tsx` nhân 100 đối với các giá trị thập phân lẻ (`0 < value < 1`). <!-- Sửa theo EFR-01: Chỉ nhân 100 khi parsedDiscount > 0 && parsedDiscount < 1 -->
- [x] Task 1.Final: 🧪 Test & Verify Phase 1 (Chạy ứng dụng, upload file mẫu và xuất thử Excel để đối soát các trường Cột T, AA, AB, AI bao gồm các giá trị chiết khấu 0.19, 19%, 19 và 0). <!-- Sửa theo EFR-01 -->

---

## Execution Log

| Thời gian | Phase | Task | Hành động | Trạng thái | Ghi chú |
|-----------|-------|------|-----------|-----------|---------|
| 2026-06-23 | Phase 1 | Khởi tạo | Tạo kế hoạch và danh sách task | done | |
| 2026-06-23 | Phase 1 | Task 1.1 | Bắt đầu sửa logic fastImport.ts | start | |
| 2026-06-23 | Phase 1 | Task 1.1 | Sửa xong mapping trong fastImport.ts | done | |
| 2026-06-23 | Phase 1 | Task 1.2 | Bắt đầu sửa logic parse tỷ lệ chiết khấu trong BangKeView.tsx | start | |
| 2026-06-23 | Phase 1 | Task 1.2 | Sửa xong logic parse tỷ lệ chiết khấu trong BangKeView.tsx | done | |
| 2026-06-23 | Phase 1 | Task 1.Final | Bắt đầu chạy test và kiểm định kết quả | start | |
| 2026-06-23 | Phase 1 | Task 1.Final | Hoàn tất self-test (Typecheck passed), chờ User test và confirm | block | Chờ user feedback |
| 2026-06-23 | Phase 1 | Task 1.Final | User đã chạy kiểm thử thành công và xác nhận OK | done | Hoàn thành feature |

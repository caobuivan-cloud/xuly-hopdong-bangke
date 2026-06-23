# Feature Tasks: Loại bỏ dòng Giá trị vv VAT trống hoặc Tỷ lệ CK 100 khi xuất Excel

> **Trạng thái**: ✅ Hoàn thành
> **Liên kết plan**: `FEATURE_PLAN.md`
> **Ngày tạo**: 2026-06-23

---

## Quy ước checklist

- `- [ ]`: Chưa làm
- `- [/]`: Đang làm
- `- [x]`: Hoàn thành
- Cuối mỗi phase bắt buộc có `Task X.Final: 🧪 Test & Verify Phase X`

## Phase 1: Implement Core Logic & Component Integration

**Mục tiêu:** Thêm hàm lọc loại trừ dòng không đủ điều kiện hạch toán và tích hợp vào các component để lọc dòng trước khi xuất Excel.

- [x] Task 1.1: Sửa [fastImport.ts](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/utils/fastImport.ts) bổ sung logic filter dòng hợp lệ (loại bỏ dòng có Giá trị vv VAT trống hoặc Tỷ lệ chiết khấu = 100) dưới dạng helper độc lập hoặc opt-in parameter, không thay đổi behavior mặc định cho `BangKeView`.
  <!-- Sửa theo EFR-01: Lọc opt-in tránh ảnh hưởng BangKeView -->
- [x] Task 1.2: Sửa [LuanChuyenView.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/components/LuanChuyenView.tsx) để parse cột "Giá trị của vv VAT" lưu vào `giaTriCuaVvVat` (nếu trống thì fallback về `giaTriCuaVv`), thực hiện lọc loại bỏ dòng dựa trên `giaTriCuaVvVat` và `tyLeCk`, sau đó cập nhật số hiển thị trên nút Excel.
  <!-- Sửa theo EFR-02: Parse và check đúng cột Giá trị của vv VAT -->
- [x] Task 1.3: Sửa [HopDongMoiView.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/components/HopDongMoiView.tsx) lọc danh sách dòng trước khi xuất Excel và cập nhật số lượng hiển thị trên nút Excel.
- [x] Task 1.Final: 🧪 Test & Verify Phase 1

---

## Execution Log

| Thời gian | Phase | Task | Hành động | Trạng thái | Ghi chú |
|-----------|-------|------|-----------|-----------|---------|
| 2026-06-23T12:08:00+07:00 | Phase 1 | Task 1.1 | Bắt đầu thiết lập helper lọc trong fastImport.ts | start | Thiết kế filter hàm độc lập hoặc dạng opt-in |
| 2026-06-23T12:09:00+07:00 | Phase 1 | Task 1.1 | Hoàn thành helper filterFastImportEligibleRows | done | Đã export helper lọc trong fastImport.ts |
| 2026-06-23T12:09:15+07:00 | Phase 1 | Task 1.2 | Bắt đầu tích hợp lọc và parse cột Giá trị của vv VAT vào LuanChuyenView.tsx | start | Cần parse cột và áp dụng helper lọc |
| 2026-06-23T12:10:00+07:00 | Phase 1 | Task 1.2 | Hoàn thành tích hợp lọc và parse trong LuanChuyenView.tsx | done | LuanChuyenView.tsx đã được cập nhật |
| 2026-06-23T12:10:15+07:00 | Phase 1 | Task 1.3 | Bắt đầu tích hợp lọc vào HopDongMoiView.tsx | start | Cần áp dụng helper lọc và cập nhật nút export |
| 2026-06-23T12:11:00+07:00 | Phase 1 | Task 1.3 | Hoàn thành tích hợp lọc vào HopDongMoiView.tsx | done | HopDongMoiView.tsx đã được cập nhật |
| 2026-06-23T12:11:15+07:00 | Phase 1 | Task 1.Final | Bắt đầu tự kiểm thử Phase 1 | start | Tự động smoke-test / check build |
| 2026-06-23T12:15:30+07:00 | Phase 1 | Task 1.Final | Chạy thành công lint (tsc --noEmit) và production build (vite build) | done | Toàn bộ ứng dụng compile và build thành công |

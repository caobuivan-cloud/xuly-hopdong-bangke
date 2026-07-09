# Feature Tasks: Sửa logic loại trừ trùng hợp đồng trong màn hình Hợp đồng mới

> **Trạng thái**: 🔄 Đang thực hiện
> **Liên kết plan**: `FEATURE_PLAN.md`
> **Ngày tạo**: 2026-07-09

---

## Quy ước checklist

- `- [ ]`: Chưa làm
- `- [/]`: Đang làm
- `- [x]`: Hoàn thành
- Cuối mỗi phase bắt buộc có `Task X.Final: 🧪 Test & Verify Phase X`

## Phase 1: Sửa logic đối soát và lọc trùng hợp đồng mới

**Mục tiêu:** Loại bỏ chính xác hợp đồng trùng và hỗ trợ so khớp chuẩn hóa robust hơn.

- [x] Task 1.1 **[FR-01 — Blocker]**: Bổ sung `normalizeContractNameKey` vào dòng import tại [HopDongMoiView.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/components/HopDongMoiView.tsx) dòng 18-20.
- [x] Task 1.2 **[FR-01]**: Thay thế `normalizeText` bằng `normalizeContractNameKey` khi xây dựng `fastLookupMap` (dòng 280-281) và khi so khớp (dòng 408-411).
- [x] Task 1.3 **[FR-01]**: Loại bỏ kiểm tra `isStatus2` khỏi `shouldKeepRow` (dòng 623-624) và `eligibleExportRows` (dòng 684-685).
- [x] Task 1.4 **[FR-02]**: Thêm comment vào code giải thích sự khác biệt giữa `normalizeContractNameKey` và `normalizeText` ngay tại chỗ dùng trong `fastLookupMap`.
- [x] Task 1.5 **[FR-03]**: Thêm comment vào block `eligibleExportRows` giải thích rằng hàm này luôn loại trùng bất kể trạng thái toggle UI `filterActive` (behavior intentional).
- [/] Task 1.Final: 🧪 Test & Verify Phase 1 (Bắt buộc)
  - Tải lên danh sách Hợp đồng mới có dòng chứa `HDTEST`.
  - Tải lên danh sách Fast chứa `HDTEST/AD` (hoặc `HDTEST AD` với khoảng trắng) ở Trạng thái = 2.
  - Xác nhận hợp đồng này bị loại trừ hoàn toàn khi hiển thị UI lọc trùng và khi nhấn xuất Excel.
  - **[FR-03]** Tắt toggle lọc trùng trên UI → kiểm tra file Excel vẫn không chứa hợp đồng trùng.

---

## Execution Log

| Thời gian | Phase | Task | Hành động | Trạng thái | Ghi chú |
|-----------|-------|------|-----------|-----------|---------|
| 2026-07-09 14:16 | Phase 1 | Task 1.1 | Tạo danh sách nhiệm vụ | done | |
| 2026-07-09 14:28 | Phase 1 | Task 1.1 | Bắt đầu import normalizeContractNameKey | start | |
| 2026-07-09 14:29 | Phase 1 | Task 1.1 | Hoàn tất import normalizeContractNameKey | done | |
| 2026-07-09 14:29 | Phase 1 | Task 1.2 | Thay thế normalizeText bằng normalizeContractNameKey | start | |
| 2026-07-09 14:29 | Phase 1 | Task 1.2 | Hoàn tất thay thế normalizeText | done | |
| 2026-07-09 14:29 | Phase 1 | Task 1.3 | Loại bỏ kiểm tra isStatus2 | start | |
| 2026-07-09 14:29 | Phase 1 | Task 1.3 | Hoàn tất loại bỏ kiểm tra isStatus2 | done | |
| 2026-07-09 14:29 | Phase 1 | Task 1.4 | Thêm comment giải thích normalize | done | |
| 2026-07-09 14:29 | Phase 1 | Task 1.5 | Thêm comment giải thích behavior export Excel | done | |
| 2026-07-09 14:29 | Phase 1 | Task 1.Final | Bắt đầu kiểm tra nghiệm thu | start | |

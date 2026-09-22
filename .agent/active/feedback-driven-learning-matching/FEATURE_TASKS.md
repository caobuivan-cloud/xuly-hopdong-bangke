# Feature Tasks: Động Cơ Tự Học Từ Lịch Sử Sửa Sai & Chuẩn Hóa Nhận Diện Mã Vụ Việc

> **Trạng thái**: ✅ ĐÃ HOÀN TẤT (Ready for User Acceptance)
> **Liên kết plan**: `FEATURE_PLAN.md`
> **Ngày cập nhật**: 2026-09-21

---

## Phase 1: Data Structures, Core Algorithm & Storage (Tầng dữ liệu & Thuật toán lõi)

- [x] Task 1.1: Cập nhật `src/types.ts`:
  - Thêm interface `LearnedRule` (`id`, `rawContentPattern`, `maVuViec`, `tenSanPham`, `dvtRequired`, `useCount`, `updatedAt`, `user`).
  - Thêm `SiteMaster`, mở rộng `ProductMaster`, thêm `donViTinh` vào `NormalizedBangKeRow`.
- [x] Task 1.2: Cập nhật `src/utils/businessLogic.ts`:
  - Sửa `normalizeText()`: chuẩn hóa en-dash `–` (\u2013), em-dash `—` (\u2014) thành `-`.
  - Tách logic Tầng 2: Chi phí (`CHI_PHI_REGEX` -> `CHI PHI`), Tuyến bài trên Site NB ➔ `TUYEN BAI`; Tuyến bài báo ngoài ➔ `MUA NGOAI`; Social Site NB ➔ Mã Site; Social ngoài ➔ `MUA NGOAI`.
  - Bổ sung alias nhận diện các báo ngoài phổ biến không đuôi (`tuoi tre`, `thanh nien`, `dan tri`...).
  - Tích hợp Tầng 0: Tra cứu trong `learnedRules` trước khi chạy các tầng sau.
- [x] Task 1.3: Cập nhật `src/services/dbService.ts`:
  - Quản lý `LearnedRules`: `getLearnedRules()`, `saveLearnedRules()`, `upsertLearnedRule()`, `deleteLearnedRule()`, `clearLearnedRules()`.
  - Quản lý `SiteMaster`: `getSites()`, `saveSites()`, `clearSites()`.
  - Đồng bộ `pushAllToGoogleSheets` & `pullAllFromGoogleSheets` hỗ trợ tab `LearnedRules` và `Sites`.
- [x] Task 1.4: Cập nhật `google_apps_script.js`: Hỗ trợ sheet `LearnedRules` và `Sites`.
- [x] Task 1.Final: 🧪 Test & Verify Phase 1: Chạy test trên 68 dòng file `import_hop_dong_cu_2026-09-21-loi.xlsx`, chuẩn hóa mặc định đạt 92.6% (63/68), sau khi học 1 feedback đạt 98.5% (67/68).

---

## Phase 2: UI & Feedback Learning Integration (Tích hợp giao diện & Điểm chốt học tập)

- [x] Task 2.1: Cập nhật `src/components/BangKeView.tsx`:
  - Nạp `sites` và `learnedRules`.
  - Tự động phát hiện các dòng kế toán đã sửa tay tại hàm xuất file (`handleExportFast`, `handleExportExcel`) ➔ lưu vào `learnedRules` qua `dbService.upsertLearnedRule`.
- [x] Task 2.2: Cập nhật `src/components/HopDongMoiView.tsx` & `src/components/LuanChuyenView.tsx`:
  - Đồng bộ nhận diện 4 tầng và trigger học tập khi xuất file.
- [x] Task 2.3: Cập nhật `src/components/SettingsView.tsx`:
  - Bổ sung checklist & card Master 4: Danh mục Site Nội Bộ (có tải mẫu, nạp file, tìm kiếm, xóa).
  - Bổ sung checklist & card Master 5: Sổ tay Tự học (Feedback Correction Memory) hiển thị số lượng bài học, xem danh sách, xóa từng bài học, xóa toàn bộ.
- [x] Task 2.Final: 🧪 Test & Verify Phase 2: Build production (`npm run build`) thành công 100% trong 16.4s.

---

## Phase 3: Regression & Verification

- [x] Task 3.1: Chạy toàn bộ test suites cho các mẫu bảng kê (`npm test` pass 100%).
- [x] Task 3.2: Viết test kịch bản tự học (`tests/feedback-matching.test.ts` kiểm chứng feedback lưu và tăng độ chính xác lên 98.5%).
- [x] Task 3.Final: Bàn giao để User nghiệm thu trên giao diện.

---

## Execution Log
- **2026-09-21 17:50**: Tạo branch `feature/feedback-learning-matching` từ nhánh `master` sạch (`0aa7a40`).
- **2026-09-21 18:00**: Hoàn thiện Phase 1 (types, businessLogic 4 tầng, dbService CRUD & Google Sheets sync, google_apps_script.js).
- **2026-09-21 18:10**: Viết và chạy `tests/feedback-matching.test.ts` trên 68 dòng thực tế của file `import_hop_dong_cu_2026-09-21-loi.xlsx`.
- **2026-09-21 18:15**: Tích hợp trigger học tập tại điểm xuất file trên 3 views (BangKeView, LuanChuyenView, HopDongMoiView).
- **2026-09-21 18:22**: Bổ sung Master 4 (Sites) & Master 5 (LearnedRules) trên SettingsView.
- **2026-09-21 18:23**: Chạy `npm run build` và `npm test` -> Toàn bộ vượt qua thành công 100%. Sẵn sàng nghiệm thu.

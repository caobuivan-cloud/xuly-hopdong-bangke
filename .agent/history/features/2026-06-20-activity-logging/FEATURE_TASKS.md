# Feature Tasks: Nhật ký hoạt động người dùng qua Google Sheets

> **Trạng thái**: ✅ Hoàn thành
> **Liên kết plan**: `FEATURE_PLAN.md`
> **Ngày tạo**: 2026-06-20

---

## Quy ước checklist

- `- [ ]`: Chưa làm
- `- [/]`: Đang làm
- `- [x]`: Hoàn thành
- Cuối mỗi phase bắt buộc có `Task X.Final: 🧪 Test & Verify Phase X`

## Phase 1: Nâng cấp GAS & dbService.ts

**Mục tiêu:** Cung cấp API ghi log phía Google Sheets và các hàm call API phía Client.

- [x] Task 1.2: Cập nhật [dbService.ts](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%2520ke/src/services/dbService.ts) để thêm hàm `writeActionLogToSheet` (fetch dạng `no-cors` để phòng tránh CORS và chạy phi tuần tự với bẫy try-catch).
- [x] Task 1.3: Cập nhật [types.ts](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%2520ke/src/types.ts) để bổ sung cấu hình `logsEnabled`, `userName` và `googleSheetsUrl` vào `ContractSettings`.
- [x] Task 1.Final: 🧪 Test & Verify Phase 1 (Bắt buộc)

## Phase 2: Thiết lập giao diện Cài đặt (Settings UI)

**Mục tiêu:** Cho phép người dùng bật/tắt ghi nhật ký, tùy biến tên người dùng thao tác, và cấu hình động URL Apps Script Web App.

- [x] Task 2.1: Cập nhật [SettingsView.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/components/SettingsView.tsx) thêm checkbox bật/tắt log, ô nhập Tên người dùng, và ô cấu hình URL Google Sheets.
- [x] Task 2.2: Đồng bộ cấu hình log với `localStorage` và cập nhật thông số log ngầm trong [App.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/App.tsx).
- [x] Task 2.Final: 🧪 Test & Verify Phase 2 (Bắt buộc)

## Phase 3: Tích hợp ghi nhật ký vào các phân hệ nghiệp vụ

**Mục tiêu:** Ghi nhận mọi hành vi của người dùng trong các View nghiệp vụ.

- [x] Task 3.1: Thêm log khi tải tệp, sửa dòng chứng từ, và xuất Excel ở [LuanChuyenView.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/components/LuanChuyenView.tsx).
- [x] Task 3.2: Thêm log khi tải tệp, sửa dòng chứng từ, và xuất Excel ở [HopDongMoiView.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/components/HopDongMoiView.tsx).
- [x] Task 3.3: Thêm log khi tải tệp, sửa dòng chứng từ, và xuất Excel ở [BangKeView.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/components/BangKeView.tsx).
- [x] Task 3.Final: 🧪 Test & Verify Phase 3 (Bắt buộc)

---

## Execution Log

| Thời gian | Phase | Task | Hành động | Trạng thái | Ghi chú |
|-----------|-------|------|-----------|-----------|---------|
| [2026-06-20 12:45] | [Phase 0] | [Plan] | Lập kế hoạch & Tasks | done | |
| [2026-06-20 13:33] | [Phase 1] | [Task 1.1] | Bắt đầu nâng cấp GAS | start | |
| [2026-06-20 13:35] | [Phase 1] | [Task 1.1] | Hoàn thành nâng cấp GAS | done | Đã tích hợp action: 'log' |
| [2026-06-20 13:36] | [Phase 1] | [Task 1.2] | Bắt đầu thêm writeActionLogToSheet | start | |
| [2026-06-20 13:38] | [Phase 1] | [Task 1.2] | Hoàn thành thêm writeActionLogToSheet | done | Đã hoàn thành helper log |
| [2026-06-20 13:39] | [Phase 1] | [Task 1.3] | Bắt đầu cập nhật types.ts | start | |
| [2026-06-20 13:41] | [Phase 1] | [Task 1.3] | Hoàn thành cập nhật types.ts | done | Đã bổ sung types |
| [2026-06-20 13:42] | [Phase 1] | [Task 1.Final] | Bắt đầu kiểm thử Phase 1 | start | Tự động chạy type check |
| [2026-06-20 13:43] | [Phase 1] | [Task 1.Final] | Hoàn thành kiểm thử Phase 1 | done | Type check thành công |
| [2026-06-20 13:44] | [Phase 2] | [Task 2.1] | Bắt đầu chỉnh sửa SettingsView.tsx | start | |
| [2026-06-20 13:46] | [Phase 2] | [Task 2.1] | Hoàn thành chỉnh sửa SettingsView.tsx | done | Thêm các controls UI thành công |
| [2026-06-20 13:47] | [Phase 2] | [Task 2.2] | Bắt đầu tích hợp App.tsx | start | |
| [2026-06-20 13:49] | [Phase 2] | [Task 2.2] | Hoàn thành tích hợp App.tsx | done | Đồng bộ lưu/tải log config thành công |
| [2026-06-20 13:50] | [Phase 2] | [Task 2.Final] | Kiểm thử Phase 2 | done | Compile type check (tsc) thành công không lỗi |
| [2026-06-20 13:52] | [Phase 3] | [Task 3.1 - 3.3] | Tích hợp logging vào các phân hệ | done | Đã tích hợp hàm writeActionLogToSheet |
| [2026-06-20 13:55] | [Phase 3] | [Task 3.Final] | Bắt đầu kiểm thử Phase 3 | start | Chạy compile type check thành công |
| [2026-06-20 14:47] | [Phase 3] | [GAS update] | Khóa cứng Spreadsheet ID mới | done | Cập nhật google_apps_script.js dùng openById('1-_xq6s9A4mYC6NyQoxZQfMoKz7SqkpW1Oq0iPpu7O-o') |
| [2026-06-20 14:57] | [Phase 3] | [GAS update] | Tách biệt luồng Master Data và Logs | done | Master Data ghi vào active sheet, Logs ghi vào sheet mới ID 1-_xq6s9A4mYC6NyQoxZQfMoKz7SqkpW1Oq0iPpu7O-o |
| [2026-06-20 15:12] | [Phase 3] | [UI update] | Ẩn giao diện cấu hình log | done | Ẩn cấu hình log trên UI, sử dụng cấu hình mặc định tự động trong code |

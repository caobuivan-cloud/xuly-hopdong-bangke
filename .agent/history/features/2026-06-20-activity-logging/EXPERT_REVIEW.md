---
source: expert-rebuttal-codex
feature: activity-logging
round: 3
timestamp: 2026-06-20T12:36:20.6910325+07:00
verdict: ⚠️ CÒN FINDING
---

# Expert Review - Codex Desktop

## Tóm tắt
- Findings mới: 2
- Findings đã dedupe/không lặp: 1 verdict hội tụ cũ từ `EXPERT_REVIEW.md` round 2, không lặp lại vì review pass này tìm gap mới theo code hiện tại.
- Vùng đã scan:
  - `.agent/active/activity-logging/FEATURE_PLAN.md:15-34,85-94`
  - `.agent/active/activity-logging/FEATURE_TASKS.md:16-40`
  - `src/services/dbService.ts:106-268`
  - `src/App.tsx:46-175,365-390`
  - `src/types.ts:37-46`
  - `src/components/SettingsView.tsx:102-135,178-252,255-450`
  - `google_apps_script.js:17-67`

## Findings Cần Antigravity Phản Biện

### EFR-01: `googleSheetsUrl` động chưa được ràng vào contract của sync/log service [P1][High]
- Issue: Plan yêu cầu URL Apps Script không hardcode và cho phép đổi từ `SettingsView`, nhưng checklist chỉ thêm field `googleSheetsUrl` vào `ContractSettings`/UI mà chưa bắt buộc refactor các hàm service hiện hữu để dùng URL động. Với code hiện tại, `pullAllFromGoogleSheets`, `pushAllToGoogleSheets`, và `hasValidGoogleSheetsUrl` đều đọc `GOOGLE_SHEETS_SCRIPT_URL` module-level, nên implementation có thể thêm ô URL mà sync/log vẫn gửi sang URL cũ.
- Evidence:
  - `FEATURE_PLAN.md:18` yêu cầu Web App URL không hardcode hoàn toàn và cấu hình từ UI.
  - `FEATURE_PLAN.md:22` yêu cầu `googleSheetsUrl` trong `localStorage` và `SettingsView`.
  - `FEATURE_TASKS.md:20-30` chỉ liệt kê thêm API log, helper log, field config, UI và đồng bộ tham số log, không có task đổi chữ ký/nguồn URL của `hasValidGoogleSheetsUrl`, `pullAllFromGoogleSheets`, `pushAllToGoogleSheets`.
  - `src/services/dbService.ts:106-118` định nghĩa và validate `GOOGLE_SHEETS_SCRIPT_URL` cố định.
  - `src/services/dbService.ts:125-136` `pullAllFromGoogleSheets()` không nhận config/url và fetch bằng constant.
  - `src/services/dbService.ts:229-251` `pushAllToGoogleSheets(currentConfig)` nhận config nhưng vẫn fetch bằng constant.
  - `src/App.tsx:90-95,125,153,171` gọi validate/pull/push theo API không truyền URL động.
- Impact: Người dùng đổi URL trong Setup nhưng auto pull/push hoặc `writeActionLogToSheet` vẫn có nguy cơ ghi vào spreadsheet cũ. Đây là sai mục tiêu dữ liệu trực tiếp, đặc biệt nguy hiểm vì log kế toán sẽ bị gửi nhầm nơi trong khi UI báo đã cấu hình URL mới.
- Required Fix: Bổ sung task/contract rõ ràng: `googleSheetsUrl` là nguồn URL duy nhất cho sync và logging. Refactor `hasValidGoogleSheetsUrl(url)`, `pullAllFromGoogleSheets(url)`, `pushAllToGoogleSheets(currentConfig, url)` hoặc một helper đọc `currentConfig.googleSheetsUrl`; cập nhật `App.tsx`/`SettingsView.tsx` truyền URL hiện tại cho auto pull, manual pull, manual push, auto-push config, và `writeActionLogToSheet`.

### EFR-02: Checklist bỏ sót logging cho upload/xóa Master Data và Sync Pull/Push trong Settings [P2][High]
- Issue: Scope nói rõ nhóm Hệ thống/Cấu hình phải log bật/tắt log, lưu cấu hình, nạp/xóa danh mục Master Data, chạy Sync Pull/Push. Tuy nhiên tasks hiện tại chỉ thêm UI logging config và tham số log ngầm trong `App.tsx`; không có task cụ thể để gắn `writeActionLogToSheet` vào các handler Settings đang thực hiện upload master, clear master, manual pull/push, và auto-push sau upload/delete.
- Evidence:
  - `FEATURE_PLAN.md:29-34` liệt kê logging cho Hệ thống/Cấu hình, bao gồm nạp/xóa Master Data và Sync Pull/Push.
  - `FEATURE_TASKS.md:25-31` Phase 2 chỉ yêu cầu thêm control Settings và đồng bộ config log với `localStorage`/`App.tsx`.
  - `FEATURE_TASKS.md:33-40` Phase 3 chỉ gắn log vào `LuanChuyenView`, `HopDongMoiView`, `BangKeView`, không nhắc các handler Settings/Master Data.
  - `src/components/SettingsView.tsx:102-135` có `handlePullGoogleSheets` và `handlePushGoogleSheets`.
  - `src/components/SettingsView.tsx:255-413` có `handleMasterUpload`, lưu departments/customers/products và auto `onManualPush`.
  - `src/components/SettingsView.tsx:415-450` có `handleClearMaster`, xóa local master data và auto `onManualPush`.
- Impact: Sau khi implement đúng checklist, các thao tác thay đổi master data và sync hệ thống vẫn có thể không tạo dòng `ActivityLogs`, dù đây là nhóm hành vi kiểm soát dữ liệu quan trọng nhất. Acceptance “các thao tác chính” sẽ pass nếu chỉ test tải/sửa/xuất ở 3 view nghiệp vụ, nhưng audit trail thiếu các thay đổi cấu hình/master data.
- Required Fix: Bổ sung task Phase 2 hoặc Phase riêng cho Settings logging: gọi `writeActionLogToSheet` khi lưu cấu hình, bật/tắt log, manual pull/push, upload từng loại master data kèm số dòng/tên file, clear từng loại master data, và kết quả lỗi/thành công nếu không làm gián đoạn UI. Test strategy cần có bước kiểm tra các event Settings này xuất hiện trong `ActivityLogs`.

## Không Raise Vì Thiếu Evidence / Đã Được Cover
- Không raise việc GAS hiện tại chưa có `ActivityLogs` vì Task 1.1 đã cover rõ `action === 'log'` và tự động khởi tạo sheet.
- Không raise việc các view nghiệp vụ chưa có logging vì Task 3.1-3.3 đã cover trực tiếp 3 view chính.

## Kết Luận
- Gửi file này cho `expert-rebuttal`.
- Chưa hội tụ trong phạm vi scan vì còn 2 finding mới có evidence cần Antigravity phản biện hoặc cập nhật plan/tasks.

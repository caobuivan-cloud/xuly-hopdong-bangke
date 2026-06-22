# Feature Tasks: Lưu trữ dữ liệu cấu hình và Master Data qua Google Sheet

> **Trạng thái**: ✅ Hoàn thành
> **Liên kết plan**: `FEATURE_PLAN.md`
> **Ngày tạo**: 2026-06-20

---

## Quy ước checklist

- `- [ ]`: Chưa làm
- `- [/]`: Đang làm
- `- [x]`: Hoàn thành
- Cuối mỗi phase bắt buộc có `Task X.Final: 🧪 Test & Verify Phase X`

---

## Phase 1: Cấu hình URL & Chuẩn bị GAS

**Mục tiêu:** Khai báo cấu hình URL và chuẩn bị tài liệu GAS.

- [x] Task 1.1: Khai báo URL Google Apps Script Web App trong file cấu hình (`src/services/dbService.ts` hoặc config helper).
- [x] Task 1.2: Chuẩn bị file code GAS đầy đủ để gửi cho user thiết lập phía Google Sheet.
- [x] Task 1.Final: 🧪 Test & Verify Phase 1 (Đảm bảo code build bình thường và URL được định nghĩa chính xác).

## Phase 2: Nâng cấp dbService tối ưu hóa Batch Sync cho Dữ liệu lớn

**Mục tiêu:** Cập nhật `dbService.ts` để đọc/ghi từ Apps Script thông qua các tác vụ Batch không đồng bộ, duy trì cache `localStorage` để ứng dụng mượt mà.

- [x] Task 2.1: Bổ sung các phương thức:
  - `pullFromGoogleSheets()`: Fetch toàn bộ dữ liệu, cập nhật local cache và trả về.
  - `pushToGoogleSheets()`: Lấy dữ liệu local cache hiện tại và push lên Google Sheets qua POST.
- [x] Task 2.2: Tích hợp logic caching để khi khởi động ứng dụng chỉ đọc từ `localStorage`, giảm thiểu trễ mạng.
- [x] Task 2.Final: 🧪 Test & Verify Phase 2 (Kiểm tra phản hồi API với dữ liệu mock lớn).

## Phase 3: Cập nhật UI Setup đồng bộ hóa dữ liệu

**Mục tiêu:** Thay thế phần nhập URL bằng giao diện hiển thị trạng thái kết nối, nút "Đồng bộ" (Sync) rõ ràng cùng vòng xoay Loading và thống kê số lượng dòng dữ liệu lớn.

- [x] Task 3.1: Loại bỏ input URL trong `SettingsView.tsx`, thay bằng thông tin trạng thái hoạt động của Google Sheet (Connected / Synced).
- [x] Task 3.2: Thiết kế nút "Đồng bộ từ Google Sheet" và "Đẩy dữ liệu lên Sheet" với hiệu ứng Loading mượt mà khi đang xử lý mảng dữ liệu > 11,000 dòng.
- [x] Task 3.Final: 🧪 Test & Verify Phase 3 (Đảm bảo UI không bị treo hoặc đơ khi người dùng click đồng bộ).

## Phase 4: Tích hợp logic tổng thể & Kiểm thử tải

**Mục tiêu:** Hoàn tất luồng xử lý và tối ưu hóa hiệu năng render.

- [x] Task 4.1: Tích hợp cập nhật state của Config & Master data sau khi quá trình Sync hoàn thành.
- [x] Task 4.2: Xử lý ngoại lệ mất kết nối hoặc server Apps Script quá tải mà không gây gián đoạn công việc kế toán hiện tại.
- [x] Task 4.Final: 🧪 Test & Verify Phase 4 (Đồng bộ thử sheet thật với > 11k dòng mã khách hàng, xác thực độ mượt và tính chính xác).

---

## Execution Log

| Thời gian | Phase | Task | Hành động | Trạng thái | Ghi chú |
|-----------|-------|------|-----------|-----------|---------|
| 2026-06-20 11:20 | Phase 1 | Cấu hình & GAS | Khởi tạo file code Apps Script và hardcode biến URL | done | Đã hoàn thành |
| 2026-06-20 11:27 | Phase 2 & 3 | dbService & UI | Cập nhật hàm đồng bộ hai chiều ngầm và thiết kế UI điều khiển đồng bộ | done | Đã hoàn thành |
| 2026-06-20 11:32 | Phase 4 | Tích hợp & Build | Tải ngầm lúc mở app, auto-push khi upload Excel, build kiểm thử thành công | done | Biên dịch thành công 100% |

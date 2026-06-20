# Feature Plan: Nhật ký hoạt động người dùng qua Google Sheets

> **Trạng thái**: ✅ ĐỒNG Ý
> **Review gate**: [Đã thông qua review hội đồng chuyên môn ngày 2026-06-20]
> **Feature slug**: `activity-logging`
> **Tạo bởi**: feature-plan
> **Ngày tạo**: 2026-06-20

---

## 1. Bối cảnh và mục tiêu

- **Bối cảnh:** Cần ghi lại nhật ký hoạt động (user action logs) của kế toán viên khi thao tác trên ứng dụng (nhập file, chỉnh sửa dòng chứng từ, xuất file Excel kế toán, lưu cấu hình...) để đồng bộ lên Google Sheet phục vụ mục đích kiểm soát dữ liệu (tương tự dự án `XuLyBaoCo_Ngoc`).
- **Vấn đề cần giải quyết:** 
  - Google Sheet đích đã được định vị tại: `https://docs.google.com/spreadsheets/d/1-_xq6s9A4mYC6NyQoxZQfMoKz7SqkpW1Oq0iPpu7O-o/`.
  - Script GAS hiện tại trong `google_apps_script.js` mới chỉ hỗ trợ `read_all` và `save_all` cấu hình/master data, chưa có api và bảng để lưu nhật ký.
  - Phía client-side cần một service log bất đồng bộ phi tuần tự (fire-and-forget) chạy ngầm qua mode `"no-cors"` để không block UI chính khi gửi log và tránh lỗi CORS.
  - URL Web App Apps Script không được hardcode hoàn toàn mà cần cho phép cấu hình linh hoạt từ giao diện (SettingsView) để người dùng dễ dàng chuyển đổi sang spreadsheet mới.
- **Mục tiêu:**
  - Bổ sung sheet `"ActivityLogs"` và hàm xử lý ghi log (`action === 'log'`) vào Google Apps Script.
  - Xây dựng helper `writeActionLogToSheet` và tích hợp vào tất cả các điểm thay đổi dữ liệu hoặc tác vụ quan trọng trên UI.
  - Cung cấp cấu hình bật/tắt ghi nhật ký (`logsEnabled`), tên người dùng (`userName`), và URL Google Sheets Web App (`googleSheetsUrl`) trong `localStorage` và `SettingsView`.

## 2. Phạm vi

### In scope
- Cập nhật file [google_apps_script.js](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/google_apps_script.js) bổ sung code GAS để tự động tạo sheet `ActivityLogs` và xử lý request POST log từ client.
- Cập nhật [dbService.ts](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%2520ke/src/services/dbService.ts) bổ sung hàm `writeActionLogToSheet` gửi POST request ngầm (no-cors) với try-catch bắt lỗi chặt chẽ, không ném exception làm crash UI.
- Tích hợp ghi log trong các phân hệ:
  - **Hệ thống/Cấu hình:** Bật/tắt log, lưu cấu hình, nạp/xóa danh mục Master Data, chạy Sync Pull/Push.
  - **Hợp đồng luân chuyển:** Tải file đối soát, sửa tay dòng chứng từ, xuất file Excel luân chuyển.
  - **Hợp đồng mới:** Tải file đối soát, sửa tay dòng chứng từ, xuất file Excel hợp đồng mới.
  - **Bảng kê:** Tải file đối soát, sửa tay dòng chứng từ, xuất file Excel hợp đồng cũ/mới.
- Bổ sung các trường cấu hình log trên UI [SettingsView.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/components/SettingsView.tsx) gồm: Checkbox Bật/Tắt Log, Ô nhập Tên người dùng hạch toán, Ô nhập URL Apps Script Web App của Google Sheet mới.

### Out of scope
- Hệ thống phân quyền/login nâng cao.

## 3. Đối chiếu Knowledge Base

- **Quyết định kế thừa:**
  - Kế thừa cơ chế call API dạng Batch/Text Plain sang Google Apps Script để tránh CORS preflight và tối ưu hóa tốc độ.
- **"Cấm kỵ" cần tránh:**
  - Không được chặn (block) thread giao diện chính của người dùng khi gửi log lên Google Sheet.
  - Mọi lỗi mạng hoặc HTTP error khi ghi log phải được bắt (try-catch) cục bộ và chỉ log ra `console.error`, không ném ra ngoài làm crash app hoặc hiển thị alert khó chịu cho người dùng.

## 4. Giả định và câu hỏi mở

### Giả định
- Người dùng sử dụng Spreadsheet đích là `https://docs.google.com/spreadsheets/d/1-_xq6s9A4mYC6NyQoxZQfMoKz7SqkpW1Oq0iPpu7O-o/` để gắn với Apps Script Web App và cấu hình URL Web App vào giao diện.

### Câu hỏi mở
- *Không có câu hỏi blocking.* Chúng tôi sẽ thiết lập mặc định giá trị tên người dùng ghi log là `"Kế toán viên"`.

## 5. Acceptance Criteria

- [ ] Sheet `"ActivityLogs"` tự động được tạo trên spreadsheet mục tiêu khi có request log đầu tiên hoặc khi khởi tạo.
- [ ] Ghi nhận log chứa đủ 4 cột: `Timestamp`, `User`, `Action`, `Details`.
- [ ] Các thao tác chính (Tải file, Sửa dòng, Xuất Excel, Đồng bộ cấu hình) được gửi log thành công lên Google Sheets.
- [ ] Khi offline hoặc URL GAS bị lỗi, ứng dụng vẫn hoạt động bình thường, không hiển thị thông báo lỗi ghi log làm gián đoạn kế toán.
- [ ] Cho phép người dùng bật/tắt tính năng ghi log, đổi tên hạch toán và đổi URL Google Sheets Web App tại màn hình Setup.

## 6. Files và modules bị ảnh hưởng

| File/Module | Hành động | Lý do chạm vào | Rủi ro | Contract |
|-------------|-----------|----------------|--------|----------|
| `google_apps_script.js` | Sửa | Bổ sung API `action === 'log'` và tạo tự động sheet `ActivityLogs` | 🟢 Thấp | Chưa |
| `src/types.ts` | Sửa | Thêm `logsEnabled`, `userName` và `googleSheetsUrl` vào cấu hình | 🟢 Thấp | Chưa |
| `src/services/dbService.ts` | Sửa | Thêm hàm `writeActionLogToSheet` và helper logging | 🟢 Thấp | Có |
| `src/App.tsx` | Sửa | Đăng ký sự kiện tải trang, cấu hình trạng thái log chung | 🟡 Trung bình | Có |
| `src/components/SettingsView.tsx` | Sửa | Thêm control bật/tắt log, chỉnh sửa Tên người dùng, đổi URL Web App | 🟢 Thấp | Có |
| `src/components/LuanChuyenView.tsx` | Sửa | Bắn log khi load file, sửa dòng, xuất Excel | 🟢 Thấp | Chưa |
| `src/components/HopDongMoiView.tsx` | Sửa | Bắn log khi load file, sửa dòng, xuất Excel | 🟢 Thấp | Chưa |
| `src/components/BangKeView.tsx` | Sửa | Bắn log khi load file, sửa dòng, xuất Excel | 🟢 Thấp | Chưa |

## 7. Risk Triage và Review Focus

- **Review required:** Yes
- **Risk hotspots:** Tránh gọi fetch đồng bộ (sync) gây đơ UI; bẫy lỗi tốt khi gọi API `no-cors` do fetch sẽ trả về opaque response.
- **Review focus areas:** Đảm bảo các component nghiệp vụ con nhận config phản hồi tức thời (reactive) khi thay đổi cấu hình log trên UI Setup.

## 8. Chiến lược triển khai

- **Phase strategy:**
  - **Phase 1:** Cập nhật GAS (`google_apps_script.js`), Database Service (`dbService.ts`) và interface cấu hình (`src/types.ts`).
  - **Phase 2:** Tích hợp giao diện Cài đặt nhật ký log (`SettingsView.tsx` & `App.tsx`).
  - **Phase 3:** Tích hợp logging vào 3 phân hệ nghiệp vụ (`LuanChuyenView`, `HopDongMoiView`, `BangKeView`).
- **Thứ tự triển khai:** Triển khai API/Service trước, tích hợp UI sau cùng.

## 9. Test Strategy

- **Manual verification:**
  - Chạy app local, thực hiện tải file, chỉnh sửa dòng và kiểm tra sheet `"ActivityLogs"` xem các dòng log có tự động được thêm vào hay không.
  - Ngắt mạng (offline) và thực hiện thao tác xem app có hoạt động bình thường không.

## 10. Rollback Plan

- Khôi phục phiên bản code trước đó của `src/` và `google_apps_script.js` bằng git checkout.

## 11. Tham chiếu thực thi

- Checklist chi tiết theo phase: `FEATURE_TASKS.md`

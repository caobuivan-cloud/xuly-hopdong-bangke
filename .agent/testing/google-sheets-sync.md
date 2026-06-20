# Kịch bản kiểm thử: Đồng bộ hóa lưu trữ Google Sheet

Kịch bản kiểm thử hành vi đồng bộ hóa cấu hình và dữ liệu gốc (Master Data) của ứng dụng với Google Sheet thông qua Apps Script Web App.

---

## 1. Happy Path: Đồng bộ hóa đầy đủ

- **Mục tiêu**: Xác minh dữ liệu được đồng bộ thành công cả 2 chiều (pull/push) tự động ngầm.
- **Các bước thực hiện**:
  1. Triển khai code GAS từ [google_apps_script.js](file:///d:/Project_VCC/KeToanVCC/google_apps_script.js) lên Google Sheets, cấu hình deploy chế độ Web App công khai (`Anyone`).
  2. Dán URL Web App vào biến `GOOGLE_SHEETS_SCRIPT_URL` trong [dbService.ts](file:///d:/Project_VCC/KeToanVCC/src/services/dbService.ts).
  3. Mở ứng dụng, kiểm tra log console xem có thông báo đồng bộ ngầm hoàn tất và hiển thị trạng thái `Đồng bộ Sheet: HH:MM:SS` ở header.
  4. Thực hiện chỉnh sửa một Rule ngoại lệ trong Setup, nhấn lưu. Kiểm tra trực tiếp trên Google Sheets (Sheet `ExceptionRules`) xem rule mới đã xuất hiện chưa.
  5. Thực hiện Import file Excel Master Data Khách hàng (> 11,000 dòng). Kiểm tra xem dữ liệu có tự động lưu vào Sheet `Customers` và giao diện thông báo đẩy thành công.
- **Kết quả kỳ vọng**: Dữ liệu khớp chính xác giữa Google Sheets và Local Storage của trình duyệt. Giao diện mượt mà, không giật lag khi tải > 11k dòng.

---

## 2. Edge Case: Hoạt động Ngoại tuyến (Offline Fallback)

- **Mục tiêu**: Đảm bảo ứng dụng hoạt động bình thường, không bị treo hoặc crash khi mất mạng hoặc URL Google Sheets bị sai cấu hình.
- **Các bước thực hiện**:
  1. Ngắt kết nối mạng Internet hoặc nhập URL Apps Script sai cấu hình (để trống hoặc URL không tồn tại).
  2. Tải lại trang.
  3. Kiểm tra xem ứng dụng có hiển thị thông báo lỗi đồng bộ ngầm ở Header (ví dụ: `Lỗi: Lỗi đồng bộ tự động`) nhưng các nghiệp vụ hạch toán, Setup dữ liệu master vẫn hoạt động bằng bộ nhớ đệm `localStorage` cục bộ bình thường.
- **Kết quả kỳ vọng**: Trải nghiệm người dùng không bị gián đoạn, ứng dụng chạy an toàn và tự động fallback về Local Cache.

---

## 3. Đồng bộ hóa xóa dữ liệu (Auto-clear sync)

- **Mục tiêu**: Xác minh khi xóa dữ liệu gốc ở local thì Google Sheet cũng tự động được dọn dẹp.
- **Các bước thực hiện**:
  1. Đảm bảo Google Sheets đã được nạp dữ liệu ở các Sheet `Departments` / `Customers` / `Products`.
  2. Trên giao diện tab Setup của ứng dụng, bấm nút Xóa (thùng rác) tại mục Master Data Bộ phận.
  3. Xác nhận xóa.
  4. Kiểm tra trên Google Sheet (Sheet `Departments`) xem dữ liệu đã được dọn sạch hay chưa.
- **Kết quả kỳ vọng**: Dữ liệu trên Google Sheet được dọn sạch đồng bộ sau khi local xóa.

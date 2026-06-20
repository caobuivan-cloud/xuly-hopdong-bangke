# Ca kiểm thử: Nhật ký hoạt động người dùng qua Google Sheets

Tài liệu này hướng dẫn cách kiểm thử thủ công và tự động luồng ghi nhận nhật ký hoạt động (User Action Logs) của kế toán viên lên Google Sheet mới.

---

## 1. Môi trường kiểm thử
- **React App**: Chạy local tại `http://localhost:3001`
- **Google Sheet đích ghi Log**: URL `https://docs.google.com/spreadsheets/d/1-_xq6s9A4mYC6NyQoxZQfMoKz7SqkpW1Oq0iPpu7O-o/`
- **Google Apps Script Web App**: URL deploy dạng `Anyone/Me`.

---

## 2. Các ca kiểm thử (Test Cases)

### Ca 1: Happy Path - Khởi động ứng dụng (Tự động)
- **Mô tả**: Khi người dùng tải lại trang web lần đầu, ứng dụng tự động gửi log khởi động.
- **Các bước thực hiện**:
  1. F5 hoặc truy cập vào trang `http://localhost:3001/`.
  2. Mở file Google Sheet mới.
  3. Kiểm tra sheet `ActivityLogs`.
- **Kết quả kỳ vọng**:
  - Tự động tạo sheet `ActivityLogs` nếu chưa tồn tại.
  - Xuất hiện dòng log dạng:
    - *Timestamp*: Thời gian thực tế của hệ thống.
    - *User*: "Kế toán viên".
    - *Action*: "Khởi động ứng dụng".
    - *Details*: "Đã mở trang đối chiếu Hợp đồng - Bảng kê".

### Ca 2: Happy Path - Tải file và Xử lý file (Nghiệp vụ)
- **Mô tả**: Tải file Excel lên và xử lý, xác nhận log được bắn ngầm.
- **Các bước thực hiện**:
  1. Sang phân hệ **Hợp đồng luân chuyển**.
  2. Kéo thả file Hợp đồng cứng mẫu vào vùng upload.
  3. Bấm nút **Xử lý**.
- **Kết quả kỳ vọng**:
  - Giao diện phản hồi ngay lập tức, không bị đơ hoặc lag trong lúc gửi log.
  - Trên Google Sheet ghi nhận 2 dòng log tương ứng:
    - *Dòng 1*: Tải file Hợp đồng luân chuyển (Details: Tải lên tệp: [Tên file]).
    - *Dòng 2*: Xử lý hợp đồng luân chuyển (Details: Xử lý thành công [N] dòng dữ liệu).

### Ca 3: Happy Path - Chỉnh sửa thủ công dòng dữ liệu (Inline Edit)
- **Mô tả**: Người dùng thay đổi thông tin hạch toán ngay trên bảng hiển thị kết quả.
- **Các bước thực hiện**:
  1. Click đúp chọn ô **Mã vụ việc** (hoặc Mã khách, Bộ phận...) của một dòng.
  2. Chọn một mã vụ việc khác từ danh sách gợi ý.
- **Kết quả kỳ vọng**:
  - Trên Google Sheet ghi nhận dòng log sửa đổi:
    - *Action*: "Sửa dòng hợp đồng luân chuyển".
    - *Details*: "Thay đổi trường [Tên trường] của hợp đồng [Mã HĐ] từ [Giá trị cũ] sang [Giá trị mới]".

### Ca 4: Happy Path - Xuất dữ liệu Excel chuẩn
- **Mô tả**: Người dùng bấm xuất file Excel.
- **Các bước thực hiện**:
  1. Nhấp nút **Excel** ở thanh công cụ góc trên.
  2. Tải tệp tin Excel kết quả xuống máy tính.
- **Kết quả kỳ vọng**:
  - Tải file Excel thành công.
  - Trên Google Sheet ghi nhận dòng log:
    - *Action*: "Xuất Excel hợp đồng luân chuyển".
    - *Details*: "Xuất thành công tệp Excel chứa [N] dòng."

### Ca 5: Phân luồng dữ liệu (Master Data vs Logs)
- **Mô tả**: Kiểm tra đồng bộ Master Data vẫn diễn ra trên file sheet cũ, còn Logs đổ về file mới.
- **Các bước thực hiện**:
  1. Vào màn hình **Cài đặt**.
  2. Nhấp nút **Đồng bộ Tải (Pull)** hoặc **Đồng bộ Gửi (Push)**.
- **Kết quả kỳ vọng**:
  - Master data được kéo/đẩy thành công với file Sheet cũ.
  - Trên file Google Sheet mới, tab `ActivityLogs` ghi nhận log đồng bộ thành công.

### Ca 6: Fallback an toàn (Mất mạng / Sai URL)
- **Mô tả**: Đảm bảo ứng dụng không crash khi API Google Sheets không phản hồi.
- **Các bước thực hiện**:
  1. Ngắt kết nối mạng của máy tính hoặc dán một URL Web App không hợp lệ vào code.
  2. Thực hiện tải file và chỉnh sửa dòng dữ liệu trên UI.
- **Kết quả kỳ vọng**:
  - Giao diện web vẫn hoạt động bình thường, cho phép sửa đổi và tải file bình thường.
  - Chỉ xuất hiện lỗi kết nối in ở Console (`console.error`), không có thông báo alert/popup lỗi làm gián đoạn kế toán viên.

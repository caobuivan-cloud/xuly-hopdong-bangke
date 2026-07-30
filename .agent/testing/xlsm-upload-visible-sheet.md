# Test Cases - XLSM Upload và Nhận Diện Sheet Unhide Đầu Tiên

> Tạo ngày: 2026-07-30
> Liên kết feature: `không áp dụng`
> Phạm vi: Bug fix / Upload / Excel Parser

---

## 1. Mục tiêu kiểm thử

- Đảm bảo hệ thống cho phép tải lên tệp Excel có định dạng chứa Macro (`.xlsm`) ở tất cả các luồng tải lên.
- Đảm bảo hệ thống nhận diện chính xác danh sách các sheet hiển thị (unhidden/visible) và chỉ xử lý duy nhất sheet hiển thị đầu tiên trong file.
- Không đọc và không xử lý các sheet đã bị ẩn (hidden/veryHidden) nhằm tránh sai lệch dữ liệu do đọc các sheet giới thiệu hoặc sheet rác đầu file.

## 2. Tiền điều kiện

- Có sẵn các tệp Excel mẫu để kiểm thử:
  - Một tệp `.xlsm` có sheet đầu tiên (theo thứ tự sắp xếp trong workbook) bị ẩn (ví dụ: sheet `HD`), tiếp theo là sheet hiển thị chứa dữ liệu (ví dụ: `bảng Kê tháng 7.2026`).
  - Một tệp `.xlsm` hoặc `.xlsx` thông thường không có sheet ẩn.
  - Một tệp Excel có tất cả các sheet đều bị ẩn (nếu có thể tạo được từ Excel).

## 3. Happy Path

| ID | Bước kiểm thử | Kết quả mong đợi |
|----|----------------|------------------|
| HP-01 | Tải lên tệp `.xlsm` có chứa sheet ẩn đầu tiên (ví dụ sheet `HD` bị ẩn, sheet `bảng Kê tháng 7.2026` hiển thị đầu tiên) tại màn hình Bảng kê. | Hệ thống bỏ qua sheet ẩn `HD`, đọc đúng sheet hiển thị đầu tiên là `bảng Kê tháng 7.2026` và render dữ liệu xem trước chính xác. |
| HP-02 | Tải lên tệp `.xlsx` thông thường không có sheet ẩn tại màn hình Hợp đồng mới. | Hệ thống đọc bình thường sheet đầu tiên trong file và hiển thị dữ liệu xem trước chuẩn xác. |

## 4. Edge / Regression

| ID | Bước kiểm thử | Kết quả mong đợi |
|----|----------------|------------------|
| RG-01 | Tải tệp `.xlsm` có chứa Macro nhưng không có sheet ẩn lên phần Cập nhật Master Data trong màn hình Cấu hình. | Tệp được tải lên và parse thành công mà không gặp lỗi định dạng nhị phân. |

## 5. Negative Cases

| ID | Bước kiểm thử | Kết quả mong đợi |
|----|----------------|------------------|
| NG-01 | Tải lên tệp Excel mà tất cả các sheet trong workbook đều bị ẩn (hoặc workbook trống không có sheet hợp lệ). | Hệ thống ném ra lỗi rõ ràng: "File Excel rỗng hoặc không có sheet hợp lệ." và hiển thị popup cảnh báo cho người dùng. |

## 6. Security / Permission

| ID | Bước kiểm thử | Kết quả mong đợi |
|----|----------------|------------------|
| SC-01 | Tải tệp `.xlsm` chứa đoạn script Macro độc hại lên hệ thống. | Trình duyệt chỉ đọc dữ liệu thô (ArrayBuffer) thông qua thư viện SheetJS để kết xuất bảng tính ở phía Client mà không kích hoạt hay thực thi bất kỳ mã VBA Macro nào trên máy người dùng. |

## 7. Ghi chú regression

- Cần kiểm tra lại luồng import Master Data xem việc nhận dạng file `.xlsm` có hoạt động tương tự không.

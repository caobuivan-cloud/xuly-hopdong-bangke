# Test Cases - Loại bỏ dòng Giá trị vv VAT trống hoặc Tỷ lệ CK 100 khi xuất Excel

> Tạo ngày: 2026-06-23
> Liên kết feature: `exclude-empty-vat-and-100-discount-on-export`
> Phạm vi: Feature

---

## 1. Mục tiêu kiểm thử

- Đảm bảo các dòng có `Giá trị của vv VAT` trống (null/undefined/chuỗi rỗng) bị loại bỏ khi xuất file Excel.
- Đảm bảo các dòng có `Tỷ lệ chiết khấu` bằng 100% (tyLeCk = 100) bị loại bỏ khi xuất file Excel.
- Đảm bảo giao diện hiển thị danh sách dòng trên UI vẫn được giữ nguyên đầy đủ để người dùng có thể xem và sửa trực tiếp trước khi xuất.
- Đảm bảo số lượng hiển thị trên nút "Excel" trên header phản ánh chính xác số dòng thực tế sẽ được xuất (sau khi lọc bỏ).
- Đảm bảo việc lọc không ảnh hưởng đến màn hình Bảng kê (`BangKeView.tsx`).

## 2. Tiền điều kiện

- Ứng dụng đang chạy ở môi trường local.
- Chuẩn bị file Excel mẫu chứa các trường hợp hợp lệ và không hợp lệ:
  - Trường hợp trống VAT.
  - Trường hợp Tỷ lệ chiết khấu = 100.
  - Trường hợp vừa trống VAT vừa có chiết khấu = 100.
  - Trường hợp hợp lệ thông thường.

## 3. Happy Path

| ID | Bước kiểm thử | Kết quả mong đợi |
|----|----------------|------------------|
| HP-01 | Mở màn hình "Hợp đồng luân chuyển" -> Upload tệp Excel Hợp đồng luân chuyển chứa 5 dòng (2 dòng hợp lệ, 1 dòng trống `Giá trị của vv VAT`, 1 dòng có `Chiết khấu` = 100, 1 dòng trống VAT và chiết khấu = 100) -> Nhấn nút Xử lý. | - Bảng UI hiển thị đủ 5 dòng.<br>- Nút "Excel" trên header hiển thị số đếm là `2` dòng.<br>- Khi nhấn xuất Excel, file tải xuống chứa đúng 2 dòng hợp lệ. |
| HP-02 | Mở màn hình "Hợp đồng mới" -> Upload tệp Excel Hợp đồng mới chứa 4 dòng (2 dòng hợp lệ, 1 dòng trống `Giá trị của vv VAT`, 1 dòng có `Chiết khấu` = 100) -> Nhấn nút Xử lý. | - Bảng UI hiển thị đủ 4 dòng.<br>- Nút "Excel" hiển thị số đếm là `2` dòng.<br>- File Excel tải xuống chứa đúng 2 dòng hợp lệ. |
| HP-03 | Mở màn hình "Bảng kê" -> Upload tệp Bảng kê -> Nhấn xử lý và xuất Excel. | Danh sách dòng Bảng kê được xuất đầy đủ và không bị lọc bỏ dòng dựa trên VAT trống hay Chiết khấu = 100 (Out of scope). |

## 4. Edge / Regression

| ID | Bước kiểm thử | Kết quả mong đợi |
|----|----------------|------------------|
| RG-01 | Trên UI Hợp đồng luân chuyển/Hợp đồng mới, người dùng sửa thủ công một dòng không đủ điều kiện (VD: sửa Tỷ lệ chiết khấu từ 100 thành 0). | - Số lượng hiển thị trên nút "Excel" tự động cập nhật tăng lên.<br>- Khi xuất Excel, dòng vừa sửa được đưa vào danh sách xuất khẩu thành công. |
| RG-02 | Dòng có `Giá trị của vv VAT` bằng 0. | Hệ thống không loại bỏ dòng này vì giá trị 0 là giá trị số hợp lệ, không phải trống. |

## 5. Negative Cases

| ID | Bước kiểm thử | Kết quả mong đợi |
|----|----------------|------------------|
| NG-01 | Tải lên tệp Excel Hợp đồng luân chuyển/Hợp đồng mới mà toàn bộ các dòng đều không đủ điều kiện (trống VAT hoặc chiết khấu = 100). | - Bảng UI hiển thị các dòng đầy đủ.<br>- Nút "Excel" hiển thị số đếm `0` và bị disabled (không cho phép tải xuống file trống). |

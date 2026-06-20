# Test Cases - Tìm kiếm Master Data

> Tạo ngày: 2026-06-20
> Liên kết feature: `master-data-search`
> Phạm vi: Feature

---

## 1. Mục tiêu kiểm thử

- Đảm bảo người dùng có thể tìm kiếm dữ liệu trên cả 3 danh mục Master Data: Bộ phận thực hiện, Khách hàng, Sản phẩm/Vụ việc trong Cấu hình.
- Đảm bảo tìm kiếm hỗ trợ không phân biệt hoa thường, tiếng Việt không dấu (do hàm `stripVietnameseDiacritics`).
- Đảm bảo tìm kiếm bao phủ toàn bộ các trường hiển thị, đặc biệt là các trường kiểu số/optional (như thuế suất) không gây crash ứng dụng.

## 2. Tiền điều kiện

- Ứng dụng đang chạy ở môi trường local.
- Đã import dữ liệu mẫu cho cả 3 danh mục Master Data.

## 3. Happy Path

| ID | Bước kiểm thử | Kết quả mong đợi |
|----|----------------|------------------|
| HP-01 | Mở Cài đặt -> Mở tab Bộ phận thực hiện. Nhập mã sale (VD: "KD") hoặc tên bộ phận có dấu/không dấu (VD: "Kinh doanh"). | Danh sách tự động thu hẹp hiển thị các bộ phận khớp. counter hiển thị số dòng tương ứng. |
| HP-02 | Nhập từ khóa tìm kiếm Khách hàng (VD: nhập tên "Nguyễn" hoặc mã khách "KH001"). | Danh sách khách hàng được lọc chính xác. |
| HP-03 | Nhập mã vụ việc hoặc tên sản phẩm tại bảng Sản phẩm (VD: "Thiết kế"). | Bảng hiển thị các dòng tương ứng chuẩn xác. |
| HP-04 | Click nút "X" trên thanh tìm kiếm để xóa trắng từ khóa. | Ô tìm kiếm trống, danh sách hiển thị lại toàn bộ dữ liệu. |

## 4. Edge / Regression

| ID | Bước kiểm thử | Kết quả mong đợi |
|----|----------------|------------------|
| RG-01 | Tại bảng Sản phẩm, tìm kiếm theo số tài khoản doanh thu (VD: "51111") hoặc thuế suất kiểu số (VD: "8" hoặc "10"). | Hệ thống tự động chuyển kiểu số về chuỗi và tìm kiếm bình thường, không gây lỗi runtime. |
| RG-02 | Nhập từ khóa có nhiều ký tự khoảng trắng dư thừa hoặc ký tự đặc biệt. | Ứng dụng lọc bình thường, không crash hay sinh lỗi console. |

## 5. Negative Cases

| ID | Bước kiểm thử | Kết quả mong đợi |
|----|----------------|------------------|
| NG-01 | Nhập từ khóa không tồn tại trong danh sách (VD: "xyz123abc"). | Hiển thị thông báo: "Không tìm thấy kết quả nào khớp với “xyz123abc”." |

## 6. Ghi chú regression

- Cần kiểm tra xem layout ô tìm kiếm có hiển thị đẹp mắt và không bị vỡ giao diện trên các kích thước màn hình nhỏ.

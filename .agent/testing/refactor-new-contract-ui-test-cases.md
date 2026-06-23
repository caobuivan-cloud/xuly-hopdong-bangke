# Test Cases - Cải tiến UI và Logic Xuất Excel Hợp Đồng Mới

> Tạo ngày: 2026-06-23
> Liên kết feature: `refactor-new-contract-ui`
> Phạm vi: Frontend, UI/UX, Excel Export Logic

---

## 1. Mục tiêu kiểm thử

- Đảm bảo giao diện màn hình Hợp đồng mới được tối ưu: ẩn stats dashboard, hiển thị checkbox "Loại trừ HĐ cũ" kèm tooltip, cột "Trạng thái Fast" hiển thị thô và tích hợp thanh lọc tab lỗi chẩn đoán hạch toán.
- Kiểm thử logic đọc cột VAT: Hệ thống phải ưu tiên đọc "Giá trị của vv VAT" (hoặc các cột tương đương) từ file Excel nguồn trước khi tính toán.
- Kiểm thử xuất Excel (EFR-01): Số dòng xuất Excel (`eligibleExportRows`) phải độc lập hoàn toàn với bộ lọc đang hoạt động trên UI (tab lọc lỗi, từ khóa tìm kiếm, khoảng lọc) và tự động áp dụng bộ lọc loại bỏ hợp đồng cũ đã tồn tại trên Fast.
- Kiểm thử cấu trúc tệp xuất FAST: Khi xuất file FAST cho Hợp đồng mới (status = 2), các cột T (`Giá trị`), AC (`Chuyên trang`), AD (`Ghi chú chi tiết`), và AJ (`Tên sản phẩm`) phải trống hoàn toàn.

## 2. Tiền điều kiện

- Ứng dụng chạy local tại http://localhost:3000.
- Chuẩn bị file Excel "Hợp đồng mới" chứa cột "Giá trị của vv VAT" và một số dòng trùng lặp đã có trên Fast.
- Chuẩn bị file "Fast đối soát".

## 3. Happy Path

| ID | Bước kiểm thử | Kết quả mong đợi |
|----|----------------|------------------|
| HP-01 | Mở tab Hợp đồng mới. | Không thấy bảng stats dashboard và banner phân tích tệp đầu vào ở trên đầu. Checkbox hiển thị nhãn "Loại trừ HĐ cũ". |
| HP-02 | Di chuột vào Tooltip bên cạnh checkbox "Loại trừ HĐ cũ". | Tooltip hiển thị đầy đủ thông tin giải thích tính năng loại trừ. |
| HP-03 | Tải lên file Hợp đồng mới có cột "Giá trị của vv VAT" và thực hiện hạch toán. | Bảng preview hiển thị đúng cột "Giá trị của vv VAT" được đọc từ file nguồn, không bị tính toán lại theo công thức mặc định. |
| HP-04 | Nạp thêm file Fast đối soát. | Cột "Trạng thái Fast" trong bảng hiển thị text trạng thái thô (ví dụ: "1", "2") lấy từ Fast gốc, không có các badge KHỚP/CHƯA CÓ. |
| HP-05 | Lọc danh sách theo các tab chẩn đoán lỗi (ví dụ tab "Thiếu mã vụ việc" hoặc "Thiếu mã khách"). | Danh sách hiển thị trên UI được thu hẹp chính xác theo bộ lọc tab được chọn. |
| HP-06 | Nhấp nút xuất "Excel" khi đang ở một tab lọc lỗi bất kỳ (ví dụ "Thiếu mã vụ việc"). | Tệp xuất khẩu chứa toàn bộ các dòng hợp đồng mới hợp lệ (đã tự động áp dụng loại trừ HĐ cũ từ Fast đối soát), độc lập hoàn toàn với tab lọc đang chọn trên UI. |
| HP-07 | Mở file Excel FAST vừa xuất từ màn hình Hợp đồng mới (status = 2). | Các cột T (Giá trị), AC (Chuyên trang), AD (Ghi chú chi tiết) và AJ (Tên sản phẩm) trống hoàn toàn. |

## 4. Edge Case

| ID | Bước kiểm thử | Kết quả mong đợi |
|----|----------------|------------------|
| EG-01 | Tải file Hợp đồng mới KHÔNG chứa cột "Giá trị của vv VAT" nhưng chứa cột "Giá trị vụ việc VAT" hoặc "Gia tri cua vv VAT". | Hệ thống vẫn ưu tiên nhận diện và đọc đúng giá trị từ cột tương đương đó. |
| EG-02 | Tải file Hợp đồng mới KHÔNG chứa bất kỳ cột VAT nào ở trên. | Hệ thống tự động tính toán Giá trị VAT theo công thức `Thành tiền * Thuế suất` như bình thường. |

## 5. Negative Cases

| ID | Bước kiểm thử | Kết quả mong đợi |
|----|----------------|------------------|
| NG-01 | Nhấp nút Excel khi không có dòng nào đủ điều kiện xuất (ví dụ tất cả các dòng đều đã tồn tại trên Fast). | Nút xuất Excel bị disable hoặc hệ thống không cho phép tải file trống. |

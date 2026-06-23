# Test Cases - Điều chỉnh cột trống và định dạng tỷ lệ chiết khấu khi xuất Excel

> Tạo ngày: 2026-06-23
> Liên kết feature: `export-columns-null-and-percent-fix`
> Phạm vi: Feature / Bug fix / Regression

---

## 1. Mục tiêu kiểm thử

- Đảm bảo khi xuất Excel cho Hợp đồng luân chuyển và Bảng kê, các cột quy định (Giá trị, Bảng kê, stt) được bỏ trống đúng như mẫu FAST import.
- Đảm bảo tỷ lệ chiết khấu của Bảng kê xuất ra dạng số nguyên (ví dụ 19 thay vì 0.19) và hiển thị chính xác trên UI.
- Đảm bảo không xảy ra lỗi regression với luồng xuất Excel của Hợp đồng mới.

## 2. Tiền điều kiện

- Môi trường chạy local bằng Vite (`npm run dev`).
- Chuẩn bị file Excel mẫu:
  - File Hợp đồng luân chuyển (Hợp đồng cứng).
  - File Bảng kê chi tiết (có dòng chiết khấu là `19%` hoặc `0.19`).
  - File Hợp đồng mới.

## 3. Happy Path

| ID | Bước kiểm thử | Kết quả mong đợi |
|----|----------------|------------------|
| HP-01 | Upload file Hợp đồng cứng luân chuyển, click **Xử lý** rồi **Xuất Excel** | File Excel xuất ra có Cột T (`Giá trị`) trống, không bị điền `0`. |
| HP-02 | Upload file Bảng kê chi tiết, click **Xử lý** rồi **Xuất Excel** | File Excel xuất ra có Cột T (`Giá trị`), Cột AA (`Bảng kê`), Cột AI (`stt`) trống. Cột AB (`Tỷ lệ ck`) hiển thị `19`. |

## 4. Edge / Regression

| ID | Bước kiểm thử | Kết quả mong đợi |
|----|----------------|------------------|
| RG-01 | Upload file Bảng kê chi tiết có chiết khấu dạng `19%` và dạng `0.19` | Cả hai case đều được parse thành `19`, hiển thị `19%` trên giao diện, và xuất ra Excel là `19`. |
| RG-02 | Upload file Hợp đồng mới, click **Xử lý** rồi **Xuất Excel** | File Excel xuất ra có Cột T (`Giá trị`) và Cột AA (`Bảng kê`) chứa dữ liệu đầy đủ từ file nguồn (không bị để trống). |

## 5. Negative Cases

| ID | Bước kiểm thử | Kết quả mong đợi |
|----|----------------|------------------|
| NG-01 | Upload file Bảng kê có chiết khấu bằng 0 | File Excel xuất ra có Cột AB (`Tỷ lệ ck`) hiển thị `0` (không lỗi null/undefined). |

## 6. Ghi chú regression

- Cần chạy typecheck (`npm run lint`) để chắc chắn không xảy ra lỗi kiểu dữ liệu sau khi sửa hàm mapping.

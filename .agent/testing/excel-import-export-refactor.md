# Test Cases - Excel Import & Export Refactor

> Tạo ngày: 2026-06-20
> Liên kết feature: `không áp dụng`
> Phạm vi: Refactor / Regression

---

## 1. Mục tiêu kiểm thử

- Đảm bảo logic xuất cấu trúc Excel 36 cột phục vụ FAST hoạt động đồng nhất trên cả 3 luồng xử lý: Hợp đồng luân chuyển, Hợp đồng mới, và Bảng kê.
- Xác nhận sự chính xác về cột `stt` (trống ở hợp đồng, tuần tự ở bảng kê).
- Đảm bảo tính năng tải nhiều file Excel đồng thời (multiple files) và tính năng kiểm tra header bắt buộc hoạt động tốt.

## 2. Tiền điều kiện

- Ứng dụng chạy local.
- Có sẵn file excel mẫu cho các luồng xử lý.

## 3. Happy Path

| ID | Bước kiểm thử | Kết quả mong đợi |
|----|----------------|------------------|
| HP-01 | Tải lên file Excel đúng cấu trúc cột ở màn hình Hợp đồng luân chuyển. | File được import thành công, hiển thị đầy đủ thông tin xem trước. |
| HP-02 | Nhấn nút xuất Excel hạch toán ở luồng Hợp đồng luân chuyển hoặc Hợp đồng mới. | File Excel đầu ra được tải xuống, cột `stt` trống hoàn toàn, các thông tin HD1..6 và tiền tương ứng khớp chính xác. |
| HP-03 | Nhấn nút xuất Excel ở luồng Bảng kê. | File Excel tải xuống có cột `stt` tự động tăng tuần tự từ 1 đến hết danh sách dòng dữ liệu. |

## 4. Edge / Regression

| ID | Bước kiểm thử | Kết quả mong đợi |
|----|----------------|------------------|
| RG-01 | Thực hiện kéo thả hoặc chọn đồng thời nhiều file Excel hợp lệ (nếu view hỗ trợ `multiple`). | Component `ExcelUpload` xử lý parse và gộp/merge dữ liệu thành công, hiển thị tên các file đã tải. |

## 5. Negative Cases

| ID | Bước kiểm thử | Kết quả mong đợi |
|----|----------------|------------------|
| NG-01 | Tải lên file Excel thiếu một trong số các cột bắt buộc được quy định trong `requiredHeaders`. | Hệ thống từ chối tải và hiển thị thông báo chi tiết: "File ... thiếu các cột bắt buộc: [Tên cột thiếu]. Vui lòng kiểm tra lại cấu trúc file mẫu." |
| NG-02 | Tải file sai định dạng (ví dụ `.pdf` hoặc `.txt`). | Báo lỗi trực tiếp: "File ... không đúng định dạng. Vui lòng chỉ tải lên file Excel (.xlsx, .xls)" |

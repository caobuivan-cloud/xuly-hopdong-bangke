# Test Cases - Lịch đăng 1 ngày → bỏ trống Ngày kết thúc

> Tạo ngày: 2026-06-29
> Liên kết feature: `bangke-single-date-no-enddate`
> Phạm vi: Feature / Logic parsing

---

## 1. Mục tiêu kiểm thử

- Xác minh hàm `parsePostingDateRange` trả về đúng Ngày bắt đầu (`startDate`) và đặt Ngày kết thúc (`endDate`) thành `null` khi Lịch đăng chỉ chứa 1 ngày đơn.
- Đảm bảo các cấu trúc Lịch đăng là dải ngày (dải đầy đủ, dải rút gọn, dải cùng năm) vẫn parse chính xác cả 2 ngày bắt đầu và kết thúc như trước.
- Đảm bảo UI Bảng kê render cột Ngày kết thúc rỗng khi giá trị trả về là `null`.

## 2. Tiền điều kiện

- Chạy dev server tại máy local.
- Chuẩn bị file Excel Bảng kê mẫu có chứa các cột Lịch đăng đa dạng.

## 3. Happy Path

| ID | Bước kiểm thử | Kết quả mong đợi |
|----|----------------|------------------|
| HP-01 | Upload file Bảng kê chứa Lịch đăng dạng ngày đơn chuẩn `15/06/2026` | - Cột S (Ngày bắt đầu) hiển thị `15/06/2026`<br>- Cột T (Ngày kết thúc) hiển thị rỗng |
| HP-02 | Upload file Bảng kê chứa Lịch đăng dạng ngày đơn rút gọn `5/6/26` | - Cột S (Ngày bắt đầu) hiển thị `05/06/2026`<br>- Cột T (Ngày kết thúc) hiển thị rỗng |
| HP-03 | Upload file Bảng kê chứa Lịch đăng dạng dải ngày đầy đủ `01/06/2026-15/06/2026` | - Cột S hiển thị `01/06/2026`<br>- Cột T hiển thị `15/06/2026` |
| HP-04 | Upload file Bảng kê chứa Lịch đăng dạng dải rút gọn cùng tháng/năm `01-15/06/2026` | - Cột S hiển thị `01/06/2026`<br>- Cột T hiển thị `15/06/2026` |
| HP-05 | Upload file Bảng kê chứa Lịch đăng dạng dải cùng năm `15/5-20/6/2026` | - Cột S hiển thị `15/05/2026`<br>- Cột T hiển thị `20/06/2026` |

## 4. Edge / Regression

| ID | Bước kiểm thử | Kết quả mong đợi |
|----|----------------|------------------|
| RG-01 | Thực hiện inline edit ô Lịch đăng của một dòng bất kỳ trên UI, đổi từ dải ngày sang ngày đơn `12/07/2026` | - Cột S cập nhật thành `12/07/2026`<br>- Cột T tự động xoá trống |
| RG-02 | Thực hiện inline edit ô Lịch đăng từ ngày đơn sang dải ngày `10-20/07/2026` | - Cột S cập nhật thành `10/07/2026`<br>- Cột T cập nhật thành `20/07/2026` |

## 5. Negative Cases

| ID | Bước kiểm thử | Kết quả mong đợi |
|----|----------------|------------------|
| NG-01 | Nhập Lịch đăng không hợp lệ (ví dụ: `abc`, `35/15/2026`) | Cả cột S và cột T hiển thị rỗng (hàm parse trả về `null` cho cả 2 và không crash) |

## 6. Ghi chú regression

- Cần kiểm tra kỹ việc xuất file Excel import FAST (HĐ mới và HĐ cũ) xem cột Ngày kết thúc có đi đúng giá trị rỗng/null hay không để tránh lỗi hệ thống kế toán FAST.

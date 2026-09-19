# Test Cases - Nhận diện tự động đa mẫu bảng kê (MMS, SUN, WPP & FAST Export)

> Tạo ngày: 2026-09-19
> Liên kết feature: `multi-template-bangke-recognition`
> Phạm vi: Feature / Multi-template parser / Money & Tax Calculation / FAST Accounting Export

---

## 1. Mục tiêu kiểm thử

- Đảm bảo hệ thống nhận diện tự động đúng 100% các mẫu bảng kê khác nhau (STANDARD, MMS, SUN, WPP) dựa trên kiến trúc nhận diện 3 lớp.
- Đảm bảo người dùng có thể đổi mẫu bảng kê thủ công độc lập cho từng file trong danh sách tải lên mà không làm ảnh hưởng đến các file khác.
- Đảm bảo tiền nguồn được bảo toàn tuyệt đối theo `Unified Money & Tax Contract` (kể cả trường hợp cố ý lệch công thức), thuế VAT tính chuẩn xác.
- Đảm bảo các trường xuất khẩu sang FAST Accounting 36 cột khớp chính xác các quy ước nghiệp vụ.

## 2. Tiền điều kiện

- Master Data Sản phẩm / Vụ việc (`CH VV SP`) đã được nạp.
- Các file mẫu thử nghiệm: `BK Mẫu MMS. Hương Hiền.xlsx`, `BK Mẫu SUN.Hương Hiền.xlsx`, `Mẫu BK WPP.Hương Hiền.xlsx`.

## 3. Happy Path

| ID | Bước kiểm thử | Kết quả mong đợi |
|----|----------------|------------------|
| HP-01 | Tải lên file `BK Mẫu MMS. Hương Hiền.xlsx` | Hệ thống tự động nhận diện badge `Mẫu MMS`, trích xuất đúng cột `Thành tiền VNĐ (không VAT)` vào `thanhTienSauCk`, tra cứu vụ việc chính xác từ `Nội dung quảng cáo`. |
| HP-02 | Tải lên file `BK Mẫu SUN.Hương Hiền.xlsx` | Hệ thống tự động nhận diện badge `Mẫu SUN`, trích xuất sạch 14 ký tự `Số HT` trong ngoặc đơn, tách nội dung sau `Loại quảng cáo :` vào `Chuyên trang`. |
| HP-03 | Tải lên file `Mẫu BK WPP.Hương Hiền.xlsx` | Hệ thống tự động nhận diện badge `Mẫu WPP`, ghép dải ngày lịch đăng từ `Ngày bắt đầu` - `Ngày kết thúc`, cộng tổng chiết khấu `CK` + `CK ưu đãi`, loại trừ dòng không có tiền. |
| HP-04 | Tải lên đồng thời cả 3 file bảng kê | Mỗi file hiển thị đúng badge và dropdown mẫu riêng. Đổi template của 1 file chỉ cập nhật cục bộ file đó. Khi bấm Hạch toán, dữ liệu được gộp chuẩn xác thành 76 dòng. |
| HP-05 | Xuất file FAST `HĐ Cũ Import` | Xuất đủ 36 cột chuẩn FAST, `stt` để trống, `Status` = 1, `Giá trị của vv VAT` tính đúng thuế suất (8%), không có dòng nào bị tiền thuế phóng đại. |

## 4. Edge / Regression

| ID | Bước kiểm thử | Kết quả mong đợi |
|----|----------------|------------------|
| RG-01 | Dòng tổng kết có chuỗi "Tổng cộng gồm VAT 206218050" | Bộ quét thuế suất toàn sheet bỏ qua dòng này, không gán số tiền làm tỷ lệ thuế VAT. |
| RG-02 | Cột `Thành tiền ưu đãi (VNĐ)` có giá trị số tiền đứng sau cột `Chiết khấu ưu đãi` | Không bị ghi đè số tiền vào tỷ lệ chiết khấu ưu đãi, tỷ lệ chiết khấu giữ nguyên là phần trăm (e.g. 24%). |
| RG-03 | Dòng có tiền nguồn cố ý lệch công thức (Số lượng x Đơn giá x CK khác Thành tiền nguồn) | Hệ thống bảo toàn tiền nguồn và tính VAT = `Math.round(thanhTienSauCk * 1.08)`. |
| RG-04 | Hậu tố `/AD` đã có sẵn trong `Số HT` (e.g. `HT0060126/AD`) | Không bị nhân đôi thành `/AD/AD` trong `Ghi chú chi tiết`. |
| RG-05 | Cột ngày trong Excel chứa runtime `Date` object (do `cellDates: true`) | Format chính xác thành chuỗi `DD/MM/YYYY`. |

## 5. Negative Cases

| ID | Bước kiểm thử | Kết quả mong đợi |
|----|----------------|------------------|
| NG-01 | Tải file bảng kê hoàn toàn không có header hợp lệ | Hệ thống fallback về `STANDARD` template và cho phép người dùng tự map cột hoặc chọn lại template. |
| NG-02 | File WPP có dòng chiết khấu 100% hoặc thành tiền nguồn <= 0 | Bị loại trừ an toàn, không xuất hiện trong bảng hạch toán FAST. |

---
*Cập nhật tự động bởi update-docs*

# 📋 Hướng Dẫn Nghiệm Thu Dự Án AD-ACC ECOSYSTEM (V1.0)

Hệ thống **AD-ACC Ecosystem** hỗ trợ bộ phận Kế toán - Kinh doanh của VCCorp tự động xử lý, chuẩn hóa, phân tách và bóc tách dữ liệu hạch toán từ Ad-servers thô ra cấu trúc Excel 36 cột tiêu chuẩn để đẩy dữ liệu lên sổ Fast nhanh chóng.

Dưới đây là Checklist nghiệm thu chi tiết dành cho Kiểm toán viên / Kế toán viên để rà soát toàn bộ chức năng của ứng dụng.

---

## 🚀 1. Hướng Dẫn Khởi Động Ứng Dụng (Cách Chạy App)

Sử dụng môi trường Node.js chuẩn để chạy ứng dụng:

1. **Khởi chạy Development Server**:
   ```bash
   npm run dev
   ```
2. **Truy cập ứng dụng**:
   Trình duyệt tự động hiển thị visual preview tại: `http://localhost:3000` (hoặc truy cập trực tiếp khung Iframe trong AI Studio Workspace).

---

## 🗂️ 2. Hướng Dẫn Thiết Lập & Nạp Master Data (Cách Upload Master)

Trước khi thực hiện bất kỳ workflow hạch toán nào, dữ liệu lõi danh mục (Master Data) cần được chuẩn bị và nạp để hệ thống so khớp tự động.

### Bước 1: Điều hướng tới Tab Cài đặt
* Chọn tab **"Cấu hình hệ thống"** (ở góc dưới cùng bên trái trong danh sách 4 tab nghiệp vụ).

### Bước 2: Tải file mẫu cấu hình
Tại mục **"3. Trực quan hóa & Quản trị Sổ Master Data"**, tải xuống cả 3 file mẫu Excel:
1. **Master 1 (Danh sách Mã bộ phận)**: Nhấp nút `Mẫu Excel`.
2. **Master 2 (Bảng tra cứu Mã khách)**: Nhấp nút `Mẫu Excel`.
3. **Master 3 (Cấu hình chuẩn hóa Sản phẩm Vụ việc)**: Nhấp nút `Mẫu Excel`.

*Dữ liệu mẫu điền sẵn bao gồm các mã chuẩn hóa như: `KH_SHOPEE`, `VV_PR_K14`, `SALE_K14`, ...*

### Bước 3: Nạp dữ liệu vào bộ nhớ đệm
1. Nhấp nút `Nạp File mới` tại mỗi mục, chọn file Excel tương ứng đã điền dữ liệu.
2. Kiểm tra phản hồi báo thành công màu xanh lá. Ví dụ: *“Đã tải thành công danh sách mã khách (3 dòng).”*
3. Nhấp biểu tượng mũi tên xuống `▼` để xem trước bảng dữ liệu thực tế đang nằm trong cache.

---

## 🔄 3. Hướng Dẫn Chạy & Rà Soát Từng Nghiệp Vụ (Cách Chạy Từng Workflow)

Ứng dụng cung cấp 3 Workflow nghiệp vụ cốt lõi:

### Workflow A: Hợp Đồng Luân Chuyển
1. Truy cập tab **"HĐ Luân Chuyển"**.
2. **Tải lên File Hợp đồng cứng**: Tải tệp chứa các danh sách mã hợp đồng, giá trị thô, các cột phân bổ tiền (`tien_hd1` đến `tien_hd6`).
3. **Tải lên Danh sách hợp đồng Fast** (Không bắt buộc): Để tự động lọc/loại trừ những hợp đồng đã tồn tại trên Fast.
4. Nhấp nút **`HẠCH TOÁN LUÂN CHUYỂN`**.
5. **Rà soát & Sửa dữ liệu trực tiếp**:
   * Kiểm tra các chỉ số tổng quan ở hàng thống kê (Tổng số dòng, Trùng lặp, Số dòng hợp lệ).
   * Tại danh sách kết quả, các ô có **Confidence Score thấp** hoặc trạng thái `CẦN KIỂM TRA` được highlight viền cam nổi bật.
   * Để sửa thông tin: Click đúp trực tiếp vào ô (ví dụ: Thay đổi `Mã khách` hoặc `Mã vụ việc`), hệ thống sẽ hiển thị **Hộp tìm kiếm thông minh gợi ý tự động (Autocomplete)** dựa trên Master Data. Chọn mã chính xác để cập nhật ngay lập tức.

### Workflow B: Hợp Đồng Mới
1. Truy cập tab **"HĐ Mới Ký"**.
2. **Tải lên File Hợp đồng mới**: File chứa thông tin các hợp đồng mới phát sinh cần lập dự toán.
3. **Tải lên Danh sách hợp đồng Fast** (Không bắt buộc): Để loại trừ các HĐ đã nạp Fast từ trước.
4. Nhấp nút **`HẠCH TOÁN HỢP ĐỒNG`**.
5. Rà soát tương tự Workflow A. Chỉnh sửa thủ công nếu có sai lệch về thông tin phòng ban, nhân viên hoặc mã vụ việc.

### Workflow C: Bảng Kê Đối Soát
1. Truy cập tab **"Bảng Kê Đối Soát"**.
2. **Tải lên File Bảng kê**: Chứa dữ liệu booking chạy từ Ad-servers thô.
3. **Tải lên Danh sách hợp đồng Fast**: File danh sách hợp đồng từ Fast để thực hiện đối chiếu chéo tự động.
4. Nhấp nút **`HẠCH TOÁN BẢNG KÊ`**.
5. **Kiểm tra kết quả phân bổ**:
   * Hệ thống tự động phân tách khoảng ngày (Lịch đăng: `01/06/2026-15/06/2026` -> Ngày bắt đầu: `01/06/2026`, Ngày kết thúc: `15/06/2026`).
   * Tự động lấy **Thuế suất** từ dòng VAT tổng trong bảng kê hoặc theo từ khóa.
   * Tự động hạch toán **Mã hợp đồng** = Số HT / Số Booking + suffix `/AD`.
   * Tự động gán **Mã vụ việc, TK doanh thu, Tên sản phẩm** từ thuật toán khớp từ khóa mờ.

---

## 📥 4. Hướng Dẫn Kiểm Tra Tập Tin Đầu Ra (Cách Kiểm Tra Output Excel)

Hệ thống đảm bảo tính toàn vẹn và mức độ an toàn cao nhất trước khi sinh file tải xuống:

### Chấn chỉnh & Khuyến nghị Cảnh báo rủi ro:
* Khi bấm nút **`XUẤT FILE HOÀN THÀNH`**, nếu ứng dụng quét thấy bất kỳ dòng nào bị thiếu thông tin quan trọng (`Mã khách`, `Bộ phận thực hiện`, `Mã vụ việc` trống) hoặc có độ tin cậy thấp, hệ thống lập tức hiển thị cảnh báo tiếng Việt: "⚠️ *CẢNH BÁO PHÁT HIỆN LỖI HẠCH TOÁN... Bạn có chắc chắn muốn xuất tệp Excel không?*"
* Kiểm toán viên có thể bấm Hủy dể quay lại chỉnh sửa, hoặc bấm Đồng ý để tiếp tục xuất dữ liệu.

### Kiểm thử cấu trúc 36 cột:
Khi mở tệp Excel đã tải xuống, hãy nghiệm thu thứ tự chính xác của **36 cột bắt buộc** như sau:

1. **Mã hợp đồng**
2. **Tên hợp đồng**
3. **Mã khách**
4. **Bộ phân thưc hiện** *(Đúng chính tả theo yêu cầu cơ sở dữ liệu)*
5. **Ngày bắt đầu**
6. **Ngày kết thúc**
7. **Ngày hợp đồng**
8. **ngay_hd1**
9. **ngay_hd2**
10. **ngay_hd3**
11. **ngay_hd4**
12. **ngay_hd5**
13. **ngay_hd6**
14. **tien_hd1**
15. **tien_hd2**
16. **tien_hd3**
17. **tien_hd4**
18. **tien_hd5**
19. **tien_hd6**
20. **Giá trị**
21. **ma_vv**
22. **Số lượng**
23. **Đơn giá**
24. **Thuế suất**
25. **Giá trị của vv VAT** *(Giá trị tiền thuế VAT tương ứng)*
26. **tk_doanh thu**
27. **Bảng kê**
28. **Tỷ lệ ck**
29. **Chuyên trang**
30. **Ghi chú chi tiết**
31. `[Khoảng Trắng 1]` *(Một dấu cách trống)*
32. **Status** *(Bảng kê/Luân chuyển = 1, HĐ Mới = 2)*
33. `[Khoảng Trắng 2]` *(Hai dấu cách trống)*
34. **Ghi chú tổng**
35. **stt** *(Thứ tự tăng dần tự động)*
36. **Tên sản phẩm** *(Chuẩn hóa tên sản phẩm import)*

---
*Hệ thống AD-ACC ECOSYSTEM v1.0 hân hạnh đồng hành cải cách quy trình kế toán cùng VCCorp!*

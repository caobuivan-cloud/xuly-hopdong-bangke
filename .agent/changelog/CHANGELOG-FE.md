# Changelog FE - Xu ly hop dong - bang ke

> Phạm vi: Frontend, UI, UX, state client, routing, hiển thị, validation phía client
> Format: [Conventional Commits](https://www.conventionalcommits.org/)
> Ngôn ngữ: Tiếng Việt

## 2026-06-23

### feat: điều chỉnh cột trống và định dạng tỷ lệ chiết khấu khi xuất Excel
- Bỏ trống Cột T (`Giá trị`) cho Hợp đồng luân chuyển và Bảng kê khi xuất Excel hạch toán.
- Bỏ trống Cột AA (`Bảng kê`) và Cột AI (`stt`) khi xuất Excel từ màn hình Bảng kê.
- Định dạng lại Cột AB (`Tỷ lệ ck`) xuất ra số nguyên phần trăm (ví dụ `19` thay vì `0.19`).
- Chuẩn hóa tỷ lệ chiết khấu lẻ nhập từ Excel nguồn có giá trị nằm trong khoảng `0 < value < 1` để nhân 100 và hiển thị/lưu chính xác trên UI & file xuất.
- Cập nhật file-level contract trong `fastImport.ts` để đồng bộ invariant của cột `stt`.
- Files:
  - [fastImport.ts](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/utils/fastImport.ts)
  - [BangKeView.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/components/BangKeView.tsx)

### feat: lọc bỏ các dòng không đủ điều kiện hạch toán khi xuất Excel FAST
- Bổ sung helper `filterFastImportEligibleRows` trong `fastImport.ts` để lọc bỏ các dòng có trường VAT trống hoặc Tỷ lệ chiết khấu = 100% khi xuất Excel.
- Tách biệt logic lọc opt-in để không làm ảnh hưởng đến màn hình Bảng kê (`BangKeView.tsx`).
- Parse và xử lý thêm cột đầu vào `Giá trị của vv VAT` cho màn hình Hợp đồng luân chuyển (`LuanChuyenView.tsx`) thay vì chỉ dùng trường `Giá trị của vv`.
- Cập nhật hiển thị số lượng dòng thực tế sẽ được xuất trên nút "Excel" của màn hình Hợp đồng luân chuyển và Hợp đồng mới.
- Files:
  - [fastImport.ts](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/utils/fastImport.ts)
  - [LuanChuyenView.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/components/LuanChuyenView.tsx)
  - [HopDongMoiView.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/components/HopDongMoiView.tsx)

## 2026-06-20

### feat: tích hợp ghi nhật ký hoạt động người dùng lên Google Sheets
- Bổ sung sheet `ActivityLogs` trong GAS để ghi nhận nhật ký của các hành động chính (tải tệp, sửa dòng chứng từ, xuất Excel, khởi động ứng dụng).
- Tách biệt luồng đồng bộ: Cấu hình và Master Data được lưu trữ trên file active hiện tại, còn Nhật ký hoạt động được ghi riêng biệt sang Google Sheet mới có ID `1-_xq6s9A4mYC6NyQoxZQfMoKz7SqkpW1Oq0iPpu7O-o`.
- Cung cấp cơ chế tự động điền URL Web App mặc định và ẩn giao diện cấu hình log trên Setup screen nhằm đơn giản hóa trải nghiệm người dùng.
- Files:
  - [App.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/App.tsx)
  - [dbService.ts](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%2520ke/src/services/dbService.ts)
  - [SettingsView.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/components/SettingsView.tsx)
  - [LuanChuyenView.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/components/LuanChuyenView.tsx)
  - [HopDongMoiView.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/components/HopDongMoiView.tsx)
  - [BangKeView.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/components/BangKeView.tsx)
  - [google_apps_script.js](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/google_apps_script.js)

### feat: lưu trữ Google Sheet cho cấu hình và Master Data
- Triển khai giải pháp đồng bộ dữ liệu ngầm bất đồng bộ (Background Auto-Sync) với Google Sheets Web App thông qua Google Apps Script Web App API.
- Tự động kéo dữ liệu (Pull) mới nhất từ Google Sheets khi khởi chạy ứng dụng ngầm mà không gây block tiến trình render chính (Local Cache First).
- Tự động đẩy dữ liệu (Push) đồng bộ lên Google Sheets khi người dùng cập nhật cấu hình/rules hoặc upload tệp Excel Master Data mới.
- Tự động đồng bộ việc xóa dữ liệu (Clear) Master Data lên Google Sheets dưới nền.
- Cung cấp file cấu hình mẫu [google_apps_script.js](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/google_apps_script.js) tại root cho người dùng dễ dàng copy.
- Files:
  - [App.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/App.tsx)
  - [SettingsView.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/components/SettingsView.tsx)
  - [dbService.ts](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/services/dbService.ts)
  - [google_apps_script.js](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/google_apps_script.js)

### feat: thêm tính năng tìm kiếm cho danh mục Master Data
- Thêm ô tìm kiếm với icon Search và nút X xóa nhanh cho cả 3 bảng Master Data (Bộ phận thực hiện, Khách hàng, Sản phẩm/Vụ việc) trong `SettingsView.tsx`.
- Hỗ trợ tìm kiếm tiếng Việt không dấu/có dấu và không phân biệt hoa thường nhờ tích hợp `stripVietnameseDiacritics`.
- Giới hạn tìm kiếm trên các trường thông tin cụ thể hiển thị (mã bộ phận, tên bộ phận, mã khách, tên khách, từ khóa sản phẩm, mã vụ việc, tên sản phẩm, tài khoản doanh thu, thuế suất) và tự động an toàn hóa kiểu dữ liệu dạng số.
- Files: [SettingsView.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/components/SettingsView.tsx)

### refactor: đồng nhất cấu trúc xuất Excel 36 cột phục vụ FAST Accounting
- Trích xuất hàm chung `buildFastImportRows` tại `src/utils/fastImport.ts` để gộp chung logic ánh xạ 36 cột từ các cấu trúc dữ liệu thô của Hợp đồng luân chuyển, Hợp đồng mới, và Bảng kê.
- Điều chỉnh cột `stt` trống trong Hợp đồng luân chuyển/Hợp đồng mới, và tuần tự tự tăng trong Bảng kê.
- Chuẩn hóa camelCase các thuộc tính nội bộ như `ngayHd1..6`, `tienHd1..6`.
- Hỗ trợ upload và xử lý nhiều file excel đồng thời cùng cơ chế kiểm tra tính hợp lệ của header cột bắt buộc trong `ExcelUpload.tsx`.
- Files:
  - [fastImport.ts](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/utils/fastImport.ts)
  - [ExcelUpload.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/components/ExcelUpload.tsx)
  - [App.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/App.tsx)
  - [BangKeView.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/components/BangKeView.tsx)
  - [HopDongMoiView.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/components/HopDongMoiView.tsx)
  - [LuanChuyenView.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/components/LuanChuyenView.tsx)

---

*Cập nhật tự động bởi update-docs*

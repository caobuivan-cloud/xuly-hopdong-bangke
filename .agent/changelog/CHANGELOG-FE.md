# Changelog FE - Xu ly hop dong - bang ke

> Phạm vi: Frontend, UI, UX, state client, routing, hiển thị, validation phía client
> Format: [Conventional Commits](https://www.conventionalcommits.org/)
> Ngôn ngữ: Tiếng Việt

## 2026-06-29

### feat(bangke): để trống ngày kết thúc khi lịch đăng là ngày đơn
- Thay đổi hành vi của hàm `parsePostingDateRange`: khi Lịch đăng chỉ có một ngày đơn (ví dụ `15/06/2026` hoặc `5/6/26`), Ngày kết thúc (cột T) sẽ để trống (`null`), thay vì sao chép giá trị của Ngày bắt đầu.
- Giữ nguyên các trường hợp Lịch đăng chứa dải ngày (dải đầy đủ, dải rút gọn, dải cùng năm).
- Files:
  - [businessLogic.ts](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/utils/businessLogic.ts)

### feat(excel): tiêm công thức tính động cho cột Giá trị vv VAT khi xuất Excel
- Cập nhật hàm exportToExcel để tự động tiêm công thức nội suy (Số lượng * Đơn giá * Tỷ lệ ck * Thuế suất) vào cột "Giá trị của vv VAT" nếu tìm thấy cấu trúc bảng hợp lệ.
- Sử dụng tọa độ cột động (dựa trên header thực tế) giúp hệ thống không vỡ nếu thứ tự cột thay đổi.
- Bảo lưu giá trị đã tính toán sẵn ở client (thuộc tính `v` của cell) để phần mềm FAST Accounting có thể import an toàn do FAST không tự tính được công thức.
- Files:
  - [excel.ts](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/utils/excel.ts)

## 2026-06-23

### feat(hop-dong-moi): cải tiến UI, tối ưu đọc VAT và cấu hình rỗng cột xuất Excel FAST
- Ẩn bảng stats dashboard và banner phân tích tệp đầu vào ở trên đầu màn hình Hợp đồng mới.
- Rút gọn checkbox so khớp lọc trùng Fast thành "Loại trừ HĐ cũ" và hiển thị chi tiết qua TooltipIcon.
- Thay đổi cột "Trạng thái Fast" chỉ hiển thị giá trị chuỗi trạng thái Fast gốc (`row.fastStatus || ''`), loại bỏ các badge rườm rà.
- Bổ sung thanh tab lọc nhanh các trạng thái chẩn đoán lỗi (ALL, QUALIFIED, MISSING_KHACH, MISSING_DEPT, MISSING_VV, MISSING_THUE, NEED_CHECK).
- Cập nhật logic import để ưu tiên đọc trực tiếp "Giá trị của vv VAT" (hoặc các cột tương đương như 'Giá trị vụ việc VAT', 'Giá trị vụ việc', 'Gia tri cua vv VAT') từ file Excel nguồn trước khi tính toán động.
- Tách biệt logic lấy `eligibleExportRows` giúp việc xuất file Excel FAST độc lập hoàn toàn với tab lọc lỗi, ô tìm kiếm và khoảng lọc trên giao diện (giải quyết EFR-01), đồng thời bắt buộc tự động áp dụng bộ lọc loại trừ HĐ cũ trên Fast khi nạp file Fast đối soát.
- Cấu hình hàm `buildFastImportRows` để để trống các cột T (`Giá trị`), AC (`Chuyên trang`), AD (`Ghi chú chi tiết`), và AJ (`Tên sản phẩm`) khi xuất Excel cho Hợp đồng mới (status = 2).
- Files:
  - [HopDongMoiView.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/components/HopDongMoiView.tsx)
  - [fastImport.ts](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/utils/fastImport.ts)

### feat: tự động nhận diện và cấu hình dòng header cho hợp đồng mới
- Lưu trữ mảng dữ liệu thô `rawArray` và chỉ số dòng header `headerRowIndex` khi parse Excel.
- Bổ sung helper `reparseSheetWithHeaderIndex` giúp re-parse tệp động từ dữ liệu thô mà không cần upload lại.
- Tích hợp giao diện hiển thị dòng header (1-based trên UI, 0-based trong code) và selector chọn dòng header thủ công trên UI `HopDongMoiView`.
- Bổ sung Tooltip giải thích trực quan về cơ chế nhận diện header bên cạnh dropdown chọn dòng header.
- Tối ưu hóa `HEADER_KEYWORDS` an toàn và tương thích ngược, đồng thời bổ sung các từ khóa đặc trưng cho Hợp đồng mới (`loại khách hàng`, `số hợp đồng`).
- Cải tiến thuật toán `detectHeaderRowIndex` để quét 20 dòng đầu tiên và chọn ra dòng có số lượng từ khóa khớp nhiều nhất (best match) thay vì chỉ chọn dòng đầu tiên vượt ngưỡng thấp, giúp loại bỏ triệt để các cảnh báo giả từ dòng metadata.
- Files:
  - [types.ts](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/types.ts)
  - [excel.ts](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/utils/excel.ts)
  - [HopDongMoiView.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/components/HopDongMoiView.tsx)

### feat: phân nhóm xuất Excel bảng kê & mở rộng độ rộng cột hiển thị
- Tách nút "Xuất Excel" duy nhất tại màn hình Bảng kê thành 2 nút: **Xuất HĐ mới** và **Xuất HĐ cũ**.
- HĐ mới: Bao gồm hợp đồng không tồn tại trong FAST hoặc có trạng thái là `2` trong FAST (Tên file: `import_hop_dong_moi_YYYY-MM-DD.xlsx`).
- HĐ cũ: Bao gồm hợp đồng tồn tại trong FAST và có trạng thái là `1` (Tên file: `import_hop_dong_cu_YYYY-MM-DD.xlsx`).
- Cấu hình lại `fastLookupMap` bằng `useMemo` và tự động cập nhật các thuộc tính đối chiếu FAST (`existsInFast`, `fastStatus`, `maKhach`, `boPhanThucHien`, `fastGhiChu`) khi sửa đổi `maBooking` trực tiếp trên UI.
- Điều chỉnh CSS/Tailwind cho table columns (Tên khách hàng, Chuyên trang, Chuyên trang Import, Tên sản phẩm) trên cả 3 màn hình xem trước (`LuanChuyenView`, `HopDongMoiView`, `BangKeView`): loại bỏ `truncate`/`whitespace-nowrap`, tăng `min-w` và thêm `whitespace-normal break-words`.
- Thay đổi input của chuyên trang và sản phẩm import trên bảng xem trước thành `<textarea>` để tự động wrap text gọn gàng.
- Files:
  - [BangKeView.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/components/BangKeView.tsx)
  - [HopDongMoiView.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/components/HopDongMoiView.tsx)
  - [LuanChuyenView.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/components/LuanChuyenView.tsx)

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

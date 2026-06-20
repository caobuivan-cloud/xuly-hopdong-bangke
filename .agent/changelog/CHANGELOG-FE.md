# Changelog FE - Xu ly hop dong - bang ke

> Phạm vi: Frontend, UI, UX, state client, routing, hiển thị, validation phía client
> Format: [Conventional Commits](https://www.conventionalcommits.org/)
> Ngôn ngữ: Tiếng Việt

---

## 2026-06-20

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

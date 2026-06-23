# Feature Plan: Cải tiến UI và Logic Xuất Excel Hợp Đồng Mới

> **Trạng thái**: ✅ ĐỒNG Ý
> **Review gate**: Expert review round 1 đã hội tụ và người dùng chỉ đạo triển khai
> **Feature slug**: refactor-new-contract-ui
> **Tạo bởi**: feature-plan
> **Ngày tạo**: 2026-06-23

---

## 1. Bối cảnh và mục tiêu

- **Bối cảnh:** Màn hình "Xử lý hợp đồng mới" hiện có một số điểm chưa tối ưu về UI (Dashboard stats chiếm diện tích, checkbox lọc dài dòng) và cần đồng bộ trải nghiệm sử dụng với màn hình "Xử lý hợp đồng luân chuyển". Ngoài ra, cấu trúc cột khi xuất Excel FAST cho Hợp đồng mới cần được tinh chỉnh để bỏ trống một số cột đặc thù theo yêu cầu nghiệp vụ.
- **Vấn đề cần giải quyết:**
  1. UI cột "Trạng thái Fast" đang hiển thị rườm rà ("KHỚP FAST", "CHƯA CÓ TRÊN FAST").
  2. Bảng stats dashboard và banner chiếm nhiều không gian, cần ẩn/bỏ.
  3. Thanh tìm kiếm và bộ lọc chưa có các tab phân loại lỗi hạch toán như HĐ luân chuyển. Checkbox loại trừ trùng Fast hiển thị dài dòng.
  4. Logic tính toán "Giá trị của vv VAT" chưa ưu tiên đọc từ cột có sẵn trong file Excel nguồn.
  5. Cột `T (Giá trị)`, `AC (Chuyên trang)`, `AD (Ghi chú chi tiết)`, `AJ (Tên sản phẩm)` khi xuất Excel FAST (status = 2) cần được bỏ trống.
  6. EFR-01: Export Excel bị giới hạn bởi tab filter hiện tại (cần tách export dataset độc lập với tab filter chẩn đoán).
- **Mục tiêu:** Tối ưu hóa UI gọn gàng, trực quan, chính xác về logic hạch toán và đáp ứng đúng đặc tả cột xuất FAST của Kế toán.
- **Kết quả mong đợi:** Màn hình hợp đồng mới hoạt động trơn tru với UI gọn, bộ lọc tab nhanh, dữ liệu xuất Excel khớp chuẩn nghiệp vụ.

## 2. Phạm vi

### In scope
- Sửa đổi component [HopDongMoiView.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/components/HopDongMoiView.tsx): ẩn dashboard stats, thêm các tab lọc nhanh (ALL, MISSING_KHACH, MISSING_DEPT, MISSING_VV, MISSING_THUE, NEED_CHECK), thay checkbox lọc bằng nhãn "Loại trừ HĐ cũ" kèm tooltip.
- Thay đổi cột "Trạng thái Fast" trong bảng hiển thị của `HopDongMoiView.tsx` chỉ hiển thị text trạng thái gốc từ Fast.
- Sửa logic parse file đầu vào tại `HopDongMoiView.tsx` để ưu tiên đọc cột "Giá trị của vv VAT" (hoặc các cột tương đương) từ file trước khi tự động tính toán.
- Sửa logic xuất Excel tại [fastImport.ts](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/utils/fastImport.ts) để để trống các cột T, AC, AD, AJ khi `options.status === 2`.
- Giải quyết finding EFR-01 và yêu cầu lọc trùng Fast: Export Excel của Hợp đồng mới (`eligibleExportRows`) phải lấy từ `processedRows`, tự động áp dụng logic loại trừ HĐ cũ đã tồn tại trên Fast (nếu đã nạp file Fast và có `existsInFast === true` và `fastStatus !== '2'`), đồng thời độc lập hoàn toàn với các bộ lọc hiển thị (như `searchTerm`, `vvConfidenceRange`, và các tab chẩn đoán lỗi `filterType`).

### Out of scope
- Thay đổi cấu trúc cơ sở dữ liệu master hoặc Google Sheets.
- Chỉnh sửa logic của màn hình Bảng kê và HĐ luân chuyển (trừ khi dùng chung helper).

## 3. Đối chiếu Knowledge Base

- **Quyết định kế thừa:** Tiếp tục gom logic xuất 36 cột tại `src/utils/fastImport.ts`.
- **"Cấm kỵ" cần tránh:** Không phá vỡ luồng xuất Excel của HĐ Luân chuyển và Bảng kê khi sửa đổi helper chung.
- **Ràng buộc kiến trúc liên quan:** Cần giữ nguyên định dạng 36 cột khi export, chỉ thay đổi giá trị trả về của các cột cụ thể.

## 4. Giả định và câu hỏi mở

### Giả định
- Nghiệp vụ xuất Excel cho Hợp đồng mới (status = 2) hoàn toàn không cần các thông tin Giá trị (T), Chuyên trang (AC), Ghi chú chi tiết (AD) và Tên sản phẩm (AJ) trong file FAST Import. Mọi giá trị này sẽ trả về chuỗi rỗng `''`.
- "Giá trị của vv VAT" trong file Excel nguồn có thể viết dưới các tên cột như: 'Giá trị của vv VAT', 'Giá trị vụ việc VAT', 'Giá trị vụ việc', 'Gia tri cua vv VAT'.

### Câu hỏi mở
- Không có câu hỏi blocking.

## 5. Acceptance Criteria

- [ ] Stats dashboard và banner phân tích tệp đầu vào ở trên đầu bảng bị ẩn/loại bỏ khỏi giao diện Hợp đồng mới.
- [ ] Bổ sung thanh tab lọc nhanh các trạng thái lỗi/cảnh báo hạch toán giống màn hình HĐ luân chuyển.
- [ ] Cột "Trạng thái Fast" trong bảng chỉ hiển thị `{row.fastStatus || ''}` hoặc giá trị lấy từ Fast, không kèm badge KHỚP/CHƯA CÓ rườm rà.
- [ ] Nhãn checkbox lọc loại trừ đổi thành "Loại trừ HĐ cũ" và dùng tooltip giải thích chi tiết.
- [ ] Khi xuất file Excel FAST (status = 2):
  - Cột T (Giá trị) rỗng.
  - Cột AC (Chuyên trang) rỗng.
  - Cột AD (Ghi chú chi tiết) rỗng.
  - Cột AJ (Tên sản phẩm) rỗng.
- [ ] Logic tính toán "Giá trị của vv VAT" ưu tiên đọc giá trị từ cột tương ứng trong file nguồn, nếu không tìm thấy mới thực hiện tính `Math.round(giaTri * taxRateMultiplier)`.
- [ ] Việc export Excel của Hợp đồng mới hoạt động độc lập với tab chẩn đoán lỗi, ô tìm kiếm và khoảng lọc vụ việc.
- [ ] Tập dữ liệu export Excel bắt buộc phải tự động áp dụng bộ lọc loại trừ HĐ cũ đã tồn tại trên Fast (nếu có nạp file đối soát Fast), không phụ thuộc vào trạng thái checkbox "Loại trừ HĐ cũ" trên UI. Giao diện UI vẫn hỗ trợ xem toàn bộ hoặc lọc trùng bằng checkbox này độc lập.

## 6. Files và modules bị ảnh hưởng

| File/Module | Hành động | Lý do chạm vào | Rủi ro | Contract |
|-------------|-----------|----------------|--------|----------|
| [HopDongMoiView.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/components/HopDongMoiView.tsx) | Sửa | Ẩn dashboard stats, thêm tab lọc nhanh, sửa UI checkbox, sửa cột Trạng thái Fast, sửa logic đọc VAT, tách export dataset. | 🟡 Có thể ảnh hưởng đến trải nghiệm lọc nếu không cẩn thận. | Chưa |
| [fastImport.ts](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/utils/fastImport.ts) | Sửa | Để trống các cột T, AC, AD, AJ khi status = 2. | 🟡 Tránh làm lệch logic xuất của các màn hình khác (status = 1). | Có |

## 7. Risk Triage và Review Focus

- **Review required:** Yes
- **Risk hotspots:** Hàm `buildFastImportRows` trong `fastImport.ts` dùng chung cho toàn bộ dự án. Cần kiểm tra kỹ điều kiện `status === 2` để không ảnh hưởng đến `status === 1`.
- **Review focus areas:** Đảm bảo việc lọc tab không làm mất các dòng khi xuất Excel (tách biệt `eligibleExportRows` khỏi `filterType` chẩn đoán lỗi).
- **Known pitfalls / historical issues:** Trùng lặp/nhầm lẫn giữa `thanhTien` và `giaTri` khi tính VAT.

## 8. Chiến lược triển khai

- **Phase strategy:**
  - **Phase 1:** Refactor giao diện người dùng (ẩn stats dashboard, tối ưu checkbox, chỉnh sửa cột trạng thái Fast, thêm tab lọc nhanh).
  - **Phase 2:** Cập nhật logic tính toán VAT đầu vào và tách biệt tập dữ liệu xuất Excel (EFR-01).
  - **Phase 3:** Điều chỉnh hàm xuất 36 cột trong `fastImport.ts` để để trống các cột T, AC, AD, AJ cho status = 2.
- **Thứ tự triển khai:** Frontend UI trước -> Logic xử lý dữ liệu -> Helper xuất Excel.

## 9. Test Strategy

- **Automated tests:** Chạy build/lint để đảm bảo không có lỗi TypeScript.
- **Manual verification:**
  - Upload file hợp đồng mới mẫu.
  - Kiểm tra việc hiển thị các tab lỗi, thay đổi checkbox, hiển thị cột trạng thái Fast.
  - Xuất Excel và mở file kiểm tra các cột T, AC, AD, AJ có trống hoàn toàn không.
  - Kiểm tra cột VAT trong file hạch toán xem có đọc đúng từ file nguồn không.

## 10. Rollback Plan

- Khôi phục code từ Git commit trước đó.

## 11. Tham chiếu thực thi

- Checklist chi tiết theo phase: `FEATURE_TASKS.md`

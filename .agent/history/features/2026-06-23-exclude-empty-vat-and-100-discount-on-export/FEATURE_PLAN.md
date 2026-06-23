# Feature Plan: Loại bỏ dòng Giá trị vv VAT trống hoặc Tỷ lệ CK 100 khi xuất Excel

> **Trạng thái**: ✅ ĐỒNG Ý
> **Review gate**: Đã thông qua review hội đồng
> **Feature slug**: exclude-empty-vat-and-100-discount-on-export
> **Tạo bởi**: feature-plan
> **Ngày tạo**: 2026-06-23

---

## 1. Bối cảnh và mục tiêu

- **Bối cảnh:** Khi kế toán xuất Excel từ màn hình xử lý hợp đồng luân chuyển và hợp đồng mới để nạp vào FAST Accounting.
- **Vấn đề cần giải quyết:** File xuất Excel hiện tại xuất toàn bộ danh sách hợp đồng lọc được mà chưa bỏ đi những dòng không đủ điều kiện hạch toán (cụ thể là các dòng có cột `Giá trị vv VAT` trống hoặc cột `Tỷ lệ chiết khấu` = 100%).
- **Mục tiêu:** Bổ sung logic lọc (filter) ngay trước khi xuất file Excel hoặc xây dựng bộ dòng dữ liệu xuất khẩu, loại bỏ những dòng thỏa mãn một trong hai điều kiện trên.
- **Kết quả mong đợi:** 
  - File Excel xuất ra cho cả Hợp đồng luân chuyển và Hợp đồng mới không chứa bất kỳ dòng nào có `Giá trị của vv VAT` trống (null/undefined/'') hoặc `Tỷ lệ ck` = 100.

## 2. Phạm vi

### In scope
- Cập nhật logic xuất Excel của Hợp đồng luân chuyển ([LuanChuyenView.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/components/LuanChuyenView.tsx)).
  <!-- Sửa theo EFR-02: Bổ sung parse cột 'Giá trị của vv VAT' vào trường `giaTriCuaVvVat` và dùng trường này cho việc lọc/export thay vì chỉ dùng `giaTriCuaVv` -->
- Cập nhật logic xuất Excel của Hợp đồng mới ([HopDongMoiView.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/components/HopDongMoiView.tsx)).
- Bổ sung helper lọc hoặc tùy chọn lọc opt-in trong [fastImport.ts](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/utils/fastImport.ts) để không ảnh hưởng đến màn hình Bảng kê.
  <!-- Sửa theo EFR-01: Việc lọc dòng trống VAT/Tỷ lệ CK 100% phải là opt-in, ví dụ thực hiện lọc trước khi gọi helper hoặc truyền flag option rõ ràng để tránh lọc sai trên màn hình Bảng kê -->
- Không ảnh hưởng đến màn hình Bảng kê (đối tượng xuất Excel khác).

## 3. Đối chiếu Knowledge Base

- **Quyết định kế thừa:** "Tập trung logic xuất 36 cột vào helper chung" (`src/utils/fastImport.ts`). Nên thực hiện lọc tại helper này hoặc thông qua tham số/logic chung để dễ bảo trì.
- **"Cấm kỵ" cần tránh:** Tránh hardcode cột cứng nhắc mà không tương thích với kiểu dữ liệu của hệ thống hiện tại.

## 4. Giả định và câu hỏi mở

### Giả định
- Cột `Giá trị của vv VAT` trống nghĩa là giá trị của nó là `null`, `undefined`, hoặc chuỗi rỗng `""` sau khi mapping.
- `Tỷ lệ chiết khấu = 100` được hiểu là tỷ lệ % chiết khấu đạt tối đa (100%), giá trị số là `100`.

## 5. Acceptance Criteria

- [ ] Khi xuất Excel ở màn hình "Xử lý hợp đồng luân chuyển", các dòng có `Giá trị của vv VAT` trống hoặc `Tỷ lệ ck` = 100 sẽ tự động bị loại bỏ khỏi file Excel tải xuống.
  <!-- Sửa theo EFR-02: Dữ liệu được lọc dựa trên trường `giaTriCuaVvVat` được trích xuất từ file Hợp đồng cứng (hoặc fallback `giaTriCuaVv` nếu trống) chứ không dùng nhầm trường `giaTriCuaVv` -->
- [ ] Khi xuất Excel ở màn hình "Xử lý hợp đồng mới", các dòng có `Giá trị của vv VAT` trống hoặc `Tỷ lệ ck` = 100 sẽ tự động bị loại bỏ khỏi file Excel tải xuống.
- [ ] Số lượng dòng đếm hiển thị trên nút "Excel" trên header của các màn hình này phản ánh đúng số lượng dòng thực tế sẽ được xuất (sau khi đã lọc loại bỏ).

## 6. Files và modules bị ảnh hưởng

| File/Module | Hành động | Lý do chạm vào | Rủi ro | Contract |
|-------------|-----------|----------------|--------|----------|
| `src/utils/fastImport.ts` | Sửa | Thêm hàm filter dòng export hoặc bổ sung tham số lọc opt-in trong `buildFastImportRows`. Không làm ảnh hưởng logic mặc định của Bảng kê. | 🟢 Thấp | Có |
  <!-- Sửa theo EFR-01: Lọc opt-in tránh ảnh hưởng BangKeView -->
| `src/components/LuanChuyenView.tsx` | Sửa | Cập nhật parse cột `Giá trị của vv VAT`, logic đếm số lượng dòng trên nút Export và logic lọc trước khi gọi `buildFastImportRows`. | 🟢 Thấp | Chưa |
  <!-- Sửa theo EFR-02: Thêm parse và check đúng cột Giá trị của vv VAT -->
| `src/components/HopDongMoiView.tsx` | Sửa | Cập nhật logic đếm số lượng dòng trên nút Export và logic lọc trước khi gọi `buildFastImportRows`. | 🟢 Thấp | Chưa |

## 7. Risk Triage và Review Focus

- **Review required:** Yes
- **Risk hotspots:** Đảm bảo kiểu dữ liệu khi so sánh (chuỗi "100" vs số 100, kiểm tra null/undefined/trống đúng cách).

## 8. Chiến lược triển khai

- **Phase strategy:** 
  - Phase 1: Thêm logic filter trong `fastImport.ts` hoặc các view component, cập nhật đếm số lượng dòng trên UI của nút Export.
  - Phase 2: Xác minh thủ công bằng cách xuất thử file Excel.

## 9. Test Strategy

- **Manual verification:**
  - Import file test chứa các dòng có `Giá trị vv VAT` trống hoặc `Tỷ lệ CK` = 100.
  - Kiểm tra xem nút Excel hiển thị số lượng dòng đã trừ đi các dòng bị loại bỏ hay chưa.
  - Tải file Excel và kiểm tra các dòng trong file.

## 10. Rollback Plan

- Hoàn tác các file đã sửa qua Git checkout.

## 11. Tham chiếu thực thi

- Checklist chi tiết theo phase: `FEATURE_TASKS.md`

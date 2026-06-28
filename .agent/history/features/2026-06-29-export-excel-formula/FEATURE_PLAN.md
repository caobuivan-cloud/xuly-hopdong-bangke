# Feature Plan: Chèn công thức Excel cho cột Giá trị vv VAT

> **Trạng thái**: ✅ ĐỒNG Ý
> **Review gate**: Đã thông qua review (FR-01, FR-02)
> **Feature slug**: export-excel-formula
> **Tạo bởi**: feature-plan
> **Ngày tạo**: 2026-06-29

---

## 1. Bối cảnh và mục tiêu

- **Bối cảnh:** Hiện tại khi xuất file Excel cho Hợp đồng mới, Bảng kê, Hợp đồng luân chuyển, cột "Giá trị của vv VAT" (Cột Y) đang được tính toán sẵn ở client và gán giá trị tĩnh vào file Excel.
- **Vấn đề cần giải quyết:** Người dùng cần cột này là một công thức Excel thực sự tham chiếu tới các cột khác để khi sửa đổi dữ liệu trực tiếp trên file Excel đã xuất, giá trị cột Y sẽ tự động cập nhật.
- **Mục tiêu:** Chèn công thức: `= Số lượng * Đơn giá * Chiết khấu / 100 * (1 + Thuế suất / 100)` vào cột Giá trị của vv VAT trên tất cả các dòng dữ liệu hợp lệ.
- **Kết quả mong đợi:** File Excel tải về khi mở ra sẽ hiển thị công thức ở cột Y chứ không phải giá trị tĩnh, đồng thời vẫn giữ giá trị tĩnh cho các hệ thống kế toán không tự tính toán công thức (như FAST Accounting).

## 2. Phạm vi

### In scope
- Sửa đổi hàm xuất Excel để áp dụng công thức cho cột `Giá trị của vv VAT`.
- Áp dụng trên cả 3 luồng: Hợp đồng mới, Hợp đồng luân chuyển, Bảng kê.
- Tính động tọa độ cột dựa trên Headers để công thức không bị vỡ nếu thêm/bớt cột.

### Out of scope
- Các thay đổi liên quan đến cấu trúc cột định nghĩa import vào phần mềm FAST.
- Công thức cho các cột khác ngoài cột Y.

## 3. Đối chiếu Knowledge Base

- **Quyết định kế thừa:** Vẫn sử dụng `src/utils/fastImport.ts` để map 36 cột chuẩn FAST, và `exportToExcel` trong `src/utils/excel.ts` để xuất file.
- **"Cấm kỵ" cần tránh:** Tránh việc thay đổi vị trí của các cột chuẩn FAST, vì điều này sẽ làm hỏng chức năng import của phần mềm kế toán.
- **Ràng buộc kiến trúc liên quan:** Mọi thay đổi về xuất dữ liệu phải giữ nguyên luồng logic chung của 3 màn hình `BangKeView`, `HopDongMoiView`, `LuanChuyenView`.

## 4. Giả định và câu hỏi mở

### Giả định
- Thư viện `xlsx` (SheetJS) hỗ trợ chèn thuộc tính `f` (formula) vào đối tượng ô (cell object) sau khi parse JSON thành sheet.
- Cột "Chiết khấu" mà user nhắc đến tương ứng với cột "Tỷ lệ ck" trong hệ thống xuất hiện tại.

### Câu hỏi mở
- Không còn (đã giải quyết rủi ro FAST Accounting thông qua fallback value `v`).

## 5. Acceptance Criteria

- [ ] File Excel được xuất từ 3 tính năng có chứa công thức ở cột Giá trị của vv VAT.
- [ ] Công thức trên file Excel chính xác dựa trên tọa độ động.
- [ ] Ô chứa công thức vẫn lưu trữ giá trị đã tính toán từ client (fallback `v: ...`) để import vào FAST Accounting không bị bằng 0.
- [ ] Mở Excel lên không bị báo lỗi định dạng file.

## 6. Files và modules bị ảnh hưởng

| File/Module | Hành động | Lý do chạm vào | Rủi ro | Contract |
|-------------|-----------|----------------|--------|----------|
| `src/utils/excel.ts` | Sửa | Chỉnh sửa `exportToExcel` để cho phép truyền thêm options cấu hình công thức hoặc thêm logic duyệt worksheet sau khi dùng `json_to_sheet`. | 🟡 | Có |

## 7. Risk Triage và Review Focus

- **Review required:** Đã review (`EXPERT_REVIEW.md`).
- **Risk hotspots:** Tương thích FAST Accounting (đã mitigate bằng FR-01) và Thay đổi cấu trúc cột (đã mitigate bằng FR-02).
- **Review focus areas:** Cách thức can thiệp vào worksheet object của SheetJS.
- **Known pitfalls / historical issues:** Chèn công thức sai cú pháp trong SheetJS có thể làm hỏng file Excel (không mở được).
- **Dependencies / rollout concerns:** Không.

## 8. Chiến lược triển khai

- **Phase strategy:** 1 phase duy nhất.
- **Thứ tự triển khai:**
  1. Thêm chức năng tiêm công thức vào `exportToExcel` hoặc tạo một wrapper mới (có thể dùng hooks option `onSheetCreated` cho `exportToExcel`).
  2. Xác định index các cột Số lượng, Đơn giá, Thuế suất, Giá trị của vv VAT, Tỷ lệ ck một cách động. Lấy chữ cái tương ứng bằng `XLSX.utils.encode_col()`.
  3. Duyệt qua các dòng và thiết lập `{ t: 'n', f: '[formula]', v: cell.v }`.
  4. Cập nhật các Component export sử dụng tính năng mới.
- **Điểm cần phối hợp:** Không.

## 9. Test Strategy

- **Automated tests:** Không có do không setup test tự động.
- **Manual verification:** Xuất thử từ 3 giao diện và mở trên phần mềm Microsoft Excel, kiểm tra cột Y có công thức đúng không và tính toán lại khi thay đổi một trong các số hạng không.

## 10. Rollback Plan

- Revert commit thay đổi logic trong `src/utils/excel.ts`.

## 11. Tham chiếu thực thi

- Checklist chi tiết theo phase: `FEATURE_TASKS.md`

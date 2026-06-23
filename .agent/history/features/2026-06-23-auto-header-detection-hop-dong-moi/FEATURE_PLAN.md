# Feature Plan: Tự động nhận diện và cấu hình dòng Header cho Hợp đồng mới

> **Trạng thái**: ✅ ĐỒNG Ý
> **Review gate**: Đã duyệt thông qua expert-rebuttal (Hội tụ)
> **Feature slug**: auto-header-detection-hop-dong-moi
> **Tạo bởi**: feature-plan
> **Ngày tạo**: 2026-06-23

---

## 1. Bối cảnh và mục tiêu

- **Bối cảnh:** Khi người dùng tải lên file Excel "Hợp đồng mới", cấu trúc tệp có thể chứa các dòng tiêu đề phụ, dòng trống, hoặc metadata ở các dòng đầu tiên (ví dụ: dòng 1-4 là tiêu đề báo cáo, thông tin ngày xuất file), làm lệch dòng tiêu đề thật (header row).
- **Vấn đề cần giải quyết:** Hiện tại hệ thống tự động nhận diện header bằng `detectHeaderRowIndex` trong `excel.ts` nhưng thiếu trực quan cho người dùng kiểm tra hoặc chủ động cấu hình lại dòng header nếu hệ thống nhận diện sai hoặc nếu file có cấu trúc đặc biệt.
- **Mục tiêu:** 
  1. Tối ưu hóa bộ từ khóa nhận diện header (`HEADER_KEYWORDS`) đặc trưng của file "Hợp đồng mới".
  2. Bổ sung giao diện hiển thị thông tin dòng header được nhận diện và cho phép người dùng thay đổi dòng header (chọn dòng khác) trực tiếp sau khi upload file trên giao diện "Xử lý hợp đồng mới".
- **Kết quả mong đợi:** Người dùng tải file Excel hợp đồng mới lên, hệ thống tự nhận diện và hiển thị dòng header. Người dùng có thể chỉnh sửa dòng header này và dữ liệu xem trước sẽ cập nhật tương ứng ngay lập tức.

## 2. Phạm vi

### In scope
- Cải tiến hàm `detectHeaderRowIndex` và cấu trúc lưu trữ `ExcelSheetData` / `UploadedFileData` để giữ lại mảng dữ liệu thô `rawArray` phục vụ cho việc re-parse khi thay đổi dòng header.
- Thêm phần giao diện điều chỉnh dòng header (Dropdown/Number selector chọn chỉ số dòng làm header) kèm xem trước các cột tương ứng trong `HopDongMoiView.tsx`.
- Cập nhật logic xử lý của `HopDongMoiView` tương ứng với dòng header được chọn.
<!-- Sửa theo EFR-01: Đảm bảo các thay đổi với global parser/keywords là tương thích ngược và không phá vỡ logic các màn hình khác bằng cách giữ từ khóa generic hoặc bảo vệ luồng cũ. -->

### Out of scope
- Các màn hình khác như Hợp đồng luân chuyển và Bảng kê (vẫn sử dụng parser chung nhưng không có UI chọn header động và giữ nguyên cấu trúc phát hiện tự động cũ).

## 3. Đối chiếu Knowledge Base

- **Quyết định kế thừa:** Giữ nguyên cấu trúc xử lý & xuất tệp 36 cột trong `src/utils/fastImport.ts` và logic mapping cốt lõi.
- **"Cấm kỵ" cần tránh:** Không làm chậm quá trình tải và đọc Excel. Không phá vỡ luồng tải nhiều file (multiple upload) đang có.

## 4. Giả định và câu hỏi mở

### Giả định
- Mặc định hệ thống sẽ tự động quét và gợi ý dòng header tối ưu nhất (giữ logic tự động hiện tại nhưng cải tiến từ khóa một cách an toàn và tương thích ngược).
<!-- Sửa theo EFR-02: Làm rõ contract về index dòng: State/Code dùng 0-based (0 đến 9), giao diện hiển thị 1-based (dòng 1 đến 10) để người dùng không bị lệch 1 dòng. -->
- Cho phép người dùng chọn dòng từ 1 đến 10 làm header trên UI (tương ứng với index 0-based từ 0 đến 9 trong code).

### Câu hỏi mở
- *Không có câu hỏi chặn (non-blocking)*.

## 5. Acceptance Criteria

- [ ] Hệ thống tự động nhận diện chính xác dòng header của file hợp đồng mới mẫu (thường có các cột như `Số HĐ`, `Dự án`, `Tên sale`, `Phòng ban`, `Tên khách hàng`, `Thành tiền`).
- [ ] Giao diện hiển thị trực quan thông tin dòng header được chọn sau khi upload file.
- [ ] Người dùng có thể click chọn dòng khác làm header, bảng dữ liệu lập tức cập nhật lại danh sách cột (headers) và dữ liệu hàng (rows) theo dòng header mới mà không cần upload lại file.
- [ ] Logic "Xử lý" hạch toán hoạt động chính xác dựa trên cấu trúc header mới được chọn.

## 6. Files và modules bị ảnh hưởng

| File/Module | Hành động | Lý do chạm vào | Rủi ro | Contract |
|-------------|-----------|----------------|--------|----------|
| `src/types.ts` | Sửa | Bổ sung `headerRowIndex` và `rawArray` vào `ExcelSheetData` để hỗ trợ re-parse động. | 🟢 Thấp | Có |
| `src/utils/excel.ts` | Sửa | Cập nhật `parseExcelFile` để trả về `headerRowIndex` và `rawArray`. Tối ưu danh sách từ khóa cho Hợp đồng mới. Bổ sung helper re-parse tệp từ rawArray. | 🟢 Thấp | Có |
| `src/components/HopDongMoiView.tsx` | Sửa | Thêm UI hiển thị/chọn dòng header cho mỗi file đã upload. Cập nhật logic re-parse khi thay đổi dòng header. | 🟡 Trung bình (tránh phá vỡ state xử lý) | Có |

## 7. Risk Triage và Review Focus

- **Review required:** Yes
- **Risk hotspots:** Tránh làm mất tính đồng bộ của state khi người dùng tải lên nhiều file cùng lúc và điều chỉnh dòng header của từng file riêng lẻ.
- **Review focus areas:** Đảm bảo UI mượt mà, trực quan, không gây rối cho kế toán viên.

## 8. Chiến lược triển khai

- **Phase strategy:**
  - **Phase 1:** Cải tiến Types và logic Excel helper (`src/types.ts`, `src/utils/excel.ts`).
  - **Phase 2:** Tích hợp giao diện chọn dòng header vào `HopDongMoiView.tsx` và liên kết với logic xử lý dữ liệu.
  - **Phase 3:** Kiểm thử hiệu năng, độ chính xác và hoàn thiện UI/UX.

## 9. Test Strategy

- **Manual verification:**
  - Chuẩn bị một file Excel Hợp đồng mới có dòng trống ở trên cùng (Metadata ở dòng 1-3, header ở dòng 4).
  - Tải lên hệ thống, xác nhận hệ thống tự nhận diện đúng header là dòng 4.
  - Thử đổi dòng header bằng tay trên UI sang dòng khác, kiểm tra các cột hiển thị thay đổi tương ứng.
  - Bấm "Xử lý" và "Xuất Excel" kiểm tra kết quả chuẩn xác.

## 10. Rollback Plan

- Khôi phục các file `src/types.ts`, `src/utils/excel.ts` và `src/components/HopDongMoiView.tsx` về phiên bản Git gần nhất.

## 11. Tham chiếu thực thi

- Checklist chi tiết theo phase: `FEATURE_TASKS.md`

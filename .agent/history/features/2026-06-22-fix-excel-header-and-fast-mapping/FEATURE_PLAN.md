# Feature Plan: Sửa lỗi tự động nhận diện dòng tiêu đề Excel và khớp hợp đồng Fast

> **Trạng thái**: ✅ ĐỒNG Ý
> **Review gate**: Đã qua gate — có thể handoff sang `feature-coordinator`
> **Feature slug**: fix-excel-header-and-fast-mapping
> **Tạo bởi**: feature-plan
> **Ngày tạo**: 2026-06-22

---

## 1. Bối cảnh và mục tiêu

- **Bối cảnh:** Khi người dùng tải lên file Excel dữ liệu (Bảng kê, Hợp đồng mới, Hợp đồng luân chuyển) và Danh mục hợp đồng Fast, ứng dụng React hiển thị dữ liệu lỗi ("BK rỗng", "Chưa parse") và không đối soát khớp được bất kỳ hợp đồng nào của Bảng kê với Fast.
- **Vấn đề cần giải quyết:** 
  1. Thư viện đọc Excel (`XLSX`) tự động sử dụng dòng đầu tiên có dữ liệu (dòng 2 - Tên công ty) làm tiêu đề cột thay vì dòng tiêu đề thật sự của bảng (thường là dòng 6 đối với Fast, dòng 12 đối với Bảng kê). Dẫn đến các key thuộc tính bị lệch hoàn toàn (`__EMPTY_1` thay vì `Tên hợp đồng`).
  2. Việc so khớp dữ liệu cột đối chiếu giữa Bảng kê và Fast đang không tìm thấy bản ghi do map dữ liệu bị rỗng từ khâu parse Excel lỗi.
- **Mục tiêu:** 
  - Triển khai thuật toán tự động nhận diện dòng Header (dòng tiêu đề thật) trong file Excel một cách năng động (dynamic header detection).
  - Đảm bảo đọc chính xác các cột `'Hợp đồng'`, `'Tên hợp đồng'`, `'Mã booking'`, `'Số HT'`, v.v. ở mọi định dạng file kế toán tải lên.
- **Kết quả mong đợi:** 
  - File Excel tải lên được bỏ qua các dòng giới thiệu/tiêu đề trang trí ở đầu, nhận diện đúng dòng header và parse chính xác các dòng dữ liệu.
  - Các dòng dữ liệu trong Bảng kê khớp chính xác thông tin Trạng thái, Mã khách, Bộ phận thực hiện từ Fast thông qua cột Tên hợp đồng / Mã hợp đồng.

## 2. Phạm vi

### In scope
- Sửa hàm parse Excel chung tại [excel.ts](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%2520hop%2520dong%2520-%2520bang%2520ke/src/utils/excel.ts) để tự động phát hiện dòng header dựa trên danh sách các cột từ khóa phổ biến.
- Cập nhật logic xử lý file tải lên ở [BangKeView.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/components/BangKeView.tsx), [HopDongMoiView.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/components/HopDongMoiView.tsx), và [LuanChuyenView.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/components/LuanChuyenView.tsx) để tận dụng cơ chế parse chuẩn hóa mới.

### Out of scope
- Thay đổi cấu trúc cơ sở dữ liệu Master Data hoặc Google Sheets Sync.

## 3. Đối chiếu Knowledge Base

- **Quyết định kế thừa:** Tôn trọng cấu trúc lưu trữ và các helper nghiệp vụ trong `businessLogic.ts` và `fastImport.ts`.
- **"Cấm kỵ" cần tránh:** Không hardcode số dòng cần bỏ qua (ví dụ: bắt buộc skip 5 dòng hay 11 dòng), vì cấu trúc tiêu đề file Excel của kế toán có thể thay đổi linh hoạt (thêm bớt dòng trống ở đầu).

## 4. Giả định và câu hỏi mở

### Giả định
- Dòng tiêu đề thật của bảng dữ liệu luôn chứa tối thiểu 2 cột thuộc danh sách các từ khóa đặc trưng (như `hợp đồng`, `booking`, `stt`, `khách hàng`, `số hđ`, `mã khách`).
- File Master Data (bộ phận/khách/sản phẩm) thường có header ở dòng đầu tiên, không có dòng tiêu đề trang trí → thuật toán cần có **fallback backward-compatible**: nếu không phát hiện được header theo keyword, tự động dùng dòng 0 làm header (hành vi hiện tại) để không phá luồng import `SettingsView`.

### Câu hỏi mở
- Không có câu hỏi blocking nào.

## 5. Acceptance Criteria

- [ ] Khi tải lên file Fast có tiêu đề ở dòng 6, hệ thống nhận diện đúng các cột `'Hợp đồng'`, `'Tên hợp đồng'` và không sinh ra các dòng trống rác ở đầu.
- [ ] Khi tải lên file Bảng kê có tiêu đề ở dòng 12, hệ thống tự động nhận dạng được dòng 12 là header và parse chính xác các dòng dữ liệu từ dòng 13 trở đi.
- [ ] Sau khi xử lý Bảng kê và Fast, các cột Trạng thái, Mã khách, Bộ phận thực hiện tự động hiển thị giá trị khớp từ Fast thay vì để trống/báo lỗi.

## 6. Files và modules bị ảnh hưởng

| File/Module | Hành động | Lý do chạm vào | Rủi ro | Contract |
|-------------|-----------|----------------|--------|----------|
| `src/utils/excel.ts` | Sửa | Triển khai thuật toán quét và phát hiện chỉ số dòng (row index) làm Header thật trước khi parse sang JSON. | 🟡 | Không |
| `src/components/BangKeView.tsx` | Sửa | Kiểm tra và tinh chỉnh lại việc đọc dữ liệu Fast, đảm bảo khớp đúng cột sau khi sửa hàm parse. | 🟢 | Không |
| `src/components/HopDongMoiView.tsx` | Sửa | Kiểm tra tích hợp bộ parse mới để đảm bảo không lỗi format cũ. | 🟢 | Không |
| `src/components/LuanChuyenView.tsx` | Sửa | Kiểm tra tích hợp bộ parse mới để đảm bảo không lỗi format cũ. | 🟢 | Không |
| `src/components/SettingsView.tsx` | Xác thực | Dùng `parseExcelFile` trực tiếp để import Master Data (bộ phận/khách/sản phẩm). Cần verify fallback behavior không làm hỏng luồng import. | 🟡 | Không |

## 7. Risk Triage và Review Focus

- **Review required:** Yes
- **Risk hotspots:** Hàm phát hiện dòng tiêu đề tự động cần kiểm tra kỹ để tránh nhận diện sai dòng (ví dụ dòng mô tả phụ có chứa từ khóa).
- **Review focus areas:** Kiểm tra thuật toán phát hiện header với nhiều file mẫu thử nghiệm khác nhau.

## 8. Chiến lược triển khai

- **Phase strategy:** 
  - **Phase 1:** Nâng cấp thuật toán parse Excel động tại `src/utils/excel.ts`.
  - **Phase 2:** Cập nhật tích hợp và kiểm thử khớp dữ liệu Bảng kê - Fast trên `BangKeView.tsx`.
  - **Phase 3:** Xác thực trên các View khác (`HopDongMoiView.tsx`, `LuanChuyenView.tsx`) để đảm bảo tính hồi quy (non-regression).

## 9. Test Strategy

- **Manual verification:**
  - Tải lên file Bảng kê mẫu và Fast mẫu của người dùng để xác nhận dữ liệu hiển thị sạch, không có dòng rác và khớp thành công trạng thái hợp đồng.

## 10. Rollback Plan

- Hoàn tác mã nguồn thông qua Git.

## 11. Tham chiếu thực thi

- Checklist chi tiết theo phase: `FEATURE_TASKS.md`

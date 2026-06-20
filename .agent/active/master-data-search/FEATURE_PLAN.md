# Feature Plan: Thêm tính năng tìm kiếm cho danh mục Master Data

> **Trạng thái**: ✅ ĐỒNG Ý (sau EFR Round 1 — hội tụ)
> **Review gate**: Đã qua review (expert-rebuttal-codex + expert-rebuttal Round 1)
> **Feature slug**: master-data-search
> **Tạo bởi**: feature-plan
> **Ngày tạo**: 2026-06-19

---

## 1. Bối cảnh và mục tiêu

- **Bối cảnh:** Hiện tại các bảng Master Data (Bộ phận thực hiện, Khách hàng, Sản phẩm/Vụ việc) trong màn hình Cài đặt chỉ hiển thị danh sách dạng bảng dài.
- **Vấn đề cần giải quyết:** Khi danh sách lớn (ví dụ có 775 dòng mã bộ phận), người dùng khó biết được một mã hoặc tên đã tồn tại trong danh sách chưa nếu không có chức năng tìm kiếm nhanh.
- **Mục tiêu:** Thêm một ô search cho từng bảng Master Data để lọc danh sách hiển thị một cách nhanh chóng (client-side).
- **Kết quả mong đợi:** Người dùng có thể gõ từ khóa vào ô search trên mỗi Master, bảng dữ liệu bên dưới sẽ tự động thu hẹp lại chỉ hiển thị các dòng khớp với từ khóa (tìm kiếm không phân biệt hoa/thường, hỗ trợ cả tìm theo tên và tìm theo mã).

## 2. Phạm vi

### In scope
- Thêm ô input search cho Master 1 (Bộ phận thực hiện).
- Thêm ô input search cho Master 2 (Khách hàng).
- Thêm ô input search cho Master 3 (Sản phẩm/Vụ việc).
- Xử lý logic lọc danh sách client-side, tận dụng hàm `stripVietnameseDiacritics` đã có sẵn trong `SettingsView.tsx` để search linh hoạt hơn (không dấu).

### Out of scope
- Phân trang (Pagination) cho bảng (tạm thời chưa cần thiết nếu chỉ cần search nhanh).
- Cập nhật hay thêm mới Master Data trực tiếp trên giao diện (hiện tại vẫn dùng file excel để upload).

## 3. Đối chiếu Knowledge Base

- **Quyết định kế thừa:** Dùng React và TailwindCSS để làm UI.
- **"Cấm kỵ" cần tránh:** Không làm thay đổi cơ chế load/save master data (vẫn dựa trên IndexedDB qua `dbService`).
- **Ràng buộc kiến trúc liên quan:** Logic search hoàn toàn nằm ở client-side (`SettingsView.tsx`), không chạm vào database layer vì số lượng dòng (khoảng dưới 10,000) React hoàn toàn có thể xử lý render và filter in-memory rất nhanh.

## 4. Giả định và câu hỏi mở

### Giả định
- Ô search sẽ được đặt cạnh các nút thao tác (Mẫu Excel, Nạp File mới) ở góc trên bên phải hoặc ngay trên bảng của từng mục Master.
- Tìm kiếm sẽ bao phủ các cột dữ liệu hiển thị (không search cột STT). Để an toàn với các trường số/optional (như `thueSuat`), sẽ ép kiểu về `String(value ?? '')` trước khi normalize.

### Câu hỏi mở
- [Non-blocking] Giao diện ô search có cần icon kính lúp không? (Giả định là có, sẽ dùng icon `Search` từ `lucide-react`).

## 5. Acceptance Criteria

- [ ] Hiển thị 3 ô search box cho 3 danh mục.
- [ ] Gõ tiếng Việt không dấu hoặc có dấu đều có thể tìm ra kết quả tương ứng.
- [ ] Các trường được search cụ thể:
  - Master 1: `tenBoPhan`, `maSale` (bỏ qua `stt`).
  - Master 2: `tenKhach`, `maKhach` (bỏ qua `stt`).
  - Master 3: `keyword`, `maVuViec`, `tenSanPham`, `tkDoanhThu`, `thueSuat`.
- [ ] Khi ô search rỗng, hiển thị toàn bộ danh sách.
- [ ] Giao diện gọn gàng, không phá vỡ layout hiện tại.
<!-- Sửa theo EFR-01: Explicit list các trường cần search và bỏ qua stt. -->

## 6. Files và modules bị ảnh hưởng

| File/Module | Hành động | Lý do chạm vào | Rủi ro | Contract |
|-------------|-----------|----------------|--------|----------|
| `src/components/SettingsView.tsx` | Sửa | Thêm state cho các từ khóa tìm kiếm và hàm tính toán danh sách lọc (`filteredDepartments`, v.v...), cập nhật UI để render ô search và dùng danh sách đã lọc. | 🟢 | Không rõ |

## 7. Risk Triage và Review Focus

- **Review required:** No
- **Risk hotspots:** Hiệu năng khi filter mảng lớn lúc gõ (có thể sử dụng debounce nếu cần, nhưng danh sách <10,000 dòng React thường xử lý được ngay mà không lag).
- **Review focus areas:** Cách sắp xếp layout ô search để không bị tràn trên màn hình mobile/nhỏ.
- **Known pitfalls / historical issues:** Chú ý hàm `stripVietnameseDiacritics` có thể làm mảng map bị chậm nếu gọi quá nhiều lần trên mỗi lần render. Nên chuẩn bị chuỗi đã biến đổi khi load nếu thấy chậm (nhưng hiện tại làm filter trực tiếp trước xem hiệu năng thế nào).
- **Dependencies / rollout concerns:** Không có.

## 8. Chiến lược triển khai

- **Phase strategy:** 
  - Phase 1: Thêm logic states và computed values cho filter.
  - Phase 2: Cập nhật UI components (ô search input + dùng computed list thay cho danh sách gốc).
- **Thứ tự triển khai:** Logic -> UI -> Test.
- **Điểm cần phối hợp:** Không có.

## 9. Test Strategy

- **Automated tests:** Không yêu cầu.
- **Manual verification:**
  - Import 1 file master data mẫu.
  - Gõ vào ô search các case: chuỗi viết thường, viết hoa, không dấu, có dấu.
  - Test cụ thể trên Master 3: thử gõ `51111` (TK doanh thu) và `8` (Thuế suất) để đảm bảo các trường số/optional hoạt động tốt.
  - Kiểm tra bảng có thu gọn lại đúng kết quả không.
  - Xóa trắng ô search kiểm tra bảng khôi phục đầy đủ không.
<!-- Sửa theo EFR-01: Bổ sung case test TK doanh thu và Thuế suất -->
- **Data / env chuẩn bị trước khi test:** Chuẩn bị file mẫu hoặc dùng dữ liệu đang có sẵn trong trình duyệt.

## 10. Rollback Plan

- Nếu gặp lỗi render hoặc logic vướng, git checkout file `src/components/SettingsView.tsx` về trạng thái trước thay đổi.

## 11. Tham chiếu thực thi

- Checklist chi tiết theo phase: `FEATURE_TASKS.md`

# Feature Plan: Điều chỉnh cột trống và định dạng tỷ lệ chiết khấu khi xuất Excel

> **Trạng thái**: ✅ ĐỒNG Ý
> **Review gate**: Khuyến nghị gọi `feature-review` (Đã review qua expert-rebuttal)
> **Feature slug**: export-columns-null-and-percent-fix
> **Tạo bởi**: feature-plan
> **Ngày tạo**: 2026-06-23

---

## 1. Bối cảnh và mục tiêu

- **Bối cảnh:** Khi xuất Excel hạch toán Fast Import cho Hợp đồng luân chuyển và Bảng kê, một số cột cần được bỏ trống (null) theo mẫu import của Fast, nhưng hiện tại đang điền giá trị hoặc điền số 0. Ngoài ra, tỷ lệ chiết khấu trong Bảng kê bị xuất dưới dạng số thập phân (ví dụ 0.19 thay vì 19).
- **Vấn đề cần giải quyết:**
  1. Trong Hợp đồng luân chuyển: Cột giá trị (Cột T) đang điền số 0 thay vì bỏ trống.
  2. Trong Bảng kê:
     - Cột giá trị (Cột T) đang điền giá trị hoặc số 0 thay vì bỏ trống.
     - Cột Bảng kê (Cột AA) đang điền mã booking thay vì bỏ trống.
     - Cột stt (Cột AI) đang điền số tự tăng tuần tự thay vì bỏ trống.
     - Cột Tỷ lệ ck (Cột AB) hiển thị 0.19 thay vì 19.
- **Mục tiêu:** Điều chỉnh logic ánh xạ cột Excel của FAST import tại `src/utils/fastImport.ts` và logic parse tỷ lệ chiết khấu tại `src/components/BangKeView.tsx` để xuất đúng định dạng yêu cầu.
- **Kết quả mong đợi:** Xuất file Excel đúng định dạng trống ở các cột T, AA, AI tương ứng với từng loại view, và cột AB xuất đúng số nguyên tỷ lệ chiết khấu.

## 2. Phạm vi

### In scope
- Sửa file [fastImport.ts](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%2520-%2520bang%2520ke/src/utils/fastImport.ts) để điều chỉnh logic xuất dữ liệu 36 cột:
  - Cột `Giá trị` (Cột T) sẽ bỏ trống (trả về `''`) cho Hợp đồng luân chuyển (`status === 1` và `sttMode === 'blank'`) và Bảng kê (`sttMode === 'sequential'`).
  - Cột `Bảng kê` (Cột AA) sẽ bỏ trống (trả về `''`) cho Bảng kê (`sttMode === 'sequential'`).
  - Cột `stt` (Cột AI) sẽ luôn bỏ trống (trả về `''`) cho Bảng kê (`sttMode === 'sequential'`).
- Sửa file [BangKeView.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%2520-%2520bang%2520ke/src/components/BangKeView.tsx) để nhân tỷ lệ chiết khấu với 100 chỉ khi giá trị parse được nằm trong khoảng (0, 1) (ví dụ: 0.19 -> 19). <!-- Sửa theo EFR-01: Chỉ nhân 100 khi parsedDiscount > 0 && parsedDiscount < 1 -->

### Out of scope
- Thay đổi cấu trúc 36 cột import.
- Thay đổi các logic hạch toán hoặc matching khác không liên quan.

## 3. Đối chiếu Knowledge Base

- **Quyết định kế thừa:**
  - `[2026-06-20] [Tập trung logic xuất 36 cột vào helper chung]`: Gom logic ánh xạ 36 cột phục vụ FAST Accounting từ các component BangKeView, HopDongMoiView, LuanChuyenView về một mối (`src/utils/fastImport.ts`).
- **"Cấm kỵ" cần tránh:** Không thay đổi thứ tự hoặc số lượng cột trong mẫu xuất 36 cột.

## 4. Giả định và câu hỏi mở

### Giả định
- Cột `stt` (Cột AI) trong Bảng kê trước đây được sinh tuần tự (`index + 1`) nhưng theo yêu cầu mới nhất sẽ bỏ trống (null).
- Tỷ lệ chiết khấu của Bảng kê nếu có giá trị nhỏ hơn 1 (ví dụ 0.19) sẽ được hiểu là 19% và nhân 100 khi lưu vào `tyLeCk` để hiển thị trên UI và xuất file. Nếu chuỗi là "19%" hoặc "19", parser đã trả về 19, cần giữ nguyên 19 (không nhân 100). <!-- Sửa theo EFR-01: Chỉ nhân 100 khi parsedDiscount > 0 && parsedDiscount < 1 -->

### Câu hỏi mở
- Không có.

## 5. Acceptance Criteria

- [ ] Khi xuất Excel từ **Hợp đồng luân chuyển**, Cột T (`Giá trị`) bỏ trống (`''`), không có giá trị `= 0`.
- [ ] Khi xuất Excel từ **Bảng kê**:
  - [ ] Cột T (`Giá trị`) bỏ trống (`''`).
  - [ ] Cột AA (`Bảng kê`) bỏ trống (`''`).
  - [ ] Cột AI (`stt`) bỏ trống (`''`).
  - [ ] Cột AB (`Tỷ lệ ck`) xuất ra giá trị là số nguyên (ví dụ `19` thay vì `0.19`).

## 6. Files và modules bị ảnh hưởng

| File/Module | Hành động | Lý do chạm vào | Rủi ro | Contract |
|-------------|-----------|----------------|--------|----------|
| [fastImport.ts](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%2520-%2520bang%2520ke/src/utils/fastImport.ts) | Sửa | Điều chỉnh logic ánh xạ cột `Giá trị`, `Bảng kê`, và `stt` khi xuất Excel | 🟢 Thấp | Có |
| [BangKeView.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%2520-%2520bang%2520ke/src/components/BangKeView.tsx) | Sửa | Chuẩn hóa tỷ lệ chiết khấu từ file nguồn để chuyển thành dạng số phần trăm nguyên | 🟢 Thấp | Không |

## 7. Risk Triage và Review Focus

- **Review required:** Yes (Khuyến nghị chạy `feature-review`)
- **Risk hotspots:** Đảm bảo không làm ảnh hưởng đến mẫu xuất Excel của Hợp đồng mới.
- **Review focus areas:** Kiểm tra kỹ các điều kiện phân biệt giữa các view khi gọi `buildFastImportRows`.

## 8. Chiến lược triển khai

- **Phase strategy:** Triển khai 1 phase duy nhất.
- **Thứ tự triển khai:**
  1. Cập nhật `src/utils/fastImport.ts`.
  2. Cập nhật `src/components/BangKeView.tsx`.
  3. Kiểm tra bằng cách chạy thử ứng dụng và xuất file Excel.

## 9. Test Strategy

- **Manual verification:**
  1. Upload tệp test cho Hợp đồng luân chuyển, xuất Excel và kiểm tra Cột T có trống hay không.
  2. Upload tệp test cho Bảng kê, xuất Excel và kiểm tra Cột T, AA, AI có trống hay không; kiểm tra Cột AB có giá trị số nguyên hay không.
  3. Kiểm tra Hợp đồng mới xem Cột T và AA có xuất bình thường như cũ không.

## 10. Rollback Plan

- Hoàn tác thay đổi trên Git.

## 11. Tham chiếu thực thi

- Checklist chi tiết theo phase: `FEATURE_TASKS.md`

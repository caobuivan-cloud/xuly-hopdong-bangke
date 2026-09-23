# Feature Plan: Sửa logic loại trừ trùng hợp đồng trong màn hình Hợp đồng mới

> **Trạng thái**: ✅ ĐỔNG Ý (Review round 2 — đã được chấp thuận)
> **Review gate**: Có thể handoff sang `feature-coordinator`
> **Feature slug**: fix-hop-dong-moi-duplicate-filtering
> **Tạo bởi**: feature-plan
> **Ngày tạo**: 2026-07-09

---

## 1. Bối cảnh và mục tiêu

- **Bối cảnh:** Khi thực hiện đối soát trong màn hình "Xử lý hợp đồng mới", một số hợp đồng đã có trong tệp "Danh sách hợp đồng Fast" vẫn xuất hiện ở kết quả Excel tải xuống và hiển thị trên giao diện người dùng.
- **Vấn đề cần giải quyết:**
  - Logic đối soát đang sao chép từ Hợp đồng luân chuyển và giữ lại ngoại lệ `isStatus2` (Trạng thái = 2 thì không loại trừ), trong khi Phần 2 (Hợp đồng mới) yêu cầu loại bỏ tất cả hợp đồng đã có trong Fast không phân biệt trạng thái.
  - Chuẩn hóa chuỗi so khớp (`normalizeText`) giữ lại dấu gạch chéo `/` và khoảng trắng, dễ dẫn đến không khớp khi định dạng viết lệch (ví dụ `"HD01/AD"` so với `"HD01 / AD"`).
- **Mục tiêu:**
  - Loại bỏ hoàn toàn ngoại lệ Trạng thái = 2 khỏi phần lọc của Hợp đồng mới.
  - Sử dụng hàm chuẩn hóa robust hơn (`normalizeContractNameKey`) để làm sạch triệt để khoảng trắng và ký tự đặc biệt khi thực hiện đối soát mã/tên hợp đồng.
- **Kết quả mong đợi:** Xuất file Excel và hiển thị UI loại bỏ chính xác 100% hợp đồng trùng lắp từ file Fast.

## 2. Phạm vi

### In scope
- **[FR-01]** Bổ sung `normalizeContractNameKey` vào dòng import của [HopDongMoiView.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/components/HopDongMoiView.tsx) trước khi thay thế hàm chuẩn hóa (blocker bắt buộc — compile error nếu bỏ qua).
- **[FR-01]** Sửa hàm đối soát `fastLookupMap` sử dụng `normalizeContractNameKey` thay vì `normalizeText` để loại bỏ khoảng trắng triệt để khi so khớp.
- **[FR-01]** Sửa điều kiện loại trừ trùng trong `eligibleExportRows` và `shouldKeepRow`: loại bỏ ngoại lệ `isStatus2`, hợp đồng trùng bị loại hoàn toàn không phân biệt trạng thái.
- **[FR-02]** Thêm comment vào code giải thích sự khác biệt giữa `normalizeContractNameKey` (chỉ strip khoảng trắng, phù hợp so khớp mã) và `normalizeText` (strip thêm dấu tiếng Việt, phù hợp so khớp text tự nhiên).
- **[FR-03]** Ghi chú rõ trong code rằng `eligibleExportRows` (Excel export) luôn loại trùng bất kể trạng thái toggle UI `filterActive`.

### Out of scope
- Sửa đổi logic luân chuyển hợp đồng ở màn hình `LuanChuyenView.tsx` hoặc `BangKeView.tsx`.
- Sửa đổi cấu trúc cột hoặc các trường dữ liệu đầu ra khác.

## 3. Đối chiếu Knowledge Base

- **Quyết định kế thừa:** Giữ nguyên chiến lược lưu trữ, xử lý Excel bằng luồng helper chung (`src/utils/fastImport.ts` và `src/utils/excel.ts`).
- **"Cấm kỵ" cần tránh:** Không phá vỡ cấu trúc xuất 36 cột phục vụ FAST Accounting. Không thay đổi cấu trúc của `LuanChuyenView.tsx`.
- **Ràng buộc kiến trúc liên quan:** So khớp và chuẩn hóa dựa trên các utils có sẵn để tránh trôi lệch logic (logic drift).

## 4. Giả định và câu hỏi mở

### Giả định
- Không có yêu cầu giữ lại các hợp đồng có trạng thái đặc biệt nào khác trong màn hình Hợp đồng mới nếu chúng đã tồn tại trong Fast.
- **[FR-03]** Behavior của `eligibleExportRows` (Excel luôn loại trùng, bất kể toggle UI) là **intentional** — export Excel là hành động chốt cuối, cần đảm bảo tính đúng đắn tuyệt đối.

### Câu hỏi mở
- Không có câu hỏi blocking.

## 5. Acceptance Criteria

- [x] UI không hiển thị các hợp đồng có mã hoặc tên trùng lắp với dữ liệu Fast (đã tải lên) khi bật bộ lọc loại trừ trùng.
- [x] Tệp Excel xuất ra không chứa bất kỳ hợp đồng nào trùng lắp với dữ liệu Fast (không phân biệt Trạng thái trong Fast là 1 hay 2).
- [x] So khớp chính xác kể cả khi có khoảng trắng thừa hoặc lệch ký tự phân cách (ví dụ `HD01/AD` vs `HD01 / AD`).

## 6. Files và modules bị ảnh hưởng

| File/Module | Hành động | Lý do chạm vào | Rủi ro | Contract |
|-------------|-----------|----------------|--------|----------|
| [HopDongMoiView.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/components/HopDongMoiView.tsx) | Sửa | Sửa logic lọc đối soát và hàm chuẩn hóa mã khi so khớp trùng | 🟢 Thấp | Có |

## 7. Risk Triage và Review Focus

- **Review required:** Đã review (feature-review round 1 — ⚠️ CẦN SỬA, đã bổ sung)
- **Risk hotspots:**
  - **[FR-01 — Blocker đã giải quyết]** `normalizeContractNameKey` phải được import vào `HopDongMoiView.tsx` trước khi dùng.
  - **[FR-02 — Khuyến nghị]** `normalizeContractNameKey` chỉ strip khoảng trắng, không strip dấu tiếng Việt — khác với `normalizeText`. Cần comment rõ trong code.
  - **[FR-03 — Khuyến nghị]** `eligibleExportRows` luôn loại trùng bất kể toggle UI — behavior intentional, cần comment và/hoặc tooltip UX.
- **Review focus areas:** Đã phủ hết trong round 1. Không còn concern mở.
- **Known pitfalls / historical issues:** Trôi lệch logic đối soát trùng lặp giữa các view do sử dụng các hàm normalize khác nhau.

## 8. Chiến lược triển khai

- **Phase strategy:** Chia làm 1 phase duy nhất vì chỉnh sửa cực kỳ nhỏ và tập trung vào 1 file view.
- **Thứ tự triển khai:**
  1. Cập nhật hàm xây dựng map đối soát `fastLookupMap` trong [HopDongMoiView.tsx](file:///d:/Project_VCC/KeToanVCC/Xu%20ly%20hop%20dong%20-%20bang%20ke/src/components/HopDongMoiView.tsx) sử dụng `normalizeContractNameKey`.
  2. Sửa điều kiện `eligibleExportRows` và `shouldKeepRow`.
- **Yêu cầu migration / config / deploy:** Không.

## 9. Test Strategy

- **Automated tests:** Không có (không có bộ unit test chạy tự động sẵn).
- **Manual verification:**
  - Tải lên tệp hợp đồng mới chứa hợp đồng test (Ví dụ: `HD999`).
  - Tải lên tệp Fast chứa hợp đồng test đó ở trạng thái `2` (Ví dụ: `HD999/AD` hoặc `HD999AD`).
  - Kiểm tra xem `HD999` có bị loại trừ khỏi danh sách hiển thị và file Excel xuất ra hay không.
  - Thử nghiệm với các biến thể khoảng trắng: `HD999 / AD` trong Fast, xem hệ thống có nhận diện trùng chính xác hay không.
  - **[FR-03]** Tắt toggle lọc trùng trên UI → xác nhận hợp đồng trùng vẫn **không xuất hiện** trong file Excel (behavior intentional).

## 10. Rollback Plan

- Khôi phục phiên bản git trước đó của file `HopDongMoiView.tsx`.

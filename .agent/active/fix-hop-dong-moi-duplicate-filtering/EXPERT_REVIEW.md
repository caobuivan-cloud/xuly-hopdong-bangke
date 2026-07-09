---
source: expert-rebuttal-codex
feature: fix-hop-dong-moi-duplicate-filtering
round: 3
timestamp: 2026-07-09T14:26:42+07:00
verdict: ⚠️ CÒN FINDING
---

# Expert Review - Codex Desktop

## Tóm tắt
- Findings mới: 2
- Findings đã dedupe/không lặp: 3 finding cũ từ round 2 chỉ xác nhận plan/tasks đã cover, nhưng code hiện tại vẫn chưa implement đúng các điểm đó.
- Vùng đã scan:
  - `.agent/active/fix-hop-dong-moi-duplicate-filtering/FEATURE_PLAN.md:15-29,45,66-88`
  - `.agent/active/fix-hop-dong-moi-duplicate-filtering/FEATURE_TASKS.md:20-29`
  - `.agent/active/fix-hop-dong-moi-duplicate-filtering/EXPERT_REVIEW.md:1-29`
  - `src/components/HopDongMoiView.tsx:18-20,271-282,407-411,621-685`
  - `src/utils/businessLogic.ts:15-17,63-81`

## Findings Cần Antigravity Phản Biện

### EFR-01: Code vẫn dùng `normalizeText`, nên case lệch khoảng trắng quanh `/` chưa được loại trừ [P1][High]
- Issue: Plan/tasks yêu cầu import và dùng `normalizeContractNameKey` cho `fastLookupMap` và lookup hợp đồng, nhưng `HopDongMoiView.tsx` hiện vẫn chỉ import `normalizeText` và vẫn dùng `normalizeText` cho key đối soát Fast. Vì `normalizeText` giữ khoảng trắng nội bộ và giữ `/`, `"HD01/AD"` normalize thành `"hd01/ad"` còn `"HD01 / AD"` normalize thành `"hd01 / ad"`, nên không match.
- Evidence:
  - `FEATURE_PLAN.md:25-26` yêu cầu bổ sung import `normalizeContractNameKey` và dùng nó thay `normalizeText` khi build `fastLookupMap`.
  - `FEATURE_TASKS.md:20-21` giao Task 1.1/1.2 đúng các dòng import, build map và lookup.
  - `src/components/HopDongMoiView.tsx:18-20` import `normalizeText` nhưng chưa import `normalizeContractNameKey`.
  - `src/components/HopDongMoiView.tsx:280-281` build `fastLookupMap` bằng `normalizeText(fastTen)` và `normalizeText(fastCode)`.
  - `src/components/HopDongMoiView.tsx:408-411` lookup bằng `normalizeText(tenHopDong)` và `normalizeText(maHopDong)`.
  - `src/utils/businessLogic.ts:15-17` `normalizeContractNameKey` strip toàn bộ whitespace; `src/utils/businessLogic.ts:77-81` `normalizeText` giữ `/` và chỉ gộp whitespace thành một dấu cách.
- Impact: Acceptance Criteria "HD01/AD vs HD01 / AD" vẫn fail; hợp đồng đã có trong Fast có thể tiếp tục hiển thị trên UI và lọt vào Excel export nếu khác format khoảng trắng quanh ký tự phân cách.
- Required Fix: Import `normalizeContractNameKey` trong `HopDongMoiView.tsx` và dùng nó cho cả hai phía build/lookup của `fastLookupMap` tại các dòng 280-281 và 408-411. Giữ `normalizeText` cho search/master-data matching nếu vẫn phù hợp.

### EFR-02: Ngoại lệ `isStatus2` vẫn giữ hợp đồng trùng trong UI và Excel export [P1][High]
- Issue: Plan yêu cầu loại bỏ tất cả hợp đồng đã tồn tại trong Fast không phân biệt trạng thái, nhưng `shouldKeepRow` và `eligibleExportRows` vẫn cho phép dòng trùng đi qua khi `fastStatus === '2'`.
- Evidence:
  - `FEATURE_PLAN.md:15` mô tả lỗi gốc là logic giữ ngoại lệ `isStatus2` trong Hợp đồng mới.
  - `FEATURE_PLAN.md:27` yêu cầu bỏ ngoại lệ `isStatus2` khỏi `eligibleExportRows` và `shouldKeepRow`.
  - `FEATURE_TASKS.md:22` giao Task 1.3 loại bỏ `isStatus2` tại đúng hai vùng code.
  - `src/components/HopDongMoiView.tsx:621-625` `shouldKeepRow` vẫn tính `isStatus2` và return `!row.existsInFast || isStatus2`.
  - `src/components/HopDongMoiView.tsx:681-685` `eligibleExportRows` vẫn chỉ loại khi `row.existsInFast && !isStatus2`, tức status `2` vẫn được export.
- Impact: Mục tiêu chính của feature không đạt: hợp đồng trùng trong Fast với Trạng thái = 2 vẫn xuất hiện trên UI khi bật lọc trùng và vẫn có thể nằm trong file Excel xuất ra.
- Required Fix: Trong màn hình Hợp đồng mới, khi `fileFast` đã nạp và `row.existsInFast === true`, loại dòng đó khỏi `shouldKeepRow` khi `filterActive` bật và khỏi `eligibleExportRows` luôn luôn, không xét `fastStatus`.

## Không Raise Vì Thiếu Evidence / Đã Được Cover
- Không raise riêng FR-02 comment normalize: nếu sửa EFR-01, comment theo Task 1.4 là đủ; thiếu comment không phải blocker độc lập khi logic chưa sửa.
- Không raise riêng FR-03 comment export/toggle: EFR-02 đã cover lỗi hành vi export thực tế; comment theo Task 1.5 nên đi kèm fix.
- Không đọc KB/CONTEXT/PROJECT_STRUCTURE vì finding không phụ thuộc convention hoặc ownership path.

## Kết Luận
- Có finding mới. Gửi file này cho `expert-rebuttal` để Antigravity phản biện hoặc accept và cập nhật plan/tasks/code tương ứng.

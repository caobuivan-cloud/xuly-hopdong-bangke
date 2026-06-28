# Feature Plan: Lịch đăng 1 ngày → bỏ trống Ngày kết thúc

> **Trạng thái**: ✅ ĐỒNG Ý
> **Review gate**: User xác nhận bỏ qua review (2026-06-29) — thay đổi nhỏ, ít rủi ro, đã ghi trong plan.
> **Feature slug**: `bangke-single-date-no-enddate`
> **Tạo bởi**: feature-plan
> **Ngày tạo**: 2026-06-29

---

## 1. Bối cảnh và mục tiêu

- **Bối cảnh:** Trong xử lý Bảng kê, cột Lịch đăng (Cột D) được parse ra 2 cột phái sinh: **Ngày bắt đầu (Cột S)** và **Ngày kết thúc (Cột T)**. Logic hiện tại (hàm `parsePostingDateRange` trong `businessLogic.ts`) khi gặp một chuỗi là **ngày đơn** (không có dải ngày) sẽ gán cả `startDate` lẫn `endDate` bằng cùng một ngày đó.
- **Vấn đề cần giải quyết:** Khi Lịch đăng chỉ có 1 chuỗi ngày (ngày đơn, không có dải), Ngày kết thúc phải để trống (`null`/rỗng), không được sao chép bằng Ngày bắt đầu. Spec nghiệp vụ tại `De bai xu ly hop dong bang ke.md` dòng 166–167 đã được cập nhật theo yêu cầu này.
- **Mục tiêu:** Cập nhật logic parse để: **ngày đơn** → `startDate = ngày đó`, `endDate = null`.
- **Kết quả mong đợi:** Sau khi fix, cell Ngày kết thúc (Cột T) sẽ **rỗng** khi Lịch đăng là một ngày duy nhất, trong khi các trường hợp dải ngày (Case A, B, C) vẫn hoạt động đúng.

---

## 2. Phạm vi

### In scope
- Sửa **Case D** trong `parsePostingDateRange` (`businessLogic.ts`): khi ngày đơn, đặt `endDate = null` thay vì `endDate = dateObj`.
- Sửa **Fallback parser** (Case cuối, `else if matches.length === 1`): cùng logic, đặt `endDate = null`.
- Cập nhật JSDoc của hàm `parsePostingDateRange` để ghi nhận hành vi mới.
- Không cần sửa `BangKeView.tsx` vì hàm `formatDateDayLocal(null)` đã trả về `''` (rỗng).

### Out of scope
- Không thay đổi logic Case A (dải đầy đủ), Case B (`d-d/M/yyyy`), Case C (`d/M-d/M/yyyy`).
- Không thay đổi UI render của cột Ngày kết thúc.
- Không thay đổi logic xuất Excel / FAST Import.

---

## 3. Đối chiếu Knowledge Base

- **Quyết định kế thừa:** Logic ánh xạ bảng kê tập trung tại `src/utils/businessLogic.ts`. Không được phân tán logic parse ra nơi khác.
- **"Cấm kỵ" cần tránh:** Không tạo bản sao logic `parsePostingDateRange` trong component. Chỉ sửa tại nguồn gốc.
- **Ràng buộc kiến trúc liên quan:** `BangKeView.tsx` dùng kết quả trả về từ `parsePostingDateRange` qua `formatDateDayLocal(d: Date | null)` — hàm này đã xử lý `null` trả về `''`. Do đó chỉ cần sửa layer util, không cần sửa UI.

---

## 4. Giả định và câu hỏi mở

### Giả định
- Hành vi mới áp dụng **cho mọi điểm gọi** `parsePostingDateRange` (cả lúc import file Excel ban đầu lẫn lúc user inline-edit Lịch đăng trong bảng).
- Spec hiểu: "chỉ có 1 chuỗi giá trị ngày tháng" = chuỗi chỉ parse ra được 1 ngày duy nhất → khớp Case D (`singleMatch`) hoặc Fallback `matches.length === 1`.
- `formatDateDayLocal(null)` đã trả về `''` → cột T tự động rỗng mà không cần thêm xử lý ở UI.

### Câu hỏi mở
- [Non-blocking] Nếu sau này có thêm pattern ngày đơn khác (ví dụ `d-M-yyyy`), cần bổ sung thêm case vào hàm. Hiện tại giả định spec đã đầy đủ.

---

## 5. Acceptance Criteria

- [ ] Khi Lịch đăng = `"15/06/2026"` (ngày đơn `dd/MM/yyyy`): Ngày bắt đầu = `15/06/2026`, Ngày kết thúc = **rỗng**.
- [ ] Khi Lịch đăng = `"5/6/26"` (ngày đơn `d/M/yy`): Ngày bắt đầu = `05/06/2026`, Ngày kết thúc = **rỗng**.
- [ ] Khi Lịch đăng = `"01/06/2026-15/06/2026"` (Case A, dải đầy đủ): Ngày bắt đầu = `01/06/2026`, Ngày kết thúc = `15/06/2026` (không đổi).
- [ ] Khi Lịch đăng = `"01-15/06/2026"` (Case B, dải rút gọn): Ngày bắt đầu = `01/06/2026`, Ngày kết thúc = `15/06/2026` (không đổi).
- [ ] Khi Lịch đăng = `"15/5-20/6/2026"` (Case C): Ngày bắt đầu = `15/05/2026`, Ngày kết thúc = `20/06/2026` (không đổi).
- [ ] Inline edit cột Lịch đăng trong UI → nhập ngày đơn → Ngày kết thúc tự clear thành rỗng.
- [ ] JSDoc của `parsePostingDateRange` được cập nhật ghi nhận hành vi ngày đơn mới.

---

## 6. Files và modules bị ảnh hưởng

| File/Module | Hành động | Lý do chạm vào | Rủi ro | Contract |
|-------------|-----------|----------------|--------|----------|
| `src/utils/businessLogic.ts` | Sửa | Nơi duy nhất chứa `parsePostingDateRange` | 🟢 Thấp | Chưa có file contract riêng |
| `src/components/BangKeView.tsx` | Không sửa | `formatDateDayLocal(null)` đã trả `''` | 🟢 N/A | N/A |

---

## 7. Risk Triage và Review Focus

- **Review required:** Không bắt buộc (thay đổi nhỏ, scope hẹp, 2 dòng code).
- **Risk hotspots:**
  - Case D (`singleMatch`) ở dòng 385–391 `businessLogic.ts`: Thay `result.endDate = dateObj` → `result.endDate = null`.
  - Fallback Case (`else if matches.length === 1`) ở dòng 401–406: Thay `result.endDate = dateObj` → `result.endDate = null`.
- **Review focus areas:**
  - Xác nhận không có call-site nào phụ thuộc vào `endDate === startDate` khi ngày đơn (grep đã xác nhận: 2 call-site trong `BangKeView.tsx` đều xử lý `null` đúng).
- **Known pitfalls / historical issues:** Không có tiền lệ lỗi liên quan đến hàm này.
- **Dependencies / rollout concerns:** Không cần migration. Restart dev server là đủ.

---

## 8. Chiến lược triển khai

- **Phase strategy:** 1 phase duy nhất (thay đổi nhỏ, tập trung 1 file).
- **Thứ tự triển khai:**
  1. Sửa Case D trong `parsePostingDateRange` (`businessLogic.ts` dòng ~389).
  2. Sửa Fallback Case (`matches.length === 1`) trong cùng hàm (dòng ~405).
  3. Cập nhật JSDoc của hàm.
- **Điểm cần phối hợp:** Không.
- **Yêu cầu migration / config / deploy:** Không.

---

## 9. Test Strategy

- **Automated tests:** Không có framework test sẵn. Dùng manual verification.
- **Manual verification:**
  - Chạy app (`npm run dev`).
  - Upload file Bảng kê với các Lịch đăng: ngày đơn, dải đầy đủ, dải rút gọn.
  - Kiểm tra cột S (Ngày bắt đầu) và cột T (Ngày kết thúc) hiển thị đúng.
  - Inline edit ô Lịch đăng sang ngày đơn → verify Ngày kết thúc tự clear về rỗng.
- **Data / env chuẩn bị:** File Bảng kê Excel mẫu có ít nhất 3 loại Lịch đăng đề cập trên.

---

## 10. Rollback Plan

- Thay đổi chỉ ở 2 dòng trong `businessLogic.ts`. Hoàn nguyên 2 dòng đó là xong.
- Không có database, migration, hay cấu hình nào bị ảnh hưởng.

---

## 11. Tham chiếu thực thi

- Checklist chi tiết theo phase: `FEATURE_TASKS.md`

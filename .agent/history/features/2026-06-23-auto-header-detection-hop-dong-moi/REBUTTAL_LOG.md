## Round 1 - 2026-06-23T17:40:00+07:00

### Tổng kết
- EFR: 2 (accepted: 2, rejected: 0, inconclusive: 0) | SFR mới: 0 | Plan sửa: có
- Mode: normal
- Context loaded: `src/types.ts`, `src/utils/excel.ts`, `src/components/HopDongMoiView.tsx`

### EFR Đã Chấp Nhận -> [EFR-01]: Thay đổi `parseExcelFile`/`HEADER_KEYWORDS` trong `excel.ts` có phạm vi toàn app, mâu thuẫn với out-of-scope của plan | Sửa: Đã cập nhật `FEATURE_PLAN.md` và `FEATURE_TASKS.md` để ghi chú rõ ràng về việc giữ parser tương thích ngược, thực hiện regression test trên các màn hình khác như `BangKeView` và `LuanChuyenView` để tránh ảnh hưởng diện rộng.

### EFR Đã Chấp Nhận -> [EFR-02]: Contract dòng header đang lẫn 0-based và dòng người dùng nhìn thấy, dễ chọn lệch header trên UI | Sửa: Đã thống nhất contract trong `FEATURE_PLAN.md` và `FEATURE_TASKS.md`: UI sẽ hiển thị 1-based index (từ 1 đến 10), và code/state nội bộ sẽ map sang 0-based index (từ 0 đến 9).

### Vùng đã scan khi không có SFR ->
- `src/utils/excel.ts`: Quét logic tự động nhận diện header để đảm bảo an toàn cho các view khác.
- `src/components/HopDongMoiView.tsx`: Quét cấu trúc dữ liệu lưu danh sách file.

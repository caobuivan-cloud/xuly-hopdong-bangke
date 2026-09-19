# Feature Plan: Nhận diện tự động và quy đổi đa mẫu bảng kê (MMS, SUN, WPP & Cơ chế mở rộng)

> **Trạng thái**: ✅ ĐỒNG Ý
> **Review gate**: Đã hoàn tất review hội đồng kỹ thuật. Đạt chuẩn triển khai sang `feature-coordinator`.
> **Feature slug**: `multi-template-bangke-recognition`
> **Tạo bởi**: feature-plan
> **Ngày tạo**: 2026-09-19

---

## 1. Bối cảnh và mục tiêu

- **Bối cảnh:** Hiện tại tab "Bảng kê chi tiết" (`BangKeView.tsx`) đang xử lý theo mẫu bảng kê chuẩn (cột Mã booking, Lịch đăng, Số HT, Nội dung quảng cáo, v.v.). Tuy nhiên thực tế doanh nghiệp phát sinh 3 mẫu bảng kê của các khách hàng/đối tác lớn gồm **MMS**, **SUN**, **WPP** có cấu trúc cột, tiêu đề và logic trích xuất thông tin khác với bảng kê chuẩn.
- **Vấn đề cần giải quyết:** 
  1. Người dùng phải thao tác cấu hình thủ công hoặc không thể import trực tiếp các file mẫu này nếu không chỉnh sửa trước file Excel.
  2. Cần tự động nhận diện mẫu bảng kê khi upload (gợi ý mẫu được phát hiện tự động, nhưng vẫn cho phép người dùng chọn/đổi thủ công trên UI).
  3. Cần quy đổi chuẩn hóa dữ liệu từ các mẫu MMS, SUN, WPP về đúng schema/logic của bảng kê chuẩn trước khi thực hiện logic kế toán (tính FAST, mapping mã vụ việc, tách lịch đăng, tính thuế, xuất 36 cột...).
  4. Hệ thống phải có kiến trúc dạng **Adapter/Plugin Registry** mở rộng được, giúp dễ dàng thêm các mẫu phát sinh sau này mà không làm xáo trộn hoặc phá vỡ logic chuẩn hiện tại.
- **Mục tiêu:** 
  - Tự động nhận diện chính xác 4 mẫu: `STANDARD` (Chuẩn), `MMS`, `SUN`, `WPP`.
  - Ánh xạ chuẩn xác từng trường nghiệp vụ theo đúng yêu cầu đề bài của anh cho 3 mẫu mới.
  - Giữ nguyên 100% logic xử lý cũ của bảng kê chuẩn và các tab khác.
- **Kết quả mong đợi:** 
  - Khi tải file lên, hệ thống tự động xác định template, hiển thị huy hiệu (badge)/select mẫu cho người dùng.
  - Khi bấm xử lý bảng kê, hệ thống áp dụng bộ chuyển đổi tương ứng, ra bảng kết quả và file xuất Fast 36 cột chính xác.

---

## 2. Phạm vi

### In scope
1. **Kiến trúc Template Registry & Detection Engine:**
   - Xây dựng module quản lý mẫu (`src/utils/bangKeTemplates/` hoặc `src/utils/bangKeAdapters.ts`).
     - **Kiến trúc nhận diện 3 lớp (3-Layer Detection Engine) đa tầng, độ tin cậy tuyệt đối:**
       + **Lớp 1 (Primary - Header Keyword Fingerprint):** Quét linh hoạt các dòng để tìm header thật và so khớp các từ khóa độc nhất không phụ thuộc vào vị trí dòng:
         * *Mẫu MMS:* Cột `Hợp đồng` + `Số HT` (không có cột `Mã booking`/`Mã book`) kết hợp với `Chiến dịch`, `ĐVT`.
         * *Mẫu SUN:* Cột `Mã book` + `Số HT` (hoặc `STT chi tiết`, `Đơn vị`).
         * *Mẫu WPP:* Cột `IO WPP`, `Cách mua`, `Sản phẩm`, `Website/tag`, `Tên banner`, `Ngày bắt đầu`, `Ngày kết thúc`.
         * *Mẫu Chuẩn (Standard):* Cột `Mã booking` và `Lịch đăng` / `Lịch chạy`.
       + **Lớp 2 (Secondary - Metadata Bên A / Tiêu đề đầu trang):** Quét các dòng metadata đầu file (trước header) kiểm tra tên đơn vị mua/bán (ví dụ: *Công ty TNHH Truyền thông MMS Việt Nam*, *Công ty CP Thương mại & Truyền thông Thời Đại* (Sun), *Công ty TNHH Truyền thông WPP*).
       + **Lớp 3 (Tertiary - Biến thể Header & Data Sampling dòng đầu tiên dưới Header):** Xử lý các trường hợp header bị biến đổi ngữ nghĩa/viết tắt và kiểm tra trực tiếp pattern dữ liệu của dòng đầu tiên ngay dưới header:
         * *Mẫu SUN:* Dòng đầu tiên dưới header tại cột Số HT có đuôi ngoặc `(HT...)` và cột Nội dung quảng cáo có chứa chuỗi `Loại quảng cáo :` / `Char(10)`.
         * *Mẫu WPP:* Cột Số HT có ngoặc `[...](HT...)`, các cột Ngày bắt đầu / kết thúc là số nguyên serial date hoặc text ngày, có chuỗi IO WPP dạng số mã chiến dịch.
         * *Mẫu MMS:* Cột Hợp đồng chứa mã có dạng `QC.../AD`, cột Số HT dạng `HT.../AD`.
2. **Quy đổi chi tiết cho 3 mẫu:**
   - **Mẫu MMS:** <!-- Sửa theo EFR-03, EFR-04: Bổ sung mapping cột tiền MMS, chuẩn hóa Số HT idempotent -->
     - `Mã booking`: Lấy từ cột "Hợp đồng" trên bảng kê (loại bỏ hậu tố `/AD` nếu có để thành mã booking gốc, sau đó ghép lại tên hợp đồng theo chuẩn).
     - `Số HT`: Lấy nguyên từ cột "Số HT" (đã có sẵn hậu tố `/AD`, trim khoảng trắng thừa).
     - `Thành tiền sau CK`: Map trực tiếp từ cột `Thành tiền VNĐ\r\n(không VAT)` (ưu tiên giá trị nguồn khi hợp lệ để tránh sai lệch làm tròn/ưu đãi).
     - `Chiết khấu`: Đọc tỷ lệ chiết khấu nguồn (hoặc tổng CK + CK ưu đãi nếu có).
     - Dòng header: Tự động dò dòng 12 (hoặc qua dynamic header detector).
   - **Mẫu SUN:** <!-- Sửa theo EFR-04 -->
     - `Mã booking`: Lấy từ cột "Mã book" (loại bỏ `/AD` nếu có để lưu mã booking chuẩn, phục vụ tạo Tên HĐ = Mã booking + `/AD`).
     - `Số HT`: Trích xuất 14 ký tự trong dấu ngoặc đơn `(...)` cuối ô "Số HT" (ví dụ: `TT2026-004/HĐQC/TDC-VCCORP (HT0080126/AD)` -> lấy `HT0080126/AD`).
   - **Mẫu WPP:** <!-- Sửa theo EFR-02, EFR-04 -->
     - `Mã booking`: Lấy từ cột "Mã booking" (xử lý hậu tố `/AD` tương thích).
     - `Lịch đăng`: Ghép cột "Ngày bắt đầu" (Cột S) và "Ngày kết thúc" (Cột T) thành chuỗi lịch đăng dạng `DD/MM/YYYY - DD/MM/YYYY` (xử lý an toàn cả kiểu `Date` runtime, Excel serial date như `46161`, hoặc text ngày).
     - `Chiết khấu`: Tổng của cột "Chiết khấu" (Cột O) + "Chiết khấu ưu đãi" (Cột P), hỗ trợ cả số thập phân (0.2 + 0.04 = 24%) hoặc chuỗi `%`.
     - `Chuyên trang`: Ghép từ: Cột "Cách mua" + "Sản phẩm" + "Website/tag" + "Tên banner" (bỏ qua các giá trị rỗng).
     - `Số HT`: Trích xuất 14 ký tự trong dấu ngoặc đơn `(...)` cuối ô "Số HT" (ví dụ: `[01/WPP/VCC/2026] (HT0010126/AD)` -> lấy `HT0010126/AD`).
     - `Bỏ dòng`: Bỏ các dòng có thành tiền sau CK trống hoặc bằng 0 theo mô tả nghiệp vụ.
   - **Quy tắc tiêu thụ downstream các trường normalized (Normalized Precedence Contract):** <!-- Sửa theo EFR-07, EFR-10, EFR-11 -->
     * `parseOptionalNumber(value): number | null`: Xây dựng helper parse số có sentinel: trả về `null` khi giá trị là `null`, `undefined`, chuỗi rỗng hoặc không thể parse thành số (`NaN`); trả về `number` chuẩn khi có giá trị số (kể cả số `0`).
     * `thanhTienSauCk`:
       - Sử dụng `parsedSourceMoney = parseOptionalNumber(normalized.thanhTienSauCkRaw)`.
       - Mẫu WPP: Lọc bỏ dòng ngay lập tức nếu `parsedSourceMoney === null || parsedSourceMoney === 0`.
       - Mẫu khác: Nếu `parsedSourceMoney !== null`, ưu tiên sử dụng `thanhTienSauCk = parsedSourceMoney` (kể cả khi bằng 0). Chỉ khi `parsedSourceMoney === null` (ô trống hoặc chữ lỗi không parse được) mới fallback về công thức tính lại `soLuong * donGia * (1 - chietKhau / 100)`.
     * **Công thức tính tiền chung thống nhất (Unified Money & Tax Formula):**
       - Giá trị trước thuế: `tienTruocVat = thanhTienSauCk` (dựa trực tiếp trên `thanhTienSauCk` nguồn đã chốt của bảng kê, không dùng công thức `soLuong * donGia * (1 - CK)` để tính đè lên).
       - Cách áp thuế suất (`thueSuat`):
         1. Ưu tiên 1: Thuế suất cấu hình theo sheet (nếu có dòng VAT quét từ sheet).
         2. Ưu tiên 2: Thuế suất lấy theo sản phẩm khớp được (`matchResult.bestMatch.thueSuat`).
         3. Ưu tiên 3: Thuế suất dòng đọc từ bảng kê (nếu có cột VAT/Thuế suất).
         4. Fallback: Thuế suất mặc định trong cấu hình chung (`config.taxRate`).
       - Hệ số thuế: `taxRateMultiplier = thueSuat > 1 ? thueSuat / 100 : thueSuat`.
       - Giá trị có VAT hạch toán:
         $$\text{giaTriCuaVvVat} = \text{Math.round}(\text{thanhTienSauCk} \times (1 + \text{taxRateMultiplier}))$$
         Công thức này đảm bảo kể cả khi bảng kê có số tiền thực tế cố ý lệch so với phép nhân `Số lượng x Đơn giá x (1 - CK)` (do ưu đãi gói, làm tròn, phụ phí hoặc điều chỉnh), hệ thống vẫn giữ nguyên 100% số tiền đã chốt trên bảng kê và tính thuế VAT chuẩn xác trên số tiền đó.
     * `chuyenTrang`: Với mẫu WPP và SUN, `chuyenTrang` đã được adapter tổng hợp (WPP = Cách mua + Sản phẩm + Website/tag + Tên banner; SUN = trích xuất sau `Loại quảng cáo :`). Luồng downstream trong `BangKeView` bắt buộc **ưu tiên sử dụng `normalized.chuyenTrang`** trước, nếu không có mới fallback về `applyExceptionRules(noiDungQuangCao) || noiDungQuangCao`. Đảm bảo file FAST nhận đúng giá trị `Chuyên trang`.
     * `lookupContent` tra cứu sản phẩm/mã vụ việc (`keywordMatch`):
       - Mẫu WPP: Sử dụng chuỗi tổng hợp từ `Sản phẩm + Cách mua + Website/tag + Tên banner` (hoặc `chuyenTrang`) làm nội dung đối soát tìm `ma_vv`, `tk_doanh thu`, `Tên sản phẩm`.
       - Mẫu SUN: Sử dụng phần nội dung sau `Loại quảng cáo :` (hoặc kết hợp `chiTiet + noiDungQuangCao`) để match chính xác sản phẩm và mã vụ việc.
       - Mẫu MMS & Standard: Sử dụng `noiDungQuangCao`.
     * Cột `Ghi chú chi tiết`: Luôn dùng hàm idempotent `buildGhiChuChiTietIdempotent(soHt, separator, suffix)` để bảo toàn 14 ký tự Số HT sạch (`HT.../AD`), không bị nhân đôi thành `/AD/AD`.
3. **Giao diện người dùng & Cơ chế nạp nhiều file (`BangKeView.tsx`):** <!-- Sửa theo EFR-01, EFR-05, EFR-09 -->
   - Gán `id` duy nhất và ổn định (`id: string`) cho mỗi instance `UploadedFileData` khi upload (sinh bằng `crypto.randomUUID()` hoặc timestamp + random).
   - **Mỗi file bảng kê được chọn 1 template độc lập (Per-file Template Selector):**
     * Khi upload nhiều file, hệ thống chạy auto-detection độc lập cho từng file và gán template gợi ý vào `file.templateId` (đây là Single Source of Truth duy nhất, **hoàn toàn loại bỏ state `selectedTemplate` toàn cục**).
     * Tại danh sách file đã tải lên (`File đã tải lên`), bên cạnh tên file và số dòng, hiển thị trực tiếp một dropdown `<select>` chứa các tùy chọn: `Mẫu Chuẩn`, `Mẫu MMS`, `Mẫu SUN`, `Mẫu WPP` để người dùng có thể linh hoạt chọn lại template riêng biệt cho từng file.
     * Khi người dùng thay đổi template của một file, gọi hàm cập nhật cục bộ theo `file.id`, chỉ sửa đúng `templateId` của file đó.
   - **Normalize từng file trước khi gộp:** Mỗi file được trích xuất và chuẩn hóa theo đúng `rawArray`, `headerRowIndex`, `merges` và `templateId` riêng biệt của file đó, sau đó mới gộp dữ liệu rows đã chuẩn hóa vào `processedRows` để hiển thị và xuất FAST.
4. **Cơ chế mở rộng mẫu (Extensibility) & Kiến trúc Parser:** <!-- Sửa theo EFR-06, EFR-08 -->
   - Tách hàm thuần `parseExcelWorkbook(workbook: XLSX.WorkBook, fileName: string, fileSize: number): UploadedFileData` trong `src/utils/excel.ts`.
   - `parseExcelFile(file: File)` trong browser chỉ đọc `file.arrayBuffer()` và gọi `parseExcelWorkbook`.
   - Sử dụng test runner `tsx` chạy trực tiếp file TypeScript test `tests/phase1-templates.test.ts` qua lệnh `npm run test:phase1` (nạp trực tiếp 3 workbook Excel mẫu với `cellDates: true` để verify toàn diện mà không phụ thuộc browser `FileReader`).

### Out of scope
- Không thay đổi cấu trúc bảng kê chuẩn FAST 36 cột đầu ra (`fastImport.ts`).
- Không can thiệp vào tab Luân chuyển (`LuanChuyenView.tsx`) và Hợp đồng mới (`HopDongMoiView.tsx`).

---

## 3. Đối chiếu Knowledge Base

- **Quyết định kế thừa:**
  - `[2026-06-20] [Tập trung logic xuất 36 cột vào helper chung]`: Toàn bộ dữ liệu sau khi quy đổi từ template bất kỳ đều phải đưa về cấu trúc row chuẩn của `BangKeView`, để chuyển sang `buildFastImportRows` xuất 36 cột FAST mà không tạo luồng xuất riêng biệt.
  - Bảo toàn cơ chế `normalizeText`, `lookupExact`, `keywordMatch` tra cứu mã vụ việc/sản phẩm và tra cứu Hợp đồng Fast (`buildFastContractLookup`).
- **"Cấm kỵ" cần tránh:**
  - Tuyệt đối không hardcode phá vỡ cách parse của bảng kê chuẩn. Khi file không khớp mẫu MMS, SUN, WPP thì mặc định chạy 100% luồng STANDARD cũ.
  - Không làm chậm quá trình parse/import file lớn.
- **Ràng buộc kiến trúc:**
  - Đảm bảo tương thích ngược với các file Excel bảng kê chuẩn hiện có.

---

## 4. Giả định và câu hỏi mở

### Giả định
1. Mã booking trên bảng kê chuẩn vốn không có đuôi `/AD`, khi xuất Tên hợp đồng hệ thống tự thêm `/AD`. Ở mẫu MMS/SUN/WPP, cột mã booking trong file đã có sẵn đuôi `/AD` (ví dụ `QC1900226/AD`), hệ thống sẽ cắt bỏ đuôi `/AD` để lấy mã booking chuẩn `QC1900226`, phục vụ tra cứu khớp với file FAST và tự động thêm `/AD` khi lên Tên hợp đồng.
2. Về 14 ký tự Số HT trong dấu ngoặc: Đều nằm ở cuối cell dạng `...(HT0080126/AD)`, regex bắt cụm `\(([^)]+)\)$` hoặc lấy 14 ký tự cuối trong dấu ngoặc đều cho ra đúng mã `HT0080126/AD`.
3. Ngày tháng trong file WPP (và MMS) có thể ở dạng Excel Serial Number (như `46185`, `46161`), `Date` runtime object hoặc text ngày `DD/MM/YYYY`. Bộ adapter sẽ hỗ trợ convert tự động sang `DD/MM/YYYY`.

### Câu hỏi mở
- *Không có blocking issue*. Các quy tắc quy đổi của anh đã nêu rất rõ ràng và khớp hoàn toàn với dữ liệu thực tế kiểm tra trong 3 file mẫu Excel.

---

## 5. Acceptance Criteria

- [ ] **AC 1 (Auto-detection):** Khi upload file MMS, hệ thống tự động gợi ý mẫu "MMS". Khi upload file SUN, tự động gợi ý "SUN". Khi upload file WPP, tự động gợi ý "WPP". File thường tự động là "Chuẩn". Nhận diện độc lập cho từng file khi tải lên nhiều file cùng lúc.
- [ ] **AC 2 (Per-file Manual Template Selection):** Tại danh sách từng file đã tải lên (`fileBangKeList`), mỗi file có 1 dropdown select riêng biệt cho phép người dùng xem và chủ động chọn lại mẫu (`STANDARD`, `MMS`, `SUN`, `WPP`) độc lập cho từng file mà không làm ảnh hưởng đến các file khác.
- [ ] **AC 3 (MMS Logic):** Cột Hợp đồng chuyển thành Mã booking (+ `/AD` khi tạo Tên HĐ), Số HT giữ nguyên (`HT.../AD`), map trực tiếp `Thành tiền VNĐ (không VAT)`.
- [ ] **AC 4 (SUN Logic):** Cột Mã book chuyển thành Mã booking, Số HT lấy 14 ký tự trong dấu ngoặc cuối (`HT.../AD`), Nội dung quảng cáo tách dòng lấy sau "Loại quảng cáo :" làm chi tiết/chuyên trang và lookup sản phẩm/mã vụ việc.
- [ ] **AC 5 (WPP Logic):** Cột Ngày bắt đầu & Ngày kết thúc quy đổi thành Lịch đăng chuẩn; Chiết khấu = CK + CK ưu đãi; Chuyên trang = Cách mua + Sản phẩm + Website/tag + Tên banner (ưu tiên dùng làm Chuyên trang và lookup sản phẩm/mã vụ việc); Số HT lấy 14 ký tự trong ngoặc cuối; loại bỏ dòng có thành tiền <= 0 hoặc trống.
- [ ] **AC 6 (Extensibility & Fast Import):** Code được tổ chức thành Registry độc lập, bổ sung mẫu mới chỉ cần thêm 1 config/adapter object. Xuất file FAST 36 cột chuẩn xác.
- [ ] **AC 7 (Regression):** Mẫu bảng kê chuẩn hiện tại hoạt động bình thường, không suy giảm tính năng.

---

## 6. Files và modules bị ảnh hưởng

| File/Module | Hành động | Lý do chạm vào | Rủi ro | Contract |
|-------------|-----------|----------------|--------|----------|
| `src/types.ts` | Sửa | Khai báo `BangKeTemplateId`, `BangKeTemplateConfig`, mở rộng `UploadedFileData` với `id: string` và `templateId?: BangKeTemplateId` | 🟢 Thấp | Chưa |
| `src/utils/bangKeTemplates.ts` | Tạo mới | Registry các template, 3-layer detection, row transformers | 🟢 Thấp | Sẽ tạo contract |
| `src/utils/excel.ts` | Sửa | Tách core parser thuần `parseExcelWorkbook` | 🟢 Thấp | Có |
| `src/components/BangKeView.tsx` | Sửa | Per-file auto-detect & template selector UI, chuẩn hóa độc lập từng file trước khi gộp, ưu tiên normalized fields (`chuyenTrang`, `lookupContent`) | 🟡 Trung bình | Có contract sẵn |
| `src/utils/businessLogic.ts` | Sửa | Helper trích xuất Số HT ngoặc đơn, tách Loại quảng cáo SUN, date parser (`Date | number | string`), helper idempotent `buildGhiChuChiTietIdempotent` | 🟢 Thấp | Có |
| `package.json` | Sửa | Thêm npm script `test:phase1` chạy bằng `tsx` | 🟢 Thấp | Có |

---

## 7. Risk Triage và Review Focus

- **Review required:** Yes
- **Risk hotspots:** 
  1. *Trích xuất ngày tháng từ Excel serial number*: File MMS/WPP có thể chứa số nguyên như `46185` thay vì chuỗi text `DD/MM/YYYY`. Cần hàm chuyển đổi an toàn theo epoch Excel.
  2. *Cắt/ghép đuôi `/AD`*: Cần xử lý cẩn thận trường hợp ô đã có hoặc chưa có `/AD` để tránh bị nhân đôi thành `/AD/AD`.
  3. *Tỷ lệ chiết khấu WPP*: Chiết khấu có thể ở dạng số thực `0.2` hoặc `20%` hoặc text. Phép cộng `CK + CK ưu đãi` cần parse an toàn.
- **Review focus areas:** 
  - Cơ chế plugin/registry có đủ đơn giản để dev sau này thêm template mới mà không sửa logic lõi không?
  - UI gợi ý và cho chọn mẫu có thuận tiện, trực quan không?

---

## 8. Chiến lược triển khai

- **Phase 1: Xây dựng Core Template Engine & Helper trích xuất**
  - Khai báo kiểu dữ liệu trong `types.ts` (`BangKeTemplateId`, `UploadedFileData.id`, `UploadedFileData.templateId`).
  - Viết các helper chuyển đổi: `extractParenthesesTail`, `extractSunContentDetail`, `formatRawDateValue` (Date/serial/text), `cleanBookingCode`, `buildGhiChuChiTietIdempotent`, `parseAndSumDiscounts`.
  - Tách hàm thuần `parseExcelWorkbook` trong `src/utils/excel.ts`.
  - Tạo `src/utils/bangKeTemplates.ts` chứa Registry (`STANDARD`, `MMS`, `SUN`, `WPP`) kèm 3-layer `detector` và `rowTransformer`.
  - Viết và chạy test `npm run test:phase1` bằng `tsx` trên 3 file mẫu thật.
- **Phase 2: Tích hợp vào BangKeView với mô hình Per-File Template** <!-- Sửa theo EFR-09: Loại bỏ hoàn toàn selectedTemplate chung -->
  - Gán `id` duy nhất và tự động phát hiện `templateId` cho từng file upload trong `fileBangKeList` (Single Source of Truth duy nhất, không dùng state `selectedTemplate` chung).
  - Render dropdown `<select>` chọn template trên từng file item trong danh sách "File đã tải lên".
  - Chuẩn hóa độc lập từng file bằng chính `sheet`, `merges`, `headerRowIndex`, `rawArray` và `templateId` của file đó trước khi gộp vào `processedRows`.
  - Áp dụng Normalized Precedence: tiêu thụ `normalized.chuyenTrang` và `lookupContent` để map mã vụ việc và chuyên trang.
- **Phase 3: Kiểm thử toàn diện & Verification**
  - Chạy thử nghiệm đồng thời với cả 4 file: file Chuẩn, file MMS, file SUN, file WPP (kể cả kịch bản mixed upload).
  - Kiểm tra kết quả hiển thị trên bảng Preview và file Excel FAST xuất ra.

---

## 9. Test Strategy

- **Automated / Script Test:** 
  - Chạy script test TypeScript bằng lệnh `npm run test:phase1` trên 3 file mẫu (`Form/BK Mẫu MMS...`, `Form/BK Mẫu SUN...`, `Form/Mẫu BK WPP...`) để kiểm tra:
    1. Detector nhận diện đúng 100% mẫu cho từng file.
    2. Header row index dò đúng ở bất kỳ dòng nào.
    3. Trích xuất đúng ngày (xử lý `Date` object), số HT (không bị `/AD/AD`), chuyên trang, chiết khấu, và tiền nguồn MMS.
- **Manual verification:**
  - Tải mixed template (MMS + SUN) lên giao diện web dev, đổi template của 1 file và kiểm tra bảng kết quả.

---

## 10. Rollback Plan

- Nếu có sự cố bất thường, chỉ cần set template mặc định về `STANDARD` và hoàn nguyên `BangKeView.tsx`. Toàn bộ logic mới nằm gọn trong module riêng biệt `bangKeTemplates.ts` nên không gây ô nhiễm codebase.

---

## 11. Tham chiếu thực thi

- Checklist chi tiết theo phase: `FEATURE_TASKS.md`

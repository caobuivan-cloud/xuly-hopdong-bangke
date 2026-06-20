# Feature Plan: Lưu trữ dữ liệu cấu hình và Master Data qua Google Sheet

> **Trạng thái**: ✅ ĐỒNG Ý
> **Review gate**: [Đã thông qua review hội đồng chuyên môn ngày 2026-06-20]
> **Feature slug**: `google-sheets-storage`
> **Tạo bởi**: feature-plan
> **Ngày tạo**: 2026-06-20

---

## 1. Bối cảnh và mục tiêu

- **Bối cảnh:** Toàn bộ tham số cấu hình, rules và Master Data (Bộ phận, Khách hàng, Sản phẩm) hiện đang lưu trong `localStorage` và bị mất khi tải lại trang hoặc xóa cache.
- **Vấn đề cần giải quyết:** 
  - Khách hàng có bảng dữ liệu lớn (bảng mã khách hàng > 11,000 dòng). Nếu load trực tiếp từ Google Sheet trên mỗi lần mở app sẽ gây trễ mạng nặng, ảnh hưởng lớn đến trải nghiệm người dùng.
  - Người dùng không tự nhập URL mà hệ thống sẽ hardcode URL Google Apps Script Web App.
- **Mục tiêu:**
  - Hardcode URL Apps Script Web App.
  - Sử dụng chiến lược **Local Cache First**: Ứng dụng luôn khởi động và đọc ngay lập tức từ `localStorage` để giao diện phản hồi tức thì (< 50ms).
  - Tích hợp tính năng đồng bộ tự động tải ngầm (Background Auto-Sync): Khi mở trang, ứng dụng sẽ đọc dữ liệu từ cache `localStorage` trước để hiển thị ngay lập tức, đồng thời kích hoạt một tiến trình tải ngầm từ Google Sheet để cập nhật dữ liệu mới nhất vào local cache và giao diện sau khi tải xong. Chấp nhận tăng thời gian tải ngầm ban đầu một chút để đảm bảo dữ liệu luôn mới nhất.
  - Viết sẵn mã nguồn Google Apps Script (GAS) tối ưu hóa ghi/đọc mảng lớn (Batch Operation) để xử lý hơn 11,000 dòng trong dưới 3 giây.

## 2. Phạm vi

### In scope
- Định nghĩa hardcode URL Apps Script Web App trong mã nguồn.
- Cập nhật `src/services/dbService.ts` hỗ trợ tải và cập nhật Master Data đồng bộ từ GAS.
- Tích hợp trạng thái hiển thị Google Sheet (Connected / Synced / Error) và bảng hướng dẫn GAS.
- Đồng bộ hóa hoàn toàn tự động:
  - Tải ngầm (Background Pull) khi mở ứng dụng.
  - Tự động đẩy lên Google Sheets khi import file Excel Master Data mới thành công.
  - Tự động đẩy lên Google Sheets khi bấm xóa (Clear) Master Data.
- Viết file tài liệu GAS hoàn chỉnh để người dùng đưa lên Google Sheet.

### Out of scope
- Input chỉnh sửa URL trên giao diện UI (yêu cầu hardcode).
- Chế độ phân quyền chỉnh sửa từng sheet (GAS Web App sẽ quản lý tập trung).

## 3. Đối chiếu Knowledge Base

- **Quyết định kế thừa:**
  - Kế thừa interface `IMasterDataService` để giữ nguyên các luồng kiểm thử hạch toán ở `BangKeView`, `HopDongMoiView`, `LuanChuyenView`.
- **"Cấm kỵ" cần tránh:**
  - Không chặn tiến trình render của React khi đang fetch dữ liệu lớn. Phải fetch bất đồng bộ (`Promise`) và hiển thị loading indicator.

## 4. Giả định và câu hỏi mở

### Giả định
- Định dạng dữ liệu của các sheet khớp chính xác với cấu trúc cột đã thống nhất.
- Dung lượng dữ liệu 11k dòng của bảng Khách hàng tương đương khoảng 1MB-1.5MB JSON, hoàn toàn nằm trong giới hạn 5MB của `localStorage`.

---

## 5. Mã Google Apps Script (GAS) đề xuất

Người dùng sẽ copy toàn bộ mã này vào mục **Extensions > Apps Script** trên Google Spreadsheet của họ và chọn **Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone)**.

```javascript
// GAS Code để đọc/ghi dữ liệu hiệu năng cao (Batch operations)
const CONFIG_SHEET = "Config";
const RULES_SHEET = "ExceptionRules";
const DEPTS_SHEET = "Departments";
const CUSTS_SHEET = "Customers";
const PRODS_SHEET = "Products";

function doGet(e) {
  const action = e.parameter.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === 'read_all') {
    const data = {
      config: readSheetData(ss.getSheetByName(CONFIG_SHEET), true),
      exceptionRules: readSheetData(ss.getSheetByName(RULES_SHEET)),
      departments: readSheetData(ss.getSheetByName(DEPTS_SHEET)),
      customers: readSheetData(ss.getSheetByName(CUSTS_SHEET)),
      products: readSheetData(ss.getSheetByName(PRODS_SHEET))
    };
    return createJsonResponse(data);
  }
  
  return createJsonResponse({ error: "Invalid action" });
}

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === 'save_all') {
      if (postData.config) writeSheetData(ss.getSheetByName(CONFIG_SHEET), postData.config, true);
      if (postData.exceptionRules) writeSheetData(ss.getSheetByName(RULES_SHEET), postData.exceptionRules);
      if (postData.departments) writeSheetData(ss.getSheetByName(DEPTS_SHEET), postData.departments);
      if (postData.customers) writeSheetData(ss.getSheetByName(CUSTS_SHEET), postData.customers);
      if (postData.products) writeSheetData(ss.getSheetByName(PRODS_SHEET), postData.products);
      
      return createJsonResponse({ success: true, message: "Sync successful" });
    }
  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  }
  return createJsonResponse({ success: false, error: "Invalid action" });
}

// Hàm đọc dữ liệu nhanh từ Sheet thành mảng JSON Object
function readSheetData(sheet, isKeyValue = false) {
  if (!sheet) return isKeyValue ? {} : [];
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2) return isKeyValue ? {} : []; // Chỉ có header hoặc trống
  
  const values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = values[0];
  
  if (isKeyValue) {
    const result = {};
    for (let i = 1; i < values.length; i++) {
      const key = values[i][0];
      let val = values[i][1];
      // Thử parse JSON cho các mảng hoặc object
      try {
        if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
          val = JSON.parse(val);
        }
      } catch(e) {}
      if (key) result[key] = val;
    }
    return result;
  }
  
  const list = [];
  for (let i = 1; i < values.length; i++) {
    const item = {};
    let hasData = false;
    for (let j = 0; j < headers.length; j++) {
      item[headers[j]] = values[i][j];
      if (values[i][j] !== "") hasData = true;
    }
    if (hasData) list.push(item);
  }
  return list;
}

// Hàm ghi đè dữ liệu cực nhanh dạng Batch (tránh ghi từng ô)
function writeSheetData(sheet, dataList, isKeyValue = false) {
  if (!sheet) return;
  sheet.clearContents();
  
  if (isKeyValue) {
    sheet.appendRow(["Key", "Value"]);
    const rows = Object.keys(dataList).map(key => {
      let val = dataList[key];
      if (typeof val === 'object') val = JSON.stringify(val);
      return [key, val];
    });
    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, 2).setValues(rows);
    }
    return;
  }
  
  if (!Array.isArray(dataList) || dataList.length === 0) return;
  
  const headers = Object.keys(dataList[0]);
  sheet.appendRow(headers);
  
  const rows = dataList.map(item => headers.map(h => item[h] !== undefined ? item[h] : ""));
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

---

## 6. Acceptance Criteria

- [ ] URL Apps Script Web App được hardcode an toàn trong dự án.
- [ ] Khi khởi chạy ứng dụng, dữ liệu nạp tức thời từ `localStorage` để UI mượt mà, sau đó ứng dụng kiểm tra trạng thái hoặc người dùng chủ động click nút "Đồng bộ" để lấy dữ liệu mới nhất.
- [ ] Nút "Đồng bộ dữ liệu" tải toàn bộ Master Data mới (> 11k dòng) và cập nhật vào `localStorage` trong tối đa 3-5 giây mà không làm treo hay đơ trình duyệt (sử dụng async/await và loading state).
- [ ] Cung cấp nút "Đẩy dữ liệu lên Sheet" để upload dữ liệu local hiện tại lên lại Google Sheet.
- [ ] Ứng dụng vẫn hoạt động bình thường kể cả khi mất kết nối mạng (offline fallback).

## 7. Files và modules bị ảnh hưởng

| File/Module | Hành động | Lý do chạm vào | Rủi ro | Contract |
|-------------|-----------|----------------|--------|----------|
| `src/services/dbService.ts` | Sửa | Tích hợp fetch API với Google Sheets URL, xử lý Batch sync | 🟢 Thấp | Có |
| `src/components/SettingsView.tsx` | Sửa | Thêm nút đồng bộ, hiển thị trạng thái số lượng dòng cập nhật | 🟢 Thấp | Có |
| `src/App.tsx` | Sửa | Điều khiển luồng đồng bộ config và rules từ Google Sheets | 🟢 Thấp | Có |

## 8. Test Strategy

- Sử dụng Google Sheet thử nghiệm với hơn 11,000 dòng mã khách hàng để kiểm tra thời gian tải và độ mượt của UI.
- Đảm bảo khi bấm đồng bộ, màn hình có vòng xoay Loading và không thể bấm thao tác trùng lặp.

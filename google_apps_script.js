// =========================================================================
// GOOGLE APPS SCRIPT (GAS) FOR GOOGLE SHEETS STORAGE INTEGRATION
// =========================================================================
// HƯỚNG DẪN THIẾT LẬP:
// 1. Mở file Google Sheet mới của bạn (URL: https://docs.google.com/spreadsheets/d/1-_xq6s9A4mYC6NyQoxZQfMoKz7SqkpW1Oq0iPpu7O-o/).
// 2. Chọn Extensions > Apps Script.
// 3. Xóa mọi code hiện tại, dán toàn bộ đoạn code dưới đây vào.
// 4. Bấm Save (biểu tượng đĩa mềm).
// 5. Chọn Deploy > New deployment.
// 6. Chọn type là "Web app" (bằng cách click biểu tượng bánh răng cạnh "Select type").
// 7. Nhập mô tả bất kỳ. Ở mục "Execute as", chọn "Me".
// 8. Ở mục "Who has access", chọn "Anyone".
// 9. Bấm Deploy, chọn Authorize Access nếu được yêu cầu và làm theo hướng dẫn.
// 10. Copy URL Web app nhận được dán vào phần Setup URL Google Sheets trên giao diện ứng dụng.
// =========================================================================

const CONFIG_SHEET = "Config";
const RULES_SHEET = "ExceptionRules";
const DEPTS_SHEET = "Departments";
const CUSTS_SHEET = "Customers";
const PRODS_SHEET = "Products";
const LOGS_SHEET = "ActivityLogs";

const SPREADSHEET_ID = "1-_xq6s9A4mYC6NyQoxZQfMoKz7SqkpW1Oq0iPpu7O-o";

function getSpreadsheet() {
  try {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (e) {
    return SpreadsheetApp.getActiveSpreadsheet();
  }
}

function doGet(e) {
  const action = e.parameter.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  initializeSheets(ss, [CONFIG_SHEET, RULES_SHEET, DEPTS_SHEET, CUSTS_SHEET, PRODS_SHEET]);
  
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
    
    if (action === 'save_all') {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      initializeSheets(ss, [CONFIG_SHEET, RULES_SHEET, DEPTS_SHEET, CUSTS_SHEET, PRODS_SHEET]);
      
      if (postData.config) writeSheetData(ss.getSheetByName(CONFIG_SHEET), postData.config, true);
      if (postData.exceptionRules) writeSheetData(ss.getSheetByName(RULES_SHEET), postData.exceptionRules);
      if (postData.departments) writeSheetData(ss.getSheetByName(DEPTS_SHEET), postData.departments);
      if (postData.customers) writeSheetData(ss.getSheetByName(CUSTS_SHEET), postData.customers);
      if (postData.products) writeSheetData(ss.getSheetByName(PRODS_SHEET), postData.products);
      
      return createJsonResponse({ success: true, message: "Sync successful" });
    }
    
    if (action === 'log') {
      const ssLog = getSpreadsheet();
      initializeSheets(ssLog, [LOGS_SHEET]);
      const logsSheet = ssLog.getSheetByName(LOGS_SHEET);
      if (logsSheet.getLastRow() === 0) {
        logsSheet.appendRow(["Timestamp", "User", "Action", "Details"]);
      }
      let timezone = "GMT+7";
      try {
        timezone = Session.getScriptTimeZone() || "GMT+7";
      } catch(e) {}
      const timestamp = Utilities.formatDate(new Date(), timezone, "yyyy-MM-dd HH:mm:ss");
      logsSheet.appendRow([
        timestamp,
        postData.user || "",
        postData.actionName || "",
        postData.actionDetails || ""
      ]);
      return createJsonResponse({ success: true, message: "Log success" });
    }
  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  }
  return createJsonResponse({ success: false, error: "Invalid action" });
}

// Khởi tạo các Sheet nếu chưa tồn tại
function initializeSheets(ss, sheetNames) {
  sheetNames.forEach(name => {
    if (!ss.getSheetByName(name)) {
      ss.insertSheet(name);
    }
  });
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

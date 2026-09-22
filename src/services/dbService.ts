/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * CONTRACT: dbService.ts
 * - Chịu trách nhiệm: 
 *   1. Định nghĩa và triển khai dịch vụ lưu trữ Master Data cục bộ.
 *   2. Cung cấp API tích hợp đồng bộ hai chiều bất đồng bộ (batch sync) với Google Sheets Web App.
 *   3. Cung cấp API ghi nhận nhật ký hoạt động (Activity Log) bất đồng bộ phi tuần tự (fire-and-forget) sang Google Sheets Web App.
 * - Không chịu trách nhiệm: 
 *   1. Quản lý UI loading, thông tin trạng thái đồng bộ, hoặc parse file Excel thô.
 * - Ràng buộc (Invariant):
 *   1. Luôn ưu tiên đọc dữ liệu từ Local Cache (localStorage) trước để đảm bảo UI mượt mà (<50ms).
 *   2. Các tác vụ sync API phải chạy bất đồng bộ và tự động fallback về localStorage nếu mất mạng/lỗi URL.
 */

import { DepartmentMaster, CustomerMaster, ProductMaster, SiteMaster, LearnedRule } from '../types';
import { parseCompoundRules, normalizeText } from '../utils/businessLogic';

/**
 * Data Service Abstraction for Master Data management.
 * Encapsulating storage mechanics so they can be seamlessly swapped (e.g. LocalStorage -> Google Sheets API) in the future.
 */
export interface IMasterDataService {
  getDepartments(): Promise<DepartmentMaster[]>;
  saveDepartments(data: DepartmentMaster[]): Promise<void>;
  clearDepartments(): Promise<void>;

  getCustomers(): Promise<CustomerMaster[]>;
  saveCustomers(data: CustomerMaster[]): Promise<void>;
  clearCustomers(): Promise<void>;

  getProducts(): Promise<ProductMaster[]>;
  saveProducts(data: ProductMaster[]): Promise<void>;
  clearProducts(): Promise<void>;

  getSites(): Promise<SiteMaster[]>;
  saveSites(data: SiteMaster[]): Promise<void>;
  clearSites(): Promise<void>;

  getLearnedRules(): Promise<LearnedRule[]>;
  saveLearnedRules(data: LearnedRule[]): Promise<void>;
  upsertLearnedRule(rule: Omit<LearnedRule, 'id' | 'createdAt' | 'updatedAt' | 'useCount'>): Promise<void>;
  deleteLearnedRule(id: string): Promise<void>;
  clearLearnedRules(): Promise<void>;
}

class LocalStorageMasterDataService implements IMasterDataService {
  private KEYS = {
    DEPARTMENTS: 'master_departments',
    CUSTOMERS: 'master_customers',
    PRODUCTS: 'master_products',
    SITES: 'master_sites',
    LEARNED_RULES: 'feedback_learned_rules',
  };

  async getDepartments(): Promise<DepartmentMaster[]> {
    const raw = localStorage.getItem(this.KEYS.DEPARTMENTS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  async saveDepartments(data: DepartmentMaster[]): Promise<void> {
    localStorage.setItem(this.KEYS.DEPARTMENTS, JSON.stringify(data));
  }

  async clearDepartments(): Promise<void> {
    localStorage.removeItem(this.KEYS.DEPARTMENTS);
  }

  async getCustomers(): Promise<CustomerMaster[]> {
    const raw = localStorage.getItem(this.KEYS.CUSTOMERS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  async saveCustomers(data: CustomerMaster[]): Promise<void> {
    localStorage.setItem(this.KEYS.CUSTOMERS, JSON.stringify(data));
  }

  async clearCustomers(): Promise<void> {
    localStorage.removeItem(this.KEYS.CUSTOMERS);
  }

  async getProducts(): Promise<ProductMaster[]> {
    const raw = localStorage.getItem(this.KEYS.PRODUCTS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  async saveProducts(data: ProductMaster[]): Promise<void> {
    // Tự động phân tích compound rules để tối ưu tra cứu matching
    const parsed = parseCompoundRules(data);
    localStorage.setItem(this.KEYS.PRODUCTS, JSON.stringify(parsed));
  }

  async clearProducts(): Promise<void> {
    localStorage.removeItem(this.KEYS.PRODUCTS);
  }

  async getSites(): Promise<SiteMaster[]> {
    const raw = localStorage.getItem(this.KEYS.SITES);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  async saveSites(data: SiteMaster[]): Promise<void> {
    localStorage.setItem(this.KEYS.SITES, JSON.stringify(data));
  }

  async clearSites(): Promise<void> {
    localStorage.removeItem(this.KEYS.SITES);
  }

  async getLearnedRules(): Promise<LearnedRule[]> {
    const raw = localStorage.getItem(this.KEYS.LEARNED_RULES);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  async saveLearnedRules(data: LearnedRule[]): Promise<void> {
    localStorage.setItem(this.KEYS.LEARNED_RULES, JSON.stringify(data));
  }

  async upsertLearnedRule(ruleInput: Omit<LearnedRule, 'id' | 'createdAt' | 'updatedAt' | 'useCount'>): Promise<void> {
    const rules = await this.getLearnedRules();
    const normPattern = normalizeText(ruleInput.rawContentPattern);
    const inputKeywords = (ruleInput.keywords && ruleInput.keywords.length > 0)
      ? ruleInput.keywords
      : (ruleInput.keyword ? [ruleInput.keyword] : []);
    const normKwsJoined = inputKeywords.map(k => normalizeText(k)).sort().join('|');
    const now = new Date().toISOString();

    // Tìm xem đã có rule với cùng keywords/pattern và điều kiện danh mục/ĐVT hay chưa
    const existingIndex = rules.findIndex(r => {
      const rKws = (r.keywords && r.keywords.length > 0) ? r.keywords : (r.keyword ? [r.keyword] : []);
      const rKwsJoined = rKws.map(k => normalizeText(k)).sort().join('|');

      const matchPattern = normKwsJoined && rKwsJoined
        ? rKwsJoined === normKwsJoined
        : normalizeText(r.rawContentPattern) === normPattern;
      const matchCategory = (!r.chuyenTrang && !ruleInput.chuyenTrang) || (r.chuyenTrang === ruleInput.chuyenTrang);
      const matchDvt = (!r.donViTinh && !ruleInput.donViTinh) || (r.donViTinh === ruleInput.donViTinh);
      return matchPattern && matchCategory && matchDvt;
    });

    if (existingIndex >= 0) {
      rules[existingIndex].maVuViec = ruleInput.maVuViec;
      rules[existingIndex].tenSanPham = ruleInput.tenSanPham;
      if (ruleInput.keyword) rules[existingIndex].keyword = ruleInput.keyword;
      if (ruleInput.keywords) rules[existingIndex].keywords = ruleInput.keywords;
      if (ruleInput.tkDoanhThu) rules[existingIndex].tkDoanhThu = ruleInput.tkDoanhThu;
      rules[existingIndex].useCount = (rules[existingIndex].useCount || 0) + 1;
      rules[existingIndex].updatedAt = now;
      if (ruleInput.userNote) rules[existingIndex].userNote = ruleInput.userNote;
    } else {
      const newRule: LearnedRule = {
        ...ruleInput,
        id: 'lr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        useCount: 1,
        createdAt: now,
        updatedAt: now,
      };
      rules.unshift(newRule);
    }

    await this.saveLearnedRules(rules);
  }

  async deleteLearnedRule(id: string): Promise<void> {
    const rules = await this.getLearnedRules();
    const filtered = rules.filter(r => r.id !== id);
    await this.saveLearnedRules(filtered);
  }

  async clearLearnedRules(): Promise<void> {
    localStorage.removeItem(this.KEYS.LEARNED_RULES);
  }
}

export const dbService: IMasterDataService = new LocalStorageMasterDataService();

// =========================================================================
// GOOGLE SHEETS SYNC SERVICES
// =========================================================================

// Người dùng cấu hình URL Apps Script Web App đã deploy tại đây (mặc định ban đầu):
export const GOOGLE_SHEETS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx6l4gM4WbIxaoCJDMpztCpzzIuCiZ7m38wEZdSMI2IjLPNv4bhCs7n1tzgQafomSER/exec";

/**
 * Lấy URL Google Sheets Script hiện tại (ưu tiên từ config lưu trong localStorage)
 */
export function getGoogleSheetsUrl(): string {
  const direct = localStorage.getItem('google_sheets_url');
  if (direct && typeof direct === 'string' && direct.trim().startsWith('http')) {
    return direct.trim();
  }
  const raw = localStorage.getItem('app_contract_settings');
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (
        parsed.googleSheetsUrl && 
        typeof parsed.googleSheetsUrl === 'string' && 
        parsed.googleSheetsUrl.trim().startsWith('http')
      ) {
        return parsed.googleSheetsUrl.trim();
      }
    } catch (e) {}
  }
  return GOOGLE_SHEETS_SCRIPT_URL;
}

/**
 * Kiểm tra xem URL Google Sheets đã được cấu hình hợp lệ hay chưa
 */
export function hasValidGoogleSheetsUrl(): boolean {
  const url = getGoogleSheetsUrl();
  return (
    typeof url === 'string' &&
    url.trim() !== '' &&
    url.startsWith('http') &&
    !url.includes('_example')
  );
}

/**
 * Tải toàn bộ cấu hình, rules và Master Data từ Google Sheets và lưu đè vào Local Cache.
 * Thích hợp cho việc chạy ngầm (background pull) hoặc bấm sync thủ công.
 */
export async function pullAllFromGoogleSheets(): Promise<{
  departmentsCount: number;
  customersCount: number;
  productsCount: number;
  sitesCount: number;
  learnedRulesCount: number;
  configUpdated: boolean;
}> {
  if (!hasValidGoogleSheetsUrl()) {
    throw new Error("Google Sheets Apps Script URL chưa được cấu hình. Vui lòng cập nhật URL hợp lệ.");
  }

  const scriptUrl = getGoogleSheetsUrl();

  // Gọi API lấy dữ liệu từ Google Sheets
  const response = await fetch(`${scriptUrl}?action=read_all`, {
    method: 'GET',
    mode: 'cors',
    headers: {
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Kết nối tới Google Sheets thất bại (HTTP ${response.status})`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(`Google Sheets trả về lỗi: ${data.error}`);
  }

  let configUpdated = false;

  // 1. Lưu cấu hình chung nếu có
  if (data.config && Object.keys(data.config).length > 0) {
    const rawLocalConfig = localStorage.getItem('app_contract_settings');
    let localConfig = {};
    if (rawLocalConfig) {
      try { localConfig = JSON.parse(rawLocalConfig); } catch (e) {}
    }
    
    // Gộp cấu hình từ Google Sheets, loại bỏ userName và googleSheetsUrl để tránh bị đè URL và tên người dùng local
    const { userName: sheetUserName, googleSheetsUrl: sheetGoogleSheetsUrl, ...configFromSheet } = data.config || {};
    const mergedConfig = {
      ...localConfig,
      ...configFromSheet,
      googleSheetsUrl: (localConfig as any).googleSheetsUrl || getGoogleSheetsUrl(),
    };
    
    // Nếu có exception rules từ Google Sheet, ưu tiên đè lên
    if (Array.isArray(data.exceptionRules)) {
      mergedConfig.exceptionRules = data.exceptionRules;
    }

    localStorage.setItem('app_contract_settings', JSON.stringify(mergedConfig));
    configUpdated = true;
  }

  // 2. Lưu Master Bộ phận
  if (Array.isArray(data.departments)) {
    const formatted = data.departments.map((d: any) => ({
      stt: isNaN(Number(d.stt)) ? d.stt : Number(d.stt),
      tenBoPhan: String(d.tenBoPhan || '').trim(),
      maSale: String(d.maSale || '').trim()
    })).filter((d: any) => d.tenBoPhan && d.maSale);
    
    await dbService.saveDepartments(formatted);
  }

  // 3. Lưu Master Khách hàng
  if (Array.isArray(data.customers)) {
    const formatted = data.customers.map((c: any) => ({
      stt: isNaN(Number(c.stt)) ? c.stt : Number(c.stt),
      tenKhach: String(c.tenKhach || '').trim(),
      maKhach: String(c.maKhach || '').trim()
    })).filter((c: any) => c.tenKhach && c.maKhach);

    await dbService.saveCustomers(formatted);
  }

  // 4. Lưu Master Sản phẩm
  if (Array.isArray(data.products)) {
    const formatted = data.products.map((p: any) => ({
      keyword: String(p.keyword || '').trim(),
      maVuViec: String(p.maVuViec || '').trim(),
      tenSanPham: String(p.tenSanPham || '').trim(),
      tkDoanhThu: String(p.tkDoanhThu || '').trim(),
      thueSuat: p.thueSuat !== undefined && p.thueSuat !== null ? String(p.thueSuat).trim() : undefined
    })).filter((p: any) => p.keyword && p.maVuViec && p.tenSanPham);

    await dbService.saveProducts(formatted);
  }

  // 5. Lưu Master 4 - Site Nội Bộ
  if (Array.isArray(data.sites)) {
    const formatted: SiteMaster[] = data.sites.map((s: any) => ({
      domain: String(s.domain || '').trim().toLowerCase(),
      maSite: String(s.maSite || '').trim().toUpperCase(),
      tenSite: String(s.tenSite || '').trim(),
      ghiChu: s.ghiChu ? String(s.ghiChu).trim() : undefined
    })).filter((s: SiteMaster) => s.domain && s.maSite);

    await dbService.saveSites(formatted);
  }

  // 6. Lưu Learned Rules (Đồng bộ trực tiếp từ Google Sheets, nếu Sheet đã xóa sạch thì cập nhật sạch)
  if (Array.isArray(data.learnedRules)) {
    const formatted: LearnedRule[] = data.learnedRules.map((r: any) => ({
      id: String(r.id || ('lr_' + Math.random().toString(36).substring(2, 7))),
      rawContentPattern: String(r.rawContentPattern || '').trim(),
      keyword: r.keyword ? String(r.keyword).trim() : undefined,
      keywords: Array.isArray(r.keywords) 
        ? r.keywords 
        : (typeof r.keywords === 'string' && r.keywords.startsWith('[')
            ? (() => { try { return JSON.parse(r.keywords); } catch(e) { return [r.keywords]; } })()
            : (r.keyword ? [String(r.keyword).trim()] : undefined)),
      chuyenTrang: r.chuyenTrang ? String(r.chuyenTrang).trim() : undefined,
      donViTinh: r.donViTinh ? String(r.donViTinh).trim() : undefined,
      maVuViec: String(r.maVuViec || '').trim(),
      tenSanPham: String(r.tenSanPham || '').trim(),
      tkDoanhThu: r.tkDoanhThu ? String(r.tkDoanhThu).trim() : undefined,
      useCount: Number(r.useCount || 1),
      createdAt: String(r.createdAt || new Date().toISOString()),
      updatedAt: String(r.updatedAt || new Date().toISOString()),
      userNote: r.userNote ? String(r.userNote).trim() : undefined
    })).filter((r: LearnedRule) => r.rawContentPattern && r.maVuViec);

    await dbService.saveLearnedRules(formatted);
  }

  const currentDepts = await dbService.getDepartments();
  const currentCusts = await dbService.getCustomers();
  const currentProds = await dbService.getProducts();
  const currentSites = await dbService.getSites();
  const currentLearned = await dbService.getLearnedRules();

  return {
    departmentsCount: currentDepts.length,
    customersCount: currentCusts.length,
    productsCount: currentProds.length,
    sitesCount: currentSites.length,
    learnedRulesCount: currentLearned.length,
    configUpdated
  };
}

/**
 * Đẩy toàn bộ dữ liệu cấu hình, rules và Master Data từ Local Cache lên Google Sheets.
 */
export async function pushAllToGoogleSheets(currentConfig: any): Promise<void> {
  if (!hasValidGoogleSheetsUrl()) {
    throw new Error("Google Sheets Apps Script URL chưa được cấu hình. Vui lòng cập nhật URL hợp lệ.");
  }

  const scriptUrl = getGoogleSheetsUrl();

  // Lấy dữ liệu Master Data hiện tại từ Local
  const departments = await dbService.getDepartments();
  const customers = await dbService.getCustomers();
  const products = await dbService.getProducts();
  const sites = await dbService.getSites();
  const learnedRules = await dbService.getLearnedRules();

  // Bóc tách config và exception rules
  const { exceptionRules, ...configParams } = currentConfig;

  const payload = {
    action: 'save_all',
    config: configParams,
    exceptionRules: exceptionRules || [],
    departments,
    customers,
    products,
    sites,
    learnedRules
  };

  const response = await fetch(scriptUrl, {
    method: 'POST',
    mode: 'cors',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8' // GAS Web Apps thường xử lý POST thô tốt nhất với text/plain để tránh CORS preflight OPTIONS request
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Gửi dữ liệu lên Google Sheets thất bại (HTTP ${response.status})`);
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || "Không thể lưu dữ liệu lên Google Sheets.");
  }
}

/**
 * Ghi log hoạt động người dùng lên Google Sheet (bất đồng bộ phi tuần tự, no-cors).
 */
export async function writeActionLogToSheet(
  actionName: string,
  actionDetails: string
): Promise<void> {
  const raw = localStorage.getItem('app_contract_settings');
  let logsEnabled = true;
  let userName = "Kế toán viên";

  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed.logsEnabled === false) {
        logsEnabled = false;
      }
      if (parsed.userName) {
        userName = String(parsed.userName).trim();
      }
    } catch (e) {}
  }

  const webAppUrl = getGoogleSheetsUrl();
  if (!logsEnabled || !hasValidGoogleSheetsUrl() || !webAppUrl) {
    return;
  }

  try {
    // Gọi fetch ngầm dạng no-cors để tránh lỗi CORS và chạy phi tuần tự
    fetch(webAppUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "log",
        user: userName,
        actionName,
        actionDetails
      })
    }).catch(err => {
      console.error("Lỗi ghi log lên Sheets (catch):", err);
    });
  } catch (err) {
    console.error("Lỗi ghi log lên Sheets:", err);
  }
}

/**
 * Lấy email người dùng đăng nhập từ IndexedDB của Firebase
 */
export function getPortalUserEmail(): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      if (typeof window === "undefined" || !window.indexedDB) {
        resolve(null);
        return;
      }
      const request = window.indexedDB.open("firebaseLocalStorageDb");
      request.onerror = () => resolve(null);
      request.onsuccess = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("firebaseLocalStorage")) {
          db.close();
          resolve(null);
          return;
        }
        try {
          const transaction = db.transaction(["firebaseLocalStorage"], "readonly");
          const store = transaction.objectStore("firebaseLocalStorage");
          const getAllRequest = store.getAll();
          getAllRequest.onsuccess = () => {
            const results = getAllRequest.result;
            db.close();
            if (Array.isArray(results)) {
              for (const item of results) {
                let userObj = item;
                if (item && item.value) {
                  userObj = item.value;
                }
                if (typeof userObj === "string") {
                  try {
                    userObj = JSON.parse(userObj);
                  } catch (e) {
                    continue;
                  }
                }
                if (userObj && userObj.email) {
                  resolve(userObj.email);
                  return;
                }
              }
            }
            resolve(null);
          };
          getAllRequest.onerror = () => {
            db.close();
            resolve(null);
          };
        } catch (e) {
          db.close();
          resolve(null);
        }
      };
    } catch (e) {
      resolve(null);
    }
  });
}



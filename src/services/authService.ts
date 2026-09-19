/**
 * CONTRACT: authService.ts
 * - Quản lý phiên đăng nhập Google OAuth (Google Identity Services).
 * - Lưu trữ và đồng bộ thông tin User Profile (email, name, picture).
 */

export interface GoogleUser {
  email: string;
  name: string;
  picture?: string;
  sub: string;
}

export const GOOGLE_CLIENT_ID = "37756221918-fp4k2sm04mc7ep9jkmbjnocjstjnnn43.apps.googleusercontent.com";
const STORAGE_KEY = "vcc_auth_user";

/**
 * Giải mã JWT payload của Google Credential Response
 */
export function decodeJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Lỗi giải mã Google JWT:", e);
    return null;
  }
}

/**
 * Lấy thông tin user đã đăng nhập từ localStorage
 */
export function getCurrentUser(): GoogleUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Lỗi đọc user từ storage:", e);
  }
  return null;
}

/**
 * Lưu thông tin user sau khi Google OAuth xác thực thành công
 */
export function saveCurrentUser(user: GoogleUser): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    
    // Đồng bộ luôn sang app_contract_settings để dbService ghi nhận đúng email
    const rawSettings = localStorage.getItem('app_contract_settings');
    if (rawSettings) {
      try {
        const parsed = JSON.parse(rawSettings);
        parsed.userName = user.email;
        localStorage.setItem('app_contract_settings', JSON.stringify(parsed));
      } catch {}
    }
  } catch (e) {
    console.error("Lỗi lưu user:", e);
  }
}

/**
 * Đăng xuất
 */
export function logoutUser(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    const rawSettings = localStorage.getItem('app_contract_settings');
    if (rawSettings) {
      try {
        const parsed = JSON.parse(rawSettings);
        parsed.userName = 'Kế toán viên';
        localStorage.setItem('app_contract_settings', JSON.stringify(parsed));
      } catch {}
    }
  } catch (e) {
    console.error("Lỗi đăng xuất:", e);
  }
}

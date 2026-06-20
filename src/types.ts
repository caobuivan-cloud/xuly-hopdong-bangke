/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum AppTab {
  SETTINGS = 'settings',
  LUAN_CHUYEN = 'luan_chuyen',
  HOP_DONG_MOI = 'hop_dong_moi',
  BANG_KE = 'bang_ke',
}

export interface ExcelSheetData {
  sheetName: string;
  headers: string[];
  rows: Record<string, any>[];
}

export interface UploadedFileData {
  fileName: string;
  fileSize: number;
  sheets: ExcelSheetData[];
  uploadedAt: string;
}

export interface ColumnMapping {
  originalHeader: string;
  mappedField: string;
}

export interface ExceptionRule {
  id: string;
  keyword: string;
  outputValue: string;
}

export interface ContractSettings {
  taxRate: number;
  agencyFeeRate: number;
  requiredHeadersLuanChuyen: string[];
  requiredHeadersHopDongMoi: string[];
  requiredHeadersBangKe: string[];
  contractSuffix: string;
  contractNameSeparator: string;
  exceptionRules: ExceptionRule[];
  logsEnabled?: boolean;
  userName?: string;
  googleSheetsUrl?: string;
}

export interface DepartmentMaster {
  stt: number | string;
  tenBoPhan: string;
  maSale: string;
}

export interface CustomerMaster {
  stt: number | string;
  tenKhach: string;
  maKhach: string;
}

export interface ProductMaster {
  keyword: string;
  maVuViec: string;
  tenSanPham: string;
  tkDoanhThu: string;
  thueSuat?: string | number;
}


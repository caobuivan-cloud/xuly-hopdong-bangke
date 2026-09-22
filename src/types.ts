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
  headerRowIndex?: number;
  rawArray?: any[][];
  merges?: any[];
}

export type BangKeTemplateId = 'STANDARD' | 'MMS' | 'SUN' | 'WPP';

export interface BangKeTemplateConfig {
  id: BangKeTemplateId;
  name: string;
  description: string;
  badgeColor?: string;
}

export interface NormalizedBangKeRow {
  stt?: number | string;
  maBooking: string;
  rawBooking?: string;
  lichDang?: string;
  soHt: string;
  rawSoHt?: string;
  chuyenTrang: string;
  lookupContent: string;
  noiDung?: string;
  donViTinh?: string;
  soLuong?: number;
  donGia?: number;
  chietKhau?: number;
  thanhTienSauCk?: number;
  [key: string]: any;
}

export interface UploadedFileData {
  id?: string;
  fileName: string;
  fileSize: number;
  sheets: ExcelSheetData[];
  uploadedAt: string;
  templateId?: BangKeTemplateId;
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

export type HeaderAliasesBangKe = Record<string, string[]>;

export interface ContractSettings {
  taxRate: number;
  agencyFeeRate: number;
  requiredHeadersLuanChuyen: string[];
  requiredHeadersHopDongMoi: string[];
  requiredHeadersBangKe: string[];
  headerAliasesBangKe?: HeaderAliasesBangKe;
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

export interface SiteMaster {
  tenSite: string;
  maSite: string;
  domain?: string;
  quyChuan?: string;
  ghiChu?: string;
}

export interface ProductMaster {
  keyword: string;
  maVuViec: string;
  tenSanPham: string;
  tkDoanhThu: string;
  thueSuat?: string | number;
  dvtRequired?: string;
  contentKeyword?: string;
  isCompoundRule?: boolean;
  isBroadFallback?: boolean;
}

export interface LearnedRule {
  id: string;
  rawContentPattern: string;
  keyword?: string;
  keywords?: string[];
  chuyenTrang?: string;
  donViTinh?: string;
  maVuViec: string;
  tenSanPham: string;
  tkDoanhThu?: string;
  thueSuat?: string | number;
  useCount?: number;
  createdAt?: string;
  updatedAt: string;
  user?: string;
  userNote?: string;
}


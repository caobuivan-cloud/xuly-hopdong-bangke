/**
 * @file-level-contract
 * 1. Vai trò: Tập trung cấu trúc ánh xạ chuẩn 36 cột phục vụ import vào FAST Accounting cho toàn bộ ứng dụng.
 * 2. Non-goal: Không chịu trách nhiệm parse file Excel đầu vào (được đảm nhiệm bởi ExcelUpload component).
 * 3. Invariants:
 *    - Cột `stt` luôn được bỏ trống khi xuất Excel cho cả 3 mẫu (Hợp đồng luân chuyển, Hợp đồng mới, và Bảng kê) để đáp ứng chuẩn FAST Accounting.
 *    - Các trường số/optional (như thuế suất, giá trị, số lượng, đơn giá) bắt buộc có fallback mặc định an toàn (`0` hoặc `''`) để tránh lỗi nạp dữ liệu vào FAST.
 * 4. Khi nào sửa đổi: Khi cấu trúc cột xuất khẩu chuẩn của FAST Accounting thay đổi hoặc cần bổ sung/điều chỉnh định dạng trường xuất ra.
 */

export type SttMode = 'blank' | 'sequential';

export interface FastImportOptions {
  status: number;
  sttMode?: SttMode;
}

function valueOrEmpty(value: any): any {
  return value === null || value === undefined ? '' : value;
}

function valueOrZero(value: any): any {
  return value === null || value === undefined || value === '' ? 0 : value;
}

export function buildFastImportRows(
  rows: Record<string, any>[],
  options: FastImportOptions
): Record<string, any>[] {
  const sttMode = options.sttMode || 'blank';

  return rows.map((row, index) => ({
    'Mã hợp đồng': valueOrEmpty(row.maHopDong),
    'Tên hợp đồng': valueOrEmpty(row.tenHopDong),
    'Mã khách': valueOrEmpty(row.maKhach),
    'Bộ phân thưc hiện': valueOrEmpty(row.boPhanThucHien),
    'Ngày bắt đầu': valueOrEmpty(row.ngayBatDau),
    'Ngày kết thúc': valueOrEmpty(row.ngayKetThuc),
    'Ngày hợp đồng': valueOrEmpty(row.ngayHopDong),
    'ngay_hd1': valueOrEmpty(row.ngayHd1),
    'ngay_hd2': valueOrEmpty(row.ngayHd2),
    'ngay_hd3': valueOrEmpty(row.ngayHd3),
    'ngay_hd4': valueOrEmpty(row.ngayHd4),
    'ngay_hd5': valueOrEmpty(row.ngayHd5),
    'ngay_hd6': valueOrEmpty(row.ngayHd6),
    'tien_hd1': valueOrEmpty(row.tienHd1),
    'tien_hd2': valueOrEmpty(row.tienHd2),
    'tien_hd3': valueOrEmpty(row.tienHd3),
    'tien_hd4': valueOrEmpty(row.tienHd4),
    'tien_hd5': valueOrEmpty(row.tienHd5),
    'tien_hd6': valueOrEmpty(row.tienHd6),
    'Giá trị': (options.status === 1 || sttMode === 'sequential') ? '' : valueOrZero(row.giaTri ?? row.thanhTienSauCk),
    'ma_vv': valueOrEmpty(row.maVv),
    'Số lượng': valueOrZero(row.soLuong),
    'Đơn giá': valueOrZero(row.donGia),
    'Thuế suất': valueOrZero(row.thueSuat),
    'Giá trị của vv VAT': valueOrZero(row.giaTriCuaVvVat ?? row.giaTriCuaVv),
    'tk_doanh thu': valueOrEmpty(row.tkDoanhThu),
    'Bảng kê': sttMode === 'sequential' ? '' : valueOrEmpty(row.bangKe),
    'Tỷ lệ ck': valueOrZero(row.tyLeCk),
    'Chuyên trang': valueOrEmpty(row.chuyenTrangImport ?? row.chuyenTrang),
    'Ghi chú chi tiết': valueOrEmpty(row.ghiChuChiTiet ?? row.ghiChu),
    ' ': '',
    'Status': options.status,
    '  ': '',
    'Ghi chú tổng': valueOrEmpty(row.ghiChuTong ?? row.fastGhiChu ?? row.ghiChuCol),
    'stt': '',
    'Tên sản phẩm': valueOrEmpty(row.sanPhamImport),
  }));
}

/**
 * Lọc danh sách dòng hợp đồng đủ điều kiện hạch toán (Fast Import).
 * Loại bỏ các dòng có:
 * - Giá trị của vv VAT trống (null, undefined hoặc chuỗi rỗng)
 * - Tỷ lệ chiết khấu bằng 100%
 */
export function filterFastImportEligibleRows(rows: Record<string, any>[]): Record<string, any>[] {
  return rows.filter((row) => {
    const vatVal = row.giaTriCuaVvVat !== undefined ? row.giaTriCuaVvVat : row.giaTriCuaVv;
    const isVatEmpty = vatVal === null || vatVal === undefined || String(vatVal).trim() === '';
    
    const discountVal = row.tyLeCk;
    const isDiscount100 = discountVal !== null && discountVal !== undefined && Number(discountVal) === 100;
    
    return !isVatEmpty && !isDiscount100;
  });
}


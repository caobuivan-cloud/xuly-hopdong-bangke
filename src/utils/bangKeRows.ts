type MergeRange = { s: { r: number; c: number }; e: { r: number; c: number } };

/** Điền ô gộp dọc trước khi xét B trống, bao gồm cả cột mã booking. */
export function fillBangKeVerticalMerges(
  rows: Record<string, any>[], merges: MergeRange[], headerIndex: number, headers: string[],
): Record<string, any>[] {
  const byRow = new Map<number, Record<string, any>>();
  rows.forEach((row, i) => {
    const rowIndex = row.__rowNum__ ?? headerIndex + 1 + i;
    byRow.set(rowIndex, { ...row, __rowNum__: rowIndex, __cells: [...(row.__cells || [])] });
  });
  for (const merge of merges) {
    if (merge.s.c !== merge.e.c || merge.e.r <= merge.s.r) continue;
    const top = byRow.get(merge.s.r);
    if (!top) continue;
    const col = merge.s.c;
    const key = headers[col];
    const value = key && Object.prototype.hasOwnProperty.call(top, key) ? top[key] : top.__cells[col];
    if (value === undefined || value === null || String(value).trim() === '') continue;
    for (let r = merge.s.r + 1; r <= merge.e.r; r++) {
      // Bộ đọc có thể bỏ dòng hoàn toàn trống nằm trong vùng merge.
      let target = byRow.get(r);
      if (!target) {
        target = {
          ...Object.fromEntries(headers.filter(Boolean).map(h => [h, ''])),
          __rowNum__: r,
          __cells: [],
        };
        byRow.set(r, target);
      }
      target.__cells[col] = value;
      if (key) target[key] = value;
    }
  }
  return [...byRow.entries()].sort(([a], [b]) => a - b).map(([, row]) => row);
}

/** Cột B là Mã book/Mã booking; STT trống hoặc đánh lại số vẫn là dòng hợp lệ. */
export function selectBangKeDetailRows<T extends Record<string, any>>(
  rows: T[],
  merges: MergeRange[],
  headerIndex: number,
  bookingHeader?: string,
): T[] {
  const selected: T[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowIndex = row.__rowNum__ ?? headerIndex + 1 + i;
    // sheet_to_json bỏ dòng hoàn toàn trống; khoảng nhảy dòng vẫn phải kết thúc bảng.
    if (i > 0 && rows[i - 1].__rowNum__ !== undefined
      && rowIndex > rows[i - 1].__rowNum__ + 1) break;
    if (merges.some(m => m.s.c === 0 && m.e.c >= 2
      && rowIndex >= m.s.r && rowIndex <= m.e.r)) break;

    // B trống là điểm kết thúc bảng, tránh đọc cả điều khoản thanh toán phía dưới.
    // Ưu tiên ô theo header để không lệch __cells khi bộ đọc bỏ qua dòng trống.
    const booking = bookingHeader && Object.prototype.hasOwnProperty.call(row, bookingHeader)
      ? row[bookingHeader] : row.__cells?.[1];
    if (String(booking ?? '').trim() === '') break;
    selected.push(row);
  }
  return selected;
}

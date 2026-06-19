/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Search, FileSpreadsheet, ChevronLeft, ChevronRight, Download, Filter } from 'lucide-react';
import { ExcelSheetData } from '../types';
import { exportToExcel } from '../utils/excel';

interface PreviewTableProps {
  id?: string;
  sheetData: ExcelSheetData;
  onDataChange?: (rows: Record<string, any>[]) => void;
  title?: string;
}

export default function PreviewTable({
  id = 'preview-table',
  sheetData,
  onDataChange,
  title = 'Bảng xem trước dữ liệu Excel',
}: PreviewTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter values based on search query
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) {
      return sheetData.rows;
    }
    const query = searchQuery.toLowerCase().trim();
    return sheetData.rows.filter((row) => {
      return Object.values(row).some((val) => {
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(query);
      });
    });
  }, [sheetData.rows, searchQuery]);

  // Reset pagination when data or search query shifts
  React.useEffect(() => {
    setCurrentPage(1);
  }, [sheetData.sheetName, searchQuery]);

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredRows.slice(startIndex, startIndex + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  // Trigger export of the current sheet view
  const handleExport = () => {
    exportToExcel(
      [{ sheetName: sheetData.sheetName, data: filteredRows }],
      `Export_${sheetData.sheetName}_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  // Safe checks to formatting cells for presentation
  const formatCellValue = (val: any) => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'number') {
      // Check if it looks like an amount of money (VND)
      if (val > 1000 && !Number.isInteger(val / 100.1)) {
        return val.toLocaleString('vi-VN');
      }
      return val.toString();
    }
    if (val instanceof Date) {
      return val.toLocaleDateString('vi-VN');
    }
    return String(val);
  };

  return (
    <div id={id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
      {/* Table Header Section */}
      <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
            <FileSpreadsheet className="h-5 w-5 text-indigo-500" />
            <span>{title}</span>
            <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-600 rounded-full font-mono">
              Sheet: {sheetData.sheetName}
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Hiển thị cột và dòng phân tích được từ file đã tải lên.
          </p>
        </div>

        {/* Search & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search box */}
          <div className="relative flex-grow sm:flex-grow-0 sm:min-w-[240px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm dòng dữ liệu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Export filter results */}
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 px-4 py-1.8 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
          >
            <Download className="h-4 w-4" />
            <span>Xuất Excel ({filteredRows.length})</span>
          </button>
        </div>
      </div>

      {/* Interactive stats strip */}
      <div className="px-5 py-3 border-b border-slate-100 bg-white grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <div className="text-xs text-slate-500 font-medium">Số dòng gốc</div>
          <div className="text-lg font-bold text-slate-800 font-mono mt-0.5">{sheetData.rows.length}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500 font-medium">Kết quả tìm thấy</div>
          <div className="text-lg font-bold text-emerald-600 font-mono mt-0.5">{filteredRows.length}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500 font-medium">Tổng số cột</div>
          <div className="text-lg font-bold text-slate-800 font-mono mt-0.5">{sheetData.headers.length}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500 font-medium">Kích thước trang</div>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="text-sm font-semibold font-mono bg-transparent border-none p-0 focus:ring-0 text-indigo-600 cursor-pointer mt-0.5"
          >
            <option value={5}>5 dòng</option>
            <option value={10}>10 dòng</option>
            <option value={25}>25 dòng</option>
            <option value={50}>50 dòng</option>
          </select>
        </div>
      </div>

      {/* Responsive Scrollable Table Case */}
      <div className="overflow-x-auto w-full max-h-[480px]">
        {filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <Filter className="h-10 w-10 text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-500">
              Không tìm thấy dòng dữ liệu nào khớp với "{searchQuery}"
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono w-14">
                  STT
                </th>
                {sheetData.headers.map((header) => (
                  <th
                    key={header}
                    className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 bg-slate-50 border-b border-slate-200"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRows.map((row, index) => {
                const globalIndex = (currentPage - 1) * pageSize + index + 1;
                return (
                  <tr key={index} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-2.5 text-xs text-slate-400 font-mono">
                      {globalIndex}
                    </td>
                    {sheetData.headers.map((header) => {
                      const cellVal = row[header];
                      const isNumeric = typeof cellVal === 'number' || (typeof cellVal === 'string' && !isNaN(Number(cellVal)) && cellVal.trim() !== '');
                      return (
                        <td
                          key={header}
                          className={`px-4 py-2.5 text-sm text-slate-700 max-w-[280px] truncate ${
                            isNumeric ? 'font-mono text-right' : 'text-left'
                          }`}
                          title={formatCellValue(cellVal)}
                        >
                          {formatCellValue(cellVal)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination component */}
      {totalPages > 1 && (
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-mono">
            Hiển thị dòng {(currentPage - 1) * pageSize + 1} -{' '}
            {Math.min(currentPage * pageSize, filteredRows.length)} / {filteredRows.length} dòng
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-white text-slate-500 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              // Sliding window or standard first pagination keys
              let targetPage = i + 1;
              if (currentPage > 3 && totalPages > 5) {
                targetPage = currentPage - 3 + i;
                if (targetPage + (4 - i) > totalPages) {
                  targetPage = totalPages - 4 + i;
                }
              }
              return (
                <button
                  key={targetPage}
                  onClick={() => setCurrentPage(targetPage)}
                  className={`px-3 py-1 text-sm font-semibold font-mono rounded-lg border transition ${
                    currentPage === targetPage
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {targetPage}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-white text-slate-500 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

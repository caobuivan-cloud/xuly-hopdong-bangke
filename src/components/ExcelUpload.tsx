/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Upload, FileCode, CheckCircle, AlertTriangle, RefreshCw, Layers } from 'lucide-react';
import { parseExcelFile } from '../utils/excel';
import { UploadedFileData } from '../types';

interface ExcelUploadProps {
  id?: string;
  onUploadSuccess: (data: UploadedFileData) => void;
  onUploadError: (errorMsg: string) => void;
  requiredHeaders?: string[];
  placeholderText?: string;
}

export default function ExcelUpload({
  id = 'excel-upload',
  onUploadSuccess,
  onUploadError,
  requiredHeaders = [],
  placeholderText = 'Kéo thả file Excel (.xlsx, .xls) vào đây hoặc click để duyệt file',
}: ExcelUploadProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fileDetails, setFileDetails] = useState<{ name: string; size: number; time?: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (fileExt !== 'xlsx' && fileExt !== 'xls') {
      const msg = 'Định dạng file không hỗ trợ. Vui lòng chỉ tải lên file Excel (.xlsx, .xls)';
      setErrorMsg(msg);
      onUploadError(msg);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setFileDetails({ name: file.name, size: file.size });

    try {
      const parsedData = await parseExcelFile(file);
      
      // Validate headers if required list is supplied
      if (requiredHeaders.length > 0 && parsedData.sheets.length > 0) {
        const primarySheet = parsedData.sheets[0];
        const missing = requiredHeaders.filter(
          (rh) => !primarySheet.headers.some((h) => h.toLowerCase().trim() === rh.toLowerCase().trim())
        );

        if (missing.length > 0) {
          throw new Error(
            `File thiếu các cột bắt buộc: ${missing.join(', ')}. ` +
            `Vui lòng kiểm tra lại cấu trúc file mẫu.`
          );
        }
      }

      setFileDetails({
        name: file.name,
        size: file.size,
        time: parsedData.uploadedAt,
      });
      onUploadSuccess(parsedData);
    } catch (err: any) {
      const errMsg = err?.message || 'Có lỗi xảy ra khi xử lý file Excel.';
      setErrorMsg(errMsg);
      onUploadError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div id={id} className="w-full">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all duration-200 min-h-[180px] text-center
          ${isDragActive 
            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-inner' 
            : 'border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50'
          }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".xlsx, .xls"
          onChange={handleChange}
        />

        {loading ? (
          <div className="flex flex-col items-center space-y-3">
            <RefreshCw className="h-10 w-10 text-indigo-500 animate-spin" />
            <p className="text-sm font-medium text-slate-600">Đang đọc và hạch toán dữ liệu Excel...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-4">
            <div className={`p-4 rounded-full ${errorMsg ? 'bg-rose-50 text-rose-500' : 'bg-slate-100 text-slate-500'}`}>
              <Upload className="h-8 w-8" />
            </div>
            
            <div className="space-y-1">
              <p className="text-base font-semibold text-slate-800">
                {placeholderText}
              </p>
              <p className="text-xs text-slate-400 font-mono">
                Hỗ trợ định dạng .xlsx, .xls (Tối đa 25MB)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* State Display Panels */}
      {(fileDetails || errorMsg) && !loading && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {fileDetails && (
            <div className="p-4 bg-emerald-50/40 border border-emerald-100 rounded-lg flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-emerald-800 uppercase tracking-widest font-mono">
                  Đã tải file thành công
                </p>
                <div className="text-sm font-semibold text-slate-800 truncate mt-1">
                  {fileDetails.name}
                </div>
                <div className="text-xs text-slate-500 mt-0.5 space-x-2 font-mono">
                  <span>Dung lượng: {formatSize(fileDetails.size)}</span>
                  {fileDetails.time && (
                    <>
                      <span>•</span>
                      <span>Lúc: {fileDetails.time}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-lg flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-rose-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-rose-800 uppercase tracking-widest font-mono">
                  Lỗi xử lý file
                </p>
                <p className="text-sm text-rose-700 mt-1 font-medium leading-relaxed">
                  {errorMsg}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

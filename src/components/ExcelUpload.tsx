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
  onUploadManySuccess?: (data: UploadedFileData[]) => void;
  onUploadError: (errorMsg: string) => void;
  requiredHeaders?: string[];
  placeholderText?: string;
  multiple?: boolean;
  compact?: boolean;
  showSuccessDetails?: boolean;
}

const mergeParsedFiles = (files: UploadedFileData[]): UploadedFileData => {
  if (files.length === 1) return files[0];

  const headers = new Set<string>();
  const rows: Record<string, any>[] = [];

  files.forEach((file) => {
    const primarySheet = file.sheets[0];
    if (!primarySheet) return;

    primarySheet.headers.forEach((header) => headers.add(header));
    primarySheet.rows.forEach((row) => {
      rows.push({
        ...row,
        __sourceFile: file.fileName,
      });
    });
  });

  return {
    fileName: `${files.length} file Excel`,
    fileSize: files.reduce((total, file) => total + file.fileSize, 0),
    uploadedAt: files[0].uploadedAt,
    sheets: [
      {
        sheetName: 'Dữ liệu gộp',
        headers: Array.from(headers),
        rows,
      },
    ],
  };
};

export default function ExcelUpload({
  id = 'excel-upload',
  onUploadSuccess,
  onUploadManySuccess,
  onUploadError,
  requiredHeaders = [],
  placeholderText = 'Kéo thả file Excel (.xlsx, .xls) vào đây hoặc click để duyệt file',
  multiple = true,
  compact = false,
  showSuccessDetails = true,
}: ExcelUploadProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fileDetails, setFileDetails] = useState<{ name: string; size: number; time?: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateParsedHeaders = (parsedData: UploadedFileData) => {
    if (requiredHeaders.length === 0 || parsedData.sheets.length === 0) return;

    const primarySheet = parsedData.sheets[0];
    const missing = requiredHeaders.filter(
      (rh) => !primarySheet.headers.some((h) => h.toLowerCase().trim() === rh.toLowerCase().trim())
    );

    if (missing.length > 0) {
      throw new Error(
        `File ${parsedData.fileName} thiếu các cột bắt buộc: ${missing.join(', ')}. ` +
        `Vui lòng kiểm tra lại cấu trúc file mẫu.`
      );
    }
  };

  const validateFileType = (file: File) => {
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (fileExt !== 'xlsx' && fileExt !== 'xls') {
      throw new Error(`File ${file.name} không đúng định dạng. Vui lòng chỉ tải lên file Excel (.xlsx, .xls)`);
    }
  };

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;

    setLoading(true);
    setErrorMsg(null);
    setFileDetails({
      name: files.length === 1 ? files[0].name : `${files.length} file Excel`,
      size: files.reduce((total, file) => total + file.size, 0),
    });

    try {
      files.forEach(validateFileType);
      const parsedFiles = await Promise.all(files.map((file) => parseExcelFile(file)));
      parsedFiles.forEach(validateParsedHeaders);

      setFileDetails({
        name: parsedFiles.length === 1 ? parsedFiles[0].fileName : parsedFiles.map((f) => f.fileName).join(', '),
        size: parsedFiles.reduce((total, file) => total + file.fileSize, 0),
        time: parsedFiles[0]?.uploadedAt,
      });

      if (multiple && onUploadManySuccess) {
        onUploadManySuccess(parsedFiles);
      } else {
        onUploadSuccess(mergeParsedFiles(parsedFiles));
      }
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

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
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
        className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 text-center ${
          compact ? 'px-4 py-3 min-h-[84px]' : 'p-8 min-h-[180px]'
        }
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
          multiple={multiple}
          onChange={handleChange}
        />

        {loading ? (
          <div className={`flex ${compact ? 'items-center space-x-2' : 'flex-col items-center space-y-3'}`}>
            <RefreshCw className={`${compact ? 'h-5 w-5' : 'h-10 w-10'} text-indigo-500 animate-spin`} />
            <p className={`${compact ? 'text-xs' : 'text-sm'} font-medium text-slate-600`}>Đang đọc Excel...</p>
          </div>
        ) : (
          <div className={`flex ${compact ? 'items-center space-x-3' : 'flex-col items-center space-y-4'}`}>
            <div className={`${compact ? 'p-2' : 'p-4'} rounded-full ${errorMsg ? 'bg-rose-50 text-rose-500' : 'bg-slate-100 text-slate-500'}`}>
              <Upload className={compact ? 'h-4 w-4' : 'h-8 w-8'} />
            </div>
            
            <div className={`space-y-0.5 ${compact ? 'text-left' : ''}`}>
              <p className={`${compact ? 'text-xs' : 'text-base'} font-semibold text-slate-800`}>
                {placeholderText}
              </p>
              <p className={`${compact ? 'text-[10px]' : 'text-xs'} text-slate-400 font-mono`}>
                Hỗ trợ định dạng .xlsx, .xls {multiple ? '(có thể chọn nhiều file)' : '(Tối đa 25MB)'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* State Display Panels */}
      {((showSuccessDetails && fileDetails) || errorMsg) && !loading && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {showSuccessDetails && fileDetails && (
            <div className="p-4 bg-emerald-50/40 border border-emerald-100 rounded-lg flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-emerald-800 uppercase tracking-widest font-mono">
                  Đã tải file thành công
                </p>
                <div className="text-sm font-semibold text-slate-800 truncate mt-1" title={fileDetails.name}>
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

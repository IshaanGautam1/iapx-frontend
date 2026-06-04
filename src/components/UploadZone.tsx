/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { Upload, CheckCircle2, FileText, Trash2 } from 'lucide-react';
import { MockFile } from '../types';

interface UploadZoneProps {
  id: string;
  label: string;
  accept: string;
  file: MockFile | null;
  onFileSelect: (file: MockFile | null) => void;
  required?: boolean;
}

export function UploadZone({ id, label, accept, file, onFileSelect, required = false }: UploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const processFile = (nativeFile: File) => {
    const mock: MockFile = {
      name: nativeFile.name,
      size: nativeFile.size,
      type: nativeFile.type || nativeFile.name.split('.').pop() || 'unknown',
      uploadedAt: new Date().toLocaleTimeString(),
    };
    onFileSelect(mock);
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

  const handleZoneClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileSelect(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col gap-1 w-full" id={`upload-container-${id}`}>
      <div className="flex justify-between items-center px-1">
        <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
          {label}
          {required && <span className="text-red-500 font-bold">*</span>}
        </label>
        {file && (
          <span className="text-xs text-slate-500">
            Received at {file.uploadedAt}
          </span>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        id={id}
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />

      <div
        onClick={handleZoneClick}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative flex items-center justify-between p-4 rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer min-h-[82px] ${
          file
            ? 'border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50/70'
            : isDragActive
            ? 'border-sky-500 bg-sky-100/50 scale-[1.01]'
            : 'border-sky-200 bg-sky-50/30 hover:border-sky-400 hover:bg-sky-50/65'
        }`}
      >
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          <div
            className={`p-2.5 rounded-lg flex-shrink-0 transition-colors ${
              file ? 'bg-emerald-100 text-emerald-600' : 'bg-sky-100 text-sky-600'
            }`}
          >
            {file ? <FileText size={20} /> : <Upload size={20} />}
          </div>

          <div className="flex flex-col text-left min-w-0 pr-2">
            {file ? (
              <>
                <p className="text-sm font-semibold text-slate-800 truncate" title={file.name}>
                  {file.name}
                </p>
                <p className="text-xs text-slate-500 font-mono">
                  {formatBytes(file.size)}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-slate-800">
                  {label} <span className="text-xs text-slate-400">({accept})</span>
                </p>
                <p className="text-xs text-slate-500">
                  Drag & drop or click to browse
                </p>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {file ? (
            <>
              <div className="text-emerald-500 flex items-center justify-center p-1">
                <CheckCircle2 size={22} className="fill-emerald-50" />
              </div>
              <button
                type="button"
                onClick={handleRemove}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                title="Remove file"
              >
                <Trash2 size={16} />
              </button>
            </>
          ) : (
            <span className="text-xs text-sky-500 bg-sky-100/60 font-semibold px-2 py-1 rounded-md">
              Select
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

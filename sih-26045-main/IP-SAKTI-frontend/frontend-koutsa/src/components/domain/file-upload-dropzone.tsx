"use client";

import { FileCheck2, FileUp, Loader2, XCircle } from "lucide-react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface FileUploadDropzoneProps {
  onUpload: (file: File) => Promise<void>;
  isUploading?: boolean;
  error?: string | null;
  fileName?: string | null;
  onClear?: () => void;
}

export function FileUploadDropzone({ onUpload, isUploading = false, error, fileName, onClear }: FileUploadDropzoneProps) {
  const [localError, setLocalError] = useState<string | null>(null);

  const onDrop = async (files: File[]) => {
    setLocalError(null);
    const file = files[0];
    if (!file) return;
    await onUpload(file);
  };

  const onDropRejected = (rejections: FileRejection[]) => {
    const reason = rejections[0]?.errors[0]?.code;
    if (reason === "file-too-large") setLocalError("The PDF is larger than 10 MB.");
    else if (reason === "file-invalid-type") setLocalError("Only PDF documents are supported.");
    else setLocalError("We could not accept that file. Please choose a PDF and try again.");
  };

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    onDropRejected,
    multiple: false,
    maxSize: 10 * 1024 * 1024,
    accept: { "application/pdf": [".pdf"] }
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={cn(
          "cursor-pointer rounded-control border border-dashed bg-white px-5 py-6 text-center transition",
          isDragActive ? "border-emerald bg-[#F1F8F5]" : "border-[#BFCBC7] hover:border-emerald hover:bg-[#FAFCFB]",
          isDragReject && "border-[#C23B32] bg-[#FFF6F4]",
          isUploading && "cursor-wait opacity-70"
        )}
        aria-label="Upload a PDF formulation label or research document"
      >
        <input {...getInputProps()} disabled={isUploading} />
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#E8F3F0] text-forest">
          {isUploading ? <Loader2 className="animate-spin" size={21} /> : fileName ? <FileCheck2 size={21} /> : <FileUp size={21} />}
        </div>
        <p className="mt-3 text-sm font-bold text-forest">
          {isUploading ? "Extracting document text…" : isDragActive ? "Drop the PDF here" : fileName ? fileName : "Upload a PDF label or formulation document"}
        </p>
        <p className="mt-1 text-xs leading-5 text-ink/55">
          {fileName && !isUploading ? "Text will be added to the research brief for your review." : "Drag & drop or click to browse · PDF only · up to 10 MB"}
        </p>
      </div>
      {(localError || error) && <p className="mt-2 text-xs text-[#93000A]">{localError || error}</p>}
      {fileName && !isUploading && onClear && (
        <button type="button" onClick={onClear} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-ink/55 hover:text-ink">
          <XCircle size={14} /> Remove uploaded document
        </button>
      )}
    </div>
  );
}

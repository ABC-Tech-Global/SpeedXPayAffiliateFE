"use client";

import * as React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { UploadCloud, Edit, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const MAX_IMAGE_SIZE = 3 * 1024 * 1024; // 3MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/heic", "image/heif"];

type IDUploadProps = {
  id: string;
  label: string;
  kind: 'id_front' | 'id_back' | 'selfie';
  disabled: boolean;
  remoteSrc: string | null;
  onUpload: (kind: 'id_front' | 'id_back' | 'selfie', file: File) => Promise<void>;
  onRemove: (kind: 'id_front' | 'id_back' | 'selfie') => Promise<void>;
  setLightboxSrc: (src: string | null) => void;
};

export function IDUpload({ id, label, kind, disabled, remoteSrc, onUpload, onRemove, setLightboxSrc }: IDUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = React.useState<string | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false); // Covers both upload and removal
  // Note: Progress state would be managed by a higher-level hook/context if needed globally.

  const validateImage = (file: File): { isValid: boolean; error?: string } => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return { isValid: false, error: 'Unsupported file type. Use JPEG/PNG/HEIC.' };
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return { isValid: false, error: 'File too large. Max 3MB.' };
    }
    return { isValid: true };
  };

  const handleFileChange = async (file: File | null) => {
    if (!file) return;

    const { isValid, error } = validateImage(file);
    if (!isValid) {
      toast.error(error);
      return;
    }

    const tempUrl = URL.createObjectURL(file);
    setLocalPreview(tempUrl);
    setIsProcessing(true);

    try {
      await onUpload(kind, file);
    } catch {
      // Error is toasted by the parent hook
      URL.revokeObjectURL(tempUrl);
      setLocalPreview(null);
    } finally {
      setIsProcessing(false);
      // Parent will handle swapping remoteSrc, localPreview will be cleared
    }
  };

  const handleRemove = async () => {
    setIsProcessing(true);
    try {
      await onRemove(kind);
      if (localPreview) URL.revokeObjectURL(localPreview);
      setLocalPreview(null);
    } catch {
      // Error is toasted by parent
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Clean up object URLs on unmount
  React.useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const currentSrc = localPreview || remoteSrc;
  const hasImage = !!currentSrc;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
        disabled={disabled || isProcessing}
      />

      {!hasImage && (
        <div
          className={`h-36 border-2 border-dashed rounded-md p-4 text-center text-sm cursor-pointer flex flex-col items-center justify-center gap-2 ${disabled || isProcessing ? 'opacity-60 pointer-events-none' : 'hover:bg-accent/50'}`}
          onClick={() => inputRef.current?.click()}
        >
          <UploadCloud className="h-6 w-6 text-muted-foreground" />
          <p className="text-muted-foreground">Click or drag to upload</p>
          <p className="text-xs text-muted-foreground">JPG, PNG, HEIC up to 3MB</p>
        </div>
      )}

      {hasImage && (
        <>
          <div className="h-36 rounded-md border flex items-center justify-center overflow-hidden">
            <Image
              key={currentSrc}
              src={currentSrc}
              alt={`${label} preview`}
              width={256}
              height={144}
              className="max-h-full max-w-full cursor-pointer object-contain"
              onClick={() => setLightboxSrc(currentSrc)}
              unoptimized
            />
          </div>
          <div className="mt-2 flex gap-2">
            <Button aria-label="Replace image" type="button" variant="outline" size="icon" disabled={disabled || isProcessing} onClick={() => inputRef.current?.click()}>
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit className="h-4 w-4" />}
            </Button>
            <Button aria-label="Remove image" type="button" variant="destructive" size="icon" disabled={disabled || isProcessing} onClick={handleRemove}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

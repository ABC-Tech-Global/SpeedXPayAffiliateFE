"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-medium">{title}</h2>
      {children}
    </section>
  );
}

function FileInput({ id, onSelected, accept }: { id: string; onSelected: (f: File) => void; accept?: string }) {
  return (
    <input
      id={id}
      type="file"
      accept={accept || "image/*"}
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) onSelected(f);
      }}
    />
  );
}

export default function KycClient() {
  const [loading, setLoading] = React.useState(false);
  const [status, setStatus] = React.useState<string | null>(null);
  const [bust, setBust] = React.useState(0);
  const [frontPreview, setFrontPreview] = React.useState<string | null>(null);
  const [backPreview, setBackPreview] = React.useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = React.useState<string | null>(null);
  const [hasFront, setHasFront] = React.useState(false);
  const [hasBack, setHasBack] = React.useState(false);
  const [hasSelfie, setHasSelfie] = React.useState(false);
  const [lightboxSrc, setLightboxSrc] = React.useState<string | null>(null);

  const [fullName, setFullName] = React.useState("");
  const [dob, setDob] = React.useState("");
  const [gender, setGender] = React.useState("");
  // Email removed from KYC; use profile page to manage email

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/me/kyc', { cache: 'no-store' });
        const data = await res.json();
        const kyc = data?.kyc;
        if (kyc) {
          setStatus(kyc.status);
          setFullName(kyc.full_name || "");
          setDob(kyc.dob ? String(kyc.dob).slice(0,10) : "");
          setGender(kyc.gender || "");
          // email removed from KYC
        }
      } catch {}
    })();
  }, []);

  async function saveInfo(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/me/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, dob, gender }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to save KYC info');
      toast.success('Saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  }

  async function upload(kind: 'id_front'|'id_back'|'selfie', file: File) {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`/api/me/kyc/upload/${kind}`, { method: 'POST', body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Upload failed');
    setBust(Date.now());
    return data;
  }

  function validateImage(file: File): boolean {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Unsupported file type. Use JPEG/PNG/HEIC.');
      return false;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error('File too large. Max 10MB.');
      return false;
    }
    return true;
  }

  React.useEffect(() => {
    return () => {
      if (frontPreview) URL.revokeObjectURL(frontPreview);
      if (backPreview) URL.revokeObjectURL(backPreview);
      if (selfiePreview) URL.revokeObjectURL(selfiePreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit() {
    setLoading(true);
    try {
      const res = await fetch('/api/me/kyc/submit', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Submit failed');
      setStatus('pending');
      toast.success('KYC submitted');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Submit failed');
    } finally {
      setLoading(false);
    }
  }

  const disabled = status === 'pending' || status === 'approved';

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold flex items-center gap-3">
          KYC Verification
          <StatusBadge status={status} />
        </h1>
      </header>

      <Section title="Personal information">
        <form onSubmit={saveInfo} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="fullName">Full name (as on ID)</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={disabled || loading} required />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} disabled={disabled || loading} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gender">Gender</Label>
              <select id="gender" className="h-9 rounded-md border bg-background px-3 text-sm" value={gender} onChange={(e) => setGender(e.target.value)} disabled={disabled || loading} required>
                <option value="">Select…</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
                <option value="prefer_not_say">Prefer not to say</option>
              </select>
            </div>
            {/* Email moved to Profile settings */}
          </div>
          <Button type="submit" disabled={disabled || loading}>{loading ? 'Saving…' : 'Save info'}</Button>
        </form>
      </Section>

      <Section title="ID document uploads">
        {!disabled && (
          <p className="text-xs text-muted-foreground mb-2">Accepted file types: JPG, PNG, HEIC. Maximum size: 10MB per image.</p>
        )}
        <div className="grid sm:grid-cols-3 gap-4">
          <IDUpload
            id="id_front"
            label="ID Front"
            kind="id_front"
            disabled={disabled || loading}
            remoteSrc={`/api/me/kyc/image/id_front?v=${bust}`}
            localPreview={frontPreview}
            setLocalPreview={setFrontPreview}
            has={hasFront}
            setHas={setHasFront}
            onUpload={upload}
            onValidate={validateImage}
            onRemoveSuccess={() => setBust(Date.now())}
            setLightboxSrc={setLightboxSrc}
          />
          <IDUpload
            id="id_back"
            label="ID Back"
            kind="id_back"
            disabled={disabled || loading}
            remoteSrc={`/api/me/kyc/image/id_back?v=${bust}`}
            localPreview={backPreview}
            setLocalPreview={setBackPreview}
            has={hasBack}
            setHas={setHasBack}
            onUpload={upload}
            onValidate={validateImage}
            onRemoveSuccess={() => setBust(Date.now())}
            setLightboxSrc={setLightboxSrc}
          />
          <IDUpload
            id="selfie"
            label="Selfie with ID"
            kind="selfie"
            disabled={disabled || loading}
            remoteSrc={`/api/me/kyc/image/selfie?v=${bust}`}
            localPreview={selfiePreview}
            setLocalPreview={setSelfiePreview}
            has={hasSelfie}
            setHas={setHasSelfie}
            onUpload={upload}
            onValidate={validateImage}
            onRemoveSuccess={() => setBust(Date.now())}
            setLightboxSrc={setLightboxSrc}
          />
        </div>
      </Section>

      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxSrc(null)}
          role="dialog"
          aria-modal="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightboxSrc} alt="Preview" className="max-h-[90vh] max-w-[90vw] rounded shadow-lg" />
        </div>
      )}

      {!disabled && (
        <Section title="Review & Submit">
          <p className="text-sm text-muted-foreground">Ensure the information matches your ID. Blurry images may result in rejection.</p>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Submitting…' : 'Submit for review'}
          </Button>
        </Section>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const label = !status ? 'Not started' : (
    status === 'draft' ? 'In progress' :
    status === 'pending' ? 'Submitted' :
    status === 'approved' ? 'Approved' :
    status === 'rejected' ? 'Rejected' : status
  );
  const cls = !status
    ? 'bg-muted text-foreground/80'
    : status === 'approved'
      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
      : status === 'pending'
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
        : status === 'rejected'
          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

function IDUpload(props: {
  id: string;
  label: string;
  kind: 'id_front' | 'id_back' | 'selfie';
  disabled: boolean;
  remoteSrc: string;
  localPreview: string | null;
  setLocalPreview: (v: string | null) => void;
  has: boolean;
  setHas: (v: boolean) => void;
  onUpload: (kind: 'id_front'|'id_back'|'selfie', file: File) => Promise<any>;
  onValidate: (file: File) => boolean;
  onRemoveSuccess: () => void;
  setLightboxSrc: (src: string | null) => void;
}) {
  const {
    id, label, kind, disabled, remoteSrc,
    localPreview, setLocalPreview, has, setHas,
    onUpload, onValidate, onRemoveSuccess, setLightboxSrc,
  } = props;

  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!onValidate(file)) return;
    const url = URL.createObjectURL(file);
    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalPreview(url);
    try {
      await onUpload(kind, file);
      setHas(true);
      toast.success(`${label} uploaded`);
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed');
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />

      {!has && !localPreview && (
        <div
          className={`border-2 border-dashed rounded-md p-4 text-center text-sm cursor-pointer ${disabled ? 'opacity-60 pointer-events-none' : 'hover:bg-accent/50'}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); }}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) void handleFile(f);
          }}
        >
          <p className="text-muted-foreground">Drag & drop or click to upload</p>
          <p className="text-xs text-muted-foreground mt-1">JPG, PNG, HEIC up to 10MB</p>
        </div>
      )}

      <div className="mt-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={localPreview || remoteSrc}
          alt={`${label} preview`}
          className={(!has && !localPreview) ? 'hidden' : 'h-24 w-auto rounded border cursor-pointer'}
          onClick={(e) => setLightboxSrc((e.currentTarget as HTMLImageElement).src)}
          onLoad={() => setHas(true)}
          onError={(e) => { setHas(false); (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
        {(has || localPreview) && (
          <div className="mt-2 flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => inputRef.current?.click()}>
              Replace
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={async () => {
                try {
                  const res = await fetch(`/api/me/kyc/upload/${kind}`, { method: 'DELETE' });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data?.error || 'Remove failed');
                  if (localPreview) URL.revokeObjectURL(localPreview);
                  setLocalPreview(null);
                  setHas(false);
                  onRemoveSuccess();
                  toast.success(`${label} removed`);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Remove failed');
                }
              }}
            >
              Remove
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

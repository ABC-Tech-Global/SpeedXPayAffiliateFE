"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KycStatusBadge } from "@/features/kyc/components/KycStatusBadge";
import { DatePicker } from "@/components/DatePicker";
import { GenderSelect } from "@/components/GenderSelect";
import { IDUpload } from "@/features/kyc/components/IDUpload"; // Extracted component
import { useKyc } from "@/features/kyc/hooks/useKyc"; // Our new hook
import { useRouter } from 'next/navigation';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-medium">{title}</h2>
      {children}
    </section>
  );
}

function Lightbox({ src, onClose }: { src: string | null; onClose: () => void }) {
  if (!src || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <Image src={src} alt="Preview" width={720} height={720} className="max-h-[90vh] max-w-[90vw] rounded shadow-lg" unoptimized />
    </div>,
    document.body
  );
}

export default function KycClient() {
  const router = useRouter();
  const { state, dispatch, uploadImage, removeImage, submitForReview } = useKyc(router);
  const [lightboxSrc, setLightboxSrc] = React.useState<string | null>(null);

  const { status, kycStatus, fullName, dob, gender, images } = state;
  const loading = status === 'loading' || status === 'submitting';
  const disabled = kycStatus === 'pending' || kycStatus === 'approved';

  if (status === 'loading') {
    return <div>Loading KYC information...</div>; // Or a skeleton loader
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold flex items-center gap-3">
          KYC Verification
          <KycStatusBadge status={kycStatus} />
        </h1>
      </header>

      <Section title="Personal information">
        <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="fullName">Full name (as on ID)</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => dispatch({ type: 'SET_FIELD', payload: { field: 'fullName', value: e.target.value } })}
              disabled={disabled || loading}
              required
            />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <DatePicker
              id="dob"
              label="Date of Birth"
              value={dob}
              onChange={(d) => dispatch({ type: 'SET_FIELD', payload: { field: 'dob', value: d ?? null } })}
              disabled={disabled || loading}
              fromYear={1900}
              toYear={new Date().getFullYear()}
            />
            <GenderSelect
              id="gender"
              label="Gender"
              value={gender}
              onChange={(v) => dispatch({ type: 'SET_FIELD', payload: { field: 'gender', value: v } })}
              disabled={disabled || loading}
            />
          </div>
        </form>
      </Section>

      <Section title="ID document uploads">
        {!disabled && (
          <p className="text-xs text-muted-foreground mb-2">Accepted file types: JPG, PNG, HEIC. Maximum size: 3MB per image.</p>
        )}
        <div className="grid sm:grid-cols-3 gap-4">
          <IDUpload
            id="id_front"
            label="ID Front"
            kind="id_front"
            disabled={disabled || loading}
            remoteSrc={images.id_front}
            onUpload={uploadImage}
            onRemove={removeImage}
            setLightboxSrc={setLightboxSrc}
          />
          <IDUpload
            id="id_back"
            label="ID Back"
            kind="id_back"
            disabled={disabled || loading}
            remoteSrc={images.id_back}
            onUpload={uploadImage}
            onRemove={removeImage}
            setLightboxSrc={setLightboxSrc}
          />
          <IDUpload
            id="selfie"
            label="Selfie with ID"
            kind="selfie"
            disabled={disabled || loading}
            remoteSrc={images.selfie}
            onUpload={uploadImage}
            onRemove={removeImage}
            setLightboxSrc={setLightboxSrc}
          />
        </div>
      </Section>

      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />

      {!disabled && (
        <Section title="Review & Submit">
          <p className="text-sm text-muted-foreground">Ensure the information matches your ID. Blurry images may result in rejection.</p>
          <Button onClick={submitForReview} disabled={loading}>
            {loading ? 'Submitting…' : 'Submit for review'}
          </Button>
        </Section>
      )}
    </div>
  );
}

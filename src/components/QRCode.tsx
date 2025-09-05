"use client";

import * as React from "react";
import QRCodeLib from "qrcode";

export default function QRCode({ value, size = 200, className, alt = "QR code" }: { value: string; size?: number; className?: string; alt?: string }) {
  const [url, setUrl] = React.useState<string>("");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const dataUrl = await QRCodeLib.toDataURL(value, { width: size, margin: 0 });
        if (!cancelled) setUrl(dataUrl);
      } catch {
        if (!cancelled) setUrl("");
      }
    })();
    return () => { cancelled = true; };
  }, [value, size]);

  if (!url) return null;

  return <img src={url} alt={alt} width={size} height={size} className={className} />;
}


"use client";

import * as React from "react";

export default function CurrentTime({ className }: { className?: string }) {
  const [now, setNow] = React.useState<string>("");
  React.useEffect(() => {
    const s = new Date().toLocaleString();
    setNow(s);
  }, []);
  return <div className={className}>{now}</div>;
}


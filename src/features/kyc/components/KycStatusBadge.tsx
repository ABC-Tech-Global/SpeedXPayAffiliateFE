"use client";

import React from 'react';
import { classesFor } from "@/lib/utils";

export function KycStatusBadge({ status }: { status: string | null }) {
  const label = !status ? 'Not started' : (
    status === 'draft' ? 'In progress' :
    status === 'pending' ? 'Submitted' :
    status === 'approved' ? 'Approved' :
    status === 'rejected' ? 'Rejected' : status
  );
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${classesFor(status)}`}>{label}</span>;
}

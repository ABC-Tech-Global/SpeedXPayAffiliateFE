export function updateUrlParams(href: string, updates: Record<string, string | number | undefined | null>) {
  const url = new URL(href);
  for (const [k, v] of Object.entries(updates)) {
    if (v === undefined || v === null || v === '') url.searchParams.delete(k);
    else url.searchParams.set(k, String(v));
  }
  return url.toString();
}

export function clampPage(page: number, pages: number) {
  return Math.max(1, Math.min(pages, page));
}

export function pageButtons(current: number, pages: number, radius = 2): number[] {
  const buttons: number[] = [];
  const start = Math.max(1, current - radius);
  const end = Math.min(pages, current + radius);
  if (start > 1) buttons.push(1);
  for (let i = start; i <= end; i++) buttons.push(i);
  if (end < pages) buttons.push(pages);
  return buttons;
}


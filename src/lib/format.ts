/** Formatting helpers. Backend money is always paise; dates are ISO strings. */

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** 14800 -> "₹148" · 14850 -> "₹148.50" (Indian digit grouping). */
export function formatINR(paise: number | null | undefined): string {
  if (paise === null || paise === undefined || Number.isNaN(paise)) return "—";
  return inr.format(paise / 100);
}

/** Plain number with Indian grouping, e.g. 1,23,456. */
export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-IN");
}

const dateTimeFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/** ISO string -> "16 Nov 2026, 10:24 am" (IST). */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : dateTimeFmt.format(d);
}

/** ISO string -> "16 Nov 2026" (IST). */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : dateFmt.format(d);
}

/** "2026-11-16" (report day key, already a local date) -> "16 Nov 2026". */
export function formatDayKey(day: string): string {
  const d = new Date(`${day}T00:00:00+05:30`);
  return Number.isNaN(d.getTime()) ? day : dateFmt.format(d);
}

/** "2026-11" -> "Nov 2026". */
export function formatMonthKey(month: string): string {
  const d = new Date(`${month}-01T00:00:00+05:30`);
  if (Number.isNaN(d.getTime())) return month;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    month: "short",
    year: "numeric",
  }).format(d);
}

/** Bytes -> "245 KB" / "3.2 MB". */
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Rupees string from a form input -> integer paise (NaN-safe). */
export function rupeesToPaise(value: string): number {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

/** Paise -> plain rupees string for form inputs, e.g. 9900 -> "99". */
export function paiseToRupeesInput(paise: number): string {
  const v = paise / 100;
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

/**
 * Order status flow — mirrors the backend exactly
 * (backend/src/common/order-status.ts). The status-update control on the
 * order detail page only offers ADMIN_TRANSITIONS[current]; the backend
 * re-validates every transition and its error message is shown verbatim.
 */

export const ORDER_FLOW: string[] = [
  "received",
  "verification",
  "printing",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
];

/** All statuses usable in the orders-list filter (pending_payment is an
 *  internal pre-payment state and is hidden by the backend by default). */
export const FILTER_STATUSES: string[] = [
  ...ORDER_FLOW,
  "cancelled",
  "pending_payment",
];

export const STATUS_LABELS: Record<string, string> = {
  received: "Order Received",
  verification: "Document Verification",
  printing: "Printing",
  packed: "Packed",
  shipped: "Shipped",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  pending_payment: "Payment Pending",
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

/** Admin-driven transitions (backend ADMIN_TRANSITIONS). */
export const ADMIN_TRANSITIONS: Record<string, string[]> = {
  received: ["verification", "cancelled"],
  verification: ["printing", "cancelled"],
  printing: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["out_for_delivery"],
  out_for_delivery: ["delivered"],
  delivered: [],
  cancelled: [],
  pending_payment: [],
};

/** Tailwind classes per status for badges. */
export const STATUS_BADGE_CLASSES: Record<string, string> = {
  received: "bg-sky-100 text-sky-800 ring-sky-200",
  verification: "bg-amber-100 text-amber-800 ring-amber-200",
  printing: "bg-indigo-100 text-indigo-800 ring-indigo-200",
  packed: "bg-violet-100 text-violet-800 ring-violet-200",
  shipped: "bg-blue-100 text-blue-800 ring-blue-200",
  out_for_delivery: "bg-cyan-100 text-cyan-800 ring-cyan-200",
  delivered: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  cancelled: "bg-rose-100 text-rose-800 ring-rose-200",
  pending_payment: "bg-slate-100 text-slate-700 ring-slate-200",
};

export const CATEGORY_LABELS: Record<string, string> = {
  pvc_card: "PVC Photo ID Card",
  passport_photo: "Passport Size Photo",
  photo_print: "Photo Printing",
  document_print: "Document Printing",
  pdf_print: "PDF Printing",
  bulk: "Bulk Printing",
};

export const CATEGORIES: string[] = Object.keys(CATEGORY_LABELS);

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

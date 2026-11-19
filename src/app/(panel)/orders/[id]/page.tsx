"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { OrderDetail } from "@/lib/types";
import {
  formatDateTime,
  formatFileSize,
  formatINR,
} from "@/lib/format";
import { ADMIN_TRANSITIONS, statusLabel } from "@/lib/status";
import { Card, ErrorBanner, Spinner, StatusBadge } from "@/components/ui";

function errText(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [nextStatus, setNextStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusOk, setStatusOk] = useState<string | null>(null);

  const [noteText, setNoteText] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const [shipBusy, setShipBusy] = useState(false);
  const [shipError, setShipError] = useState<string | null>(null);
  const [shipOk, setShipOk] = useState<string | null>(null);

  // UPI (manual) payment verification — only for orders in
  // pending_payment with a UPI payment row (see Payment card below).
  const [upiBusy, setUpiBusy] = useState(false);
  const [upiError, setUpiError] = useState<string | null>(null);
  const [upiOk, setUpiOk] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<OrderDetail>(`/admin/orders/${id}`);
      setOrder(data);
      const allowed = ADMIN_TRANSITIONS[data.status] ?? [];
      setNextStatus(allowed[0] ?? "");
    } catch (err) {
      setError(errText(err, "Could not load this order."));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatus() {
    if (!nextStatus) return;
    setStatusBusy(true);
    setStatusError(null);
    setStatusOk(null);
    try {
      const updated = await api.patch<OrderDetail>(
        `/admin/orders/${id}/status`,
        {
          status: nextStatus,
          ...(statusNote.trim() ? { note: statusNote.trim() } : {}),
        },
      );
      setOrder(updated);
      setStatusNote("");
      const allowed = ADMIN_TRANSITIONS[updated.status] ?? [];
      setNextStatus(allowed[0] ?? "");
      setStatusOk(`Status updated to "${statusLabel(updated.status)}".`);
    } catch (err) {
      // The backend explains exactly why a transition is not allowed —
      // show its message as-is.
      setStatusError(errText(err, "Status update failed."));
    } finally {
      setStatusBusy(false);
    }
  }

  async function addNote() {
    if (!noteText.trim()) return;
    setNoteBusy(true);
    setNoteError(null);
    try {
      const updated = await api.post<OrderDetail>(`/admin/orders/${id}/notes`, {
        note: noteText.trim(),
      });
      setOrder(updated);
      setNoteText("");
    } catch (err) {
      setNoteError(errText(err, "Could not add the note."));
    } finally {
      setNoteBusy(false);
    }
  }

  async function createShipment() {
    setShipBusy(true);
    setShipError(null);
    setShipOk(null);
    try {
      const updated = await api.post<OrderDetail>(`/admin/orders/${id}/ship`);
      setOrder(updated);
      const allowed = ADMIN_TRANSITIONS[updated.status] ?? [];
      setNextStatus(allowed[0] ?? "");
      setShipOk(
        updated.shipment?.awb_code
          ? `Shipment created. AWB: ${updated.shipment.awb_code}${
              updated.shipment.courier_name
                ? ` (${updated.shipment.courier_name})`
                : ""
            }`
          : "Shipment created.",
      );
    } catch (err) {
      // Until Shiprocket is configured on the backend this returns its
      // "not configured" message — display it exactly, never invent an AWB.
      setShipError(errText(err, "Shipment creation failed."));
    } finally {
      setShipBusy(false);
    }
  }

  /** UPI payment verified: the admin checked the payment proof (UTR or
   * screenshot) in the business UPI/bank app. The backend marks the
   * payment captured and the order becomes received. */
  async function verifyUpiPayment() {
    setUpiBusy(true);
    setUpiError(null);
    setUpiOk(null);
    try {
      const updated = await api.post<OrderDetail>(
        `/admin/orders/${id}/verify-upi-payment`,
      );
      setOrder(updated);
      const allowed = ADMIN_TRANSITIONS[updated.status] ?? [];
      setNextStatus(allowed[0] ?? "");
      setUpiOk(
        `UPI payment verified — order is now "${statusLabel(updated.status)}".`,
      );
    } catch (err) {
      setUpiError(errText(err, "UPI payment verification failed."));
    } finally {
      setUpiBusy(false);
    }
  }

  /** UPI payment rejected: the payment proof (UTR or screenshot) could
   * not be matched in the business account. The backend marks the
   * payment failed and cancels the order. */
  async function rejectUpiPayment() {
    setUpiBusy(true);
    setUpiError(null);
    setUpiOk(null);
    try {
      const updated = await api.post<OrderDetail>(
        `/admin/orders/${id}/reject-upi-payment`,
      );
      setOrder(updated);
      const allowed = ADMIN_TRANSITIONS[updated.status] ?? [];
      setNextStatus(allowed[0] ?? "");
      setUpiOk("UPI payment rejected — the order was cancelled.");
    } catch (err) {
      setUpiError(errText(err, "UPI payment rejection failed."));
    } finally {
      setUpiBusy(false);
    }
  }

  if (loading) return <Spinner label="Loading order…" />;
  if (error) return <ErrorBanner message={error} onRetry={load} />;
  if (!order) return null;

  const allowed = ADMIN_TRANSITIONS[order.status] ?? [];
  const addr = order.address;

  // UPI (manual) payment awaiting verification: order is pending_payment
  // and a payments row has method 'upi' with status 'created'. The proof
  // is the UTR in gateway_payment_id and/or the payment screenshot
  // (screenshot_key + signed screenshot_url) — either may be present.
  const upiPayment = order.payments.find(
    (p) => p.method === "upi" && p.status === "created",
  );
  const isUpiPending =
    order.status === "pending_payment" && upiPayment != null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/orders"
          className="text-sm font-semibold text-navy underline underline-offset-2"
        >
          ← All orders
        </Link>
        <h2 className="text-xl font-extrabold text-slate-900">
          {order.order_no}
        </h2>
        <StatusBadge status={order.status} />
        <span className="text-sm text-slate-500">
          Placed {formatDateTime(order.created_at)}
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* Items + files */}
          <Card title="Items & Uploaded Files">
            <div className="space-y-5">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="border-b border-slate-100 pb-5 last:border-0 last:pb-0"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold text-slate-900">
                      {item.product_name ?? "Product"}
                      {item.option_label && (
                        <span className="ml-2 text-sm font-medium text-slate-500">
                          {item.option_label}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-slate-600">
                      {item.qty} × {formatINR(item.unit_price_paise)} ={" "}
                      <span className="font-bold text-slate-900">
                        {formatINR(item.qty * item.unit_price_paise)}
                      </span>
                    </p>
                  </div>

                  {Object.keys(item.options ?? {}).length > 0 && (
                    <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                      {Object.entries(item.options).map(([k, v]) => (
                        <span key={k}>
                          <dt className="inline font-semibold">{k}: </dt>
                          <dd className="inline">{String(v)}</dd>
                        </span>
                      ))}
                    </dl>
                  )}

                  {item.files.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-400">
                      No files uploaded for this item.
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {item.files.map((f) => (
                        <li
                          key={f.id}
                          className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 px-3.5 py-2.5 ring-1 ring-slate-200"
                        >
                          <span className="text-lg">
                            {f.mime_type === "application/pdf" ? "📄" : "🖼️"}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-slate-800">
                              {f.original_name}
                            </span>
                            <span className="block text-xs text-slate-500">
                              {formatFileSize(f.size_bytes)}
                              {f.side ? ` · ${f.side} side` : ""}
                            </span>
                          </span>
                          {f.download_available && f.signed_url ? (
                            <a
                              href={f.signed_url}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg bg-navy px-3 py-1.5 text-xs font-bold text-white hover:bg-navy-deep"
                            >
                              Download
                            </a>
                          ) : (
                            <span
                              className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500"
                              title="File storage is not configured on the server, so no download link can be generated."
                            >
                              Download unavailable
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {item.files.length > 0 &&
                    item.files.some((f) => !f.download_available) && (
                      <p className="mt-2 text-xs text-amber-700">
                        File storage is not configured on the server, so
                        download links cannot be generated yet.
                      </p>
                    )}
                </div>
              ))}
            </div>
            <p className="mt-4 rounded-xl bg-sky-50 px-3.5 py-2.5 text-xs text-sky-900 ring-1 ring-sky-100">
              Printing is manual: download the original files above and print
              them on your local printer, then mark the order Printing →
              Packed.
            </p>
          </Card>

          {/* Payments */}
          <Card title="Payment">
            {order.payments.length === 0 ? (
              <p className="text-sm text-slate-500">
                No payment record for this order.
              </p>
            ) : (
              <div className="space-y-3">
                {order.payments.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-bold text-slate-900">
                        {formatINR(p.amount_paise)}
                        <span className="ml-2 font-medium capitalize text-slate-500">
                          {p.method ?? p.gateway} · {p.status}
                        </span>
                      </p>
                      {p.signature_verified ? (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 ring-1 ring-inset ring-emerald-200">
                          ✓ Signature verified by backend
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 ring-1 ring-inset ring-amber-200">
                          Not verified
                        </span>
                      )}
                    </div>
                    <dl className="mt-2 grid gap-x-6 gap-y-1 text-xs text-slate-500 sm:grid-cols-2">
                      {p.gateway_payment_id && (
                        <span>
                          <dt className="inline font-semibold">Payment ID: </dt>
                          <dd className="inline break-all">
                            {p.gateway_payment_id}
                          </dd>
                        </span>
                      )}
                      {p.gateway_order_id && (
                        <span>
                          <dt className="inline font-semibold">
                            Gateway order:{" "}
                          </dt>
                          <dd className="inline break-all">
                            {p.gateway_order_id}
                          </dd>
                        </span>
                      )}
                      {p.screenshot_key && (
                        <span>
                          <dt className="inline font-semibold">
                            Payment proof:{" "}
                          </dt>
                          <dd className="inline">
                            {p.screenshot_url ? (
                              <a
                                href={p.screenshot_url}
                                target="_blank"
                                rel="noreferrer"
                                className="font-semibold text-navy underline underline-offset-2"
                              >
                                View payment screenshot
                              </a>
                            ) : (
                              "Screenshot submitted (preview unavailable — storage not configured)"
                            )}
                          </dd>
                        </span>
                      )}
                      <span>
                        <dt className="inline font-semibold">Recorded: </dt>
                        <dd className="inline">
                          {formatDateTime(p.created_at)}
                        </dd>
                      </span>
                    </dl>
                  </div>
                ))}
              </div>
            )}

            {/* UPI (manual) payment — verify the customer's proof (UTR
                and/or payment screenshot) in your UPI/bank app BEFORE
                confirming. Verifying marks the payment captured and the
                order received; rejecting cancels it. */}
            {isUpiPending && upiPayment && (
              <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3.5 ring-1 ring-amber-200">
                <p className="text-sm font-bold text-amber-900">
                  UPI payment awaiting verification
                </p>
                {upiPayment.gateway_payment_id && (
                  <p className="mt-1 text-sm text-amber-800">
                    Customer UTR:{" "}
                    <span className="font-mono font-bold tracking-wide">
                      {upiPayment.gateway_payment_id}
                    </span>{" "}
                    · Amount: {formatINR(upiPayment.amount_paise)}
                  </p>
                )}
                {upiPayment.screenshot_key && (
                  <p className="mt-1 text-sm text-amber-800">
                    Payment proof:{" "}
                    {upiPayment.screenshot_url ? (
                      <a
                        href={upiPayment.screenshot_url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-navy underline underline-offset-2"
                      >
                        View payment screenshot
                      </a>
                    ) : (
                      <span className="font-semibold">
                        screenshot submitted (preview unavailable — storage
                        not configured)
                      </span>
                    )}{" "}
                    · Amount: {formatINR(upiPayment.amount_paise)}
                  </p>
                )}
                {!upiPayment.gateway_payment_id &&
                  !upiPayment.screenshot_key && (
                    <p className="mt-1 text-sm text-amber-800">
                      No proof recorded · Amount:{" "}
                      {formatINR(upiPayment.amount_paise)}
                    </p>
                  )}
                <p className="mt-1 text-xs text-amber-700">
                  {upiPayment.gateway_payment_id
                    ? "Check this UTR and amount in your UPI/bank app first — only then press Verify. A fake or wrong UTR must be rejected."
                    : "Open the screenshot and match the amount and the receiver UPI ID with your UPI/bank app first — only then press Verify. A fake or edited screenshot must be rejected."}
                </p>
                {upiError && (
                  <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-800">
                    {upiError}
                  </div>
                )}
                {upiOk && (
                  <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-800">
                    {upiOk}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={verifyUpiPayment}
                    disabled={upiBusy}
                    className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {upiBusy ? "Working…" : "✓ Verify Payment"}
                  </button>
                  <button
                    onClick={rejectUpiPayment}
                    disabled={upiBusy}
                    className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {upiBusy ? "Working…" : "✕ Reject"}
                  </button>
                </div>
              </div>
            )}
          </Card>

          {/* Status history */}
          <Card title="Status History">
            {order.status_history.length === 0 ? (
              <p className="text-sm text-slate-500">No history yet.</p>
            ) : (
              <ol className="space-y-3">
                {order.status_history.map((h, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-sky ring-4 ring-sky-100" />
                    <div>
                      <p className="font-semibold text-slate-800">
                        {statusLabel(h.status)}
                        <span className="ml-2 text-xs font-medium text-slate-400">
                          by {h.changed_by} · {formatDateTime(h.created_at)}
                        </span>
                      </p>
                      {h.note && (
                        <p className="text-slate-500">{h.note}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          {/* Customer + address */}
          <Card title="Customer & Delivery Address">
            {order.customer ? (
              <div className="text-sm">
                <p className="font-bold text-slate-900">
                  {order.customer.name ?? "—"}
                </p>
                <p className="text-slate-600">{order.customer.mobile}</p>
                {order.customer.email && (
                  <p className="text-slate-600">{order.customer.email}</p>
                )}
                <Link
                  href={`/customers/${order.customer.id}`}
                  className="mt-1 inline-block font-semibold text-navy underline underline-offset-2"
                >
                  View customer →
                </Link>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Customer not found.</p>
            )}
            {addr ? (
              <div className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">{addr.full_name}</p>
                <p>{addr.mobile}</p>
                <p className="mt-1 leading-relaxed">
                  {[addr.house_no, addr.street, addr.village_city]
                    .filter(Boolean)
                    .join(", ")}
                  <br />
                  {[addr.district, addr.state].filter(Boolean).join(", ")}
                  {addr.pin_code ? ` — ${addr.pin_code}` : ""}
                </p>
              </div>
            ) : (
              <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-500">
                No delivery address on this order.
              </p>
            )}
            {order.customer_note && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Customer note
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {order.customer_note}
                </p>
              </div>
            )}
          </Card>

          {/* Price breakup */}
          <Card title="Price Breakup">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Subtotal</dt>
                <dd className="font-medium">{formatINR(order.subtotal_paise)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Delivery</dt>
                <dd className="font-medium">{formatINR(order.delivery_paise)}</dd>
              </div>
              {order.discount_paise > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <dt>Discount</dt>
                  <dd className="font-medium">
                    − {formatINR(order.discount_paise)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
                <dt>Total</dt>
                <dd>{formatINR(order.total_paise)}</dd>
              </div>
            </dl>
          </Card>

          {/* Status update */}
          <Card title="Update Status">
            {statusError && (
              <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-800">
                {statusError}
              </div>
            )}
            {statusOk && (
              <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-800">
                {statusOk}
              </div>
            )}
            {allowed.length === 0 ? (
              <p className="text-sm text-slate-500">
                {order.status === "pending_payment" ? (
                  <>
                    This order is waiting for UPI payment verification —
                    use the <strong>Verify Payment</strong> /{" "}
                    <strong>Reject</strong> buttons in the Payment section
                    above. The order cannot be moved to Received by hand.
                  </>
                ) : (
                  <>
                    This order is in its final state (
                    {statusLabel(order.status)}) — no further status changes
                    are possible.
                  </>
                )}
              </p>
            ) : (
              <>
                <label className="block text-sm font-semibold text-slate-700">
                  Move to
                  <select
                    value={nextStatus}
                    onChange={(e) => setNextStatus(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-sky focus:ring-2 focus:ring-brand-sky/40"
                  >
                    {allowed.map((s) => (
                      <option key={s} value={s}>
                        {statusLabel(s)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="mt-3 block text-sm font-semibold text-slate-700">
                  Note (optional)
                  <input
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    maxLength={300}
                    placeholder="Shown in the status history"
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-sky focus:ring-2 focus:ring-brand-sky/40"
                  />
                </label>
                <button
                  onClick={updateStatus}
                  disabled={statusBusy || !nextStatus}
                  className="mt-4 w-full rounded-xl bg-navy px-4 py-2.5 text-sm font-bold text-white hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {statusBusy ? "Updating…" : "Update Status"}
                </button>
                <p className="mt-2 text-xs text-slate-400">
                  Orders move one step at a time. Cancellation is possible
                  until the order ships.
                </p>
              </>
            )}
          </Card>

          {/* Shipment / AWB */}
          <Card title="Shipment & AWB">
            {shipError && (
              <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-800">
                {shipError}
              </div>
            )}
            {shipOk && (
              <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-800">
                {shipOk}
              </div>
            )}
            {order.shipment ? (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">AWB</dt>
                  <dd className="font-bold text-slate-900">
                    {order.shipment.awb_code ?? "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Courier</dt>
                  <dd className="font-medium">
                    {order.shipment.courier_name ?? "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Courier status</dt>
                  <dd className="font-medium">
                    {order.shipment.current_status ?? "—"}
                  </dd>
                </div>
                {order.shipment.etd && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Expected delivery</dt>
                    <dd className="font-medium">
                      {formatDateTime(order.shipment.etd)}
                    </dd>
                  </div>
                )}
                {order.shipment.tracking_url && (
                  <a
                    href={order.shipment.tracking_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block pt-1 font-semibold text-navy underline underline-offset-2"
                  >
                    Track shipment →
                  </a>
                )}
              </dl>
            ) : (
              <>
                <p className="text-sm text-slate-500">
                  No shipment created yet. This creates the Shiprocket
                  shipment, generates the AWB and requests pickup. It works
                  once the order is <strong>Packed</strong>.
                </p>
                <button
                  onClick={createShipment}
                  disabled={shipBusy}
                  className="mt-3 w-full rounded-xl bg-brand-sky px-4 py-2.5 text-sm font-bold text-navy-deep hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {shipBusy
                    ? "Creating shipment…"
                    : "Create Shipment & Generate AWB"}
                </button>
              </>
            )}
          </Card>

          {/* Internal notes */}
          <Card title="Internal Notes">
            <p className="mb-1 text-xs text-slate-400">
              Only visible to admins — never shown to the customer.
            </p>
            {order.internal_note ? (
              <p className="pre-lines rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-slate-700 ring-1 ring-amber-100">
                {order.internal_note}
              </p>
            ) : (
              <p className="text-sm text-slate-500">No notes yet.</p>
            )}
            {noteError && (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-800">
                {noteError}
              </div>
            )}
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="Add an internal note (e.g. paper loaded, waiting for lamination)…"
              className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-sky focus:ring-2 focus:ring-brand-sky/40"
            />
            <button
              onClick={addNote}
              disabled={noteBusy || !noteText.trim()}
              className="mt-2 w-full rounded-xl bg-navy px-4 py-2.5 text-sm font-bold text-white hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-60"
            >
              {noteBusy ? "Saving…" : "Add Note"}
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
}

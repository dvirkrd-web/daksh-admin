"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { SupportTicket } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { Card, EmptyState, ErrorBanner, Spinner } from "@/components/ui";

const FILTERS = [
  { value: "", label: "All" },
  { value: "open", label: "Open" },
  { value: "replied", label: "Replied" },
  { value: "closed", label: "Closed" },
];

const STATUS_CLASSES: Record<string, string> = {
  open: "bg-amber-100 text-amber-800 ring-amber-200",
  replied: "bg-sky-100 text-sky-800 ring-sky-200",
  closed: "bg-slate-100 text-slate-600 ring-slate-200",
};

function TicketBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ring-1 ring-inset ${
        STATUS_CLASSES[status] ?? STATUS_CLASSES.closed
      }`}
    >
      {status}
    </span>
  );
}

function errText(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [filter, setFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [reply, setReply] = useState("");
  const [replyStatus, setReplyStatus] = useState("replied");
  const [replyBusy, setReplyBusy] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [replyOk, setReplyOk] = useState<string | null>(null);

  const load = useCallback(async (status: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<SupportTicket[]>(
        status ? `/admin/support?status=${status}` : "/admin/support",
      );
      setTickets(data);
    } catch (err) {
      setError(errText(err, "Could not load support tickets."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load("");
  }, [load]);

  const selected = tickets.find((t) => t.id === selectedId) ?? null;

  function openTicket(t: SupportTicket) {
    setSelectedId(t.id);
    setReply("");
    setReplyStatus("replied");
    setReplyError(null);
    setReplyOk(null);
  }

  async function sendReply() {
    if (!selected || !reply.trim()) return;
    setReplyBusy(true);
    setReplyError(null);
    setReplyOk(null);
    try {
      const updated = await api.post<SupportTicket>(
        `/admin/support/${selected.id}/reply`,
        { admin_reply: reply.trim(), status: replyStatus },
      );
      setTickets((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t)),
      );
      setReply("");
      setReplyOk("Reply sent. The customer is notified in the app.");
    } catch (err) {
      setReplyError(errText(err, "Could not send the reply."));
    } finally {
      setReplyBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => {
              setFilter(f.value);
              void load(f.value);
            }}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ring-1 transition ${
              filter === f.value
                ? "bg-navy text-white ring-navy"
                : "bg-white text-slate-600 ring-slate-300 hover:ring-navy"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <ErrorBanner message={error} onRetry={() => load(filter)} />}

      {loading ? (
        <Spinner label="Loading tickets…" />
      ) : tickets.length === 0 ? (
        <EmptyState
          title="No support tickets"
          hint={
            filter
              ? `No tickets with status “${filter}”.`
              : "Customer support requests from the app will appear here."
          }
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-5">
          {/* Ticket list */}
          <div className="space-y-2 lg:col-span-2">
            {tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => openTicket(t)}
                className={`w-full rounded-2xl bg-white p-4 text-left shadow-sm ring-1 transition ${
                  selectedId === t.id
                    ? "ring-2 ring-brand-sky"
                    : "ring-slate-200 hover:ring-navy"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-slate-900">{t.subject}</p>
                  <TicketBadge status={t.status} />
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                  {t.message}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  {t.customer
                    ? `${t.customer.name ?? "Customer"} · ${t.customer.mobile}`
                    : "Customer"}
                  {" · "}
                  {formatDateTime(t.created_at)}
                </p>
              </button>
            ))}
          </div>

          {/* Ticket detail + reply */}
          <div className="lg:col-span-3">
            {selected ? (
              <Card title="Ticket Details">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-base font-bold text-slate-900">
                    {selected.subject}
                  </h3>
                  <TicketBadge status={selected.status} />
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {selected.customer
                    ? `${selected.customer.name ?? "Customer"} · ${selected.customer.mobile}`
                    : ""}
                  {" · "}
                  {formatDateTime(selected.created_at)}
                  {selected.order_id && (
                    <>
                      {" · "}
                      <Link
                        href={`/orders/${selected.order_id}`}
                        className="font-semibold text-navy underline underline-offset-2"
                      >
                        View related order →
                      </Link>
                    </>
                  )}
                </p>

                <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-800 ring-1 ring-slate-200">
                  {selected.message}
                </div>

                {selected.admin_reply && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Current reply on record
                    </p>
                    <div className="mt-1 rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-sky-950 ring-1 ring-sky-100">
                      {selected.admin_reply}
                    </div>
                  </div>
                )}

                {replyError && (
                  <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
                    {replyError}
                  </div>
                )}
                {replyOk && (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                    {replyOk}
                  </div>
                )}

                <label className="mt-4 block text-sm font-semibold text-slate-700">
                  Reply to customer
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    maxLength={2000}
                    rows={4}
                    placeholder="Type your reply…"
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-sky focus:ring-2 focus:ring-brand-sky/40"
                  />
                </label>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <select
                    value={replyStatus}
                    onChange={(e) => setReplyStatus(e.target.value)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-sky"
                  >
                    <option value="replied">Mark as Replied</option>
                    <option value="closed">Mark as Closed</option>
                    <option value="open">Keep Open</option>
                  </select>
                  <button
                    onClick={sendReply}
                    disabled={replyBusy || !reply.trim()}
                    className="rounded-xl bg-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {replyBusy ? "Sending…" : "Send Reply"}
                  </button>
                </div>
              </Card>
            ) : (
              <EmptyState
                title="Select a ticket"
                hint="Click a ticket on the left to read it and reply."
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

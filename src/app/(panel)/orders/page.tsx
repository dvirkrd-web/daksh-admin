"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { OrderListItem, Paginated } from "@/lib/types";
import { formatDateTime, formatINR } from "@/lib/format";
import { FILTER_STATUSES, statusLabel } from "@/lib/status";
import { EmptyState, ErrorBanner, Pagination, Spinner, StatusBadge } from "@/components/ui";

const LIMIT = 20;

export default function OrdersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Paginated<OrderListItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(
    async (q: string, st: string, pg: number) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(pg),
          limit: String(LIMIT),
        });
        if (q.trim()) params.set("search", q.trim());
        if (st) params.set("status", st);
        const res = await api.get<Paginated<OrderListItem>>(
          `/admin/orders?${params.toString()}`,
        );
        setResult(res);
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Could not load orders.",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load("", "", 1);
  }, [load]);

  function onSearchChange(value: string) {
    setSearch(value);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      setPage(1);
      void load(value, status, 1);
    }, 400);
  }

  function onStatusChange(value: string) {
    setStatus(value);
    setPage(1);
    void load(search, value, 1);
  }

  function onPage(pg: number) {
    setPage(pg);
    void load(search, status, pg);
  }

  const chip = (value: string, label: string) => (
    <button
      key={value || "all"}
      onClick={() => onStatusChange(value)}
      className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold ring-1 transition ${
        status === value
          ? "bg-navy text-white ring-navy"
          : "bg-white text-slate-600 ring-slate-300 hover:ring-navy"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by order no, customer name or mobile…"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-sky focus:ring-2 focus:ring-brand-sky/40 sm:max-w-md"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {chip("", "All Orders")}
        {FILTER_STATUSES.map((s) => chip(s, statusLabel(s)))}
      </div>

      {error && <ErrorBanner message={error} onRetry={() => load(search, status, page)} />}

      {loading ? (
        <Spinner label="Loading orders…" />
      ) : result && result.data.length === 0 ? (
        <EmptyState
          title="No orders found"
          hint={
            search || status
              ? "Try a different search or status filter."
              : "Orders placed from the customer app will appear here."
          }
        />
      ) : result ? (
        <div className="rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200 sm:p-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3 font-semibold">Order</th>
                  <th className="py-2 pr-3 font-semibold">Customer</th>
                  <th className="py-2 pr-3 font-semibold">Items</th>
                  <th className="py-2 pr-3 font-semibold">Total</th>
                  <th className="py-2 pr-3 font-semibold">Status</th>
                  <th className="py-2 font-semibold">Placed</th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => router.push(`/orders/${o.id}`)}
                    className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-sky-50"
                  >
                    <td className="py-3 pr-3 font-semibold text-navy">
                      {o.order_no}
                    </td>
                    <td className="py-3 pr-3">
                      {o.customer ? (
                        <>
                          <span className="font-medium text-slate-800">
                            {o.customer.name ?? "—"}
                          </span>
                          <br />
                          <span className="text-xs text-slate-500">
                            {o.customer.mobile}
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 pr-3">{o.item_count}</td>
                    <td className="py-3 pr-3 font-semibold">
                      {formatINR(o.total_paise)}
                    </td>
                    <td className="py-3 pr-3">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="py-3 text-slate-500">
                      {formatDateTime(o.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={result.page}
            total={result.total}
            limit={result.limit}
            onPage={onPage}
          />
        </div>
      ) : null}
    </div>
  );
}

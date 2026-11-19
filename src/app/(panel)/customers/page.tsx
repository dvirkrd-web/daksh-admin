"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { CustomerListItem, Paginated } from "@/lib/types";
import { formatDate, formatINR } from "@/lib/format";
import { EmptyState, ErrorBanner, Pagination, Spinner } from "@/components/ui";

const LIMIT = 20;

export default function CustomersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Paginated<CustomerListItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (q: string, pg: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(pg),
        limit: String(LIMIT),
      });
      if (q.trim()) params.set("search", q.trim());
      const res = await api.get<Paginated<CustomerListItem>>(
        `/admin/customers?${params.toString()}`,
      );
      setResult(res);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not load customers.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load("", 1);
  }, [load]);

  function onSearchChange(value: string) {
    setSearch(value);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      setPage(1);
      void load(value, 1);
    }, 400);
  }

  function onPage(pg: number) {
    setPage(pg);
    void load(search, pg);
  }

  return (
    <div className="space-y-4">
      <input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search by name, mobile or email…"
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-sky focus:ring-2 focus:ring-brand-sky/40 sm:max-w-md"
      />

      {error && (
        <ErrorBanner message={error} onRetry={() => load(search, page)} />
      )}

      {loading ? (
        <Spinner label="Loading customers…" />
      ) : result && result.data.length === 0 ? (
        <EmptyState
          title="No customers found"
          hint={
            search
              ? "Try a different search."
              : "Customers who sign up in the app will appear here."
          }
        />
      ) : result ? (
        <div className="rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200 sm:p-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3 font-semibold">Customer</th>
                  <th className="py-2 pr-3 font-semibold">Contact</th>
                  <th className="py-2 pr-3 font-semibold">Orders</th>
                  <th className="py-2 pr-3 font-semibold">Total Spent</th>
                  <th className="py-2 pr-3 font-semibold">Status</th>
                  <th className="py-2 font-semibold">Joined</th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/customers/${c.id}`)}
                    className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-sky-50"
                  >
                    <td className="py-3 pr-3 font-semibold text-navy">
                      {c.name ?? "—"}
                    </td>
                    <td className="py-3 pr-3">
                      <span className="text-slate-800">{c.mobile}</span>
                      {c.email && (
                        <>
                          <br />
                          <span className="text-xs text-slate-500">
                            {c.email}
                          </span>
                        </>
                      )}
                    </td>
                    <td className="py-3 pr-3">{c.order_count}</td>
                    <td className="py-3 pr-3 font-semibold">
                      {formatINR(c.total_spent_paise)}
                    </td>
                    <td className="py-3 pr-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset ${
                          c.is_active
                            ? "bg-emerald-100 text-emerald-800 ring-emerald-200"
                            : "bg-slate-100 text-slate-600 ring-slate-200"
                        }`}
                      >
                        {c.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3 text-slate-500">
                      {formatDate(c.created_at)}
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

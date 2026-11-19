"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { CustomerDetail } from "@/lib/types";
import { formatDate, formatDateTime, formatINR } from "@/lib/format";
import { Card, EmptyState, ErrorBanner, Spinner, StatusBadge } from "@/components/ui";

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<CustomerDetail>(
        `/admin/customers/${params.id}`,
      );
      setCustomer(data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not load this customer.",
      );
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <Spinner label="Loading customer…" />;
  if (error) return <ErrorBanner message={error} onRetry={load} />;
  if (!customer) return null;

  const totalSpent = customer.orders.reduce((s, o) => s + o.total_paise, 0);

  return (
    <div className="space-y-5">
      <Link
        href="/customers"
        className="text-sm font-semibold text-navy underline underline-offset-2"
      >
        ← All customers
      </Link>

      <Card title="Customer Details">
        <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Name
            </dt>
            <dd className="mt-0.5 font-semibold text-slate-900">
              {customer.name ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Mobile
            </dt>
            <dd className="mt-0.5 font-semibold text-slate-900">
              {customer.mobile}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Email
            </dt>
            <dd className="mt-0.5 text-slate-700">{customer.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Status
            </dt>
            <dd className="mt-0.5">
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset ${
                  customer.is_active
                    ? "bg-emerald-100 text-emerald-800 ring-emerald-200"
                    : "bg-slate-100 text-slate-600 ring-slate-200"
                }`}
              >
                {customer.is_active ? "Active" : "Inactive"}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Joined
            </dt>
            <dd className="mt-0.5 text-slate-700">
              {formatDate(customer.created_at)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Last login
            </dt>
            <dd className="mt-0.5 text-slate-700">
              {formatDateTime(customer.last_login_at)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Orders (listed below)
            </dt>
            <dd className="mt-0.5 font-semibold text-slate-900">
              {customer.orders.length} · {formatINR(totalSpent)} total
            </dd>
          </div>
        </dl>
      </Card>

      <Card title="Order History">
        {customer.orders.length === 0 ? (
          <EmptyState title="No orders yet" hint="This customer has not placed a paid order." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3 font-semibold">Order</th>
                  <th className="py-2 pr-3 font-semibold">Items</th>
                  <th className="py-2 pr-3 font-semibold">Total</th>
                  <th className="py-2 pr-3 font-semibold">Status</th>
                  <th className="py-2 font-semibold">Placed</th>
                </tr>
              </thead>
              <tbody>
                {customer.orders.map((o) => (
                  <tr
                    key={o.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    <td className="py-2.5 pr-3">
                      <Link
                        href={`/orders/${o.id}`}
                        className="font-semibold text-navy underline-offset-2 hover:underline"
                      >
                        {o.order_no}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-3">{o.item_count}</td>
                    <td className="py-2.5 pr-3 font-semibold">
                      {formatINR(o.total_paise)}
                    </td>
                    <td className="py-2.5 pr-3">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="py-2.5 text-slate-500">
                      {formatDateTime(o.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { DashboardStats, OrderListItem, Paginated } from "@/lib/types";
import { formatDateTime, formatINR, formatNumber } from "@/lib/format";
import { Card, EmptyState, ErrorBanner, Spinner, StatCard, StatusBadge } from "@/components/ui";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recent, setRecent] = useState<OrderListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dash, orders] = await Promise.all([
        api.get<DashboardStats>("/admin/dashboard"),
        api.get<Paginated<OrderListItem>>("/admin/orders?limit=8&page=1"),
      ]);
      setStats(dash);
      setRecent(orders.data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not load the dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <Spinner label="Loading dashboard…" />;
  if (error) return <ErrorBanner message={error} onRetry={load} />;
  if (!stats) return <EmptyState title="No data" />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Sales"
          value={formatINR(stats.total_sales_paise)}
          sub={`Today ${formatINR(stats.sales_today_paise)} · This month ${formatINR(stats.sales_month_paise)}`}
          accent
        />
        <StatCard
          label="Total Orders"
          value={formatNumber(stats.total_orders)}
          sub="Excludes unpaid drafts"
        />
        <StatCard
          label="New Orders"
          value={formatNumber(stats.new_orders)}
          sub="Status: Order Received"
        />
        <StatCard
          label="Pending Orders"
          value={formatNumber(stats.pending_orders)}
          sub="Received + Verification"
        />
        <StatCard
          label="Printing"
          value={formatNumber(stats.printing_orders)}
        />
        <StatCard
          label="Shipped"
          value={formatNumber(stats.shipped_orders)}
          sub={`Out for delivery: ${formatNumber(stats.counts_by_status["out_for_delivery"] ?? 0)}`}
        />
        <StatCard
          label="Delivered"
          value={formatNumber(stats.delivered_orders)}
          sub={`Packed, waiting to ship: ${formatNumber(stats.counts_by_status["packed"] ?? 0)}`}
        />
        <StatCard
          label="Delivery Collected"
          value={formatINR(stats.delivery_collected_paise)}
          sub={`Cancelled orders: ${formatNumber(stats.counts_by_status["cancelled"] ?? 0)}`}
        />
      </div>

      <Card
        title="Recent Orders"
        action={
          <Link
            href="/orders"
            className="text-sm font-semibold text-navy underline underline-offset-2"
          >
            View all orders →
          </Link>
        }
      >
        {recent.length === 0 ? (
          <EmptyState
            title="No orders yet"
            hint="Orders placed from the customer app will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
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
                {recent.map((o) => (
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
                    <td className="py-2.5 pr-3">
                      {o.customer ? (
                        <>
                          <span className="font-medium text-slate-800">
                            {o.customer.name ?? "—"}
                          </span>{" "}
                          <span className="text-slate-500">
                            {o.customer.mobile}
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
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

"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { SalesReport } from "@/lib/types";
import { formatDayKey, formatINR, formatMonthKey, formatNumber } from "@/lib/format";
import { Card, EmptyState, ErrorBanner, Spinner, StatCard } from "@/components/ui";

function BarRow({
  label,
  orders,
  salesPaise,
  maxPaise,
}: {
  label: string;
  orders: number;
  salesPaise: number;
  maxPaise: number;
}) {
  const pct = maxPaise > 0 ? Math.max(2, (salesPaise / maxPaise) * 100) : 0;
  return (
    <div className="grid grid-cols-[110px_1fr_auto] items-center gap-3 py-1.5 text-sm">
      <span className="text-slate-600">{label}</span>
      <span className="h-5 overflow-hidden rounded-md bg-slate-100">
        <span
          className="block h-full rounded-md bg-gradient-to-r from-navy to-brand-sky"
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="whitespace-nowrap text-right font-semibold text-slate-900">
        {formatINR(salesPaise)}
        <span className="ml-2 text-xs font-medium text-slate-500">
          {orders} order{orders === 1 ? "" : "s"}
        </span>
      </span>
    </div>
  );
}

export default function ReportsPage() {
  const [report, setReport] = useState<SalesReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<SalesReport>("/admin/reports/sales");
      setReport(data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not load reports.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <Spinner label="Loading reports…" />;
  if (error) return <ErrorBanner message={error} onRetry={load} />;
  if (!report) return null;

  const pe = report.profit_estimate;
  const dailyMax = Math.max(0, ...report.daily.map((d) => d.sales_paise));
  const monthlyMax = Math.max(0, ...report.monthly.map((m) => m.sales_paise));
  const productMax = Math.max(
    0,
    ...report.product_wise.map((p) => p.sales_paise),
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Sales (all time)"
          value={formatINR(pe.sales_paise)}
          accent
        />
        <StatCard
          label="Delivery Collected"
          value={formatINR(report.delivery_collected_paise)}
        />
        <StatCard
          label="Orders — last 30 days"
          value={formatNumber(
            report.daily.reduce((s, d) => s + d.orders, 0),
          )}
        />
        <StatCard
          label="Estimated Profit"
          value={formatINR(pe.estimated_profit_paise)}
          sub="Estimate — see breakdown below"
        />
      </div>

      <Card title="Daily Sales — Last 30 Days">
        {report.daily.length === 0 ? (
          <EmptyState title="No sales in the last 30 days" />
        ) : (
          <div>
            {report.daily.map((d) => (
              <BarRow
                key={d.day}
                label={formatDayKey(d.day)}
                orders={d.orders}
                salesPaise={d.sales_paise}
                maxPaise={dailyMax}
              />
            ))}
          </div>
        )}
      </Card>

      <Card title="Monthly Sales — Last 12 Months">
        {report.monthly.length === 0 ? (
          <EmptyState title="No monthly sales yet" />
        ) : (
          <div>
            {report.monthly.map((m) => (
              <BarRow
                key={m.month}
                label={formatMonthKey(m.month)}
                orders={m.orders}
                salesPaise={m.sales_paise}
                maxPaise={monthlyMax}
              />
            ))}
            <p className="mt-3 text-xs text-slate-400">
              Total orders in this 12-month window:{" "}
              {formatNumber(report.monthly.reduce((s, m) => s + m.orders, 0))}
            </p>
          </div>
        )}
      </Card>

      <Card title="Product-wise Sales (all time)">
        {report.product_wise.length === 0 ? (
          <EmptyState title="No product sales yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3 font-semibold">Product</th>
                  <th className="py-2 pr-3 font-semibold">Qty Sold</th>
                  <th className="py-2 pr-3 font-semibold">Share</th>
                  <th className="py-2 font-semibold">Sales</th>
                </tr>
              </thead>
              <tbody>
                {report.product_wise.map((p) => (
                  <tr
                    key={p.product_id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="py-2.5 pr-3 font-medium text-slate-800">
                      {p.product_name}
                    </td>
                    <td className="py-2.5 pr-3">{formatNumber(p.qty)}</td>
                    <td className="py-2.5 pr-3">
                      <span className="block h-4 w-40 overflow-hidden rounded bg-slate-100">
                        <span
                          className="block h-full bg-brand-sky"
                          style={{
                            width: `${
                              productMax > 0
                                ? Math.max(2, (p.sales_paise / productMax) * 100)
                                : 0
                            }%`,
                          }}
                        />
                      </span>
                    </td>
                    <td className="py-2.5 font-semibold">
                      {formatINR(p.sales_paise)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Payment Report">
          {report.payments.length === 0 ? (
            <EmptyState title="No payments recorded yet" />
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3 font-semibold">Status</th>
                  <th className="py-2 pr-3 font-semibold">Method</th>
                  <th className="py-2 pr-3 font-semibold">Count</th>
                  <th className="py-2 font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {report.payments.map((p, i) => (
                  <tr
                    key={`${p.status}-${p.method}-${i}`}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="py-2.5 pr-3 capitalize">{p.status}</td>
                    <td className="py-2.5 pr-3 capitalize">{p.method}</td>
                    <td className="py-2.5 pr-3">{p.count}</td>
                    <td className="py-2.5 font-semibold">
                      {formatINR(p.amount_paise)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="Profit Estimate">
          <span className="mb-3 inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 ring-1 ring-inset ring-amber-200">
            ESTIMATE
          </span>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Sales</dt>
              <dd className="font-medium">{formatINR(pe.sales_paise)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">− Delivery collected</dt>
              <dd className="font-medium">{formatINR(pe.delivery_paise)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">
                − Payment gateway fee (estimate)
              </dt>
              <dd className="font-medium">
                {formatINR(pe.gateway_fee_estimate_paise)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
              <dt>Estimated profit</dt>
              <dd>{formatINR(pe.estimated_profit_paise)}</dd>
            </div>
          </dl>
          <p className="mt-3 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs leading-relaxed text-amber-900 ring-1 ring-amber-100">
            {pe.note}
          </p>
        </Card>
      </div>
    </div>
  );
}

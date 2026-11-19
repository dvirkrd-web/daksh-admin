"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Product, ProductPayload } from "@/lib/types";
import { formatINR, paiseToRupeesInput, rupeesToPaise } from "@/lib/format";
import { CATEGORIES, categoryLabel } from "@/lib/status";
import { Card, EmptyState, ErrorBanner, Spinner } from "@/components/ui";

interface PriceRow {
  option_label: string;
  price: string; // rupees, as typed
  delivery: string; // rupees, as typed
  min_qty: string;
}

interface FormState {
  name: string;
  slug: string;
  description: string;
  image_url: string;
  category: string;
  sort_order: string;
  is_active: boolean;
  prices: PriceRow[];
}

const emptyForm = (): FormState => ({
  name: "",
  slug: "",
  description: "",
  image_url: "",
  category: "pvc_card",
  sort_order: "0",
  is_active: true,
  prices: [{ option_label: "", price: "", delivery: "0", min_qty: "1" }],
});

function errText(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // editingId: null = form closed, "new" = creating, otherwise product id.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Product[]>("/admin/products");
      setProducts(data);
    } catch (err) {
      setError(errText(err, "Could not load products."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setForm(emptyForm());
    setFormError(null);
    setEditingId("new");
  }

  function openEdit(p: Product) {
    setForm({
      name: p.name,
      slug: p.slug,
      description: p.description ?? "",
      image_url: p.image_url ?? "",
      category: p.category,
      sort_order: String(p.sort_order ?? 0),
      is_active: p.is_active,
      prices:
        p.prices.length > 0
          ? p.prices.map((pr) => ({
              option_label: pr.option_label,
              price: paiseToRupeesInput(pr.price_paise),
              delivery: paiseToRupeesInput(pr.delivery_charge_paise),
              min_qty: String(pr.min_qty ?? 1),
            }))
          : [{ option_label: "", price: "", delivery: "0", min_qty: "1" }],
    });
    setFormError(null);
    setEditingId(p.id);
  }

  function setPriceRow(i: number, patch: Partial<PriceRow>) {
    setForm((f) => ({
      ...f,
      prices: f.prices.map((row, idx) => (idx === i ? { ...row, ...patch } : row)),
    }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (form.name.trim().length < 2) {
      setFormError("Product name must be at least 2 characters.");
      return;
    }
    const prices: ProductPayload["prices"] = [];
    for (const row of form.prices) {
      if (!row.option_label.trim()) {
        setFormError("Every price option needs a label (e.g. “Single Side”).");
        return;
      }
      prices.push({
        option_label: row.option_label.trim(),
        price_paise: rupeesToPaise(row.price),
        delivery_charge_paise: rupeesToPaise(row.delivery),
        min_qty: Math.max(1, parseInt(row.min_qty, 10) || 1),
      });
    }

    const payload: ProductPayload = {
      name: form.name.trim(),
      category: form.category,
      description: form.description.trim(),
      image_url: form.image_url.trim(),
      sort_order: parseInt(form.sort_order, 10) || 0,
      is_active: form.is_active,
      prices,
    };
    if (form.slug.trim()) payload.slug = form.slug.trim();

    setSaving(true);
    try {
      if (editingId === "new") {
        await api.post<Product>("/admin/products", payload);
      } else {
        // Note: on PATCH the backend replaces the whole price set with
        // the rows below — old orders keep their copied prices.
        await api.patch<Product>(`/admin/products/${editingId}`, payload);
      }
      setEditingId(null);
      await load();
    } catch (err) {
      setFormError(errText(err, "Could not save the product."));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(p: Product) {
    setTogglingId(p.id);
    setError(null);
    try {
      if (p.is_active) {
        // DELETE deactivates on the backend (products are never hard-deleted).
        if (
          !window.confirm(
            `Deactivate “${p.name}”? It will disappear from the customer app. Past orders are not affected.`,
          )
        ) {
          return;
        }
        await api.delete<Product>(`/admin/products/${p.id}`);
      } else {
        await api.patch<Product>(`/admin/products/${p.id}`, {
          is_active: true,
        });
      }
      await load();
    } catch (err) {
      setError(errText(err, "Could not change the product status."));
    } finally {
      setTogglingId(null);
    }
  }

  const inputCls =
    "mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-sky focus:ring-2 focus:ring-brand-sky/40";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {products.length} product{products.length === 1 ? "" : "s"} ·
          prices here are what the customer app charges.
        </p>
        <button
          onClick={openCreate}
          className="rounded-xl bg-navy px-4 py-2.5 text-sm font-bold text-white hover:bg-navy-deep"
        >
          + Add Product
        </button>
      </div>

      {error && <ErrorBanner message={error} onRetry={load} />}

      {editingId !== null && (
        <Card title={editingId === "new" ? "Add Product" : "Edit Product"}>
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            {formError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 sm:col-span-2">
                {formError}
              </div>
            )}
            <label className="block text-sm font-semibold text-slate-700">
              Name *
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputCls}
                placeholder="PVC Photo ID Card Printing"
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Category *
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className={inputCls}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {categoryLabel(c)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Slug (optional — auto from name)
              <input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className={inputCls}
                placeholder="pvc-photo-id-card"
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Image URL
              <input
                value={form.image_url}
                onChange={(e) =>
                  setForm({ ...form, image_url: e.target.value })
                }
                className={inputCls}
                placeholder="https://…"
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
              Description
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={3}
                className={inputCls}
                placeholder="What the customer gets, paper/quality details, delivery info…"
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Sort order
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) =>
                  setForm({ ...form, sort_order: e.target.value })
                }
                className={inputCls}
              />
            </label>
            <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) =>
                  setForm({ ...form, is_active: e.target.checked })
                }
                className="h-4 w-4 accent-[#0a2a5e]"
              />
              Active (visible in the app)
            </label>

            <div className="sm:col-span-2">
              <p className="text-sm font-semibold text-slate-700">
                Price options (₹)
              </p>
              <div className="mt-2 space-y-2">
                {form.prices.map((row, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200 sm:grid-cols-[1fr_110px_130px_90px_36px]"
                  >
                    <input
                      value={row.option_label}
                      onChange={(e) =>
                        setPriceRow(i, { option_label: e.target.value })
                      }
                      placeholder="Option label — e.g. Front + Back"
                      className="col-span-2 rounded-lg border border-slate-300 px-2.5 py-2 text-sm outline-none focus:border-brand-sky sm:col-span-1"
                    />
                    <input
                      value={row.price}
                      onChange={(e) => setPriceRow(i, { price: e.target.value })}
                      inputMode="decimal"
                      placeholder="Price ₹"
                      className="rounded-lg border border-slate-300 px-2.5 py-2 text-sm outline-none focus:border-brand-sky"
                    />
                    <input
                      value={row.delivery}
                      onChange={(e) =>
                        setPriceRow(i, { delivery: e.target.value })
                      }
                      inputMode="decimal"
                      placeholder="Delivery ₹"
                      className="rounded-lg border border-slate-300 px-2.5 py-2 text-sm outline-none focus:border-brand-sky"
                    />
                    <input
                      value={row.min_qty}
                      onChange={(e) =>
                        setPriceRow(i, { min_qty: e.target.value })
                      }
                      inputMode="numeric"
                      placeholder="Min qty"
                      className="rounded-lg border border-slate-300 px-2.5 py-2 text-sm outline-none focus:border-brand-sky"
                    />
                    <button
                      type="button"
                      disabled={form.prices.length <= 1}
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          prices: f.prices.filter((_, idx) => idx !== i),
                        }))
                      }
                      className="rounded-lg bg-white px-2 text-slate-500 ring-1 ring-slate-300 disabled:opacity-40"
                      title="Remove option"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    prices: [
                      ...f.prices,
                      { option_label: "", price: "", delivery: "0", min_qty: "1" },
                    ],
                  }))
                }
                className="mt-2 text-sm font-semibold text-navy underline underline-offset-2"
              >
                + Add price option
              </button>
            </div>

            <div className="flex gap-2 sm:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Saving…"
                  : editingId === "new"
                    ? "Create Product"
                    : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 ring-1 ring-slate-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <Spinner label="Loading products…" />
      ) : products.length === 0 ? (
        <EmptyState
          title="No products yet"
          hint="Add your first printing service with the button above."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {products.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
            >
              <div className="flex gap-4">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.image_url}
                    alt={p.name}
                    className="h-20 w-20 shrink-0 rounded-xl object-cover ring-1 ring-slate-200"
                  />
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-3xl ring-1 ring-sky-100">
                    🖨️
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-slate-900">{p.name}</h3>
                    <span
                      className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset ${
                        p.is_active
                          ? "bg-emerald-100 text-emerald-800 ring-emerald-200"
                          : "bg-slate-100 text-slate-600 ring-slate-200"
                      }`}
                    >
                      {p.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-500">
                    {categoryLabel(p.category)} · /{p.slug}
                  </p>
                  {p.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                      {p.description}
                    </p>
                  )}
                </div>
              </div>

              {p.prices.length > 0 ? (
                <ul className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
                  {p.prices.map((pr) => (
                    <li
                      key={pr.id}
                      className="flex flex-wrap justify-between gap-2"
                    >
                      <span className="text-slate-700">{pr.option_label}</span>
                      <span className="font-semibold text-slate-900">
                        {formatINR(pr.price_paise)}
                        <span className="ml-2 text-xs font-medium text-slate-500">
                          + {formatINR(pr.delivery_charge_paise)} delivery ·
                          min {pr.min_qty}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 border-t border-slate-100 pt-3 text-sm text-amber-700">
                  No price options — add at least one so customers can order.
                </p>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => openEdit(p)}
                  className="rounded-lg bg-navy px-3.5 py-2 text-xs font-bold text-white hover:bg-navy-deep"
                >
                  Edit
                </button>
                <button
                  onClick={() => toggleActive(p)}
                  disabled={togglingId === p.id}
                  className={`rounded-lg px-3.5 py-2 text-xs font-bold ring-1 disabled:opacity-50 ${
                    p.is_active
                      ? "bg-white text-rose-700 ring-rose-200 hover:bg-rose-50"
                      : "bg-white text-emerald-700 ring-emerald-200 hover:bg-emerald-50"
                  }`}
                >
                  {togglingId === p.id
                    ? "Working…"
                    : p.is_active
                      ? "Deactivate"
                      : "Activate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

# DAKSH ONLINE PRINTING — Admin Web Dashboard (Phase 4)

**PRINT • PACK • DELIVER** · Navy Blue `#0A2A5E` + White + Sky Blue `#38BDF8`

The admin panel for the DAKSH ONLINE PRINTING business. The owner receives
orders here, downloads the customer's uploaded files, prints them manually
on a local printer, packs, and dispatches. There is **no automatic
printing** — this dashboard is the control panel, the printing is done by
the owner.

Built with Next.js (App Router) + TypeScript + Tailwind CSS. It is a thin
client over the Phase 3 backend API — it contains **no secrets** and no
business data of its own. The only credential it holds is the admin JWT
returned at login, kept in the browser's localStorage.

## Pages

| Route | What it does |
|---|---|
| `/login` | Email + password → `POST /admin/auth/login`. Shows the backend's real error (e.g. "Invalid email or password."). |
| `/dashboard` | Stat cards from `GET /admin/dashboard` (total/new/pending/printing/shipped/delivered orders, total sales, sales today/month, delivery collected) + recent orders. |
| `/orders` | All orders: search (order no / customer name / mobile), status filter chips, pagination. Click a row for details. |
| `/orders/[id]` | Full details: customer + delivery address, items with options, uploaded files with **time-limited signed download links**, payment records with the backend's signature-verified flag, price breakup, status history, internal notes, status update (only the transitions the backend allows), and **Create Shipment & Generate AWB**. |
| `/products` | Product list with price options. Add/edit products (name, description, category, image URL, price options with label + price + delivery charge + min qty). Deactivate via DELETE (the backend deactivates, never hard-deletes); reactivate from the same screen. |
| `/customers` | Customer list with order counts and total spent; click through for a customer detail with full order history. |
| `/reports` | From `GET /admin/reports/sales`: daily sales (30 days), monthly sales (12 months), product-wise sales, delivery charges collected, payment report, and the profit **estimate** (labelled an estimate, with the backend's own explanation — printing/material costs are not tracked, so it is not true profit). |
| `/support` | Support tickets from the app: read, reply (`POST /admin/support/:id/reply`), set status open/replied/closed. |

## Run it

```bash
cd admin-dashboard
npm install
npm run dev        # http://localhost:3001 if 3000 is taken — Next prints the URL
npm run build      # production build check
npm run start      # serve the production build
```

> Note: the backend also defaults to port 3000. If the backend is already
> running on 3000, Next.js dev will offer port 3001 automatically — that is
> fine, the dashboard reaches the backend through the API URL below, not
> through its own port.

## Configuration

Copy `.env.example` to `.env.local` and set the backend API base URL:

```
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

That is the only setting. No API keys, passwords, or gateway secrets ever
belong in this project — Razorpay/Shiprocket/storage secrets live only in
the backend's `.env`.

## Admin account

Admins are **not** created from this dashboard. Create the owner account
from the backend once:

```bash
cd ../backend
npm run create-admin
```

Then log in here with that email + password.

## Requirements for live data

This dashboard shows **real data only** — there is no demo/fake data in any
page; empty screens are real empty states. For live data you need:

1. PostgreSQL running, with the backend migrations applied.
2. The Phase 3 backend running (`cd ../backend && npm run start:dev`) with
   its `.env` filled in.
3. At least one admin account (above).

Feature notes that depend on backend configuration:

- **File downloads** on the order page use the backend's time-limited
  signed URLs. If file storage is not configured on the backend, the
  backend returns `download_available: false` and the page shows
  "Download unavailable" with the reason instead of a dead button.
- **Create Shipment & Generate AWB** calls `POST /admin/orders/:id/ship`.
  Until Shiprocket is configured on the backend (Phase 6 —
  `SHIPROCKET_EMAIL` / `SHIPROCKET_PASSWORD` in the backend `.env`), the
  backend replies *"Shiprocket is not configured on the server…"* and the
  page displays that message exactly. AWB numbers are never invented here.
- **Status changes** follow the backend flow (received → verification →
  printing → packed → shipped → out for delivery → delivered; cancel is
  possible until shipped). The page only offers the valid next steps, and
  if the backend still rejects a change, its explanation is shown as-is.

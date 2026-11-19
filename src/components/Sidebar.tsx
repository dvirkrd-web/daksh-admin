"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearSession, getAdmin } from "@/lib/api";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/orders", label: "Orders", icon: "🧾" },
  { href: "/products", label: "Products", icon: "🖨️" },
  { href: "/customers", label: "Customers", icon: "👥" },
  { href: "/reports", label: "Reports", icon: "📊" },
  { href: "/support", label: "Support", icon: "💬" },
];

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-sky text-xl shadow-sm">
        🖨️
      </div>
      {!compact && (
        <div className="leading-tight">
          <p className="text-[15px] font-extrabold tracking-wide text-white">
            DAKSH
          </p>
          <p className="text-[10px] font-semibold tracking-[0.18em] text-brand-sky">
            ONLINE PRINTING
          </p>
        </div>
      )}
    </div>
  );
}

export default function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const admin = getAdmin();

  function logout() {
    clearSession();
    router.replace("/login");
  }

  const content = (
    <div className="flex h-full flex-col bg-navy">
      <div className="flex items-center justify-between px-5 pb-2 pt-6">
        <Logo />
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-slate-300 hover:bg-white/10 md:hidden"
          aria-label="Close menu"
        >
          ✕
        </button>
      </div>
      <p className="px-5 pb-6 text-[10px] font-medium tracking-[0.22em] text-slate-400">
        PRINT • PACK • DELIVER
      </p>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                active
                  ? "bg-brand-sky text-navy-deep"
                  : "text-slate-200 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-5 py-4">
        {admin && (
          <div className="mb-3 leading-tight">
            <p className="truncate text-sm font-semibold text-white">
              {admin.name}
            </p>
            <p className="truncate text-xs text-slate-400">{admin.email}</p>
            <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-brand-sky">
              {admin.role}
            </p>
          </div>
        )}
        <button
          onClick={logout}
          className="w-full rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
        >
          Log out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop: fixed sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 md:block">
        {content}
      </aside>
      {/* Mobile: slide-over */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-navy-deep/60"
            onClick={onClose}
          />
          <aside className="absolute inset-y-0 left-0 w-64 shadow-xl">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}

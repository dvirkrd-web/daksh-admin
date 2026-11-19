"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getToken } from "@/lib/api";
import Sidebar, { Logo } from "@/components/Sidebar";
import { Spinner } from "@/components/ui";

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/orders": "Orders",
  "/products": "Products",
  "/customers": "Customers",
  "/reports": "Reports",
  "/support": "Support",
};

/** Protected shell: without an admin JWT there is nothing to show. */
export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
    } else {
      setReady(true);
    }
  }, [router]);

  const title =
    Object.entries(TITLES).find(
      ([href]) => pathname === href || pathname.startsWith(`${href}/`),
    )?.[1] ?? "Admin";

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Spinner />
      </main>
    );
  }

  return (
    <div className="min-h-screen">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center gap-3 bg-navy px-4 py-3 md:hidden">
        <button
          onClick={() => setMenuOpen(true)}
          className="rounded-lg p-1.5 text-white hover:bg-white/10"
          aria-label="Open menu"
        >
          ☰
        </button>
        <Logo compact />
        <span className="text-sm font-bold text-white">{title}</span>
      </header>

      <div className="md:pl-64">
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="mb-5 hidden text-2xl font-extrabold text-slate-900 md:block">
            {title}
          </h1>
          {children}
        </main>
      </div>
    </div>
  );
}

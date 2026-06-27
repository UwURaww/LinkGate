"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/admin", label: "Gates" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <aside
      style={{
        width: 200,
        borderRight: "1px solid var(--border)",
        padding: "1.5rem 1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.25rem",
      }}
    >
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, padding: "0 0.6rem 1.5rem" }}>
        Checkpoint
      </div>
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            style={{
              padding: "0.55rem 0.6rem",
              borderRadius: 8,
              color: active ? "var(--text)" : "var(--text-muted)",
              background: active ? "var(--panel-2)" : "transparent",
              fontSize: "0.9rem",
            }}
          >
            {link.label}
          </Link>
        );
      })}
      <button
        onClick={handleLogout}
        className="btn btn-ghost"
        style={{ marginTop: "auto", justifyContent: "flex-start" }}
      >
        Sign out
      </button>
    </aside>
  );
}

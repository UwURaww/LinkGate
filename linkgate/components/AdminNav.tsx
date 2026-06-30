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
    <aside className="admin-nav">
      <div className="admin-nav-brand">Checkpoint</div>
      <div className="admin-nav-links">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`admin-nav-link ${active ? "active" : ""}`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
      <button onClick={handleLogout} className="btn btn-ghost admin-nav-logout">
        Sign out
      </button>
    </aside>
  );
}

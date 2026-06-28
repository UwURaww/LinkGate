import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, isValidSession } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = cookies().get(ADMIN_COOKIE)?.value;
  if (!isValidSession(session)) {
    redirect("/admin/login");
  }

  return (
    <div className="admin-shell">
      <AdminNav />
      <main className="admin-main">{children}</main>
    </div>
  );
}

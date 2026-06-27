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
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <AdminNav />
      <main style={{ flex: 1, padding: "2rem", maxWidth: 920 }}>{children}</main>
    </div>
  );
}

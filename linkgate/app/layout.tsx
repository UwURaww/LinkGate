import type { Metadata } from "next";
import "./globals.css";
import { readStore } from "@/lib/blob";

export async function generateMetadata(): Promise<Metadata> {
  const store = await readStore();
  const { siteName, faviconUrl } = store.settings;
  return {
    title: siteName || "Checkpoint",
    description: "Self-hosted link gate.",
    icons: faviconUrl ? { icon: faviconUrl } : undefined,
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

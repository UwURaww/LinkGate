"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import GateForm, { GateFormValue } from "@/components/GateForm";
import { QuickLink } from "@/lib/types";

export default function NewGatePage() {
  const router = useRouter();
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>([]);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setQuickLinks(d.settings?.quickLinks || []));
  }, []);

  async function handleSubmit(value: GateFormValue) {
    const res = await fetch("/api/gates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Couldn't create the gate.");
    router.push("/admin");
  }

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem", marginBottom: "1.5rem" }}>New gate</h1>
      <GateForm submitLabel="Create gate" quickLinks={quickLinks} onSubmit={handleSubmit} />
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import GateForm, { GateFormValue } from "@/components/GateForm";
import { Gate } from "@/lib/types";

export default function EditGatePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [gate, setGate] = useState<Gate | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/gates/${params.id}`)
      .then((r) => {
        if (r.status === 404) {
          setNotFound(true);
          return null;
        }
        return r.json();
      })
      .then((d) => d && setGate(d.gate));
  }, [params.id]);

  async function handleSubmit(value: GateFormValue) {
    const res = await fetch(`/api/gates/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Couldn't save the gate.");
    router.push("/admin");
  }

  if (notFound) return <p>That gate doesn&apos;t exist anymore.</p>;
  if (!gate) return <p>Loading...</p>;

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem", marginBottom: "1.5rem" }}>Edit gate</h1>
      <GateForm initial={gate} submitLabel="Save changes" onSubmit={handleSubmit} />
    </div>
  );
}

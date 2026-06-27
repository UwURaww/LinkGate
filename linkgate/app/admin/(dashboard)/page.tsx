"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Gate } from "@/lib/types";

export default function GatesPage() {
  const [gates, setGates] = useState<Gate[] | null>(null);
  const [origin, setOrigin] = useState("");
  const [copiedId, setCopiedId] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    fetch("/api/gates")
      .then((r) => r.json())
      .then((d) => setGates(d.gates || []));
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this gate? This can't be undone.")) return;
    await fetch(`/api/gates/${id}`, { method: "DELETE" });
    setGates((prev) => prev?.filter((g) => g.id !== id) || null);
  }

  function copyLink(gate: Gate) {
    navigator.clipboard.writeText(`${origin}/g/${gate.slug}`);
    setCopiedId(gate.id);
    setTimeout(() => setCopiedId(""), 1500);
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.4rem" }}>Gates</h1>
        <Link href="/admin/gates/new" className="btn btn-primary">+ New gate</Link>
      </div>

      {gates === null && <p>Loading...</p>}
      {gates && gates.length === 0 && (
        <div className="panel" style={{ padding: "2rem", textAlign: "center" }}>
          <p>No gates yet. Create one to get a shareable link.</p>
        </div>
      )}

      {gates?.map((gate) => (
        <div key={gate.id} className="panel" style={{ padding: "1.25rem", marginBottom: "0.85rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
          <div>
            <h3 style={{ fontSize: "1rem", marginBottom: "0.3rem" }}>{gate.title}</h3>
            <p className="mono" style={{ fontSize: "0.8rem" }}>/g/{gate.slug}</p>
            <p style={{ fontSize: "0.8rem", marginTop: "0.3rem" }}>
              {gate.stats.views} views · {gate.stats.completions} completions
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
            <button className="btn" onClick={() => copyLink(gate)}>
              {copiedId === gate.id ? "Copied" : "Copy link"}
            </button>
            <Link href={`/admin/gates/${gate.id}`} className="btn">Edit</Link>
            <button className="btn btn-danger" onClick={() => handleDelete(gate.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

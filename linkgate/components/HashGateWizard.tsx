"use client";

import { useEffect, useState } from "react";
import GateWizard from "./GateWizard";

export default function HashGateWizard() {
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    function readHash() {
      setSlug(window.location.hash.replace(/^#/, ""));
    }
    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, []);

  if (slug === null) return null;

  if (!slug) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#8b9099",
          padding: "1.5rem",
          textAlign: "center",
        }}
      >
        <p>This link is missing its checkpoint ID.</p>
      </div>
    );
  }

  return <GateWizard slug={slug} />;
}

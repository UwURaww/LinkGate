"use client";

import { useEffect, useState } from "react";
import GateWizard from "./GateWizard";

export default function HashGateWizard() {
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    setSlug(hash);

    if (hash) {
      // Drop the identifier from the visible address bar - from here on it
      // just shows the clean path, even though we already captured what we
      // need above. replaceState doesn't reload the page or fire
      // hashchange, so this is invisible to the visitor.
      window.history.replaceState(null, "", window.location.pathname);
    }
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

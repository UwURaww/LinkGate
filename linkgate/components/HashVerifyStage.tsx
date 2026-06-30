"use client";

import { useEffect, useState } from "react";
import VerifyStage from "./VerifyStage";

export default function HashVerifyStage() {
  const [bundle, setBundle] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    setBundle(hash);
    if (hash) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  if (bundle === null) return null;

  if (!bundle) {
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
        <p>This link is missing its verification details.</p>
      </div>
    );
  }

  return <VerifyStage bundle={bundle} />;
}

"use client";

import { useEffect, useRef } from "react";

export default function CustomScriptSlot({
  scriptUrl,
  scriptInline,
}: {
  scriptUrl?: string;
  scriptInline?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (scriptUrl) {
      const el = document.createElement("script");
      el.src = scriptUrl;
      el.async = true;
      container.appendChild(el);
      return () => {
        container.removeChild(el);
      };
    }

    if (scriptInline) {
      try {
        const fn = new Function(scriptInline);
        fn();
      } catch (err) {
        console.error("Custom monetization script threw an error:", err);
      }
    }
  }, [scriptUrl, scriptInline]);

  return <div ref={containerRef} data-monetization-slot />;
}

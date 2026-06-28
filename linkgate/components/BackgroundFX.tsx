"use client";

import { useEffect, useRef } from "react";
import { BackgroundTheme } from "@/lib/types";

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const full = clean.length === 3
    ? clean.split("").map((c) => c + c).join("")
    : clean.padEnd(6, "0").slice(0, 6);
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function Starfield({ color }: { color: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let raf = 0;
    let stars: { x: number; y: number; r: number; speed: number; twinkle: number }[] = [];

    function resize() {
      canvas!.width = canvas!.clientWidth;
      canvas!.height = canvas!.clientHeight;
      const count = Math.max(40, Math.floor((canvas!.width * canvas!.height) / 8000));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * canvas!.width,
        y: Math.random() * canvas!.height,
        r: Math.random() * 1.3 + 0.3,
        speed: Math.random() * 0.15 + 0.03,
        twinkle: Math.random() * Math.PI * 2,
      }));
    }

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const s of stars) {
        s.y += s.speed;
        if (s.y > canvas.height) s.y = 0;
        s.twinkle += 0.02;
        ctx.beginPath();
        ctx.globalAlpha = 0.3 + Math.abs(Math.sin(s.twinkle)) * 0.7;
        ctx.fillStyle = color;
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    }

    resize();
    draw();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [color]);

  return <canvas ref={ref} className="bg-fx-canvas" />;
}

const MATRIX_CHARS = "01アイウエオカキクケコ$#%&*+=-<>";

function MatrixRain({ color, fadeColor }: { color: string; fadeColor: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let raf = 0;
    let columns: number[] = [];
    const fontSize = 14;

    function resize() {
      canvas!.width = canvas!.clientWidth;
      canvas!.height = canvas!.clientHeight;
      const count = Math.max(1, Math.floor(canvas!.width / fontSize));
      columns = Array.from({ length: count }, () => Math.random() * -50);
    }

    function draw() {
      if (!ctx || !canvas) return;
      ctx.fillStyle = fadeColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${fontSize}px monospace`;
      ctx.fillStyle = color;
      columns.forEach((y, i) => {
        const char = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
        const x = i * fontSize;
        ctx.fillText(char, x, y * fontSize);
        if (y * fontSize > canvas.height && Math.random() > 0.975) {
          columns[i] = 0;
        } else {
          columns[i] = y + 1;
        }
      });
      raf = requestAnimationFrame(draw);
    }

    resize();
    draw();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [color, fadeColor]);

  return <canvas ref={ref} className="bg-fx-canvas" />;
}

function Grid({ accent }: { accent: string }) {
  const style = { "--grid-color": accent } as React.CSSProperties;
  return <div className="bg-fx-grid" style={style} />;
}

function Nebula({ accent }: { accent: string }) {
  const style = { "--nebula-color": accent } as React.CSSProperties;
  return (
    <div className="bg-fx-nebula" style={style}>
      <span className="blob blob-1" />
      <span className="blob blob-2" />
      <span className="blob blob-3" />
    </div>
  );
}

export default function BackgroundFX({
  theme,
  accent,
  background,
}: {
  theme?: BackgroundTheme;
  accent: string;
  background: string;
}) {
  if (!theme || theme === "solid") return null;

  switch (theme) {
    case "starfield":
      return <Starfield color="#ffffff" />;
    case "matrix":
      return <MatrixRain color={accent} fadeColor={hexToRgba(background, 0.12)} />;
    case "grid":
      return <Grid accent={accent} />;
    case "nebula":
      return <Nebula accent={accent} />;
    default:
      return null;
  }
}

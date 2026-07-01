"use client";

import { useEffect, useRef, useState } from "react";
import { extractYouTubeId } from "@/lib/youtube";
import { PauseIcon, PlayIcon } from "./icons";

interface YTPlayerInstance {
  playVideo?: () => void;
  pauseVideo?: () => void;
  getCurrentTime?: () => number;
  getDuration?: () => number;
  destroy?: () => void;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string,
        options: {
          videoId: string;
          playerVars?: Record<string, number>;
          events?: {
            onReady?: () => void;
            onStateChange?: (e: { data: number }) => void;
          };
        }
      ) => YTPlayerInstance;
      PlayerState: { ENDED: number; PLAYING: number; PAUSED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (youtubeApiPromise) return youtubeApiPromise;
  youtubeApiPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }
    const prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prevCallback?.();
      resolve();
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.appendChild(script);
    }
  });
  return youtubeApiPromise;
}

export default function FloatingVideoPlayer({
  videoUrl,
  sourceType,
  onComplete,
}: {
  videoUrl: string;
  sourceType: "youtube" | "direct";
  onComplete: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoElRef = useRef<HTMLVideoElement>(null);
  const ytPlayerRef = useRef<YTPlayerInstance | null>(null);
  const ytElementId = useRef(`yt-float-${Math.random().toString(36).slice(2, 9)}`);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const [minimized, setMinimized] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const youtubeId = sourceType === "youtube" ? extractYouTubeId(videoUrl) : null;
  const hasValidSource = sourceType === "youtube" ? !!youtubeId : !!videoUrl;

  function markDone() {
    setDone((prev) => {
      if (!prev) onComplete();
      return true;
    });
    setProgress(100);
    setPlaying(false);
  }

  // auto-minimize once watched, so it stops taking up space
  useEffect(() => {
    if (done) setMinimized(true);
  }, [done]);

  // --- YouTube branch: real IFrame API, ENDED state is the true signal ---
  useEffect(() => {
    if (sourceType !== "youtube" || !youtubeId) return;

    let cancelled = false;
    let poll: ReturnType<typeof setInterval> | null = null;

    loadYouTubeApi().then(() => {
      if (cancelled || !window.YT) return;
      ytPlayerRef.current = new window.YT.Player(ytElementId.current, {
        videoId: youtubeId,
        playerVars: { playsinline: 1, modestbranding: 1, rel: 0, controls: 0 },
        events: {
          onReady: () => {
            poll = setInterval(() => {
              const p = ytPlayerRef.current;
              if (!p?.getCurrentTime || !p?.getDuration) return;
              const dur = p.getDuration();
              if (dur > 0) setProgress(Math.min(100, (p.getCurrentTime() / dur) * 100));
            }, 1000);
          },
          onStateChange: (e) => {
            if (!window.YT) return;
            if (e.data === window.YT.PlayerState.ENDED) markDone();
            else if (e.data === window.YT.PlayerState.PLAYING) setPlaying(true);
            else if (e.data === window.YT.PlayerState.PAUSED) setPlaying(false);
          },
        },
      });
    });

    return () => {
      cancelled = true;
      if (poll) clearInterval(poll);
      ytPlayerRef.current?.destroy?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoUrl, sourceType, youtubeId]);

  // --- Direct video branch: real <video> ended/timeupdate events ---
  useEffect(() => {
    if (sourceType !== "direct") return;
    const el = videoElRef.current;
    if (!el) return;

    function handleTimeUpdate() {
      if (el!.duration > 0) setProgress(Math.min(100, (el!.currentTime / el!.duration) * 100));
    }
    function handleEnded() {
      markDone();
    }
    function handlePlay() {
      setPlaying(true);
    }
    function handlePause() {
      setPlaying(false);
    }

    el.addEventListener("timeupdate", handleTimeUpdate);
    el.addEventListener("ended", handleEnded);
    el.addEventListener("play", handlePlay);
    el.addEventListener("pause", handlePause);
    return () => {
      el.removeEventListener("timeupdate", handleTimeUpdate);
      el.removeEventListener("ended", handleEnded);
      el.removeEventListener("play", handlePlay);
      el.removeEventListener("pause", handlePause);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceType]);

  function togglePlay() {
    if (sourceType === "youtube") {
      const p = ytPlayerRef.current;
      if (!p) return;
      if (playing) p.pauseVideo?.();
      else p.playVideo?.();
    } else {
      const el = videoElRef.current;
      if (!el) return;
      if (playing) el.pause();
      else el.play().catch(() => {});
    }
  }

  // --- Dragging (pointer events cover mouse + touch) ---
  function onDragStart(e: React.PointerEvent) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: rect.left, origY: rect.top };
    window.addEventListener("pointermove", onDragMove);
    window.addEventListener("pointerup", onDragEnd);
  }
  function onDragMove(e: PointerEvent) {
    const d = dragRef.current;
    const el = containerRef.current;
    if (!d || !el) return;
    const nx = d.origX + (e.clientX - d.startX);
    const ny = d.origY + (e.clientY - d.startY);
    const maxX = window.innerWidth - el.offsetWidth - 4;
    const maxY = window.innerHeight - el.offsetHeight - 4;
    setPos({ x: Math.min(Math.max(4, nx), Math.max(4, maxX)), y: Math.min(Math.max(4, ny), Math.max(4, maxY)) });
  }
  function onDragEnd() {
    dragRef.current = null;
    window.removeEventListener("pointermove", onDragMove);
    window.removeEventListener("pointerup", onDragEnd);
  }
  useEffect(
    () => () => {
      window.removeEventListener("pointermove", onDragMove);
      window.removeEventListener("pointerup", onDragEnd);
    },
    []
  );

  const style: React.CSSProperties = pos ? { left: pos.x, top: pos.y, right: "auto", bottom: "auto" } : {};

  return (
    <div ref={containerRef} className={`floating-video ${minimized ? "minimized" : ""}`} style={style}>
      <div className="floating-video-header" onPointerDown={onDragStart}>
        <span>{done ? "Watched" : "Watch to continue"}</span>
        <button
          type="button"
          className="floating-video-toggle"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setMinimized((m) => !m)}
        >
          {minimized ? "▢" : "—"}
        </button>
      </div>

      {!minimized && (
        <div className="floating-video-body">
          {!hasValidSource ? (
            <div className="floating-video-fallback">
              <p>Video link isn&apos;t set up right.</p>
            </div>
          ) : sourceType === "youtube" ? (
            <div id={ytElementId.current} className="floating-video-yt" />
          ) : (
            <video ref={videoElRef} src={videoUrl} playsInline />
          )}

          {hasValidSource && !done && (
            <button type="button" className="floating-video-playpause" onClick={togglePlay}>
              {playing ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
            </button>
          )}
        </div>
      )}

      <div className="floating-video-progress">
        <div className="floating-video-progress-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

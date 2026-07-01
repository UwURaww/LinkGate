"use client";

import { useEffect, useRef, useState } from "react";
import { extractYouTubeId } from "@/lib/youtube";
import { PauseIcon, PlayIcon } from "./icons";

interface YTPlayerInstance {
  playVideo?: () => void;
  pauseVideo?: () => void;
  seekTo?: (seconds: number, allowSeekAhead: boolean) => void;
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

// How far a currentTime/getCurrentTime() reading is allowed to jump forward
// between checks before it's treated as a skip attempt and snapped back.
// Generous enough to absorb normal playback + polling/event timing jitter.
const DIRECT_JUMP_THRESHOLD_SEC = 2;
const YOUTUBE_JUMP_THRESHOLD_SEC = 3;

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
  const furthestTimeRef = useRef(0);
  const playingRef = useRef(false);

  const [minimized, setMinimized] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const youtubeId = sourceType === "youtube" ? extractYouTubeId(videoUrl) : null;
  const hasValidSource = sourceType === "youtube" ? !!youtubeId : !!videoUrl;

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

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

  // Center the window on first mount, reading its actual rendered size (so
  // this works correctly whether the mobile or desktop CSS size applied).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({
      x: Math.max(8, (window.innerWidth - rect.width) / 2),
      y: Math.max(8, (window.innerHeight - rect.height) / 2),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- YouTube branch: real IFrame API, ENDED state is the true signal ---
  useEffect(() => {
    if (sourceType !== "youtube" || !youtubeId) return;

    let cancelled = false;
    let poll: ReturnType<typeof setInterval> | null = null;

    loadYouTubeApi().then(() => {
      if (cancelled || !window.YT) return;
      ytPlayerRef.current = new window.YT.Player(ytElementId.current, {
        videoId: youtubeId,
        // disablekb/fs close the two YouTube-native ways to seek without a
        // visible scrub bar; controls:0 already removes the scrub bar itself.
        playerVars: { playsinline: 1, modestbranding: 1, rel: 0, controls: 0, disablekb: 1, fs: 0 },
        events: {
          onReady: () => {
            poll = setInterval(() => {
              const p = ytPlayerRef.current;
              if (!p?.getCurrentTime || !p?.getDuration) return;
              const cur = p.getCurrentTime();
              const dur = p.getDuration();

              if (playingRef.current && cur - furthestTimeRef.current > YOUTUBE_JUMP_THRESHOLD_SEC) {
                p.seekTo?.(furthestTimeRef.current, true);
              } else {
                furthestTimeRef.current = Math.max(furthestTimeRef.current, cur);
              }

              if (dur > 0) setProgress(Math.min(100, (furthestTimeRef.current / dur) * 100));
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
      const cur = el!.currentTime;
      if (playingRef.current && cur - furthestTimeRef.current > DIRECT_JUMP_THRESHOLD_SEC) {
        el!.currentTime = furthestTimeRef.current;
        return;
      }
      furthestTimeRef.current = Math.max(furthestTimeRef.current, cur);
      if (el!.duration > 0) setProgress(Math.min(100, (furthestTimeRef.current / el!.duration) * 100));
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
    function handleKeyDown(e: KeyboardEvent) {
      // Arrow keys are the standard browser seek shortcut on a focused
      // video element - block just those, leave space/other keys alone.
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
      }
    }
    function handleContextMenu(e: Event) {
      // Some browsers put a "seek" option in the native video right-click
      // menu even without visible controls - block it on this element only.
      e.preventDefault();
    }

    el.addEventListener("timeupdate", handleTimeUpdate);
    el.addEventListener("ended", handleEnded);
    el.addEventListener("play", handlePlay);
    el.addEventListener("pause", handlePause);
    el.addEventListener("keydown", handleKeyDown);
    el.addEventListener("contextmenu", handleContextMenu);
    return () => {
      el.removeEventListener("timeupdate", handleTimeUpdate);
      el.removeEventListener("ended", handleEnded);
      el.removeEventListener("play", handlePlay);
      el.removeEventListener("pause", handlePause);
      el.removeEventListener("keydown", handleKeyDown);
      el.removeEventListener("contextmenu", handleContextMenu);
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
        <span>{done ? "Watched" : "Watch to continue - no skipping"}</span>
        <button
          type="button"
          className="floating-video-toggle"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setMinimized((m) => !m)}
        >
          {minimized ? "▢" : "—"}
        </button>
      </div>

      {/* Always mounted (just visually collapsed when minimized) so the
          player - especially the YouTube iframe - doesn't get torn down
          and lose its state every time this is minimized/restored. */}
      <div className={`floating-video-body ${minimized ? "collapsed" : ""}`}>
        {!hasValidSource ? (
          <div className="floating-video-fallback">
            <p>Video link isn&apos;t set up right.</p>
          </div>
        ) : sourceType === "youtube" ? (
          <div id={ytElementId.current} className="floating-video-yt" />
        ) : (
          <video ref={videoElRef} src={videoUrl} playsInline disablePictureInPicture />
        )}

        {hasValidSource && !done && (
          <button type="button" className="floating-video-playpause" onClick={togglePlay}>
            {playing ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
          </button>
        )}
      </div>

      <div className="floating-video-progress">
        <div className="floating-video-progress-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

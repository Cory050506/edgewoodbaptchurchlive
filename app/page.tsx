// app/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

const HLS_URL = "https://stream.edgewoodbaptchurch.com/hls/service.m3u8";

type StatusText =
  | "Loading…"
  | "Live"
  | "Stream error (refresh page)"
  | "Browser not supported (use Safari or VLC)";

export default function Page() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<StatusText>("Loading…");

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Native HLS (iOS Safari, some browsers)
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = HLS_URL;
      setStatus("Live");
      return;
    }

    // Desktop browsers via hls.js
    if (Hls.isSupported()) {
      const hls = new Hls({
        lowLatencyMode: true,
        backBufferLength: 30,
      });

      hls.loadSource(HLS_URL);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => setStatus("Live"));

      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (data?.fatal) setStatus("Stream error (refresh page)");
      });

      return () => {
        hls.destroy();
      };
    }

    setStatus("Browser not supported (use Safari or VLC)");
  }, []);

  return (
    <main className="container">
      <header className="header">
        <div>
          <h1 className="title">Edgewood Baptist Church</h1>
          <p className="subtitle">Live Stream</p>
        </div>

        <span className="badge">🔴 {status}</span>
      </header>

      <section className="section">
        <video
          ref={videoRef}
          className="video"
          controls
          autoPlay
          playsInline
          muted
        />

        <div className="linkRow">
          <a className="link" href={HLS_URL}>
            Open stream link (VLC / devices)
          </a>

          <a className="link" href="https://edgewoodbaptchurch.com">
            Back to main website
          </a>
        </div>

        <p className="note">
          If the video buffers, refresh the page. On mobile, Safari usually works
          best.
        </p>
      </section>
    </main>
  );
}

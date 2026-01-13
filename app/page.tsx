"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";

const HLS_URL = "https://stream.edgewoodbaptchurch.com/live/service/index.m3u8";

// Put your stats endpoint here later (example):
// const STATS_URL = "https://stats.edgewoodbaptchurch.com/now";
const STATS_URL: string | null = null;

const CHAT_IFRAME_URL = "https://chat.edgewoodbaptchurch.com/channel/Sunday-Chat/?layout=embedded";


type LiveState = "loading" | "live" | "offline" | "error";

export default function Page() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [liveState, setLiveState] = useState<LiveState>("loading");
  const [statusText, setStatusText] = useState<string>("Connecting…");

  // Viewer stats (will be “—” until STATS_URL is set)
  const [viewersNow, setViewersNow] = useState<number | null>(null);
  const [peakToday, setPeakToday] = useState<number | null>(null);

  const liveBadgeText = useMemo(() => {
    if (liveState === "live") return "🔴 LIVE";
    if (liveState === "offline") return "⚫ OFFLINE";
    if (liveState === "error") return "⚠️ ERROR";
    return "⏳ LOADING";
  }, [liveState]);

  const viewersBadge = useMemo(() => {
    const now = viewersNow == null ? "—" : String(viewersNow);
    const peak = peakToday == null ? "—" : String(peakToday);
    return `${now} watching • peak ${peak}`;
  }, [viewersNow, peakToday]);

  // Build / rebuild player
  const initPlayer = () => {
    const video = videoRef.current;
    if (!video) return;

    setLiveState("loading");
    setStatusText("Connecting…");

    // Reset element state
    video.pause();
    video.removeAttribute("src");
    video.load();

    // Native HLS (iOS Safari, some browsers)
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = HLS_URL;

      const onCanPlay = () => {
        setLiveState("live");
        setStatusText("Live");
        video.play().catch(() => {});
      };

      const onError = () => {
        setLiveState("offline");
        setStatusText("No live stream right now");
      };

      video.addEventListener("canplay", onCanPlay, { once: true });
      video.addEventListener("error", onError, { once: true });

      return;
    }

    // hls.js for most desktops
    if (Hls.isSupported()) {
      const hls = new Hls({
        lowLatencyMode: true,
        backBufferLength: 30,
        // Helps reduce false “stuck” situations for some streams
        maxBufferLength: 10,
        maxMaxBufferLength: 30,
      });

      hls.loadSource(HLS_URL);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLiveState("live");
        setStatusText("Live");
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (data?.fatal) {
          // Most fatal errors here effectively mean “offline” from the viewer’s perspective.
          setLiveState("offline");
          setStatusText("No live stream right now");
          hls.destroy();
        }
      });

      return () => hls.destroy();
    }

    setLiveState("error");
    setStatusText("Browser not supported — use Safari or VLC.");
  };

  useEffect(() => {
    const cleanup = initPlayer();

    // Auto-retry every 15 seconds when offline
    const t = setInterval(() => {
      if (liveState === "offline" || liveState === "error") {
        initPlayer();
      }
    }, 15000);

    return () => {
      clearInterval(t);
      if (typeof cleanup === "function") cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Viewer polling (only if STATS_URL is set)
  useEffect(() => {
    if (!STATS_URL) return;

    const poll = async () => {
      try {
        const res = await fetch(STATS_URL, { cache: "no-store" });
        const data = await res.json();
        setViewersNow(typeof data.viewers === "number" ? data.viewers : null);
        setPeakToday(typeof data.peak === "number" ? data.peak : null);
      } catch {
        setViewersNow(null);
        setPeakToday(null);
      }
    };

    poll();
    const t = setInterval(poll, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <main className="container">
      <header className="header">
        <div className="brand">
          <div className="logo">EBC</div>
          <div className="titleWrap">
            <h1 className="title">Edgewood Baptist Church</h1>
            <p className="subtitle">Live Stream • {statusText}</p>
          </div>
        </div>

        <div className="headerRight">
          <span className="badge">{liveBadgeText}</span>
          <span className="badge badgeSoft">{viewersBadge}</span>
        </div>
      </header>

      <div className="mainGrid">
        {/* LEFT: Video */}
        <section className="card videoWrap">
          {liveState === "offline" ? (
            <div className="offlineBox">
              <h2 className="offlineTitle">No live stream at the moment</h2>
              <p className="note" style={{ marginTop: 0 }}>
                The service may not have started yet. This page will keep checking automatically.
              </p>

              <div className="controlsRow">
                <button className="btn btnPrimary" onClick={initPlayer}>
                  Refresh / Retry
                </button>
                <a className="btn" href={HLS_URL}>
                  Open stream link (VLC / devices)
                </a>
              </div>

              <p className="note">
                Tip: iPhone/iPad Safari works best for HLS. On desktop, Chrome/Edge should work here.
              </p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                className="video"
                controls
                autoPlay
                playsInline
                muted
              />

              <div className="controlsRow" style={{ padding: "0 14px 14px 14px" }}>
                <button className="btn btnPrimary" onClick={initPlayer}>
                  Refresh Player
                </button>
                <a className="btn" href="https://edgewoodbaptchurch.com">
                  Back to main website
                </a>
                <a className="btn" href={HLS_URL}>
                  Open stream link
                </a>
              </div>

              <p className="note" style={{ padding: "0 14px 14px 14px", marginTop: 0 }}>
                If video buffers or freezes, click “Refresh Player”.
              </p>
            </>
          )}
        </section>

        {/* RIGHT: Info + Chat */}
        <aside className="card">
          <h3 className="cardTitle">Service Info</h3>

          <div className="kv">
            <div className="kvRow">
              <span className="kvLabel">Watch URL</span>
              <span className="kvValue">live.edgewoodbaptchurch.com</span>
            </div>

            <div className="kvRow">
              <span className="kvLabel">Stream Source</span>
              <span className="kvValue">OBS → Office Server</span>
            </div>
          </div>

          <div className="controlsRow" style={{ marginTop: 12 }}>
            <a className="btn" href="https://edgewoodbaptchurch.com">
              Church Website
            </a>
            {/* When you add stats service later, you can enable CSV link */}
            {/* <a className="btn" href="https://stats.edgewoodbaptchurch.com/csv">Download Attendance CSV</a> */}
          </div>

          <h3 className="cardTitle" style={{ marginTop: 16 }}>Chat</h3>

          {CHAT_IFRAME_URL ? (
            <iframe
              className="chatFrame"
              src={CHAT_IFRAME_URL}
              title="Live Chat"
              allow="clipboard-write; encrypted-media"
            />
          ) : (
            <div className="offlineBox">
              <h2 className="offlineTitle">Chat is coming soon</h2>
              <p className="note" style={{ marginTop: 0 }}>
                Pick a chat option and we’ll drop it in here:
                <br />• Discord widget (easy)
                <br />• YouTube Live Chat embed (if you stream to YouTube too)
                <br />• Self-hosted chat (most control, more setup)
              </p>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

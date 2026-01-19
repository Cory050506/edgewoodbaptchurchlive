"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";

const HLS_URL = "https://stream.edgewoodbaptchurch.com/live/service/index.m3u8";
const STATS_URL: string | null = null;
const CHAT_IFRAME_URL =
  "https://chat.edgewoodbaptchurch.com/channel/Sunday-Chat/?layout=embedded";

type LiveState = "loading" | "live" | "offline" | "error";

export default function Page() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const retryTimerRef = useRef<number | null>(null);

  const [liveState, setLiveState] = useState<LiveState>("loading");
  const [statusText, setStatusText] = useState<string>("Connecting…");

  const [viewersNow, setViewersNow] = useState<number | null>(null);
  const [peakToday, setPeakToday] = useState<number | null>(null);

  const [chatOpen, setChatOpen] = useState<boolean>(() => {
    // Collapse chat by default on small screens
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 940;
  });

  const [toast, setToast] = useState<string | null>(null);

  const liveBadge = useMemo(() => {
    if (liveState === "live") return { text: "🔴 LIVE", cls: "badge badgeLive" };
    if (liveState === "offline") return { text: "⚫ OFFLINE", cls: "badge badgeOff" };
    if (liveState === "error") return { text: "⚠️ ERROR", cls: "badge badgeErr" };
    return { text: "⏳ LOADING", cls: "badge" };
  }, [liveState]);

  const viewersBadge = useMemo(() => {
    const now = viewersNow == null ? "—" : String(viewersNow);
    const peak = peakToday == null ? "—" : String(peakToday);
    return `${now} watching • peak ${peak}`;
  }, [viewersNow, peakToday]);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  const destroyPlayer = () => {
    if (retryTimerRef.current) {
      window.clearInterval(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
  };

  const markOffline = () => {
    setLiveState("offline");
    setStatusText("No live stream right now");
  };

  const initPlayer = () => {
    const video = videoRef.current;
    if (!video) return;

    destroyPlayer();

    setLiveState("loading");
    setStatusText("Connecting…");

    // Native HLS (Safari)
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = HLS_URL;

      const onCanPlay = () => {
        setLiveState("live");
        setStatusText("Live");
        video.play().catch(() => {});
      };

      const onError = () => markOffline();

      video.addEventListener("canplay", onCanPlay, { once: true });
      video.addEventListener("error", onError, { once: true });
      return;
    }

    // hls.js
    if (Hls.isSupported()) {
      const hls = new Hls({
        lowLatencyMode: true,
        backBufferLength: 30,
        maxBufferLength: 10,
        maxMaxBufferLength: 30,
      });

      hlsRef.current = hls;

      hls.loadSource(HLS_URL);
      hls.attachMedia(video);

      // Don’t mark LIVE until video is actually playable
      const onCanPlay = () => {
        setLiveState("live");
        setStatusText("Live");
        video.play().catch(() => {});
        video.removeEventListener("canplay", onCanPlay);
      };
      video.addEventListener("canplay", onCanPlay);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setStatusText("Buffering…");
      });

      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (data?.fatal) {
          markOffline();
          hls.destroy();
          hlsRef.current = null;
        }
      });

      return;
    }

    setLiveState("error");
    setStatusText("Browser not supported — use Safari or VLC.");
  };

  // Init + auto-retry (fixed: uses latest state)
  useEffect(() => {
    initPlayer();

    retryTimerRef.current = window.setInterval(() => {
      setLiveState((prev) => {
        if (prev === "offline" || prev === "error") {
          initPlayer();
        }
        return prev;
      });
    }, 15000);

    return () => destroyPlayer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Viewer polling (only if STATS_URL set)
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
    const t = window.setInterval(poll, 5000);
    return () => window.clearInterval(t);
  }, []);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText("https://live.edgewoodbaptchurch.com");
      showToast("Link copied!");
    } catch {
      showToast("Couldn’t copy link");
    }
  };

  return (
    <main className="container">
      <header className="header">
        <div className="brand">
          <img src="logo.png" alt="Edgewood Baptist Church Logo" className="logo" />
          <div className="titleWrap">
            <h1 className="title">Edgewood Baptist Church</h1>
            <p className="subtitle">Live Stream • {statusText}</p>
          </div>
        </div>

        <div className="headerRight">
          <span className={liveBadge.cls}>{liveBadge.text}</span>
          <span className="badge badgeSoft">{viewersBadge}</span>
          <button className="btn" onClick={copyLink} type="button">
            🔗 Copy link
          </button>
        </div>
      </header>

      <div className="mainGrid">
        {/* LEFT: Video */}
        <section className="card videoWrap">
          {liveState === "offline" ? (
            <div className="offlineBox">
              <h2 className="offlineTitle">We’re not live right now. Check back on Sundays at 10:45 AM and/or 6 PM to catch a service!</h2>
              <div className="heroLine">
                <span className="pill">This page auto-refreshes every 15 seconds</span>
              </div>

<div className="controlsRow" style={{ marginTop: 6 }}>
                <button className="btn btnPrimary" onClick={initPlayer} type="button">
                  Refresh / Retry
                </button>
              </div>
              
            </div>
          ) : (
            <>
              <video ref={videoRef} className="video" controls autoPlay playsInline muted />

              <div className="controlsRow" style={{ padding: "14px" }}>
                <button className="btn btnPrimary" onClick={initPlayer} type="button">
                  Refresh Player (if having issues)
                </button>
                <a className="btn" href={HLS_URL} target="_blank" rel="noreferrer">
                  Open link in new tab
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
          <div className="cardPad">
            

            

            <div className="controlsRow" style={{ marginTop: 12 }}>
              <a className="btn" href="https://edgewoodbaptchurch.com">
                Church Website
              </a>
            </div>
          </div>

          <div className="chatHeader">
            <h3 className="cardTitle">Chat</h3>
            <button className="btn" type="button" onClick={() => setChatOpen((v) => !v)}>
              {chatOpen ? "Hide" : "Show"}
            </button>
          </div>

          {chatOpen ? (
            <iframe
              className="chatFrame"
              src={CHAT_IFRAME_URL}
              title="Live Chat"
              allow="clipboard-write; encrypted-media"
            />
          ) : (
            <div className="offlineBox">
              <h2 className="offlineTitle">Chat hidden</h2>
              <p className="note" style={{ marginTop: 0 }}>
                Tap “Show” to open chat.
              </p>
            </div>
          )}
        </aside>
      </div>

      {toast ? <div className="toast">{toast}</div> : null}
    </main>
  );
}

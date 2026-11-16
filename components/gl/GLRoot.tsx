"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";
import { markBusy, whenQuiet } from "@/lib/quiet";
import { detectTier, type Tier } from "./quality";

// three.js + R3F live in their own chunk and never block first paint.
const loadCanvas = () => import("./ObjectCanvas");
const ObjectCanvas = dynamic(loadCanvas, { ssr: false });

/** If the scene ever throws, drop it instead of the page. */
class SceneBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * Decides whether this page view gets WebGL at all, and how much. The decision
 * waits until the page has loaded and the main thread is idle; until then
 * (and whenever the answer is "none") the server-rendered poster is the
 * whole experience.
 */
export function GLRoot() {
  const [tier, setTier] = useState<Tier | null>(null);
  // The 3D layer lives on the home page only. Case studies never download
  // three.js or open a GPU context.
  const onHome = usePathname() === "/";

  useEffect(() => {
    let cancel = () => {};

    const decide = () => setTier(detectTier());

    // three.js is ~240 KB of script, and the sculpture's physical material
    // takes a moment to compile. Wait for the visitor's first move — pointer,
    // touch, scroll or key — so the page is fully interactive before any of
    // it loads; the sculpture's still holds the hero until then.
    // That work is a few hundred milliseconds of main thread, which stalls a
    // touch scroll under way (a phone's first move is usually a swipe), so
    // each step waits for a pause in scrolling: first evaluate the three.js
    // chunk, then mount the scene (which builds itself in steps too).
    // Phones and tablets do not wait for a first move: the visitor is
    // looking at the hero, and waiting would land the load (and the
    // portrait's assembly) in the middle of their first scroll. They load
    // straight after the page, in the quiet before anyone touches it.
    const touch = window.matchMedia("(pointer: coarse)").matches;
    const start = () => {
      cancel = whenQuiet(
        () => {
          if (!detectTier()) return decide();
          loadCanvas().then(() => {
            cancel = whenQuiet(decide, touch ? 150 : 400);
          }, decide);
        },
        touch ? 200 : 900,
      );
    };
    const intent = ["pointermove", "pointerdown", "touchstart", "wheel", "scroll", "keydown"] as const;
    const onIntent = () => {
      markBusy();
      intent.forEach((type) => window.removeEventListener(type, onIntent));
      if (document.readyState === "complete") start();
      else window.addEventListener("load", start, { once: true });
    };
    if (touch) {
      if (document.readyState === "complete") start();
      else window.addEventListener("load", start, { once: true });
    } else {
      intent.forEach((type) => window.addEventListener(type, onIntent, { passive: true }));
    }

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    motion.addEventListener("change", decide);

    return () => {
      cancel();
      intent.forEach((type) => window.removeEventListener(type, onIntent));
      window.removeEventListener("load", start);
      motion.removeEventListener("change", decide);
    };
  }, []);

  if (!tier || !onHome) return null;

  // The 3D layer is extra: if it throws or loses its GPU context, only it
  // goes away and the page carries on.
  return (
    <SceneBoundary onError={() => setTier(null)}>
      <ObjectCanvas tier={tier} onLost={() => setTier(null)} />
    </SceneBoundary>
  );
}

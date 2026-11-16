"use client";

import { useEffect, useRef } from "react";
import { FINE_POINTER, gsap, prefersReducedMotion } from "@/lib/gsap";

/**
 * A follower for fine pointers. The system cursor stays; this adds an ember
 * dot that trails it, grows over links, and becomes a label pill over
 * anything with `data-cursor="…"` (the project cards, for instance).
 * Purely decorative: aria-hidden, never intercepts the pointer.
 */
export function Cursor() {
  const root = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || !window.matchMedia(FINE_POINTER).matches) return;

    const lag = prefersReducedMotion() ? 0 : 0.35;
    const x = gsap.quickTo(el, "x", { duration: lag, ease: "power3.out" });
    const y = gsap.quickTo(el, "y", { duration: lag, ease: "power3.out" });
    let label = "";

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      el.dataset.visible = "true";
      x(event.clientX);
      y(event.clientY);
    };

    const onOver = (event: PointerEvent) => {
      const target = event.target as Element | null;
      const tagged = target?.closest<HTMLElement>("[data-cursor]");
      if (tagged) {
        const next = tagged.dataset.cursor ?? "";
        if (next !== label && text.current) text.current.textContent = next;
        label = next;
        el.dataset.state = "label";
      } else if (target?.closest("a, button, [role='button'], label, summary")) {
        el.dataset.state = "link";
      } else {
        el.dataset.state = "idle";
      }
    };

    const onLeave = () => {
      el.dataset.visible = "false";
    };
    const onDown = () => {
      el.dataset.pressed = "true";
    };
    const onUp = () => {
      el.dataset.pressed = "false";
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
    };
  }, []);

  return (
    <div ref={root} className="cursor" data-state="idle" data-visible="false" aria-hidden="true">
      <span className="cursor-dot" />
      <span className="cursor-label label">
        <span ref={text} />
        <span className="cursor-arrow">↗</span>
      </span>
    </div>
  );
}

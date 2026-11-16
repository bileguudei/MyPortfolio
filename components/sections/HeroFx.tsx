"use client";

import { useEffect } from "react";
import { FINE_POINTER, gsap, MOTION_OK, SplitText, useGSAP } from "@/lib/gsap";

/**
 * Hero choreography that needs JS. The name itself is revealed by CSS at
 * first paint (see globals.css); this adds what follows:
 *   • scrolling away: the two halves of the name part, the copy clears
 *   • fine pointers: the name's ink thins under the cursor (weight 600 → 300)
 * The sculpture itself (drag, spin, follow) lives in components/gl.
 */
export function HeroFx() {
  useGSAP(() => {
    const mm = gsap.matchMedia();

    // Fine pointers: GSAP scrubs the name apart and clears the copy. On touch
    // screens the same motion is a CSS scroll-driven animation (globals.css,
    // "Hero scroll-away"): it runs on the compositor with the scroll itself,
    // where a main-thread scrub lags a frame behind and judders.
    mm.add(`${MOTION_OK} and (pointer: fine)`, () => {
      const hero = document.querySelector<HTMLElement>("[data-hero]");
      if (!hero) return;
      const scrub = { trigger: hero, start: "top top", end: "bottom top", scrub: true };

      gsap.to(".hero-name-a", { xPercent: -14, ease: "none", scrollTrigger: scrub });
      gsap.to(".hero-name-b", { xPercent: 14, ease: "none", scrollTrigger: scrub });
      gsap.to("[data-hero-copy]", {
        y: -48,
        opacity: 0, // not autoAlpha: the links must stay focusable
        ease: "none",
        scrollTrigger: { trigger: hero, start: "top top", end: "40% top", scrub: true },
      });
    });

    mm.add(MOTION_OK, () => {
      const hero = document.querySelector<HTMLElement>("[data-hero]");
      if (!hero) return;
      gsap.fromTo(
        "[data-scroll-cue]",
        { scaleY: 0 },
        {
          scaleY: 1,
          duration: 1.4,
          ease: "power2.inOut",
          repeat: -1,
          yoyo: true,
          // Only runs while the hero is on screen.
          scrollTrigger: {
            trigger: hero,
            start: "top bottom",
            end: "bottom top",
            toggleActions: "play pause resume pause",
          },
        },
      );
    });
  });

  // Ink proximity. Only weight changes, and only downwards, so a line can
  // only get narrower and the name can never overflow its block.
  useEffect(() => {
    const motion = window.matchMedia(`${MOTION_OK} and ${FINE_POINTER}`);
    if (!motion.matches) return;
    const hero = document.querySelector<HTMLElement>("[data-hero]");
    const lines = Array.from(document.querySelectorAll<HTMLElement>("[data-hero-name] .intro-rise"));
    if (!hero || !lines.length) return;

    let split: SplitText | null = null;
    let chars: HTMLElement[] = [];
    let weights: number[] = [];
    let pointer = { x: -9999, y: -9999, inside: false };
    let running = false;

    const start = () => {
      // Wait for the CSS intro to finish before touching the letters.
      const widths = lines.map((line) => line.getBoundingClientRect().width);
      split = new SplitText(lines, { type: "chars", aria: "none", charsClass: "ink-char" });
      // Splitting drops kerning. If that made any line wider, undo it.
      const grew = lines.some((line, i) => line.getBoundingClientRect().width > widths[i] * 1.004);
      if (grew) {
        split.revert();
        split = null;
        return;
      }
      chars = split.chars as HTMLElement[];
      weights = chars.map(() => 600);
      hero.addEventListener("pointermove", onMove, { passive: true });
      hero.addEventListener("pointerleave", onLeave);
    };

    const onMove = (event: PointerEvent) => {
      pointer = { x: event.clientX, y: event.clientY, inside: true };
      if (!running) {
        running = true;
        gsap.ticker.add(frame);
      }
    };
    const onLeave = () => {
      pointer.inside = false;
    };

    const frame = () => {
      const size = parseFloat(getComputedStyle(lines[0]).fontSize) || 200;
      const reach = size * 1.1;
      let settled = true;
      chars.forEach((char, i) => {
        const r = char.getBoundingClientRect();
        const d = Math.hypot(pointer.x - (r.left + r.width / 2), pointer.y - (r.top + r.height / 2));
        const near = pointer.inside ? Math.max(0, 1 - d / reach) : 0;
        const target = 600 - 300 * near * near * (3 - 2 * near);
        const w = weights[i] + (target - weights[i]) * 0.18;
        if (Math.abs(w - target) > 0.5) settled = false;
        if (Math.abs(w - weights[i]) > 0.1) {
          weights[i] = w;
          char.style.fontWeight = String(Math.round(w));
        }
      });
      if (settled && !pointer.inside) {
        running = false;
        gsap.ticker.remove(frame);
      }
    };

    const timer = window.setTimeout(start, 1800);
    return () => {
      window.clearTimeout(timer);
      gsap.ticker.remove(frame);
      hero.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerleave", onLeave);
      split?.revert();
    };
  }, []);

  return null;
}

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

/** Motion tokens. Mirrored as CSS custom properties in app/globals.css. */
export const DUR = { fast: 0.35, base: 0.7, slow: 1.1 } as const;
export const EASE = "ember";

/** Everything that moves is gated behind this query. */
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";
export const FINE_POINTER = "(hover: hover) and (pointer: fine)";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, CustomEase, ScrambleTextPlugin);
  CustomEase.create(EASE, "0.16, 1, 0.3, 1");
  gsap.defaults({ ease: EASE, duration: DUR.base });
  ScrollTrigger.config({ ignoreMobileResize: true });
}

export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export { gsap, ScrollTrigger, SplitText, useGSAP };

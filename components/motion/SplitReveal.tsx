"use client";

import { useRef } from "react";
import { DUR, gsap, MOTION_OK, SplitText, useGSAP } from "@/lib/gsap";

type Props = {
  as?: "h1" | "h2" | "h3" | "p" | "div";
  children: string;
  className?: string;
  id?: string;
  delay?: number;
  /** Play on mount instead of on scroll (for above-the-fold headings). */
  immediate?: boolean;
};

/**
 * Heading that rises line by line out of a mask.
 * On headings SplitText keeps the full string as the accessible name
 * (aria-label on the element, split pieces aria-hidden). It re-splits when
 * fonts load or the container resizes. The unsplit text ships in the HTML.
 */
export function SplitReveal({
  as = "div",
  children,
  className,
  id,
  delay = 0,
  immediate = false,
}: Props) {
  const Tag = as as "div";
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();

      mm.add(MOTION_OK, () => {
        SplitText.create(el, {
          type: "lines",
          mask: "lines",
          // Headings may carry the full string as aria-label; other elements
          // may not, so their split text stays readable as is.
          aria: as.startsWith("h") ? "auto" : "none",
          linesClass: "split-line",
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.lines, {
              yPercent: 108,
              duration: DUR.slow,
              stagger: 0.09,
              delay,
              scrollTrigger: immediate
                ? undefined
                : { trigger: el, start: "top 90%", once: true },
            }),
        });
      });
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} className={className} id={id}>
      {children}
    </Tag>
  );
}

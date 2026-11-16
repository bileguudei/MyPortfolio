"use client";

import { useRef } from "react";
import { gsap, MOTION_OK, SplitText, useGSAP } from "@/lib/gsap";

type Props = {
  children: string;
  className?: string;
};

/** Paragraph whose words light up one by one as it is scrolled through. */
export function ScrubText({ children, className }: Props) {
  const ref = useRef<HTMLParagraphElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();

      mm.add(MOTION_OK, () => {
        SplitText.create(el, {
          type: "words",
          // A paragraph may not carry aria-label; the words stay in the
          // accessibility tree as ordinary text instead.
          aria: "none",
          autoSplit: true,
          onSplit: (self) =>
            gsap.fromTo(
              self.words,
              // 0.38 keeps unlit words at 3:1 against the page (AA, large text).
              { opacity: 0.38 },
              {
                opacity: 1,
                ease: "none",
                stagger: 0.12,
                scrollTrigger: {
                  trigger: el,
                  start: "top 82%",
                  end: "bottom 52%",
                  scrub: true,
                },
              },
            ),
        });
      });
    },
    { scope: ref },
  );

  return (
    <p ref={ref} className={className}>
      {children}
    </p>
  );
}

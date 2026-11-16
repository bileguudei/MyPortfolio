"use client";

import { useRef, type HTMLAttributes, type ReactNode } from "react";
import { DUR, gsap, MOTION_OK, ScrollTrigger, useGSAP } from "@/lib/gsap";

type Props = HTMLAttributes<HTMLElement> & {
  as?: "section" | "div" | "article" | "header" | "footer";
  children: ReactNode;
};

/**
 * Section-level scroll choreography, declared in markup:
 *   data-rule  → hairline draws in from the left
 *   data-rise  → block rises and fades in (batched, so siblings stagger)
 *   data-wipe  → media is uncovered bottom-to-top
 * Children stay server-rendered; without JS or with reduced motion they are
 * simply visible.
 */
export function Fx({ as = "div", children, ...rest }: Props) {
  // One ref type for every allowed tag: they are all plain block elements.
  const Tag = as as "div";
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = ref.current;
      if (!root) return;
      const mm = gsap.matchMedia();

      mm.add(MOTION_OK, () => {
        const own = <T extends HTMLElement>(selector: string) =>
          gsap.utils
            .toArray<T>(selector, root)
            .filter((el) => el.closest("[data-fx]") === root);

        own("[data-rule]").forEach((el) => {
          gsap.from(el, {
            scaleX: 0,
            duration: DUR.slow,
            ease: "power3.inOut",
            scrollTrigger: { trigger: el, start: "top 94%", once: true },
          });
        });

        own("[data-wipe]").forEach((el) => {
          gsap.fromTo(
            el,
            { clipPath: "inset(100% 0% 0% 0%)" },
            {
              clipPath: "inset(0% 0% 0% 0%)",
              duration: DUR.slow,
              ease: "power3.inOut",
              scrollTrigger: { trigger: el, start: "top 88%", once: true },
            },
          );
        });

        const rise = own("[data-rise]");
        if (rise.length) {
          // Opacity only, never visibility: hidden content would drop out of
          // the tab order and keyboard users could not reach it.
          gsap.set(rise, { y: 28, opacity: 0 });
          ScrollTrigger.batch(rise, {
            start: "top 92%",
            once: true,
            onEnter: (batch) =>
              gsap.to(batch, {
                y: 0,
                opacity: 1,
                duration: DUR.base,
                stagger: 0.07,
                overwrite: true,
              }),
          });
        }
      });
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} data-fx="" {...rest}>
      {children}
    </Tag>
  );
}

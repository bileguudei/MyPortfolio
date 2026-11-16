"use client";

import { useInView } from "motion/react";
import { Fragment, useRef } from "react";
import ScrollVelocity from "@/components/bits/ScrollVelocity";

const type = "display whitespace-nowrap text-[clamp(3.25rem,9vw,9rem)] leading-none";

function Row({ items }: { items: string[] }) {
  return (
    <>
      {items.map((item) => (
        <Fragment key={item}>
          {item}
          <span className="mx-[0.28em] text-ember">/</span>
        </Fragment>
      ))}
    </>
  );
}

/**
 * Decorative band of the core stack; its speed follows scroll velocity
 * (React Bits' ScrollVelocity). The same list is readable in the table
 * above, so the band is hidden from assistive tech. The ticker is only
 * mounted while the band is near the viewport, so nothing animates offscreen.
 */
export function TechMarquee({ items }: { items: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const near = useInView(ref, { margin: "25% 0px 25% 0px" });

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="mt-16 overflow-clip border-y border-line py-5 md:mt-24 md:py-7"
    >
      {near ? (
        <ScrollVelocity
          texts={[<Row key="row" items={items} />]}
          velocity={48}
          numCopies={4}
          className={type}
        />
      ) : (
        <p className={type}>
          <Row items={items} />
        </p>
      )}
    </div>
  );
}

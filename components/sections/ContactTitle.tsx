"use client";

import { useRef } from "react";
import VariableProximity from "@/components/bits/VariableProximity";

type Props = {
  id: string;
  lines: string[];
};

/**
 * Closing headline. On fine pointers the letters gain weight and heat up
 * near the cursor (React Bits' VariableProximity driving the display font's
 * weight axis) — the one place the type itself reacts, pointing at the CTA.
 * Touch and reduced-motion users get the static headline.
 */
export function ContactTitle({ id, lines }: Props) {
  const container = useRef<HTMLHeadingElement>(null);

  return (
    <h2 ref={container} id={id} className="display t-h1">
      {lines.map((line) => (
        <span key={line} className="block">
          <VariableProximity
            label={line}
            containerRef={container}
            fromFontVariationSettings="'wght' 500"
            toFontVariationSettings="'wght' 800"
            fromColor="#edeae4"
            toColor="#ff4d00"
            radius={220}
            falloff="gaussian"
          />
        </span>
      ))}
    </h2>
  );
}

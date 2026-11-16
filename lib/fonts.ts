import { Geist_Mono, Inter_Tight } from "next/font/google";

// Both families were checked glyph by glyph for the Mongolian Cyrillic
// letters Ө ө Ү ү (many "Cyrillic" fonts leave them out).
//
// `subsets` only decides which files are preloaded: the generated CSS still
// carries every subset each family ships, so /mn pulls the cyrillic and
// cyrillic-ext files on demand via unicode-range.

/** Display and body: one variable grotesk, tight at large sizes. */
export const sans = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-sans-raw",
  display: "swap",
});

/** Labels, indices, figures. */
export const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono-raw",
  display: "swap",
  preload: false,
});

export const fontVariables = [sans.variable, mono.variable].join(" ");

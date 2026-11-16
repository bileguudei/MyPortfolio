import type { Page } from "@playwright/test";

export const locales = ["en", "mn"] as const;

export const projectSlugs = [
  "kuma",
  "reelscaption",
  "driver-drowsiness",
  "minigift",
  "chiglel",
] as const;

/** Collects real console errors and uncaught exceptions for a page. */
export function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(String(error)));
  return errors;
}

/** Scrolls through the page so every scroll-triggered reveal has fired. */
export async function scrollThrough(page: Page) {
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.7);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    window.scrollTo(0, document.documentElement.scrollHeight);
    await new Promise((resolve) => setTimeout(resolve, 400));
  });
}

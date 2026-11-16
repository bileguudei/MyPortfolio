import { expect, test } from "@playwright/test";
import { projectSlugs } from "./helpers";

test.describe("prefers-reduced-motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("no WebGL, no smooth scroll, everything already in its final state", async ({ page }) => {
    await page.goto("/en");
    await page.waitForTimeout(2000);

    await expect(page.locator(".gl-layer")).toHaveCount(0);
    await expect(page.locator("html")).not.toHaveClass(/lenis/);
    await expect(page.locator(".hero-person-img")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeInViewport();

    // Nothing waits for a scroll trigger: below-the-fold content is visible.
    const hidden = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("[data-rise], [data-rule], [data-wipe]")].filter(
        (el) => {
          const style = getComputedStyle(el);
          return style.visibility === "hidden" || Number(style.opacity) < 1;
        },
      ).length,
    );
    expect(hidden).toBe(0);
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the whole page is readable and navigable", async ({ page }) => {
    await page.goto("/en");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Bileguudei\s+Ijilmurun/);
    await expect(page.locator(".hero-person-img")).toBeVisible();
    for (const slug of projectSlugs) {
      await expect(page.locator(`a[href="/en/work/${slug}"]`)).toBeVisible();
    }
    await expect(page.locator('#contact a[href^="mailto:"]').first()).toBeVisible();

    await page.locator('a[href="/en/work/chiglel"]').click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Chiglel");
  });
});

test.describe("WebGL lifecycle", () => {
  test("the scene mounts on capable desktops and stops when the hero is gone", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "tier detection is exercised on desktop");
    await page.goto("/en");
    // WebGL loads on the visitor's first move.
    await page.mouse.move(400, 300);
    await page.mouse.move(700, 450);

    await expect(page.locator(".object-layer canvas")).toHaveCount(1, { timeout: 8000 });
    await expect(page.locator("html")).toHaveAttribute("data-gl", "on", { timeout: 12000 });

    // Leaving the home page unmounts the 3D layer.
    await page.goto("/en/work/kuma");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("KUMA");
    await expect(page.locator(".object-layer canvas")).toHaveCount(0);
  });

  test("the 3D layer comes back after a case study and the header link home", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "tier detection is exercised on desktop");
    await page.goto("/en");
    await page.mouse.move(400, 300);
    await page.mouse.move(700, 450);
    await expect(page.locator(".object-layer canvas")).toHaveCount(1, { timeout: 8000 });

    // Client-side navigation away (unmounts the renderer) and back.
    await page.locator('a[href="/en/work/kuma"]').click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("KUMA", { timeout: 12000 });
    await expect(page.locator(".object-layer canvas")).toHaveCount(0);
    await page.locator('header a[href="/en"]').first().click();
    await expect(page).toHaveURL(/\/en$/, { timeout: 12000 });
    await page.mouse.move(500, 350);

    await expect(page.locator(".object-layer canvas")).toHaveCount(1, { timeout: 8000 });
    await expect(page.locator("html")).toHaveAttribute("data-gl", "on", { timeout: 12000 });
    await expect(page.locator("html")).toHaveAttribute("data-object-front", "on", { timeout: 12000 });
  });
});

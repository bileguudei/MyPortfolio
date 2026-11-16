import { expect, test } from "@playwright/test";
import { locales, projectSlugs, scrollThrough, trackErrors } from "./helpers";

for (const locale of locales) {
  test.describe(`home /${locale}`, () => {
    test("renders the hero, every section and no errors", async ({ page }) => {
      const errors = trackErrors(page);
      await page.goto(`/${locale}`);

      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Bileguudei\s+Ijilmurun/);

      for (const slug of projectSlugs) {
        await expect(page.locator(`a[href="/${locale}/work/${slug}"]`)).toHaveCount(1);
      }
      for (const id of ["work", "about", "contact"]) {
        await expect(page.locator(`#${id}`)).toHaveCount(1);
      }

      await scrollThrough(page);
      await expect(page.locator("#contact")).toBeInViewport();
      expect(errors, errors.join("\n")).toEqual([]);
    });

    test("the hero name and call to action are visible straight away", async ({ page }) => {
      await page.goto(`/${locale}`, { waitUntil: "domcontentloaded" });
      // The intro is pure CSS: no waiting on hydration, fonts or WebGL.
      await expect(page.getByRole("heading", { level: 1 })).toBeInViewport({ timeout: 2500 });
      await expect(page.locator('[data-hero] a[href="#work"]')).toBeVisible({ timeout: 2500 });
    });

    test("never scrolls sideways", async ({ page }) => {
      await page.goto(`/${locale}`);
      await scrollThrough(page);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test("opens a case study and returns", async ({ page }) => {
      const errors = trackErrors(page);
      await page.goto(`/${locale}`);
      const link = page.locator(`a[href="/${locale}/work/reelscaption"]`);
      await link.scrollIntoViewIfNeeded();
      if (await page.locator('.slides[data-mode="swipe"]').count()) {
        // Phones and tablets: only the project on the stage takes taps;
        // focusing a link brings its project on.
        await link.focus();
        await page.keyboard.press("Enter");
      } else {
        await link.click();
      }

      // The wipe plus the route fetch; under a full parallel run with films
      // decoding, the fetch alone can take a few seconds.
      await expect(page).toHaveURL(new RegExp(`/${locale}/work/reelscaption$`), { timeout: 12000 });
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("ReelsCaption");
      const figure = page.getByText("39 → 94").first();
      await figure.scrollIntoViewIfNeeded();
      await expect(figure).toBeVisible();

      // The in-article back link (the header hides while scrolling down).
      const back = page.locator(`article a[href="/${locale}#work"]`);
      await back.scrollIntoViewIfNeeded();
      await back.click();
      await expect(page).toHaveURL(new RegExp(`/${locale}(#work)?$`));
      await expect(page.locator("#work")).toBeInViewport();
      expect(errors, errors.join("\n")).toEqual([]);
    });
  });
}

test("every project is its own screen, none hidden", async ({ page }) => {
  await page.goto("/en");
  const chapters = page.locator("[data-work-card]");
  await expect(chapters).toHaveCount(projectSlugs.length);
  // Plain scrolling reaches every screen: nothing pins, snaps or skips.
  for (const slug of projectSlugs) {
    const link = page.locator(`a[href="/en/work/${slug}"]`);
    await link.scrollIntoViewIfNeeded();
    await expect(link).toBeInViewport();
  }
});

test("the work slider draws on its WebGL stage and follows the scroll", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "phones and tablets get the swipe carousel");
  await page.goto("/en");
  const slides = page.locator(".slides");
  await expect(slides).toHaveAttribute("data-gl", "");
  // The third project's link fills the viewport: the stage shows its title.
  await page.locator("[data-work-card]").nth(2).scrollIntoViewIfNeeded();
  await expect(page.locator("[data-step-current]")).toHaveText("03");
  const title = page.locator("[data-slide-copy]").nth(2).locator("[data-slide-title]").first();
  await expect.poll(() => title.evaluate((el) => el.style.transform)).toBe("translate3d(0px, 0%, 0px)");
  const canvas = await page.locator(".slides-canvas").evaluate((c: HTMLCanvasElement) => c.width);
  expect(canvas).toBeGreaterThan(300);
});

test("phones and tablets swipe the projects sideways", async ({ page }, info) => {
  test.skip(info.project.name === "desktop", "desktop follows the page's scroll");
  await page.goto("/en");
  await expect(page.locator(".slides")).toHaveAttribute("data-mode", "swipe");
  const list = page.locator("[data-slide-list]");
  await list.scrollIntoViewIfNeeded();
  const box = (await list.boundingBox())!;
  const y = box.y + box.height / 2;
  // A real touch swipe, right to left: one project on.
  const cdp = await page.context().newCDPSession(page);
  const touch = (type: "touchStart" | "touchMove" | "touchEnd", x: number) =>
    cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: type === "touchEnd" ? [] : [{ x: Math.round(x), y: Math.round(y) }],
    });
  await touch("touchStart", box.x + box.width * 0.8);
  for (const f of [0.7, 0.6, 0.5, 0.4, 0.3, 0.2]) await touch("touchMove", box.x + box.width * f);
  await touch("touchEnd", box.x + box.width * 0.2);
  await expect(page.locator("[data-step-current]")).toHaveText("02");
  // The swipe ended on a link but did not open it.
  await expect(page).toHaveURL(/\/en$/);
  const film = page.locator("[data-work-card] video").nth(1);
  await expect.poll(() => film.evaluate((v: HTMLVideoElement) => !v.paused)).toBe(true);
  await page.locator("#contact").scrollIntoViewIfNeeded();
  await expect.poll(() => film.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
});

test("a screen's film plays while it is on screen and stops after", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "the carousel test covers phones and tablets");
  await page.goto("/en");
  const film = page.locator("[data-work-card] video").nth(1);
  await film.scrollIntoViewIfNeeded();
  await expect.poll(() => film.evaluate((v: HTMLVideoElement) => !v.paused)).toBe(true);
  await page.locator("#contact").scrollIntoViewIfNeeded();
  await expect.poll(() => film.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
});

test("language switch keeps the current page", async ({ page }) => {
  await page.goto("/en/work/chiglel");
  await page.locator('header a[hreflang="mn"]').click();
  await expect(page).toHaveURL(/\/mn\/work\/chiglel$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "mn");
  await expect(page.getByText("Хөгжүүлж байна").first()).toBeVisible();
});

test("unknown pages get the localized 404", async ({ page }) => {
  const response = await page.goto("/mn/does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Энд юу ч алга.");
});

test("the root redirects to a locale", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/(en|mn)$/);
});

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { locales, scrollThrough } from "./helpers";

const tags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

for (const locale of locales) {
  for (const path of ["", "/work/kuma"]) {
    test(`axe: /${locale}${path}`, async ({ page }) => {
      await page.goto(`/${locale}${path}`);
      // Let reveals finish so contrast is measured on final colours.
      await scrollThrough(page);
      await page.waitForTimeout(1200);

      const results = await new AxeBuilder({ page }).withTags(tags).analyze();
      const summary = results.violations.map(
        (violation) =>
          `${violation.id} (${violation.impact}): ${violation.nodes
            .slice(0, 3)
            .map((node) => node.target.join(" "))
            .join(" | ")}`,
      );
      expect(summary, summary.join("\n")).toEqual([]);
    });
  }
}

test("skip link is the first stop and moves focus to the content", async ({ page, isMobile }) => {
  test.skip(Boolean(isMobile), "keyboard flow is covered on desktop");
  await page.goto("/en");
  await page.keyboard.press("Tab");
  const skip = page.locator(".skip-link");
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
});

test("every project is reachable and visibly focused by keyboard", async ({ page, isMobile }) => {
  test.skip(Boolean(isMobile), "keyboard flow is covered on desktop");
  await page.goto("/en");
  const link = page.locator('a[href="/en/work/kuma"]');
  await link.focus();
  await expect(link).toBeFocused();
  const outline = await link.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe("none");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/en\/work\/kuma$/);
});

test("mobile menu opens, traps the page behind it and closes with Escape", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "the menu button only exists on small screens");
  await page.goto("/en");
  const toggle = page.locator('button[aria-controls="site-menu"]');
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator("#main")).toHaveAttribute("inert", "");

  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#main")).not.toHaveAttribute("inert", "");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

import { expect, test } from "@playwright/test";
import { locales, projectSlugs } from "./helpers";

test.describe.configure({ mode: "parallel" });

for (const locale of locales) {
  test(`metadata: /${locale}`, async ({ page, request }) => {
    await page.goto(`/${locale}`);

    await expect(page).toHaveTitle(/Bileguudei Ijilmurun/);
    const description = await page.locator('meta[name="description"]').getAttribute("content");
    expect(description?.length ?? 0).toBeGreaterThan(60);

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      new RegExp(`/${locale}$`),
    );
    for (const code of [...locales, "x-default"]) {
      await expect(page.locator(`link[rel="alternate"][hreflang="${code}"]`)).toHaveCount(1);
    }

    const image = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(image).toBeTruthy();
    const imageResponse = await request.get(new URL(image!).pathname);
    expect(imageResponse.status()).toBe(200);
    expect(imageResponse.headers()["content-type"]).toContain("image/png");

    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.map((block) => JSON.parse(block)["@type"]);
    expect(types).toEqual(expect.arrayContaining(["Person", "WebSite"]));

    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  });
}

test("case studies have their own title, description and card", async ({ page, request }) => {
  await page.goto("/en/work/minigift");
  await expect(page).toHaveTitle("MiniGift Studio — Digital gifting commerce — Bileguudei Ijilmurun");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/en\/work\/minigift$/);
  const image = await page.locator('meta[property="og:image"]').getAttribute("content");
  expect(image).toContain("/og/minigift.png");
  expect((await request.get("/og/minigift.png")).status()).toBe(200);
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(blocks.map((block) => JSON.parse(block)["@type"])).toContain("CreativeWork");
});

test("robots.txt and sitemap.xml list every page in both languages", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain("sitemap.xml");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  for (const locale of locales) {
    expect(xml).toContain(`/${locale}</loc>`);
    for (const slug of projectSlugs) expect(xml).toContain(`/${locale}/work/${slug}</loc>`);
  }
});

// Shared look for images rendered off-screen with Playwright (project
// plates, Open Graph cards). Mirrors the tokens in app/globals.css.

export const colors = {
  ink: "#0a0a0a",
  line: "#272523",
  ash: "#8c8781",
  bone: "#edeae4",
  ember: "#ff4d00",
};

/** Same families the site loads through next/font. */
export const fontLinks = `
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@300..800&family=Geist+Mono:wght@400;500&display=block">
`;

export const baseCss = `
  * { margin: 0; box-sizing: border-box; }
  body { background: radial-gradient(55% 50% at 8% -6%, rgb(255 77 0 / 0.1), transparent 70%), linear-gradient(180deg, #0a0a0a, #0f0e0d); background-color: ${colors.ink}; color: ${colors.bone}; overflow: hidden; -webkit-font-smoothing: antialiased; }
  .display { font-family: "Inter Tight", system-ui, sans-serif; font-weight: 600; letter-spacing: -0.045em; line-height: 0.95; }
  .mega { font-weight: 600; letter-spacing: -0.055em; line-height: 0.86; text-transform: uppercase; }
  .label { font: 400 20px/1.3 "Geist Mono", ui-monospace, monospace; letter-spacing: 0.08em; text-transform: uppercase; color: ${colors.ash}; }
  .label b { color: ${colors.ember}; font-weight: 400; }
  .rule { height: 1px; background: ${colors.line}; }
  .ember { color: ${colors.ember}; }
`;

export async function render(context, html, width, height) {
  const page = await context.newPage();
  await page.setViewportSize({ width, height });
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const shot = await page.screenshot({ type: "png" });
  await page.close();
  return shot;
}

export async function launch(chromium) {
  // Uses the Chrome already installed on this machine (no browser download).
  // Set PW_CHANNEL="" to use Playwright's bundled Chromium instead.
  const channel = process.env.PW_CHANNEL ?? "chrome";
  return chromium.launch(channel ? { channel } : {});
}

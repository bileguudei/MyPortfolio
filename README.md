# Bileguudei Ijilmurun — Portfolio

"Хар бэх, цог" — хэмжсэн тоогоор ярьдаг full-stack инженерийн portfolio.
Next.js 16 · React 19 · Tailwind 4 · GSAP + ScrollTrigger + Lenis · Three.js / React Three Fiber · Motion · React Bits · next-intl (EN / MN).

## Ажиллуулах

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm run start
```

## Контент солих

| Юу | Хаана |
|---|---|
| Төслүүд (нэр, тоо, тайлбар EN/MN) | `content/projects.ts` |
| Чадварууд | `content/skills.ts` |
| Архив (жижиг төслүүд) | `content/archive.ts` — `visible: true` болговол гарна |
| UI текст | `messages/en.json`, `messages/mn.json` |
| Нэр, имэйл, GitHub | `content/site.ts` |

Бүх тоо resume-ээс авсан. Шинэ тоо нэмэхдээ эх сурвалжтай байлгаарай.

## Хөрөг зураг

1. Зургаа `assets/portrait/source.jpg` (эсвэл `.png` / `.webp`) нэрээр хий. Босоо, толгой мөр харагдсан, 1600px-ээс өндөр. `public/` биш — эх зураг бүтэн хэмжээгээрээ сайтаар тарахгүй.
2. `npm run portrait`

Halftone poster, About зураг, OG зураг бүгд дахин үүснэ. Зураг байхгүй үед хийсвэр "цог" дүрс гарна.

macOS дээр `scripts/segment-portrait.swift` (Apple Vision, локал) хүнийг дэвсгэрээс тусгаарлаж `assets/portrait/mask.png` үүсгэнэ. Ингэснээр дэвсгэр halftone-д гарахгүй, About зурагт бүдгэрнэ, crop толгойноос эхэлнэ. Зураг солиход mask автоматаар дахин үүснэ.
## Төслийн reel (видео)

`npm run reels` → `public/work/<slug>/reel.<hash>.mp4` (1600×1000, дуугүй, давтагдана) + `reel.<hash>.jpg` poster. Файлын нэрэнд контентын hash орно (`content/reels.json`), тиймээс дахин render хийсэн бичлэг шинэ URL-тэй болж, browser/CDN cache хуучныг харуулахгүй. Эх сурвалж `scripts/make-reels.mjs` дотор, `content/media-credits.json`-д бичигдэнэ:

- **film** — төслийн өөрийн promo кино (KUMA, ReelsCaption; Desktop дээрх файл, `REEL_SRC_<SLUG>=...` гэж солино).
- **story** — загварыг амьд demo дээр нь эхнээс нь дуустал тоглуулж бодит хугацаанд бичсэн (MiniGift · Цэцгэн хайрын түүх: түгжээ → цэцэг → зураг → дугтуй → захидал → дурсгал).
- **site** — амьд сайтыг кадр кадраар бичих (одоо ашиглаагүй, script-д бэлэн).
- **study** — public build байхгүй төсөлд `scripts/reels/<slug>.html` motion study (Camera Quest). Дэлгэц дээр "Schematic" гэж бичээстэй; тоонууд нь resume-ээс, дүрс нь схем.
- Chiglel: **clip** — Remotion промо `~/Desktop/chiglel-marketing-video`: апп-ын өөрийн `ub-scene.json` (бодит барилгын цэгүүд, OSRM-ээр бодсон 14 зогсоолтой маршрут 176.7 → 89.7 км) ба `/ui/screens`-ээс авсан жинхэнэ дэлгэцүүд.
- Driver Drowsiness: **clip** — FatigueGuard аппын промо, Remotion-оор `~/Desktop/fatigueguard-marketing-video`-д хийсэн (дэлгэцүүд нь [repo](https://github.com/bileguudei/intern-4ab-driver-fatigue)-ийн кодоос дахин бүтээгдсэн, аяллын тоонууд жишээ). Тэнд `npm run render` хийгээд энд `npm run reels -- driver-drowsiness`.

Нэг төсөл: `npm run reels -- kuma`. Study-г урьдчилж харах: `npm run reels -- --preview`. ffmpeg (libx264) хэрэгтэй.

Home дээр төслүүд 2 баганатай картын grid (утсан дээр 1 багана). Хулганатай үед картын бичлэг hover дээр тоглоно, touch дэлгэц дээр карт дэлгэцэнд орохоор тоглоно. Reduced-motion, JS-гүй үед poster зураг харагдана.

## Төслийн cover зураг

```bash
npm run covers              # бүгд
npm run covers -- chiglel   # ганц төсөл
```

Дараалал: `public/work/<slug>/source.png` (өөрийн screenshot) → `assets/work/<slug>/` постерууд → амьд сайтын screenshot → typographic plate. Эх сурвалж `content/media-credits.json`-д бичигдэнэ.

## Бусад script

| Команд | Үүрэг |
|---|---|
| `npm run og` | Open Graph зургууд (`public/og/`) |
| `npm run typecheck` / `npm run lint` | Шалгалт |
| `npm test` | Playwright: smoke, a11y (axe), reduced-motion, JS-гүй, SEO — 3 дэлгэцийн хэмжээ, 2 хэл |

Script-үүд суусан Chrome-ийг ашиглана (`PW_CHANNEL=""` гэвэл Playwright-ийн Chromium).

## Бүтэц

- `app/[locale]/` — хуудсууд (home, `work/[slug]`, 404), metadata
- `components/sections/` — home-ийн хэсгүүд
- `components/motion/` — GSAP primitive-ууд (`Fx`, `SplitReveal`, `ScrubText`, `ReelVideo`, `TransitionLink`)
- `components/gl/` — WebGL: hero-ийн цэгэн хөрөг (`portrait-dots.ts`: цэгүүд нисэж ирээд нийлнэ, scroll-д тарна, cursor-оос зайлна), хөргийн 4 буланд 3D код дүрсүүд (`code-icons.ts`: `</>`, `{ }`, cursor, `>_` — мөнгөн хром ба цог шил), доорх section-уудад хэлбэр сольдог хром хоолой (`ObjectCanvas.tsx`), чанарын шат (`quality.ts`)
- `components/bits/` — React Bits-ээс авсан компонентууд
- `lib/` — фонт, GSAP token, scroll, SEO

## Motion-ийн дүрэм

- GSAP: scroll, timeline, shader uniform. Motion: UI төлөв (цэс, хэл, toast). CSS: hover / focus, hero intro.
- Hero-ийн нэр CSS-ээр гарна (LCP hydration хүлээхгүй).
- `prefers-reduced-motion`: smooth scroll, scrub, WebGL унтарна; бүх зүйл эцсийн төлөвтөө.
- WebGL зөвхөн home дээр, hardware GPU-тэй үед. Үгүй бол статик halftone poster.

## Deploy

Vercel. Production домэйнээ `NEXT_PUBLIC_SITE_URL`-д тавь (canonical, sitemap, OG үүнээс хамаарна).

## Лиценз

Inter Tight, Geist Mono — SIL OFL 1.1 (Google Fonts, `next/font`-оор). React Bits компонентууд — MIT + Commons Clause.

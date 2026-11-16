import loops from "./loops.json";
import reels from "./reels.json";
import type { Locale } from "@/i18n/routing";

export type L = Record<Locale, string>;

export type Metric = {
  /** A figure ("−84%"), or words that need translating ({ en, mn }). */
  value: string | L;
  label: L;
};

/** A metric's value in the given locale. */
export function metricValue(metric: Pick<Metric, "value">, locale: Locale) {
  return typeof metric.value === "string" ? metric.value : metric.value[locale];
}

export type Project = {
  slug: string;
  name: string;
  kind: L;
  year: string;
  /** Shown as a small status tag, e.g. "In development". */
  status?: L;
  /** Team / context note taken from the resume. */
  context?: L;
  url?: string;
  urlLabel?: string;
  /** Only set for public repositories. */
  repo?: string;
  headline: Metric;
  metrics: Metric[];
  summary: L;
  points: L[];
  stack: string[];
  cover: { src: string; width: number; height: number; alt: L };
  /**
   * What the moving footage in public/work/<slug>/reel.<hash>.mp4 is (built by
   * scripts/make-reels.mjs): the project's own promo film, a capture of the
   * live site, a template played through on the live demo, or a schematic
   * motion study for projects with no public build.
   */
  reel: "film" | "site" | "demo" | "study" | "app";
  /**
   * What the home page's slider loop (public/work/<slug>/loop.<hash>.mp4) is,
   * when it is not simply textless footage of the same kind as the reel:
   * "mockup" (the footage on a device in a studio plate) or "art" (a loop
   * recomposed from the project's own art).
   */
  loop?: "mockup" | "art";
};

// Every figure and claim below comes from the resume
// (Bileguudei_Ijilmurun_Resume_KUMA_MN.pdf). Mongolian text is verbatim;
// English is a direct translation. Do not add numbers that are not sourced.
export const projects: Project[] = [
  {
    slug: "kuma",
    name: "KUMA",
    kind: {
      en: "Learning app for grades 6\u2060–\u206012",
      mn: "6\u2060–\u206012-р ангийн сургалтын апп",
    },
    year: "2026",
    context: { en: "Team project", mn: "Багийн төсөл" },
    url: "https://kumalearn.online",
    urlLabel: "kumalearn.online",
    // User count from the KUMA admin dashboard, Nov 2026.
    headline: {
      value: "2,500+",
      label: { en: "Registered users", mn: "Бүртгэлтэй хэрэглэгч" },
    },
    metrics: [
      {
        value: "2,500+",
        label: { en: "Registered users", mn: "Бүртгэлтэй хэрэглэгч" },
      },
      { value: "6–12", label: { en: "Grades served", mn: "Хамрах анги" } },
      {
        value: { en: "Real-time", mn: "Бодит цагт" },
        label: { en: "Same-grade battles", mn: "Ижил ангийн тулаан" },
      },
    ],
    summary: {
      en: "A learning app for students in grades 6–12: daily review, tiered exercises, XP rewards, real-time battles and an AI tutor.",
      mn: "6–12-р ангийн сурагчдад зориулсан сургалтын апп: өдөр тутмын давтлага, шаталсан дасгал, XP урамшуулал, бодит цагийн тулаан, AI туслах.",
    },
    points: [
      {
        en: "Built daily review, tiered exercises and the XP reward logic, and matchmaking that pairs students from the same grade in real-time battles.",
        mn: "Өдөр тутмын давтлага, шаталсан дасгал, XP урамшууллын логик хөгжүүлж, бодит цагийн тулаанд ижил ангийн сурагчдыг тааруулдаг болгосон.",
      },
      {
        en: "Live with students: 2,500+ registered users.",
        mn: "Сурагчид бодитоор ашиглаж байна: 2,500+ бүртгэлтэй хэрэглэгч.",
      },
      {
        en: "Built an AI tutor that explains the problems a student got wrong. Students can ask by voice about problems that include images.",
        mn: "Сурагчийн буруу бодсон даалгаврыг тайлбарладаг AI сургалтын туслах хөгжүүлсэн. Сурагчид зурагтай бодлогын талаар дуугаар асууж болно.",
      },
    ],
    stack: [
      "React Native",
      "Expo",
      "TypeScript",
      "Hono",
      "Cloudflare Workers",
      "WebSockets",
    ],
    reel: "film",
    cover: {
      src: "/work/kuma/cover.jpg",
      width: 1600,
      height: 1000,
      alt: { en: "KUMA learning app", mn: "KUMA сургалтын апп" },
    },
  },
  {
    slug: "reelscaption",
    name: "ReelsCaption",
    kind: { en: "AI video captioning SaaS", mn: "AI видео хадмалын SaaS" },
    year: "2026",
    url: "https://reelscaption.com",
    urlLabel: "reelscaption.com",
    headline: {
      value: "14.5% / 7.5%",
      label: { en: "Speech recognition WER / CER", mn: "Яриа танилтын WER / CER" },
    },
    metrics: [
      {
        value: "39 → 94",
        label: { en: "Performance score", mn: "Гүйцэтгэлийн оноо" },
      },
      {
        value: "14.5%",
        label: { en: "Word error rate (WER)", mn: "Үгийн алдааны хувь (WER)" },
      },
      {
        value: "7.5%",
        label: { en: "Character error rate (CER)", mn: "Үсгийн алдааны хувь (CER)" },
      },
    ],
    summary: {
      en: "A SaaS that generates captions for Mongolian video automatically, from upload to export.",
      mn: "Монгол видеонд автомат хадмал үүсгэх SaaS — файл оруулахаас экспорт хүртэл.",
    },
    points: [
      {
        en: "Built the whole flow: file upload, speech-to-text, caption editing, and SRT/MP4 export.",
        mn: "Монгол видеонд автомат хадмал үүсгэх SaaS-ийн файл оруулах, speech-to-text, хадмал засварлах, SRT/MP4 экспортлох бүх урсгалыг хөгжүүлсэн.",
      },
      {
        en: "Mongolian speech-to-text accuracy: 14.5% word error rate (WER) and 7.5% character error rate (CER).",
        mn: "Монгол яриаг текст болгох нарийвчлал: үгийн алдааны хувь (WER) 14.5%, үсгийн алдааны хувь (CER) 7.5%.",
      },
      {
        en: "Introduced checkpoint/retry so interrupted video jobs resume, signed downloads, and temp-file cleanup. Time to visible content went from 8.3 to 2.4 s (−71%) and the performance score from 39 to 94.",
        mn: "Видео боловсруулах ажил тасарвал үргэлжлүүлэх (checkpoint/retry), файлыг аюулгүй татах (signed download), түр файл цэвэрлэх механизмууд нэвтрүүлсэн. Агуулга харагдах хугацаа 8.3 → 2.4 сек (−71%), гүйцэтгэлийн (performance) оноо 39 → 94 болсон.",
      },
    ],
    stack: ["Next.js", "TypeScript", "Supabase", "Speech-to-text", "Signed URLs"],
    reel: "film",
    loop: "mockup",
    cover: {
      src: "/work/reelscaption/cover.jpg",
      width: 1600,
      height: 1000,
      alt: { en: "ReelsCaption website", mn: "ReelsCaption вэбсайт" },
    },
  },
  {
    slug: "driver-drowsiness",
    name: "Driver Drowsiness Detection",
    kind: {
      en: "Real-time computer vision",
      mn: "Бодит цагийн computer vision",
    },
    year: "2026",
    context: {
      en: "Pinecone Academy · Internship project",
      mn: "Pinecone Academy · Internship төсөл",
    },
    repo: "https://github.com/bileguudei/intern-4ab-driver-fatigue",
    headline: {
      value: "15 FPS",
      label: { en: "Real-time detection", mn: "Бодит цагийн илрүүлэлт" },
    },
    metrics: [
      {
        value: "15 FPS",
        label: { en: "Real-time detection", mn: "Бодит цагийн илрүүлэлт" },
      },
      {
        value: { en: "10 s", mn: "10 сек" },
        label: { en: "Camera calibration", mn: "Камер тохируулах хугацаа" },
      },
      {
        value: { en: "2 s", mn: "2 сек" },
        label: { en: "Eyes closed before alert", mn: "Нүдээ аньснаас хойш анхааруулах хүртэл" },
      },
    ],
    summary: {
      en: "A system that detects driver drowsiness from camera frames in real time.",
      mn: "Жолоочийн нойрмоглолтыг камерын дүрсээс бодит цагт илрүүлэх систем.",
    },
    points: [
      {
        en: "Built a 15 FPS system that detects driver drowsiness from camera frames in real time, using MediaPipe with EAR/PERCLOS, yawning and head-pose signals.",
        mn: "Жолоочийн нойрмоглолтыг камерын дүрсээс бодит цагт илрүүлэх 15 FPS системийг MediaPipe, EAR/PERCLOS, yawning, head pose үзүүлэлтүүдээр хөгжүүлсэн.",
      },
      {
        en: "Used adaptive calibration, temporal filtering and regression testing to limit false alarms caused by movement; implemented a 10-second camera calibration and an alert after 2 seconds of closed eyes.",
        mn: "Adaptive calibration, temporal filtering, regression testing ашиглан хөдөлгөөнөөс үүдэх буруу дохиог хязгаарлаж, 10 секунд камер тохируулах, 2 секунд нүдээ анихад анхааруулах нөхцөл хэрэгжүүлсэн.",
      },
    ],
    stack: ["MediaPipe", "EAR / PERCLOS", "Head pose", "Temporal filtering", "Regression tests"],
    reel: "app",
    loop: "mockup",
    cover: {
      src: "/work/driver-drowsiness/cover.jpg",
      width: 1600,
      height: 1000,
      alt: {
        en: "Driver Drowsiness Detection",
        mn: "Жолоочийн нойрмоглолт илрүүлэх систем",
      },
    },
  },
  {
    slug: "minigift",
    name: "MiniGift Studio",
    kind: { en: "Digital gifting commerce", mn: "Дижитал бэлгийн платформ" },
    year: "2026",
    url: "https://minigift.online",
    urlLabel: "minigift.online",
    headline: {
      value: "−84%",
      label: { en: "Image bundle size", mn: "Зургийн багцын хэмжээ" },
    },
    metrics: [
      {
        value: "−84%",
        label: {
          en: "Image bundle (48.7 → 8.0 MB)",
          mn: "Зургийн багц (48.7 → 8.0 MB)",
        },
      },
      {
        // Language-neutral: the four digits of the unlock code.
        value: "••••",
        label: { en: "4-digit code to open a gift", mn: "Бэлэг нээх 4 оронтой код" },
      },
      {
        value: { en: "7 days", mn: "7 хоног" },
        label: { en: "Automatic deletion", mn: "Автомат устгал" },
      },
    ],
    summary: {
      en: "A digital gifting platform with interactive templates, private links and verified payments.",
      mn: "Интерактив загвартай, хугацаатай холбоос, баталгаажсан төлбөртэй дижитал бэлгийн платформ.",
    },
    points: [
      {
        en: "Built the platform on Next.js with Supabase Auth and RLS: interactive templates, photo/audio/letter content, 4-digit codes, expiring links and automatic deletion after 7 days.",
        mn: "Next.js, Supabase Auth/RLS ашиглан интерактив загвартай дижитал бэлгийн платформ хөгжүүлж; зураг/аудио/захиа, 4 оронтой код, хугацаатай холбоос, 7 хоногийн автомат устгал хэрэгжүүлсэн.",
      },
      {
        en: "Implemented signed payment webhooks and a transaction workflow that guards against duplicate requests, and cut the image bundle from 48.7 to 8.0 MB (−84%).",
        mn: "Төлбөрийг аюулгүй баталгаажуулах (signed payment webhook), давхар хүсэлтээс хамгаалах transaction workflow хэрэгжүүлж, зургийн багцын хэмжээг 48.7 → 8.0 MB (−84%) болгон бууруулсан.",
      },
    ],
    stack: ["Next.js", "Supabase Auth", "RLS", "Payment webhooks", "TypeScript"],
    reel: "demo",
    loop: "art",
    cover: {
      src: "/work/minigift/cover.jpg",
      width: 1600,
      height: 1000,
      alt: { en: "MiniGift Studio website", mn: "MiniGift Studio вэбсайт" },
    },
  },
  {
    slug: "chiglel",
    name: "Chiglel",
    kind: { en: "Delivery route planning", mn: "Хүргэлтийн маршрут төлөвлөлт" },
    year: "2026",
    status: { en: "In development", mn: "Хөгжүүлж байна" },
    headline: {
      value: "5.4×",
      label: { en: "Searchable buildings", mn: "Хайлтаар олдох барилга" },
    },
    metrics: [
      {
        value: "5.4×",
        label: {
          en: "Searchable buildings (4,335 → 23,287)",
          mn: "Хайлтаар олдох барилга (4,335 → 23,287)",
        },
      },
      {
        value: "−49%",
        label: {
          en: "14-stop test route (176.7 → 89.7 km)",
          mn: "14 зогсоолтой туршилтын маршрут (176.7 → 89.7 км)",
        },
      },
      {
        value: "251,044",
        label: { en: "Building records processed", mn: "Боловсруулсан барилгын мэдээлэл" },
      },
    ],
    summary: {
      en: "Address search and route optimisation for deliveries in Ulaanbaatar.",
      mn: "Улаанбаатарын хүргэлтийн хаяг хайлт, маршрут оновчлол.",
    },
    points: [
      {
        en: "Built delivery address search and route optimisation with PostGIS and OSRM; implemented time windows, capacity constraints, offline sync and daily backups.",
        mn: "PostGIS/OSRM ашиглан хүргэлтийн хаяг хайлт, маршрут оновчлол хөгжүүлж; хугацааны цонх, нөөцийн хязгаарлалт, интернэтгүй үеийн синхрончлол (offline sync), өдөр тутмын backup хэрэгжүүлсэн.",
      },
      {
        en: "Processed 251,044 building records and raised the number of searchable buildings from 4,335 to 23,287 (5.4×). Shortened a 14-stop test route from 176.7 to 89.7 km (−49%).",
        mn: "251,044 барилгын мэдээлэл боловсруулж, хайлтаар олдох барилгын тоог 4,335 → 23,287 (5.4×) болгосон. 14 зогсоолтой туршилтын маршрутын уртыг 176.7 → 89.7 км (−49%) болгон богиносгосон.",
      },
    ],
    stack: ["Next.js", "PostgreSQL", "PostGIS", "OSRM", "Offline sync"],
    reel: "app",
    cover: {
      src: "/work/chiglel/cover.jpg",
      width: 1600,
      height: 1000,
      alt: { en: "Chiglel route planning", mn: "Chiglel маршрут төлөвлөлт" },
    },
  },
];

/**
 * A project's reel. File names carry a content hash (content/reels.json,
 * written by scripts/make-reels.mjs), so a re-rendered reel is a new URL and
 * no cache can serve the old one.
 */
export function reelOf(project: Pick<Project, "slug">) {
  const hash = (reels as Record<string, string>)[project.slug];
  return {
    src: `/work/${project.slug}/reel.${hash}.mp4`,
    poster: `/work/${project.slug}/reel.${hash}.jpg`,
  };
}

export function getProject(slug: string) {
  return projects.find((p) => p.slug === slug);
}

export function pad(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * The film behind a project's screen in the home page's work slider: its
 * loop (content/loops.json, scripts/make-reels.mjs --loops), or the reel
 * when it has none.
 */
export function loopOf(project: Pick<Project, "slug">) {
  const hash = (loops as Record<string, string>)[project.slug];
  if (!hash) return reelOf(project);
  return {
    src: `/work/${project.slug}/loop.${hash}.mp4`,
    poster: `/work/${project.slug}/loop.${hash}.jpg`,
  };
}

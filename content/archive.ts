import type { L } from "./projects";

export type ArchiveItem = {
  name: string;
  kind: L;
  year: string;
  stack: string;
  url?: string;
  /**
   * Stays false until the owner confirms the project may be shown publicly.
   * The Archive section renders only when at least one item is visible.
   */
  visible: boolean;
};

// Drafted from each project's README on the owner's machine.
export const archive: ArchiveItem[] = [
  {
    name: "Kart Battle",
    kind: {
      en: "Multiplayer 3D kart battle in the browser",
      mn: "Браузер дээрх multiplayer 3D kart battle тоглоом",
    },
    year: "2026",
    stack: "TypeScript · Three.js · Server-authoritative netcode",
    visible: false,
  },
  {
    name: "HEXA",
    kind: {
      en: "Online store for wooden wall shelves",
      mn: "Модон ханын тавиурын онлайн дэлгүүр",
    },
    year: "2026",
    stack: "Next.js · Prisma · Zustand · GSAP",
    visible: false,
  },
  {
    name: "Lab Results Explainer",
    kind: {
      en: "Education-only explanations of lab results, Mongolian-first",
      mn: "Шинжилгээний хариуг энгийн хэлээр тайлбарлах боловсролын апп",
    },
    year: "2026",
    stack: "Next.js · Prisma · PostgreSQL",
    visible: false,
  },
  {
    name: "AI Nexus Directory",
    kind: {
      en: "Auto-updating directory of AI tools and daily AI news",
      mn: "AI хэрэгсэл, өдөр тутмын AI мэдээний автомат шинэчлэгддэг лавлах",
    },
    year: "2026",
    stack: "Next.js · Supabase · Vercel Cron",
    visible: false,
  },
  {
    name: "Iron Throne Monopoly",
    kind: {
      en: "Monopoly-style board game with AI opponents",
      mn: "AI өрсөлдөгчтэй Monopoly маягийн самбарын тоглоом",
    },
    year: "2026",
    stack: "React · Vite · PeerJS",
    visible: false,
  },
];

export const visibleArchive = archive.filter((item) => item.visible);

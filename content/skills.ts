// From the "Technical skills" block of the resume; C++ and Java added by
// the owner (2026-11-15).
export const skillGroups = [
  {
    key: "languages",
    items: ["TypeScript", "JavaScript", "Python", "SQL", "C++", "Java"],
  },
  {
    key: "frontend",
    items: ["React", "Next.js", "React Native", "Expo", "Tailwind CSS"],
  },
  {
    key: "backend",
    items: ["Node.js", "FastAPI", "Hono", "REST APIs", "WebSockets", "GraphQL", "Async jobs"],
  },
  {
    key: "data",
    items: ["PostgreSQL", "PostGIS", "MongoDB", "Supabase", "Cloudflare", "Modal", "Vercel"],
  },
  {
    key: "ai",
    items: [
      "RAG",
      "LLM APIs",
      "ONNX Runtime",
      "MediaPipe",
      "RF-DETR",
      "OpenCV",
      "JWT",
      "RLS",
      "Signed URLs",
      "Payment webhooks",
      "Automated testing",
    ],
  },
] as const;

export type SkillGroupKey = (typeof skillGroups)[number]["key"];

export const marqueeTech = [
  "TypeScript",
  "React",
  "Next.js",
  "React Native",
  "PostgreSQL",
  "PostGIS",
  "FastAPI",
  "Supabase",
  "Cloudflare",
  "MediaPipe",
] as const;

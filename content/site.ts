export const site = {
  name: "Bileguudei Ijilmurun",
  firstName: "Bileguudei",
  lastName: "Ijilmurun",
  role: "Full-Stack Software Engineer",
  email: "ibileguudei@gmail.com",
  github: "https://github.com/bileguudei",
  githubHandle: "bileguudei",
  location: {
    city: "Ulaanbaatar",
    country: "MN",
    lat: 47.9184,
    lng: 106.9177,
    timeZone: "Asia/Ulaanbaatar",
  },
} as const;

function resolveSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}

export const siteUrl = resolveSiteUrl().replace(/\/$/, "");

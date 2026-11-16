import type { MetadataRoute } from "next";
import { siteUrl } from "@/content/site";
import { routing } from "@/i18n/routing";
import { allPaths } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return allPaths().flatMap((path) =>
    routing.locales.map((locale) => ({
      url: `${siteUrl}/${locale}${path}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: path === "" ? 1 : 0.7,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((code) => [code, `${siteUrl}/${code}${path}`]),
        ),
      },
    })),
  );
}

import type { Metadata } from "next";
import { projects, type Project } from "@/content/projects";
import { site, siteUrl } from "@/content/site";
import { routing, type Locale } from "@/i18n/routing";

/** hreflang map for a locale-less path such as "" or "/work/kuma". */
export function alternates(path: string, locale: Locale): Metadata["alternates"] {
  const languages = Object.fromEntries(
    routing.locales.map((code) => [code, `${siteUrl}/${code}${path}`]),
  );
  return {
    canonical: `${siteUrl}/${locale}${path}`,
    languages: { ...languages, "x-default": `${siteUrl}/${routing.defaultLocale}${path}` },
  };
}

export const ogLocale: Record<Locale, string> = { en: "en_US", mn: "mn_MN" };

/** Static Open Graph card rendered by scripts/render-og.mjs. */
export function ogImage(name: string, alt: string) {
  return { url: `/og/${name}.png`, width: 1200, height: 630, alt };
}

export function personJsonLd(locale: Locale, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${siteUrl}/#person`,
    name: site.name,
    givenName: site.firstName,
    familyName: site.lastName,
    jobTitle: site.role,
    description,
    url: `${siteUrl}/${locale}`,
    email: `mailto:${site.email}`,
    sameAs: [site.github],
    address: {
      "@type": "PostalAddress",
      addressLocality: site.location.city,
      addressCountry: site.location.country,
    },
    knowsAbout: ["TypeScript", "React", "Next.js", "React Native", "PostgreSQL", "FastAPI"],
  };
}

export function websiteJsonLd(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    url: `${siteUrl}/${locale}`,
    name: site.name,
    inLanguage: locale,
    author: { "@id": `${siteUrl}/#person` },
  };
}

export function projectJsonLd(project: Project, locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.name,
    description: project.summary[locale],
    url: `${siteUrl}/${locale}/work/${project.slug}`,
    inLanguage: locale,
    dateCreated: project.year,
    keywords: project.stack.join(", "),
    author: { "@id": `${siteUrl}/#person` },
    ...(project.url ? { sameAs: project.url } : {}),
  };
}

export function allPaths() {
  return ["", ...projects.map((project) => `/work/${project.slug}`)];
}

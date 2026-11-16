import type { Metadata, Viewport } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { GLRoot } from "@/components/gl/GLRoot";
import { Cursor } from "@/components/ui/Cursor";
import { Footer } from "@/components/layout/Footer";
import { Nav } from "@/components/layout/Nav";
import { Providers } from "@/components/providers/Providers";
import { JsonLd } from "@/components/ui/JsonLd";
import { site, siteUrl } from "@/content/site";
import { routing } from "@/i18n/routing";
import { fontVariables } from "@/lib/fonts";
import { alternates, ogImage, ogLocale, personJsonLd, websiteJsonLd } from "@/lib/seo";
import "../globals.css";

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  colorScheme: "dark",
};

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });

  return {
    metadataBase: new URL(siteUrl),
    title: { default: t("title"), template: t("titleTemplate") },
    description: t("description"),
    applicationName: site.name,
    authors: [{ name: site.name, url: site.github }],
    creator: site.name,
    alternates: alternates("", locale),
    openGraph: {
      type: "website",
      siteName: site.name,
      title: t("title"),
      description: t("description"),
      url: `/${locale}`,
      locale: ogLocale[locale],
      alternateLocale: routing.locales.filter((code) => code !== locale).map((code) => ogLocale[code]),
      images: [ogImage("default", `${site.name} — ${site.role}`)],
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      images: [ogImage("default", `${site.name} — ${site.role}`).url],
    },
    robots: { index: true, follow: true },
    formatDetection: { telephone: false, address: false, email: false },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const nav = await getTranslations("nav");
  const meta = await getTranslations("meta");

  return (
    <html lang={locale} className={fontVariables}>
      <body id="top">
        <NextIntlClientProvider>
          <a href="#main" className="skip-link label">
            {nav("skip")}
          </a>
          <Providers>
            <Nav />
            <main id="main" tabIndex={-1} className="outline-none">
              {children}
            </main>
            <Footer />
            <GLRoot />
            <Cursor />
          </Providers>
        </NextIntlClientProvider>
        <div className="grain" aria-hidden="true" />
        <JsonLd data={personJsonLd(locale, meta("description"))} />
        <JsonLd data={websiteJsonLd(locale)} />
      </body>
    </html>
  );
}

import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { About } from "@/components/sections/About";
import { Archive } from "@/components/sections/Archive";
import { Contact } from "@/components/sections/Contact";
import { Hero } from "@/components/sections/Hero";
import { Manifesto } from "@/components/sections/Manifesto";
import { Stack } from "@/components/sections/Stack";
import { Work } from "@/components/sections/Work";
import { routing } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string }> };

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <>
      <Hero />
      <Manifesto />
      <Work />
      <About />
      <Stack />
      <Archive />
      <Contact />
    </>
  );
}

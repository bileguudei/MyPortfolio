"use client";

import { motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { TransitionLink } from "@/components/motion/TransitionLink";
import { usePathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/cn";

const names: Record<Locale, "english" | "mongolian"> = {
  en: "english",
  mn: "mongolian",
};

export function LangToggle({ className }: { className?: string }) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <div
      role="group"
      aria-label={t("language")}
      className={cn("label flex items-center border border-line", className)}
    >
      {routing.locales.map((code) => {
        const active = code === locale;
        return (
          <TransitionLink
            key={code}
            href={pathname}
            locale={code}
            hrefLang={code}
            aria-current={active ? "true" : undefined}
            // The accessible name starts with the visible label ("EN — English").
            aria-label={`${code.toUpperCase()} — ${t(names[code])}`}
            label={code.toUpperCase()}
            className={cn(
              "relative flex h-8 min-w-10 items-center justify-center px-2 transition-colors duration-300",
              active ? "text-ink" : "text-ash hover:text-bone",
            )}
          >
            {active ? (
              <motion.span
                layoutId="lang-pill"
                aria-hidden="true"
                className="absolute inset-0 bg-bone"
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              />
            ) : null}
            <span className="relative">{code.toUpperCase()}</span>
          </TransitionLink>
        );
      })}
    </div>
  );
}

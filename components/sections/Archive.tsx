import { getLocale, getTranslations } from "next-intl/server";
import { Fx } from "@/components/motion/Fx";
import { Arrow } from "@/components/ui/Arrow";
import { SectionHead } from "@/components/ui/SectionHead";
import { visibleArchive } from "@/content/archive";
import type { Locale } from "@/i18n/routing";

/** Smaller builds. Renders nothing until an item is marked visible. */
export async function Archive() {
  if (visibleArchive.length === 0) return null;

  const t = await getTranslations("archive");
  const locale = (await getLocale()) as Locale;

  return (
    <Fx as="section" className="gutter section-y" aria-labelledby="archive-title">
      <SectionHead index="+" label={t("label")} />
      <h2 id="archive-title" className="display t-h3">
        {t("title")}
      </h2>
      <ul className="mt-8 border-t border-line">
        {visibleArchive.map((item) => {
          const body = (
            <>
              <span className="col-span-12 text-xl md:col-span-3">{item.name}</span>
              <span className="col-span-12 text-ash md:col-span-5">{item.kind[locale]}</span>
              <span className="label col-span-10 text-ash md:col-span-3">{item.stack}</span>
              <span className="label tnum col-span-2 text-right text-ash md:col-span-1">
                {item.year}
                {item.url ? <Arrow className="ml-2 inline-block text-bone" /> : null}
              </span>
            </>
          );
          const row = "grid grid-cols-12 items-baseline gap-x-4 gap-y-1 py-5";
          return (
            <li key={item.name} className="border-b border-line" data-rise>
              {item.url ? (
                <a href={item.url} target="_blank" rel="noreferrer" className={row}>
                  {body}
                </a>
              ) : (
                <div className={row}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </Fx>
  );
}

import { getLocale, getTranslations } from "next-intl/server";
import { Fx } from "@/components/motion/Fx";
import { SectionHead } from "@/components/ui/SectionHead";
import { loopOf, metricValue, pad, projects } from "@/content/projects";
import type { Locale } from "@/i18n/routing";
import { WorkShowcase, type WorkItem } from "./WorkShowcase";

export async function Work() {
  const t = await getTranslations("work");
  const locale = (await getLocale()) as Locale;

  const items: WorkItem[] = projects.map((project, i) => {
    const film = loopOf(project);
    const reel = t(`reel.${project.reel}`);
    return {
      slug: project.slug,
      index: pad(i + 1),
      name: project.name,
      kind: project.kind[locale],
      year: project.year,
      status: project.status?.[locale],
      value: metricValue(project.headline, locale),
      valueLabel: project.headline.label[locale],
      ...film,
      source:
        project.loop === "mockup" ? `${reel} · ${t("mockup")}` : project.loop === "art" ? t("reel.art") : reel,
    };
  });

  return (
    <Fx as="section" id="work" data-object="work" className="section-y" aria-labelledby="work-title">
      <div className="gutter">
        <SectionHead index="02" label={t("label")} aside={pad(projects.length)} />
      </div>
      {/* Named for assistive tech; the section label above is the visible title. */}
      <h2 id="work-title" className="sr-only">
        {t("label")}
      </h2>
      <WorkShowcase
        items={items}
        total={pad(projects.length)}
        label={t("listLabel")}
        openLabel={t("open")}
      />
    </Fx>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { Fx } from "@/components/motion/Fx";
import { ReelVideo } from "@/components/motion/ReelVideo";
import { TransitionLink } from "@/components/motion/TransitionLink";
import { Arrow } from "@/components/ui/Arrow";
import { JsonLd } from "@/components/ui/JsonLd";
import { SectionHead } from "@/components/ui/SectionHead";
import { getProject, metricValue, pad, projects, reelOf } from "@/content/projects";
import { routing } from "@/i18n/routing";
import { alternates, ogImage, projectJsonLd } from "@/lib/seo";

type Props = { params: Promise<{ locale: string; slug: string }> };

/**
 * Approximate width of a figure in em, in the display face (Inter Tight 600,
 * tracked -0.045em): digits and letters ~0.55em, "→" ~0.95em, "%" ~0.85em.
 * Used to size a row of figures to fit their columns.
 */
function figureWidth(text: string) {
  let em = 0;
  for (const ch of text) {
    if (ch === "→") em += 0.95;
    else if (ch === "%") em += 0.85;
    else if (ch === " " || ch === "." || ch === "," || ch === "\u2060") em += 0.26;
    else if (ch === "•") em += 0.62;
    else em += 0.56;
  }
  return Math.max(em * 1.06, 1);
}

const order = (i: number) => ({ "--i": i }) as CSSProperties;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    projects.map((project) => ({ locale, slug: project.slug })),
  );
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const project = getProject(slug);
  if (!project || !hasLocale(routing.locales, locale)) return {};

  const title = `${project.name} — ${project.kind[locale]}`;
  const description = project.summary[locale];

  return {
    title,
    description,
    alternates: alternates(`/work/${slug}`, locale),
    openGraph: {
      type: "article",
      title,
      description,
      url: `/${locale}/work/${slug}`,
      images: [ogImage(slug, title)],
    },
    twitter: { card: "summary_large_image", title, description, images: [ogImage(slug, title).url] },
  };
}

export default async function CasePage({ params }: Props) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const project = getProject(slug);
  if (!project) notFound();
  setRequestLocale(locale);

  const t = await getTranslations("case");
  const work = await getTranslations("work");
  const reel = reelOf(project);
  const index = projects.findIndex((p) => p.slug === slug);
  const next = projects[(index + 1) % projects.length];

  const facts = [
    { label: t("type"), value: project.kind[locale] },
    { label: t("year"), value: project.year },
    project.context ? { label: t("context"), value: project.context[locale] } : null,
    project.status ? { label: t("status"), value: project.status[locale] } : null,
  ].filter((fact): fact is { label: string; value: string } => fact !== null);

  return (
    <article>
      <JsonLd data={projectJsonLd(project, locale)} />

      <header className="gutter pt-[calc(var(--nav-h)+2.5rem)] md:pt-[calc(var(--nav-h)+4rem)]">
        <div className="label intro-fade flex items-baseline justify-between gap-4 pb-3 text-ash" style={order(0)}>
          <TransitionLink href="/#work" className="link-line inline-flex items-center gap-2 text-bone">
            <Arrow dir="left" />
            {t("back")}
          </TransitionLink>
          <p className="tnum">
            {t("index", { current: pad(index + 1), total: pad(projects.length) })}
          </p>
        </div>
        <div className="rule" />

        <h1 className="display t-h1 mt-8 md:mt-12">
          <span className="mask">
            <span className="intro-rise" style={order(0)}>
              {project.name}
            </span>
          </span>
        </h1>

        <div className="mt-8 grid grid-cols-12 gap-x-4 gap-y-10 md:mt-12">
          <p
            className="intro-fade col-span-12 text-[clamp(1.25rem,2.2vw,2rem)] leading-snug md:col-span-7"
            style={order(1)}
          >
            {project.summary[locale]}
          </p>

          <dl className="intro-fade col-span-12 md:col-span-4 md:col-start-9" style={order(2)}>
            {facts.map((fact) => (
              <div key={fact.label} className="flex items-baseline justify-between gap-6 border-b border-line py-3">
                <dt className="label text-ash">{fact.label}</dt>
                <dd className="text-right">{fact.value}</dd>
              </div>
            ))}
            {project.url || project.repo ? (
              <div className="flex items-baseline justify-between gap-6 border-b border-line py-3">
                <dt className="label text-ash">{t("links")}</dt>
                <dd className="flex flex-col items-end gap-1">
                  {project.url ? (
                    <a href={project.url} target="_blank" rel="noreferrer" className="link-line">
                      <span className="sr-only">{t("visit", { site: project.urlLabel ?? project.name })}</span>
                      <span aria-hidden="true">{project.urlLabel}</span>
                      <Arrow className="ml-1 inline-block align-[-0.1em] text-ember" />
                    </a>
                  ) : null}
                  {project.repo ? (
                    <a href={project.repo} target="_blank" rel="noreferrer" className="link-line">
                      {t("source")}
                      <Arrow className="ml-1 inline-block align-[-0.1em] text-ember" />
                    </a>
                  ) : null}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      </header>

      {/* Above the fold. The poster is the LCP image, revealed by CSS; the
          film fades in over it once it plays. */}
      <div className="gutter mt-14 md:mt-20">
        <figure className="intro-wipe" style={order(3)}>
          <div className="relative aspect-[16/10] overflow-clip bg-coal">
            <Image
              src={reel.poster}
              alt={project.cover.alt[locale]}
              fill
              loading="eager"
              fetchPriority="high"
              sizes="(min-width: 48rem) 94vw, 100vw"
              className="object-cover"
            />
            <ReelVideo src={reel.src} className="absolute inset-0 size-full object-cover" />
          </div>
          <figcaption className="label mt-3 flex justify-between gap-4 text-ash">
            <span>{work(`reel.${project.reel}`)}</span>
            <span className="tnum">{pad(index + 1)} / {pad(projects.length)}</span>
          </figcaption>
        </figure>
      </div>

      <Fx as="section" className="gutter section-y" aria-labelledby="outcome-title">
        <h2 id="outcome-title" className="sr-only">
          {t("outcome")}
        </h2>
        <SectionHead index="01" label={t("outcome")} />
        {/* Equal columns, one figure size for the row: the widest value
            decides it, so no figure ever runs into its neighbour. */}
        <dl
          className="metrics grid grid-cols-1 gap-x-[clamp(1.5rem,4vw,4rem)] gap-y-10 md:grid-cols-3"
          style={{ "--fit": Math.max(...project.metrics.map((m) => figureWidth(metricValue(m, locale)))) } as CSSProperties}
        >
          {project.metrics.map((metric) => (
            <div key={metric.label.en} className="metric flex flex-col-reverse justify-end gap-3" data-rise>
              <dt className="label max-w-[18rem] text-ash">{metric.label[locale]}</dt>
              <dd className="metric-value display tnum whitespace-nowrap text-ember">{metricValue(metric, locale)}</dd>
            </div>
          ))}
        </dl>
      </Fx>

      <Fx as="section" className="gutter pb-[var(--section-y)]" aria-labelledby="built-title">
        <h2 id="built-title" className="sr-only">
          {t("built")}
        </h2>
        <SectionHead index="02" label={t("built")} />
        <ol>
          {project.points.map((point, i) => (
            <li
              key={point.en}
              className="grid grid-cols-12 gap-x-4 gap-y-2 border-b border-line py-7 md:py-10"
              data-rise
            >
              <span className="label tnum col-span-12 pt-2 text-ember md:col-span-2">{pad(i + 1)}</span>
              <p className="col-span-12 text-[clamp(1.25rem,2.2vw,2rem)] leading-snug md:col-span-9">
                {point[locale]}
              </p>
            </li>
          ))}
        </ol>
      </Fx>

      <Fx as="section" className="gutter pb-[var(--section-y)]" aria-labelledby="stack-title">
        <h2 id="stack-title" className="sr-only">
          {t("stack")}
        </h2>
        <SectionHead index="03" label={t("stack")} />
        <ul className="flex flex-wrap gap-2" data-rise>
          {project.stack.map((item) => (
            <li key={item} className="label border border-line px-3 py-2 text-bone">
              {item}
            </li>
          ))}
        </ul>
      </Fx>

      <Fx as="div">
        <nav aria-label={t("next")} className="border-t border-line">
          <TransitionLink
            href={`/work/${next.slug}`}
            label={next.name}
            className="work-row gutter group block py-12 md:py-20"
          >
            <span className="label flex items-center justify-between text-ash">
              {t("next")}
              <span className="tnum">{pad(((index + 1) % projects.length) + 1)}</span>
            </span>
            <span className="mt-4 flex items-end justify-between gap-6">
              <span className="work-name display block min-w-0 text-[min(var(--fs-h1),11vw)] [overflow-wrap:anywhere]">{next.name}</span>
              <Arrow className="work-arrow mb-[0.2em] shrink-0 text-[clamp(2rem,5vw,5rem)] text-ember" />
            </span>
          </TransitionLink>
        </nav>
      </Fx>
    </article>
  );
}

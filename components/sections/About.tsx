import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Fx } from "@/components/motion/Fx";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { SectionHead } from "@/components/ui/SectionHead";
import portrait from "@/content/portrait.json";
import aboutPhoto from "@/public/portrait/about.webp";

export async function About() {
  const t = await getTranslations("about");
  const hero = await getTranslations("hero");

  const experience = [{ org: "Pinecone Academy", note: t("internship"), year: "2026" }];
  const education = [
    { org: "Pinecone Academy", year: "2026" },
    { org: "MLC Business School", year: "2023" },
    { org: "Nest Education IT School", year: "2022" },
  ];

  return (
    <Fx as="section" id="about" data-object="about" className="gutter section-y" aria-labelledby="about-title">
      <SectionHead index="03" label={t("label")} />

      <div className="grid grid-cols-12 gap-x-4 gap-y-12">
        <figure className="col-span-12 sm:col-span-8 md:col-span-5 lg:col-span-4">
          <div className="relative aspect-[4/5] overflow-clip bg-coal" data-wipe>
            <Image
              src={aboutPhoto}
              alt={portrait.hasPhoto ? hero("portraitAlt") : ""}
              fill
              sizes="(min-width: 64rem) 32vw, (min-width: 48rem) 40vw, 90vw"
              className={portrait.hasPhoto ? "object-cover" : "object-contain p-[8%]"}
            />
          </div>
          <figcaption className="label mt-3 flex justify-between text-ash">
            <span>{hero("based")}</span>
            {portrait.hasPhoto ? null : <span className="text-ember">{hero("portraitPending")}</span>}
          </figcaption>
        </figure>

        <div className="col-span-12 md:col-span-7 lg:col-span-7 lg:col-start-6">
          <SplitReveal as="h2" id="about-title" className="display t-h2">
            {t("title")}
          </SplitReveal>
          {/* The bio is one message; blank lines split it into paragraphs. */}
          <div className="mt-8 flex max-w-[38rem] flex-col gap-5 text-lg leading-relaxed md:text-xl" data-rise>
            {t("bio")
              .split("\n\n")
              .map((paragraph) => (
                <p key={paragraph.slice(0, 24)}>{paragraph}</p>
              ))}
          </div>

          <div className="mt-12 grid grid-cols-1 gap-x-4 gap-y-10 sm:grid-cols-2 md:mt-16">
            <div data-rise>
              <h3 className="label border-b border-line pb-3 text-ash">{t("experience")}</h3>
              <ul>
                {experience.map((item) => (
                  <li key={item.org} className="border-b border-line py-4">
                    <p className="flex items-baseline justify-between gap-4 text-lg">
                      {item.org}
                      <span className="label tnum text-ash">{item.year}</span>
                    </p>
                    <p className="mt-1 text-sm text-ash">{item.note}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div data-rise>
              <h3 className="label border-b border-line pb-3 text-ash">{t("education")}</h3>
              <ul>
                {education.map((item) => (
                  <li
                    key={item.org}
                    className="flex items-baseline justify-between gap-4 border-b border-line py-4 text-lg"
                  >
                    {item.org}
                    <span className="label tnum text-ash">{item.year}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Fx>
  );
}

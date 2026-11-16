import { getTranslations } from "next-intl/server";
import { Fx } from "@/components/motion/Fx";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { TechMarquee } from "@/components/motion/TechMarquee";
import { SectionHead } from "@/components/ui/SectionHead";
import { marqueeTech, skillGroups } from "@/content/skills";

export async function Stack() {
  const t = await getTranslations("stack");

  return (
    <Fx as="section" data-object="stack" className="section-y" aria-labelledby="stack-title">
      <div className="gutter">
        <SectionHead index="04" label={t("label")} />
        <SplitReveal as="h2" id="stack-title" className="display t-h2">
          {t("title")}
        </SplitReveal>

        <dl className="mt-12 border-t border-line md:mt-16">
          {skillGroups.map((group) => (
            <div
              key={group.key}
              className="grid grid-cols-12 gap-x-4 gap-y-3 border-b border-line py-5 md:py-6"
              data-rise
            >
              <dt className="label col-span-12 pt-1 text-ash md:col-span-3">
                {t(`groups.${group.key}`)}
              </dt>
              <dd className="col-span-12 md:col-span-9">
                <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xl leading-snug md:text-2xl">
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <TechMarquee items={[...marqueeTech]} />
    </Fx>
  );
}

import { getTranslations } from "next-intl/server";
import { Fx } from "@/components/motion/Fx";
import { ScrubText } from "@/components/motion/ScrubText";
import { SectionHead } from "@/components/ui/SectionHead";

export async function Manifesto() {
  const t = await getTranslations("manifesto");

  return (
    <Fx
      as="section"
      data-object="manifesto"
      className="gutter flex min-h-svh flex-col pb-[clamp(3rem,6vw,6rem)] pt-[var(--section-y)] lg:pt-[clamp(3rem,6vw,6rem)]"
      aria-labelledby="approach-label"
    >
      <h2 id="approach-label" className="sr-only">
        {t("label")}
      </h2>
      <SectionHead index="01" label={t("label")} />
      {/* Centred in the section (which is one screen tall), a little
          narrower than the page so the lines stay readable at lead size. */}
      <div className="mx-auto my-auto max-w-[60rem] py-[clamp(2.5rem,5vw,4.5rem)]">
        <ScrubText className="t-lead font-medium leading-[1.14] tracking-[-0.02em] lg:text-center">
          {t("body")}
        </ScrubText>
      </div>
    </Fx>
  );
}

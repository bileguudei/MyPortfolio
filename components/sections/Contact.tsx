import { getTranslations } from "next-intl/server";
import Magnet from "@/components/bits/Magnet";
import { Fx } from "@/components/motion/Fx";
import { Arrow } from "@/components/ui/Arrow";
import { CopyEmail } from "@/components/ui/CopyEmail";
import { SectionHead } from "@/components/ui/SectionHead";
import { site } from "@/content/site";
import { ContactTitle } from "./ContactTitle";

export async function Contact() {
  const t = await getTranslations("contact");

  return (
    <Fx as="section" id="contact" data-object="contact" className="gutter section-y" aria-labelledby="contact-title">
      <SectionHead index="05" label={t("label")} />

      <ContactTitle id="contact-title" lines={[t("titleA"), t("titleB")]} />

      <div className="mt-12 grid grid-cols-12 items-end gap-x-4 gap-y-10 md:mt-20">
        <p className="col-span-12 max-w-[30rem] text-lg text-ash md:col-span-5" data-rise>
          {t("body")}
        </p>

        <div className="col-span-12 md:col-span-7 md:justify-self-end" data-rise>
          <a
            href={`mailto:${site.email}`}
            className="link-line display block break-all text-[clamp(1.875rem,4.6vw,4.5rem)] normal-case text-bone"
          >
            {site.email}
          </a>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Magnet padding={48} magnetStrength={3}>
              <a href={`mailto:${site.email}`} className="btn btn-primary label">
                {t("write")}
                <Arrow />
              </a>
            </Magnet>
            <CopyEmail />
            <a href={site.github} target="_blank" rel="noreferrer" className="btn label">
              {t("github")}
              <Arrow />
            </a>
          </div>
        </div>
      </div>
    </Fx>
  );
}

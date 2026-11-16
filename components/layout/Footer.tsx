import { getTranslations } from "next-intl/server";
import { Arrow } from "@/components/ui/Arrow";
import { Clock } from "@/components/ui/Clock";
import { site } from "@/content/site";

export async function Footer() {
  const t = await getTranslations("footer");
  const year = new Date().getFullYear();

  return (
    <footer className="gutter pb-8 pt-6">
      <div className="rule mb-5" />
      <div className="label grid grid-cols-2 gap-y-4 text-ash md:grid-cols-4">
        <p>{t("rights", { year })}</p>
        <p className="tnum text-right md:text-left">
          {t("local")} <Clock />
        </p>
        <p className="md:text-center">
          <a href={site.github} target="_blank" rel="noreferrer" className="link-line text-bone">
            GitHub
            <Arrow className="ml-1 inline-block align-[-0.1em]" />
          </a>
        </p>
        <p className="text-right">
          <a href="#top" className="link-line text-bone">
            {t("top")}
            <Arrow dir="up" className="ml-1 inline-block align-[-0.1em]" />
          </a>
        </p>
      </div>
    </footer>
  );
}

import { getTranslations } from "next-intl/server";
import { TransitionLink } from "@/components/motion/TransitionLink";
import { Arrow } from "@/components/ui/Arrow";

export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <section className="gutter flex min-h-svh flex-col justify-end pb-16 pt-[calc(var(--nav-h)+4rem)]">
      <p className="label text-ember">{t("code")}</p>
      <h1 className="display t-h1 mt-4">{t("title")}</h1>
      <p className="mt-6 max-w-[28rem] text-lg text-ash">{t("body")}</p>
      <div className="mt-8">
        <TransitionLink href="/" className="btn btn-primary label">
          <Arrow dir="left" />
          {t("back")}
        </TransitionLink>
      </div>
    </section>
  );
}

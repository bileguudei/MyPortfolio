import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { CSSProperties } from "react";
import { Arrow } from "@/components/ui/Arrow";
import { Clock } from "@/components/ui/Clock";
import { site } from "@/content/site";
// The bust as a field of dots (scripts/prepare-portrait.mjs). The WebGL
// particles take over from this still, dot for dot.
import dots from "@/public/portrait/dots.webp";
import { HeroFx } from "./HeroFx";

const order = (i: number) => ({ "--i": i }) as CSSProperties;

export async function Hero() {
  const t = await getTranslations("hero");
  const { lat, lng } = site.location;

  return (
    <section
      data-hero
      className="hero gutter relative overflow-x-clip pb-6 pt-[var(--nav-h)]"
    >
      <div
        className="label intro-fade flex items-baseline justify-between gap-4 pb-3 pt-2 text-ash"
        style={order(0)}
      >
        <p>{t("role")}</p>
        <p className="tnum hidden sm:block">
          {lat.toFixed(4)}° N, {lng.toFixed(4)}° E
        </p>
        <p className="tnum text-right">
          <span className="hidden xs:inline">{t("based")} · </span>
          <Clock />
        </p>
      </div>

      {/* Stage. Wide screens: the name and the copy share the left column,
          aligned to the portrait's top and bottom edges; the portrait stands
          on the right. Narrow screens: name, portrait, copy, in that order. */}
      <div className="hero-stage">
        <h1 data-hero-name className="hero-name display t-mega select-none">
          <span className="mask hero-name-a">
            <span className="intro-rise" style={order(0)}>
              {site.firstName}
            </span>
          </span>{" "}
          <span className="mask hero-name-b">
            <span className="intro-rise" style={order(1)}>
              {site.lastName}
            </span>
          </span>
        </h1>

        {/* The portrait, drawn in dots: with WebGL the dots fly in and
            assemble, scatter as the page scrolls away and shy from the
            cursor (components/gl). The 3D code symbols sit on its corners. */}
        <div
          data-object-anchor
          className="hero-person intro-fade"
          style={order(1)}
        >
          <Image
            src={dots}
            alt={t("portraitAlt")}
            loading="eager"
            fetchPriority="high"
            sizes="(min-width: 64rem) 36vw, 22rem"
            className="hero-person-img"
          />
          <span className="hero-object-hint label" aria-hidden="true">
            <span className="hero-object-dot" />
            {t("drag")}
          </span>
        </div>

        <div data-hero-copy className="hero-copy">
          <p className="hero-intro intro-fade" style={order(2)}>
            {t("intro")}
          </p>
          <div className="intro-fade flex flex-wrap gap-3" style={order(3)}>
            <a href="#work" className="btn btn-primary label">
              {t("ctaWork")}
              <Arrow dir="down" />
            </a>
            <a href="#contact" className="btn label">
              {t("ctaContact")}
            </a>
          </div>
        </div>
      </div>

      {/* Wide screens: the small facts, on one line under a hairline. */}
      <div className="hero-bar label intro-fade" style={order(4)}>
        <p>{t("asideA")}</p>
        <p className="text-ash">React — Next.js — React Native — PostgreSQL</p>
        <p>
          <span className="text-ash">{t("asideB")} · </span>
          {t("asideC")}
        </p>
        <p className="hero-bar-cue text-ash" aria-hidden="true">
          <span data-scroll-cue className="hero-cue-line" />
          {t("scroll")}
        </p>
      </div>

      <HeroFx />
    </section>
  );
}

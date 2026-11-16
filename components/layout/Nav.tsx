"use client";

import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { TransitionLink } from "@/components/motion/TransitionLink";
import { site } from "@/content/site";
import { usePathname } from "@/i18n/navigation";
import { ScrollTrigger } from "@/lib/gsap";
import { scroll } from "@/lib/scroll";
import { LangToggle } from "./LangToggle";

const links = [
  { key: "work", href: "/#work" },
  { key: "about", href: "/#about" },
  { key: "contact", href: "/#contact" },
] as const;

const ease = [0.16, 1, 0.3, 1] as const;

export function Nav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const header = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  // Hide while scrolling down, return on scroll up. State lives on the DOM
  // node so scrolling never re-renders React.
  useEffect(() => {
    const el = header.current;
    if (!el) return;
    const trigger = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        const y = self.scroll();
        el.dataset.state = y < 24 ? "top" : self.direction === 1 && y > 160 ? "hidden" : "pinned";
      },
    });
    return () => trigger.kill();
  }, []);

  // Close the menu after any route change (state adjusted during render).
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setOpen(false);
  }

  // Menu: lock scroll, make the page inert, close on Escape, restore focus.
  useEffect(() => {
    if (!open) return;
    const main = document.getElementById("main");
    const footer = document.querySelector("footer");
    scroll.lock();
    main?.setAttribute("inert", "");
    footer?.setAttribute("inert", "");

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const toggleEl = toggle.current;

    return () => {
      scroll.unlock();
      main?.removeAttribute("inert");
      footer?.removeAttribute("inert");
      window.removeEventListener("keydown", onKey);
      toggleEl?.focus({ preventScroll: true });
    };
  }, [open]);

  return (
    <header
      ref={header}
      data-nav
      data-state="top"
      data-menu={open ? "open" : undefined}
      className="fixed inset-x-0 top-0 z-50"
    >
      <div className="gutter relative z-10 flex h-[var(--nav-h)] items-center justify-between gap-4">
        <TransitionLink
          href="/"
          aria-label={t("home")}
          className="label flex items-center gap-2.5 text-bone"
          onClick={() => setOpen(false)}
        >
          <span aria-hidden="true" className="size-2 bg-ember" />
          <span>
            {site.firstName}
            <span className="hidden sm:inline"> {site.lastName}</span>
          </span>
        </TransitionLink>

        <nav aria-label={t("primary")} className="hidden md:block">
          <ul className="label flex items-center gap-8">
            {links.map((link) => (
              <li key={link.key}>
                <TransitionLink href={link.href} className="link-line py-2 text-bone">
                  {t(link.key)}
                </TransitionLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          <LangToggle />
          <button
            ref={toggle}
            type="button"
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen((value) => !value)}
            className="label flex h-8 items-center gap-2 border border-line px-3 text-bone md:hidden"
          >
            <span aria-hidden="true" className="relative block h-2 w-3.5">
              <span
                className={`absolute inset-x-0 top-0 h-px bg-current transition-transform duration-300 ease-ember ${open ? "translate-y-[3.5px] rotate-45" : ""}`}
              />
              <span
                className={`absolute inset-x-0 bottom-0 h-px bg-current transition-transform duration-300 ease-ember ${open ? "-translate-y-[3.5px] -rotate-45" : ""}`}
              />
            </span>
            {open ? t("close") : t("menu")}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            id="site-menu"
            role="dialog"
            aria-modal="true"
            aria-label={t("menuTitle")}
            initial={{ clipPath: "inset(0% 0% 100% 0%)" }}
            animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
            exit={{ clipPath: "inset(0% 0% 100% 0%)" }}
            transition={{ duration: 0.55, ease }}
            className="gutter fixed inset-0 flex flex-col justify-between bg-ink pb-8 pt-[calc(var(--nav-h)+2rem)] md:hidden"
          >
            <nav aria-label={t("primary")}>
              <ul>
                {links.map((link, i) => (
                  <li key={link.key} className="mask border-b border-line">
                    <motion.div
                      initial={{ y: "105%" }}
                      animate={{ y: 0 }}
                      exit={{ y: "105%" }}
                      transition={{ duration: 0.6, ease, delay: 0.08 + i * 0.05 }}
                    >
                      <TransitionLink
                        href={link.href}
                        onClick={() => setOpen(false)}
                        className="display t-h1 flex items-baseline justify-between py-3 text-bone"
                      >
                        {t(link.key)}
                        <span className="label text-ash">0{i + 1}</span>
                      </TransitionLink>
                    </motion.div>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="label flex items-end justify-between text-ash">
              <a href={`mailto:${site.email}`} className="link-line text-bone">
                {site.email}
              </a>
              <a href={site.github} target="_blank" rel="noreferrer" className="link-line text-bone">
                GitHub
              </a>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}

"use client";

import Lenis from "lenis";
import { useLocale } from "next-intl";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { gsap, MOTION_OK, prefersReducedMotion, ScrollTrigger } from "@/lib/gsap";
import { scroll } from "@/lib/scroll";

type NavigateOptions = { locale?: Locale; label?: string };

type TransitionContext = {
  navigate: (href: string, options?: NavigateOptions) => void;
};

/**
 * idle   → nothing running
 * cover  → the panel is wiping up over the current page
 * wait   → the panel covers the screen; the route is changing
 * reveal → the new page is in; the panel is leaving
 */
type Phase = "idle" | "cover" | "wait" | "reveal";

type Target = { path: string; hash: string; locale?: Locale };

const Ctx = createContext<TransitionContext>({ navigate: () => {} });

export function usePageTransition() {
  return useContext(Ctx);
}

function splitHref(href: string) {
  const [path, hash] = href.split("#");
  return { path: path === "" ? "/" : path, hash: hash ? `#${hash}` : "" };
}

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  const overlay = useRef<HTMLDivElement>(null);
  const overlayLabel = useRef<HTMLSpanElement>(null);
  const phase = useRef<Phase>("idle");
  const target = useRef<Target | null>(null);
  const arrived = useRef<{ hash: string } | null>(null);
  const failsafe = useRef<number | undefined>(undefined);
  const here = useRef({ pathname, locale });

  useEffect(() => {
    here.current = { pathname, locale };
  }, [pathname, locale]);

  // ── Smooth scroll: Lenis, driven by the GSAP ticker ─────────────────────
  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const lenis = new Lenis({ lerp: 0.11, anchors: true });
      scroll.set(lenis);
      lenis.on("scroll", ScrollTrigger.update);
      const raf = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);
      return () => {
        gsap.ticker.remove(raf);
        lenis.destroy();
        scroll.set(null);
      };
    });

    // Late layout shifts (webfonts, images) move trigger positions.
    const refresh = () => ScrollTrigger.refresh();
    document.fonts?.ready.then(refresh).catch(() => {});
    window.addEventListener("load", refresh, { once: true });

    return () => {
      mm.revert();
      window.removeEventListener("load", refresh);
    };
  }, []);

  // ── Page transition: ember panel wipes up, route swaps, panel leaves ────
  const reveal = useCallback(() => {
    const el = overlay.current;
    window.clearTimeout(failsafe.current);
    if (!el) {
      phase.current = "idle";
      scroll.unlock();
      return;
    }
    phase.current = "reveal";
    gsap.killTweensOf(el);
    gsap.to(el, {
      yPercent: -100,
      duration: 0.6,
      ease: "power3.inOut",
      delay: 0.08,
      onComplete: () => {
        gsap.set(el, { yPercent: 100, visibility: "hidden" });
        phase.current = "idle";
        scroll.unlock();
      },
    });
  }, []);

  /** Pushes the latest requested route. Called while the panel covers the page. */
  const go = useCallback(() => {
    const next = target.current;
    if (!next) return;

    // The newest target can be the page we are already on (a second click
    // changed the destination mid-wipe): no route change will ever commit.
    const { pathname: currentPath, locale: currentLocale } = here.current;
    if (next.path === currentPath && (!next.locale || next.locale === currentLocale)) {
      if (next.hash) scroll.to(next.hash, true);
      if (phase.current === "wait") reveal();
      return;
    }

    arrived.current = { hash: next.hash };
    if (next.locale) router.replace(next.path, { locale: next.locale });
    else router.push(next.path);
  }, [reveal, router]);

  const navigate = useCallback(
    (href: string, options: NavigateOptions = {}) => {
      const { path, hash } = splitHref(href);
      const sameRoute = path === pathname && (!options.locale || options.locale === locale);

      if (sameRoute && phase.current !== "cover" && phase.current !== "wait") {
        if (hash) scroll.to(hash);
        else scroll.to(document.body);
        return;
      }

      target.current = { path, hash, locale: options.locale };

      const el = overlay.current;
      if (prefersReducedMotion() || !el) {
        go();
        return;
      }
      if (overlayLabel.current) overlayLabel.current.textContent = options.label ?? "";

      // A click during a transition is never dropped:
      //   cover → the running wipe simply lands on the newest target
      //   wait  → push the newer route straight away
      //   reveal / idle → wipe (back) over the page, then go
      if (phase.current === "cover") return;
      if (phase.current === "wait") {
        go();
        return;
      }

      const from =
        phase.current === "reveal" ? Number(gsap.getProperty(el, "yPercent")) : 100;
      phase.current = "cover";
      scroll.lock();
      gsap.killTweensOf(el);
      gsap.set(el, { visibility: "visible" });
      gsap.fromTo(
        el,
        { yPercent: from },
        {
          yPercent: 0,
          duration: 0.55,
          ease: "power3.inOut",
          onComplete: () => {
            phase.current = "wait";
            go();
            // Never leave the page covered if the route fails to change.
            window.clearTimeout(failsafe.current);
            failsafe.current = window.setTimeout(reveal, 4000);
          },
        },
      );
    },
    [go, locale, pathname, reveal],
  );

  // The new route has committed.
  useEffect(() => {
    const next = arrived.current;
    if (!next) return;
    arrived.current = null;

    scroll.toTop();
    if (next.hash) scroll.to(next.hash, true);
    ScrollTrigger.refresh();
    if (phase.current === "wait") reveal();
  }, [pathname, locale, reveal]);

  useEffect(() => () => window.clearTimeout(failsafe.current), []);

  const value = useMemo(() => ({ navigate }), [navigate]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div
        ref={overlay}
        aria-hidden="true"
        className="pointer-events-none invisible fixed inset-0 z-[100] flex items-end bg-ember p-[var(--gutter)] text-ink"
      >
        <span ref={overlayLabel} className="display t-h1" />
      </div>
    </Ctx.Provider>
  );
}

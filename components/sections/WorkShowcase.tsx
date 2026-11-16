"use client";

import Image from "next/image";
import { useEffect, useRef, type CSSProperties } from "react";
import { TransitionLink } from "@/components/motion/TransitionLink";
import { Arrow } from "@/components/ui/Arrow";
import { MOTION_OK, ScrollTrigger } from "@/lib/gsap";
import { scroll } from "@/lib/scroll";
import { SlideRenderer, type Media } from "./work-gl";

export type WorkItem = {
  slug: string;
  index: string;
  name: string;
  kind: string;
  year: string;
  status?: string;
  value: string;
  valueLabel: string;
  src: string;
  poster: string;
  /** What the film is: "Promo film", "Live site", "Motion study · schematic". */
  source: string;
};

type Props = {
  items: WorkItem[];
  total: string;
  label: string;
  openLabel: string;
};

/**
 * Wide screens with a mouse or trackpad: the stage follows the page's
 * scroll. Elsewhere (phones, tablets) it is one screen in the page and
 * moves on a sideways swipe, so the page's vertical scroll is never held.
 */
const STAGE = "(min-width: 64rem) and (pointer: fine)";

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Seconds a project change takes; between changes the stage holds still. */
const SWITCH = 0.9;
/** How far (in screens) past a project the page must scroll to move on. */
const LEAD = 0.35;

/** Where a title sits for a project u steps away: rises in, lifts out. */
function titleY(u: number) {
  return u >= 0 ? -110 * clamp01(u / 0.5) : 110 * (1 - clamp01((u + 0.5) / 0.5));
}

/**
 * Selected work as one full-screen slider. A single WebGL quad shows the
 * current project's film and holds it. Scrolling a little past a project
 * (each has one screen of the page) plays one short displacement transition
 * to the next while the large title lifts out and the next one rises in;
 * the transition is timed, not tied to the scroll, so the stage never rests
 * between two projects. While the stage fills the screen, each wheel
 * gesture, swipe or arrow key moves exactly one project and then holds;
 * at either end the page scrolls on as usual. Each project is still its
 * own link, one screen tall, laid over the stage.
 *
 * On phones and tablets the same stage is one screen tall and a sideways
 * swipe (or the arrow keys) plays the same transition to the next project,
 * round the list. Without the stage there, the slides sit side by side in
 * a native horizontal carousel.
 *
 * Without JS, with reduced motion, or without WebGL, the desktop list renders
 * as plain full screens: poster, title, kind and result.
 */
export function WorkShowcase({ items, total, label, openLabel }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const count = items.length;

  useEffect(() => {
    const el = root.current;
    const cv = canvas.current;
    if (!el || !cv || !window.matchMedia(MOTION_OK).matches) return;
    // Wide screens with a mouse: the stage sticks and follows the page's
    // scroll. Phones and tablets: the stage is one screen in the page and a
    // sideways swipe moves it, so the page's own vertical scroll stays free.
    const swipe = !window.matchMedia(STAGE).matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;

    let renderer: SlideRenderer;
    try {
      renderer = new SlideRenderer(cv, {
        maxDpr: coarse ? 1.5 : 2,
      });
    } catch {
      return;
    }

    const last = count - 1;
    const slides = Array.from(el.querySelectorAll<HTMLElement>("[data-work-card]"));
    const media: Media[] = slides.map((slide, i) => {
      const image = new window.Image();
      image.decoding = "async";
      image.src = items[i].poster;
      return {
        image,
        video: slide.querySelector("video")!,
        texture: renderer.texture(),
        width: 1600,
        height: 1000,
        ready: false,
      };
    });
    media.forEach((m) => {
      const size = () => {
        if (m.video.videoWidth) {
          m.width = m.video.videoWidth;
          m.height = m.video.videoHeight;
        }
      };
      m.video.addEventListener("loadedmetadata", size, { once: true });
    });

    const copies = Array.from(el.querySelectorAll<HTMLElement>("[data-slide-copy]")).map(
      (copy) => ({
        title: Array.from(copy.querySelectorAll<HTMLElement>("[data-slide-title]")),
        meta: Array.from(copy.querySelectorAll<HTMLElement>("[data-slide-meta]")),
        last: NaN,
      }),
    );
    const current = el.querySelector<HTMLElement>("[data-step-current]")!;
    const square = el.querySelector<HTMLElement>("[data-step-square]")!;

    let raw = -1;
    let cur = 0;
    // The stage shows `from`; during a change it blends towards `to`.
    let from = 0;
    let to = 0;
    let start = -1;
    // Which way the change runs (+1: the next one rises in from below).
    let moveDir = 1;
    let hover = 0;
    let hoverTarget = 0;
    let shown = -1;
    let playing = new Set<number>();

    const go = (next: number, dir?: number) => {
      const now = performance.now() / 1000;
      if (start >= 0) {
        const p = clamp01((now - start) / SWITCH);
        if (next === from) {
          // Reversed mid-change: play back from where it is.
          [from, to] = [to, from];
          moveDir = -moveDir;
          start = now - (1 - p) * SWITCH;
          return;
        }
        if (p >= 0.5) from = to;
      }
      if (next === from) {
        start = -1;
        to = from;
        return;
      }
      moveDir = dir ?? (next > from ? 1 : -1);
      to = next;
      start = now;
    };

    // True while a gesture's step scrolls the page to the next project: the
    // stage already shows it, so the scroll passing by must not undo that.
    let stepping = false;

    const follow = (progress: number) => {
      raw = progress * count - 1;
      if (stepping) return;
      let next = cur;
      if (raw > cur + LEAD) next = Math.min(last, Math.floor(raw - LEAD) + 1);
      else if (raw < cur - LEAD) next = Math.max(0, Math.ceil(raw + LEAD) - 1);
      if (next !== cur) {
        cur = next;
        go(next);
      }
    };
    const settle = () => {
      start = -1;
      from = to = cur;
    };

    const trigger = swipe
      ? null
      : ScrollTrigger.create({
          trigger: el,
          start: "top bottom",
          end: "bottom bottom",
          onUpdate: (self) => follow(self.progress),
        });
    if (trigger) follow(trigger.progress);
    else raw = 0;
    settle();

    // ── One project per gesture ───────────────────────────────────────────
    // While the stage fills the screen, a wheel gesture, a swipe or a key
    // moves exactly one project and the stage then holds there: the rest of
    // that gesture (trackpad momentum, a long wheel spin) is swallowed. At
    // the first and last project, scrolling outwards leaves the section.
    const height = () => slides[0].offsetHeight;
    const topOf = (i: number) => slides[i].getBoundingClientRect().top + window.scrollY;
    const posAt = (y: number) => (y - topOf(0)) / height();
    const inside = (r: number) => r > -0.02 && r < last + 0.02;
    let release = 0;

    const step = (next: number) => {
      stepping = true;
      cur = next;
      go(next);
      const done = () => {
        window.clearTimeout(release);
        stepping = false;
      };
      release = window.setTimeout(done, 1300);
      scroll.toY(topOf(next), done, { lock: true, duration: 0.85 });
    };
    const swallow = (event: Event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
    };

    let gesture = 0;
    let used = -1;
    let lastWheel = -Infinity;
    let lastAbs = 0;
    let pushed = 0;
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return; // pinch zoom
      const dy = event.deltaMode === 1 ? event.deltaY * 40 : event.deltaY;
      if (!dy) return;
      // A pause starts a new gesture; momentum keeps the old one alive. A
      // fresh push during the tail of the momentum (the deltas grow again
      // instead of fading) counts as a new gesture too.
      const abs = Math.abs(dy);
      const pushedAgain = !stepping && used === gesture && abs > 6 && abs > lastAbs * 1.4;
      if (event.timeStamp - lastWheel > 150 || pushedAgain) {
        gesture += 1;
        pushed = 0;
      }
      lastWheel = event.timeStamp;
      lastAbs = abs;
      const r = posAt(scroll.target());
      const ahead = posAt(scroll.target() + dy);

      // Arriving: the stage would scroll past its first or last project.
      if (r <= -0.02 && dy > 0 && ahead > 0) {
        swallow(event);
        if (!stepping && used !== gesture) {
          used = gesture;
          step(0);
        }
        return;
      }
      if (r >= last + 0.02 && dy < 0 && ahead < last) {
        swallow(event);
        if (!stepping && used !== gesture) {
          used = gesture;
          step(last);
        }
        return;
      }
      if (!inside(r)) return;
      if (stepping || used === gesture) {
        swallow(event);
        return;
      }
      const next = Math.round(r) + (dy > 0 ? 1 : -1);
      if (next < 0 || next > last) return; // leaving the section
      swallow(event);
      pushed += dy;
      if (Math.abs(pushed) < 30) return;
      used = gesture;
      step(next);
    };

    let touchY = 0;
    let touchMove: "step" | "pass" | null = null;
    let touchDy = 0;
    const onTouchStart = (event: TouchEvent) => {
      touchY = event.touches[0].clientY;
      touchMove = null;
      touchDy = 0;
    };
    const onTouchMove = (event: TouchEvent) => {
      touchDy = touchY - event.touches[0].clientY;
      if (stepping) {
        if (event.cancelable) event.preventDefault();
        return;
      }
      if (touchMove === null && Math.abs(touchDy) > 4) {
        const r = posAt(window.scrollY);
        const next = Math.round(r) + (touchDy > 0 ? 1 : -1);
        touchMove = inside(r) && next >= 0 && next <= last ? "step" : "pass";
      }
      if (touchMove === "step" && event.cancelable) event.preventDefault();
    };
    const onTouchEnd = () => {
      if (touchMove !== "step" || stepping) return;
      const r = posAt(window.scrollY);
      const next = Math.round(r) + (touchDy > 0 ? 1 : -1);
      if (Math.abs(touchDy) > 30 && next >= 0 && next <= last) step(next);
    };

    const keys: Record<string, number> = { ArrowDown: 1, PageDown: 1, ArrowUp: -1, PageUp: -1 };
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      const dir = event.key === " " ? (event.shiftKey ? -1 : 1) : keys[event.key];
      if (!dir) return;
      const r = posAt(scroll.target());
      if (!inside(r)) return;
      if (stepping) {
        event.preventDefault();
        return;
      }
      const next = Math.round(r) + dir;
      if (next < 0 || next > last) return;
      event.preventDefault();
      step(next);
    };

    if (!swipe) {
      // Capture on window runs before Lenis' own wheel listener.
      window.addEventListener("wheel", onWheel, { capture: true, passive: false });
      // Touch listeners only on the slider: a non-passive touchmove on the
      // window would make every touch scroll on the page wait for the main
      // thread.
      el.addEventListener("touchstart", onTouchStart, { passive: true });
      el.addEventListener("touchmove", onTouchMove, { passive: false });
      el.addEventListener("touchend", onTouchEnd);
      window.addEventListener("keydown", onKey);
    }

    // ── Swipe mode (phones, tablets) ──────────────────────────────────────
    // A sideways swipe on the stage moves one project, round the list;
    // vertical movement is left to the browser (touch-action: pan-y), so
    // scrolling past the section is never held. Arrow keys and focus
    // (tabbing through the links) move it too.
    const markCurrent = () => slides.forEach((slide, i) => slide.toggleAttribute("data-current", i === cur));
    const slide = (dir: number) => {
      cur = (cur + dir + count) % count;
      go(cur, dir);
      markCurrent();
    };
    let sx = 0;
    let sy = 0;
    let tracking = false;
    let swiped = false;
    const onDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      sx = event.clientX;
      sy = event.clientY;
      tracking = true;
      swiped = false;
    };
    const onMove = (event: PointerEvent) => {
      if (!tracking) return;
      const dx = event.clientX - sx;
      const dy = event.clientY - sy;
      if (Math.abs(dy) > 24 && Math.abs(dy) > Math.abs(dx)) {
        tracking = false; // a vertical scroll: not ours
        return;
      }
      if (Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        tracking = false;
        swiped = true;
        slide(dx < 0 ? 1 : -1);
      }
    };
    const onUp = () => {
      tracking = false;
    };
    // A swipe that ends on a link must not also open it.
    const onClick = (event: MouseEvent) => {
      if (!swiped) return;
      swiped = false;
      event.preventDefault();
      event.stopPropagation();
    };
    const onArrow = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        slide(event.key === "ArrowRight" ? 1 : -1);
      }
    };
    const onFocus = (event: FocusEvent) => {
      const i = slides.findIndex((s) => s.contains(event.target as Node));
      if (i >= 0 && i !== cur) {
        const dir = i > cur ? 1 : -1;
        cur = i;
        go(i, dir);
        markCurrent();
      }
    };
    const swipeList = el.querySelector<HTMLElement>("[data-slide-list]")!;
    if (swipe) {
      el.dataset.mode = "swipe";
      markCurrent();
      swipeList.addEventListener("pointerdown", onDown);
      swipeList.addEventListener("pointermove", onMove);
      swipeList.addEventListener("pointerup", onUp);
      swipeList.addEventListener("pointercancel", onUp);
      swipeList.addEventListener("click", onClick, true);
      swipeList.addEventListener("keydown", onArrow);
      swipeList.addEventListener("focusin", onFocus);
    }

    const play = (active: Set<number>) => {
      active.forEach((i) => {
        if (playing.has(i)) return;
        const v = media[i].video;
        v.preload = "auto";
        v.play().catch(() => {});
      });
      playing.forEach((i) => !active.has(i) && media[i].video.pause());
      playing = active;
    };

    const onPlaying = (event: Event) =>
      (event.target as HTMLElement).setAttribute("data-playing", "");
    media.forEach((m) => m.video.addEventListener("playing", onPlaying));

    const place = (copy: (typeof copies)[number], u: number) => {
      if (u === copy.last) return;
      copy.last = u;
      const y = `translate3d(0, ${titleY(u)}%, 0)`;
      copy.title.forEach((line) => (line.style.transform = y));
      const m = `translate3d(0, ${Math.max(-200, Math.min(200, -u * 200))}%, 0)`;
      copy.meta.forEach((line) => (line.style.transform = m));
    };

    let frame = 0;
    let upload = 0;
    const tick = () => {
      frame = requestAnimationFrame(tick);
      hover += (hoverTarget - hover) * 0.08;

      let p = 0;
      if (start >= 0) {
        const t = clamp01((performance.now() / 1000 - start) / SWITCH);
        if (t >= 1) {
          from = to;
          start = -1;
        } else {
          p = inOut(t);
        }
      }
      const moving = start >= 0;
      const dir = moveDir;

      play(new Set(moving ? [from, to] : [from]));
      renderer.resize();
      // Phones upload the films' frames every other display frame: a full
      // 1600×1000 texture each frame is a lot for a phone's GPU.
      upload += 1;
      if (!coarse || upload % 2 === 0) {
        renderer.upload(media[from]);
        if (moving) renderer.upload(media[to]);
      }
      renderer.render(
        media[from],
        media[moving ? to : from],
        moving ? p : 0,
        1.06 + hover * 0.04,
        0.42 - hover * 0.2,
        0.36 * (1 - hover * 0.6),
      );

      copies.forEach((copy, i) => {
        let u: number;
        if (moving && i === from) u = dir * p;
        else if (moving && i === to) u = dir * (p - 1);
        // Before the stage reaches the top, the first title rises with it.
        else if (!moving && i === from) u = from === 0 ? Math.min(0, raw) : 0;
        else u = i < from ? 2 : -2;
        place(copy, u);
      });

      const at = moving && p >= 0.5 ? to : from;
      if (at !== shown) {
        shown = at;
        current.textContent = items[at]?.index ?? "";
      }
      // Round the list (last → first) the square jumps rather than sweeping.
      const along = moving && Math.abs(to - from) === 1 ? from + (to - from) * p : at;
      square.style.setProperty("--at", String(along / Math.max(1, last)));
    };

    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      play(new Set());
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !frame) {
        // Coming back after a jump (anchor link, scroll restore): show the
        // project the page is on, without a transition on the way in.
        settle();
        frame = requestAnimationFrame(tick);
      }
      else if (!entry.isIntersecting) stop();
    });
    observer.observe(el);

    const list = el.querySelector<HTMLElement>("[data-slide-list]")!;
    const enter = () => (hoverTarget = 1);
    const leave = () => (hoverTarget = 0);
    list.addEventListener("pointerover", enter);
    list.addEventListener("pointerleave", leave);
    list.addEventListener("focusin", enter);
    list.addEventListener("focusout", leave);

    const lost = (event: Event) => {
      event.preventDefault();
      stop();
      el.removeAttribute("data-gl");
    };
    cv.addEventListener("webglcontextlost", lost);

    // Set on the element, not in state: the stage owns this from here on.
    el.setAttribute("data-gl", "");

    return () => {
      delete el.dataset.mode;
      swipeList.removeEventListener("pointerdown", onDown);
      swipeList.removeEventListener("pointermove", onMove);
      swipeList.removeEventListener("pointerup", onUp);
      swipeList.removeEventListener("pointercancel", onUp);
      swipeList.removeEventListener("click", onClick, true);
      swipeList.removeEventListener("keydown", onArrow);
      swipeList.removeEventListener("focusin", onFocus);
      slides.forEach((s) => s.removeAttribute("data-current"));
      window.removeEventListener("wheel", onWheel, { capture: true });
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(release);
      el.removeAttribute("data-gl");
      observer.disconnect();
      stop();
      trigger?.kill();
      cv.removeEventListener("webglcontextlost", lost);
      list.removeEventListener("pointerover", enter);
      list.removeEventListener("pointerleave", leave);
      list.removeEventListener("focusin", enter);
      list.removeEventListener("focusout", leave);
      media.forEach((m) => {
        m.video.pause();
        m.video.removeEventListener("playing", onPlaying);
      });
      renderer.dispose(media);
    };
  }, [count, items]);

  // Phones and tablets without the stage: the native carousel. The counter
  // and progress follow the horizontal scroll; the slide in view plays while
  // the list is on screen.
  useEffect(() => {
    const el = root.current;
    // Only when the stage is not running (reduced motion, no WebGL).
    if (!el || el.hasAttribute("data-gl") || window.matchMedia(STAGE).matches) return;
    const list = el.querySelector<HTMLElement>("[data-slide-list]")!;
    const cards = Array.from(list.querySelectorAll<HTMLElement>("[data-work-card]"));
    const videos = cards.map((card) => card.querySelector("video")!);
    const current = el.querySelector<HTMLElement>("[data-nav-current]");
    const fill = el.querySelector<HTMLElement>("[data-nav-fill]");
    const motion = window.matchMedia(MOTION_OK).matches;
    let onScreen = false;
    let active = -1;
    let frame = 0;

    const play = () =>
      videos.forEach((video, i) => {
        if (motion && onScreen && i === active) {
          video.preload = "auto";
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      });
    const update = () => {
      frame = 0;
      const max = list.scrollWidth - list.clientWidth;
      // The card most in view; at the very end (a wide screen shows several
      // cards at once), the last one.
      let at = cards.length - 1;
      if (list.scrollLeft < max - 4) {
        const left = list.scrollLeft;
        const right = left + list.clientWidth;
        let best = -1;
        cards.forEach((card, i) => {
          const a = card.offsetLeft - list.offsetLeft;
          const seen = Math.min(right, a + card.offsetWidth) - Math.max(left, a);
          const ratio = seen / card.offsetWidth;
          if (ratio > best + 0.01) {
            best = ratio;
            at = i;
          }
        });
      }
      if (fill) fill.style.transform = `scaleX(${max > 0 ? (list.scrollLeft + list.clientWidth) / list.scrollWidth : 1})`;
      if (at !== active) {
        active = at;
        if (current) current.textContent = items[at]?.index ?? "";
        play();
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onPlaying = (event: Event) => (event.target as HTMLElement).setAttribute("data-playing", "");

    list.addEventListener("scroll", onScroll, { passive: true });
    videos.forEach((video) => video.addEventListener("playing", onPlaying));
    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        play();
      },
      { threshold: 0.35 },
    );
    observer.observe(list);
    update();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      list.removeEventListener("scroll", onScroll);
      videos.forEach((video) => {
        video.pause();
        video.removeEventListener("playing", onPlaying);
      });
    };
  }, [items]);

  return (
    <div
      ref={root}
      className="slides"
      style={{ "--count": count } as CSSProperties}
    >
      <div className="slides-stage" aria-hidden="true">
        <canvas ref={canvas} className="slides-canvas" />
        <div className="slides-copy">
          {items.map((item) => (
            <div key={item.slug} className="slide-copy" data-slide-copy>
              <p className="slide-title display" data-lines={item.name.split(" ").length}>
                {item.name.split(" ").map((word) => (
                  <span key={word} className="slide-mask">
                    <span className="slide-line" data-slide-title>
                      {word}
                    </span>
                  </span>
                ))}
              </p>
              <p className="slide-meta label">
                <span className="slide-mask">
                  <span className="slide-line" data-slide-meta>
                    {item.kind} / {item.year}
                    {item.status ? <span className="text-ember"> / {item.status}</span> : null}
                  </span>
                </span>
              </p>
              <p className="slide-result">
                <span className="slide-mask">
                  <span className="slide-line" data-slide-meta>
                    <span className="slide-value tnum">{item.value}</span>
                    <span className="label slide-value-label">{item.valueLabel}</span>
                  </span>
                </span>
              </p>
              <p className="slide-source label">
                <span className="slide-mask">
                  <span className="slide-line" data-slide-meta>
                    {item.source}
                  </span>
                </span>
              </p>
            </div>
          ))}
        </div>
        <div className="slides-stepper label tnum">
          <span data-step-current>{items[0]?.index}</span>
          <span className="slides-steps">
            {items.map((item) => (
              <span key={item.slug} className="slides-step" />
            ))}
            <span className="slides-square" data-step-square />
          </span>
          <span>{total}</span>
        </div>
      </div>

      <ol aria-label={label} className="slides-list" data-slide-list>
        {items.map((item) => (
          <li key={item.slug} className="slide" data-work-card>
            <TransitionLink
              href={`/work/${item.slug}`}
              label={item.name}
              data-cursor={openLabel}
              className="slide-link"
            >
              <span className="slide-media" aria-hidden="true">
                <Image src={item.poster} alt="" fill sizes="100vw" className="slide-poster" />
                <video
                  className="slide-film"
                  src={item.src}
                  muted
                  loop
                  playsInline
                  preload="none"
                  disablePictureInPicture
                  disableRemotePlayback
                  tabIndex={-1}
                />
              </span>
              <span className="slide-static">
                <span className="slide-static-meta label">
                  <span className="slide-static-index">
                    <span className="text-ember tnum">{item.index}</span>
                    <span className="text-ash tnum"> / {total}</span>
                  </span>
                  <span className="slide-static-kind">
                    {item.kind} / {item.year}
                    {item.status ? <span className="text-ember"> / {item.status}</span> : null}
                  </span>
                </span>
                <span className="slide-static-title display" data-lines={item.name.split(" ").length}>
                  {item.name}
                </span>
                <span className="slide-static-result">
                  <span className="slide-static-value tnum">{item.value}</span>
                  <span className="label text-ash">{item.valueLabel}</span>
                </span>
                <span className="slide-static-foot">
                  <span className="label text-ash">{item.source}</span>
                  <span className="slide-static-open label">
                    {openLabel}
                    <Arrow />
                  </span>
                </span>
              </span>
            </TransitionLink>
          </li>
        ))}
      </ol>

      <div className="slides-nav label tnum" aria-hidden="true">
        <span data-nav-current>{items[0]?.index}</span>
        <span className="slides-bar">
          <span className="slides-bar-fill" data-nav-fill />
        </span>
        <span>{total}</span>
      </div>
    </div>
  );
}

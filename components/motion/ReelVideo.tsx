"use client";

import { useEffect, useRef } from "react";
import { MOTION_OK } from "@/lib/gsap";

type Props = { src: string; className?: string };

/**
 * A project film laid over its poster image. It only loads and plays while
 * on screen and when motion is allowed; until it has a frame (and always
 * with reduced motion) the poster underneath is what shows.
 */
export function ReelVideo({ src, className }: Props) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const motion = window.matchMedia(MOTION_OK);
    let visible = false;

    const sync = () => {
      if (visible && motion.matches) {
        video.preload = "auto";
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    };
    const onPlaying = () => video.setAttribute("data-playing", "");

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        sync();
      },
      { threshold: 0.25 },
    );
    observer.observe(video);
    motion.addEventListener("change", sync);
    video.addEventListener("playing", onPlaying);
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", sync);
      video.removeEventListener("playing", onPlaying);
      video.pause();
    };
  }, []);

  return (
    <video
      ref={ref}
      src={src}
      muted
      loop
      playsInline
      preload="none"
      disablePictureInPicture
      disableRemotePlayback
      aria-hidden="true"
      tabIndex={-1}
      className={`reel-over ${className ?? ""}`}
    />
  );
}

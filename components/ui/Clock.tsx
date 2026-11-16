"use client";

import { useEffect, useState } from "react";
import { site } from "@/content/site";

const formatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: site.location.timeZone,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

/** Live Ulaanbaatar time. Renders a stable placeholder on the server. */
export function Clock({ className }: { className?: string }) {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    let timer: number | undefined;
    const tick = () => setTime(formatter.format(new Date()));
    const start = () => {
      tick();
      timer = window.setInterval(tick, 1000);
    };
    const stop = () => window.clearInterval(timer);
    const onVisibility = () => {
      stop();
      if (!document.hidden) start();
    };

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <span className={className} aria-hidden="true" suppressHydrationWarning>
      {time ?? "--:--:--"}
      <span className="ml-1">UTC+8</span>
    </span>
  );
}

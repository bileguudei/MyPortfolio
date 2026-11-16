"use client";

import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { site } from "@/content/site";

type Status = "idle" | "copied" | "failed";

/** Copies the email address and confirms it with a short, announced toast. */
export function CopyEmail() {
  const t = useTranslations("contact");
  const [status, setStatus] = useState<Status>("idle");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(site.email);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setStatus("idle"), 2200);
  }

  return (
    <span className="relative inline-flex">
      <button type="button" onClick={copy} className="btn label">
        {t("copy")}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {status === "copied" ? t("copied") : status === "failed" ? t("copyFailed") : ""}
      </span>
      <AnimatePresence>
        {status !== "idle" && (
          <motion.span
            aria-hidden="true"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="label pointer-events-none absolute -top-8 left-0 whitespace-nowrap bg-bone px-2 py-1 text-ink"
          >
            {status === "copied" ? t("copied") : t("copyFailed")}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

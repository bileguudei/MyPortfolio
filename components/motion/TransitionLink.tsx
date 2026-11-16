"use client";

import type { ComponentProps, MouseEvent } from "react";
import { usePageTransition } from "@/components/providers/Providers";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

type Props = Omit<ComponentProps<typeof Link>, "href" | "locale"> & {
  href: string;
  locale?: Locale;
  /** Shown on the transition panel while the next page loads. */
  label?: string;
};

/**
 * A real anchor (works without JS, opens in new tab with modifier keys) that
 * routes plain clicks through the page transition.
 */
export function TransitionLink({ href, locale, label, onClick, children, ...rest }: Props) {
  const { navigate } = usePageTransition();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    navigate(href, { locale, label });
  }

  return (
    <Link href={href} locale={locale} onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
}

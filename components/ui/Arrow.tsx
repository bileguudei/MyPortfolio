type Props = {
  className?: string;
  /** "ne" = up-right (open / external); the rest are the cardinal directions. */
  dir?: "ne" | "up" | "down" | "left" | "right";
};

const rotation = { ne: 0, right: 45, down: 135, left: 225, up: -45 } as const;

/** Single authored arrow glyph, rotated per direction. */
export function Arrow({ className, dir = "ne" }: Props) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ transform: `rotate(${rotation[dir]}deg)` }}
    >
      <path d="M4 12 12 4M5.5 4H12v6.5" />
    </svg>
  );
}

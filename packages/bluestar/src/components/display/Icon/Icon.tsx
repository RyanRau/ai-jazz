import { iconPaths } from "./paths";

export type IconName =
  | "settings"
  | "logOut"
  | "close"
  | "chevronDown"
  | "check"
  | "user"
  | "plus"
  | "trash"
  | "search"
  | "externalLink"
  | "key"
  | "chat"
  | "menu";

export type IconProps = {
  name: IconName;
  /** Pixel size (square). Defaults to 20. */
  size?: number;
  /** Defaults to `"currentColor"` so it inherits surrounding text/button color for free. */
  color?: string;
  /** Accessible label. Omit for a purely decorative icon (e.g. alongside its own text label). */
  label?: string;
};

/**
 * A small curated set of stroke icons, not a general-purpose icon library —
 * add a name here only when a real consumer needs it (matches the scope
 * discipline `Avatar`/`Menu` already hold to).
 */
export default function Icon({ name, size = 20, color = "currentColor", label }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : "presentation"}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {iconPaths[name]}
    </svg>
  );
}

import { css } from "goober";
import { useState } from "react";
import { useTheme } from "../../../theme";
import type { Theme } from "../../../theme";

export type AvatarProps = {
  /** Image URL. Falls back to initials if omitted, or if it fails to load. */
  src?: string;
  /**
   * Name or email used to derive fallback initials and a deterministic
   * color. Plain text, never a PocketBase record — bluestar stays
   * backend-agnostic, so the caller resolves this from whatever identity
   * shape their own backend uses.
   */
  name: string;
  /** Diameter in px. Defaults to 36. */
  size?: number;
  /** Overrides the accessible label (defaults to `name`). */
  alt?: string;
};

function initialsFor(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";

  if (trimmed.includes("@") && !trimmed.includes(" ")) {
    return trimmed.slice(0, 2).toUpperCase();
  }

  const words = trimmed.split(/\s+/);
  const first = words[0]?.[0] ?? "";
  const second = words.length > 1 ? words[1][0] : (words[0]?.[1] ?? "");
  return (first + second).toUpperCase();
}

function accentFor(name: string, theme: Theme) {
  const accents = [
    theme.colors.primary,
    theme.colors.secondary,
    theme.colors.success,
    theme.colors.warning,
    theme.colors.error,
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return accents[Math.abs(hash) % accents.length];
}

export default function Avatar({ src, name, size = 36, alt }: AvatarProps) {
  const theme = useTheme();
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(src) && !imageFailed;

  return (
    <span
      role="img"
      aria-label={alt ?? name}
      className={css`
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: ${size}px;
        height: ${size}px;
        flex-shrink: 0;
        border-radius: ${theme.radius.full};
        overflow: hidden;
        background-color: ${showImage ? "transparent" : accentFor(name, theme)};
        color: ${theme.colors.textOnAccent};
        font-family: ${theme.fonts.body};
        font-size: ${Math.round(size * 0.4)}px;
        font-weight: 600;
        user-select: none;
      `}
    >
      {showImage ? (
        <img
          src={src}
          alt=""
          onError={() => setImageFailed(true)}
          className={css`
            width: 100%;
            height: 100%;
            object-fit: cover;
          `}
        />
      ) : (
        initialsFor(name)
      )}
    </span>
  );
}

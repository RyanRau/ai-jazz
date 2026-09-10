import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { type Theme, defaultTheme, darkTheme } from "./theme";
import { emitGlobalStyles, themeToVars, varRefs } from "./cssVars";

/**
 * Nesting depth. The outermost provider owns the global `:root` blocks (which
 * is what makes the dark-mode media query possible); a nested one instead
 * scopes its overrides to a wrapper element, since CSS variables cascade.
 * Without this, a nested provider's `glob` would overwrite `:root` for the
 * whole document rather than just its subtree.
 */
const DepthContext = createContext(0);

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/** "auto" follows the OS; the other two override it. */
export type ColorScheme = "auto" | "light" | "dark";
export type ResolvedColorScheme = "light" | "dark";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Recursive merge of an override onto a base.
 *
 * Generic on purpose: the previous implementation had a hand-written merge per
 * token group, so adding a token silently failed to merge until someone
 * remembered to extend that function.
 */
export function deepMerge<T>(base: T, override?: DeepPartial<T>): T {
  if (!override) return base;
  if (!isPlainObject(base) || !isPlainObject(override)) return (override as T) ?? base;

  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue;
    out[key] = isPlainObject(value)
      ? deepMerge((base as Record<string, unknown>)[key], value as DeepPartial<unknown>)
      : value;
  }
  return out as T;
}

type ThemeContextValue = {
  /** Theme-shaped, but every leaf is a `var(--bs-…)` reference. */
  theme: Theme;
  scheme: ColorScheme;
  resolved: ResolvedColorScheme;
  setScheme: (scheme: ColorScheme) => void;
  /** A viewer-picked accent color overriding `theme.colors.primary`, or `null` for the theme's own default. */
  customAccent: string | null;
  setCustomAccent: (color: string | null) => void;
};

const fallback: ThemeContextValue = {
  theme: varRefs(defaultTheme),
  scheme: "auto",
  resolved: "light",
  setScheme: () => {},
  customAccent: null,
  setCustomAccent: () => {},
};

const ThemeContext = createContext<ThemeContextValue>(fallback);

const canUseDOM = typeof window !== "undefined" && typeof document !== "undefined";
const DARK_QUERY = "(prefers-color-scheme: dark)";

const prefersDark = () => canUseDOM && window.matchMedia(DARK_QUERY).matches;

export type ThemeProviderProps = {
  /** Overrides applied to the light palette. */
  theme?: DeepPartial<Theme>;
  /** Overrides applied to the dark palette. */
  darkTheme?: DeepPartial<Theme>;
  /** Initial colour scheme. Defaults to "auto" (follow the OS). */
  colorScheme?: ColorScheme;
  /** Apply the CSS baseline (reset + body colours). Defaults to true. */
  baseline?: boolean;
  /** localStorage key for remembering an explicit choice. Pass null to disable. */
  storageKey?: string | null;
  /**
   * sessionStorage key for remembering a custom accent color (set via
   * `useCustomAccent`'s `setCustomAccent`) — cleared when the tab closes,
   * unlike `storageKey`'s localStorage persistence for `colorScheme`. Pass
   * null to disable.
   */
  customAccentStorageKey?: string | null;
  children: ReactNode;
};

function readStored(storageKey: string | null | undefined): ColorScheme | null {
  if (!canUseDOM || !storageKey) return null;
  try {
    const value = window.localStorage.getItem(storageKey);
    return value === "light" || value === "dark" || value === "auto" ? value : null;
  } catch {
    // Private browsing, or storage disabled — fall back to the prop.
    return null;
  }
}

function readStoredAccent(storageKey: string | null | undefined): string | null {
  if (!canUseDOM || !storageKey) return null;
  try {
    return window.sessionStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

/**
 * The hover shade for a viewer-picked accent, following the same
 * light-darkens/dark-lightens convention `theme.ts`'s two palettes hand-pick
 * per color — `color-mix` resolves at paint time, so this needs no palette
 * math, just the right mix target per scheme.
 */
function accentHoverFor(accent: string, mode: "light" | "dark"): string {
  return `color-mix(in srgb, ${accent} 85%, ${mode === "light" ? "black" : "white"})`;
}

export function ThemeProvider({
  theme,
  darkTheme: darkOverrides,
  colorScheme = "auto",
  baseline = true,
  storageKey = "bluestar-color-scheme",
  customAccentStorageKey = "bluestar-custom-accent",
  children,
}: ThemeProviderProps) {
  const [scheme, setSchemeState] = useState<ColorScheme>(
    () => readStored(storageKey) ?? colorScheme
  );
  const [customAccent, setCustomAccentState] = useState<string | null>(() =>
    readStoredAccent(customAccentStorageKey)
  );

  // Follow the prop when it changes, so the scheme can be driven from outside
  // (a Storybook toolbar, an app's own settings screen) and not just seeded.
  useEffect(() => {
    setSchemeState(colorScheme);
  }, [colorScheme]);

  // Tracks the OS preference so `resolved` is correct while scheme is "auto".
  const [systemDark, setSystemDark] = useState(prefersDark);

  useEffect(() => {
    if (!canUseDOM) return;
    const query = window.matchMedia(DARK_QUERY);
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const depth = useContext(DepthContext);
  const isRoot = depth === 0;

  // The viewer's own live pick wins over whatever the app hard-coded via
  // `theme`/`darkTheme` — it's deep-merged on last, in both palettes.
  const accentOverride = useCallback(
    (mode: "light" | "dark"): DeepPartial<Theme> | undefined =>
      customAccent
        ? {
            colors: {
              primary: customAccent,
              focusRing: customAccent,
              primaryHover: accentHoverFor(customAccent, mode),
            },
          }
        : undefined,
    [customAccent]
  );
  const light = useMemo(
    () => deepMerge(deepMerge(defaultTheme, theme), accentOverride("light")),
    [theme, accentOverride]
  );
  const dark = useMemo(
    () => deepMerge(deepMerge(darkTheme, darkOverrides), accentOverride("dark")),
    [darkOverrides, accentOverride]
  );

  // One call, deliberately: a second `glob` would replace this one rather than
  // add to it. Re-running on a theme change replaces cleanly.
  useMemo(() => {
    if (isRoot) emitGlobalStyles(light, dark, baseline);
  }, [isRoot, light, dark, baseline]);

  // A nested provider can't touch :root, so it carries its variables inline and
  // they cascade to its subtree only.
  const scopedVars = useMemo(
    () => (isRoot ? undefined : (themeToVars(light) as React.CSSProperties)),
    [isRoot, light]
  );

  useEffect(() => {
    // Only the root provider drives the document attribute; a nested one has no
    // business changing the page's scheme.
    if (!canUseDOM || !isRoot) return;
    const root = document.documentElement;
    if (scheme === "auto") {
      root.removeAttribute("data-bs-scheme");
    } else {
      root.setAttribute("data-bs-scheme", scheme);
    }
  }, [scheme, isRoot]);

  const setScheme = useCallback(
    (next: ColorScheme) => {
      setSchemeState(next);
      if (!canUseDOM || !storageKey) return;
      try {
        window.localStorage.setItem(storageKey, next);
      } catch {
        // Not being able to remember the choice shouldn't break the toggle.
      }
    },
    [storageKey]
  );

  const setCustomAccent = useCallback(
    (next: string | null) => {
      setCustomAccentState(next);
      if (!canUseDOM || !customAccentStorageKey) return;
      try {
        if (next) window.sessionStorage.setItem(customAccentStorageKey, next);
        else window.sessionStorage.removeItem(customAccentStorageKey);
      } catch {
        // Not being able to remember the choice shouldn't break the picker.
      }
    },
    [customAccentStorageKey]
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      // Components read variable references, never literals — that is what lets
      // a scheme change repaint without re-rendering the tree.
      theme: varRefs(light),
      scheme,
      resolved: scheme === "auto" ? (systemDark ? "dark" : "light") : scheme,
      setScheme,
      customAccent,
      setCustomAccent,
    }),
    [light, scheme, systemDark, setScheme, customAccent, setCustomAccent]
  );

  return (
    <DepthContext.Provider value={depth + 1}>
      <ThemeContext.Provider value={value}>
        {scopedVars ? <div style={scopedVars}>{children}</div> : children}
      </ThemeContext.Provider>
    </DepthContext.Provider>
  );
}

/** Theme tokens as `var(--bs-…)` references. */
export function useTheme(): Theme {
  return useContext(ThemeContext).theme;
}

/** Read and change the colour scheme. */
export function useColorScheme() {
  const { scheme, resolved, setScheme } = useContext(ThemeContext);
  return { scheme, resolved, setScheme };
}

/** Read and change the viewer's custom accent color override. `null` means the theme's own default. */
export function useCustomAccent() {
  const { customAccent, setCustomAccent } = useContext(ThemeContext);
  return { customAccent, setCustomAccent };
}

import { glob } from "goober";
import type { Theme } from "./theme";

export const VAR_PREFIX = "--bs";

/**
 * Section name → variable segment. Keeps the emitted names readable
 * (`--bs-color-primary`, not `--bs-colors-primary`).
 */
const SECTIONS: Record<keyof Theme, string> = {
  colors: "color",
  fonts: "font",
  textTypes: "text",
  headings: "heading",
  radius: "radius",
  shadow: "shadow",
};

const kebab = (value: string) => value.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

type VarMap = Record<string, string>;

function walk(node: unknown, path: string[], out: VarMap) {
  if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      walk(value, [...path, kebab(key)], out);
    }
    return;
  }
  out[`${VAR_PREFIX}-${path.join("-")}`] = String(node);
}

/** Flatten a theme into `{ "--bs-color-primary": "#7da7d9", … }`. */
export function themeToVars(theme: Theme): VarMap {
  const out: VarMap = {};
  for (const [section, segment] of Object.entries(SECTIONS)) {
    walk(theme[section as keyof Theme], [segment], out);
  }
  return out;
}

/**
 * A theme-shaped object whose leaves are `var(--bs-…)` references.
 *
 * This is what `useTheme()` returns, so a component writing
 * `` css`color: ${theme.colors.text}` `` gets a variable reference and follows
 * the active colour scheme with no extra work and no re-render.
 */
export function varRefs(theme: Theme): Theme {
  const shape = (node: unknown, path: string[]): unknown => {
    if (node && typeof node === "object") {
      return Object.fromEntries(
        Object.entries(node).map(([key, value]) => [key, shape(value, [...path, kebab(key)])])
      );
    }
    return `var(${VAR_PREFIX}-${path.join("-")})`;
  };

  return Object.fromEntries(
    Object.entries(SECTIONS).map(([section, segment]) => [
      section,
      shape(theme[section as keyof Theme], [segment]),
    ])
  ) as Theme;
}

const declarations = (vars: VarMap) =>
  Object.entries(vars)
    .map(([name, value]) => `${name}:${value};`)
    .join("");

/** The palettes, as three blocks so every scheme state resolves correctly. */
function themeBlocks(light: Theme, dark: Theme) {
  const lightVars = declarations(themeToVars(light));
  const darkVars = declarations(themeToVars(dark));

  return [
    // 1. Light is the baseline.
    `:root{color-scheme:light;${lightVars}}`,
    // 2. Dark when the OS asks for it — unless light was chosen explicitly,
    //    which is what the :not() guard is for.
    `@media (prefers-color-scheme: dark){`,
    `:root:not([data-bs-scheme="light"]){color-scheme:dark;${darkVars}}`,
    `}`,
    // 3. An explicit choice, last so it beats the OS in both directions.
    `:root[data-bs-scheme="dark"]{color-scheme:dark;${darkVars}}`,
    `:root[data-bs-scheme="light"]{color-scheme:light;${lightVars}}`,
  ].join("");
}

/** A reset, plus body inheriting the theme so the page isn't white behind dark mode. */
function baselineBlock() {
  return [
    "*,*::before,*::after{box-sizing:border-box;}",
    "body{",
    "margin:0;",
    `font-family:var(${VAR_PREFIX}-font-body);`,
    `font-size:var(${VAR_PREFIX}-text-subtitle-size);`,
    `background-color:var(${VAR_PREFIX}-color-background);`,
    `color:var(${VAR_PREFIX}-color-text);`,
    "-webkit-font-smoothing:antialiased;",
    "}",
  ].join("");
}

/**
 * Emit every global rule bluestar owns, in **one** `glob` call.
 *
 * This has to be a single call: goober keys global styles such that a second
 * `glob` replaces the first rather than appending, so splitting the baseline
 * and the palettes into two calls silently drops whichever ran first. Re-running
 * with new arguments replaces cleanly, which is what a theme change wants.
 */
export function emitGlobalStyles(light: Theme, dark: Theme, baseline: boolean) {
  glob((baseline ? baselineBlock() : "") + themeBlocks(light, dark));
}

export {
  ThemeProvider,
  useTheme,
  useColorScheme,
  useCustomAccent,
  deepMerge,
} from "./ThemeContext";
export type {
  ThemeProviderProps,
  ColorScheme,
  ResolvedColorScheme,
  DeepPartial,
} from "./ThemeContext";
export { defaultTheme, darkTheme, breakpoints } from "./theme";
export type { Theme, Spacing, TextStyle, HeadingStyle } from "./theme";
export { themeToVars, varRefs, VAR_PREFIX } from "./cssVars";

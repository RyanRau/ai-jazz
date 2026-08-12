# Ozark Bluestar

The React component library every app in this monorepo builds its UI from.
Components are styled with [goober](https://github.com/cristianbote/goober) and
driven entirely by a theme emitted as CSS custom properties, so apps get a
consistent look — and working dark mode — without writing CSS.

The full component and prop reference lives in
[`packages/PACKAGES.md`](../PACKAGES.md) — start there when building an app.
[`AUDIT.md`](./AUDIT.md) records the architecture, its two non-obvious
constraints, and what is deliberately not built yet.

This package is also deployed: its Storybook is published as a static site,
registered in the repo-root `deploy.yml` as the `bluestar` app with
`path: packages/bluestar`.

It is currently marked `development: true` while the rework is reviewed, so it
serves from [test-ui.ryanzrau.dev](https://test-ui.ryanzrau.dev) via a manual run
of **Actions → Build and Deploy** with `target: test`. Deleting that line
promotes it back to [ui.ryanzrau.dev](https://ui.ryanzrau.dev) on the next push
to `main`.

## Theming

`ThemeProvider` emits the whole theme as `--bs-*` CSS variables, applies a small
baseline reset, and follows the OS colour scheme:

```tsx
<ThemeProvider colorScheme="auto">
  <App />
</ThemeProvider>
```

`useTheme()` returns a theme-shaped object whose leaves are `var(--bs-…)`
references rather than literals, so interpolating one into a goober template
makes that rule scheme-reactive with no extra work:

```tsx
const theme = useTheme();
css`
  color: ${theme.colors.text};
`;
```

`useColorScheme()` reads and changes the scheme (`auto` / `light` / `dark`), and
persists an explicit choice to `localStorage`.

### Two constraints worth knowing before you edit the theme

1. **All global CSS goes out in one `glob` call.** goober keys global styles such
   that a second `glob` replaces the first instead of appending — splitting them
   silently drops one, with no error. `emitGlobalStyles` exists to keep it single.
2. **Nested `ThemeProvider`s scope to a wrapper element**, not `:root`. Only the
   outermost provider owns `:root` and the `data-bs-scheme` attribute.

## Development

```bash
cd packages/bluestar
npm install              # installs deps and builds dist/ via the prepare script
npm run storybook        # workbench at http://localhost:6006
npm run typecheck        # tsc over all of src, stories included
npm run build            # typecheck + compile to dist/
npm run build-storybook  # static site, what gets deployed
```

Apps resolve bluestar through `file:` references and import `dist/`, so
**rebuild after every change** or the consuming app keeps the stale build.

## Adding a component

1. Create `src/components/<category>/<Name>/` containing:
   - `Name.tsx` — default export, props typed inline, JSDoc on each prop
   - `index.ts` — `export { default as Name } from "./Name";` plus prop types
   - `Name.stories.tsx` — a default story and the interesting states
2. Re-export the folder from `src/index.ts`.
3. Document the props in [`packages/PACKAGES.md`](../PACKAGES.md).

Conventions worth matching:

- Read every colour, font, radius and shadow from `useTheme()` — never hardcode.
  `grep -rE "#[0-9a-fA-F]{3,8}" src/components/` should stay empty.
- Sizes and gaps use the `Spacing` union (`4 | 8 | 12 | 16 | 20 | 24 | 32`) as raw
  pixel numbers.
- Form controls are controlled: take `value` + `onChange(parsedValue)`, and wrap
  the input in `FormInputLayout` so labels, descriptions, warnings and errors
  render — and get wired to the control with `htmlFor` — the same everywhere.
- Disable with `isDisabled`, not the native `disabled` prop.
- Give anything focusable a `:focus-visible` outline using `theme.colors.focusRing`.

## Structure

```
src/
  index.ts              # public surface — everything apps can import
  styling.ts            # goober setup, imported for its side effect
  theme/                # tokens, CSS-variable emission, ThemeProvider
  form/                 # useForm, Form, SubmitButton
  components/
    layout/             # Flexbox, Card, Divider
    buttons/            # Button, AsyncButton
    feedback/           # Spinner, Alert, Skeleton, EmptyState, Toast
    display/            # Badge, Table
    overlay/            # Modal, ConfirmDialog
    navigation/         # Link, AppShell
    text/               # Header, Text, TextPairing
    form/               # TextInput, NumberInput, TextAreaInput, Checkbox,
                        # Switch, CheckboxList, RadioGroup, Dropdown,
                        # FormInputLayout
```
